"""Embedding calls the configured model, batches, and refuses a truncated chunk.

Stubbed rather than live. The behavior under test is the client being asked
for the right thing and the caller refusing a chunk the embedder had to cut,
neither of which needs a model to run.
"""

import pytest

from annex.corpus import ProvisionKind
from annex.retrieval.chunks import Chunk
from annex.retrieval.embed import EmbeddingTruncatedError, embed
from annex.settings import Settings


class StubClient:
    """Stands in for `OllamaClient` and records what it was asked for."""

    def __init__(self, tokens: int = 100) -> None:
        self.batches: list[list[str]] = []
        self.purposes: list[str] = []
        self.single_counts: list[str] = []
        self.tokens = tokens

    def embed(
        self, texts: list[str], *, purpose: str = 'document'
    ) -> list[list[float]]:
        self.batches.append(texts)
        self.purposes.append(purpose)
        return [[0.0, 1.0] for _ in texts]

    def embedding_tokens(self, text: str, *, purpose: str = 'document') -> int:
        self.single_counts.append(text)
        return self.tokens


def make_chunk(chunk_id: str, text: str) -> Chunk:
    return Chunk(
        chunk_id=chunk_id,
        provision_id=chunk_id,
        citation=chunk_id,
        kind=ProvisionKind.ARTICLE,
        text=text,
    )


def make_chunks(count: int, length: int = 100) -> tuple[Chunk, ...]:
    return tuple(make_chunk(f'art_{n}', 'x' * length) for n in range(count))


class TestBatching:
    def test_every_chunk_comes_back_paired_with_a_vector(self) -> None:
        client = StubClient()

        embedded = embed(make_chunks(5), client=client, settings=Settings())  # type: ignore[arg-type]

        assert len(embedded) == 5
        assert embedded[0][0].chunk_id == 'art_0'

    def test_the_batch_size_from_settings_is_what_is_sent(self) -> None:
        client = StubClient()
        settings = Settings(embedding_batch_size=2)

        embed(make_chunks(5), client=client, settings=settings)  # type: ignore[arg-type]

        assert [len(batch) for batch in client.batches] == [2, 2, 1]

    def test_order_is_preserved_across_batches(self) -> None:
        client = StubClient()
        settings = Settings(embedding_batch_size=2)

        embedded = embed(make_chunks(5), client=client, settings=settings)  # type: ignore[arg-type]

        assert [item.chunk_id for item, _ in embedded] == [f'art_{n}' for n in range(5)]

    def test_a_chunk_is_embedded_as_a_document_rather_than_a_question(self) -> None:
        client = StubClient()

        embed(make_chunks(2), client=client, settings=Settings())  # type: ignore[arg-type]

        assert client.purposes == ['document']

    def test_no_chunks_makes_no_call(self) -> None:
        client = StubClient()

        embedded = embed((), client=client, settings=Settings())  # type: ignore[arg-type]

        assert embedded == []
        assert client.batches == []


class TestTruncation:
    def test_a_short_chunk_is_never_re_measured(self) -> None:
        client = StubClient()

        embed(make_chunks(3, length=100), client=client, settings=Settings())  # type: ignore[arg-type]

        assert client.single_counts == []

    def test_a_long_chunk_is_re_measured(self) -> None:
        settings = Settings(embedding_context=100)
        client = StubClient(tokens=50)

        embed(make_chunks(1, length=400), client=client, settings=settings)  # type: ignore[arg-type]

        assert len(client.single_counts) == 1

    def test_a_chunk_at_the_ceiling_is_refused_by_name(self) -> None:
        settings = Settings(embedding_context=100)
        client = StubClient(tokens=100)

        with pytest.raises(EmbeddingTruncatedError, match='art_0 is 100 tokens'):
            embed(make_chunks(1, length=400), client=client, settings=settings)  # type: ignore[arg-type]
