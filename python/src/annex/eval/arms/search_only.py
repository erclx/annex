"""Vector retrieval alone: the arm traversal has to beat to justify itself.

Top-k search over the embedded provisions, and nothing follows the citations
outward. This is the middle arm and it carries the harder half of the argument:
the baseline shows whether retrieval is needed at all, and this shows whether
the structure-aware half of it adds anything search does not already find.

It did not score what the traversal arm scored, so the graph is not decoration.
Measured over twelve questions on `snowflake-arctic-embed2`: **0.61 recall on
the original and 0.71 on the consolidated**, against 0.74 and 0.81 with the walk
on. Precision runs the other way, 0.236 and 0.364 here against 0.170 and 0.248,
because this arm sends about twelve provisions and the walk sends about
twenty-six.

What it establishes is the entry point. Traversal starts from these seeds, so a
provision this arm never returns is one the walk cannot reach from. That made
the embedder the bottleneck at v0.6, when this arm scored 0.41 and 0.46 and
missed Article 6 on most of the high-risk questions. Swapping the embedding
model fixed that half, and the loss moved downstream to the prompt budget rather
than disappearing. `docs/evaluation.md` carries both runs.
"""

from annex.agent.pipeline import Pipeline
from annex.eval.arms.pipeline_arm import PipelineArm

NAME = 'search-only'


def build(pipeline: Pipeline) -> PipelineArm:
    """Search with traversal off, over the pipeline the other arm shares."""
    return PipelineArm(name=NAME, traversal=False, pipeline=pipeline)
