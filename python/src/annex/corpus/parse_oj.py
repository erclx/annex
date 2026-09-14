"""Adapter for the Official Journal text, which uses the `oj-*` markup scheme.

This document carries the 180 recitals the consolidation drops, and it numbers
its paragraphs in the prose rather than in a label element. The `NNN.NNN` ids
it also carries are sequential positions rather than paragraph numbers, so they
are not read here: they disagree with the labels wherever the amendment later
inserted a paragraph.
"""

import re

from lxml.html import HtmlElement, fromstring

from annex.corpus.html import TextIndex, index_text, spans
from annex.corpus.models import Corpus, Provision, ProvisionKind, normalize
from annex.corpus.sources import ORIGINAL, CorpusVersion

ARTICLE_HEADINGS = '//p[@class="oj-ti-art"]'
ARTICLE_SUBTITLES = '//p[@class="oj-sti-art"]'
DIVISION_HEADINGS = '//p[starts-with(@class,"oj-ti-section-")]'
CHAPTER_HEADINGS = '//p[@class="oj-ti-section-1"]'
CHAPTER_TITLES = '//p[@class="oj-ti-section-2"]'
BODY_PARAGRAPHS = '//p[@class="oj-normal"]'
ANNEX_ANCHORS = '//*[starts-with(@id,"anx_")]'
RECITAL_ANCHORS = '//*[starts-with(@id,"rct_")]'
ANNEX_TITLE_LINES = './/p[@class="oj-doc-ti"]'
SIGNATURE_ANCHORS = '//div[starts-with(@id,"fnp_")]'

_ARTICLE_NUMBER = re.compile(r'Article\s+(\d+[a-z]?)')
_CHAPTER_NUMBER = re.compile(r'^CHAPTER\s+([IVXLC]+)$')
_LEADING_LABEL = re.compile(r'^(\d+[a-z]?)\.\s')
_STRAY_QUOTE = re.compile(r'[`\'"]+$')


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
            return _STRAY_QUOTE.sub('', normalize(subtitle.text_content()))
    return ''


def _annex_title(element: HtmlElement) -> str:
    """The annex's own heading, stopping before its body.

    The first `oj-doc-ti` line names the number and the second is the
    descriptive title. Every original-text annex carries both.
    """
    headings = element.xpath(ANNEX_TITLE_LINES)
    descriptive = headings[1:]
    if descriptive:
        return normalize(' '.join(line.text_content() for line in descriptive))[:120]
    return ''


def _paragraphs(
    index: TextIndex,
    article_id: str,
    bodies: list[HtmlElement],
    start: int,
    end: int,
    chapter_id: str | None,
) -> list[Provision]:
    numbered = [
        body
        for body in bodies
        if start <= index.start_of(body) < end
        and _LEADING_LABEL.match(normalize(body.text_content()))
    ]
    provisions: list[Provision] = []
    for body, body_start, body_end in spans(index, numbered, end=end):
        match = _LEADING_LABEL.match(normalize(body.text_content()))
        if match is None:
            continue
        number = match.group(1)
        provisions.append(
            Provision(
                id=f'{article_id}.{number}',
                kind=ProvisionKind.PARAGRAPH,
                number=number,
                title='',
                text=normalize(index.slice(body_start, body_end)),
                version=CorpusVersion.ORIGINAL,
                parent_id=article_id,
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

    `headings` carries every `oj-ti-section-1` line, chapter and section
    numbers alike, since the two share one class in this markup. Filtering to
    `CHAPTER` happens here rather than at the xpath, so the offsets returned
    stay paired to the provisions they came from.
    """
    provisions: list[Provision] = []
    starts: list[tuple[int, str]] = []
    for heading, start, chapter_end in spans(index, headings, end=end):
        match = _CHAPTER_NUMBER.match(normalize(heading.text_content()))
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
                text=normalize(text),
                version=CorpusVersion.ORIGINAL,
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


def _anchored(
    root: HtmlElement,
    xpath: str,
    prefix: str,
    kind: ProvisionKind,
) -> list[Provision]:
    provisions: list[Provision] = []
    for element in root.xpath(xpath):
        number = str(element.get('id')).removeprefix(prefix)
        title = _annex_title(element) if kind is ProvisionKind.ANNEX else ''
        provisions.append(
            Provision(
                id=f'{prefix}{number}',
                kind=kind,
                number=number,
                title=title,
                text=normalize(element.text_content()),
                version=CorpusVersion.ORIGINAL,
            )
        )
    return provisions


def parse(document: bytes) -> Corpus:
    """Parse the Official Journal text into provisions."""
    root = fromstring(document)
    index = index_text(root)

    headings = root.xpath(ARTICLE_HEADINGS)
    subtitles = root.xpath(ARTICLE_SUBTITLES)
    divisions = root.xpath(DIVISION_HEADINGS)
    chapter_headings = root.xpath(CHAPTER_HEADINGS)
    chapter_titles = root.xpath(CHAPTER_TITLES)
    bodies = root.xpath(BODY_PARAGRAPHS)
    annexes = root.xpath(ANNEX_ANCHORS)
    signatures = root.xpath(SIGNATURE_ANCHORS)

    first_annex = min(
        (index.start_of(annex) for annex in annexes),
        default=len(index.text),
    )
    first_signature = min(
        (index.start_of(signature) for signature in signatures),
        default=len(index.text),
    )
    last_article_end = min(first_annex, first_signature)
    division_offsets = [
        index.start_of(division)
        for division in divisions
        if index.start_of(division) < last_article_end
    ]

    chapters, chapter_starts = _chapters(
        index, chapter_headings, chapter_titles, last_article_end
    )

    provisions: list[Provision] = []
    next_chapter = 0
    for heading, start, end in spans(
        index, headings, end=last_article_end, stops=division_offsets
    ):
        number = _article_number(heading)
        if number is None:
            continue
        while next_chapter < len(chapters) and chapter_starts[next_chapter][0] < start:
            provisions.append(chapters[next_chapter])
            next_chapter += 1
        article_id = f'art_{number}'
        chapter_id = _chapter_at(chapter_starts, start)
        provisions.append(
            Provision(
                id=article_id,
                kind=ProvisionKind.ARTICLE,
                number=number,
                title=_subtitle_for(index, subtitles, start, end),
                text=normalize(index.slice(start, end)),
                version=CorpusVersion.ORIGINAL,
                chapter_id=chapter_id,
            )
        )
        provisions.extend(
            _paragraphs(index, article_id, bodies, start, end, chapter_id)
        )
    provisions.extend(chapters[next_chapter:])

    provisions.extend(_anchored(root, ANNEX_ANCHORS, 'anx_', ProvisionKind.ANNEX))
    provisions.extend(_anchored(root, RECITAL_ANCHORS, 'rct_', ProvisionKind.RECITAL))
    return Corpus(version=ORIGINAL.version, provisions=tuple(provisions))
