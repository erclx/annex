"""Walking the Act's own cross-references outward from what search returned.

Semantic search finds where to start. Traversal finds what that start point
depends on, which on this corpus is the part search cannot do: Article 6 does
not restate the obligations it classifies a system into, it cites them, so a
question about high-risk duties retrieves Article 6 and needs the text to reach
Articles 8 to 15.

Citation edges only. `.canon/plans/feature-retrieval-and-the-agent.md` settles
that and the reason is worth carrying: the Act's Chapter and Section membership
is not parsed into any provision kind, so membership edges cannot be added from
inside retrieval at all. On merit the case runs the same way, since depth 2
from `art_6` already reaches every obligation article and `art_43` in both
versions, and Chapter III entire would add `art_16` through `art_27`, which
nothing on that route cites.

The cap drops the furthest rather than an arbitrary slice, so a budget that
bites removes the provisions the start point depends on least.

## A paragraph seed is lifted to its article first

Chunks are paragraphs, so search returns provision ids like `art_50.1`. The
merged reference extractor sources edges from articles, annexes and recitals
only, and an article's parsed text already contains its paragraphs, so every
citation written inside `Article 50(1)` is attributed to `art_50` and no
paragraph carries an outgoing edge at all. Measured at `bf31890`: not one of
the 500 paragraphs of the original has an entry in `graph.outgoing`.

Walking from a paragraph without lifting therefore reaches nothing, which is
traversal silently doing no work on exactly the results search actually
returns. The lift happens here rather than in `annex.corpus`, which is a merged
surface with its own count checks and is not reshaped to suit retrieval.

A lifted article is reported as traversed rather than as searched, because
search did not return it, and it enters the ranking at distance zero so the cap
keeps it ahead of anything a hop away.
"""

import logging
from collections import deque
from dataclasses import dataclass

from annex.corpus.graph import ReferenceGraph
from annex.retrieval.store import Hit

logger = logging.getLogger('annex.retrieval.traverse')


@dataclass(frozen=True)
class Expansion:
    """What search found, and what following the text's own citations added.

    The two are kept apart rather than merged into one list, because
    `RetrievalTrace` reports them separately and the evaluation harness scores
    what traversal contributed against what search already had.
    """

    searched_ids: tuple[str, ...]
    traversed_ids: tuple[str, ...]
    enabled: bool

    @property
    def provision_ids(self) -> tuple[str, ...]:
        return self.searched_ids + self.traversed_ids


def _holding_articles(graph: ReferenceGraph, seeds: set[str]) -> dict[str, int]:
    """The articles holding any paragraph among the seeds, at distance zero."""
    lifted: dict[str, int] = {}
    for seed in seeds:
        provision = graph.nodes.get(seed)
        parent_id = provision.parent_id if provision else None
        if parent_id and parent_id not in seeds and parent_id in graph.nodes:
            lifted[parent_id] = 0
    return lifted


def _distances(
    graph: ReferenceGraph, seeds: set[str], reached: dict[str, int], depth: int
) -> dict[str, int]:
    """Every provision reachable from any seed, with how far away it sat.

    Breadth-first from all seeds at once rather than once per seed, so a
    provision two hops from one seed and one hop from another is recorded at
    one, which is what the cap should keep.
    """
    starts = [seed for seed in seeds if seed in graph.nodes] + list(reached)
    queue: deque[tuple[str, int]] = deque(
        (start, reached.get(start, 0)) for start in starts
    )
    seen = set(starts)
    while queue:
        current, distance = queue.popleft()
        if distance >= depth:
            continue
        for target in graph.outgoing.get(current, ()):
            if target in seeds or target in seen:
                continue
            seen.add(target)
            reached[target] = distance + 1
            queue.append((target, distance + 1))
    return reached


def traverse(
    hits: tuple[Hit, ...],
    graph: ReferenceGraph,
    *,
    depth: int = 2,
    cap: int = 40,
    enabled: bool = True,
) -> Expansion:
    """Expand a search result over the citations its provisions carry.

    `enabled=False` returns the search result untouched, which is the arm the
    evaluation harness compares against and the reason the switch is an
    argument rather than a second function.
    """
    searched = tuple(dict.fromkeys(hit.provision_id for hit in hits))
    if not enabled:
        return Expansion(searched_ids=searched, traversed_ids=(), enabled=False)

    seeds = set(searched)
    reached = _distances(graph, seeds, _holding_articles(graph, seeds), depth)
    ranked = sorted(reached.items(), key=lambda item: (item[1], item[0]))
    traversed = tuple(provision_id for provision_id, _ in ranked[:cap])
    logger.info(
        'traversal reached %d provisions from %d, kept %d under a cap of %d',
        len(reached),
        len(searched),
        len(traversed),
        cap,
    )
    return Expansion(searched_ids=searched, traversed_ids=traversed, enabled=True)
