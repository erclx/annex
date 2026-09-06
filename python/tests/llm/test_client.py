"""The client's job is the two things a model call gets silently wrong.

A reasoning block returned as the answer, and a generation budget the model
spends entirely on reasoning it never closes. Both come back looking like
successful calls, so both are asserted here rather than left to a caller.

Nothing in this file reaches the network. `num_ctx` is carried by the model
rather than by the request, measured and recorded in `annex.llm.client`, so the
assertion this file can make about it is that the client refuses a model built
without it.
"""

from collections.abc import Callable
from typing import Any

import pytest

from annex.llm import MINIMUM_GENERATION_BUDGET, OllamaClient, split_thinking
from annex.llm.client import ModelContextError
from annex.settings import Settings


class StubMessage:
    def __init__(self, content: str) -> None:
        self.content = content


class StubChoice:
    def __init__(self, content: str) -> None:
        self.message = StubMessage(content)


class StubUsage:
    def __init__(self, prompt: int, completion: int) -> None:
        self.prompt_tokens = prompt
        self.completion_tokens = completion


class StubResponse:
    def __init__(self, content: str, prompt: int = 100, completion: int = 20) -> None:
        self.choices = [StubChoice(content)]
        self.usage = StubUsage(prompt, completion)


class StubCompletions:
    def __init__(self, content: str) -> None:
        self.content = content
        self.calls: list[dict[str, Any]] = []

    def create(self, **kwargs: Any) -> StubResponse:
        self.calls.append(kwargs)
        return StubResponse(self.content)


BuildClient = Callable[[str], tuple[OllamaClient, StubCompletions]]


@pytest.fixture
def build_client(monkeypatch: pytest.MonkeyPatch) -> BuildClient:
    """A client whose completions endpoint returns the content given."""

    def build(content: str) -> tuple[OllamaClient, StubCompletions]:
        client = OllamaClient(Settings())
        completions = StubCompletions(content)
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


class TestEmbedding:
    def test_a_document_carries_the_document_prefix(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings())
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        client.embed(['Article 50 text'])

        assert embeddings.calls[0]['input'] == ['search_document: Article 50 text']

    def test_a_question_carries_the_query_prefix(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        client = OllamaClient(Settings())
        embeddings = StubEmbeddings()
        monkeypatch.setattr(client._client, 'embeddings', embeddings)

        client.embed(['does this apply'], purpose='query')

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
