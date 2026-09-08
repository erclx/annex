"""A third corpus fixture, and the pipeline the two retrieval arms share.

Both documents are parsed once for this session, as `tests/corpus/` and
`tests/retrieval/` each do. That is three parses of roughly a second apiece
across the suite, and it is deliberate: the v0.5 review argued the merge and
declined it, because hoisting corpus fixtures above these packages would put
them over two suites that use them differently.

The scripted client is imported from `tests/agent/conftest.py` rather than
rewritten, since an arm scored against a second stub would be scored against
the stub.
"""

from collections.abc import Callable
from pathlib import Path

import pytest

from annex.agent.pipeline import Pipeline
from annex.corpus import CorpusVersion, load
from annex.corpus.models import Corpus
from annex.retrieval.chunks import chunk
from annex.retrieval.store import DIMENSIONS, write
from annex.settings import Settings
from tests.agent.conftest import SEEDED_PROVISIONS, ScriptedClient

GROUNDED = (
    'Providers ensure natural persons are informed that they are interacting '
    'with an AI system [1]'
)
"""A draft that survives grounding, so a test reaches the answer path."""


def unit(position: int) -> list[float]:
    vector = [0.0] * DIMENSIONS
    vector[position] = 1.0
    return vector


@pytest.fixture(scope='session')
def original() -> Corpus:
    return load(CorpusVersion.ORIGINAL)


@pytest.fixture(scope='session')
def consolidated() -> Corpus:
    return load(CorpusVersion.CONSOLIDATED)


@pytest.fixture(scope='session')
def corpora(original: Corpus, consolidated: Corpus) -> dict[CorpusVersion, Corpus]:
    return {
        CorpusVersion.ORIGINAL: original,
        CorpusVersion.CONSOLIDATED: consolidated,
    }


@pytest.fixture(scope='session')
def fixture_index(
    tmp_path_factory: pytest.TempPathFactory, consolidated: Corpus
) -> Path:
    """The real text of three provisions at identical vectors.

    Every vector is the same, so search ranks by nothing and returns the seeded
    set. What is under test is which provisions each arm ends up handing the
    model, not the order they arrived in.
    """
    path = tmp_path_factory.mktemp('index') / 'annex.db'
    by_provision = {item.provision_id: item for item in chunk(consolidated)}
    missing = [name for name in SEEDED_PROVISIONS if name not in by_provision]
    if missing:
        pytest.fail(f'the chunk rule does not cover {missing}, so the fixture is stale')
    write(
        CorpusVersion.CONSOLIDATED,
        [(by_provision[name], unit(0)) for name in SEEDED_PROVISIONS],
        path=path,
    )
    return path


BuildPipeline = Callable[[list[str]], tuple[Pipeline, ScriptedClient]]


@pytest.fixture
def build_pipeline(
    fixture_index: Path, corpora: dict[CorpusVersion, Corpus]
) -> BuildPipeline:
    """A pipeline at the shipped traversal depth, over the fixture index.

    Depth 2 rather than the depth 1 the agent's own fixtures use, because depth
    is what the two retrieval arms differ by and depth 1 reaches one of the ten
    must-read provisions rather than all ten.
    """

    def build(replies: list[str]) -> tuple[Pipeline, ScriptedClient]:
        client = ScriptedClient(replies)
        pipeline = Pipeline(
            settings=Settings(search_k=5, traversal_depth=2, traversal_cap=40),
            client=client,  # type: ignore[arg-type]
            corpora=corpora,
            index_path=fixture_index,
        )
        return pipeline, client

    return build
