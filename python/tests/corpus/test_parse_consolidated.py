"""The consolidated text parses to 119 articles, not to the 113 its anchors reach."""

from annex.corpus.models import Corpus, ProvisionKind

INSERTED = ('art_4a', 'art_60a', 'art_75a', 'art_75b', 'art_75c', 'art_75d')


class TestInsertedArticles:
    def test_parses_every_article_the_document_renders(
        self, consolidated: Corpus
    ) -> None:
        articles = consolidated.of_kind(ProvisionKind.ARTICLE)

        assert len(articles) == 119

    def test_finds_the_six_articles_that_carry_no_anchor(
        self, consolidated: Corpus
    ) -> None:
        found = [name for name in INSERTED if consolidated.get(name) is not None]

        assert found == list(INSERTED)

    def test_does_not_fold_an_inserted_article_into_its_neighbour(
        self, consolidated: Corpus
    ) -> None:
        article_four = consolidated.get('art_4')

        assert article_four is not None
        assert 'Article 4a' not in article_four.text


class TestAmendedStructure:
    def test_article_six_gained_three_inserted_paragraphs(
        self, consolidated: Corpus
    ) -> None:
        labels = [
            provision.number
            for provision in consolidated.of_kind(ProvisionKind.PARAGRAPH)
            if provision.parent_id == 'art_6'
        ]

        assert labels == ['1', '1a', '1b', '1c', '2', '3', '4', '5', '6', '7', '8']

    def test_article_one_hundred_and_thirteen_is_marked_amended(
        self, consolidated: Corpus
    ) -> None:
        article = consolidated.get('art_113')

        assert article is not None
        assert article.amended is True

    def test_article_one_hundred_and_thirteen_carries_the_deferred_deadlines(
        self, consolidated: Corpus
    ) -> None:
        article = consolidated.get('art_113')

        assert article is not None
        assert '2 December 2027' in article.text
        assert '2 August 2028' in article.text

    def test_parses_the_annex_the_amendment_added(self, consolidated: Corpus) -> None:
        annex = consolidated.get('anx_XIV')

        assert annex is not None
        assert len(consolidated.of_kind(ProvisionKind.ANNEX)) == 14

    def test_carries_no_recitals(self, consolidated: Corpus) -> None:
        assert consolidated.of_kind(ProvisionKind.RECITAL) == ()
