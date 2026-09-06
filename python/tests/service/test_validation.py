"""The untrusted input, refused at the boundary rather than inside the pipeline.

`.claude/ARCHITECTURE.md` names the user's own description as the one untrusted
input this project takes. Every case here asserts the same two things: the
response is the `invalid` state, and the pipeline was never called.
"""

from fastapi.testclient import TestClient

from annex.service.models import MAXIMUM_DESCRIPTION
from tests.service.conftest import StubPipeline


def test_an_empty_description_is_invalid(
    client: TestClient, pipeline: StubPipeline
) -> None:
    response = client.post('/ask', json={'description': ''})

    assert response.json()['state'] == 'invalid'
    assert pipeline.calls == []


def test_a_description_of_whitespace_is_invalid(
    client: TestClient, pipeline: StubPipeline
) -> None:
    response = client.post('/ask', json={'description': '     '})

    assert response.json()['state'] == 'invalid'
    assert pipeline.calls == []


def test_a_description_past_the_bound_is_invalid(
    client: TestClient, pipeline: StubPipeline
) -> None:
    response = client.post(
        '/ask', json={'description': 'a' * (MAXIMUM_DESCRIPTION + 1)}
    )

    assert response.json()['state'] == 'invalid'
    assert pipeline.calls == []


def test_a_description_at_the_bound_reaches_the_pipeline(
    client: TestClient, pipeline: StubPipeline
) -> None:
    response = client.post('/ask', json={'description': 'a' * MAXIMUM_DESCRIPTION})

    assert response.status_code == 200
    assert len(pipeline.calls) == 1


def test_an_unknown_field_is_invalid(
    client: TestClient, pipeline: StubPipeline
) -> None:
    response = client.post(
        '/ask', json={'description': 'a customer chatbot', 'depth': 9}
    )

    assert response.json()['state'] == 'invalid'
    assert pipeline.calls == []


def test_an_unknown_version_is_invalid(
    client: TestClient, pipeline: StubPipeline
) -> None:
    response = client.post(
        '/ask', json={'description': 'a customer chatbot', 'version': 'draft'}
    )

    assert response.json()['state'] == 'invalid'
    assert pipeline.calls == []


def test_a_body_past_the_cap_is_refused_before_it_is_parsed(
    client: TestClient, pipeline: StubPipeline
) -> None:
    response = client.post(
        '/ask', json={'description': 'a' * 20000}, headers={'origin': 'http://x'}
    )

    assert response.status_code == 422
    assert response.json()['state'] == 'invalid'
    assert pipeline.calls == []


def test_a_refused_body_still_carries_the_cors_header(client: TestClient) -> None:
    """The refusal has to reach the browser, not just leave the service.

    The body-size check returns before the route runs, so it is the one
    response that can skip a middleware registered inside it. Without the CORS
    header the browser rejects it unread and the surface reports `unreachable`,
    which tells a reader to start a service that is already running.
    """
    response = client.post(
        '/ask',
        content=b'{"description":"' + b'a' * 20000 + b'"}',
        headers={
            'origin': 'http://localhost:4100',
            'content-type': 'application/json',
        },
    )

    assert response.status_code == 422
    assert response.headers['access-control-allow-origin'] == 'http://localhost:4100'


def test_a_validation_failure_never_echoes_the_description(
    client: TestClient,
) -> None:
    response = client.post(
        '/ask', json={'description': 'marzipan-77413' * 400, 'depth': 9}
    )

    assert 'marzipan-77413' not in response.text
