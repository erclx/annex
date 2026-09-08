"""What each arm found, what it was handed, and whether the answer held.

Everything here reads `RetrievalTrace` and defines no structure beside it. The
trace is what citations alone cannot give: an arm handed a quarter of the
document that cites three provisions scores 1.0 on every metric derived from
its citations, and only the trace says what it was actually given.

## Supplied is not retrieved

`searched_ids` and `traversed_ids` name what retrieval reached.
`dropped_ids` names which of those the prompt budget cut before the model saw
them. Scoring traversal against the first without subtracting the third credits
it for text nothing read, so every metric here runs over the difference.

## Three denominators, and the report names which

Recall is what a reader cares about: of the provisions a correct answer has to
read, how many were reached. Precision is what a retrieval budget spends, and
it has two honest denominators. Against articles alone, the depth-2 walk is 26
of 113 on the original, which is the quarter-of-the-document reading. Against
every node the walk returns, which is what actually reaches the model, it is 43
and the extra is paragraphs and annexes. Both are reported, and never the third
denominator alone, which divides by every provision the corpus addresses and
makes any arm look precise.

The baseline's denominator is the whole document, so it scores near 0.03.
Unstated that reads as rigged. Stated, it is the honest measure of what
stuffing costs.

## Faithfulness measures quotation fidelity, not sound reasoning

`containment` is `annex.agent.verify.grounding` with the supporting set hoisted
and one predicate changed: it scores a claim against what the model was
**supplied**, where `grounding` scores it against what the claim **cites**. The
two differ exactly where they matter, on a claim resting on a provision the
budget dropped. The set is hoisted because the baseline supplies 306
provisions and recomputing their vocabulary per claim would walk the document
once a statement.

An answer that quotes correctly and reasons wrongly scores 1.0 here. No lexical
test catches that, and the report states the limit rather than letting the
number stand alone.

The second limit is the denominator, and it is the one that would mislead a
reader comparing arms. Containment is measured against the supplied text, so an
arm supplied with the whole document is matched against the whole document's
vocabulary and starts ahead of an arm supplied with fifty provisions. That is
why `RetrievalScore.nodes_supplied` is reported in the same table: the pair is
the reading, and the faithfulness column alone is not.
"""

from dataclasses import dataclass

from annex.agent.verify import GROUNDING_THRESHOLD, content_words
from annex.answer import Answer, RetrievalTrace
from annex.corpus import Corpus, CorpusVersion
from annex.eval.questions import Question


def article_root(provision_id: str) -> str:
    """The article an id belongs to, which for an article is itself.

    Search returns paragraphs and the gold set names articles, so a retrieved
    `art_50.1` has to count as having found `art_50`. Asking the gold set to
    predict which paragraph would rank would score the tokenizer rather than
    the retrieval.
    """
    return provision_id.split('.', 1)[0]


def supplied_ids(trace: RetrievalTrace) -> tuple[str, ...]:
    """What reached the model: everything retrieved, less what the budget cut."""
    dropped = set(trace.dropped_ids)
    return tuple(
        provision_id
        for provision_id in trace.searched_ids + trace.traversed_ids
        if provision_id not in dropped
    )


def containment(statement: str, supporting: set[str]) -> float:
    """The share of a statement's content words the supplied text carries."""
    claimed = content_words(statement)
    if not claimed:
        return 0.0
    return len(claimed & supporting) / len(claimed)


@dataclass(frozen=True)
class RetrievalScore:
    """What one arm found on one question, against the gold set for its version."""

    recall: float
    precision_over_nodes: float
    precision_over_articles: float
    nodes_supplied: int
    articles_supplied: int
    found: tuple[str, ...]
    missed: tuple[str, ...]


@dataclass(frozen=True)
class AnswerScore:
    """Whether the answer held, and whether refusing was the right move."""

    refused: bool
    refusal_correct: bool
    faithfulness: float | None
    claims: int
    ungrounded_claims: int
    citations_not_supplied: tuple[str, ...]


def score_retrieval(
    question: Question, version: CorpusVersion, trace: RetrievalTrace
) -> RetrievalScore:
    """Recall and both precisions, over what the model was actually handed."""
    gold = set(question.gold_for(version))
    supplied = supplied_ids(trace)
    articles = {article_root(provision_id) for provision_id in supplied}
    found = gold & articles
    relevant = [
        provision_id for provision_id in supplied if article_root(provision_id) in gold
    ]
    return RetrievalScore(
        recall=len(found) / len(gold),
        precision_over_nodes=len(relevant) / len(supplied) if supplied else 0.0,
        precision_over_articles=len(found) / len(articles) if articles else 0.0,
        nodes_supplied=len(supplied),
        articles_supplied=len(articles),
        found=tuple(sorted(found)),
        missed=tuple(sorted(gold - found)),
    )


def score_answer(
    question: Question,
    answer: Answer,
    corpus: Corpus,
    *,
    threshold: float = GROUNDING_THRESHOLD,
) -> AnswerScore:
    """Faithfulness against what was supplied, and refusal scored both ways.

    A refusal is not scored for faithfulness. Averaging a zero in would punish
    a correct refusal for having no claims to be faithful with, which would
    reward an arm that answers everything badly over one that refuses well.
    """
    refused = answer.is_refusal
    refusal_correct = refused == question.expects_refusal
    if refused:
        return AnswerScore(
            refused=True,
            refusal_correct=refusal_correct,
            faithfulness=None,
            claims=0,
            ungrounded_claims=0,
            citations_not_supplied=(),
        )

    supplied = set(supplied_ids(answer.retrieval))
    cited = {
        citation.provision_id for claim in answer.claims for citation in claim.citations
    }
    supporting = content_words(
        ' '.join(
            provision.text
            for provision in (corpus.get(name) for name in sorted(supplied))
            if provision is not None
        )
    )
    scores = [containment(claim.statement, supporting) for claim in answer.claims]
    return AnswerScore(
        refused=False,
        refusal_correct=refusal_correct,
        faithfulness=sum(scores) / len(scores) if scores else 0.0,
        claims=len(answer.claims),
        ungrounded_claims=sum(1 for score in scores if score < threshold),
        citations_not_supplied=tuple(sorted(cited - supplied)),
    )
