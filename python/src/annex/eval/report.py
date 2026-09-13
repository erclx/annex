"""The tables, and the readings that would mislead if a table stood alone.

Rendered as markdown so the result file and the write-up carry the same
numbers. Everything here is arithmetic over `results.json` and nothing is
recomputed from the corpus, so a figure in the report is traceable to the run
that produced it.

## What each table is for

The per-arm table answers the question the project exists to ask: does
retrieval earn its place against a model reading the whole document. The cost
table answers what that costs. The per-question table is what makes a headline
checkable, since twelve questions is a small enough denominator that one wrong
answer moves accuracy by more than eight points.

## What the report says beside the numbers

Several readings would be wrong taken from a table alone, so `render` writes
each one out rather than leaving a reader to notice it. The list lives there
rather than here, because a count kept in two places goes stale in one of them.

The shape they share is that every column has a denominator the column does not
show. Precision divides by what an arm was handed, so the baseline's whole
document makes it look absurd until that is said. Faithfulness matches against
the supplied text, so the same denominator flatters the arm supplied with most.
The refusal columns run over the questions that expect each behavior rather than
over the set. And the money column divides by a rate nobody paid.
"""

import json
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from statistics import mean

from annex.corpus import CorpusVersion
from annex.eval.capture import head_commit
from annex.eval.runner import Result
from annex.eval.sensitivity import DepthRow
from annex.settings import Settings

PROMPT_RATE_A_MILLION = 3.00
COMPLETION_RATE_A_MILLION = 15.00
"""An illustrative hosted rate, named here rather than attributed to a vendor.

Nothing in this project was paid for. The projection exists so the token
columns mean something to a reader without an RTX 5090, and naming the rate
inline is what stops it reading as a bill. Change the two constants and every
money figure in the report moves with them.
"""


def _mean(values: Sequence[float]) -> float:
    return mean(values) if values else 0.0


def _plural(count: int, noun: str) -> str:
    return f'{count} {noun}' if count == 1 else f'{count} {noun}s'


@dataclass(frozen=True)
class ArmSummary:
    """One arm on one version, over the questions it answered."""

    arm: str
    version: CorpusVersion
    answered: int
    failed: int
    recall: float
    recall_reached: float
    precision_over_nodes: float
    precision_over_articles: float
    nodes_supplied: float
    faithfulness: float | None
    refusal_questions: int
    correct_refusals: int
    answer_questions: int
    false_refusals: int
    """Refusal, split by what the question asked for rather than aggregated.

    A single rate over all twelve questions is mostly a measure of answering,
    since nine of them expect an answer and an arm scores those by answering.
    That reads as eight or nine out of twelve while the arm is catching one
    refusal question in three. The two counts are what make the weakness
    visible, and they run over different denominators, so neither is a rate on
    its own.
    """

    truncated: int
    prompt_tokens: int
    completion_tokens: int
    duration_ms: int
    first_call_ms: int | None
    """The opening call's wall time, or nothing when that call failed.

    The whole prompt-cache argument reads off this against `later_calls_ms`,
    so it names the call the sweep actually opened with rather than the
    earliest one that happened to succeed. Reporting question two's cached
    23 seconds as a cold prefill would invert the reading it exists to give.
    """

    later_calls_ms: float | None

    @property
    def projected_cost(self) -> float:
        return (
            self.prompt_tokens / 1_000_000 * PROMPT_RATE_A_MILLION
            + self.completion_tokens / 1_000_000 * COMPLETION_RATE_A_MILLION
        )


def summarize(results: Sequence[Result]) -> tuple[ArmSummary, ...]:
    """One row per arm and version, over the results that are not failures."""
    keys = list(dict.fromkeys((item.arm, item.version) for item in results))
    summaries: list[ArmSummary] = []
    for arm, version in keys:
        group = [
            item for item in results if item.arm == arm and item.version == version
        ]
        scored = [item for item in group if not item.is_failure]
        faithful = [
            item.faithfulness for item in scored if item.faithfulness is not None
        ]
        ordered = sorted(scored, key=lambda item: item.call_index)
        opened = ordered[0] if ordered and ordered[0].call_index == 0 else None
        later = [
            item.duration_ms
            for item in ordered
            if opened is None or item.call_index != 0
        ]
        summaries.append(
            ArmSummary(
                arm=arm,
                version=version,
                answered=len(scored),
                failed=len(group) - len(scored),
                recall=_mean([item.recall for item in scored]),
                recall_reached=_mean([item.recall_reached for item in scored]),
                precision_over_nodes=_mean(
                    [item.precision_over_nodes for item in scored]
                ),
                precision_over_articles=_mean(
                    [item.precision_over_articles for item in scored]
                ),
                nodes_supplied=_mean([item.nodes_supplied for item in scored]),
                faithfulness=_mean(faithful) if faithful else None,
                refusal_questions=sum(1 for item in scored if item.expects_refusal),
                correct_refusals=sum(
                    1 for item in scored if item.expects_refusal and item.refused
                ),
                answer_questions=sum(1 for item in scored if not item.expects_refusal),
                false_refusals=sum(
                    1 for item in scored if not item.expects_refusal and item.refused
                ),
                truncated=sum(1 for item in scored if item.truncated),
                prompt_tokens=sum(item.prompt_tokens for item in scored),
                completion_tokens=sum(item.completion_tokens for item in scored),
                duration_ms=sum(item.duration_ms for item in scored),
                first_call_ms=opened.duration_ms if opened else None,
                later_calls_ms=_mean(later) if later else None,
            )
        )
    return tuple(summaries)


def write_summary(results: Sequence[Result], *, out: Path) -> None:
    """Write `summarize(results)` as the fixture the answer surface reads.

    Stamped with the commit and date the same way `capture.Manifest` is, so a
    fixture that no longer matches the tree it was generated from is a stale
    stamp rather than a silent mismatch. Nothing here reruns the model:
    `results` is already-scored data, read from `python/data/eval/results.json`
    by the caller. `generation_model` and `embedding_model` are read off
    `Settings`, and `baseline_model` off `full_context.LONG_CONTEXT_MODEL`,
    rather than any of the three being retyped in the component that renders
    this. The baseline import is deferred rather than module-level: importing
    `full_context` pulls in `annex.agent.pipeline` and, through it, LangGraph,
    the exact cost `annex.__main__._arms` already defers a plain CLI command
    should not pay.
    """
    from annex.eval.arms.full_context import LONG_CONTEXT_MODEL

    settings = Settings()
    payload = {
        'commit': head_commit(),
        'captured_at': datetime.now(UTC).date().isoformat(),
        'generation_model': settings.generation_model,
        'embedding_model': settings.embedding_model,
        'baseline_model': LONG_CONTEXT_MODEL,
        'arms': [
            {**asdict(summary), 'projected_cost': summary.projected_cost}
            for summary in summarize(results)
        ],
    }
    out.write_text(json.dumps(payload, indent=2) + '\n')


def _optional(value: float | None, spec: str = '.2f') -> str:
    return 'not scored' if value is None else format(value, spec)


def _accuracy_table(summaries: Sequence[ArmSummary]) -> list[str]:
    lines = [
        '| Arm | Version | Answered | Failed | Recall | Recall reached | '
        'Precision, nodes | Precision, articles | Nodes sent | Faithfulness | '
        'Correct refusals | False refusals | Answers cut |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | '
        '--- | --- |',
    ]
    for row in summaries:
        lines.append(
            f'| {row.arm} | {row.version} | {row.answered} | {row.failed} | '
            f'{row.recall:.2f} | {row.recall_reached:.2f} | '
            f'{row.precision_over_nodes:.3f} | '
            f'{row.precision_over_articles:.3f} | {row.nodes_supplied:.1f} | '
            f'{_optional(row.faithfulness)} | '
            f'{row.correct_refusals}/{row.refusal_questions} | '
            f'{row.false_refusals}/{row.answer_questions} | '
            f'{row.truncated} |'
        )
    return lines


def _cost_table(summaries: Sequence[ArmSummary]) -> list[str]:
    lines = [
        '| Arm | Version | Prompt tokens | Completion tokens | Wall time | '
        'First call | Later calls, mean | Paid | Projected |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ]
    for row in summaries:
        later = (
            'one call only'
            if row.later_calls_ms is None
            else f'{row.later_calls_ms / 1000:.1f} s'
        )
        opened = (
            'failed'
            if row.first_call_ms is None
            else f'{row.first_call_ms / 1000:.1f} s'
        )
        lines.append(
            f'| {row.arm} | {row.version} | {row.prompt_tokens} | '
            f'{row.completion_tokens} | {row.duration_ms / 1000:.1f} s | '
            f'{opened} | {later} | $0.00 | ${row.projected_cost:.2f} |'
        )
    return lines


def _question_table(results: Sequence[Result]) -> list[str]:
    lines = [
        '| Question | Flow | Arm | Version | Recall | Faithfulness | Refused | '
        'Right | Wall time | Missed |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ]
    for item in results:
        if item.is_failure:
            lines.append(
                f'| {item.question_id} | {item.flow} | {item.arm} | '
                f'{item.version} | failed | failed | failed | failed | '
                f'{item.duration_ms / 1000:.1f} s | {item.error} |'
            )
            continue
        missed = ', '.join(item.missed) if item.missed else 'nothing'
        lines.append(
            f'| {item.question_id} | {item.flow} | {item.arm} | {item.version} | '
            f'{item.recall:.2f} | {_optional(item.faithfulness)} | '
            f'{"yes" if item.refused else "no"} | '
            f'{"yes" if item.refusal_correct else "no"} | '
            f'{item.duration_ms / 1000:.1f} s | {missed} |'
        )
    return lines


def _sensitivity_table(rows: Sequence[DepthRow]) -> list[str]:
    lines = [
        '| Version | Depth | Questions | Recall | Nodes reached | Articles reached |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for row in rows:
        lines.append(
            f'| {row.version} | {row.depth} | {row.questions} | {row.recall:.2f} | '
            f'{row.nodes_supplied:.1f} | {row.articles_supplied:.1f} |'
        )
    return lines


def render(results: Sequence[Result], depths: Sequence[DepthRow] = ()) -> str:
    """The whole report, tables and caveats, as markdown."""
    if not results:
        return 'No results. Run: uv run python -m annex evaluate\n'

    summaries = summarize(results)
    questions = len({item.question_id for item in results})
    failures = [item for item in results if item.is_failure]

    lines = [
        '## Accuracy',
        '',
        f'{_plural(questions, "question")}, {_plural(len(results), "run")}, '
        f'{len(failures)} of them failed.',
        '',
        *_accuracy_table(summaries),
        '',
        '## Cost',
        '',
        'Nothing was paid for. Every call ran locally against Ollama, so the '
        'paid column is zero and the projection is arithmetic at '
        f'${PROMPT_RATE_A_MILLION:.2f} per million prompt tokens and '
        f'${COMPLETION_RATE_A_MILLION:.2f} per million completion tokens, an '
        'illustrative rate named here rather than attributed.',
        '',
        *_cost_table(summaries),
        '',
        '## Per question',
        '',
        *_question_table(results),
        '',
    ]
    if depths:
        lines.extend(
            [
                '## Traversal depth',
                '',
                'The traversal arm runs at depth 2. These rows re-walk the seeds '
                'the search-only arm recorded, at one depth below and one above, '
                'so the setting is measured rather than asserted. No model was '
                'called to produce them.',
                '',
                *_sensitivity_table(depths),
                '',
            ]
        )
    lines.extend(
        [
            '## What these numbers do not say',
            '',
            '- The full-context arm retrieves nothing, so its precision '
            'denominator is every provision it was handed, which is the whole '
            'document. Near-zero precision there is the cost of stuffing rather '
            'than a failure of the arm.',
            '- Faithfulness is span containment against what the model was '
            'supplied. It measures quotation fidelity. An answer that quotes '
            'correctly and reasons wrongly scores 1.0, and no lexical test '
            'catches that.',
            '- Faithfulness is not comparable across arms without the nodes-sent '
            'column beside it. An arm supplied with the whole document is '
            "matched against the whole document's vocabulary, so it starts "
            'ahead of an arm supplied with fifty provisions. The two columns '
            "are read together, and the baseline's lead on this metric is "
            'partly its denominator rather than its answers.',
            '- Recall and precision are read together or not at all. An arm '
            'reaching every gold provision by sending a quarter of the document '
            'scores 1.0 on recall, and the precision column is what that cost.',
            '- Recall reached counts what the walk found before the synthesis '
            'prompt budget cut anything from it; recall counts what survived '
            'to reach the model. The gap between the two columns is the '
            'budget spending what the walk already earned, not a retrieval '
            'failure.',
            '- The two refusal columns run over different denominators and '
            'neither is a rate. Correct refusals count the questions the text '
            'does not settle, and false refusals count the ones it does. A '
            'single figure over all questions would mostly measure answering, '
            'since most of the set expects an answer. Read the per-question '
            'table for which questions a false refusal landed on: they '
            'concentrate by flow rather than scattering, and which flow an arm '
            'refuses is a fact about that arm.',
            '- An answer in the cut column stopped because it ran out of room '
            'to write, not because it had finished. Every arm gets the same '
            'generation budget so the comparison holds, and an arm that reaches '
            'that budget more often is reasoning longer over more text rather '
            'than being penalized by the harness. The cut answers are scored as '
            'they came back rather than dropped, and the count is given so the '
            'scores can be read against it.',
            f'- {_plural(questions, "question")} is a small denominator. One wrong '
            f'answer moves a rate by more than {100 / questions:.0f} points, so '
            'the counts are given beside every rate.',
            '',
        ]
    )
    if failures:
        lines.extend(
            [
                '## Failures',
                '',
                *(
                    f'- `{item.arm}` on `{item.question_id}` '
                    f'({item.version}): {item.error}'
                    for item in failures
                ),
                '',
            ]
        )
    return '\n'.join(lines)
