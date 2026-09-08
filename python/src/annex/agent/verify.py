"""Dropping the claims the retrieved text does not carry.

This is where a fluent wrong answer gets caught or gets through, so the check
is deliberately not a second model call. A model asked whether its own output
was faithful mostly says yes, and a verification step that agrees with whatever
it is shown is worse than none, because it reports a guarantee it does not
provide.

The check compares the claim's own words against the text of the provisions it
cites. It is crude and it is checkable: a statement invented wholesale shares
almost no content vocabulary with the provision it was hung on, and a statement
the provision actually carries shares most of it.

Two things it deliberately does not do. It does not judge whether the reasoning
is sound, which no lexical test can. And it does not reward a claim for quoting
one distinctive word, since the threshold is a proportion of the claim rather
than a hit count.
"""

import logging
import re

from annex.answer import Answer, Citation, Claim, Refusal

logger = logging.getLogger('annex.agent.verify')

WORD = re.compile(r"[a-z][a-z'-]{3,}")

GROUNDING_THRESHOLD = 0.6
"""The share of a claim's content words that must appear in what it cites.

A proportion rather than a count, so a long claim cannot be grounded by one
matching term. Set where a paraphrase of a provision survives and a statement
built from outside knowledge does not, and it is configuration the evaluation
harness should move rather than a constant anybody should trust untested.
"""

STOPWORDS = frozenset(
    {
        'about',
        'above',
        'after',
        'also',
        'been',
        'being',
        'both',
        'each',
        'from',
        'have',
        'into',
        'more',
        'must',
        'only',
        'other',
        'over',
        'shall',
        'should',
        'such',
        'than',
        'that',
        'their',
        'them',
        'then',
        'there',
        'these',
        'they',
        'this',
        'those',
        'under',
        'when',
        'where',
        'which',
        'will',
        'with',
        'would',
        'your',
    }
)


def content_words(text: str) -> set[str]:
    """The words a grounding comparison should turn on.

    `shall` and `must` are dropped with the rest of the stopwords precisely
    because legal text is saturated with them, so keeping them would ground
    almost any obligation-shaped sentence against almost any provision.
    """
    return {word for word in WORD.findall(text.lower()) if word not in STOPWORDS}


def grounding(statement: str, citations: tuple[Citation, ...]) -> float:
    """The share of a statement's content words its citations carry."""
    claimed = content_words(statement)
    if not claimed:
        return 0.0
    supporting = content_words(' '.join(citation.text for citation in citations))
    return len(claimed & supporting) / len(claimed)


def is_grounded(claim: Claim, threshold: float = GROUNDING_THRESHOLD) -> bool:
    return grounding(claim.statement, claim.citations) >= threshold


def verify(answer: Answer, *, threshold: float = GROUNDING_THRESHOLD) -> Answer:
    """Drop every ungrounded claim, and refuse where that leaves nothing.

    A refusal is a return value rather than an error, per the refusal decision
    in `.claude/ARCHITECTURE.md`, and it carries the citations that were read
    so it is evidenced rather than asserted.
    """
    if answer.refusal is not None:
        return answer

    kept = tuple(claim for claim in answer.claims if is_grounded(claim, threshold))
    dropped = len(answer.claims) - len(kept)
    if dropped:
        logger.info('verification dropped %d of %d claims', dropped, len(answer.claims))

    if kept:
        return answer.model_copy(update={'claims': kept})

    consulted = tuple(
        dict.fromkeys(
            citation for claim in answer.claims for citation in claim.citations
        )
    )
    return answer.model_copy(
        update={
            'claims': (),
            'refusal': Refusal(
                reason=(
                    'Every statement drafted from the retrieved provisions failed '
                    'the grounding check against the text it cited.'
                ),
                missing=(
                    'a provision of the Act that settles the question as described',
                ),
                consulted=consulted,
            ),
        }
    )
