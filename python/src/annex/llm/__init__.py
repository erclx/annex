"""The shared model client. One writer, three consumers, one `num_ctx`."""

from annex.llm.client import (
    EMBEDDING_PREFIXES,
    MINIMUM_GENERATION_BUDGET,
    NO_PREFIXES,
    Completion,
    EmbeddingPurpose,
    ModelContextError,
    OllamaClient,
    embedding_prefixes,
    split_thinking,
)

__all__ = [
    'EMBEDDING_PREFIXES',
    'MINIMUM_GENERATION_BUDGET',
    'NO_PREFIXES',
    'Completion',
    'EmbeddingPurpose',
    'ModelContextError',
    'OllamaClient',
    'embedding_prefixes',
    'split_thinking',
]
