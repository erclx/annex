"""The baseline sends the document whole, question last, and refuses a cut prompt."""

import pytest

from annex.corpus import CorpusVersion, ProvisionKind
from annex.corpus.models import Corpus
from annex.eval.arms.full_context import (
    LONG_CONTEXT_MODEL,
    LONG_CONTEXT_WINDOW,
    ContextOverflowError,
    FullContextArm,
    long_context_settings,
    stuffed,
)
from annex.eval.questions import by_id
from annex.settings import Settings
from tests.agent.conftest import ScriptedClient

CHATBOT = by_id('q01-support-chatbot')
TRANSPARENCY = (
    'Providers ensure natural persons are informed that they are interacting '
    'with an AI system'
)


def grounded_reply(corpus: Corpus, provision_id: str = 'art_50') -> str:
    """The statement, citing the provision that actually carries it.

    The marker is a position in the stuffed corpus rather than a fixed `[1]`,
    which is Article 1 and grounds nothing about transparency. A reply citing
    the wrong provision is dropped by verification and the arm refuses, which
    is the pipeline working and the test lying.
    """
    position = [item.id for item in stuffed(corpus)].index(provision_id) + 1
    return f'{TRANSPARENCY} [{position}]'


PLAUSIBLE_PROMPT_TOKENS = 120_000
"""What the model would report for a prompt this size, near the measured count.

The scripted client reports whatever it is told, and the arm refuses a count
the assembled characters cannot come in under, so a stub left at its default
would fail every test here on the guard rather than on what is under test.
"""


def build_arm(
    corpora: dict[CorpusVersion, Corpus],
    replies: list[str] | None = None,
    *,
    prompt_tokens: int = PLAUSIBLE_PROMPT_TOKENS,
) -> tuple[FullContextArm, ScriptedClient]:
    consolidated = corpora[CorpusVersion.CONSOLIDATED]
    client = ScriptedClient(
        replies if replies is not None else [grounded_reply(consolidated)]
    )
    client.prompt_tokens = prompt_tokens
    return FullContextArm(corpora, client=client), client  # type: ignore[arg-type]


class TestWhatTheArmAssembles:
    def test_every_article_annex_and_recital_of_the_version_is_stuffed(
        self, original: Corpus
    ) -> None:
        assembled = stuffed(original)

        assert len(assembled) == (
            len(original.of_kind(ProvisionKind.ARTICLE))
            + len(original.of_kind(ProvisionKind.ANNEX))
            + len(original.of_kind(ProvisionKind.RECITAL))
        )

    def test_paragraphs_are_not_stuffed_beside_the_articles_holding_them(
        self, original: Corpus
    ) -> None:
        """An article's parsed text already carries them, so both is the Act twice."""
        kinds = {item.kind for item in stuffed(original)}

        assert ProvisionKind.PARAGRAPH not in kinds

    def test_the_two_versions_are_not_one_baseline(
        self, original: Corpus, consolidated: Corpus
    ) -> None:
        """The consolidated text carries no recitals, so it is a third smaller."""
        assert len(stuffed(original)) > len(stuffed(consolidated))

    def test_the_prompt_carries_every_provision_of_its_version(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        arm, client = build_arm(corpora)

        arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED)

        sent = client.prompts[0]
        assert all(
            item.citation in sent
            for item in stuffed(corpora[CorpusVersion.CONSOLIDATED])
        )

    def test_the_corpus_precedes_the_question(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        """The prefix has to be identical across questions for the cache to hold."""
        arm, client = build_arm(corpora)

        arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED)

        sent = client.prompts[0]
        assert sent.index('[1]') < sent.index(CHATBOT.description)

    def test_the_assembled_corpus_is_reused_across_questions(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        reply = grounded_reply(corpora[CorpusVersion.CONSOLIDATED])
        arm, client = build_arm(corpora, [reply, reply])
        other = by_id('q02-synthetic-voice-agent')

        arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED)
        arm.answer(other, CorpusVersion.CONSOLIDATED)

        first, second = client.prompts
        prefix = first.index(CHATBOT.description)
        assert first[:prefix] == second[: second.index(other.description)]


class TestTheModelItReadsWith:
    def test_the_arm_points_at_the_model_built_for_the_whole_document(self) -> None:
        settings = long_context_settings()

        assert settings.generation_model == LONG_CONTEXT_MODEL
        assert settings.generation_context == LONG_CONTEXT_WINDOW

    def test_the_agent_model_is_left_at_its_own_window(self) -> None:
        """Widening it would hold 30 GB of the card for every agent call."""
        assert Settings().generation_context < LONG_CONTEXT_WINDOW


class TestACutPromptFailsRatherThanAnswering:
    def test_a_token_count_below_what_the_characters_allow_is_refused(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        """Ollama truncates to about half the window, so proximity misses it."""
        arm, _ = build_arm(corpora, prompt_tokens=4099)

        with pytest.raises(ContextOverflowError, match='truncated'):
            arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED)

    def test_the_refusal_names_the_rebuild_that_fixes_it(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        arm, _ = build_arm(corpora, prompt_tokens=4099)

        with pytest.raises(ContextOverflowError, match='ollama-build.sh'):
            arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED)

    def test_a_count_the_characters_allow_is_accepted(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        arm, _ = build_arm(corpora)

        assert arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED).answer.claims


class TestTheTraceTheArmFills:
    def test_searched_ids_names_every_provision_it_was_handed(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        """Filled honestly rather than left empty, so precision has a denominator."""
        arm, _ = build_arm(corpora)

        answer = arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED).answer

        assert len(answer.retrieval.searched_ids) == len(
            stuffed(corpora[CorpusVersion.CONSOLIDATED])
        )

    def test_the_arm_reports_no_query_because_it_searched_for_nothing(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        """The absence is the arm's argument, not a value left unfilled."""
        arm, _ = build_arm(corpora)

        routed = arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED)

        assert routed.query == ''

    def test_the_arm_reports_that_it_traversed_nothing(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        arm, _ = build_arm(corpora)

        trace = arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED).answer.retrieval

        assert not trace.traversal_enabled
        assert trace.traversed_ids == ()

    def test_the_arm_drops_nothing_because_it_budgets_nothing(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        arm, _ = build_arm(corpora)

        trace = arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED).answer.retrieval

        assert trace.dropped_ids == ()

    def test_a_cut_generation_reaches_the_answer(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        """Stopping for want of room is a result to report, not one to average."""
        arm, client = build_arm(corpora)
        client.finish_reason = 'length'

        assert arm.answer(
            CHATBOT, CorpusVersion.CONSOLIDATED
        ).answer.retrieval.truncated

    def test_a_declared_refusal_comes_back_as_one(
        self, corpora: dict[CorpusVersion, Corpus]
    ) -> None:
        arm, _ = build_arm(corpora, ['REFUSE\nwhat a substantial modification is'])

        answer = arm.answer(CHATBOT, CorpusVersion.CONSOLIDATED).answer

        assert answer.is_refusal
