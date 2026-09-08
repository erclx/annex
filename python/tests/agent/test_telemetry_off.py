"""Nothing leaves the machine, asserted rather than inherited from a default.

`langsmith` arrives with LangGraph and is a hosted telemetry client, on a
project whose stated constraint is that every call is local. A default that is
off today is a default somebody else can change, and an environment variable
somebody happened not to set is not a property of this code. So the settings
write the switches off, the pipeline puts them in the environment before the
graph is built, and this file checks both.
"""

import os

import pytest

from annex.agent.pipeline import apply_tracing_settings
from annex.settings import TRACING_VARIABLES, Settings, tracing_environment


@pytest.fixture
def isolated_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Let monkeypatch own the switches, so a write here is undone after."""
    for name in TRACING_VARIABLES:
        monkeypatch.setenv(name, 'unset-by-the-test')


class TestSettings:
    def test_tracing_is_off_by_default(self) -> None:
        assert not Settings().tracing_enabled

    def test_both_switches_are_written_rather_than_left_unset(self) -> None:
        written = tracing_environment(Settings())

        assert set(written) == set(TRACING_VARIABLES)
        assert set(written.values()) == {'false'}

    def test_the_langsmith_and_langchain_switches_are_both_covered(self) -> None:
        assert 'LANGSMITH_TRACING' in TRACING_VARIABLES
        assert 'LANGCHAIN_TRACING_V2' in TRACING_VARIABLES


@pytest.mark.usefixtures('isolated_environment')
class TestEnvironment:
    def test_the_default_settings_write_the_switches_off(self) -> None:
        apply_tracing_settings(Settings())

        assert [os.environ[name] for name in TRACING_VARIABLES] == ['false', 'false']

    def test_a_switch_left_on_elsewhere_is_overwritten(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv('LANGSMITH_TRACING', 'true')

        apply_tracing_settings(Settings())

        assert os.environ['LANGSMITH_TRACING'] == 'false'

    def test_an_operator_who_asks_for_tracing_gets_it(self) -> None:
        apply_tracing_settings(Settings(tracing_enabled=True))

        assert [os.environ[name] for name in TRACING_VARIABLES] == ['true', 'true']


class TestLocalEndpoint:
    def test_the_model_endpoint_is_a_loopback_address(self) -> None:
        assert Settings().ollama_base_url.startswith('http://localhost:')
