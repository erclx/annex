"""The shared model client. One writer, three consumers, one `num_ctx`."""

from annex.llm.client import (
    EMBEDDING_PREFIXES,
    MINIMUM_GENERATION_BUDGET,
    Completion,
    EmbeddingPurpose,
    ModelContextError,
    OllamaClient,
    split_thinking,
)

__all__ = [
    'EMBEDDING_PREFIXES',
    'MINIMUM_GENERATION_BUDGET',
    'Completion',
    'EmbeddingPurpose',
    'ModelContextError',
    'OllamaClient',
    'split_thinking',
]
