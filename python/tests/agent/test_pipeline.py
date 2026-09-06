"""The graph runs, the branch into refusal is reachable, and the trace fills.

Against a fixture index and a scripted model, so what is under test is the
pipeline's own wiring rather than the model's judgement.
"""

from annex.corpus import CorpusVersion
from tests.agent.conftest import BuildPipeline

CHATBOT = 'a chatbot that talks to customers on our website'

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


class TestTheTrace:
    def test_the_trace_records_what_search_returned(
        self, build_pipeline: BuildPipeline
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        answer = pipeline.ask(CHATBOT)

        assert 'art_50.1' in answer.retrieval.searched_ids

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
