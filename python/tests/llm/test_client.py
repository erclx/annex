"""The client's job is the two things a model call gets silently wrong.

A reasoning block returned as the answer, and a generation budget the model
spends entirely on reasoning it never closes. Both come back looking like
successful calls, so both are asserted here rather than left to a caller.

Nothing in this file reaches the network. `num_ctx` is carried by the model
rather than by the request, measured and recorded in `annex.llm.client`, so the
assertion this file can make about it is that the client refuses a model built
without it.
"""

import logging
from collections.abc import Callable
from typing import Any

import pytest

from annex.llm import (
    MINIMUM_GENERATION_BUDGET,
    NO_PREFIXES,
    Completion,
    OllamaClient,
    embedding_prefixes,
    split_thinking,
)
from annex.llm.client import ModelContextError, hit_the_window
from annex.settings import Settings


class StubMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class StubChoice:
    def __init__(self, content: str, finish_reason: str = 'stop') -> None:
        self.message = StubMessage(content)
        self.finish_reason = finish_reason


class StubUsage:
    def __init__(self, prompt: int, completion: int) -> None:
        self.prompt_tokens = prompt
        self.completion_tokens = completion


class StubResponse:
    def __init__(
        self,
        content: str,
        prompt: int = 100,
        completion: int = 20,
        finish_reason: str = 'stop',
    ) -> None:
        self.choices = [StubChoice(content, finish_reason)]
        self.usage = StubUsage(prompt, completion)


class StubCompletions:
    def __init__(
        self,
        content: str,
        prompt: int = 100,
        completion: int = 20,
        finish_reason: str = 'stop',
    ) -> None:
        self.content = content
        self.prompt = prompt
        self.completion = completion
        self.finish_reason = finish_reason
        self.calls: list[dict[str, Any]] = []

    def create(self, **kwargs: Any) -> StubResponse:
        self.calls.append(kwargs)
        return StubResponse(
            self.content, self.prompt, self.completion, self.finish_reason
        )


BuildClient = Callable[..., tuple[OllamaClient, StubCompletions]]


@pytest.fixture
def build_client(monkeypatch: pytest.MonkeyPatch) -> BuildClient:
    """A client whose completions endpoint returns the content given."""

    def build(
        content: str,
        prompt: int = 100,
        completion: int = 20,
        finish_reason: str = 'stop',
    ) -> tuple[OllamaClient, StubCompletions]:
        client = OllamaClient(Settings())
        completions = StubCompletions(content, prompt, completion, finish_reason)
        monkeypatch.setattr(client._client.chat, 'completions', completions)
        return client, completions

    return build


class TestThinking:
    def test_a_closed_block_is_stripped_from_the_answer(self) -> None:
        answer, thinking = split_thinking(
            '<think>The question is about chatbots.</think>Article 50 applies.'
        )

        assert answer == 'Article 50 applies.'
        assert 'chatbots' in thinking

    def test_an_unclosed_block_leaves_no_answer(self) -> None:
        answer, thinking = split_thinking('<think>Let me consider Article 50 and')

        assert answer == ''
        assert 'Article 50' in thinking

    def test_text_without_a_block_is_the_answer(self) -> None:
        answer, thinking = split_thinking('Article 50 applies.')

        assert answer == 'Article 50 applies.'
        assert thinking == ''


class TestCompletion:
    def test_a_response_carrying_thinking_returns_the_answer_without_it(
        self, build_client: BuildClient
    ) -> None:
        client, _ = build_client('<think>weighing it</think>Article 50(1) applies.')

        completion = client.complete('Does Article 50 apply?')

        assert completion.text == 'Article 50(1) applies.'
        assert completion.thinking == '<think>weighing it</think>'
        assert not completion.is_empty

    def test_a_response_that_is_thinking_alone_is_reported_as_empty(
        self, build_client: BuildClient
    ) -> None:
        client, _ = build_client('<think>Article 50 concerns transparency and')

        completion = client.complete('Does Article 50 apply?')

        assert completion.text == ''
        assert completion.is_empty

    def test_the_usage_the_trace_needs_comes_back(
        self, build_client: BuildClient
    ) -> None:
        client, _ = build_client('Article 50(1) applies.')

        completion = client.complete('Does Article 50 apply?')

        assert completion.prompt_tokens == 100
        assert completion.completion_tokens == 20
        assert completion.model == Settings().generation_model

    def test_a_budget_below_the_floor_is_raised_to_it(
        self, build_client: BuildClient
    ) -> None:
        client, completions = build_client('Article 50(1) applies.')

        client.complete('Does Article 50 apply?', max_tokens=32)

        assert completions.calls[0]['max_tokens'] == MINIMUM_GENERATION_BUDGET

    def test_a_budget_above_the_floor_is_kept(self, build_client: BuildClient) -> None:
        client, completions = build_client('Article 50(1) applies.')

        client.complete('Does Article 50 apply?', max_tokens=4096)

        assert completions.calls[0]['max_tokens'] == 4096

    def test_the_configured_model_is_the_one_called(
        self, build_client: BuildClient
    ) -> None:
        client, completions = build_client('Article 50(1) applies.')

        client.complete('Does Article 50 apply?')

        assert completions.calls[0]['model'] == Settings().generation_model


class TestACutGeneration:
    """A cut draft reads as a finished one, so the client has to say it was cut."""

    def test_a_completed_generation_is_not_truncated(
        self, build_client: BuildClient
    ) -> None:
        client, _ = build_client('Article 50(1) applies.')

        assert not client.complete('does it apply?').is_truncated

    def test_a_generation_stopped_for_room_is_truncated(
        self, build_client: BuildClient
    ) -> None:
        client, _ = build_client('Article 50(1) app', finish_reason='length')

        assert client.complete('does it apply?').is_truncated

    def test_the_window_binding_rather_than_the_budget_is_an_error(
        self, build_client: BuildClient, caplog: pytest.LogCaptureFixture
    ) -> None:
        client, _ = build_client(
            'Article 50(1) app',
            prompt=29170,
            completion=3597,
            finish_reason='length',
        )

        with caplog.at_level(logging.ERROR, logger='annex.llm'):
            client.complete('does it apply?', max_tokens=4096)

        assert 'left no room to answer in' in caplog.text

    def test_the_budget_binding_is_reported_below_error(
        self, build_client: BuildClient, caplog: pytest.LogCaptureFixture
    ) -> None:
        client, _ = build_client(
            'Article 50(1) app',
            prompt=1000,
            completion=4096,
            finish_reason='length',
        )

        with caplog.at_level(logging.WARNING, logger='annex.llm'):
            client.complete('does it apply?', max_tokens=4096)

        assert 'stopped at the 4096-token budget' in caplog.text
        assert 'left no room to answer in' not in caplog.text

    def test_a_window_cut_and_a_budget_cut_report_differently(self) -> None:
        """A caller deciding whether to retry a cut needs this without re-deriving it."""
        window_cut = Completion(
            text='Article 50(1) app',
            thinking='',
            prompt_tokens=29170,
            completion_tokens=3597,
            model='annex-qwen3-27b',
            finish_reason='length',
        )
        budget_cut = Completion(
            text='Article 50(1) app',
            thinking='',
            prompt_tokens=1000,
            completion_tokens=4096,
            model='annex-qwen3-27b',
            finish_reason='length',
        )

        assert hit_the_window(window_cut, generation_context=32768)
        assert not hit_the_window(budget_cut, generation_context=32768)


class StubEmbeddingData:
    def __init__(self, index: int) -> None:
        self.index = index
        self.embedding = [float(index)]


class StubEmbeddingResponse:
    def __init__(self, count: int) -> None:
        self.data = [StubEmbeddingData(index) for index in reversed(range(count))]
        self.usage = StubUsage(7, 0)


class StubEmbeddings:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def create(self, **kwargs: Any) -> StubEmbeddingResponse:
        self.calls.append(kwargs)
        return StubEmbeddingResponse(len(kwargs['input']))


class TestThePrefixFollowsTheModel:
    """A prefix pair belongs to a model's training, not to embedding."""

    def test_the_configured_model_gets_its_own_pair(self) -> None:
        assert embedding_prefixes('nomic-embed-text') == {
            'document': 'search_document: ',
            'query': 'search_query: ',
        }

    def test_a_tagged_name_resolves_to_the_same_pair_as_the_untagged_one(
        self,
    ) -> None:
        """`ollama list` names a model with a tag and `Settings` does not."""
        assert embedding_prefixes('snowflake-arctic-embed2:latest') == (
            embedding_prefixes('snowflake-arctic-embed2')
        )

    def test_an_unlisted_model_embeds_unprefixed(self) -> None:
        assert embedding_prefixes('all-minilm') == NO_PREFIXES

    def test_an_unlisted_model_is_warned_about_by_name(
        self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
    ) -> None:
        """The one report a silently empty pair would otherwise never make."""
        client = OllamaClient(Settings(embedding_model='all-minilm'))
        monkeypatch.setattr(client, 'embedding_tokens', lambda *_, **__: 2048)

        with caplog.at_level(logging.WARNING, logger='annex.llm'):
            client.verify_embedding_context()

        assert 'all-minilm' in caplog.text
        assert 'no task prefixes recorded' in caplog.text

    def test_a_listed_model_is_not_warned_about(
        self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
    ) -> None:
        client = OllamaClient(Settings(embedding_model='snowflake-arctic-embed2'))
        monkeypatch.setattr(client, 'embedding_tokens', lambda *_, **__: 2048)

        with caplog.at_level(logging.WARNING, logger='annex.llm'):
            client.verify_embedding_context()

        assert 'no task prefixes recorded' not in caplog.text


class TestEmbedding:
    def test_a_document_carries_the_configured_model_document_prefix(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The shipped model marks the query side alone, so a passage is bare."""
        client = OllamaClient(Settings(embedding_model='snowflake-arctic-embed2'))
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        client.embed(['Article 50 text'])

        assert embeddings.calls[0]['input'] == ['Article 50 text']

    def test_a_question_carries_the_configured_model_query_prefix(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings(embedding_model='snowflake-arctic-embed2'))
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        client.embed(['does this apply'], purpose='query')

        assert embeddings.calls[0]['input'] == ['query: does this apply']

    def test_a_document_and_a_question_reach_the_model_differently(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The two sides landing identically is the silent half of a bad swap."""
        client = OllamaClient(Settings(embedding_model='snowflake-arctic-embed2'))
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        client.embed(['high-risk classification'])
        client.embed(['high-risk classification'], purpose='query')

        assert embeddings.calls[0]['input'] != embeddings.calls[1]['input']

    def test_another_model_gets_its_own_pair_rather_than_the_shipped_one(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings(embedding_model='nomic-embed-text'))
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        client.embed(['Article 50 text'])

        assert embeddings.calls[0]['input'] == ['search_document: Article 50 text']

    def test_a_token_count_is_measured_with_the_prefix_that_will_be_sent(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings(embedding_model='nomic-embed-text'))
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        client.embedding_tokens('does this apply', purpose='query')

        assert embeddings.calls[0]['input'] == ['search_query: does this apply']

    def test_vectors_come_back_in_the_order_they_were_asked_for(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings())
        monkeypatch.setattr(client._client, 'embeddings', StubEmbeddings())

        vectors = client.embed(['first', 'second', 'third'])

        assert vectors == [[0.0], [1.0], [2.0]]

    def test_an_empty_batch_makes_no_call(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings())
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        assert client.embed([]) == []
        assert embeddings.calls == []


class TestContext:
    def test_a_model_built_without_the_context_is_refused(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings(generation_context=32768))
        monkeypatch.setattr('annex.llm.client._model_context', lambda *_: 4096)

        with pytest.raises(ModelContextError, match='ollama-build'):
            client.verify_context()

    def test_a_model_built_with_the_context_is_accepted(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings(generation_context=32768))
        monkeypatch.setattr('annex.llm.client._model_context', lambda *_: 32768)

        assert client.verify_context() == 32768
