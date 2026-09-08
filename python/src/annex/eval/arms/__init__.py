"""Three ways of answering one question, behind one call.

The protocol is what keeps the scorer free of a branch on which arm produced a
result. An arm takes a question and a version and returns v0.5's `Answer`
carrying its `RetrievalTrace`, and everything that distinguishes the arms is
inside that object rather than beside it: `traversal_enabled` separates search
from search plus traversal, and `searched_ids` on the baseline is every
provision of the version it read, which is literally the set it was handed.

Concrete arms are not re-exported here. `full_context` needs the corpus and the
model, and the two retrieval arms need a compiled LangGraph pipeline, so
importing the protocol should not drag either in. `Routed` is declared here for
the same reason: it is the protocol's return type, and putting it beside
`Pipeline` where it is produced would pull LangGraph in behind the protocol.
"""

from typing import NamedTuple, Protocol

from annex.answer import Answer
from annex.corpus import CorpusVersion
from annex.eval.questions import Question


class Routed(NamedTuple):
    """An answer, and the query the arm searched with to reach it.

    The query is carried beside the answer rather than inside it because
    `annex.answer` generates the web half's types, and a run's recall figure
    needs the text that produced it while a reader of one answer does not.

    An empty query is a reading rather than a gap. The baseline is handed the
    whole document and searches nothing, so it has no query to report, and the
    absence is what distinguishes it from the arms that do.
    """

    answer: Answer
    query: str


class Arm(Protocol):
    """One way of answering, named so a result can say which produced it."""

    name: str

    def answer(self, question: Question, version: CorpusVersion) -> Routed:
        """Answer one question against one version of the Act, or refuse it."""
        ...
