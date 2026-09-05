"""Extract the Act's cross-references from the text of its provisions.

The predicate is stated rather than tuned. A reference is a phrase reading
`Article <n>` or `Annex <roman>`, optionally carrying a paragraph as
`Article <n>(<p>)`, which resolves to a provision of this corpus, is not a
self-reference, and is not immediately followed by wording naming another
instrument.

That last clause is what the count turns on. The original text carries 265
citations of other legislation, and Annex I is a list of such instruments, so
`Article 5 of Directive 2009/48/EC` reads as an edge to this Act's Article 5
under any pattern that does not exclude it.
"""

import re

from annex.corpus.models import Corpus, Provision, ProvisionKind, Reference

PREDICATE = (
    'A phrase naming one or more provisions, written as `Article <n>[(<p>)]`, '
    '`Articles <n> to <m>`, `Articles <n> and <m>` or `Annex <roman>`, in the '
    'text of an article, annex or recital. Each named provision becomes an '
    'edge where it resolves inside this corpus, is not a self-reference, and '
    'the phrase is not followed by wording naming another instrument. A range '
    'is expanded, so `Articles 8 to 15` yields eight edges, and a paragraph '
    'citation yields the paragraph and the article holding it, since '
    '`Article 97(6)` names both.'
)

_SEPARATOR = r'(?:\s*,\s*|\s+and\s+|\s+to\s+)'

_REFERENCE = re.compile(
    r'\bArticles?\s+(?P<articles>\d+[a-z]?(?:\s*\(\s*(?P<paragraph>\d+[a-z]?)\s*\))?'
    rf'(?:{_SEPARATOR}\d+[a-z]?)*)'
    rf'|\bAnnex(?:es)?\s+(?P<annex>[IVXLC]+(?:{_SEPARATOR}[IVXLC]+)*)\b'
)

_TOKEN = re.compile(r'\d+[a-z]?|to')

_EXTERNAL = re.compile(
    r'^\s*(?:,\s*)?(?:and\s+)?of\s+'
    r'(?:Directive|Regulation|Decision|Council|the\s+(?:Directive|Regulation))'
)

_SOURCE_KINDS = (
    ProvisionKind.ARTICLE,
    ProvisionKind.ANNEX,
    ProvisionKind.RECITAL,
)


def _expand(listed: str) -> list[str]:
    """Expand a written list of article numbers, ranges included.

    `Articles 8 to 15` names eight articles. Reading it as one, or missing it
    because the word is plural, drops the reference that binds the high-risk
    classification to the obligations it triggers.
    """
    tokens = _TOKEN.findall(listed)
    numbers: list[str] = []
    index = 0
    while index < len(tokens):
        token = tokens[index]
        if token == 'to' and numbers and index + 1 < len(tokens):
            first, last = numbers[-1], tokens[index + 1]
            if first.isdigit() and last.isdigit() and int(last) > int(first):
                numbers.extend(str(n) for n in range(int(first) + 1, int(last) + 1))
                index += 2
                continue
        if token != 'to':
            numbers.append(token)
        index += 1
    return numbers


def _target_ids(match: re.Match[str]) -> list[str]:
    annex = match.group('annex')
    if annex:
        return [f'anx_{number}' for number in re.split(_SEPARATOR, annex)]

    paragraph = match.group('paragraph')
    numbers = _expand(re.sub(r'\([^)]*\)', ' ', match.group('articles')))
    if paragraph and len(numbers) == 1:
        return [f'art_{numbers[0]}.{paragraph}', f'art_{numbers[0]}']
    return [f'art_{number}' for number in numbers]


def references_in(provision: Provision, known: set[str]) -> list[Reference]:
    """Return every reference the provision's text makes to another provision."""
    found: list[Reference] = []
    seen: set[str] = set()
    for match in _REFERENCE.finditer(provision.text):
        if _EXTERNAL.match(provision.text[match.end() : match.end() + 40]):
            continue
        for target in _target_ids(match):
            if target not in known:
                continue
            if target == provision.id or target.startswith(f'{provision.id}.'):
                continue
            if target in seen:
                continue
            seen.add(target)
            found.append(
                Reference(
                    source_id=provision.id,
                    target_id=target,
                    phrase=match.group(0),
                )
            )
    return found


def extract(corpus: Corpus) -> tuple[Reference, ...]:
    """Extract every cross-reference in the corpus.

    Paragraphs are not read as sources. Their text is a slice of the article
    holding them, so reading both would count one phrase twice.
    """
    known = set(corpus.by_id)
    return tuple(
        reference
        for provision in corpus.provisions
        if provision.kind in _SOURCE_KINDS
        for reference in references_in(provision, known)
    )
