"""The Official Journal text parses to the structure it is known to hold."""

from annex.corpus.models import Corpus, ProvisionKind


class TestArticles:
    def test_parses_every_article_the_document_renders(self, original: Corpus) -> None:
        articles = original.of_kind(ProvisionKind.ARTICLE)

        assert len(articles) == 113

    def test_article_six_carries_its_eight_paragraphs(self, original: Corpus) -> None:
        labels = [
            provision.number
            for provision in original.of_kind(ProvisionKind.PARAGRAPH)
            if provision.parent_id == 'art_6'
        ]

        assert labels == ['1', '2', '3', '4', '5', '6', '7', '8']

    def test_article_carries_its_title(self, original: Corpus) -> None:
        article = original.get('art_6')

        assert article is not None
        assert article.title == 'Classification rules for high-risk AI systems'


class TestAnnexesAndRecitals:
    def test_parses_thirteen_annexes(self, original: Corpus) -> None:
        assert len(original.of_kind(ProvisionKind.ANNEX)) == 13

    def test_annex_three_holds_the_high_risk_list(self, original: Corpus) -> None:
        annex = original.get('anx_III')

        assert annex is not None
        assert 'High-risk AI systems referred to in Article 6(2)' in annex.text

    def test_parses_all_one_hundred_and_eighty_recitals(self, original: Corpus) -> None:
        assert len(original.of_kind(ProvisionKind.RECITAL)) == 180

    def test_a_recital_resolves_by_id(self, original: Corpus) -> None:
        recital = original.get('rct_12')

        assert recital is not None
        assert 'AI system' in recital.text
