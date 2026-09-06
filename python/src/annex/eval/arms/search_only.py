"""Vector retrieval alone: the arm traversal has to beat to justify itself.

Top-k search over the embedded provisions, and nothing follows the citations
outward. This is the middle arm and it carries the harder half of the argument:
the baseline shows whether retrieval is needed at all, and this shows whether
the structure-aware half of it adds anything search does not already find.

Where this arm scores what the traversal arm scores, the reference graph is
decoration. `.claude/ARCHITECTURE.md` allows that result and says reporting it
is the point rather than a failure of it.
"""

from annex.agent.pipeline import Pipeline
from annex.eval.arms.pipeline_arm import PipelineArm

NAME = 'search-only'


def build(pipeline: Pipeline) -> PipelineArm:
    """Search with traversal off, over the pipeline the other arm shares."""
    return PipelineArm(name=NAME, traversal=False, pipeline=pipeline)
