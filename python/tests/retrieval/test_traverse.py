"""Traversal reaches what search cannot, and stops where it is told to.

The high-risk chain is the case the whole feature turns on. Article 6 does not
restate the obligations it classifies a system into, so a search that lands on
it needs the text's own citations to reach Articles 8 to 15 and Article 43.
`.canon/plans/feature-retrieval-and-the-agent.md` measured depth 2 from
`art_6` at 43 provisions in the original and 51 in the consolidated, which is
what makes the 40-provision cap bite at the demo's own worst case rather than
never.
"""

from annex.corpus import ProvisionKind
from annex.corpus.graph import build
from annex.corpus.models import Corpus
from annex.retrieval.store import Hit
from annex.retrieval.traverse import traverse

OBLIGATIONS = frozenset(f'art_{number}' for number in range(8, 16))


def make_hit(provision_id: str, distance: float = 0.5) -> Hit:
    return Hit(
        chunk_id=provision_id,
        provision_id=provision_id,
        citation=provision_id,
        text=f'The text of {provision_id}.',
        distance=distance,
    )


class TestTheHighRiskChain:
    def test_depth_two_from_article_six_reaches_every_obligation_article(
        self, original: Corpus
    ) -> None:
        expansion = traverse((make_hit('art_6'),), build(original), depth=2, cap=200)

        assert OBLIGATIONS <= set(expansion.traversed_ids)

    def test_depth_two_from_article_six_reaches_conformity_assessment(
        self, original: Corpus
    ) -> None:
        expansion = traverse((make_hit('art_6'),), build(original), depth=2, cap=200)

        assert 'art_43' in expansion.traversed_ids

    def test_depth_two_from_article_six_reaches_the_high_risk_annex(
        self, original: Corpus
    ) -> None:
        expansion = traverse((make_hit('art_6'),), build(original), depth=2, cap=200)

        assert 'anx_III' in expansion.traversed_ids

    def test_the_amended_text_carries_the_same_chain(
        self, consolidated: Corpus
    ) -> None:
        expansion = traverse(
            (make_hit('art_6'),), build(consolidated), depth=2, cap=200
        )

        reached = set(expansion.traversed_ids)

        assert OBLIGATIONS <= reached
        assert {'art_43', 'anx_III'} <= reached


class TestBounds:
    def test_the_cap_bounds_what_traversal_returns(self, original: Corpus) -> None:
        expansion = traverse((make_hit('art_6'),), build(original), depth=2, cap=10)

        assert len(expansion.traversed_ids) == 10

    def test_the_cap_keeps_the_nearest_rather_than_a_slice(
        self, original: Corpus
    ) -> None:
        graph = build(original)

        capped = traverse((make_hit('art_6'),), graph, depth=2, cap=8)
        one_hop = traverse((make_hit('art_6'),), graph, depth=1, cap=200)

        assert set(capped.traversed_ids) <= set(one_hop.traversed_ids)

    def test_depth_bounds_how_far_the_walk_goes(self, original: Corpus) -> None:
        graph = build(original)

        shallow = traverse((make_hit('art_6'),), graph, depth=1, cap=500)
        deep = traverse((make_hit('art_6'),), graph, depth=2, cap=500)

        assert len(shallow.traversed_ids) < len(deep.traversed_ids)

    def test_a_provision_search_already_found_is_never_added_again(
        self, original: Corpus
    ) -> None:
        expansion = traverse(
            (make_hit('art_6'), make_hit('anx_III')),
            build(original),
            depth=2,
            cap=200,
        )

        assert 'anx_III' not in expansion.traversed_ids
        assert 'anx_III' in expansion.searched_ids


class TestSwitchedOff:
    def test_off_returns_the_search_result_unchanged(self, original: Corpus) -> None:
        hits = (make_hit('art_6'), make_hit('art_50'))

        expansion = traverse(hits, build(original), enabled=False)

        assert expansion.searched_ids == ('art_6', 'art_50')
        assert expansion.traversed_ids == ()
        assert not expansion.enabled

    def test_on_records_that_it_ran(self, original: Corpus) -> None:
        expansion = traverse((make_hit('art_6'),), build(original))

        assert expansion.enabled


class TestSearchResult:
    def test_duplicate_chunks_of_one_provision_collapse(self, original: Corpus) -> None:
        hits = (
            Hit('art_3#0', 'art_3', 'Article 3', 'first part', 0.4),
            Hit('art_3#1', 'art_3', 'Article 3', 'second part', 0.5),
        )

        expansion = traverse(hits, build(original), enabled=False)

        assert expansion.searched_ids == ('art_3',)

    def test_an_unknown_provision_reaches_nothing(self, original: Corpus) -> None:
        expansion = traverse((make_hit('art_999'),), build(original))

        assert expansion.traversed_ids == ()

    def test_the_combined_set_carries_both_halves(self, original: Corpus) -> None:
        expansion = traverse((make_hit('art_6'),), build(original), depth=1, cap=5)

        assert expansion.provision_ids[0] == 'art_6'
        assert len(expansion.provision_ids) == 1 + len(expansion.traversed_ids)


class TestParagraphSeeds:
    """Chunks are paragraphs, so this is the shape search actually returns."""

    def test_no_paragraph_carries_an_outgoing_edge(self, original: Corpus) -> None:
        graph = build(original)

        with_edges = [
            provision.id
            for provision in original.of_kind(ProvisionKind.PARAGRAPH)
            if graph.outgoing.get(provision.id)
        ]

        assert with_edges == []

    def test_a_paragraph_seed_reaches_the_article_holding_it(
        self, original: Corpus
    ) -> None:
        expansion = traverse((make_hit('art_6.1'),), build(original), depth=1, cap=200)

        assert 'art_6' in expansion.traversed_ids

    def test_a_paragraph_seed_walks_the_citations_of_its_article(
        self, original: Corpus
    ) -> None:
        expansion = traverse((make_hit('art_6.1'),), build(original), depth=2, cap=200)

        assert OBLIGATIONS <= set(expansion.traversed_ids)

    def test_the_article_holding_the_seed_outranks_a_hop_away(
        self, original: Corpus
    ) -> None:
        expansion = traverse((make_hit('art_6.1'),), build(original), depth=2, cap=1)

        assert expansion.traversed_ids == ('art_6',)

    def test_an_article_search_already_found_is_not_lifted_into_traversal(
        self, original: Corpus
    ) -> None:
        expansion = traverse(
            (make_hit('art_6.1'), make_hit('art_6')),
            build(original),
            depth=1,
            cap=200,
        )

        assert 'art_6' not in expansion.traversed_ids
