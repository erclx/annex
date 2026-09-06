"""The chunk budget, checked against the embedder rather than against a ratio.

This is the test the plan's risk asks for: Ollama truncates an over-length
embedding input silently, so nothing but the embedder's own token count can say
whether a chunk survived. The document-wide 5.03 characters a token is an
average, and the real ratio measured across both versions runs 3.13 to 6.43, so
dividing characters by anything is what this test exists not to do.

It is 1300 embedding calls and takes minutes, so it carries the `live` marker
and `pytest.ini` deselects that by default. Run it with `pytest -m live` after
changing the chunk rule or the embedding model, which are the two changes that
can break it. Every other assertion about chunking is in `test_chunks.py` and
runs everywhere.
"""

import pytest

from annex.corpus.models import Corpus
from annex.llm import OllamaClient
from annex.retrieval.chunks import chunk
from annex.settings import Settings

pytestmark = pytest.mark.live


@pytest.fixture(scope='module')
def client() -> OllamaClient:
    settings = Settings()
    live = OllamaClient(settings)
    try:
        live.embed(['a probe of the embedder'])
    except OSError as error:
        pytest.skip(f'no embedder at {settings.ollama_base_url}: {error}')
    return live


class TestMeasuredTokens:
    def test_no_chunk_of_the_original_reaches_the_embedder_limit(
        self, client: OllamaClient, original: Corpus
    ) -> None:
        limit = client.settings.embedding_context

        widest = max(client.embedding_tokens(item.text) for item in chunk(original))

        assert widest < limit

    def test_no_chunk_of_the_consolidated_reaches_the_embedder_limit(
        self, client: OllamaClient, consolidated: Corpus
    ) -> None:
        limit = client.settings.embedding_context

        widest = max(client.embedding_tokens(item.text) for item in chunk(consolidated))

        assert widest < limit
