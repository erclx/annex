"""The demo question, end to end against the real index and the real model.

This is the acceptance test for the feature rather than a unit test of it.
Nothing is stubbed: the index is the one `annex embed` built, the model is the
one `scripts/ollama-build.sh` built, and what is asserted is that a system
described the way a person would describe it comes back citing the article
that governs it.

It carries the `live` marker and `pytest.ini` deselects that by default, for
two reasons that are both true. One pass is roughly half a minute of a 27B
model and holds most of the GPU, and CI has neither Ollama nor the models, so
a test that ran by default would fail there for the wrong reason. Run it with
`pytest -m live` after changing chunking, routing, traversal or the prompts.
"""

import pytest

from annex.agent import Pipeline
from annex.corpus import CorpusVersion
from annex.settings import Settings

pytestmark = pytest.mark.live

CHATBOT = 'a chatbot on our website that answers customer questions'
GENERATOR = 'a tool that writes marketing copy and article drafts for our blog'


def cited_provisions(answer: object) -> set[str]:
    return {
        citation.provision_id
        for claim in answer.claims  # type: ignore[attr-defined]
        for citation in claim.citations
    }


class TestTheChatbot:
    def test_a_described_chatbot_is_answered_rather_than_refused(
        self, live_pipeline: Pipeline
    ) -> None:
        answer = live_pipeline.ask(CHATBOT)

        assert not answer.is_refusal

    def test_a_described_chatbot_cites_the_transparency_duty(
        self, live_pipeline: Pipeline
    ) -> None:
        answer = live_pipeline.ask(CHATBOT)

        assert any(
            provision_id.startswith('art_50')
            for provision_id in cited_provisions(answer)
        )

    def test_every_claim_quotes_the_text_it_rests_on(
        self, live_pipeline: Pipeline
    ) -> None:
        answer = live_pipeline.ask(CHATBOT)

        assert all(
            citation.text.strip()
            for claim in answer.claims
            for citation in claim.citations
        )

    def test_the_answer_reports_what_it_cost(self, live_pipeline: Pipeline) -> None:
        answer = live_pipeline.ask(CHATBOT)

        assert answer.retrieval.prompt_tokens > 0
        assert answer.retrieval.model == Settings().generation_model


class TestTheContentGenerator:
    def test_a_described_generator_cites_the_marking_duty(
        self, live_pipeline: Pipeline
    ) -> None:
        answer = live_pipeline.ask(GENERATOR)

        assert 'art_50.2' in cited_provisions(answer)


class TestBothVersions:
    def test_the_original_text_answers_the_same_question(
        self, live_pipeline: Pipeline
    ) -> None:
        answer = live_pipeline.ask(CHATBOT, version=CorpusVersion.ORIGINAL)

        assert answer.version is CorpusVersion.ORIGINAL
        assert not answer.is_refusal
