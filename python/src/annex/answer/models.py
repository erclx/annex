"""What an answer is, before anything knows how to produce one.

Every claim carries the provisions behind it and the text that supports them,
so a reader checks an answer against the Act rather than trusting it. An answer
the text does not settle carries a `Refusal` instead of claims, which is a
return value here rather than an error, per the refusal decision in
`.claude/ARCHITECTURE.md`.

This module imports from `annex.corpus` and from nothing else in the package.
The evaluation harness and the web half both read this shape, and neither
should have to import a retrieval pipeline to do it.
"""

from typing import Self

from pydantic import BaseModel, ConfigDict, model_validator

from annex.corpus import CorpusVersion, ProvisionKind


class Citation(BaseModel):
    """One provision, quoted, located, and marked if the amendment moved it."""

    model_config = ConfigDict(frozen=True)

    provision_id: str
    citation: str
    kind: ProvisionKind
    version: CorpusVersion
    text: str
    changed: bool = False
    change_note: str | None = None

    @model_validator(mode='after')
    def _a_change_states_what_moved(self) -> Self:
        if self.changed and not self.change_note:
            raise ValueError(
                f'{self.provision_id} is marked changed with no change_note'
            )
        if not self.changed and self.change_note:
            raise ValueError(
                f'{self.provision_id} carries a change_note without being changed'
            )
        return self


class Claim(BaseModel):
    """One statement about the described system, and what it rests on.

    A claim reaching verification with nothing behind it is dropped rather than
    softened, so emptiness is rejected by the schema rather than left to a
    convention each caller remembers separately.
    """

    model_config = ConfigDict(frozen=True)

    statement: str
    citations: tuple[Citation, ...]

    @model_validator(mode='after')
    def _a_claim_rests_on_something(self) -> Self:
        if not self.citations:
            raise ValueError(f'claim carries no citation: {self.statement!r}')
        return self


class Refusal(BaseModel):
    """What the text does not settle, and what was read before saying so.

    `consulted` is what separates a refusal from a shrug. It carries the
    provisions retrieved and found not to answer the question, so the refusal
    is evidenced rather than asserted.
    """

    model_config = ConfigDict(frozen=True)

    reason: str
    missing: tuple[str, ...]
    consulted: tuple[Citation, ...] = ()


class RetrievalTrace(BaseModel):
    """What the pipeline did to produce an answer, and what it cost.

    Held on the answer rather than beside it. The evaluation harness scores hit
    rate and cost per question from this object, and a trace that travels
    separately from the answer it describes is a trace something eventually
    mismatches.

    `dropped_ids` is the part a scorer cannot infer. Retrieval reaches more
    provisions than a prompt has room for, so `traversed_ids` names what
    traversal found and `dropped_ids` names which of those the budget cut
    before the model saw them. Scoring traversal's contribution against the
    first without subtracting the second credits it for text nothing read. Ids
    rather than a count, because the scorer resolves them.

    `truncated` says the model stopped for want of room rather than because it
    had finished. A cut answer reads as a complete one, so a caller that does
    not check this field cannot tell them apart.
    """

    model_config = ConfigDict(frozen=True)

    searched_ids: tuple[str, ...] = ()
    traversed_ids: tuple[str, ...] = ()
    dropped_ids: tuple[str, ...] = ()
    traversal_enabled: bool = False
    truncated: bool = False
    prompt_tokens: int = 0
    completion_tokens: int = 0
    duration_ms: int = 0
    model: str = ''


class Answer(BaseModel):
    """A question, and either what the Act says about it or why it cannot say.

    Claims and a refusal are exclusive in both directions. An answer carrying
    both is a pipeline that refused and answered anyway, and one carrying
    neither is a pipeline that returned nothing while reporting success.
    """

    model_config = ConfigDict(frozen=True)

    question: str
    version: CorpusVersion
    claims: tuple[Claim, ...] = ()
    refusal: Refusal | None = None
    retrieval: RetrievalTrace = RetrievalTrace()

    @model_validator(mode='after')
    def _claims_and_refusal_are_exclusive(self) -> Self:
        if self.claims and self.refusal is not None:
            raise ValueError('an answer carries claims or a refusal, never both')
        if not self.claims and self.refusal is None:
            raise ValueError('an answer carries claims or a refusal, never neither')
        return self

    @property
    def is_refusal(self) -> bool:
        return self.refusal is not None
