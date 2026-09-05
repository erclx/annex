"""The Act's cross-references as a directed graph.

Held in process as an adjacency map rather than in a graph library. The Act is
hundreds of provisions and hundreds of edges, which `.claude/ARCHITECTURE.md`
already names as the scale where an in-process graph may be sufficient.

The immediate reason is narrower. `networkx` declares
`requires_python: !=3.14.1`, and this project pins 3.14.1, so importing it here
raises before any graph is built. Nothing else in the corpus depends on the
library's algorithms: the two operations this project needs are a walk out to a
bounded depth and a lookup of what points at a provision.
"""

from collections import deque

from pydantic import BaseModel, ConfigDict

from annex.corpus.models import Corpus, Provision, Reference
from annex.corpus.references import extract


class ReferenceGraph(BaseModel):
    """Provisions as nodes, the references between them as directed edges."""

    model_config = ConfigDict(frozen=True)

    nodes: dict[str, Provision]
    edges: tuple[Reference, ...]

    @property
    def outgoing(self) -> dict[str, tuple[str, ...]]:
        adjacency: dict[str, list[str]] = {}
        for edge in self.edges:
            adjacency.setdefault(edge.source_id, []).append(edge.target_id)
        return {source: tuple(targets) for source, targets in adjacency.items()}

    @property
    def incoming(self) -> dict[str, tuple[str, ...]]:
        adjacency: dict[str, list[str]] = {}
        for edge in self.edges:
            adjacency.setdefault(edge.target_id, []).append(edge.source_id)
        return {target: tuple(sources) for target, sources in adjacency.items()}

    def node_count(self) -> int:
        return len(self.nodes)

    def edge_count(self) -> int:
        return len(self.edges)


def build(
    corpus: Corpus, references: tuple[Reference, ...] | None = None
) -> ReferenceGraph:
    """Build the reference graph for one version of the Act."""
    edges = extract(corpus) if references is None else references
    return ReferenceGraph(nodes=corpus.by_id, edges=edges)


def neighbours(graph: ReferenceGraph, provision_id: str, depth: int = 1) -> set[str]:
    """Every provision reachable from one, out to a bounded depth.

    Bounded because the Act's reference structure is dense enough that an
    unbounded walk from a well-connected article returns most of the corpus.
    """
    if provision_id not in graph.nodes:
        return set()

    outgoing = graph.outgoing
    reached: set[str] = set()
    queue: deque[tuple[str, int]] = deque([(provision_id, 0)])
    while queue:
        current, distance = queue.popleft()
        if distance >= depth:
            continue
        for target in outgoing.get(current, ()):
            if target not in reached and target != provision_id:
                reached.add(target)
                queue.append((target, distance + 1))
    return reached
