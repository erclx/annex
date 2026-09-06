"""A described system comes back as the answer object, unchanged."""

from fastapi.testclient import TestClient

from annex.answer import Answer
from annex.corpus import CorpusVersion
from tests.service.conftest import StubPipeline


def test_a_described_system_comes_back_as_an_answer(client: TestClient) -> None:
    response = client.post('/ask', json={'description': 'a customer chatbot'})

    assert response.status_code == 200
    assert response.json()['claims'][0]['citations'][0]['citation'] == 'Article 50(1)'


def test_the_response_body_validates_against_the_answer_model(
    client: TestClient,
) -> None:
    response = client.post('/ask', json={'description': 'a customer chatbot'})

    parsed = Answer.model_validate(response.json())

    assert parsed.claims[0].citations[0].provision_id == 'art_50.1'


def test_the_description_reaches_the_pipeline_as_the_question(
    client: TestClient, pipeline: StubPipeline
) -> None:
    client.post('/ask', json={'description': 'a CV screening tool'})

    assert pipeline.calls[0]['question'] == 'a CV screening tool'


def test_the_version_switch_reaches_the_pipeline(
    client: TestClient, pipeline: StubPipeline
) -> None:
    client.post(
        '/ask', json={'description': 'a customer chatbot', 'version': 'original'}
    )

    assert pipeline.calls[0]['version'] is CorpusVersion.ORIGINAL


def test_the_traversal_switch_reaches_the_pipeline(
    client: TestClient, pipeline: StubPipeline
) -> None:
    client.post('/ask', json={'description': 'a customer chatbot', 'traversal': False})

    assert pipeline.calls[0]['traversal'] is False


def test_both_switches_default_to_the_shipped_pipeline_behavior(
    client: TestClient, pipeline: StubPipeline
) -> None:
    client.post('/ask', json={'description': 'a customer chatbot'})

    assert pipeline.calls[0]['version'] is CorpusVersion.CONSOLIDATED
    assert pipeline.calls[0]['traversal'] is True


def test_health_reports_a_built_pipeline_and_the_model_it_verified(
    client: TestClient,
) -> None:
    body = client.get('/health').json()

    assert body['ready'] is True
    assert body['model'] == 'annex-qwen3-27b'
