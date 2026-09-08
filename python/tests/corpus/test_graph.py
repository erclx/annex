"""The reference graph carries the edges the text writes, and only those.

The chain `.claude/context/ai-act.md` describes runs from Article 6 through
Annex III to the obligation articles and on to conformity assessment. Two
halves of that are tested separately here, because they are not equally true.
The obligation articles and Article 43 are reachable from Article 6 over
citation edges. Annex III is not the route: it cites only what classifies it.
"""

from annex.corpus.graph import build, neighbours
from annex.corpus.models import Corpus

OBLIGATIONS = frozenset(f'art_{number}' for number in range(8, 16))


class TestStructure:
    def test_every_provision_is_a_node(self, original: Corpus) -> None:
        graph = build(original)

        assert graph.node_count() == len(original.provisions)

    def test_the_graph_carries_the_extracted_edges(self, original: Corpus) -> None:
        graph = build(original)

        assert graph.edge_count() > 0

    def test_an_edge_records_the_phrase_it_came_from(self, original: Corpus) -> None:
        graph = build(original)

        phrases = {edge.phrase for edge in graph.edges}

        assert any(phrase.startswith('Annex') for phrase in phrases)


class TestTheHighRiskChain:
    def test_article_six_reaches_the_high_risk_annex(self, original: Corpus) -> None:
        graph = build(original)

        assert 'anx_III' in neighbours(graph, 'art_6')

    def test_article_six_reaches_every_obligation_article(
        self, original: Corpus
    ) -> None:
        graph = build(original)

        reached = neighbours(graph, 'art_6', depth=2)

        assert OBLIGATIONS <= reached

    def test_article_six_reaches_conformity_assessment(self, original: Corpus) -> None:
        graph = build(original)

        assert 'art_43' in neighbours(graph, 'art_6', depth=2)

    def test_the_chain_holds_in_the_amended_text(self, consolidated: Corpus) -> None:
        graph = build(consolidated)

        reached = neighbours(graph, 'art_6', depth=2)

        assert OBLIGATIONS <= reached
        assert 'art_43' in reached

    def test_the_obligations_are_not_reached_through_the_annex(
        self, original: Corpus
    ) -> None:
        graph = build(original)

        assert not neighbours(graph, 'anx_III', depth=1) & OBLIGATIONS


class TestTraversal:
    def test_depth_bounds_the_walk(self, original: Corpus) -> None:
        graph = build(original)

        near = neighbours(graph, 'art_6', depth=1)
        far = neighbours(graph, 'art_6', depth=3)

        assert near < far

    def test_a_provision_outside_the_graph_reaches_nothing(
        self, original: Corpus
    ) -> None:
        graph = build(original)

        assert neighbours(graph, 'art_900') == set()

    def test_a_walk_does_not_return_its_own_starting_point(
        self, original: Corpus
    ) -> None:
        graph = build(original)

        assert 'art_6' not in neighbours(graph, 'art_6', depth=3)
