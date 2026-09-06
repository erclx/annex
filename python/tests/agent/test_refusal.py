"""Refusal on the worked example, and refusal as a return value rather than a raise.

`.claude/context/ai-act.md` names grandfathering as the case the text leaves
open: a system already on the market before the amended deadlines falls outside
full high-risk compliance unless later substantially modified, and no regulator
has defined that threshold. A tool that answers it is guessing.

The stubbed half of this file runs everywhere and asserts the shape of a
refusal. The live half asks the real model the real question and carries the
`live` marker, for the reason `test_article_50.py` gives.
"""

import pytest

from annex.agent import Pipeline
from annex.answer import Answer
from annex.corpus import CorpusVersion
from tests.agent.conftest import BuildPipeline

GRANDFATHERING = (
    'We put a CV screening system into service in 2024 and have not changed it '
    'since. Do the high-risk obligations apply to us now?'
)


class TestRefusalIsAReturnValue:
    def test_a_refusal_carries_a_populated_answer_rather_than_raising(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(
            [
                'high-risk classification and substantial modification',
                'REFUSE\nwhat counts as a substantial modification',
            ]
        )

        answer = pipeline.ask(GRANDFATHERING)

        assert isinstance(answer, Answer)
        assert answer.is_refusal

    def test_a_refusal_names_what_the_text_does_not_settle(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(
            [
                'high-risk classification and substantial modification',
                'REFUSE\nwhat counts as a substantial modification',
            ]
        )

        answer = pipeline.ask(GRANDFATHERING)

        assert answer.refusal is not None
        assert 'substantial modification' in ' '.join(answer.refusal.missing)

    def test_a_refusal_shows_what_was_read_before_refusing(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(
            ['high-risk classification', 'REFUSE\nthe threshold']
        )

        answer = pipeline.ask(GRANDFATHERING)

        assert answer.refusal is not None
        assert answer.refusal.consulted

    def test_a_refusal_still_reports_what_it_cost(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(
            ['high-risk classification', 'REFUSE\nthe threshold']
        )

        answer = pipeline.ask(GRANDFATHERING)

        assert answer.retrieval.prompt_tokens > 0


@pytest.mark.live
class TestAgainstTheRealModel:
    def test_the_grandfathering_question_does_not_come_back_as_a_verdict(
        self, live_pipeline: Pipeline
    ) -> None:
        answer = live_pipeline.ask(GRANDFATHERING, version=CorpusVersion.CONSOLIDATED)

        statements = ' '.join(claim.statement.lower() for claim in answer.claims)

        assert 'do not apply to you' not in statements
        assert 'you are exempt' not in statements
        assert 'you comply' not in statements
