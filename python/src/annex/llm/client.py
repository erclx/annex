"""The one place this project talks to a model.

Written once and imported by `retrieval`, by `agent` and by the evaluation
harness, because the setting they share is the dangerous one. Set `num_ctx`
wrong in one caller and the prompt is truncated, the answer comes back fluent
over a partial document, and nothing fails.

## How `num_ctx` reaches the model

Measured on 2026-09-06 against Ollama 0.33.1, on `gemma2:9b` and on
`qwen3.8:27b`, by sending an over-length prompt and reading `prompt_tokens`
back alongside `context_length` from `/api/ps`:

- `/v1` with `extra_body={'options': {'num_ctx': n}}` is accepted and silently
  ignored. Both models held the context they were already going to hold
- `/v1` with a top-level `extra_body={'num_ctx': n}` is ignored the same way
- Ollama's native `/api/chat` with `options.num_ctx` is honoured
- A model built from a Modelfile carrying `PARAMETER num_ctx` is honoured
  through `/v1`, which is the route taken here

`.claude/context/development.md` fixes the transport as the OpenAI SDK against
`/v1`, so the Modelfile is the route that reaches the model without changing
it. `ollama/annex-qwen3-27b.Modelfile` is that artifact and
`scripts/ollama-build.sh` builds it.

The Modelfile's failure mode is a model nobody rebuilt, which truncates as
silently as the ignored option did. `verify_context` turns that into an error
by reading back what the loaded model actually carries. `Pipeline.__init__`
calls it once when it builds its own client, and `annex context` calls it on
demand, so the check runs once per process rather than once per request.

`verify_embedding_context` is its counterpart on the ingest side, called by
`annex embed` before the first batch.
"""

import json
import logging
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Literal
from urllib.parse import urlparse

from openai import OpenAI

from annex.settings import Settings

logger = logging.getLogger('annex.llm')

WINDOW_MARGIN = 64
"""How close to the window counts as having been stopped by it.

The two figures rarely land on the window exactly. A run measured 32 767 of
32 768, one token short, which an equality test would read as a budget stop.
"""

THINKING = re.compile(r'<think>.*?</think>', re.DOTALL)
UNCLOSED_THINKING = re.compile(r'<think>.*', re.DOTALL)

EmbeddingPurpose = Literal['document', 'query']

NO_PREFIXES: dict[EmbeddingPurpose, str] = {'document': '', 'query': ''}
"""What a model outside the map below gets, which is the text unchanged."""

EMBEDDING_PREFIXES: dict[str, dict[EmbeddingPurpose, str]] = {
    'nomic-embed-text': {
        'document': 'search_document: ',
        'query': 'search_query: ',
    },
    'snowflake-arctic-embed2': {
        'document': '',
        'query': 'query: ',
    },
}
"""The task prefixes each model was trained with, per model.

An embedding model puts a corpus passage and a question into different regions
of the same space, and it is told which it is reading by a prefix rather than
by the call. Which prefix is a property of the model's training rather than of
embedding, so the pair is keyed by model: `nomic-embed-text` marks both sides
and `snowflake-arctic-embed2` marks the query alone. Sending one model's pair
to another is not an error and costs retrieval quality silently, worth 0.10 and
0.12 of recall over the two versions when the groundwork measured it.

A model with no entry here embeds unprefixed and `verify_embedding_context`
warns once, naming it. Refusing instead would block the workflow that measures
a candidate model in the first place, which is pointing the CLI at one.
"""

MINIMUM_GENERATION_BUDGET = 512
"""No caller gets a budget the model can spend entirely inside a thinking block.

Measured by the evaluation planner: `num_predict=32` returned an eval count of
32 against an empty response, the whole budget consumed by reasoning that never
closed. A test asserting only that the call succeeded passes on that.
"""


def embedding_prefixes(model: str) -> dict[EmbeddingPurpose, str]:
    """The task prefixes one model was trained with, or no prefix at all.

    The tag is dropped before the lookup. `ollama list` names a model
    `snowflake-arctic-embed2:latest` and `Settings` names it without the tag,
    so the two spellings have to reach one entry. Every tag is dropped rather
    than `:latest` alone, since a quantization of a model was trained with the
    prefixes the model was trained with.
    """
    return EMBEDDING_PREFIXES.get(model.partition(':')[0], NO_PREFIXES)


class ModelContextError(RuntimeError):
    """The model is not carrying the context this project needs."""


@dataclass(frozen=True)
class Completion:
    """One generation, with the reasoning separated from the answer."""

    text: str
    thinking: str
    prompt_tokens: int
    completion_tokens: int
    model: str
    finish_reason: str = 'stop'

    @property
    def is_empty(self) -> bool:
        """Whether the model returned reasoning and no answer."""
        return not self.text.strip()

    @property
    def is_truncated(self) -> bool:
        """Whether the model stopped because it ran out of room to write.

        A cut draft reads as a finished one. Every line before the cut is
        intact, so a caller checking only that the call succeeded gets an
        answer missing whatever the model had not reached yet.
        """
        return self.finish_reason == 'length'


def hit_the_window(completion: Completion, generation_context: int) -> bool:
    """Whether a truncated completion used up the context window, not its own budget.

    `_report_a_cut` carries this same arithmetic to decide which line to log.
    A caller deciding whether a cut draft is worth retrying needs the same
    answer without re-deriving it.
    """
    used = completion.prompt_tokens + completion.completion_tokens
    return used >= generation_context - WINDOW_MARGIN


def split_thinking(content: str) -> tuple[str, str]:
    """Separate a reasoning block from the answer beside it.

    An unclosed block is the case that matters. The model ran out of budget
    mid-thought, so everything from the opening tag on is reasoning and the
    answer is whatever preceded it, which is usually nothing.
    """
    thinking = ' '.join(match.group(0) for match in THINKING.finditer(content))
    answer = THINKING.sub('', content)
    if '<think>' in answer:
        thinking = f'{thinking} {UNCLOSED_THINKING.search(answer).group(0)}'.strip()  # type: ignore[union-attr]
        answer = UNCLOSED_THINKING.sub('', answer)
    return answer.strip(), thinking.strip()


class OllamaClient:
    """The OpenAI SDK pointed at Ollama, with this project's defaults applied."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self._client = OpenAI(
            base_url=self.settings.ollama_base_url,
            api_key='ollama',
            timeout=self.settings.request_timeout_seconds,
        )

    def complete(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.0,
    ) -> Completion:
        """Generate once, and report the reasoning apart from the answer."""
        messages: list[dict[str, str]] = []
        if system:
            messages.append({'role': 'system', 'content': system})
        messages.append({'role': 'user', 'content': prompt})

        budget = max(max_tokens or MINIMUM_GENERATION_BUDGET, MINIMUM_GENERATION_BUDGET)
        response = self._client.chat.completions.create(
            model=self.settings.generation_model,
            messages=messages,  # type: ignore[arg-type]
            max_tokens=budget,
            temperature=temperature,
        )

        choice = response.choices[0]
        message = choice.message
        text, thinking = split_thinking(message.content or '')
        reasoning = getattr(message, 'reasoning_content', None)
        if reasoning:
            thinking = f'{reasoning}\n{thinking}'.strip()
        usage = response.usage
        completion = Completion(
            text=text,
            thinking=thinking,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            model=self.settings.generation_model,
            finish_reason=choice.finish_reason or 'stop',
        )
        self._report_a_cut(completion, budget)
        return completion

    def _report_a_cut(self, completion: Completion, budget: int) -> None:
        """Say which limit stopped the generation, since they differ in kind.

        Hitting the generation budget means the answer was longer than the
        caller allowed for. Hitting the context window means the prompt left
        no room to answer in, which is a caller that assembled too much and
        the failure `annex.agent.pipeline` bounds its prompt against.
        """
        if not completion.is_truncated:
            return
        if hit_the_window(completion, self.settings.generation_context):
            logger.error(
                'the context window stopped generation, not the budget: '
                '%d prompt plus %d completion against a %d window. '
                'The prompt left no room to answer in.',
                completion.prompt_tokens,
                completion.completion_tokens,
                self.settings.generation_context,
            )
            return
        logger.warning(
            'generation stopped at the %d-token budget with %d prompt tokens',
            budget,
            completion.prompt_tokens,
        )

    def embed(
        self, texts: list[str], *, purpose: EmbeddingPurpose = 'document'
    ) -> list[list[float]]:
        """Embed a batch, in the order it was given.

        `purpose` selects the task prefix the configured embedding model was
        trained with. It is not cosmetic. Measured on 2026-09-06 over the
        consolidated text under `nomic-embed-text`, the question "a chatbot
        that talks to customers on our website" ranked its best Article 50
        chunk 27th without the prefixes and 5th with them, against the same 587
        chunks.
        """
        if not texts:
            return []
        prefix = self._prefix(purpose)
        response = self._client.embeddings.create(
            model=self.settings.embedding_model,
            input=[prefix + text for text in texts],
        )
        ordered = sorted(response.data, key=lambda item: item.index)
        return [list(item.embedding) for item in ordered]

    def _prefix(self, purpose: EmbeddingPurpose) -> str:
        """The prefix the configured embedding model wants for this purpose."""
        return embedding_prefixes(self.settings.embedding_model)[purpose]

    def embedding_tokens(
        self, text: str, *, purpose: EmbeddingPurpose = 'document'
    ) -> int:
        """How many tokens the embedder actually read of one text.

        The embedder is its own tokenizer and Ollama exposes no other one, so
        this is an embedding call whose vector is discarded. A count equal to
        the embedder's context means the input was cut. The prefix is counted
        with the text because the prefix is what gets sent.
        """
        response = self._client.embeddings.create(
            model=self.settings.embedding_model,
            input=[self._prefix(purpose) + text],
        )
        return response.usage.prompt_tokens if response.usage else 0

    def _warn_of_an_unlisted_model(self) -> None:
        """Say once that this model is embedding without a task prefix.

        Emitted from the context check rather than from `embed`, because both
        `annex embed` and `annex context` run that check once per process while
        `embed` runs per batch. An empty pair is a legitimate configuration for
        a model trained without prefixes and it is also what a typo produces,
        so it is reported rather than either refused or passed over.
        """
        model = self.settings.embedding_model
        if embedding_prefixes(model) is not NO_PREFIXES:
            return
        logger.warning(
            '%s has no task prefixes recorded, so it embeds a passage and a '
            'question identically. Add its pair to EMBEDDING_PREFIXES if it '
            'was trained with one.',
            model,
        )

    def verify_embedding_context(self) -> int:
        """Read back how much of an input the embedder will actually read.

        The embedder carries no `num_ctx` parameter to inspect, so this asks it
        instead: an input past any plausible limit comes back reporting the
        context as its token count, because Ollama truncates to it. `annex
        embed` calls this before the first batch, since the chunk rule and the
        screen in `annex.retrieval.embed` are both sized against this number
        and a different embedding model silently invalidates both.
        """
        self._warn_of_an_unlisted_model()
        probe = 'The Commission shall adopt implementing acts. ' * 2000
        measured = self.embedding_tokens(probe)
        if measured != self.settings.embedding_context:
            raise ModelContextError(
                f'{self.settings.embedding_model} reads {measured} tokens, not the '
                f'{self.settings.embedding_context} the chunk rule is sized against. '
                'Rebuild the index after correcting embedding_context.'
            )
        return measured

    def verify_context(self) -> int:
        """Read back the context the generation model is actually built with.

        Reads Ollama's native `/api/show` rather than `/v1`, because `/v1` does
        not report the parameter and this is the check that catches a Modelfile
        nobody rebuilt.
        """
        loaded = _model_context(
            self.settings.ollama_base_url, self.settings.generation_model
        )
        if loaded < self.settings.generation_context:
            raise ModelContextError(
                f'{self.settings.generation_model} carries num_ctx {loaded}, '
                f'below the {self.settings.generation_context} this project needs. '
                'Run scripts/ollama-build.sh to rebuild it.'
            )
        return loaded


def _model_context(base_url: str, model: str) -> int:
    """The `num_ctx` parameter a model was built with, or zero if it carries none."""
    parsed = urlparse(base_url)
    root = f'{parsed.scheme}://{parsed.netloc}'
    request = urllib.request.Request(
        f'{root}/api/show',
        data=json.dumps({'model': model}).encode(),
        headers={'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            shown = json.load(response)
    except (urllib.error.URLError, TimeoutError) as error:
        raise ModelContextError(f'could not reach Ollama at {root}: {error}') from error

    for line in str(shown.get('parameters', '')).splitlines():
        name, _, value = line.partition(' ')
        if name == 'num_ctx':
            return int(value.strip())
    return 0
