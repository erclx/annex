"""A parse that disagrees with its source's known structure fails."""

import pytest

from annex.corpus.checks import CorpusCheckError, disagreements, verify
from annex.corpus.models import Corpus, Provision, ProvisionKind
from annex.corpus.sources import CorpusVersion


def make_corpus(version: CorpusVersion, articles: int) -> Corpus:
    return Corpus(
        version=version,
        provisions=tuple(
            Provision(
                id=f'art_{number}',
                kind=ProvisionKind.ARTICLE,
                number=str(number),
                title='',
                text='',
                version=version,
            )
            for number in range(1, articles + 1)
        ),
    )


class TestDisagreements:
    def test_a_complete_parse_reports_nothing(
        self, original: Corpus, consolidated: Corpus
    ) -> None:
        assert disagreements(original) == []
        assert disagreements(consolidated) == []

    def test_a_short_parse_is_reported(self) -> None:
        corpus = make_corpus(CorpusVersion.ORIGINAL, articles=112)

        found = disagreements(corpus)

        assert any('expected 113 articles, parsed 112' in line for line in found)

    def test_the_anchor_count_fails_against_the_consolidated_text(self) -> None:
        corpus = make_corpus(CorpusVersion.CONSOLIDATED, articles=113)

        found = disagreements(corpus)

        assert any('expected 119 articles, parsed 113' in line for line in found)


class TestVerify:
    def test_a_disagreeing_parse_raises(self) -> None:
        corpus = make_corpus(CorpusVersion.CONSOLIDATED, articles=113)

        with pytest.raises(CorpusCheckError, match='expected 119 articles'):
            verify(corpus)

    def test_a_complete_parse_does_not_raise(self, original: Corpus) -> None:
        verify(original)
