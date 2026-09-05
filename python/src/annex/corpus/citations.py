"""Resolve a citation as a reader would write it to a provision id.

`Article 6(2)` resolves in both versions. The amendment inserts paragraphs as
`1a` rather than renumbering the ones after them, so a paragraph label means
the same thing in the original and the consolidated text.
"""

import re

from annex.corpus.models import Corpus, Provision

_CITATION = re.compile(
    r'^\s*(?:'
    r'Article\s+(?P<article>\d+[a-z]?)(?:\s*\(\s*(?P<paragraph>\d+[a-z]?)\s*\))?'
    r'|Annex\s+(?P<annex>[IVXLC]+)'
    r'|Recital\s+(?P<recital>\d+)'
    r')\s*$',
    re.IGNORECASE,
)


def to_id(citation: str) -> str | None:
    """Return the provision id a citation names, or None where it is not one."""
    match = _CITATION.match(citation)
    if match is None:
        return None
    if match.group('annex'):
        return f'anx_{match.group("annex").upper()}'
    if match.group('recital'):
        return f'rct_{match.group("recital")}'
    article = f'art_{match.group("article")}'
    paragraph = match.group('paragraph')
    return f'{article}.{paragraph}' if paragraph else article


def resolve(corpus: Corpus, citation: str) -> Provision | None:
    """Return the provision a citation names, or None where nothing matches."""
    provision_id = to_id(citation)
    return corpus.get(provision_id) if provision_id else None
