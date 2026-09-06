"""The baseline: the whole Act in the window, and no retrieval at all.

This is the arm the project exists to lose to or beat. The Act fits inside a
current context window, so a model can read the document and answer from it,
and a retrieval pipeline shipped without this comparison is one nobody can
defend. It is therefore built as a first-class arm rather than a straw man: the
same corpus, the same questions, the same synthesis prompt, the same parser and
the same grounding check as the two retrieval arms. Everything that differs is
what was handed to the model.

It imports `annex.agent` for the prompt, the draft parser and the verifier
rather than restating any of the three. A baseline with its own prompt or its
own parser measures the harness, since a scoring gap between the arms would
then be a gap between two pieces of scaffolding rather than between two ways of
finding text.

## Why the arm builds its own model

The `/v1` route accepts a per-request `num_ctx` and discards it, measured by
v0.5 on Ollama 0.33.1 against two models, so a caller cannot widen the window
from the call. `ollama/annex-longctx.Modelfile` carries the setting instead and
`scripts/ollama-build.sh` builds it. `annex-qwen3-27b` stays at 32 768 because
it answers from a retrieval result, and widening it would hold 30 GB of the
card for every agent call.

`verify_context` is the guard, and it matters more here than anywhere. This
machine's Ollama server runs with `OLLAMA_CONTEXT_LENGTH=131072`, so the arm
appears to work with no Modelfile at all here and truncates silently anywhere
that variable is unset.

## Why a cut prompt is detected by a floor rather than by proximity

An over-length prompt does not truncate to the window. It truncates to roughly
half of it, measured by v0.5 at 8192 giving 4099 and at 2048 giving 1027, so a
cut prompt comes back well short of the window and reading proximity to the
window would miss it entirely. What it cannot come back short of is the text it
was built from, so the arm computes a floor from the assembled character count
and refuses a count below it.
"""

import logging
import time

from annex.agent import prompts
from annex.agent.pipeline import SYNTHESIS_BUDGET, parse_draft
from annex.agent.verify import verify
from annex.answer import Answer, Citation, RetrievalTrace
from annex.corpus import Corpus, CorpusVersion, Provision, ProvisionKind
from annex.eval.questions import Question
from annex.llm import OllamaClient
from annex.settings import Settings

logger = logging.getLogger('annex.eval.arms.full_context')

LONG_CONTEXT_MODEL = 'annex-longctx'
"""The model `ollama/annex-longctx.Modelfile` builds, at the window below."""

LONG_CONTEXT_WINDOW = 131072
"""What the card holds GPU-resident, and what the original text needs.

117 676 prompt tokens of assembled provisions plus a 4 096 answer leaves 12 256
spare. `num_ctx` 262 144 needs roughly 40 GB against a 32.6 GB card, so this is
a ceiling rather than a preference.
"""

STUFFED_KINDS = (ProvisionKind.ARTICLE, ProvisionKind.ANNEX, ProvisionKind.RECITAL)
"""What the arm sends, which is the document rather than every addressable id.

A paragraph is not stuffed separately because its article's parsed text already
contains it, so stuffing both would send the Act twice. This is what makes the
arm 306 provisions on the original and 133 on the consolidated, against the 806
and 685 the corpus addresses.
"""

LOOSEST_CHARACTERS_A_TOKEN = 6.5
"""The floor a prompt's reported token count is checked against.

Read off this arm's own model rather than off the embedder, whose ratios the
chunk rule uses and whose tokenizer is a different one. Measured on 2026-09-06
through `annex-longctx`: the original assembles to 586 231 characters and comes
back as 118 063 prompt tokens, and the consolidated to 386 655 and 78 406,
which is 4.97 and 4.93 characters a token.

6.5 is a bound rather than an estimate, roughly a third above both, because
being wrong the other way fails a run that was fine. Below `characters / 6.5`
the reported count is not a reading of the text that was sent.
"""


class ContextOverflowError(RuntimeError):
    """The model read less than it was sent, so the answer covers a fragment."""


def long_context_settings(base: Settings | None = None) -> Settings:
    """The shared settings, pointed at the model built for the whole document."""
    return (base or Settings()).model_copy(
        update={
            'generation_model': LONG_CONTEXT_MODEL,
            'generation_context': LONG_CONTEXT_WINDOW,
        }
    )


def stuffed(corpus: Corpus) -> tuple[Provision, ...]:
    """Every article, annex and recital, in the order the document carries them.

    Document order rather than any ranking, because the arm's whole cost
    argument rests on the prefix being identical across questions. Ollama holds
    the KV cache of a repeated prefix, so a stable order is what makes question
    two cheaper than question one.
    """
    return tuple(item for item in corpus.provisions if item.kind in STUFFED_KINDS)


def as_citations(provisions: tuple[Provision, ...]) -> tuple[Citation, ...]:
    """The stuffed provisions as citations, unannotated.

    No amendment note is computed. The arm reads one version and the comparison
    between versions is made by running both and reading the two answers, so
    annotating 306 provisions would cost a second corpus walk to say something
    the pair of results already says.
    """
    return tuple(
        Citation(
            provision_id=item.id,
            citation=item.citation,
            kind=item.kind,
            version=item.version,
            text=item.text,
        )
        for item in provisions
    )


class FullContextArm:
    """One version of the Act per prompt, and the question after it."""

    name = 'full-context'

    def __init__(
        self,
        corpora: dict[CorpusVersion, Corpus],
        *,
        client: OllamaClient | None = None,
        settings: Settings | None = None,
    ) -> None:
        """Build the arm, and refuse a model not carrying the long window.

        The check runs only when this constructs its own client, matching
        `Pipeline`: a caller passing one has supplied a stub or a client it has
        already verified, and reaching the network from a constructor is how a
        suite starts needing a model to run.
        """
        self.settings = long_context_settings(settings)
        self.client = client or OllamaClient(self.settings)
        if client is None:
            self.client.verify_context()
        self.corpora = corpora
        self._blocks: dict[CorpusVersion, tuple[str, tuple[Citation, ...]]] = {}

    def _block(self, version: CorpusVersion) -> tuple[str, tuple[Citation, ...]]:
        """The numbered corpus for one version, assembled once and reused."""
        if version not in self._blocks:
            citations = as_citations(stuffed(self.corpora[version]))
            numbered = '\n\n'.join(
                f'[{index}] {citation.citation}\n{citation.text}'
                for index, citation in enumerate(citations, start=1)
            )
            logger.info(
                'assembled %s: %d provisions, %d characters',
                version,
                len(citations),
                len(numbered),
            )
            self._blocks[version] = (numbered, citations)
        return self._blocks[version]

    def _refuse_a_cut_prompt(self, numbered: str, prompt_tokens: int) -> None:
        """Fail on the count the server reported, never on the setting we sent."""
        floor = int(len(numbered) / LOOSEST_CHARACTERS_A_TOKEN)
        if prompt_tokens >= floor:
            return
        raise ContextOverflowError(
            f'{self.settings.generation_model} read {prompt_tokens} tokens of a '
            f'{len(numbered)}-character prompt, below the {floor} that many '
            'characters cannot come in under. The prompt was truncated, so the '
            f'answer covers a fragment. Check the model carries num_ctx '
            f'{self.settings.generation_context}: run scripts/ollama-build.sh.'
        )

    def answer(self, question: Question, version: CorpusVersion) -> Answer:
        """Send one version whole, with the question last."""
        numbered, citations = self._block(version)
        started = time.monotonic()
        completion = self.client.complete(
            prompts.SYNTHESIZE.format(
                provisions=numbered, question=question.description
            ),
            max_tokens=SYNTHESIS_BUDGET,
        )
        self._refuse_a_cut_prompt(numbered, completion.prompt_tokens)
        claims, refusal = parse_draft(completion.text, citations)
        trace = RetrievalTrace(
            searched_ids=tuple(item.provision_id for item in citations),
            traversed_ids=(),
            dropped_ids=(),
            traversal_enabled=False,
            truncated=completion.is_truncated,
            prompt_tokens=completion.prompt_tokens,
            completion_tokens=completion.completion_tokens,
            duration_ms=int((time.monotonic() - started) * 1000),
            model=completion.model,
        )
        return verify(
            Answer(
                question=question.description,
                version=version,
                claims=claims,
                refusal=refusal,
                retrieval=trace,
            )
        )
