"""Verification drops what the cited text does not carry.

The test that matters is the fabricated claim. A verification step that keeps
one is worse than no verification step, because it reports a guarantee it does
not provide.
"""

from annex.agent.verify import GROUNDING_THRESHOLD, grounding, verify
from annex.answer import Answer, Citation, Claim, Refusal, RetrievalTrace
from annex.corpus import CorpusVersion, ProvisionKind

ARTICLE_50_TEXT = (
    'Providers shall ensure that AI systems intended to interact directly with '
    'natural persons are designed and developed in such a way that the natural '
    'persons concerned are informed that they are interacting with an AI system, '
    'unless this is obvious from the point of view of a natural person who is '
    'reasonably well-informed, observant and circumspect.'
)


def make_citation(text: str = ARTICLE_50_TEXT) -> Citation:
    return Citation(
        provision_id='art_50',
        citation='Article 50',
        kind=ProvisionKind.ARTICLE,
        version=CorpusVersion.CONSOLIDATED,
        text=text,
    )


def make_answer(*claims: Claim) -> Answer:
    return Answer(
        question='Does Article 50 apply to my chatbot?',
        version=CorpusVersion.CONSOLIDATED,
        claims=claims,
        retrieval=RetrievalTrace(searched_ids=('art_50',)),
    )


class TestGrounding:
    def test_a_paraphrase_of_the_provision_scores_high(self) -> None:
        score = grounding(
            'Providers ensure natural persons are informed they are interacting '
            'with an AI system.',
            (make_citation(),),
        )

        assert score >= GROUNDING_THRESHOLD

    def test_a_statement_built_from_outside_knowledge_scores_low(self) -> None:
        score = grounding(
            'Operators register their deployment with the national supervisory '
            'authority within thirty days of launch.',
            (make_citation(),),
        )

        assert score < GROUNDING_THRESHOLD

    def test_a_statement_with_no_content_words_is_ungrounded(self) -> None:
        assert grounding('it is so.', (make_citation(),)) == 0.0


class TestVerify:
    def test_a_grounded_claim_survives(self) -> None:
        claim = Claim(
            statement=(
                'Providers ensure natural persons are informed they are '
                'interacting with an AI system.'
            ),
            citations=(make_citation(),),
        )

        verified = verify(make_answer(claim))

        assert verified.claims == (claim,)
        assert not verified.is_refusal

    def test_an_ungrounded_claim_is_dropped(self) -> None:
        grounded = Claim(
            statement=(
                'Providers ensure natural persons are informed they are '
                'interacting with an AI system.'
            ),
            citations=(make_citation(),),
        )
        fabricated = Claim(
            statement=(
                'Operators register their deployment with the national '
                'supervisory authority within thirty days of launch.'
            ),
            citations=(make_citation(),),
        )

        verified = verify(make_answer(grounded, fabricated))

        assert verified.claims == (grounded,)

    def test_an_answer_emptied_by_verification_becomes_a_refusal(self) -> None:
        fabricated = Claim(
            statement=(
                'Operators register their deployment with the national '
                'supervisory authority within thirty days of launch.'
            ),
            citations=(make_citation(),),
        )

        verified = verify(make_answer(fabricated))

        assert verified.is_refusal
        assert verified.claims == ()

    def test_a_refusal_from_verification_carries_what_was_read(self) -> None:
        fabricated = Claim(
            statement=(
                'Operators register their deployment with the national '
                'supervisory authority within thirty days of launch.'
            ),
            citations=(make_citation(),),
        )

        verified = verify(make_answer(fabricated))

        assert verified.refusal is not None
        assert verified.refusal.consulted[0].provision_id == 'art_50'

    def test_verification_keeps_the_trace_it_was_given(self) -> None:
        fabricated = Claim(
            statement='Operators register within thirty days of launch.',
            citations=(make_citation(),),
        )

        verified = verify(make_answer(fabricated))

        assert verified.retrieval.searched_ids == ('art_50',)

    def test_an_answer_that_already_refused_passes_through(self) -> None:
        answer = Answer(
            question='Is my system grandfathered?',
            version=CorpusVersion.CONSOLIDATED,
            refusal=Refusal(reason='unsettled', missing=('the threshold',)),
        )

        assert verify(answer) is answer
