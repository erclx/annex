"""The boundary log, and the id that makes one line findable from a browser.

The rule this module exists to hold is that the described system never reaches
a log record. A description is the one untrusted input this project takes and
the one piece of a request a reader might have pasted from somewhere private,
so the log carries its length and never its text.

Length is worth keeping. It separates an empty submission from a paragraph
without reproducing either, and it is the field that explains a slow ask.
"""

import logging
import time
import uuid
from collections.abc import Iterator
from contextlib import contextmanager

from annex.answer import Answer
from annex.corpus import CorpusVersion

logger = logging.getLogger('annex.service')

ROUTED_QUERY_LOGGER = 'annex.agent.pipeline'
"""The logger whose INFO line restates the description in the Act's vocabulary.

`annex.agent.pipeline` logs the routed query, which is the model's own
rewriting of the description and can carry its distinctive terms. Scrubbing
this module's lines alone would leave that one, so the service raises that
logger's level instead of editing a merged surface. The command line keeps the
line, where a person is watching on purpose.
"""


def new_correlation_id() -> str:
    """A short id a reader can quote out loud and find in the log.

    Eight hex characters split by a dash. Long enough that two requests in one
    demo do not collide, short enough to read off a screen and type back.
    """
    raw = uuid.uuid4().hex
    return f'{raw[:4]}-{raw[4:8]}'


def silence_routed_query() -> None:
    """Raise the pipeline logger above the level its query line is written at."""
    logging.getLogger(ROUTED_QUERY_LOGGER).setLevel(logging.WARNING)


@contextmanager
def boundary(
    correlation_id: str,
    *,
    description_length: int,
    version: CorpusVersion,
    traversal: bool,
) -> Iterator[None]:
    """Log a request arriving and log how it left, whichever way it left.

    The closing line is written from a `finally`, so a request that raised is
    as findable by its correlation id as one that answered. What it does not do
    is name the exception, which `annex.service.errors` maps to a state and the
    handler logs separately at its own level.
    """
    started = time.monotonic()
    logger.info(
        'ask received correlation=%s description_length=%d version=%s traversal=%s',
        correlation_id,
        description_length,
        version.value,
        traversal,
    )
    try:
        yield
    finally:
        logger.info(
            'ask closed correlation=%s duration_ms=%d',
            correlation_id,
            int((time.monotonic() - started) * 1000),
        )


def log_answer(correlation_id: str, answer: Answer) -> None:
    """Report what the pipeline produced and what it cost.

    The token counts come off `RetrievalTrace`, which is the same object the
    surface renders its cost line from, so the log and the screen cannot
    disagree about what a question cost.
    """
    trace = answer.retrieval
    logger.info(
        'ask answered correlation=%s refusal=%s claims=%d '
        'prompt_tokens=%d completion_tokens=%d truncated=%s',
        correlation_id,
        answer.is_refusal,
        len(answer.claims),
        trace.prompt_tokens,
        trace.completion_tokens,
        trace.truncated,
    )


def log_failure(correlation_id: str, state: str, error: BaseException) -> None:
    """Record what actually went wrong, on the one surface allowed to know.

    The exception reaches the log and never the response body. That split is
    the whole point of the correlation id: a caller quotes the id, and the
    person reading the log has the type and the message the caller was not
    given.
    """
    logger.error(
        'ask failed correlation=%s state=%s error=%s',
        correlation_id,
        state,
        type(error).__name__,
        exc_info=error,
    )
