"""Vector retrieval plus a bounded walk over the Act's own cross-references.

The arm this project was built to test. Search finds where to start and
traversal finds what that start point depends on, which on this corpus is the
part search cannot do: Article 6 does not restate the obligations it classifies
a system into, it cites them, so a question about high-risk duties retrieves
Article 6 and needs the text to reach Articles 8 to 15.

Depth 2, which is `Settings.traversal_depth` and is forced rather than chosen.
Depth 1 reaches one of the ten must-read provisions and depth 3 reaches no more
of them for roughly double the payload, measured on both versions. The
evaluation reports depth 1 and depth 3 beside depth 2 as a sensitivity row,
which is what proves that rather than asserts it.

Recall is not the whole story and the report says so. At depth 2 the walk
returns 43 nodes on the original and 51 on the consolidated to reach ten
must-read provisions, so recall is 1.0 and precision is near 0.2. An arm that
reports the first without the second flatters itself.
"""

from annex.agent.pipeline import Pipeline
from annex.eval.arms.pipeline_arm import PipelineArm

NAME = 'search-traversal'


def build(pipeline: Pipeline) -> PipelineArm:
    """Search with traversal on, over the pipeline the other arm shares."""
    return PipelineArm(name=NAME, traversal=True, pipeline=pipeline)
