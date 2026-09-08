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
import time
from collections.abc import Mapping, Sequence
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from annex.answer import Answer
from annex.corpus import Corpus, CorpusVersion
from annex.eval.arms import Arm
from annex.eval.arms.full_context import ContextOverflowError
from annex.eval.questions import QUESTIONS, Flow, Question
from annex.eval.scoring import score_answer, score_retrieval
from annex.llm import ModelContextError

logger = logging.getLogger('annex.eval.runner')

RESULTS_PATH = Path(__file__).resolve().parents[3] / 'data' / 'eval' / 'results.json'

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

    prompt_tokens: int = 0
    completion_tokens: int = 0
    duration_ms: int = 0
    model: str = ''
    truncated: bool = False

    searched_ids: tuple[str, ...] = ()
    traversed_ids: tuple[str, ...] = ()
    dropped_ids: tuple[str, ...] = ()

    recall: float = 0.0
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
    answer: Answer,
    call_index: int,
) -> Result:
    retrieval = score_retrieval(question, version, answer.retrieval)
    graded = score_answer(question, answer, corpus)
    trace = answer.retrieval
    return Result(
        question_id=question.id,
        flow=question.flow,
        arm=arm.name,
        version=version,
        call_index=call_index,
        prompt_tokens=trace.prompt_tokens,
        completion_tokens=trace.completion_tokens,
        duration_ms=trace.duration_ms,
        model=trace.model,
        truncated=trace.truncated,
        searched_ids=trace.searched_ids,
        traversed_ids=trace.traversed_ids,
        dropped_ids=trace.dropped_ids,
        recall=retrieval.recall,
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
        answer = arm.answer(question, version)
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
    return _scored(arm, question, version, corpus, answer, call_index)


def write_results(results: Sequence[Result], path: Path = RESULTS_PATH) -> Path:
    """Write the whole set, which is what makes a partial run readable."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [result.model_dump(mode='json') for result in results]
    path.write_text(json.dumps(payload, indent=2) + '\n')
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
) -> tuple[Result, ...]:
    """Sweep every arm over every question of every version, writing as it goes."""
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
                    write_results(collected, results_path)
    return tuple(collected)
