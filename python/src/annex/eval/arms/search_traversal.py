"""Vector retrieval plus a bounded walk over the Act's own cross-references.

The arm this project was built to test. Search finds where to start and
traversal finds what that start point depends on, which on this corpus is the
part search cannot do: Article 6 does not restate the obligations it classifies
a system into, it cites them, so a question about high-risk duties retrieves
Article 6 and needs the text to reach Articles 8 to 15.

Depth 2, which is `Settings.traversal_depth`. Re-walking the recorded seeds
measures recall at 0.78, 0.89 and 0.89 for depths 1, 2 and 3 on the original
text, and 0.82, 0.85 and 0.85 on the consolidated, so depth 3 now buys nothing
on either document while sending four more nodes on the original. Better seeds
are what settled it: a walk starting from the right provisions reaches the chain
at depth 2. `annex.eval.sensitivity` reports all three beside each other.

## What this arm scored, against what the graph can do

Measured over twelve questions on `snowflake-arctic-embed2`: **0.74 recall on
the original and 0.81 on the consolidated**, against 0.61 and 0.71 for search
alone and 1.00 for the arm handed the whole document. Precision over nodes falls
from 0.236 to 0.170 as the walk brings in provisions the question did not need,
so the gain is real and it is paid for. The walk earns most of it on the
deadline questions, which go 0.50 to 1.00 on both documents by reaching
`art_113` from `art_111`.

Depth 2 from `art_6` reaching every obligation article and `art_43` is a
property of the reference graph, asserted by `python/tests/corpus/test_graph.py`
and still true. Whether it is this arm's score is a separate question, and the
answer moved. At v0.6 search returned neither `art_6` nor `anx_III` on
`q06-worker-promotion` and the walk had no entry point. It now returns both, the
walk lifts `art_6.3` to its article and reaches `art_10` through `art_15` and
`art_43`, and the arm still scores 0.27 there, because `Pipeline._within_budget`
drops all of them to fit the window.

**The ceiling on this arm is now the prompt budget rather than search.** Scored
against everything the walk reached, it makes 0.89 on the original against the
0.74 it delivers. `docs/evaluation.md` carries the run.
"""

from annex.agent.pipeline import Pipeline
from annex.eval.arms.pipeline_arm import PipelineArm

NAME = 'search-traversal'


def build(pipeline: Pipeline) -> PipelineArm:
    """Search with traversal on, over the pipeline the other arm shares."""
    return PipelineArm(name=NAME, traversal=True, pipeline=pipeline)
