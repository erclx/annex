"""The invariants the schema enforces are the ones a pipeline gets wrong.

Each of these is a failure mode named in `.canon/plans/feature-retrieval-and-the-agent.md`:
a claim that lost its citations on the way through verification, an answer that
refused and answered at once, and a citation asserting the amendment moved a
provision without saying what moved.
"""

import pytest
from pydantic import ValidationError

from annex.answer import Answer, Citation, Claim, Refusal, RetrievalTrace
from annex.corpus import CorpusVersion, ProvisionKind


def make_citation(**overrides: object) -> Citation:
    fields: dict[str, object] = {
        'provision_id': 'art_50',
        'citation': 'Article 50',
        'kind': ProvisionKind.ARTICLE,
        'version': CorpusVersion.CONSOLIDATED,
        'text': 'Providers shall ensure that AI systems intended to interact '
        'directly with natural persons are designed and developed in such a '
        'way that the natural persons concerned are informed.',
    }
    return Citation(**(fields | overrides))  # type: ignore[arg-type]


def make_claim(**overrides: object) -> Claim:
    fields: dict[str, object] = {
        'statement': 'A chatbot must disclose that it is an AI system.',
        'citations': (make_citation(),),
    }
    return Claim(**(fields | overrides))  # type: ignore[arg-type]


def make_refusal(**overrides: object) -> Refusal:
    fields: dict[str, object] = {
        'reason': 'The text does not define the threshold this turns on.',
        'missing': ('what counts as a substantial modification',),
        'consulted': (make_citation(provision_id='art_6', citation='Article 6'),),
    }
    return Refusal(**(fields | overrides))  # type: ignore[arg-type]


class TestClaim:
    def test_a_claim_with_no_citation_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match='carries no citation'):
            make_claim(citations=())

    def test_a_claim_with_a_citation_is_accepted(self) -> None:
        claim = make_claim()

        assert claim.citations[0].provision_id == 'art_50'


class TestCitation:
    def test_a_changed_citation_states_what_moved(self) -> None:
        citation = make_citation(
            changed=True,
            change_note='The application date moved from 2026-08-02 to 2027-08-02.',
        )

        assert citation.changed
        assert '2027-08-02' in (citation.change_note or '')

    def test_a_changed_citation_without_a_note_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match='no change_note'):
            make_citation(changed=True)

    def test_a_note_without_a_change_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match='without being changed'):
            make_citation(change_note='something moved')


class TestAnswer:
    def test_an_answer_carrying_claims_and_a_refusal_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match='never both'):
            Answer(
                question='Does Article 50 apply to my chatbot?',
                version=CorpusVersion.CONSOLIDATED,
                claims=(make_claim(),),
                refusal=make_refusal(),
            )

    def test_an_answer_carrying_neither_is_rejected(self) -> None:
        with pytest.raises(ValidationError, match='never neither'):
            Answer(
                question='Does Article 50 apply to my chatbot?',
                version=CorpusVersion.CONSOLIDATED,
            )

    def test_an_answer_carrying_claims_is_not_a_refusal(self) -> None:
        answer = Answer(
            question='Does Article 50 apply to my chatbot?',
            version=CorpusVersion.CONSOLIDATED,
            claims=(make_claim(),),
        )

        assert not answer.is_refusal

    def test_a_refusal_round_trips_through_json(self) -> None:
        answer = Answer(
            question='Is my pre-existing system grandfathered?',
            version=CorpusVersion.CONSOLIDATED,
            refusal=make_refusal(),
            retrieval=RetrievalTrace(
                searched_ids=('art_6',),
                traversed_ids=('anx_III',),
                traversal_enabled=True,
                prompt_tokens=1200,
                model='qwen3.8:27b',
            ),
        )

        restored = Answer.model_validate_json(answer.model_dump_json())

        assert restored == answer
        assert restored.is_refusal
        assert restored.refusal is not None
        assert restored.refusal.consulted[0].provision_id == 'art_6'
        assert restored.retrieval.traversal_enabled
