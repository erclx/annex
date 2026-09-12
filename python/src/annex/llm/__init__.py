"""The shared model client. One writer, three consumers, one `num_ctx`."""

from annex.llm.client import (
    EMBEDDING_PREFIXES,
    MINIMUM_GENERATION_BUDGET,
    NO_PREFIXES,
    WINDOW_MARGIN,
    Completion,
    EmbeddingPurpose,
    ModelContextError,
    OllamaClient,
    embedding_prefixes,
    hit_the_window,
    split_thinking,
)

__all__ = [
    'EMBEDDING_PREFIXES',
    'MINIMUM_GENERATION_BUDGET',
    'NO_PREFIXES',
    'WINDOW_MARGIN',
    'Completion',
    'EmbeddingPurpose',
    'ModelContextError',
    'OllamaClient',
    'embedding_prefixes',
    'hit_the_window',
    'split_thinking',
]
