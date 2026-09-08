"""Both documents are parsed once for the whole session.

Each parse walks roughly a megabyte of HTML, so a fixture per test would cost
more than the assertions do.
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
