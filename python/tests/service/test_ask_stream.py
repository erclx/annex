"""One SSE frame per graph node, ending in `answer` or a mid-stream `error`.

Parses the response body by splitting on the blank line SSE frames end on,
rather than reaching for an SSE client library the project does not otherwise
depend on. The transport under test is simple enough that the split is the
whole parser.
"""

import json

from fastapi.testclient import TestClient

from annex.answer import Answer
from tests.service.conftest import StubPipeline


def _events(body: str) -> list[tuple[str, dict[str, object]]]:
    events = []
    for block in body.strip().split('\n\n'):
        lines = block.splitlines()
        event = lines[0].removeprefix('event: ')
        data = lines[1].removeprefix('data: ')
        events.append((event, json.loads(data)))
    return events


def test_the_response_is_ok_and_streams_as_server_sent_events(
    client: TestClient,
) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    assert response.status_code == 200
    assert response.headers['content-type'].startswith('text/event-stream')


def test_node_frames_arrive_in_the_graphs_own_order(client: TestClient) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    names = [data['node'] for event, data in _events(response.text) if event == 'node']

    assert names == ['route', 'retrieve', 'traverse', 'synthesize']


def test_the_last_frame_is_the_answer(client: TestClient) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    events = _events(response.text)

    assert events[-1][0] == 'answer'
    parsed = Answer.model_validate(events[-1][1])
    assert parsed.claims[0].citations[0].citation == 'Article 50(1)'


def test_an_oversized_or_empty_description_never_reaches_the_stream(
    client: TestClient,
) -> None:
    response = client.post('/ask/stream', json={'description': ''})

    assert response.status_code == 422
    assert response.headers['content-type'].startswith('application/json')


def test_an_unready_pipeline_answers_the_ordinary_503(
    degraded: object,
) -> None:
    started = degraded(RuntimeError('never built'))  # type: ignore[operator]
    response = started.post('/ask/stream', json={'description': 'a customer chatbot'})

    assert response.status_code == 503


def test_a_mid_stream_failure_yields_an_error_frame(
    client: TestClient, pipeline: StubPipeline
) -> None:
    pipeline.compiled.raises = RuntimeError('boom')

    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    events = _events(response.text)
    assert events[-1][0] == 'error'
    assert events[-1][1]['state'] == 'failed'
    assert events[-1][1]['correlationId']
