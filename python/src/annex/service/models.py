"""What crosses the boundary, in both directions.

The response side is deliberately thin. `annex.answer.Answer` is what a 200
carries, defined by the agent and read unchanged by the evaluation harness that
never goes over HTTP, so a second response model here would make the contract a
property of the transport. This module adds the request and the error body and
nothing else.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from annex.corpus import CorpusVersion

MAXIMUM_DESCRIPTION = 4000
"""How long a described system may be, in characters.

Set against the corpus rather than against the model. A description this long
routes to a query the retrieval step then searches with, and the longest
question in `python/data/eval/questions.json` runs to a few hundred characters.
Four thousand leaves room for someone pasting a paragraph of product
documentation and still bounds the untrusted field, which is the input
`.claude/ARCHITECTURE.md` names as the one this project does not trust.
"""

Description = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=1, max_length=MAXIMUM_DESCRIPTION
    ),
]
"""The bound, declared once so the request and its tests read the same number.

`StringConstraints` rather than `Field` because `strip_whitespace` lives there.
Passed to `Field` it is accepted as an unknown keyword, warns, and strips
nothing, which lets a description of spaces through to the pipeline as an empty
query. Stripping runs before the length check, so that description fails the
minimum instead.
"""

ServiceState = Literal['invalid', 'unavailable', 'timeout', 'failed']
"""The four states a non-200 carries.

The other three results of the published table are not here. `answered` and
`refused` are both 200s carrying an `Answer`, and `unreachable` is the state
the client names when nothing answered at all, so no server ever writes it.
"""


class AskRequest(BaseModel):
    """A described system, and which text to read it against."""

    model_config = ConfigDict(extra='forbid', frozen=True)

    description: Description
    version: CorpusVersion = CorpusVersion.CONSOLIDATED
    traversal: bool = True


class ServiceError(BaseModel):
    """The body every non-200 returns, and the only thing a failure says.

    `detail` is a fixed sentence per state, written here rather than taken from
    an exception. An exception string names internals, and a reader who cannot
    act on it is worse off than one given the next thing to try.
    """

    model_config = ConfigDict(frozen=True)

    state: ServiceState
    detail: str
    correlation_id: str | None = Field(
        default=None, serialization_alias='correlationId'
    )
    """The id the boundary log carries, so a reader can quote it and the log answers.

    Absent on `invalid`, which is the one state decided before any work started
    and therefore the one with no log line to point at.
    """
