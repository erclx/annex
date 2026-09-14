"""Adapter for the consolidated text, which uses the `norm` markup scheme.

Articles are found by their rendered headings rather than by `id="art_N"`
anchors. The amendment inserted Articles 4a, 60a, 75a, 75b, 75c and 75d, and
none of the six carries an anchor, so an anchor-driven parse silently folds
each into the article above it and still counts 113.
"""

import re

from lxml.html import HtmlElement, fromstring

from annex.corpus.amendments import AmendmentSpans
from annex.corpus.amendments import read as read_amendments
from annex.corpus.html import TextIndex, index_text, spans
from annex.corpus.models import Corpus, Provision, ProvisionKind, normalize
from annex.corpus.sources import CONSOLIDATED, CorpusVersion

ARTICLE_HEADINGS = '//p[@class="title-article-norm"]'
ARTICLE_SUBTITLES = '//p[@class="stitle-article-norm"]'
DIVISION_HEADINGS = '//p[starts-with(@class,"title-division-")]'
CHAPTER_HEADINGS = '//p[@class="title-division-1"]'
CHAPTER_TITLES = '//p[@class="title-division-2"]'
PARAGRAPH_LABELS = './/span[@class="no-parag"]'
ANNEX_ANCHORS = '//*[starts-with(@id,"anx_")]'
ANNEX_TITLE_LINES = './/p[starts-with(@class,"title-annex-")]'

_ARTICLE_NUMBER = re.compile(r'Article\s+(\d+[a-z]?)')
_CHAPTER_NUMBER = re.compile(r'^CHAPTER\s+([IVXLC]+)$')
_LABEL = re.compile(r'^(\d+[a-z]?)\.?$')
_MARKER_TEXT = re.compile(r'▼(?:M\d+|B)\s*—*')
_STRAY_QUOTE = re.compile(r'[`\'"]+$')


def _clean(text: str) -> str:
    """Normalize text with `p.modref` marker text and its separator dropped.

    Consolidation markers carry their offsets in `AmendmentSpans`, read
    upstream by `annex.corpus.amendments.read`. What is dropped here is only
    their visible text, which is never part of the Act's own words.
    """
    return normalize(_MARKER_TEXT.sub('', text))


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
            return _STRAY_QUOTE.sub('', _clean(subtitle.text_content()))
    return ''


def _annex_title(element: HtmlElement, number: str) -> str:
    """The annex's own heading, stopping before its body.

    `title-annex-1` names the number and every other `title-annex-*` line is
    the descriptive title. An annex carrying no second heading line, such as
    the one the amendment inserted, keeps the first paragraph of its body
    instead, which is what a reader sees as its title there.
    """
    headings = element.xpath(ANNEX_TITLE_LINES)
    descriptive = headings[1:]
    if descriptive:
        return _clean(' '.join(line.text_content() for line in descriptive))[:120]
    if not headings:
        return ''
    paragraphs = element.xpath('.//p')
    heading_index = paragraphs.index(headings[0])
    for paragraph in paragraphs[heading_index + 1 :]:
        text = _clean(paragraph.text_content())
        if text:
            return text[:120]
    return ''


def _paragraphs(
    index: TextIndex,
    article_id: str,
    labels: list[HtmlElement],
    start: int,
    end: int,
    amendments: AmendmentSpans,
    chapter_id: str | None,
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
                text=_clean(index.slice(label_start, label_end)),
                version=CorpusVersion.CONSOLIDATED,
                parent_id=article_id,
                amended=amendments.at(label_start),
                chapter_id=chapter_id,
            )
        )
    return provisions


def _chapters(
    index: TextIndex,
    headings: list[HtmlElement],
    titles: list[HtmlElement],
    end: int,
) -> tuple[list[Provision], list[tuple[int, str]]]:
    """Chapter provisions and their start offsets, in document order.

    `headings` carries every `title-division-1` line, chapter and section
    numbers alike, since the two share one class in this markup. Filtering to
    `CHAPTER` happens here rather than at the xpath, so the offsets returned
    stay paired to the provisions they came from.
    """
    provisions: list[Provision] = []
    starts: list[tuple[int, str]] = []
    for heading, start, chapter_end in spans(index, headings, end=end):
        match = _CHAPTER_NUMBER.match(_clean(heading.text_content()))
        if match is None:
            continue
        numeral = match.group(1)
        chapter_id = f'chp_{numeral}'
        title = _subtitle_for(index, titles, start, chapter_end)
        text = f'CHAPTER {numeral} {title}' if title else f'CHAPTER {numeral}'
        provisions.append(
            Provision(
                id=chapter_id,
                kind=ProvisionKind.CHAPTER,
                number=numeral,
                title=title,
                text=_clean(text),
                version=CorpusVersion.CONSOLIDATED,
            )
        )
        starts.append((start, chapter_id))
    return provisions, starts


def _chapter_at(chapter_starts: list[tuple[int, str]], position: int) -> str | None:
    """The id of the last chapter beginning at or before position, if any."""
    result = None
    for offset, chapter_id in chapter_starts:
        if offset > position:
            break
        result = chapter_id
    return result


def _annexes(index: TextIndex, root: HtmlElement) -> list[Provision]:
    provisions: list[Provision] = []
    for element in root.xpath(ANNEX_ANCHORS):
        number = str(element.get('id')).removeprefix('anx_')
        provisions.append(
            Provision(
                id=f'anx_{number}',
                kind=ProvisionKind.ANNEX,
                number=number,
                title=_annex_title(element, number),
                text=_clean(element.text_content()),
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
    divisions = root.xpath(DIVISION_HEADINGS)
    chapter_headings = root.xpath(CHAPTER_HEADINGS)
    chapter_titles = root.xpath(CHAPTER_TITLES)
    labels = root.xpath(PARAGRAPH_LABELS)
    amendments = read_amendments(index, root)
    annexes = root.xpath(ANNEX_ANCHORS)

    first_annex = min(
        (index.start_of(annex) for annex in annexes),
        default=len(index.text),
    )
    division_offsets = [
        index.start_of(division)
        for division in divisions
        if index.start_of(division) < first_annex
    ]

    chapters, chapter_starts = _chapters(
        index, chapter_headings, chapter_titles, first_annex
    )

    provisions: list[Provision] = list(chapters)
    for heading, start, end in spans(
        index, headings, end=first_annex, stops=division_offsets
    ):
        number = _article_number(heading)
        if number is None:
            continue
        article_id = f'art_{number}'
        amended = amendments.any_between(start, end) or amendments.at(start)
        chapter_id = _chapter_at(chapter_starts, start)
        provisions.append(
            Provision(
                id=article_id,
                kind=ProvisionKind.ARTICLE,
                number=number,
                title=_subtitle_for(index, subtitles, start, end),
                text=_clean(index.slice(start, end)),
                version=CorpusVersion.CONSOLIDATED,
                amended=amended,
                chapter_id=chapter_id,
            )
        )
        provisions.extend(
            _paragraphs(index, article_id, labels, start, end, amendments, chapter_id)
        )

    provisions.extend(_annexes(index, root))
    return Corpus(version=CONSOLIDATED.version, provisions=tuple(provisions))
