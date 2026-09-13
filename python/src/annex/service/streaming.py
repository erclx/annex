"""A frame per completed node, over the compiled graph's own `stream()`.

`POST /ask/stream` reads the same `Pipeline.compiled` `/ask` already builds. It
adds no second path through the graph: `stream_mode='updates'` yields one
`{node_name: partial_state}` dict per node LangGraph finishes, in the order the
graph itself runs them, so framing that sequence is all this module does.

`synthesize` always sets `answer` on the state, refusal included, per the
refusal decision in `.claude/ARCHITECTURE.md`. The generator does not stop the
moment that key appears: it drains the graph to exhaustion first, so a refused
question still reaches its `refuse` node frame, the one place the system's
judgment that the text does not settle the question becomes visible, before
the terminal `answer` frame goes out carrying the populated `refusal` field.

A caller that disconnects mid-stream does not stop this generator. A sync
generator has no `request.is_disconnected` to poll, so the run outlives its
caller and keeps calling the model until the graph itself finishes.
"""

from collections.abc import Callable, Iterator

from annex.agent.pipeline import State
from annex.service import logging as boundary_log
from annex.service.errors import DETAIL, classify
from annex.service.models import StreamError, StreamNode

PipelineStream = Callable[..., Iterator[dict[str, State]]]
"""The shape of `CompiledStateGraph.stream`, taken structurally.

`Callable[..., ...]` rather than a precise signature because the real method
carries LangGraph's own overloads for `stream_mode`, and this module only ever
calls it one way: positional state, `stream_mode='updates'` by keyword.
"""


def _frame(event: str, data: str) -> str:
    return f'event: {event}\ndata: {data}\n\n'


def build_stream(
    stream: PipelineStream, initial_state: State, correlation_id: str
) -> Iterator[str]:
    """Drive one run of the compiled graph, framed as SSE.

    Wrapped in `try`/`except` because a `StreamingResponse` body iterator runs
    after `bound_and_identify`'s `call_next` has already returned, so that
    middleware cannot see a failure raised while the body streams. This
    generator is the only place left to map it and the only place left to log
    it, since the boundary log line every other failure gets runs there too.
    """
    last_answer = None
    try:
        for chunk in stream(initial_state, stream_mode='updates'):
            for node_name, update in chunk.items():
                yield _frame('node', StreamNode(node=node_name).model_dump_json())
                answer = update.get('answer')
                if answer is not None:
                    last_answer = answer
        if last_answer is not None:
            yield _frame('answer', last_answer.model_dump_json())
        else:
            body = StreamError(
                state='failed', detail=DETAIL['failed'], correlation_id=correlation_id
            ).model_dump_json(by_alias=True)
            yield _frame('error', body)
    except Exception as error:  # noqa: BLE001
        state = classify(error)
        boundary_log.log_failure(correlation_id, state, error)
        body = StreamError(
            state=state, detail=DETAIL[state], correlation_id=correlation_id
        ).model_dump_json(by_alias=True)
        yield _frame('error', body)
