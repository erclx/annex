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

    def test_only_the_inserted_paragraphs_are_marked_amended(
        self, consolidated: Corpus
    ) -> None:
        flags = {
            provision.number: provision.amended
            for provision in consolidated.of_kind(ProvisionKind.PARAGRAPH)
            if provision.parent_id == 'art_6'
        }

        assert [number for number, amended in flags.items() if amended] == [
            '1a',
            '1b',
            '1c',
        ]

    def test_a_base_text_paragraph_is_not_marked_amended(
        self, consolidated: Corpus
    ) -> None:
        paragraph = consolidated.get('art_6.2')

        assert paragraph is not None
        assert paragraph.amended is False

    def test_most_paragraphs_are_base_text(self, consolidated: Corpus) -> None:
        paragraphs = consolidated.of_kind(ProvisionKind.PARAGRAPH)

        amended = [provision for provision in paragraphs if provision.amended]

        assert len(amended) < len(paragraphs) // 2

    def test_carries_no_recitals(self, consolidated: Corpus) -> None:
        assert consolidated.of_kind(ProvisionKind.RECITAL) == ()


class TestNoConsolidationMarkers:
    def test_no_provision_text_carries_a_marker(self, consolidated: Corpus) -> None:
        for provision in consolidated.provisions:
            assert '▼' not in provision.text
            assert '—————' not in provision.text

    def test_no_provision_title_carries_a_marker(self, consolidated: Corpus) -> None:
        for provision in consolidated.provisions:
            assert '▼' not in provision.title

    def test_article_111_3_reads_the_same_across_versions(
        self, consolidated: Corpus, original: Corpus
    ) -> None:
        amended = consolidated.get('art_111.3')
        base = original.get('art_111.3')

        assert amended is not None
        assert base is not None
        assert amended.text == base.text

    def test_amended_flags_are_unchanged_by_stripping_markers(
        self, consolidated: Corpus
    ) -> None:
        article = consolidated.get('art_113')

        assert article is not None
        assert article.amended is True


class TestAnnexTitlesStopAtTheHeading:
    def test_annex_three_title_is_only_the_heading(self, consolidated: Corpus) -> None:
        annex = consolidated.get('anx_III')

        assert annex is not None
        assert annex.title == 'High-risk AI systems referred to in Article 6(2)'

    def test_annex_one_title_is_only_the_heading(self, consolidated: Corpus) -> None:
        annex = consolidated.get('anx_I')

        assert annex is not None
        assert annex.title == 'List of Union harmonisation legislation'

    def test_a_mislabeled_second_heading_line_still_reads_as_the_title(
        self, consolidated: Corpus
    ) -> None:
        """Annex X's descriptive line is tagged `title-annex-1` rather than `-2`."""
        annex = consolidated.get('anx_X')

        assert annex is not None
        assert annex.title == (
            'Union legislative acts on large-scale IT systems in the area of '
            'Freedom, Security and Justice'
        )

    def test_an_annex_with_no_descriptive_heading_keeps_its_first_line(
        self, consolidated: Corpus
    ) -> None:
        """Annex XIV, inserted by the amendment, carries no `title-annex-2` line."""
        annex = consolidated.get('anx_XIV')

        assert annex is not None
        assert annex.title.startswith('The list of codes, categories')
        assert len(annex.title) <= 120


class TestArticleOneTitle:
    def test_article_one_carries_its_title(self, consolidated: Corpus) -> None:
        article = consolidated.get('art_1')

        assert article is not None
        assert article.title == 'Subject matter'
