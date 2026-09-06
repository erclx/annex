"""The one place a raised exception becomes a row of the published state table.

Every mapping is written here rather than at a call site, so the set of states
a caller can meet is readable in one file and a new exception type reaching the
boundary lands on `failed` rather than on whatever the nearest handler happened
to catch.

The sentences are fixed per state and carry no exception text. What went wrong
internally is a log line holding the correlation id, and what the caller gets
is the next thing to try.
"""

from openai import APIConnectionError, APITimeoutError

from annex.llm import ModelContextError
from annex.service.models import ServiceState

UNAVAILABLE = (
    'The service is up and could not reach the model or the index. '
    'Start the model and ask again.'
)
TIMEOUT = (
    'The model did not answer inside the budget. Narrow the description and ask again.'
)
FAILED = (
    'Something went wrong that we did not expect. '
    'Quote the correlation id and the log will answer.'
)
INVALID = 'The description was empty or past the length bound.'

DETAIL: dict[ServiceState, str] = {
    'unavailable': UNAVAILABLE,
    'timeout': TIMEOUT,
    'failed': FAILED,
    'invalid': INVALID,
}

STATUS: dict[ServiceState, int] = {
    'invalid': 422,
    'unavailable': 503,
    'timeout': 504,
    'failed': 500,
}


def classify(error: BaseException) -> ServiceState:
    """Which row of the state table an exception leaves through.

    `APITimeoutError` is tested before `APIConnectionError` because the first
    subclasses the second in the OpenAI SDK, so the broader test written first
    would swallow every timeout into `unavailable` and retire the one state the
    published table exists to keep separate.

    `APIConnectionError` maps to `unavailable` alongside `ModelContextError`
    and `OSError`, which is one addition to what the plan enumerated. Ollama
    refusing a connection mid-request is the same fact as Ollama refusing one
    at startup, and the plan's own description of the state is that the service
    is up and the model is not. `OSError` covers the missing index, which
    `annex.retrieval.store.connect` raises as `FileNotFoundError`.
    """
    if isinstance(error, APITimeoutError):
        return 'timeout'
    if isinstance(error, ModelContextError | APIConnectionError | OSError):
        return 'unavailable'
    return 'failed'
