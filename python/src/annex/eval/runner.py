"""Running the arms over the questions, and writing each result as it lands.

## Why the file is rewritten per question rather than at the end

The baseline arm spends nearly fifteen minutes reading its prompt on the first
question of a version, measured at 876.6 s on the original text. Twelve
questions across both versions is an unattended multi-hour run, and a run that
holds its results in memory until the last one loses everything to a dropped
connection at question eleven.

## Why the loop nests arm, then version, then question

The baseline's cost argument rests on Ollama holding the KV cache of a repeated
prefix. Every prompt in that arm is one version's corpus followed by the
question, so the prefix is byte-identical across the questions of a version and
only across those. Sweeping every question of one version before changing
version is what gives the cache anything to reuse, and `call_index` records the
position so the first call and the rest are read apart rather than averaged.

The same nesting costs the retrieval arms nothing, since they build one
pipeline and reuse it.

## Why one question's failure does not end the run

An arm can fail on one question and answer the next eleven: a prompt that came
back cut, a model that was not built, an index that is not there. Each is
recorded against the question that met it and the sweep continues, because the
alternative loses eleven measurements to report one failure.
"""

import json
import logging
import re
import time
from collections.abc import Mapping, Sequence
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from annex.corpus import Corpus, CorpusVersion
from annex.eval.arms import Arm, Routed
from annex.eval.arms.full_context import ContextOverflowError
from annex.eval.questions import QUESTIONS, Flow, Question
from annex.eval.scoring import score_answer, score_retrieval
from annex.llm import ModelContextError

logger = logging.getLogger('annex.eval.runner')

RESULTS_PATH = Path(__file__).resolve().parents[3] / 'data' / 'eval' / 'results.json'

RUNS_DIRECTORY_NAME = 'runs'
"""The folder a labelled run is kept in, beside whichever run is current.

One run per file, named by what was being measured rather than by when it ran.
A sweep answers the same twelve questions against a changed pipeline, so the
comparison a write-up makes is between two of these, and a timestamp gives a
reader nothing to choose by without opening the file.
"""

SAFE_LABEL = re.compile(r'[A-Za-z0-9][A-Za-z0-9._-]*')
"""What a run label may be, since it becomes a filename."""

EXPECTED_FAILURES = (
    ContextOverflowError,
    ModelContextError,
    OSError,
    ValueError,
)
"""What one question is allowed to fail with without ending the sweep.

A cut prompt, a model nobody built, an index that is not there, and a response
the answer schema rejects. Anything else is a programmer error and propagates,
per the error-handling standard: a bare `except Exception` here would swallow
the bug that makes every arm score zero.
"""


class Result(BaseModel):
    """One arm's answer to one question on one version, scored.

    Flat rather than nested, because this file is read by a report, by v0.7's
    fixtures and by anyone checking a number in the write-up against the run
    that produced it. `error` set means every score below it is a placeholder
    rather than a reading, and the report lists those rather than averaging
    them.

    The three id tuples are carried rather than counted, and they are most of
    the file's size: the baseline names 306 provisions on every original-text
    row. They are what makes a score checkable instead of trusted, which is the
    property `.claude/ARCHITECTURE.md` argues retrieval buys over stuffing, and
    it would be strange to claim it and then report only totals. They also let
    the depth sensitivity in `annex.eval.sensitivity` re-walk the recorded
    seeds without asking the model anything.
    """

    model_config = ConfigDict(frozen=True)

    question_id: str
    flow: Flow
    arm: str
    version: CorpusVersion
    call_index: int

    query: str = ''
    """What search was run against, which the question alone does not give.

    The router restates a description in the Act's vocabulary and the result is
    not stable across runs, so the searched ids below are reproducible only
    beside the text that produced them. Empty for the baseline, which searches
    nothing, and defaulted so a run recorded before this field reads back.
    """

    prompt_tokens: int = 0
    completion_tokens: int = 0
    duration_ms: int = 0
    model: str = ''
    truncated: bool = False

    searched_ids: tuple[str, ...] = ()
    traversed_ids: tuple[str, ...] = ()
    dropped_ids: tuple[str, ...] = ()

    recall: float = 0.0
    recall_reached: float = 0.0
    precision_over_nodes: float = 0.0
    precision_over_articles: float = 0.0
    nodes_supplied: int = 0
    articles_supplied: int = 0
    missed: tuple[str, ...] = ()

    expects_refusal: bool = False
    refused: bool = False
    refusal_correct: bool = False
    faithfulness: float | None = None
    claims: int = 0
    ungrounded_claims: int = 0
    citations_not_supplied: tuple[str, ...] = ()

    error: str | None = None

    @property
    def is_failure(self) -> bool:
        return self.error is not None


def _scored(
    arm: Arm,
    question: Question,
    version: CorpusVersion,
    corpus: Corpus,
    routed: Routed,
    call_index: int,
) -> Result:
    answer = routed.answer
    retrieval = score_retrieval(question, version, answer.retrieval)
    graded = score_answer(question, answer, corpus)
    trace = answer.retrieval
    return Result(
        question_id=question.id,
        flow=question.flow,
        arm=arm.name,
        version=version,
        call_index=call_index,
        query=routed.query,
        prompt_tokens=trace.prompt_tokens,
        completion_tokens=trace.completion_tokens,
        duration_ms=trace.duration_ms,
        model=trace.model,
        truncated=trace.truncated,
        searched_ids=trace.searched_ids,
        traversed_ids=trace.traversed_ids,
        dropped_ids=trace.dropped_ids,
        recall=retrieval.recall,
        recall_reached=retrieval.recall_reached,
        precision_over_nodes=retrieval.precision_over_nodes,
        precision_over_articles=retrieval.precision_over_articles,
        nodes_supplied=retrieval.nodes_supplied,
        articles_supplied=retrieval.articles_supplied,
        missed=retrieval.missed,
        expects_refusal=question.expects_refusal,
        refused=graded.refused,
        refusal_correct=graded.refusal_correct,
        faithfulness=graded.faithfulness,
        claims=graded.claims,
        ungrounded_claims=graded.ungrounded_claims,
        citations_not_supplied=graded.citations_not_supplied,
    )


def answer_one(
    arm: Arm,
    question: Question,
    version: CorpusVersion,
    corpus: Corpus,
    *,
    call_index: int = 0,
) -> Result:
    """One arm against one question, scored, or the failure it met."""
    started = time.monotonic()
    try:
        routed = arm.answer(question, version)
    except EXPECTED_FAILURES as error:
        elapsed = int((time.monotonic() - started) * 1000)
        logger.error('%s failed %s on %s: %s', arm.name, question.id, version, error)
        return Result(
            question_id=question.id,
            flow=question.flow,
            arm=arm.name,
            version=version,
            call_index=call_index,
            duration_ms=elapsed,
            expects_refusal=question.expects_refusal,
            error=f'{type(error).__name__}: {error}',
        )
    return _scored(arm, question, version, corpus, routed, call_index)


def run_path(label: str, current: Path = RESULTS_PATH) -> Path:
    """Where a labelled run is kept, refusing a label that is not a filename.

    Beside the current run rather than at a fixed directory, so `--results`
    moves the history with the run it belongs to and a narrowed sweep written
    somewhere else does not drop a file into the tracked history.

    The label reaches the filesystem, and it arrives from the command line, so
    it is checked here rather than trusted. A separator, a leading dot and an
    empty string are all refused by the same pattern, which admits the names a
    run actually wants: `v0.6-nomic-embed-text`, `v0.9-arctic`.
    """
    if not SAFE_LABEL.fullmatch(label):
        raise ValueError(
            f'{label!r} is not a run label. A label names one file, so it may '
            'carry letters, digits, dots, dashes and underscores, and has to '
            'start with a letter or a digit.'
        )
    return current.parent / RUNS_DIRECTORY_NAME / f'{label}.json'


def write_results(
    results: Sequence[Result],
    path: Path = RESULTS_PATH,
    *,
    label: str | None = None,
) -> Path:
    """Write the whole set, which is what makes a partial run readable.

    A label keeps a second copy under `runs/`, so a sweep does not overwrite
    the run before it. `path` stays the current run either way, which is what
    `read_results`, `docs/evaluation.md` and the report all point at, so a
    labelled run adds a file rather than moving the one everything reads.

    Returns the path of the current run rather than the labelled copy, since
    that is the one a caller reports and re-reads.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(
        [result.model_dump(mode='json') for result in results], indent=2
    )
    path.write_text(payload + '\n')
    if label is not None:
        kept = run_path(label, path)
        kept.parent.mkdir(parents=True, exist_ok=True)
        kept.write_text(payload + '\n')
    return path


def read_results(path: Path = RESULTS_PATH) -> tuple[Result, ...]:
    """Read a run back, so the report can be rendered without repeating it."""
    if not path.exists():
        raise FileNotFoundError(
            f'no results at {path}. Run: uv run python -m annex evaluate'
        )
    return tuple(Result.model_validate(item) for item in json.loads(path.read_text()))


def run(
    arms: Sequence[Arm],
    corpora: Mapping[CorpusVersion, Corpus],
    *,
    questions: Sequence[Question] = QUESTIONS,
    versions: Sequence[CorpusVersion] = tuple(CorpusVersion),
    results_path: Path | None = RESULTS_PATH,
    label: str | None = None,
) -> tuple[Result, ...]:
    """Sweep every arm over every question of every version, writing as it goes.

    A label is validated before the first question rather than at the first
    write, since the sweep is a multi-hour run and refusing it at the end
    would refuse the measurement along with the name.
    """
    if label is not None:
        run_path(label, results_path or RESULTS_PATH)
    collected: list[Result] = []
    for arm in arms:
        for version in versions:
            for call_index, question in enumerate(questions):
                logger.info(
                    'arm=%s version=%s question=%s (%d of %d)',
                    arm.name,
                    version,
                    question.id,
                    call_index + 1,
                    len(questions),
                )
                collected.append(
                    answer_one(
                        arm,
                        question,
                        version,
                        corpora[version],
                        call_index=call_index,
                    )
                )
                if results_path is not None:
                    write_results(collected, results_path, label=label)
    return tuple(collected)
