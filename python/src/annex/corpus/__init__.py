"""The EU AI Act as provisions and the reference graph over them."""

from annex.corpus.checks import CorpusCheckError, disagreements, verify
from annex.corpus.citations import resolve, to_id
from annex.corpus.graph import build, neighbours
from annex.corpus.models import (
    Corpus,
    Provision,
    ProvisionKind,
    Reference,
    normalize,
)
from annex.corpus.references import PREDICATE, extract
from annex.corpus.sources import CONSOLIDATED, ORIGINAL, SOURCES, CorpusVersion

__all__ = [
    'CONSOLIDATED',
    'ORIGINAL',
    'SOURCES',
    'Corpus',
    'CorpusCheckError',
    'CorpusVersion',
    'PREDICATE',
    'Provision',
    'ProvisionKind',
    'Reference',
    'build',
    'disagreements',
    'extract',
    'load',
    'neighbours',
    'normalize',
    'resolve',
    'to_id',
    'verify',
]


def load(version: CorpusVersion, *, refresh: bool = False) -> Corpus:
    """Fetch or read one version of the Act and parse it into provisions."""
    from annex.corpus import parse_consolidated, parse_oj
    from annex.corpus.fetch import fetch

    source = SOURCES[version]
    document = fetch(source, refresh=refresh)
    if version is CorpusVersion.ORIGINAL:
        return parse_oj.parse(document)
    return parse_consolidated.parse(document)
