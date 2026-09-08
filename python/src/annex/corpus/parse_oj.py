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
BODY_PARAGRAPHS = '//p[@class="oj-normal"]'
ANNEX_ANCHORS = '//*[starts-with(@id,"anx_")]'
RECITAL_ANCHORS = '//*[starts-with(@id,"rct_")]'

_ARTICLE_NUMBER = re.compile(r'Article\s+(\d+[a-z]?)')
_LEADING_LABEL = re.compile(r'^(\d+[a-z]?)\.\s')


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


def _paragraphs(
    index: TextIndex,
    article_id: str,
    bodies: list[HtmlElement],
    start: int,
    end: int,
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
            )
        )
    return provisions


def _anchored(
    root: HtmlElement,
    xpath: str,
    prefix: str,
    kind: ProvisionKind,
) -> list[Provision]:
    provisions: list[Provision] = []
    for element in root.xpath(xpath):
        number = str(element.get('id')).removeprefix(prefix)
        text = normalize(element.text_content())
        title = (
            text.removeprefix(f'ANNEX {number}').strip()[:120]
            if kind is ProvisionKind.ANNEX
            else ''
        )
        provisions.append(
            Provision(
                id=f'{prefix}{number}',
                kind=kind,
                number=number,
                title=title,
                text=text,
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
    bodies = root.xpath(BODY_PARAGRAPHS)
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
        provisions.append(
            Provision(
                id=article_id,
                kind=ProvisionKind.ARTICLE,
                number=number,
                title=_subtitle_for(index, subtitles, start, end),
                text=normalize(index.slice(start, end)),
                version=CorpusVersion.ORIGINAL,
            )
        )
        provisions.extend(_paragraphs(index, article_id, bodies, start, end))

    provisions.extend(_anchored(root, ANNEX_ANCHORS, 'anx_', ProvisionKind.ANNEX))
    provisions.extend(_anchored(root, RECITAL_ANCHORS, 'rct_', ProvisionKind.RECITAL))
    return Corpus(version=ORIGINAL.version, provisions=tuple(provisions))
