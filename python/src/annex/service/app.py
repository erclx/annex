"""The seam: one endpoint over one long-lived pipeline.

`POST /ask` takes a described system and returns the answer object the agent
produces, unchanged. A refusal comes back as a populated `refusal` on a 200,
because refusing is a result here rather than a failure, per the refusal
decision in `.claude/ARCHITECTURE.md`. A transport that mapped it to a 4xx
would have quietly turned the product's argument into an error, so a test
asserts the status and not only the shape.

## Why the handler is `def` and not `async def`

A warm ask measures 21 to 28 seconds and spends nearly all of it blocked on
the model. Declared `async def`, that call would hold the event loop for the
whole run and no second request, health check included, would be served
meanwhile. Declared `def`, FastAPI runs it in the threadpool, which is what a
blocking call of that length needs.

## Why the pipeline is built once, in the lifespan

Not for the parse cost, which measures 0.11 to 0.15 s. `Pipeline.__init__`
calls `verify_context`, which reaches Ollama and raises where the model was
never rebuilt with the context this project needs. Constructing per request
turns one startup misconfiguration into an unbounded run of failures with
nowhere to report readiness from. Built once, the same misconfiguration is a
`/health` route saying what is not ready and an `/ask` route answering
`unavailable` rather than dying.
"""

import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from annex.agent import Pipeline
from annex.answer import Answer
from annex.service import logging as boundary_log
from annex.service.errors import DETAIL, STATUS, classify
from annex.service.models import AskRequest, ServiceError, ServiceState
from annex.settings import Settings

logger = logging.getLogger('annex.service')

PipelineFactory = Callable[[], Pipeline]

router = APIRouter()


def _error(state: ServiceState, correlation_id: str | None = None) -> JSONResponse:
    """One state of the published table, as the body and status it returns."""
    body = ServiceError(
        state=state, detail=DETAIL[state], correlation_id=correlation_id
    )
    return JSONResponse(
        status_code=STATUS[state],
        content=body.model_dump(mode='json', by_alias=True, exclude_none=True),
    )


def _build(settings: Settings) -> Pipeline:
    """The default factory, with the model call bounded rather than the request.

    `ask_timeout_seconds` is handed to the client as its request timeout, so
    the OpenAI SDK raises `APITimeoutError` itself and the service maps that to
    a named 504. Bounding the request instead, with `asyncio.wait_for` around
    the threadpool call, returns to the caller promptly and leaves the worker
    thread running until the model answers, which under a stuck Ollama runs to
    the 600 seconds `Settings.request_timeout_seconds` defaults to.
    """
    bounded = settings.model_copy(
        update={'request_timeout_seconds': settings.ask_timeout_seconds}
    )
    return Pipeline(settings=bounded)


def create_app(
    *,
    settings: Settings | None = None,
    build_pipeline: PipelineFactory | None = None,
) -> FastAPI:
    """The app, with its pipeline built once at startup and held on app state."""
    resolved = settings or Settings()
    factory = build_pipeline or (lambda: _build(resolved))

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        boundary_log.silence_routed_query()
        app.state.settings = resolved
        app.state.pipeline = None
        app.state.unready = None
        try:
            app.state.pipeline = factory()
        except Exception as error:  # noqa: BLE001
            app.state.unready = type(error).__name__
            logger.error(
                'the pipeline did not build, so every ask answers unavailable: %s',
                type(error).__name__,
                exc_info=error,
            )
        yield

    app = FastAPI(title='annex', lifespan=lifespan)

    @app.middleware('http')
    async def bound_and_identify(
        request: Request, call_next: Callable[[Request], object]
    ) -> Response:
        """Give every request an id, and refuse one whose body is past the cap.

        The cap is read off `Content-Length` rather than by draining the body,
        so an oversized upload is refused before it is buffered. It answers
        `invalid` rather than a status of its own, because a body past the cap
        is the same fact as a description past the bound and the published
        state table is what the frontend draws against.
        """
        request.state.correlation_id = boundary_log.new_correlation_id()
        declared = request.headers.get('content-length')
        if declared and declared.isdigit():
            if int(declared) > resolved.max_body_bytes:
                return _error('invalid')
        response: Response = await call_next(request)  # type: ignore[misc]
        return response

    # Registered after the middleware above, and therefore outside it.
    # `add_middleware` prepends, so the last registration is the outermost
    # layer. Added first, CORS sits inside this middleware, and the early
    # return above then skips it: the oversized-body response goes out with no
    # `Access-Control-Allow-Origin`, the browser rejects it before the client
    # can read it, and a refused body surfaces as `unreachable` rather than as
    # `invalid`. Measured on 2026-09-06 against a 20 000-byte body.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved.allowed_origins),
        allow_methods=['GET', 'POST'],
        allow_headers=['Content-Type'],
        allow_credentials=False,
    )

    @app.exception_handler(RequestValidationError)
    async def invalid_request(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        """A description that never reached the pipeline, and why it did not.

        The validation detail is dropped rather than forwarded. Pydantic's
        message names field paths and the input that failed, and the input here
        is the description itself, which this service has promised not to
        echo.
        """
        return _error('invalid')

    @app.exception_handler(Exception)
    async def failed_request(request: Request, error: Exception) -> JSONResponse:
        """Every other way an ask can end, mapped to one row of the table."""
        state = classify(error)
        correlation_id = getattr(request.state, 'correlation_id', None)
        boundary_log.log_failure(correlation_id or 'unknown', state, error)
        return _error(state, correlation_id)

    app.include_router(router)
    return app


@router.post('/ask', response_model=Answer)
def ask(request: Request, submitted: AskRequest) -> Answer | JSONResponse:
    """Answer a described system, or say which state stopped it.

    Returns `Answer` on both results the surface renders. A refusal is a
    populated `refusal` field on a 200, never a status.
    """
    pipeline: Pipeline | None = request.app.state.pipeline
    correlation_id: str = request.state.correlation_id
    if pipeline is None:
        return _error('unavailable', correlation_id)

    with boundary_log.boundary(
        correlation_id,
        description_length=len(submitted.description),
        version=submitted.version,
        traversal=submitted.traversal,
    ):
        answer = pipeline.ask(
            submitted.description,
            version=submitted.version,
            traversal=submitted.traversal,
        )
    boundary_log.log_answer(correlation_id, answer)
    return answer


@router.get('/health')
def health(request: Request) -> dict[str, object]:
    """Whether the pipeline built, and which model it verified if it did."""
    state = request.app.state
    settings: Settings = state.settings
    return {
        'ready': state.pipeline is not None,
        'model': settings.generation_model,
        'unready': state.unready,
    }
