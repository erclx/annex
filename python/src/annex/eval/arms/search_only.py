"""Vector retrieval alone: the arm traversal has to beat to justify itself.

Top-k search over the embedded provisions, and nothing follows the citations
outward. This is the middle arm and it carries the harder half of the argument:
the baseline shows whether retrieval is needed at all, and this shows whether
the structure-aware half of it adds anything search does not already find.

It did not score what the traversal arm scored, so the graph is not decoration.
Measured over twelve questions: **0.41 recall on the original and 0.46 on the
consolidated**, against 0.54 and 0.56 with the walk on. Precision runs the other
way, 0.188 and 0.308 here against 0.137 and 0.201, because this arm sends about
twelve provisions and the walk sends about twenty-seven.

What it does establish is the ceiling. Traversal starts from these seeds, so
whatever this arm fails to retrieve is unavailable to the arm after it, and
every one of its own misses is inherited. That makes the embedder rather than
the graph the place the next gain has to come from. `docs/evaluation.md` carries
the run.
"""

from annex.agent.pipeline import Pipeline
from annex.eval.arms.pipeline_arm import PipelineArm

NAME = 'search-only'


def build(pipeline: Pipeline) -> PipelineArm:
    """Search with traversal off, over the pipeline the other arm shares."""
    return PipelineArm(name=NAME, traversal=False, pipeline=pipeline)
