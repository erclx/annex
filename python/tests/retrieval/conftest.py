"""Both documents are parsed once for the whole session, as the corpus tests do.

Chunking runs over the parsed corpus rather than over the markup, so the cost
of a fixture per test is the parse, not the chunk.
"""

import pytest

from annex.corpus import CorpusVersion, load
from annex.corpus.models import Corpus


@pytest.fixture(scope='session')
def original() -> Corpus:
    return load(CorpusVersion.ORIGINAL)


@pytest.fixture(scope='session')
def consolidated() -> Corpus:
    return load(CorpusVersion.CONSOLIDATED)
