"""A round trip through `vec0`, against stub vectors and no network.

The point is the index behaving as an index: what goes in comes back, nearest
first, carrying the provision id a citation resolves through. The embedding
model has no bearing on that, so the vectors here are hand-written.
"""

from pathlib import Path

import pytest

from annex.corpus import CorpusVersion, ProvisionKind
from annex.retrieval.chunks import Chunk
from annex.retrieval.store import DIMENSIONS, nearest, write


def make_chunk(chunk_id: str, provision_id: str | None = None) -> Chunk:
    return Chunk(
        chunk_id=chunk_id,
        provision_id=provision_id or chunk_id,
        citation=f'Article {chunk_id.removeprefix("art_")}',
        kind=ProvisionKind.ARTICLE,
        text=f'The text of {chunk_id}.',
    )


def unit_vector(position: int) -> list[float]:
    vector = [0.0] * DIMENSIONS
    vector[position] = 1.0
    return vector


@pytest.fixture
def index(tmp_path: Path) -> Path:
    path = tmp_path / 'annex.db'
    write(
        CorpusVersion.ORIGINAL,
        [
            (make_chunk('art_6'), unit_vector(0)),
            (make_chunk('art_50'), unit_vector(1)),
            (make_chunk('art_3#0', 'art_3'), unit_vector(2)),
        ],
        path=path,
    )
    return path


class TestRoundTrip:
    def test_the_nearest_vector_comes_back_first(self, index: Path) -> None:
        hits = nearest(CorpusVersion.ORIGINAL, unit_vector(1), k=3, path=index)

        assert hits[0].chunk_id == 'art_50'

    def test_a_hit_carries_the_text_it_was_written_with(self, index: Path) -> None:
        hits = nearest(CorpusVersion.ORIGINAL, unit_vector(0), k=1, path=index)

        assert hits[0].text == 'The text of art_6.'

    def test_a_split_chunk_carries_the_provision_a_citation_resolves_through(
        self, index: Path
    ) -> None:
        hits = nearest(CorpusVersion.ORIGINAL, unit_vector(2), k=1, path=index)

        assert hits[0].chunk_id == 'art_3#0'
        assert hits[0].provision_id == 'art_3'

    def test_k_bounds_what_comes_back(self, index: Path) -> None:
        hits = nearest(CorpusVersion.ORIGINAL, unit_vector(0), k=2, path=index)

        assert len(hits) == 2

    def test_hits_are_ordered_by_distance(self, index: Path) -> None:
        hits = nearest(CorpusVersion.ORIGINAL, unit_vector(0), k=3, path=index)

        assert [hit.distance for hit in hits] == sorted(hit.distance for hit in hits)


class TestVersions:
    def test_each_version_holds_its_own_table(self, index: Path) -> None:
        write(
            CorpusVersion.CONSOLIDATED,
            [(make_chunk('art_50'), unit_vector(5))],
            path=index,
        )

        original = nearest(CorpusVersion.ORIGINAL, unit_vector(0), k=5, path=index)
        consolidated = nearest(
            CorpusVersion.CONSOLIDATED, unit_vector(5), k=5, path=index
        )

        assert len(original) == 3
        assert len(consolidated) == 1

    def test_a_rewrite_replaces_rather_than_appends(self, index: Path) -> None:
        write(
            CorpusVersion.ORIGINAL, [(make_chunk('art_6'), unit_vector(0))], path=index
        )

        hits = nearest(CorpusVersion.ORIGINAL, unit_vector(0), k=10, path=index)

        assert len(hits) == 1


class TestMissingIndex:
    def test_searching_without_an_index_says_how_to_build_one(
        self, tmp_path: Path
    ) -> None:
        with pytest.raises(FileNotFoundError, match='annex embed'):
            nearest(
                CorpusVersion.ORIGINAL,
                unit_vector(0),
                k=1,
                path=tmp_path / 'absent.db',
            )

    def test_searching_a_version_the_index_never_held_names_it(
        self, index: Path
    ) -> None:
        with pytest.raises(FileNotFoundError, match='no consolidated table'):
            nearest(CorpusVersion.CONSOLIDATED, unit_vector(0), k=1, path=index)
