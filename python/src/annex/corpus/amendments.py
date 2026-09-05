"""Which spans of the consolidated text the amendment rewrote.

The consolidation marks amended text with `p.modref` elements carrying `M1`,
and returns to base text with one carrying `B`. They are range delimiters
rather than properties of whatever encloses them: a marker opens a span that
runs until the next marker, and an article can hold several of each. Article 57
carries eleven, and 35 of the 119 articles carry both kinds.

Reading a marker as a property of the article holding it puts one flag on every
paragraph in that article, which is wrong for 178 of the 561 paragraphs. The
project reports which citations changed between versions, so a paragraph the
document marks as base text must not come back as amended.
"""

import re
from bisect import bisect_right
from dataclasses import dataclass

from lxml.html import HtmlElement

from annex.corpus.html import TextIndex
from annex.corpus.models import normalize

MARKERS = '//p[@class="modref"]'

_AMENDING_ACT = re.compile(r'\bM\d+')


@dataclass(frozen=True)
class AmendmentSpans:
    """Where each amendment marker sits, so a span can be resolved by offset."""

    offsets: tuple[int, ...]
    amended: tuple[bool, ...]

    def at(self, offset: int) -> bool:
        """Whether the span covering this offset is amended text.

        Text before the first marker is base text. The consolidation opens with
        the unamended articles, so an absent marker means unchanged rather than
        unknown.
        """
        position = bisect_right(self.offsets, offset)
        return self.amended[position - 1] if position else False

    def any_between(self, start: int, end: int) -> bool:
        """Whether any amended span opens inside a range."""
        return any(
            start <= offset < end and amended
            for offset, amended in zip(self.offsets, self.amended, strict=True)
        )


def read(index: TextIndex, root: HtmlElement) -> AmendmentSpans:
    """Collect every marker in document order."""
    found = sorted(
        (index.start_of(marker), normalize(marker.text_content()))
        for marker in root.xpath(MARKERS)
    )
    return AmendmentSpans(
        offsets=tuple(offset for offset, _ in found),
        amended=tuple(bool(_AMENDING_ACT.search(text)) for _, text in found),
    )
