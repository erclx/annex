"""The boundary log carries the correlation id and never the description.

The description is asserted against a distinctive token rather than a plausible
sentence. A test looking for `a customer chatbot` in the captured records
passes on a log nobody would have written anyway, where a token that appears
nowhere else in the project fails the moment something echoes the input.
"""

import logging

import pytest
from fastapi.testclient import TestClient

from annex.service.logging import ROUTED_QUERY_LOGGER, new_correlation_id
from tests.service.conftest import StubPipeline

DISTINCTIVE = 'marzipan-77413'


def test_the_boundary_log_carries_a_correlation_id(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger='annex.service'):
        client.post('/ask', json={'description': f'a chatbot {DISTINCTIVE}'})

    assert 'correlation=' in caplog.text


def test_the_boundary_log_carries_the_description_length(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    description = f'a chatbot {DISTINCTIVE}'

    with caplog.at_level(logging.INFO, logger='annex.service'):
        client.post('/ask', json={'description': description})

    assert f'description_length={len(description)}' in caplog.text


def test_the_description_text_reaches_no_log_record(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.DEBUG):
        client.post('/ask', json={'description': f'a chatbot {DISTINCTIVE}'})

    assert DISTINCTIVE not in caplog.text


def test_the_description_text_reaches_no_log_record_on_a_failure(
    client: TestClient, pipeline: StubPipeline, caplog: pytest.LogCaptureFixture
) -> None:
    pipeline.raises = RuntimeError('the model fell over')

    with caplog.at_level(logging.DEBUG):
        client.post('/ask', json={'description': f'a chatbot {DISTINCTIVE}'})

    assert DISTINCTIVE not in caplog.text


def test_the_answered_line_carries_the_token_counts(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger='annex.service'):
        client.post('/ask', json={'description': 'a customer chatbot'})

    assert 'prompt_tokens=7940' in caplog.text
    assert 'completion_tokens=288' in caplog.text


def test_the_failure_line_names_the_state_and_not_the_message(
    client: TestClient, pipeline: StubPipeline, caplog: pytest.LogCaptureFixture
) -> None:
    pipeline.raises = RuntimeError('the model fell over')

    with caplog.at_level(logging.ERROR, logger='annex.service'):
        client.post('/ask', json={'description': 'a customer chatbot'})

    assert 'state=failed' in caplog.text
    assert 'error=RuntimeError' in caplog.text


def test_the_routed_query_logger_is_silenced_by_starting_the_service(
    client: TestClient,
) -> None:
    assert logging.getLogger(ROUTED_QUERY_LOGGER).level == logging.WARNING


def test_a_correlation_id_reads_back_as_two_short_groups() -> None:
    first, _, second = new_correlation_id().partition('-')

    assert len(first) == 4
    assert len(second) == 4


def test_two_correlation_ids_differ() -> None:
    assert new_correlation_id() != new_correlation_id()
