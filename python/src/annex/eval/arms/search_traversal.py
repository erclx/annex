"""Vector retrieval plus a bounded walk over the Act's own cross-references.

The arm this project was built to test. Search finds where to start and
traversal finds what that start point depends on, which on this corpus is the
part search cannot do: Article 6 does not restate the obligations it classifies
a system into, it cites them, so a question about high-risk duties retrieves
Article 6 and needs the text to reach Articles 8 to 15.

Depth 2, which is `Settings.traversal_depth`. It ships on cost rather than
because nothing above it helps: re-walking the recorded seeds measured recall at
0.49, 0.60 and 0.66 for depths 1, 2 and 3 on the original text, and 0.57, 0.61
and 0.61 on the consolidated. Depth 3 therefore buys 0.06 on the original for
seven more nodes, and the consolidated pair is equal only because both hit the
cap of 40. `annex.eval.sensitivity` reports all three beside each other.

## What this arm scored, against what the graph can do

Measured over twelve questions: **0.54 recall on the original and 0.56 on the
consolidated**, against 0.41 and 0.46 for search alone and 1.00 for the arm that
is handed the whole document. Precision over nodes falls from 0.188 to 0.137 as
the walk brings in provisions the question did not need, so the gain is real and
it is paid for.

Depth 2 from `art_6` reaching every obligation article and `art_43` is a
property of the reference graph, asserted by `python/tests/corpus/test_graph.py`
and still true. It is not this arm's score, and the difference is the finding:
the walk starts from what search returned, so where search misses the entry
point it expands nothing. On `q06-worker-promotion` search returned neither
`art_6` nor `anx_III`, and traversal recovered neither.

**The ceiling on this arm is search.** `docs/evaluation.md` carries the run.
"""

from annex.agent.pipeline import Pipeline
from annex.eval.arms.pipeline_arm import PipelineArm

NAME = 'search-traversal'


def build(pipeline: Pipeline) -> PipelineArm:
    """Search with traversal on, over the pipeline the other arm shares."""
    return PipelineArm(name=NAME, traversal=True, pipeline=pipeline)
