"""A citation written as a reader would write it resolves to a provision."""

import pytest

from annex.corpus.citations import resolve, to_id
from annex.corpus.models import Corpus


class TestToId:
    @pytest.mark.parametrize(
        ('citation', 'expected'),
        [
            ('Article 6', 'art_6'),
            ('Article 6(2)', 'art_6.2'),
            ('Article 6(1a)', 'art_6.1a'),
            ('Article 4a', 'art_4a'),
            ('Annex III', 'anx_III'),
            ('Recital 12', 'rct_12'),
        ],
    )
    def test_a_citation_maps_to_its_provision_id(
        self, citation: str, expected: str
    ) -> None:
        assert to_id(citation) == expected

    def test_text_that_is_not_a_citation_returns_nothing(self) -> None:
        assert to_id('the risk management system') is None


class TestResolve:
    def test_a_paragraph_citation_resolves_in_the_original(
        self, original: Corpus
    ) -> None:
        provision = resolve(original, 'Article 6(2)')

        assert provision is not None
        assert provision.id == 'art_6.2'

    def test_the_same_citation_resolves_in_the_consolidated_text(
        self, consolidated: Corpus
    ) -> None:
        provision = resolve(consolidated, 'Article 6(2)')

        assert provision is not None
        assert provision.id == 'art_6.2'

    def test_an_inserted_article_resolves_only_where_it_exists(
        self, original: Corpus, consolidated: Corpus
    ) -> None:
        assert resolve(original, 'Article 4a') is None
        assert resolve(consolidated, 'Article 4a') is not None

    def test_an_unknown_citation_returns_nothing_rather_than_raising(
        self, original: Corpus
    ) -> None:
        assert resolve(original, 'Article 900') is None
