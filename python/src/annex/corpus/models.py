"""The unit every parse produces and every later stage reads.

A provision is flat. An article, an annex, a recital and a single numbered
paragraph are all provisions, distinguished by kind and joined by `parent_id`,
so resolving `Article 6(2)` is a dictionary lookup rather than a walk into a
nested structure.
"""

import re
import unicodedata
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, computed_field

from annex.corpus.sources import CorpusVersion

_WHITESPACE = re.compile(r'\s+')


def normalize(text: str) -> str:
    """Collapse the whitespace legal HTML carries into single spaces.

    The Official Journal markup spells its headings `Article\xa04`, so a
    reference pattern written with an ordinary space matches nothing until the
    non-breaking spaces are gone. Unicode normalization also folds the
    typographic forms the text mixes into their canonical spellings.
    """
    return _WHITESPACE.sub(' ', unicodedata.normalize('NFKC', text)).strip()


class ProvisionKind(StrEnum):
    """What sort of unit a provision is."""

    ARTICLE = 'article'
    ANNEX = 'annex'
    RECITAL = 'recital'
    PARAGRAPH = 'paragraph'


class Provision(BaseModel):
    """One addressable unit of the Act."""

    model_config = ConfigDict(frozen=True)

    id: str
    kind: ProvisionKind
    number: str
    title: str
    text: str
    version: CorpusVersion
    parent_id: str | None = None
    amended: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def citation(self) -> str:
        """How a reader would write this provision in prose."""
        if self.kind is ProvisionKind.ARTICLE:
            return f'Article {self.number}'
        if self.kind is ProvisionKind.ANNEX:
            return f'Annex {self.number}'
        if self.kind is ProvisionKind.RECITAL:
            return f'Recital {self.number}'
        parent_number = (self.parent_id or '').removeprefix('art_')
        return f'Article {parent_number}({self.number})'


class Reference(BaseModel):
    """One cross-reference found in the text of a provision."""

    model_config = ConfigDict(frozen=True)

    source_id: str
    target_id: str
    phrase: str


class Corpus(BaseModel):
    """Every provision parsed from one version of the Act."""

    model_config = ConfigDict(frozen=True)

    version: CorpusVersion
    provisions: tuple[Provision, ...]

    def of_kind(self, kind: ProvisionKind) -> tuple[Provision, ...]:
        return tuple(p for p in self.provisions if p.kind is kind)

    @property
    def by_id(self) -> dict[str, Provision]:
        return {p.id: p for p in self.provisions}

    def get(self, provision_id: str) -> Provision | None:
        return self.by_id.get(provision_id)
