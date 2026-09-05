"""The two documents this project reads, and what each one must contain.

Expected counts are per version rather than shared. The amendment inserted six
articles and an annex, and it dropped the recitals the consolidation does not
carry, so a single set of numbers cannot describe both documents.
"""

from dataclasses import dataclass
from enum import StrEnum


class CorpusVersion(StrEnum):
    """Which of the two texts a provision was read from."""

    ORIGINAL = 'original'
    CONSOLIDATED = 'consolidated'


@dataclass(frozen=True)
class Source:
    """One fetchable document and the structure a correct parse of it yields."""

    version: CorpusVersion
    url: str
    cache_name: str
    articles: int
    annexes: int
    recitals: int
    paragraphs: int


ORIGINAL = Source(
    version=CorpusVersion.ORIGINAL,
    url='https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689',
    cache_name='original-oj.html',
    articles=113,
    annexes=13,
    recitals=180,
    paragraphs=500,
)

CONSOLIDATED = Source(
    version=CorpusVersion.CONSOLIDATED,
    url='https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02024R1689-20260727',
    cache_name='consolidated-2026-07-27.html',
    articles=119,
    annexes=14,
    recitals=0,
    paragraphs=552,
)

SOURCES: dict[CorpusVersion, Source] = {
    ORIGINAL.version: ORIGINAL,
    CONSOLIDATED.version: CONSOLIDATED,
}
