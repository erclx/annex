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


class TestAnnexTitlesStopAtTheHeading:
    def test_annex_three_title_is_only_the_heading(self, original: Corpus) -> None:
        annex = original.get('anx_III')

        assert annex is not None
        assert annex.title == 'High-risk AI systems referred to in Article 6(2)'

    def test_annex_one_title_is_only_the_heading(self, original: Corpus) -> None:
        annex = original.get('anx_I')

        assert annex is not None
        assert annex.title == 'List of Union harmonisation legislation'


class TestArticleOneTitle:
    def test_article_one_carries_no_stray_quote_mark(self, original: Corpus) -> None:
        article = original.get('art_1')

        assert article is not None
        assert article.title == 'Subject matter'


class TestArticle113EndsBeforeTheSignatureBlock:
    def test_article_113_carries_its_dates(self, original: Corpus) -> None:
        article = original.get('art_113')

        assert article is not None
        assert '2 August 2026' in article.text

    def test_article_113_loses_the_signature_block(self, original: Corpus) -> None:
        article = original.get('art_113')

        assert article is not None
        assert 'Done at Brussels' not in article.text

    def test_article_113_loses_the_footnotes(self, original: Corpus) -> None:
        article = original.get('art_113')

        assert article is not None
        assert 'OJ C 517' not in article.text


class TestProvisionsStopBeforeADivisionHeading:
    def test_article_fifty_loses_the_chapter_heading_after_it(
        self, original: Corpus
    ) -> None:
        article = original.get('art_50')

        assert article is not None
        assert 'CHAPTER' not in article.text

    def test_article_fifty_paragraph_seven_loses_the_chapter_heading(
        self, original: Corpus
    ) -> None:
        paragraph = original.get('art_50.7')

        assert paragraph is not None
        assert 'CHAPTER' not in paragraph.text
        assert 'SECTION' not in paragraph.text

    def test_article_seven_loses_the_section_heading_after_it(
        self, original: Corpus
    ) -> None:
        article = original.get('art_7')

        assert article is not None
        assert 'SECTION' not in article.text

    def test_article_seven_paragraph_three_loses_the_section_heading(
        self, original: Corpus
    ) -> None:
        paragraph = original.get('art_7.3')

        assert paragraph is not None
        assert 'SECTION' not in paragraph.text


class TestChaptersAreAddressable:
    def test_parses_thirteen_chapters(self, original: Corpus) -> None:
        assert len(original.of_kind(ProvisionKind.CHAPTER)) == 13

    def test_a_chapter_carries_the_heading_it_cost_the_article_before_it(
        self, original: Corpus
    ) -> None:
        chapter = original.get('chp_II')

        assert chapter is not None
        assert chapter.text == 'CHAPTER II PROHIBITED AI PRACTICES'
        assert chapter.citation == 'Chapter II'

    def test_article_five_sits_under_chapter_two(self, original: Corpus) -> None:
        article = original.get('art_5')

        assert article is not None
        assert article.chapter_id == 'chp_II'

    def test_a_paragraph_carries_its_article_own_chapter(
        self, original: Corpus
    ) -> None:
        paragraph = original.get('art_5.1')

        assert paragraph is not None
        assert paragraph.chapter_id == 'chp_II'

    def test_article_one_hundred_and_thirteen_sits_under_the_final_chapter(
        self, original: Corpus
    ) -> None:
        article = original.get('art_113')

        assert article is not None
        assert article.chapter_id == 'chp_XIII'

    def test_a_chapter_sits_immediately_before_the_article_it_precedes(
        self, original: Corpus
    ) -> None:
        non_paragraph = [
            provision.id
            for provision in original.provisions
            if provision.kind is not ProvisionKind.PARAGRAPH
        ]

        assert non_paragraph.index('chp_I') == non_paragraph.index('art_1') - 1
        assert non_paragraph.index('chp_II') == non_paragraph.index('art_5') - 1

    def test_chapters_are_not_all_bunched_before_the_first_article(
        self, original: Corpus
    ) -> None:
        non_paragraph = [
            provision.id
            for provision in original.provisions
            if provision.kind is not ProvisionKind.PARAGRAPH
        ]

        assert non_paragraph.index('art_1') < non_paragraph.index('chp_II')
