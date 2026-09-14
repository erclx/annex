"""Assert that a parse produced the structure its source is known to hold.

The counts live in `sources.py` per version, paragraphs included. They are not
shared, and the consolidated set is what catches an anchor-driven parse:
`id="art_N"` reaches 113 articles in a document that renders 119, so a check
written against the original's numbers would pass on a corpus missing six
articles. Paragraphs are asserted for the same reason `Article 6(2)` resolves
to one: leaving that kind out would let a regression drop every paragraph while
the run still reported a clean parse.

Three further properties are checked independently of any count: no
provision's text or title carries a consolidation marker, no article carries
the signature block the Official Journal document appends after the last one,
and no provision's text carries a chapter or section heading. All three are
ingest defects a count cannot see, since the offending text lands inside a
provision the count already expects to exist.
"""

import re

from annex.corpus.models import Corpus, ProvisionKind
from annex.corpus.sources import SOURCES

SIGNATURE_BLOCK = 'Done at Brussels'
_DIVISION_HEADING = re.compile(r'\b(CHAPTER\s+[IVXLC]+|SECTION\s+\d+)\b')


class CorpusCheckError(RuntimeError):
    """A parse disagreed with the structure its source is known to hold."""


def _structure_disagreements(corpus: Corpus) -> list[str]:
    source = SOURCES[corpus.version]
    expected = (
        (ProvisionKind.ARTICLE, 'articles', source.articles),
        (ProvisionKind.ANNEX, 'annexes', source.annexes),
        (ProvisionKind.RECITAL, 'recitals', source.recitals),
        (ProvisionKind.PARAGRAPH, 'paragraphs', source.paragraphs),
    )
    return [
        f'{corpus.version}: expected {count} {label}, parsed {len(corpus.of_kind(kind))}'
        for kind, label, count in expected
        if len(corpus.of_kind(kind)) != count
    ]


def _marker_disagreements(corpus: Corpus) -> list[str]:
    return [
        f'{corpus.version}: {provision.id} carries a consolidation marker'
        for provision in corpus.provisions
        if '▼' in provision.text or '▼' in provision.title
    ]


def _signature_disagreements(corpus: Corpus) -> list[str]:
    return [
        f'{corpus.version}: {article.id} carries the signature block'
        for article in corpus.of_kind(ProvisionKind.ARTICLE)
        if SIGNATURE_BLOCK in article.text
    ]


def _heading_disagreements(corpus: Corpus) -> list[str]:
    return [
        f'{corpus.version}: {provision.id} carries a division heading'
        for provision in corpus.provisions
        if _DIVISION_HEADING.search(provision.text)
    ]


def disagreements(corpus: Corpus) -> list[str]:
    """Return one line per property that does not hold, empty where all do."""
    return [
        *_structure_disagreements(corpus),
        *_marker_disagreements(corpus),
        *_signature_disagreements(corpus),
        *_heading_disagreements(corpus),
    ]


def verify(corpus: Corpus) -> None:
    """Raise where the parse disagrees with the expected structure."""
    found = disagreements(corpus)
    if found:
        raise CorpusCheckError('; '.join(found))
