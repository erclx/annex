"""Adapter for the consolidated text, which uses the `norm` markup scheme.

Articles are found by their rendered headings rather than by `id="art_N"`
anchors. The amendment inserted Articles 4a, 60a, 75a, 75b, 75c and 75d, and
none of the six carries an anchor, so an anchor-driven parse silently folds
each into the article above it and still counts 113.
"""

import re

from lxml.html import HtmlElement, fromstring

from annex.corpus.html import TextIndex, index_text, spans
from annex.corpus.models import Corpus, Provision, ProvisionKind, normalize
from annex.corpus.sources import CONSOLIDATED, CorpusVersion

ARTICLE_HEADINGS = '//p[@class="title-article-norm"]'
ARTICLE_SUBTITLES = '//p[@class="stitle-article-norm"]'
PARAGRAPH_LABELS = './/span[@class="no-parag"]'
AMENDMENT_MARKERS = '//p[@class="modref"]'
ANNEX_ANCHORS = '//*[starts-with(@id,"anx_")]'

_ARTICLE_NUMBER = re.compile(r'Article\s+(\d+[a-z]?)')
_LABEL = re.compile(r'^(\d+[a-z]?)\.?$')
_AMENDED_BY = re.compile(r'M\d+')


def _article_number(heading: HtmlElement) -> str | None:
    match = _ARTICLE_NUMBER.search(normalize(heading.text_content()))
    return match.group(1) if match else None


def _subtitle_for(
    index: TextIndex,
    subtitles: list[HtmlElement],
    start: int,
    end: int,
) -> str:
    for subtitle in subtitles:
        if start < index.start_of(subtitle) < end:
            return normalize(subtitle.text_content())
    return ''


def _is_amended(
    index: TextIndex, markers: list[HtmlElement], start: int, end: int
) -> bool:
    return any(
        start <= index.start_of(marker) < end
        and _AMENDED_BY.search(normalize(marker.text_content()))
        for marker in markers
    )


def _paragraphs(
    index: TextIndex,
    article_id: str,
    labels: list[HtmlElement],
    start: int,
    end: int,
    amended: bool,
) -> list[Provision]:
    inside = [label for label in labels if start <= index.start_of(label) < end]
    provisions: list[Provision] = []
    for label, label_start, label_end in spans(index, inside, end=end):
        match = _LABEL.match(normalize(label.text_content()))
        if match is None:
            continue
        number = match.group(1)
        provisions.append(
            Provision(
                id=f'{article_id}.{number}',
                kind=ProvisionKind.PARAGRAPH,
                number=number,
                title='',
                text=normalize(index.slice(label_start, label_end)),
                version=CorpusVersion.CONSOLIDATED,
                parent_id=article_id,
                amended=amended,
            )
        )
    return provisions


def _annexes(index: TextIndex, root: HtmlElement) -> list[Provision]:
    provisions: list[Provision] = []
    for element in root.xpath(ANNEX_ANCHORS):
        number = str(element.get('id')).removeprefix('anx_')
        text = normalize(element.text_content())
        title = text.removeprefix(f'ANNEX {number}').strip()
        provisions.append(
            Provision(
                id=f'anx_{number}',
                kind=ProvisionKind.ANNEX,
                number=number,
                title=title[:120],
                text=text,
                version=CorpusVersion.CONSOLIDATED,
            )
        )
    return provisions


def parse(document: bytes) -> Corpus:
    """Parse the consolidated text into provisions."""
    root = fromstring(document)
    index = index_text(root)

    headings = root.xpath(ARTICLE_HEADINGS)
    subtitles = root.xpath(ARTICLE_SUBTITLES)
    labels = root.xpath(PARAGRAPH_LABELS)
    markers = root.xpath(AMENDMENT_MARKERS)
    annexes = root.xpath(ANNEX_ANCHORS)

    first_annex = min(
        (index.start_of(annex) for annex in annexes),
        default=len(index.text),
    )

    provisions: list[Provision] = []
    for heading, start, end in spans(index, headings, end=first_annex):
        number = _article_number(heading)
        if number is None:
            continue
        article_id = f'art_{number}'
        amended = _is_amended(index, markers, start, end)
        provisions.append(
            Provision(
                id=article_id,
                kind=ProvisionKind.ARTICLE,
                number=number,
                title=_subtitle_for(index, subtitles, start, end),
                text=normalize(index.slice(start, end)),
                version=CorpusVersion.CONSOLIDATED,
                amended=amended,
            )
        )
        provisions.extend(_paragraphs(index, article_id, labels, start, end, amended))

    provisions.extend(_annexes(index, root))
    return Corpus(version=CONSOLIDATED.version, provisions=tuple(provisions))
