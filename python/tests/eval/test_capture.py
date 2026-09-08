"""The writer keeps every answer, on both versions, in a shape the web half reads.

The pipeline itself is covered by `tests/agent/`. What is under test here is the
writer around it: that nothing is dropped, that what lands on disk parses back
as an `Answer`, and that the generated index names the files it sits beside.

Most of these run against a scripted asker rather than the stubbed pipeline,
because twenty-four pipeline calls would test routing and synthesis a third
time to assert a file was written. One test does drive the stubbed pipeline, to
show the real `Pipeline.ask` satisfies the protocol the rest of them stub.
"""

import json
from pathlib import Path

import pytest

from annex.answer import Answer, Citation, Claim, Refusal
from annex.corpus import CorpusVersion, ProvisionKind
from annex.eval.capture import (
    INDEX_NAME,
    MANIFEST_NAME,
    Manifest,
    capture,
    fixture_filename,
)
from annex.eval.questions import QUESTIONS, by_id
from tests.eval.conftest import GROUNDED, BuildPipeline

CHATBOT = by_id('q01-support-chatbot')


def an_answer(question: str, version: CorpusVersion) -> Answer:
    return Answer(
        question=question,
        version=version,
        claims=(
            Claim(
                statement='The system has to say it is an AI system.',
                citations=(
                    Citation(
                        provision_id='art_50.1',
                        citation='Article 50(1)',
                        kind=ProvisionKind.PARAGRAPH,
                        version=version,
                        text='Providers shall ensure that AI systems are designed.',
                    ),
                ),
            ),
        ),
    )


def a_refusal(question: str, version: CorpusVersion) -> Answer:
    return Answer(
        question=question,
        version=version,
        refusal=Refusal(
            reason='The text does not define the threshold.',
            missing=('what counts as a substantial modification',),
        ),
    )


def scripted(question: str, version: CorpusVersion) -> Answer:
    """Refuse the questions the gold set expects a refusal on, answer the rest."""
    expects_refusal = any(
        item.description == question and item.expects_refusal for item in QUESTIONS
    )
    return (a_refusal if expects_refusal else an_answer)(question, version)


@pytest.fixture
def written(tmp_path: Path) -> Manifest:
    return capture(scripted, out=tmp_path)


class TestNothingIsDropped:
    def test_every_question_is_captured_on_every_version(
        self, written: Manifest
    ) -> None:
        assert len(written.entries) == len(QUESTIONS) * len(CorpusVersion)

    def test_each_version_carries_the_whole_question_set(
        self, written: Manifest
    ) -> None:
        for version in CorpusVersion:
            captured = {
                entry.question_id
                for entry in written.entries
                if entry.version == version
            }
            assert captured == {question.id for question in QUESTIONS}

    def test_a_narrowed_run_writes_only_what_it_was_asked_for(
        self, tmp_path: Path
    ) -> None:
        manifest = capture(
            scripted,
            questions=[CHATBOT],
            versions=[CorpusVersion.CONSOLIDATED],
            out=tmp_path,
        )

        assert [entry.question_id for entry in manifest.entries] == [CHATBOT.id]


class TestWhatLandsOnDiskIsAnAnswer:
    def test_every_fixture_parses_back_as_an_answer(
        self, written: Manifest, tmp_path: Path
    ) -> None:
        for entry in written.entries:
            Answer.model_validate_json((tmp_path / entry.file).read_text())

    def test_the_fixture_carries_the_description_it_was_asked(
        self, written: Manifest, tmp_path: Path
    ) -> None:
        entry = next(item for item in written.entries if item.question_id == CHATBOT.id)

        answer = Answer.model_validate_json((tmp_path / entry.file).read_text())

        assert answer.question == CHATBOT.description

    def test_a_refusal_is_recorded_as_one(self, written: Manifest) -> None:
        """The manifest says which entries refused, so a reader need not open them."""
        refused = {entry.question_id for entry in written.entries if entry.refused}

        assert refused == {
            question.id for question in QUESTIONS if question.expects_refusal
        }


class TestTheManifestStampsTheRun:
    def test_the_manifest_is_written_beside_the_fixtures(
        self, written: Manifest, tmp_path: Path
    ) -> None:
        stored = json.loads((tmp_path / MANIFEST_NAME).read_text())

        assert stored['entries'][0]['question_id'] == written.entries[0].question_id

    def test_the_manifest_carries_a_capture_date(self, written: Manifest) -> None:
        assert written.captured_at

    def test_the_manifest_carries_the_tree_it_ran_against(
        self, written: Manifest
    ) -> None:
        """A fixture that still parses and no longer matches has only this stamp."""
        assert written.commit


class TestTheGeneratedIndexNamesEveryFixture:
    def test_the_index_imports_each_file_it_sits_beside(
        self, written: Manifest, tmp_path: Path
    ) -> None:
        index = (tmp_path / INDEX_NAME).read_text()

        for entry in written.entries:
            assert f"from './{entry.file}'" in index

    def test_the_index_keys_a_fixture_by_question_and_version(
        self, written: Manifest, tmp_path: Path
    ) -> None:
        index = (tmp_path / INDEX_NAME).read_text()

        assert f"'{CHATBOT.id}.{CorpusVersion.CONSOLIDATED}':" in index

    def test_the_index_imports_the_manifest(
        self, tmp_path: Path, written: Manifest
    ) -> None:
        index = (tmp_path / INDEX_NAME).read_text()

        assert f"from './{MANIFEST_NAME}'" in index


class TestOneFailedQuestionDoesNotEndTheRun:
    """Twenty-four calls at twenty-odd seconds is too long to lose to the last."""

    def refusing_asker(self, fails: str) -> object:
        def ask(question: str, version: CorpusVersion) -> Answer:
            if question == fails:
                raise OSError('no index')
            return an_answer(question, version)

        return ask

    def test_the_questions_around_a_failure_are_still_captured(
        self, tmp_path: Path
    ) -> None:
        manifest = capture(
            self.refusing_asker(CHATBOT.description),  # type: ignore[arg-type]
            versions=[CorpusVersion.CONSOLIDATED],
            out=tmp_path,
        )

        assert len(manifest.entries) == len(QUESTIONS) - 1

    def test_the_failed_pair_is_absent_rather_than_empty(self, tmp_path: Path) -> None:
        """A fixture nobody can replay would be worse than a question nobody holds."""
        capture(
            self.refusing_asker(CHATBOT.description),  # type: ignore[arg-type]
            versions=[CorpusVersion.CONSOLIDATED],
            out=tmp_path,
        )

        missing = fixture_filename(CHATBOT.id, CorpusVersion.CONSOLIDATED)

        assert not (tmp_path / missing).exists()

    def test_an_unexpected_failure_still_ends_the_run(self, tmp_path: Path) -> None:
        """A bug that makes every answer wrong should stop rather than record."""

        def ask(question: str, version: CorpusVersion) -> Answer:
            raise RuntimeError('a programmer error')

        with pytest.raises(RuntimeError):
            capture(ask, versions=[CorpusVersion.CONSOLIDATED], out=tmp_path)


class TestTheFileNameLocatesOnePair:
    def test_two_versions_of_one_question_are_two_files(self) -> None:
        original = fixture_filename(CHATBOT.id, CorpusVersion.ORIGINAL)
        consolidated = fixture_filename(CHATBOT.id, CorpusVersion.CONSOLIDATED)

        assert original != consolidated


class TestThePipelineSatisfiesTheProtocol:
    """The stub above is only honest if the real call has the same shape."""

    def test_a_pipeline_ask_can_be_captured(
        self, build_pipeline: BuildPipeline, tmp_path: Path
    ) -> None:
        pipeline, _ = build_pipeline(['transparency obligations', GROUNDED])

        manifest = capture(
            lambda description, version: pipeline.ask(description, version=version),
            questions=[CHATBOT],
            versions=[CorpusVersion.CONSOLIDATED],
            out=tmp_path,
        )

        assert (tmp_path / manifest.entries[0].file).exists()
