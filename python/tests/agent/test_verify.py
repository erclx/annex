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


DEPLOYER_TEXT = (
    'Deployers of high-risk AI systems shall take appropriate technical and '
    'organisational measures to ensure they use such systems in accordance with '
    'the instructions for use accompanying the systems.'
)

DATED_TEXT = (
    'This Regulation shall apply from 2 August 2026, save that Chapter III '
    'Section 4 shall apply from 2 August 2027 to high-risk AI systems.'
)

TIMING_QUESTION = (
    'when do the obligations for a high-risk AI system start to apply to us'
)

DESCRIBES_ITS_OWN_TIMING = (
    'a chatbot that tells the user when it is talking to a machine'
)
"""A description carrying `when` that asks nothing about a date.

This is the transparency flow the project leads with, and an earlier draft of
the timing gate matched the bare token and pushed it through a date check no
Article 50 answer can pass.
"""


def make_answer(
    *claims: Claim, question: str = 'Does Article 50 apply to my chatbot?'
) -> Answer:
    return Answer(
        question=question,
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

    def test_a_timing_question_resting_on_no_dated_provision_is_refused(self) -> None:
        """The recorded evaluation scored three of these as successes.

        A statement about deployer duties is faithful to the deployer article
        it cites and says nothing about when those duties begin, so grounding
        passes it and the reader gets a compliance date the text never gave.
        """
        deployer = Claim(
            statement=(
                'Deployers take appropriate technical and organisational measures '
                'to use such systems in accordance with the instructions for use.'
            ),
            citations=(make_citation(DEPLOYER_TEXT),),
        )

        verified = verify(make_answer(deployer, question=TIMING_QUESTION))

        assert verified.is_refusal
        assert verified.claims == ()

    def test_a_timing_question_resting_on_a_dated_provision_answers(self) -> None:
        dated = Claim(
            statement=(
                'This Regulation shall apply from 2 August 2026, and Chapter III '
                'Section 4 shall apply from 2 August 2027 to high-risk systems.'
            ),
            citations=(make_citation(DATED_TEXT),),
        )

        verified = verify(make_answer(dated, question=TIMING_QUESTION))

        assert not verified.is_refusal
        assert verified.claims == (dated,)

    def test_a_question_that_is_not_about_timing_needs_no_date(self) -> None:
        deployer = Claim(
            statement=(
                'Deployers take appropriate technical and organisational measures '
                'to use such systems in accordance with the instructions for use.'
            ),
            citations=(make_citation(DEPLOYER_TEXT),),
        )

        verified = verify(make_answer(deployer))

        assert not verified.is_refusal

    def test_a_description_saying_when_about_itself_is_not_a_timing_question(
        self,
    ) -> None:
        transparency = Claim(
            statement=(
                'Providers ensure natural persons are informed they are '
                'interacting with an AI system.'
            ),
            citations=(make_citation(),),
        )

        verified = verify(make_answer(transparency, question=DESCRIBES_ITS_OWN_TIMING))

        assert not verified.is_refusal

    def test_a_date_written_without_its_day_is_still_grounded(self) -> None:
        """The check reads the model's sentence, not the Act's.

        Nothing constrains how the model writes a date, so a claim naming the
        month and the year answers the question its citation answers.
        """
        dated = Claim(
            statement=(
                'This Regulation shall apply from August 2026 to high-risk AI systems.'
            ),
            citations=(make_citation(DATED_TEXT),),
        )

        verified = verify(make_answer(dated, question=TIMING_QUESTION))

        assert not verified.is_refusal

    def test_a_date_the_cited_text_does_not_carry_is_not_grounded(self) -> None:
        invented = Claim(
            statement=(
                'This Regulation shall apply from August 2031 to high-risk AI systems.'
            ),
            citations=(make_citation(DATED_TEXT),),
        )

        verified = verify(make_answer(invented, question=TIMING_QUESTION))

        assert verified.is_refusal

    def test_a_refusal_on_timing_names_the_provision_it_wanted(self) -> None:
        deployer = Claim(
            statement=(
                'Deployers take appropriate technical and organisational measures '
                'to use such systems in accordance with the instructions for use.'
            ),
            citations=(make_citation(DEPLOYER_TEXT),),
        )

        verified = verify(make_answer(deployer, question=TIMING_QUESTION))

        assert verified.refusal is not None
        assert 'date' in verified.refusal.missing[0]

    def test_an_answer_that_already_refused_passes_through(self) -> None:
        answer = Answer(
            question='Is my system grandfathered?',
            version=CorpusVersion.CONSOLIDATED,
            refusal=Refusal(reason='unsettled', missing=('the threshold',)),
        )

        assert verify(answer) is answer
