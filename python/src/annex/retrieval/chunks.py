"""Turning a corpus into units the embedder can see whole.

The embedding model decides this, not retrieval taste. `nomic-embed-text`
reports a 2048-token context, and over-length input comes back truncated with
no error, so an oversized chunk is a silent quality loss rather than a failure.
Measured on 2026-09-06: an over-length input through `/v1/embeddings` returns a
successful response reporting exactly 2048 prompt tokens.

The rule is three lines.

1. A paragraph is a chunk
2. A provision carrying no paragraph is a chunk, which covers every annex,
   every recital, and the 19 articles in each version that no paragraph parses
   out of
3. A chunk still over the limit is split on its own `(n)` point markers

Line three exists for two provisions and not more. `art_3` at 17 101 and
17 615 characters and the original's `art_113` at 14 847 are the only units
that survive the first two rules and still overflow.

A chunk keeps the id of the provision it came from, whatever the split does to
it, because that id is what the answer cites. `chunk_id` carries the part index
for the store's benefit and `provision_id` is what a citation resolves through.
"""

import re
from dataclasses import dataclass

from annex.corpus import Corpus, Provision, ProvisionKind

POINT_MARKER = re.compile(r'(?<=\s)(?=\(\d+\)\s)')

CHARACTER_BUDGET = 6000
"""Where a chunk is split, in characters, held well below the 2048-token limit.

Not derived from the document-wide 5.03 characters a token. That average is
wrong per provision in both directions: measured across every chunk of both
versions on 2026-09-06, the real ratio runs from 3.13 to 6.43 characters a
token, so a budget set from the average overflows on the dense end. At 8000 the
widest chunk measured 2007 tokens of the 2048 available, which is 41 tokens of
headroom on a limit that truncates silently.

At 6000 the widest measures 1680. Every figure here is `usage.prompt_tokens`
read back off the embedder rather than a character count divided by anything.

This is a split trigger and not a guarantee. Two annexes in each version carry
no `(n)` markers to split on and stay above it whole, at 1462 and 1399 tokens.
`annex.retrieval.embed` is what refuses an over-length chunk, because only the
embedder knows the real count.
"""


@dataclass(frozen=True)
class Chunk:
    """One embeddable unit, and the provision a citation resolves through."""

    chunk_id: str
    provision_id: str
    citation: str
    kind: ProvisionKind
    text: str

    @property
    def is_split(self) -> bool:
        return self.chunk_id != self.provision_id


def _embeddable_text(provision: Provision, corpus: Corpus) -> str:
    """The provision's text, with enough of its heading to be searchable.

    An article, an annex and a recital already open with their own heading in
    the source markup. A paragraph opens with its own number and nothing else,
    so a search for a term in Article 50(2) has no way to tell it from the same
    term in Article 12(2) without the article restated.
    """
    if provision.kind is not ProvisionKind.PARAGRAPH:
        if provision.kind is ProvisionKind.RECITAL:
            return f'{provision.citation}\n{provision.text}'
        return provision.text

    parent = corpus.get(provision.parent_id or '')
    heading = provision.citation
    if parent and parent.title:
        heading = f'{heading} {parent.title}'
    return f'{heading}\n{provision.text}'


def _split_on_points(text: str, budget: int) -> list[str]:
    """Break an over-long unit at its numbered points, never mid-sentence.

    Points are gathered until the next one would overflow, so a part is as
    close to the budget as the text's own structure allows. A part that is
    still over the budget is a single point longer than the whole limit, which
    neither document contains, and it is returned whole rather than cut blind.
    """
    points = [part for part in POINT_MARKER.split(text) if part.strip()]
    if len(points) < 2:
        return [text]

    parts: list[str] = []
    current = ''
    for point in points:
        if current and len(current) + len(point) > budget:
            parts.append(current.strip())
            current = point
        else:
            current += point
    if current.strip():
        parts.append(current.strip())
    return parts


def chunk(corpus: Corpus, *, budget: int = CHARACTER_BUDGET) -> tuple[Chunk, ...]:
    """Every embeddable unit of one version, in document order."""
    with_paragraphs = {
        provision.parent_id
        for provision in corpus.of_kind(ProvisionKind.PARAGRAPH)
        if provision.parent_id
    }

    chunks: list[Chunk] = []
    for provision in corpus.provisions:
        if provision.kind is not ProvisionKind.PARAGRAPH:
            if provision.id in with_paragraphs:
                continue
        text = _embeddable_text(provision, corpus)
        parts = [text] if len(text) <= budget else _split_on_points(text, budget)
        for index, part in enumerate(parts):
            chunk_id = provision.id if len(parts) == 1 else f'{provision.id}#{index}'
            chunks.append(
                Chunk(
                    chunk_id=chunk_id,
                    provision_id=provision.id,
                    citation=provision.citation,
                    kind=provision.kind,
                    text=part,
                )
            )
    return tuple(chunks)


def source_provisions(chunks: tuple[Chunk, ...]) -> set[str]:
    """The provisions a chunk set covers, which splitting does not change."""
    return {item.provision_id for item in chunks}
