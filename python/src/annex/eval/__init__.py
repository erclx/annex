"""The three-arm evaluation: one question set, three ways of answering it.

The deliverable rather than a feature of it. The Act fits inside a current
context window, so a model can read the whole document and answer from it, and
prompt caching removes most of the per-query cost argument on a fixed corpus.
Whether structure-aware retrieval earns its place against that is the question,
and the answer is allowed to be that it does not.

Concrete arms are imported from `annex.eval.arms.*` rather than re-exported
here, since two of the three need a compiled pipeline and an index on disk and
the third needs a model built at a wider window. What this module exports is
what a caller needs to hold a run: the question set, the arm protocol, the
scoring, and the runner.
"""

from annex.eval.arms import Arm, Routed
from annex.eval.questions import (
    QUESTIONS,
    QUESTIONS_PATH,
    Flow,
    Question,
    by_id,
    write_questions,
)
from annex.eval.report import render, summarize
from annex.eval.runner import (
    RESULTS_PATH,
    RUNS_DIRECTORY_NAME,
    Result,
    answer_one,
    read_results,
    run,
    run_path,
    write_results,
)
from annex.eval.scoring import (
    AnswerScore,
    RetrievalScore,
    score_answer,
    score_retrieval,
    supplied_ids,
)
from annex.eval.sensitivity import DEPTHS, DepthRow, depth_rows

__all__ = [
    'DEPTHS',
    'QUESTIONS',
    'QUESTIONS_PATH',
    'RESULTS_PATH',
    'RUNS_DIRECTORY_NAME',
    'AnswerScore',
    'Arm',
    'DepthRow',
    'Flow',
    'Question',
    'Result',
    'RetrievalScore',
    'Routed',
    'answer_one',
    'by_id',
    'depth_rows',
    'read_results',
    'render',
    'run',
    'run_path',
    'score_answer',
    'score_retrieval',
    'summarize',
    'supplied_ids',
    'write_questions',
    'write_results',
]
