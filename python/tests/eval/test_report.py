"""The report's arithmetic, since the headline claims are sums over the results."""

from annex.corpus import CorpusVersion
from annex.eval.questions import Flow
from annex.eval.report import (
    COMPLETION_RATE_A_MILLION,
    PROMPT_RATE_A_MILLION,
    render,
    summarize,
)
from annex.eval.runner import Result

CONSOLIDATED = CorpusVersion.CONSOLIDATED


def make_result(call_index: int, **overrides: object) -> Result:
    fields: dict[str, object] = {
        'question_id': f'q{call_index:02d}-test',
        'flow': Flow.TRANSPARENCY,
        'arm': 'full-context',
        'version': CONSOLIDATED,
        'call_index': call_index,
        'prompt_tokens': 1000,
        'completion_tokens': 100,
        'duration_ms': 1000,
        'recall': 1.0,
        'faithfulness': 0.9,
        'refusal_correct': True,
    }
    fields.update(overrides)
    return Result(**fields)  # type: ignore[arg-type]


class TestTheCacheReadingIsSplitOut:
    def test_the_first_call_is_reported_apart_from_the_rest(self) -> None:
        """A mean over both hides the prefill the cache is supposed to remove."""
        results = [
            make_result(0, duration_ms=70_000),
            make_result(1, duration_ms=23_000),
            make_result(2, duration_ms=21_000),
        ]

        summary = summarize(results)[0]

        assert summary.first_call_ms == 70_000
        assert summary.later_calls_ms == 22_000

    def test_the_first_call_is_the_first_asked_not_the_fastest(self) -> None:
        results = [
            make_result(1, duration_ms=23_000),
            make_result(0, duration_ms=70_000),
        ]

        assert summarize(results)[0].first_call_ms == 70_000

    def test_a_single_call_reports_no_later_mean(self) -> None:
        assert summarize([make_result(0)])[0].later_calls_ms is None

    def test_a_failed_opening_call_is_not_replaced_by_the_second(self) -> None:
        """The second call is cached, so reporting it as a prefill inverts it."""
        results = [
            make_result(0, error='ContextOverflowError: cut'),
            make_result(1, duration_ms=23_000),
        ]

        assert summarize(results)[0].first_call_ms is None

    def test_the_calls_after_a_failed_opening_still_average(self) -> None:
        results = [
            make_result(0, error='ContextOverflowError: cut'),
            make_result(1, duration_ms=23_000),
        ]

        assert summarize(results)[0].later_calls_ms == 23_000


class TestTheSummaryGroups:
    def test_each_arm_and_version_is_its_own_row(self) -> None:
        results = [
            make_result(0),
            make_result(0, arm='search-only'),
            make_result(0, version=CorpusVersion.ORIGINAL),
        ]

        assert len(summarize(results)) == 3

    def test_a_failed_run_is_counted_apart_from_the_scored_ones(self) -> None:
        """Averaging a placeholder score into an arm reports a failure as a result."""
        results = [make_result(0), make_result(1, error='ContextOverflowError: cut')]

        summary = summarize(results)[0]

        assert summary.answered == 1
        assert summary.failed == 1

    def test_a_failed_run_contributes_no_tokens(self) -> None:
        results = [make_result(0), make_result(1, error='ContextOverflowError: cut')]

        assert summarize(results)[0].prompt_tokens == 1000

    def test_refusals_are_split_by_what_the_question_asked_for(self) -> None:
        """One rate over both would mostly measure answering, not refusing."""
        results = [
            make_result(0, expects_refusal=True, refused=True),
            make_result(1, expects_refusal=True, refused=False),
            make_result(2, expects_refusal=False, refused=True),
            make_result(3, expects_refusal=False, refused=False),
        ]

        summary = summarize(results)[0]

        assert (summary.correct_refusals, summary.refusal_questions) == (1, 2)
        assert (summary.false_refusals, summary.answer_questions) == (1, 2)

    def test_answering_every_question_scores_no_correct_refusal(self) -> None:
        """An arm that never refuses cannot score on the questions that need it."""
        results = [
            make_result(0, expects_refusal=True, refused=False),
            make_result(1, expects_refusal=False, refused=False),
        ]

        summary = summarize(results)[0]

        assert summary.correct_refusals == 0
        assert summary.false_refusals == 0

    def test_a_refusal_does_not_drag_the_faithfulness_mean_down(self) -> None:
        results = [make_result(0), make_result(1, refused=True, faithfulness=None)]

        assert summarize(results)[0].faithfulness == 0.9

    def test_recall_reached_averages_apart_from_delivered_recall(self) -> None:
        """The budget cut is what separates the two columns, not scoring."""
        results = [
            make_result(0, recall=0.5, recall_reached=1.0),
            make_result(1, recall=0.3, recall_reached=0.6),
        ]

        summary = summarize(results)[0]

        assert summary.recall == 0.4
        assert summary.recall_reached == 0.8


class TestTheCostProjection:
    def test_the_projection_is_arithmetic_on_the_named_rate(self) -> None:
        summary = summarize([make_result(0)])[0]

        assert summary.projected_cost == (
            1000 / 1_000_000 * PROMPT_RATE_A_MILLION
            + 100 / 1_000_000 * COMPLETION_RATE_A_MILLION
        )


class TestWhatTheReportStates:
    def test_an_empty_run_says_so_rather_than_rendering_empty_tables(self) -> None:
        assert 'No results' in render([])

    def test_the_report_names_what_was_paid(self) -> None:
        rendered = render([make_result(0)])

        assert '$0.00' in rendered

    def test_the_report_states_the_faithfulness_denominator_caveat(self) -> None:
        """The baseline's lead on that metric is partly its denominator."""
        rendered = render([make_result(0)])

        assert 'nodes-sent' in rendered

    def test_a_failure_is_listed_rather_than_averaged_away(self) -> None:
        rendered = render([make_result(0, error='ContextOverflowError: cut')])

        assert 'ContextOverflowError' in rendered

    def test_the_report_carries_a_recall_reached_column_and_caveat(self) -> None:
        rendered = render([make_result(0, recall=0.5, recall_reached=1.0)])

        assert 'Recall reached' in rendered
        assert '1.00' in rendered
