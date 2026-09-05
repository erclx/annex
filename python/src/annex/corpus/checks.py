"""Assert that a parse produced the structure its source is known to hold.

The counts live in `sources.py` per version, paragraphs included. `Article 6(2)`
is a paragraph lookup, so leaving that kind unasserted would let a regression
drop every paragraph while the run still reported a clean parse.

The counts live in `sources.py` per version. They are not shared, and the
consolidated set is what catches an anchor-driven parse: `id="art_N"` reaches
113 articles in a document that renders 119, so a check written against the
original's numbers would pass on a corpus missing six articles.
"""

from annex.corpus.models import Corpus, ProvisionKind
from annex.corpus.sources import SOURCES


class CorpusCheckError(RuntimeError):
    """A parse disagreed with the structure its source is known to hold."""


def disagreements(corpus: Corpus) -> list[str]:
    """Return one line per count that does not match, empty where all match."""
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


def verify(corpus: Corpus) -> None:
    """Raise where the parse disagrees with the expected structure."""
    found = disagreements(corpus)
    if found:
        raise CorpusCheckError('; '.join(found))
