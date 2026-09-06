"""Where the model lives, which models to call, and how much context to give them.

Three packages need these values and none of them should spell a localhost URL
inline. `retrieval` embeds, `agent` generates, and the evaluation harness does
both, so a second copy of any of these is a second place `num_ctx` can drift.

The tracing switches are here for the reason the plan gives: `langsmith` ships
with LangGraph and is a hosted telemetry client, on a project whose stated
constraint is that nothing leaves the machine. A default that is off today is a
default someone else can change, so the values are written rather than assumed.
"""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

TRACING_VARIABLES = ('LANGSMITH_TRACING', 'LANGCHAIN_TRACING_V2')


class Settings(BaseSettings):
    """Everything a caller needs to reach the local models."""

    model_config = SettingsConfigDict(env_prefix='ANNEX_', frozen=True)

    ollama_base_url: str = 'http://localhost:11434/v1'
    generation_model: str = 'annex-qwen3-27b'
    embedding_model: str = 'nomic-embed-text'

    generation_context: int = 32768
    embedding_context: int = 2048

    request_timeout_seconds: float = 600.0
    embedding_batch_size: int = 16

    traversal_depth: int = 2
    traversal_cap: int = 40
    search_k: int = 12

    tracing_enabled: bool = Field(default=False)

    service_host: str = '127.0.0.1'
    service_port: int = 4200
    ask_timeout_seconds: float = 120.0
    max_body_bytes: int = 16384
    allowed_origins: tuple[str, ...] = (
        'http://localhost:4100',
        'http://127.0.0.1:4100',
    )
    """Origins the service answers a browser from, listed rather than reflected.

    Two spellings of one dev origin, because a browser sends whichever the
    address bar carries and they are different origins to it. A worktree
    serving on another port of the 4100 band adds its own through
    `ANNEX_ALLOWED_ORIGINS`, which pydantic-settings reads as JSON.
    """


def tracing_environment(settings: Settings) -> dict[str, str]:
    """The LangSmith switches, written out rather than left to a default.

    Returned rather than applied, so a caller decides whether to set the
    process environment and a test reads the same mapping the agent does.
    """
    value = 'true' if settings.tracing_enabled else 'false'
    return dict.fromkeys(TRACING_VARIABLES, value)
