"""The adapter from the shipped agent to the arm protocol.

Both retrieval arms are the same pipeline with one switch thrown, which is
exactly the comparison the evaluation is trying to make: search alone against
search plus a bounded walk over the citations the retrieved provisions carry.
`annex.retrieval.traverse` takes `enabled` as an argument for this reason
rather than shipping two functions, and this is where that pays.

Held apart from the two named arm modules so neither has to import the other.
Each of those is one configuration of this and carries the argument for why
that configuration is an arm, which is the part worth reading.
"""

from dataclasses import dataclass

from annex.agent.pipeline import Pipeline
from annex.corpus import CorpusVersion
from annex.eval.arms import Routed
from annex.eval.questions import Question


@dataclass(frozen=True)
class PipelineArm:
    """One arm, being the shipped pipeline with traversal on or off."""

    name: str
    traversal: bool
    pipeline: Pipeline

    def answer(self, question: Question, version: CorpusVersion) -> Routed:
        """Answer, and report the query the router restated the question as."""
        answered, query = self.pipeline.ask_routed(
            question.description, version=version, traversal=self.traversal
        )
        return Routed(answer=answered, query=query)
