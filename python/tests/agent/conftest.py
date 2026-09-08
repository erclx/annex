"""A pipeline over a fixture index and a scripted model, reaching no network.

The corpus is real, because traversal walks real citation edges and a stubbed
graph would test the stub. The index and the model are not: the index is three
hand-written vectors and the model returns whatever the test scripted.
"""

from collections.abc import Callable
from pathlib import Path

import pytest

from annex.agent.pipeline import Pipeline
from annex.corpus import CorpusVersion, load
from annex.corpus.models import Corpus
from annex.llm import Completion, ModelContextError, OllamaClient
from annex.retrieval import INDEX_PATH
from annex.retrieval.chunks import chunk
from annex.retrieval.store import DIMENSIONS, write
from annex.settings import Settings

SEEDED_PROVISIONS = ('art_50.1', 'art_6.1', 'art_3')
"""What the fixture index holds.

Two paragraphs and one article, because that is the shape search returns: a
paragraph is a chunk, and only an article no paragraph parses out of is
indexed at article level. Seeding articles that do carry paragraphs would put
provisions in the index that `annex embed` never writes.
"""


class ScriptedClient:
    """Returns the scripted completions in order, and fixed embeddings."""

    def __init__(self, replies: list[str]) -> None:
        self.replies = list(replies)
        self.prompts: list[str] = []
        self.settings = Settings()
        self.finish_reason = 'stop'
        self.prompt_tokens = 100

    def complete(
        self, prompt: str, *, system: str | None = None, max_tokens: int | None = None
    ) -> Completion:
        self.prompts.append(prompt)
        text = self.replies.pop(0) if self.replies else ''
        return Completion(
            text=text,
            thinking='',
            prompt_tokens=self.prompt_tokens,
            completion_tokens=20,
            model='scripted',
            finish_reason=self.finish_reason,
        )

    def embed(
        self, texts: list[str], *, purpose: str = 'document'
    ) -> list[list[float]]:
        return [_unit(0) for _ in texts]


def _unit(position: int) -> list[float]:
    vector = [0.0] * DIMENSIONS
    vector[position] = 1.0
    return vector


@pytest.fixture(scope='session')
def consolidated() -> Corpus:
    return load(CorpusVersion.CONSOLIDATED)


@pytest.fixture(scope='session')
def original() -> Corpus:
    return load(CorpusVersion.ORIGINAL)


@pytest.fixture(scope='session')
def fixture_index(
    tmp_path_factory: pytest.TempPathFactory, consolidated: Corpus
) -> Path:
    """An index holding the real text of a few provisions, at known vectors.

    Every vector is the same, so search ranks by nothing and returns the
    seeded set. What is under test downstream is traversal and synthesis, and
    those care which provisions arrived rather than in what order.
    """
    path = tmp_path_factory.mktemp('index') / 'annex.db'
    by_provision = {item.provision_id: item for item in chunk(consolidated)}
    missing = [name for name in SEEDED_PROVISIONS if name not in by_provision]
    if missing:
        pytest.fail(f'the chunk rule does not cover {missing}, so the fixture is stale')
    write(
        CorpusVersion.CONSOLIDATED,
        [(by_provision[name], _unit(0)) for name in SEEDED_PROVISIONS],
        path=path,
    )
    return path


@pytest.fixture(scope='session')
def live_pipeline() -> Pipeline:
    """The real index and the real model, for the `live` acceptance tests.

    Skips rather than fails where either is absent, since CI has neither, and
    session-scoped because building it parses both documents and loading the
    27B into the GPU is the expensive part of every pass.
    """
    settings = Settings()
    if not INDEX_PATH.exists():
        pytest.skip(f'no index at {INDEX_PATH}. Run: uv run python -m annex embed')
    try:
        OllamaClient(settings).verify_context()
    except (ModelContextError, OSError) as error:
        pytest.skip(f'the generation model is not ready: {error}')
    return Pipeline(settings=settings)


BuildPipeline = Callable[[list[str]], tuple[Pipeline, ScriptedClient]]


@pytest.fixture
def build_pipeline(
    fixture_index: Path, consolidated: Corpus, original: Corpus
) -> BuildPipeline:
    def build(replies: list[str]) -> tuple[Pipeline, ScriptedClient]:
        client = ScriptedClient(replies)
        pipeline = Pipeline(
            settings=Settings(search_k=5, traversal_depth=1, traversal_cap=10),
            client=client,  # type: ignore[arg-type]
            corpora={
                CorpusVersion.CONSOLIDATED: consolidated,
                CorpusVersion.ORIGINAL: original,
            },
            index_path=fixture_index,
        )
        return pipeline, client

    return build
