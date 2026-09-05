"""Cross-references point inside the Act and nowhere else."""

from annex.corpus.models import Corpus, Provision, ProvisionKind, Reference
from annex.corpus.references import extract, references_in
from annex.corpus.sources import CorpusVersion

KNOWN = {'art_5', 'art_6', 'art_43', 'anx_I', 'anx_III'}


def make_provision(text: str, provision_id: str = 'art_99') -> Provision:
    return Provision(
        id=provision_id,
        kind=ProvisionKind.ARTICLE,
        number=provision_id.removeprefix('art_'),
        title='',
        text=text,
        version=CorpusVersion.ORIGINAL,
    )


class TestExternalCitations:
    def test_a_citation_of_another_instrument_yields_no_edge(self) -> None:
        provision = make_provision('as set out in Article 5 of Directive 2009/48/EC')

        found = references_in(provision, KNOWN)

        assert found == []

    def test_a_citation_of_another_regulation_yields_no_edge(self) -> None:
        provision = make_provision('under Article 6 of Regulation (EU) 2023/1230')

        found = references_in(provision, KNOWN)

        assert found == []

    def test_an_internal_reference_beside_an_external_one_survives(self) -> None:
        provision = make_provision(
            'Article 5 of Directive 2009/48/EC applies, as does Annex III'
        )

        targets = [reference.target_id for reference in references_in(provision, KNOWN)]

        assert targets == ['anx_III']


class TestInternalReferences:
    def test_an_article_reference_becomes_an_edge(self) -> None:
        provision = make_provision('the conformity assessment in Article 43')

        found = references_in(provision, KNOWN)

        assert found == [
            Reference(source_id='art_99', target_id='art_43', phrase='Article 43')
        ]

    def test_a_paragraph_reference_yields_the_paragraph_and_its_article(self) -> None:
        provision = make_provision('classified under Article 6(2)')

        targets = {
            reference.target_id
            for reference in references_in(provision, KNOWN | {'art_6.2'})
        }

        assert targets == {'art_6.2', 'art_6'}

    def test_a_self_reference_is_dropped(self) -> None:
        provision = make_provision('as Article 6 provides', provision_id='art_6')

        assert references_in(provision, KNOWN) == []

    def test_a_target_outside_the_corpus_is_dropped(self) -> None:
        provision = make_provision('see Article 900')

        assert references_in(provision, KNOWN) == []

    def test_a_repeated_reference_yields_one_edge(self) -> None:
        provision = make_provision('Article 43 and again Article 43')

        assert len(references_in(provision, KNOWN)) == 1


class TestPluralAndRangeReferences:
    """`Articles 8 to 15` is one phrase naming eight provisions.

    A pattern matching `Article` followed by a space never matches the plural,
    which drops every edge into the obligation articles and makes the high-risk
    chain look absent from the text.
    """

    def test_a_range_expands_to_every_article_it_names(self) -> None:
        provision = make_provision('the requirements set out in Articles 8 to 15')
        known = {f'art_{number}' for number in range(8, 16)}

        targets = {reference.target_id for reference in references_in(provision, known)}

        assert targets == known

    def test_a_pair_yields_both_articles(self) -> None:
        provision = make_provision('as Articles 5 and 6 provide')

        targets = {reference.target_id for reference in references_in(provision, KNOWN)}

        assert targets == {'art_5', 'art_6'}

    def test_a_comma_list_yields_every_article(self) -> None:
        provision = make_provision('under Articles 5, 6 and 43')

        targets = {reference.target_id for reference in references_in(provision, KNOWN)}

        assert targets == {'art_5', 'art_6', 'art_43'}

    def test_a_plural_citation_of_another_instrument_still_yields_no_edge(self) -> None:
        provision = make_provision('Articles 5 and 6 of Directive 2009/48/EC')

        assert references_in(provision, KNOWN) == []

    def test_the_singular_form_still_resolves(self) -> None:
        provision = make_provision('under Article 43')

        targets = {reference.target_id for reference in references_in(provision, KNOWN)}

        assert targets == {'art_43'}


class TestCorpusExtraction:
    def test_article_six_points_at_the_high_risk_annex(self, original: Corpus) -> None:
        edges = {
            (reference.source_id, reference.target_id)
            for reference in extract(original)
        }

        assert ('art_6', 'anx_III') in edges

    def test_paragraphs_are_not_read_as_sources(self, original: Corpus) -> None:
        sources = {reference.source_id for reference in extract(original)}

        assert not any('.' in source for source in sources)
