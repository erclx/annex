"""The agent: a routed, retrieved, traversed and verified answer, or a refusal.

Holds no model client of its own. `annex.llm` is the one place this project
talks to a model, because `num_ctx` set wrong in one caller truncates a prompt,
returns a fluent answer over a partial document, and fails nothing.
"""

from annex.agent.pipeline import Pipeline, apply_tracing_settings
from annex.agent.verify import GROUNDING_THRESHOLD, grounding, is_grounded, verify
from annex.answer import Answer
from annex.corpus import CorpusVersion

__all__ = [
    'GROUNDING_THRESHOLD',
    'Pipeline',
    'apply_tracing_settings',
    'ask',
    'grounding',
    'is_grounded',
    'verify',
]


def ask(
    question: str,
    *,
    version: CorpusVersion = CorpusVersion.CONSOLIDATED,
    traversal: bool = True,
) -> Answer:
    """Answer one question against a pipeline built for it.

    Convenient for one question and wrong for many: building the pipeline
    parses both documents and their reference graphs. Construct `Pipeline`
    directly and reuse it where more than one question is asked.
    """
    return Pipeline().ask(question, version=version, traversal=traversal)
