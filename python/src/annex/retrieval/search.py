"""Semantic search over one version of the Act.

Thin on purpose. Search finds where to start and traversal finds what that
start point depends on, so everything about the second belongs in
`annex.retrieval.traverse` rather than here.
"""

from pathlib import Path

from annex.corpus import CorpusVersion
from annex.llm import OllamaClient
from annex.retrieval.store import INDEX_PATH, Hit, nearest
from annex.settings import Settings


def search(
    question: str,
    version: CorpusVersion,
    k: int | None = None,
    *,
    client: OllamaClient | None = None,
    settings: Settings | None = None,
    path: Path = INDEX_PATH,
) -> tuple[Hit, ...]:
    """The chunks closest to a question, nearest first."""
    settings = settings or Settings()
    client = client or OllamaClient(settings)
    vector = client.embed([question], purpose='query')[0]
    return nearest(version, vector, k or settings.search_k, path=path)
