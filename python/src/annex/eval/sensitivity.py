"""Depth 2 is forced rather than chosen, and this is what shows it.

The traversal arm runs at `Settings.traversal_depth`, and a setting stated
without its neighbours is a number a reader has to take on trust. Depth 1 and
depth 3 are reported beside it as a sensitivity row rather than as two more
arms, because they are the same arm at a different budget and scoring them as
arms would triple a table to say one thing.

## It costs no model calls

Every row here is derived from the run already recorded. `searched_ids` on the
search-only rows of `results.json` is exactly what search returned for that
question and version, so re-walking from those seeds at each depth reproduces
what the traversal arm would have been handed without asking the model
anything. A sensitivity table that needed its own sweep would cost as much as
the run it annotates and would measure a second retrieval rather than this one.

`traverse` reads a hit's `provision_id` and nothing else, which is what lets
the recorded ids be replayed through it as seeds.
"""

import logging
from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from statistics import mean

from annex.corpus import Corpus, CorpusVersion, build
from annex.corpus.graph import ReferenceGraph
from annex.eval.questions import QUESTIONS, Question
from annex.eval.runner import Result
from annex.eval.scoring import article_root
from annex.retrieval import traverse
from annex.retrieval.store import Hit

DEPTHS = (1, 2, 3)
"""One below the shipped depth, the shipped depth, and one above."""

SEARCH_ARM = 'search-only'
"""Whose seeds are replayed, being the arm that did the searching and no walking."""


@contextmanager
def _quiet(name: str) -> Iterator[None]:
    """Silence one logger for a replay that is arithmetic rather than a boundary.

    `traverse` logs once per walk, which is right when the agent calls it and
    wrong here: this replays it three times for every recorded question, and
    seventy-odd lines of it would bury the report the caller asked for.
    """
    logger = logging.getLogger(name)
    previous = logger.level
    logger.setLevel(logging.WARNING)
    try:
        yield
    finally:
        logger.setLevel(previous)


@dataclass(frozen=True)
class DepthRow:
    """One version at one traversal depth, over the questions that were run."""

    version: CorpusVersion
    depth: int
    questions: int
    recall: float
    nodes_supplied: float
    articles_supplied: float


def _seed_hits(provision_ids: Sequence[str]) -> tuple[Hit, ...]:
    """The recorded search result as the walker reads it, which is by id alone."""
    return tuple(
        Hit(
            chunk_id=provision_id,
            provision_id=provision_id,
            citation=provision_id,
            text='',
            distance=0.0,
        )
        for provision_id in provision_ids
    )


def _recall(question: Question, version: CorpusVersion, reached: set[str]) -> float:
    gold = set(question.gold_for(version))
    articles = {article_root(provision_id) for provision_id in reached}
    return len(gold & articles) / len(gold)


def depth_rows(
    results: Sequence[Result],
    corpora: Mapping[CorpusVersion, Corpus],
    *,
    cap: int = 40,
    graphs: Mapping[CorpusVersion, ReferenceGraph] | None = None,
) -> tuple[DepthRow, ...]:
    """What each depth would have reached, from the seeds the run recorded."""
    by_question = {question.id: question for question in QUESTIONS}
    seeds = [
        item
        for item in results
        if item.arm == SEARCH_ARM
        and not item.is_failure
        and item.question_id in by_question
    ]
    if not seeds:
        return ()

    built = dict(graphs) if graphs else {}
    rows: list[DepthRow] = []
    with _quiet('annex.retrieval.traverse'):
        for version in dict.fromkeys(item.version for item in seeds):
            if version not in built:
                built[version] = build(corpora[version])
            graph = built[version]
            rows.extend(
                _rows_for(
                    [item for item in seeds if item.version == version],
                    by_question,
                    version,
                    graph,
                    cap,
                )
            )
    return tuple(rows)


def _rows_for(
    seeds: Sequence[Result],
    by_question: Mapping[str, Question],
    version: CorpusVersion,
    graph: ReferenceGraph,
    cap: int,
) -> list[DepthRow]:
    rows: list[DepthRow] = []
    for depth in DEPTHS:
        recalls: list[float] = []
        nodes: list[int] = []
        articles: list[int] = []
        for item in seeds:
            expansion = traverse(
                _seed_hits(item.searched_ids), graph, depth=depth, cap=cap, enabled=True
            )
            reached = set(expansion.provision_ids)
            recalls.append(_recall(by_question[item.question_id], version, reached))
            nodes.append(len(reached))
            articles.append(len({article_root(name) for name in reached}))
        rows.append(
            DepthRow(
                version=version,
                depth=depth,
                questions=len(seeds),
                recall=mean(recalls),
                nodes_supplied=mean(nodes),
                articles_supplied=mean(articles),
            )
        )
    return rows
