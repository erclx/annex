"""The chunk rule, checked against what it was written from.

The counts are provisions covered rather than chunks produced, and the two
differ by exactly the splitting. 712 and 585 are what
`.canon/plans/feature-retrieval-and-the-agent.md` measured, and splitting
`art_3` in both versions and `art_113` in the original takes the chunk counts
to 716 and 587 without changing what the set covers.

Token counts are not asserted here. The embedder is the only tokenizer Ollama
exposes, so the real check needs the model up, and it lives in
`test_chunk_tokens.py` where it can be skipped rather than faked.
"""

from annex.corpus.models import Corpus
from annex.retrieval.chunks import CHARACTER_BUDGET, chunk, source_provisions

POINT_SPLIT_PROVISIONS = {'art_3', 'art_113'}


class TestCoverage:
    def test_the_original_covers_every_addressable_unit(self, original: Corpus) -> None:
        chunks = chunk(original)

        assert len(source_provisions(chunks)) == 712

    def test_the_consolidated_covers_every_addressable_unit(
        self, consolidated: Corpus
    ) -> None:
        chunks = chunk(consolidated)

        assert len(source_provisions(chunks)) == 585

    def test_an_article_with_paragraphs_is_covered_by_them(
        self, original: Corpus
    ) -> None:
        covered = source_provisions(chunk(original))

        assert 'art_6' not in covered
        assert 'art_6.1' in covered

    def test_an_article_with_no_paragraph_falls_back_to_article_level(
        self, original: Corpus
    ) -> None:
        covered = source_provisions(chunk(original))

        assert 'art_16' in covered

    def test_recitals_are_embedded_for_the_original(self, original: Corpus) -> None:
        covered = source_provisions(chunk(original))

        assert 'rct_1' in covered

    def test_the_consolidated_carries_no_recital_to_embed(
        self, consolidated: Corpus
    ) -> None:
        covered = source_provisions(chunk(consolidated))

        assert not any(item.startswith('rct_') for item in covered)


class TestSplitting:
    def test_the_definitions_article_splits_on_its_points(
        self, original: Corpus
    ) -> None:
        parts = [item for item in chunk(original) if item.provision_id == 'art_3']

        assert len(parts) > 1
        assert [item.chunk_id for item in parts] == [
            f'art_3#{index}' for index in range(len(parts))
        ]

    def test_a_split_part_keeps_the_provision_a_citation_resolves_through(
        self, original: Corpus
    ) -> None:
        parts = [item for item in chunk(original) if item.provision_id == 'art_3']

        assert all(item.provision_id == 'art_3' for item in parts)
        assert all(item.citation == 'Article 3' for item in parts)

    def test_only_the_two_measured_provisions_split_in_the_original(
        self, original: Corpus
    ) -> None:
        split = {item.provision_id for item in chunk(original) if item.is_split}

        assert split == POINT_SPLIT_PROVISIONS

    def test_splitting_loses_none_of_the_text(self, original: Corpus) -> None:
        parts = [item for item in chunk(original) if item.provision_id == 'art_3']

        rejoined = ' '.join(item.text for item in parts)

        assert len(rejoined) >= len(original.by_id['art_3'].text)


class TestBudget:
    def test_a_chunk_over_the_budget_carries_no_points_to_split_on(
        self, original: Corpus
    ) -> None:
        over = [item for item in chunk(original) if len(item.text) > CHARACTER_BUDGET]

        assert all('(1) ' not in item.text for item in over)

    def test_nearly_every_chunk_sits_inside_the_budget(self, original: Corpus) -> None:
        chunks = chunk(original)

        over = [item for item in chunks if len(item.text) > CHARACTER_BUDGET]

        assert len(over) <= 2
