"""Refusal on the worked example, and refusal as a return value rather than a raise.

`canon/context/ai-act.md` names grandfathering as the case the text leaves
open: a system already on the market before the amended deadlines falls outside
full high-risk compliance unless later substantially modified, and no regulator
has defined that threshold. A tool that answers it is guessing.

The stubbed half of this file runs everywhere and asserts the shape of a
refusal. The live half asks the real model the real question and carries the
`live` marker, for the reason `test_article_50.py` gives.
"""

import pytest

from annex.agent import Pipeline
from annex.agent.pipeline import (
    DECLARED_REFUSAL_REASON,
    FALLBACK_REFUSAL_REASON,
    parse_draft,
)
from annex.agent.verify import (
    CALENDAR_DATE,
    GROUNDING_REFUSAL_REASON,
    TIMING_REFUSAL_REASON,
    verify,
)
from annex.answer import Answer, Citation, Claim, RetrievalTrace
from annex.corpus import CorpusVersion, ProvisionKind
from tests.agent.conftest import BuildPipeline

DEPLOYER_TEXT = (
    'Deployers of high-risk AI systems shall take appropriate technical and '
    'organisational measures to ensure they use such systems in accordance with '
    'the instructions for use accompanying the systems.'
)

TIMING_QUESTION = (
    'when do the obligations for a high-risk AI system start to apply to us'
)


def _citation(text: str) -> Citation:
    return Citation(
        provision_id='art_26',
        citation='Article 26',
        kind=ProvisionKind.ARTICLE,
        version=CorpusVersion.CONSOLIDATED,
        text=text,
    )


def _answer(*claims: Claim, question: str) -> Answer:
    return Answer(
        question=question,
        version=CorpusVersion.CONSOLIDATED,
        claims=claims,
        retrieval=RetrievalTrace(searched_ids=('art_26',)),
    )


class TestEachExitCarriesItsOwnReason:
    """The four reasons are what a reader tells an old `results.json` row's
    refusal exit apart by, since `Result.refusal_reason` records
    `answer.refusal.reason` directly rather than the stage that produced it.
    """

    def test_the_declared_marker_exit_carries_its_constant(self) -> None:
        _, refusal = parse_draft('REFUSE\nthe threshold', citations=())

        assert refusal is not None
        assert refusal.reason == DECLARED_REFUSAL_REASON

    def test_the_fallback_exit_carries_its_constant(self) -> None:
        _, refusal = parse_draft('this line cites nothing at all', citations=())

        assert refusal is not None
        assert refusal.reason == FALLBACK_REFUSAL_REASON

    def test_the_timing_exit_carries_its_constant(self) -> None:
        deployer = Claim(
            statement=(
                'Deployers take appropriate technical and organisational '
                'measures to use such systems in accordance with the '
                'instructions for use.'
            ),
            citations=(_citation(DEPLOYER_TEXT),),
        )

        verified = verify(_answer(deployer, question=TIMING_QUESTION))

        assert verified.refusal is not None
        assert verified.refusal.reason == TIMING_REFUSAL_REASON

    def test_the_grounding_exit_carries_its_constant(self) -> None:
        fabricated = Claim(
            statement=(
                'Operators register their deployment with the national '
                'supervisory authority within thirty days of launch.'
            ),
            citations=(_citation(DEPLOYER_TEXT),),
        )

        verified = verify(_answer(fabricated, question='Does Article 26 apply?'))

        assert verified.refusal is not None
        assert verified.refusal.reason == GROUNDING_REFUSAL_REASON


GRANDFATHERING = (
    'We put a CV screening system into service in 2024 and have not changed it '
    'since. Do the high-risk obligations apply to us now?'
)

DEADLINE = 'when do the obligations for a high-risk AI system start to apply to us'


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

    def test_a_refusals_missing_lines_carry_no_bracketed_marker(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(
            [
                'high-risk classification and substantial modification',
                'REFUSE\nwhat counts as a substantial modification [1]',
            ]
        )

        answer = pipeline.ask(GRANDFATHERING)

        assert answer.refusal is not None
        assert '[' not in ' '.join(answer.refusal.missing)


@pytest.mark.live
class TestTheDeadlineFlow:
    """The flow the recorded evaluation refused, held against the failure beside it.

    Grandfathering above is a question the text leaves open, so a refusal there
    is the product working. A compliance date is not: the Act states it. What
    this holds is the weaker property the shipped embedder can actually deliver,
    since `nomic-embed-text` reaches neither Article 111 nor Article 113 on this
    question against the consolidated text, at any query form measured. Either
    the answer gives a date its own citation carries, or it refuses. What it may
    not do is what three recorded runs did, which is answer "when do the obligations
    start" from provisions carrying no date and score as a success.
    """

    def test_a_deadline_answer_gives_a_date_or_refuses(
        self, live_pipeline: Pipeline
    ) -> None:
        answer = live_pipeline.ask(DEADLINE, version=CorpusVersion.CONSOLIDATED)

        stated = ' '.join(claim.statement for claim in answer.claims)

        assert answer.is_refusal or CALENDAR_DATE.search(stated)


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
