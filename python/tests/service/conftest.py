"""A client over the endpoint whose pipeline is a stub.

The suite reaches no model and stays outside the `live` marker. What it tests
is the transport: which status a result comes back as, which state an exception
maps to, and what the boundary log does and does not carry. The pipeline's own
behavior is v0.5's and is tested there.
"""

from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient

from annex.agent.pipeline import State
from annex.answer import Answer, Citation, Claim, Refusal, RetrievalTrace
from annex.corpus import CorpusVersion, ProvisionKind
from annex.service import create_app
from annex.settings import Settings


class StubCompiledGraph:
    """Stands in for `CompiledStateGraph`, yielding a canned node sequence.

    A hand-built fake rather than a real compiled graph, so streaming tests
    exercise the service's own framing and error handling without a model.
    It proves the framing, not that the real graph's `stream_mode='updates'`
    shape matches what this fake assumes.
    """

    def __init__(self, answer: Answer | None = None) -> None:
        self.answer = answer
        self.raises: BaseException | None = None

    def stream(
        self, initial_state: State, *, stream_mode: str
    ) -> Iterator[dict[str, State]]:
        assert stream_mode == 'updates'
        for node_name in ('route', 'retrieve', 'traverse'):
            yield {node_name: State()}
        if self.raises is not None:
            raise self.raises
        assert self.answer is not None
        yield {'synthesize': State(answer=self.answer)}


class StubPipeline:
    """Stands in for `Pipeline`, recording the call and returning what it is told.

    Structural rather than a subclass. The service reads one method off the
    pipeline it holds, so a stub carrying that method is the whole contract,
    and subclassing would drag the constructor's model check into the suite.
    """

    def __init__(self, answer: Answer | None = None) -> None:
        self.answer = answer
        self.raises: BaseException | None = None
        self.calls: list[dict[str, object]] = []
        self.compiled = StubCompiledGraph(answer)

    def ask(
        self,
        question: str,
        *,
        version: CorpusVersion = CorpusVersion.CONSOLIDATED,
        traversal: bool = True,
    ) -> Answer:
        self.calls.append(
            {'question': question, 'version': version, 'traversal': traversal}
        )
        if self.raises is not None:
            raise self.raises
        assert self.answer is not None
        return self.answer


def a_citation(provision_id: str = 'art_50.1') -> Citation:
    return Citation(
        provision_id=provision_id,
        citation='Article 50(1)',
        kind=ProvisionKind.PARAGRAPH,
        version=CorpusVersion.CONSOLIDATED,
        text='Providers shall ensure that AI systems intended to interact '
        'directly with natural persons are designed and developed in such a '
        'way that the natural persons concerned are informed.',
    )


def an_answer(question: str = 'a chatbot') -> Answer:
    return Answer(
        question=question,
        version=CorpusVersion.CONSOLIDATED,
        claims=(
            Claim(
                statement='The chatbot has to tell the person they are '
                'interacting with an AI system.',
                citations=(a_citation(),),
            ),
        ),
        retrieval=RetrievalTrace(
            searched_ids=('art_50', 'art_50.1'),
            traversed_ids=('art_50.2',),
            traversal_enabled=True,
            prompt_tokens=7940,
            completion_tokens=288,
            duration_ms=12100,
            model='annex-qwen3-27b',
        ),
    )


def a_refusal(question: str = 'quarterly retraining') -> Answer:
    return Answer(
        question=question,
        version=CorpusVersion.CONSOLIDATED,
        refusal=Refusal(
            reason='The Act makes substantial modification the trigger and '
            'never defines the threshold.',
            missing=('what counts as a substantial modification',),
            consulted=(a_citation('art_25.1'),),
        ),
    )


@pytest.fixture
def pipeline() -> StubPipeline:
    return StubPipeline(an_answer())


@pytest.fixture
def client(pipeline: StubPipeline) -> Iterator[TestClient]:
    """A client whose app holds the stub, with server exceptions handled.

    `raise_server_exceptions=False` is what lets the registered handler answer.
    Left at its default the test client re-raises instead, and the mapping
    every state test exists to check would never run.
    """
    app = create_app(settings=Settings(), build_pipeline=lambda: pipeline)  # type: ignore[arg-type,return-value]
    with TestClient(app, raise_server_exceptions=False) as started:
        yield started


@pytest.fixture
def degraded() -> Iterator[Callable[[BaseException], TestClient]]:
    """A client whose pipeline failed to build, for the degraded-boot path."""
    clients: list[TestClient] = []

    def build(error: BaseException) -> TestClient:
        def raising() -> object:
            raise error

        app = create_app(settings=Settings(), build_pipeline=raising)  # type: ignore[arg-type]
        started = TestClient(app, raise_server_exceptions=False)
        started.__enter__()
        clients.append(started)
        return started

    yield build
    for started in clients:
        started.__exit__(None, None, None)
