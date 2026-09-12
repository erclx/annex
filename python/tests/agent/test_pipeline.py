"""The graph runs, the branch into refusal is reachable, and the trace fills.

Against a fixture index and a scripted model, so what is under test is the
pipeline's own wiring rather than the model's judgement.
"""

from annex.agent.pipeline import (
    DENSEST_CHARACTERS_A_TOKEN,
    SCAFFOLDING_TOKENS,
    SYNTHESIS_BUDGET,
    parse_draft,
)
from annex.answer import Citation
from annex.corpus import CorpusVersion, ProvisionKind
from tests.agent.conftest import BuildPipeline

CHATBOT = 'a chatbot that talks to customers on our website'

DEADLINE = 'when do the obligations for a high-risk AI system start to apply to us'


def make_citation(
    provision_id: str, text: str, kind: ProvisionKind = ProvisionKind.ARTICLE
) -> Citation:
    return Citation(
        provision_id=provision_id,
        citation=provision_id,
        kind=kind,
        version=CorpusVersion.CONSOLIDATED,
        text=text,
    )


GROUNDED = (
    'Providers ensure natural persons are informed that they are interacting '
    'with an AI system [1]'
)


class TestTheGraphRuns:
    def test_a_grounded_draft_comes_back_as_claims(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert not answer.is_refusal
        assert answer.claims

    def test_a_claim_cites_a_provision_that_was_retrieved(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        cited = {
            citation.provision_id
            for claim in answer.claims
            for citation in claim.citations
        }

        assert cited <= set(
            answer.retrieval.searched_ids + answer.retrieval.traversed_ids
        )

    def test_the_question_survives_onto_the_answer(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert answer.question == CHATBOT
        assert answer.version is CorpusVersion.CONSOLIDATED


class TestRouting:
    def test_the_routed_query_is_what_reaches_retrieval(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, client = build_pipeline(
            ['transparency obligations for AI systems', GROUNDED]
        )

        pipeline.ask(CHATBOT)

        assert CHATBOT in client.prompts[0]

    def test_a_question_about_timing_is_routed_asking_for_the_timing(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """The prompt asked for subject matter alone and got exactly that.

        `q10` and `q12` of the gold set came back as sentences carrying no
        temporal word, and Article 113 is the only provision in either version
        carrying a date, so the half of the question the answer was in never
        reached the index. The routed sentence is the model's, and what this
        can hold is the instruction that produces it.
        """
        pipeline, client = build_pipeline(['the date of application', GROUNDED])

        pipeline.ask(DEADLINE)

        assert 'date of application' in client.prompts[0]

    def test_a_routing_step_that_returns_nothing_falls_back_to_the_question(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert answer.claims


class TestTheRefusalBranch:
    def test_a_declared_refusal_reaches_the_refusal_exit(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(
            ['transparency obligations', 'REFUSE\nwhat a substantial modification is']
        )

        answer = pipeline.ask(CHATBOT)

        assert answer.is_refusal
        assert answer.refusal is not None
        assert 'substantial modification' in answer.refusal.missing[0]

    def test_a_refusal_carries_what_was_read_before_refusing(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', 'REFUSE\nnothing'])

        answer = pipeline.ask(CHATBOT)

        assert answer.refusal is not None
        assert answer.refusal.consulted

    def test_verification_emptying_the_claims_reaches_refusal(
        self, build_pipeline: BuildPipeline
    ) -> None:
        fabricated = (
            'Operators register their deployment with the national supervisory '
            'authority within thirty days of launch [1]'
        )
        pipeline, _ = build_pipeline(['transparency obligations', fabricated])

        answer = pipeline.ask(CHATBOT)

        assert answer.is_refusal

    def test_a_draft_citing_nothing_reaches_refusal(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(
            ['transparency obligations', 'Article 50 applies to your chatbot.']
        )

        answer = pipeline.ask(CHATBOT)

        assert answer.is_refusal


class TestThePromptBudget:
    """The prompt grows with the traversal cap and the window does not.

    Measured on the Article 6 chain of the consolidated text at `6e7d6e0`: 51
    provisions assembled to 139 394 characters, read back as 29 170 prompt
    tokens, leaving 3 598 of a 32 768 window to answer in. Generation stopped
    at the window rather than at the budget, mid-word, and the cut draft
    parsed as a finished answer.
    """

    def test_the_budget_is_the_window_less_what_the_answer_needs(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        available = 32768 - SYNTHESIS_BUDGET - SCAFFOLDING_TOKENS

        assert pipeline._prompt_budget() == int(available * DENSEST_CHARACTERS_A_TOKEN)

    def test_provisions_beyond_the_budget_are_dropped(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = tuple(make_citation(f'art_{n}', 'x' * 4000) for n in range(200))

        kept, _ = pipeline._within_budget(citations)

        assert len(kept) < len(citations)

    def test_the_furthest_traversed_are_the_ones_dropped(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = tuple(make_citation(f'art_{n}', 'x' * 4000) for n in range(200))

        kept, _ = pipeline._within_budget(citations)

        assert [item.provision_id for item in kept] == [
            f'art_{n}' for n in range(len(kept))
        ]

    def test_what_survives_fits_the_budget(self, build_pipeline: BuildPipeline) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = tuple(make_citation(f'art_{n}', 'x' * 4000) for n in range(200))

        kept, _ = pipeline._within_budget(citations)

        assert sum(len(item.text) for item in kept) <= pipeline._prompt_budget()

    def test_one_provision_over_budget_is_still_sent(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """A prompt with nothing in it answers nothing, so the first is kept."""
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        enormous = (make_citation('art_3', 'x' * 500_000),)

        assert pipeline._within_budget(enormous)[0] == enormous

    def test_a_result_inside_the_budget_is_untouched(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = tuple(make_citation(f'art_{n}', 'x' * 100) for n in range(5))

        assert pipeline._within_budget(citations)[0] == citations

    def test_nothing_dropped_reports_nothing_dropped(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = tuple(make_citation(f'art_{n}', 'x' * 100) for n in range(5))

        assert pipeline._within_budget(citations)[1] == ()

    def test_the_dropped_provisions_are_named_rather_than_counted(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """The evaluation resolves ids, and a count says which is missing."""
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = tuple(make_citation(f'art_{n}', 'x' * 4000) for n in range(200))

        kept, dropped = pipeline._within_budget(citations)

        assert dropped == tuple(f'art_{n}' for n in range(len(kept), 200))

    def test_kept_and_dropped_together_account_for_everything(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = tuple(make_citation(f'art_{n}', 'x' * 4000) for n in range(200))

        kept, dropped = pipeline._within_budget(citations)

        assert len(kept) + len(dropped) == len(citations)

    def test_a_recital_ahead_of_an_article_in_arrival_ranks_behind_it(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """A search-side recital no longer spends budget a traversed article needs."""
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = (
            make_citation('rec_1', 'x' * 100, kind=ProvisionKind.RECITAL),
            make_citation('art_10', 'x' * 100),
        )

        kept, _ = pipeline._within_budget(citations)

        assert [item.provision_id for item in kept] == ['art_10', 'rec_1']

    def test_a_recital_is_dropped_before_the_articles_behind_it_in_arrival(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        recitals = tuple(
            make_citation(f'rec_{n}', 'x' * 4000, kind=ProvisionKind.RECITAL)
            for n in range(10)
        )
        articles = tuple(make_citation(f'art_{n}', 'x' * 4000) for n in range(10))

        kept, dropped = pipeline._within_budget(recitals + articles)

        assert dropped
        assert {item.provision_id for item in kept} >= {
            item.provision_id for item in articles
        }
        assert set(dropped) <= {item.provision_id for item in recitals}

    def test_citations_of_the_same_tier_keep_arrival_order(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        citations = (
            make_citation('art_5', 'x' * 100),
            make_citation('rec_1', 'x' * 100, kind=ProvisionKind.RECITAL),
            make_citation('art_3', 'x' * 100),
        )

        kept, _ = pipeline._within_budget(citations)

        assert [item.provision_id for item in kept] == ['art_5', 'art_3', 'rec_1']


class TestTheTrace:
    def test_the_trace_records_what_search_returned(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert 'art_50.1' in answer.retrieval.searched_ids

    def test_searched_ids_names_each_provision_once(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """`art_3` splits into three chunks, so two of them can both rank.

        The trace is what the evaluation scores precision from, and a provision
        written twice inflates the denominator against a retrieval that found
        one thing.
        """
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        searched = pipeline.ask(CHATBOT).retrieval.searched_ids

        assert len(searched) == len(set(searched))

    def test_the_two_halves_of_the_trace_do_not_overlap(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        trace = pipeline.ask(CHATBOT).retrieval

        assert not set(trace.searched_ids) & set(trace.traversed_ids)

    def test_traversal_lifts_a_retrieved_paragraph_to_its_article(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert 'art_50' in answer.retrieval.traversed_ids

    def test_the_trace_records_what_traversal_added(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert answer.retrieval.traversal_enabled
        assert answer.retrieval.traversed_ids

    def test_traversal_off_adds_nothing_and_says_so(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT, traversal=False)

        assert not answer.retrieval.traversal_enabled
        assert answer.retrieval.traversed_ids == ()

    def test_the_trace_sums_the_tokens_of_both_model_calls(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert answer.retrieval.prompt_tokens == 200
        assert answer.retrieval.completion_tokens == 40

    def test_the_trace_names_the_model_that_answered(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert answer.retrieval.model == 'scripted'

    def test_a_run_that_dropped_nothing_says_so(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert answer.retrieval.dropped_ids == ()

    def test_the_trace_names_what_the_prompt_budget_cut(
        self, build_pipeline: BuildPipeline
    ) -> None:
        """Scoring traversal against a provision the model never saw is a lie.

        `traversed_ids` names what traversal reached, and the budget can cut
        some of it before synthesis, so the two fields together are what a
        scorer needs to credit traversal for what it actually contributed.
        """
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])
        pipeline.settings = pipeline.settings.model_copy(
            update={'generation_context': 1024}
        )

        answer = pipeline.ask(CHATBOT)

        assert answer.retrieval.dropped_ids
        assert set(answer.retrieval.dropped_ids) <= set(
            answer.retrieval.searched_ids + answer.retrieval.traversed_ids
        )

    def test_an_uncut_generation_is_not_reported_as_truncated(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert not answer.retrieval.truncated

    def test_a_cut_generation_reaches_the_answer(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, client = build_pipeline(['transparency obligations', GROUNDED])
        client.finish_reason = 'length'

        answer = pipeline.ask(CHATBOT)

        assert answer.retrieval.truncated


class TestParseDraft:
    def test_a_repeated_marker_merges_to_one_citation(self) -> None:
        citations = (make_citation('art_5', 'x' * 100),)

        claims, refusal = parse_draft('Providers must comply [1] [1]', citations)

        assert refusal is None
        assert len(claims) == 1
        assert claims[0].citations == citations
