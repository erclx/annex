"""Scoring reads the trace, subtracts what the budget cut, and grades both ways."""

from annex.answer import Answer, Citation, Claim, Refusal, RetrievalTrace
from annex.corpus import CorpusVersion
from annex.corpus.models import Corpus
from annex.eval.questions import Flow, Question
from annex.eval.scoring import (
    article_root,
    score_answer,
    score_retrieval,
    supplied_ids,
)

CONSOLIDATED = CorpusVersion.CONSOLIDATED

ANSWERABLE = Question(
    id='q-test-answerable',
    description='a chatbot on our website',
    flow=Flow.TRANSPARENCY,
    gold=dict.fromkeys(CorpusVersion, ('art_50', 'art_3')),
)

REFUSING = Question(
    id='q-test-refusing',
    description='a system already on the market that we have since changed',
    flow=Flow.SUBSTANTIAL_MODIFICATION,
    gold=dict.fromkeys(CorpusVersion, ('art_111',)),
    expects_refusal=True,
)


def make_trace(
    searched: tuple[str, ...] = (),
    traversed: tuple[str, ...] = (),
    dropped: tuple[str, ...] = (),
) -> RetrievalTrace:
    return RetrievalTrace(
        searched_ids=searched, traversed_ids=traversed, dropped_ids=dropped
    )


def make_citation(corpus: Corpus, provision_id: str) -> Citation:
    provision = corpus.by_id[provision_id]
    return Citation(
        provision_id=provision.id,
        citation=provision.citation,
        kind=provision.kind,
        version=provision.version,
        text=provision.text,
    )


def make_answer(
    statement: str, citations: tuple[Citation, ...], trace: RetrievalTrace
) -> Answer:
    return Answer(
        question=ANSWERABLE.description,
        version=CONSOLIDATED,
        claims=(Claim(statement=statement, citations=citations),),
        retrieval=trace,
    )


class TestWhatCountsAsSupplied:
    def test_the_budget_cut_is_subtracted_from_what_reached_the_model(self) -> None:
        trace = make_trace(
            searched=('art_6',), traversed=('art_8', 'art_9'), dropped=('art_9',)
        )

        assert supplied_ids(trace) == ('art_6', 'art_8')

    def test_a_paragraph_resolves_to_the_article_holding_it(self) -> None:
        assert article_root('art_50.1') == 'art_50'

    def test_an_article_resolves_to_itself(self) -> None:
        assert article_root('anx_III') == 'anx_III'


class TestRetrievalScoring:
    def test_a_gold_article_is_found_through_its_paragraph(self) -> None:
        score = score_retrieval(
            ANSWERABLE, CONSOLIDATED, make_trace(searched=('art_50.1', 'art_3'))
        )

        assert score.recall == 1.0

    def test_a_gold_provision_nothing_reached_is_named(self) -> None:
        score = score_retrieval(
            ANSWERABLE, CONSOLIDATED, make_trace(searched=('art_50.1',))
        )

        assert score.missed == ('art_3',)

    def test_a_gold_provision_the_budget_cut_does_not_count_as_found(self) -> None:
        """Crediting retrieval for text nothing read is the lie the field prevents."""
        score = score_retrieval(
            ANSWERABLE,
            CONSOLIDATED,
            make_trace(
                searched=('art_50.1',), traversed=('art_3',), dropped=('art_3',)
            ),
        )

        assert score.missed == ('art_3',)

    def test_precision_over_nodes_counts_every_node_that_was_sent(self) -> None:
        score = score_retrieval(
            ANSWERABLE,
            CONSOLIDATED,
            make_trace(searched=('art_50.1', 'art_50.2'), traversed=('art_99',)),
        )

        assert score.precision_over_nodes == 2 / 3

    def test_precision_over_articles_collapses_the_paragraphs_first(self) -> None:
        score = score_retrieval(
            ANSWERABLE,
            CONSOLIDATED,
            make_trace(searched=('art_50.1', 'art_50.2'), traversed=('art_99',)),
        )

        assert score.precision_over_articles == 1 / 2

    def test_stuffing_the_document_scores_recall_high_and_precision_low(
        self, consolidated: Corpus
    ) -> None:
        """The baseline's denominator is the whole document, and that is honest."""
        every = tuple(item.id for item in consolidated.provisions)

        score = score_retrieval(ANSWERABLE, CONSOLIDATED, make_trace(searched=every))

        assert score.recall == 1.0
        assert score.precision_over_nodes < 0.05


class TestFaithfulness:
    def test_a_claim_in_the_words_of_what_was_supplied_scores_high(
        self, consolidated: Corpus
    ) -> None:
        citation = make_citation(consolidated, 'art_50')

        graded = score_answer(
            ANSWERABLE,
            make_answer(
                'Providers ensure natural persons are informed that they are '
                'interacting with an AI system',
                (citation,),
                make_trace(searched=('art_50',)),
            ),
            consolidated,
        )

        assert graded.faithfulness is not None
        assert graded.faithfulness > 0.6

    def test_a_claim_whose_supporting_text_was_not_supplied_scores_low(
        self, consolidated: Corpus
    ) -> None:
        """The claim cites a provision the prompt budget cut before synthesis."""
        citation = make_citation(consolidated, 'art_9')

        graded = score_answer(
            ANSWERABLE,
            make_answer(
                'A risk management system shall be established, implemented, '
                'documented and maintained throughout the lifecycle',
                (citation,),
                make_trace(
                    searched=('art_50',), traversed=('art_9',), dropped=('art_9',)
                ),
            ),
            consolidated,
        )

        assert graded.faithfulness is not None
        assert graded.faithfulness < 0.6
        assert graded.ungrounded_claims == 1

    def test_a_citation_the_model_was_never_handed_is_named(
        self, consolidated: Corpus
    ) -> None:
        citation = make_citation(consolidated, 'art_9')

        graded = score_answer(
            ANSWERABLE,
            make_answer(
                'A risk management system shall be maintained',
                (citation,),
                make_trace(
                    searched=('art_50',), traversed=('art_9',), dropped=('art_9',)
                ),
            ),
            consolidated,
        )

        assert graded.citations_not_supplied == ('art_9',)


class TestRefusalIsScoredBothWays:
    def test_refusing_the_question_that_should_refuse_is_right(
        self, consolidated: Corpus
    ) -> None:
        answer = Answer(
            question=REFUSING.description,
            version=CONSOLIDATED,
            refusal=Refusal(reason='the text does not settle it', missing=('what',)),
            retrieval=make_trace(searched=('art_111',)),
        )

        assert score_answer(REFUSING, answer, consolidated).refusal_correct

    def test_refusing_a_question_the_text_settles_is_wrong(
        self, consolidated: Corpus
    ) -> None:
        """An arm that refuses everything must not win the refusal flow."""
        answer = Answer(
            question=ANSWERABLE.description,
            version=CONSOLIDATED,
            refusal=Refusal(reason='the text does not settle it', missing=('what',)),
            retrieval=make_trace(searched=('art_50',)),
        )

        assert not score_answer(ANSWERABLE, answer, consolidated).refusal_correct

    def test_answering_a_question_that_should_refuse_is_wrong(
        self, consolidated: Corpus
    ) -> None:
        citation = make_citation(consolidated, 'art_111')
        answer = Answer(
            question=REFUSING.description,
            version=CONSOLIDATED,
            claims=(
                Claim(statement='Your system is grandfathered', citations=(citation,)),
            ),
            retrieval=make_trace(searched=('art_111',)),
        )

        assert not score_answer(REFUSING, answer, consolidated).refusal_correct

    def test_a_refusal_is_not_scored_for_faithfulness(
        self, consolidated: Corpus
    ) -> None:
        """A zero here would punish a correct refusal for having no claims."""
        answer = Answer(
            question=REFUSING.description,
            version=CONSOLIDATED,
            refusal=Refusal(reason='the text does not settle it', missing=('what',)),
            retrieval=make_trace(searched=('art_111',)),
        )

        assert score_answer(REFUSING, answer, consolidated).faithfulness is None
