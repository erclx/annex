"""One SSE frame per graph node, ending in `answer` or a mid-stream `error`.

Parses the response body by splitting on the blank line SSE frames end on,
rather than reaching for an SSE client library the project does not otherwise
depend on. The transport under test is simple enough that the split is the
whole parser.
"""

import json

from fastapi.testclient import TestClient

from annex.answer import Answer
from tests.service.conftest import StubPipeline, a_refusal


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

    assert names == ['route', 'retrieve', 'traverse', 'budget', 'synthesize']


def _node_frame(body: str, name: str) -> dict[str, object]:
    return next(
        data
        for event, data in _events(body)
        if event == 'node' and data['node'] == name
    )


def test_the_retrieve_frame_names_each_provision_search_matched_once(
    client: TestClient,
) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    frame = _node_frame(response.text, 'retrieve')

    assert frame['searched_ids'] == ['art_50.1', 'art_3']


def test_the_traverse_frame_carries_what_the_walk_reached_and_how(
    client: TestClient,
) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    frame = _node_frame(response.text, 'traverse')

    assert frame['searched_ids'] == ['art_50.1', 'art_3']
    assert frame['traversed_ids'] == ['art_50', 'art_2']
    assert frame['edges'] == [
        {'source_id': 'art_50.1', 'target_id': 'art_50', 'hop': 0},
        {'source_id': 'art_3', 'target_id': 'art_2', 'hop': 1},
    ]


def test_the_budget_frame_names_what_is_supplied_and_carries_no_statute_text(
    client: TestClient,
) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    frame = _node_frame(response.text, 'budget')

    assert frame['supplied_ids'] == ['art_50.1', 'art_3', 'art_50']
    assert frame['dropped_ids'] == ['art_2']
    assert 'Providers shall ensure' not in json.dumps(frame)


def test_a_frame_carries_only_the_fields_its_node_produced(
    client: TestClient,
) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    frame = _node_frame(response.text, 'route')

    assert frame == {'node': 'route'}


def test_the_last_frame_is_the_answer(client: TestClient) -> None:
    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    events = _events(response.text)

    assert events[-1][0] == 'answer'
    parsed = Answer.model_validate(events[-1][1])
    assert parsed.claims[0].citations[0].citation == 'Article 50(1)'


def test_a_refused_question_still_reaches_its_refuse_node_frame(
    client: TestClient, pipeline: StubPipeline
) -> None:
    pipeline.compiled.answer = a_refusal()

    response = client.post('/ask/stream', json={'description': 'quarterly retraining'})

    names = [data['node'] for event, data in _events(response.text) if event == 'node']
    events = _events(response.text)
    assert names == [
        'route',
        'retrieve',
        'traverse',
        'budget',
        'synthesize',
        'refuse',
    ]
    assert events[-1][0] == 'answer'
    assert Answer.model_validate(events[-1][1]).refusal is not None


def test_a_run_ending_with_no_answer_at_all_yields_an_error_frame(
    client: TestClient, pipeline: StubPipeline
) -> None:
    pipeline.compiled.no_answer = True

    response = client.post('/ask/stream', json={'description': 'a customer chatbot'})

    events = _events(response.text)
    assert events[-1][0] == 'error'
    assert events[-1][1]['state'] == 'failed'


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
