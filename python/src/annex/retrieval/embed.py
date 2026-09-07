"""Chunks to vectors, in batches, with the silent truncation made loud.

The failure this module exists to catch does not raise. An embedding request
over the model's 2048 tokens comes back looking successful and describing the
first part of the text, so the index quietly holds a vector for half a
provision and retrieval degrades with nothing to point at.

Ollama reports `usage.prompt_tokens` on the OpenAI-compatible route, and a
truncated input reports exactly the context length. Measured on 2026-09-06: an
over-length input returned `Usage(prompt_tokens=2048)` and a vector of the
model's width, with no error, under `nomic-embed-text` at 768 and
`snowflake-arctic-embed2` at 1024 alike. That equality is the signal, and it
raises `EmbeddingTruncatedError`.
"""

import logging

from annex.llm import OllamaClient
from annex.retrieval.chunks import Chunk
from annex.settings import Settings

logger = logging.getLogger('annex.retrieval.embed')


class EmbeddingTruncatedError(RuntimeError):
    """A chunk reached the embedder longer than the embedder can read."""


def _batches(chunks: tuple[Chunk, ...], size: int) -> list[tuple[Chunk, ...]]:
    return [chunks[start : start + size] for start in range(0, len(chunks), size)]


def embed(
    chunks: tuple[Chunk, ...],
    *,
    client: OllamaClient | None = None,
    settings: Settings | None = None,
) -> list[tuple[Chunk, list[float]]]:
    """Embed every chunk, in the order given, refusing any that overflowed.

    Batched because a request per chunk over 1300 chunks is 1300 round trips
    for no gain. The truncation check runs per batch rather than per chunk,
    since the batch's reported token count is the sum and a batch at or above
    the ceiling has at least one member that was cut.
    """
    settings = settings or Settings()
    client = client or OllamaClient(settings)
    limit = settings.embedding_context

    embedded: list[tuple[Chunk, list[float]]] = []
    for batch in _batches(chunks, settings.embedding_batch_size):
        vectors = client.embed([item.text for item in batch])
        if len(vectors) != len(batch):
            raise EmbeddingTruncatedError(
                f'asked for {len(batch)} vectors and got {len(vectors)}'
            )
        _refuse_truncated(batch, client, limit)
        embedded.extend(zip(batch, vectors, strict=True))
    logger.info(
        'embedded %d chunks in batches of %d',
        len(embedded),
        settings.embedding_batch_size,
    )
    return embedded


def _refuse_truncated(
    batch: tuple[Chunk, ...], client: OllamaClient, limit: int
) -> None:
    """Re-measure the chunks that could plausibly have overflowed.

    A batch reports its token count as a sum, so it cannot say which member was
    cut. Measuring every chunk on its own would double the cost of the ingest,
    so a character screen picks the candidates first.

    The screen is sound rather than convenient. Nothing shorter than
    `3 * limit` characters can reach the limit as long as no chunk is denser
    than 3 characters a token, and the screen sits at exactly that.

    The floor it rests on is a property of a tokenizer rather than arithmetic,
    so it is re-measured whenever the embedding model changes. The densest
    chunk across both versions runs 3.20 characters a token under
    `snowflake-arctic-embed2` and ran 3.13 under `nomic-embed-text`, both above
    3. A model denser than that would need this constant lowered with it.
    """
    for item in batch:
        if len(item.text) <= limit * 3:
            continue
        tokens = client.embedding_tokens(item.text)
        if tokens >= limit:
            raise EmbeddingTruncatedError(
                f'{item.chunk_id} is {tokens} tokens against a {limit}-token '
                'embedder, so its vector describes only the first part of it. '
                'Lower CHARACTER_BUDGET in annex.retrieval.chunks.'
            )
