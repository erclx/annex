"""The gold set names real provisions, real flows, and says which questions refuse."""

import json
from pathlib import Path

import pytest

from annex.corpus import CorpusVersion
from annex.corpus.models import Corpus
from annex.eval.questions import QUESTIONS, Flow, Question, by_id, write_questions

CORPUS_ANSWERING_FLOWS = 4
QUESTIONS_A_FLOW = 3


class TestTheSetIsWellFormed:
    def test_the_set_covers_every_corpus_answering_flow(self) -> None:
        assert {question.flow for question in QUESTIONS} == set(Flow)

    def test_each_flow_carries_the_same_number_of_questions(self) -> None:
        counts = {
            flow: sum(1 for question in QUESTIONS if question.flow is flow)
            for flow in Flow
        }

        assert set(counts.values()) == {QUESTIONS_A_FLOW}

    def test_the_denominator_is_the_one_the_report_states(self) -> None:
        """Twelve, because one wrong answer already moves a rate eight points."""
        assert len(QUESTIONS) == CORPUS_ANSWERING_FLOWS * QUESTIONS_A_FLOW

    def test_every_question_has_its_own_id(self) -> None:
        ids = [question.id for question in QUESTIONS]

        assert len(ids) == len(set(ids))

    def test_a_question_is_reachable_by_id(self) -> None:
        assert by_id('q04-cv-screening').flow is Flow.HIGH_RISK_CHAIN

    def test_an_unknown_id_names_what_the_set_does_hold(self) -> None:
        with pytest.raises(KeyError, match='q04-cv-screening'):
            by_id('q99-does-not-exist')


class TestTheGoldProvisionsResolve:
    def test_every_gold_id_of_the_original_names_a_provision(
        self, original: Corpus
    ) -> None:
        unresolved = [
            provision_id
            for question in QUESTIONS
            for provision_id in question.gold_for(CorpusVersion.ORIGINAL)
            if original.get(provision_id) is None
        ]

        assert unresolved == []

    def test_every_gold_id_of_the_consolidated_names_a_provision(
        self, consolidated: Corpus
    ) -> None:
        unresolved = [
            provision_id
            for question in QUESTIONS
            for provision_id in question.gold_for(CorpusVersion.CONSOLIDATED)
            if consolidated.get(provision_id) is None
        ]

        assert unresolved == []

    def test_a_question_naming_no_gold_for_a_version_is_rejected(self) -> None:
        """Scoring one version against an empty set reports perfect precision."""
        with pytest.raises(ValueError, match='names no gold provision'):
            Question(
                id='q00-half-scored',
                description='a system described in one version only',
                flow=Flow.TRANSPARENCY,
                gold={CorpusVersion.CONSOLIDATED: ('art_50',)},
            )


class TestRefusalIsDeclared:
    def test_the_substantial_modification_flow_expects_a_refusal(self) -> None:
        refusing = {question.flow for question in QUESTIONS if question.expects_refusal}

        assert refusing == {Flow.SUBSTANTIAL_MODIFICATION}

    def test_every_other_flow_expects_an_answer(self) -> None:
        answering = [
            question
            for question in QUESTIONS
            if question.flow is not Flow.SUBSTANTIAL_MODIFICATION
        ]

        assert not any(question.expects_refusal for question in answering)


class TestTheSetIsEmittedFromTheModels:
    def test_the_written_file_carries_every_question(self, tmp_path: Path) -> None:
        path = write_questions(tmp_path / 'questions.json')

        assert len(json.loads(path.read_text())) == len(QUESTIONS)

    def test_the_written_file_carries_the_gold_ids_per_version(
        self, tmp_path: Path
    ) -> None:
        path = write_questions(tmp_path / 'questions.json')

        written = {item['id']: item for item in json.loads(path.read_text())}

        assert written['q04-cv-screening']['gold']['consolidated'] == list(
            by_id('q04-cv-screening').gold_for(CorpusVersion.CONSOLIDATED)
        )
