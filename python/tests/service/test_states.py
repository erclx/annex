"""One test per row of the published state table.

The table is written into `.canon/plans/feature-the-service-seam.md` and quoted
by `.claude/wireframes/answer.md`, which draws a failure region carrying one
copy variant per row. A row changing status here changes what that surface
renders, so these assertions are the contract rather than a restatement of the
implementation.
"""

import httpx
import pytest
from fastapi.testclient import TestClient
from openai import APIConnectionError, APITimeoutError

from annex.llm import ModelContextError
from tests.service.conftest import StubPipeline, a_refusal


def test_answered_is_a_200_carrying_claims(client: TestClient) -> None:
    response = client.post('/ask', json={'description': 'a customer chatbot'})

    assert response.status_code == 200
    assert response.json()['claims']
    assert response.json()['refusal'] is None


def test_refused_is_a_200_carrying_a_populated_refusal(
    client: TestClient, pipeline: StubPipeline
) -> None:
    pipeline.answer = a_refusal()

    response = client.post('/ask', json={'description': 'quarterly retraining'})

    assert response.status_code == 200
    assert response.json()['refusal']['reason']
    assert response.json()['claims'] == []


def test_a_refusal_carries_what_was_read_before_saying_so(
    client: TestClient, pipeline: StubPipeline
) -> None:
    pipeline.answer = a_refusal()

    response = client.post('/ask', json={'description': 'quarterly retraining'})

    assert response.json()['refusal']['consulted'][0]['citation'] == 'Article 50(1)'


def test_invalid_is_a_422_naming_the_state(client: TestClient) -> None:
    response = client.post('/ask', json={'description': ''})

    assert response.status_code == 422
    assert response.json()['state'] == 'invalid'


def test_invalid_carries_no_correlation_id(client: TestClient) -> None:
    response = client.post('/ask', json={'description': ''})

    assert 'correlationId' not in response.json()


@pytest.mark.parametrize(
    ('raised', 'status', 'state'),
    [
        (ModelContextError('not rebuilt'), 503, 'unavailable'),
        (FileNotFoundError('no index'), 503, 'unavailable'),
        (
            APIConnectionError(request=httpx.Request('POST', 'http://localhost')),
            503,
            'unavailable',
        ),
        (
            APITimeoutError(request=httpx.Request('POST', 'http://localhost')),
            504,
            'timeout',
        ),
        (RuntimeError('something nobody mapped'), 500, 'failed'),
    ],
)
def test_a_raised_exception_maps_to_its_row_of_the_table(
    client: TestClient,
    pipeline: StubPipeline,
    raised: BaseException,
    status: int,
    state: str,
) -> None:
    pipeline.raises = raised

    response = client.post('/ask', json={'description': 'a customer chatbot'})

    assert response.status_code == status
    assert response.json()['state'] == state


@pytest.mark.parametrize(
    'raised',
    [
        ModelContextError('not rebuilt'),
        FileNotFoundError('no index'),
        APITimeoutError(request=httpx.Request('POST', 'http://localhost')),
        RuntimeError('something nobody mapped'),
    ],
    ids=['unavailable', 'unavailable-index', 'timeout', 'failed'],
)
def test_every_failure_state_reaches_a_browser(
    client: TestClient, pipeline: StubPipeline, raised: BaseException
) -> None:
    """A named state the browser rejects is the `unreachable` state to a reader.

    Every row here is built by the boundary middleware rather than by an
    exception handler, because a handler registered for bare `Exception` sits
    on `ServerErrorMiddleware`, outside CORS. Asserting the status alone passed
    against exactly that defect: `curl` does not enforce CORS and a browser
    does, so the suite and a real-HTTP pass both stayed green while three of
    the four failure states were unreadable in a browser.
    """
    pipeline.raises = raised

    response = client.post(
        '/ask',
        json={'description': 'a customer chatbot'},
        headers={'origin': 'http://localhost:4100'},
    )

    assert response.headers['access-control-allow-origin'] == 'http://localhost:4100'


def test_an_answer_reaches_a_browser(client: TestClient) -> None:
    response = client.post(
        '/ask',
        json={'description': 'a customer chatbot'},
        headers={'origin': 'http://localhost:4100'},
    )

    assert response.headers['access-control-allow-origin'] == 'http://localhost:4100'


def test_an_origin_outside_the_list_is_not_answered(client: TestClient) -> None:
    """The allowlist is what makes the header above a policy rather than a wildcard."""
    response = client.post(
        '/ask',
        json={'description': 'a customer chatbot'},
        headers={'origin': 'http://evil.example'},
    )

    assert 'access-control-allow-origin' not in response.headers


def test_a_failure_carries_a_correlation_id_a_reader_can_quote(
    client: TestClient, pipeline: StubPipeline
) -> None:
    pipeline.raises = RuntimeError('something nobody mapped')

    response = client.post('/ask', json={'description': 'a customer chatbot'})

    assert response.json()['correlationId']


def test_a_failure_detail_names_no_internals(
    client: TestClient, pipeline: StubPipeline
) -> None:
    pipeline.raises = RuntimeError('a connection string nobody should read')

    response = client.post('/ask', json={'description': 'a customer chatbot'})

    assert 'connection string' not in response.json()['detail']


def test_a_pipeline_that_never_built_answers_unavailable(
    degraded: object,
) -> None:
    started = degraded(ModelContextError('not rebuilt'))  # type: ignore[operator]

    response = started.post('/ask', json={'description': 'a customer chatbot'})

    assert response.status_code == 503
    assert response.json()['state'] == 'unavailable'


def test_a_service_whose_pipeline_never_built_still_serves_health(
    degraded: object,
) -> None:
    started = degraded(ModelContextError('not rebuilt'))  # type: ignore[operator]

    body = started.get('/health').json()

    assert body['ready'] is False
    assert body['unready'] == 'ModelContextError'
