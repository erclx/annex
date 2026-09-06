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

A second check sits beside it and answers a different question. Grounding asks
whether a statement is carried by the text it cites, and a question about a
date can be answered fluently, faithfully and wrongly from provisions that
carry no date at all. The v0.6 run recorded three of those as successes on the
version-comparison flow, so a timing question whose surviving claims state no
date their own citations carry is refused rather than returned.

That check reads the statements rather than the provisions supplied, and a
weaker draft of it read the provisions. Article 2 and Article 6 of the
consolidated text carry a date apiece for reasons that have nothing to do with
when an obligation begins, so a run supplied with either passed a gate meant to
ask whether the answer had said when.
"""

import logging
import re

from annex.answer import Answer, Citation, Claim, Refusal

logger = logging.getLogger('annex.agent.verify')

WORD = re.compile(r"[a-z][a-z'-]{3,}")

ASKS_WHEN = re.compile(
    r'\b(?:from\s+when|when\s+(?:do|does|did|will|must|should|are|is)|deadlines?)\b',
    re.IGNORECASE,
)
"""Whether a description is asking for a date rather than for a duty.

Matches an interrogative shape rather than the bare token, because the endpoint
takes free text and the token is ordinary English inside a description of what a
system does. "A chatbot that tells the user when it is talking to a machine"
carries a `when` and asks nothing about timing, and gating it would push the
transparency flow this project leads with through a check it cannot pass.

The word after `when` is what separates the two. A question puts an auxiliary
there and a description puts a subject, so `when it`, `when a` and `when to`
fall outside while `when do` and `from when` fall inside. Selects the same four
gold descriptions the bare token did, being the three deadline questions and
`q08`, which says "before the deadline" and is one the set already expects a
refusal on. Measured on 2026-09-06.

What it gives up is a timing question phrased without an auxiliary. That
degrades to the behavior before this check existed rather than to a false
refusal, which is the direction to fail in.
"""

CALENDAR_DATE = re.compile(
    r'\b(?:\d{1,2}\s+)?(January|February|March|April|May|June|July|August'
    r'|September|October|November|December)\s+(\d{4})\b',
    re.IGNORECASE,
)
"""A date the Act states, with the day optional and the month and year captured.

The day is optional because this reads the model's own sentence rather than the
Act's, and nothing constrains how the model writes a date. "The obligations
apply from August 2026" is a correct answer to a deadline question and an
earlier draft requiring the day dropped it.

Capturing the month and the year is what lets a claim and its citation be
compared on the date rather than on the spelling, so a claim writing "August
2026" is grounded against a provision writing "2 August 2026". Selects a
provision in 41 of each version's provisions, Article 111 and Article 113 among
them. Measured against both parses on 2026-09-06.

Timing the Act states as a period rather than as a date, such as "24 months
from entry into force", is not matched and an answer resting on one is refused.
That is a known over-refusal, in the safe direction, and the gold set does not
exercise it.
"""

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


def asks_when(question: str) -> bool:
    """Whether the description asks for a date rather than for a duty."""
    return ASKS_WHEN.search(question) is not None


def dates_in(text: str) -> set[tuple[str, str]]:
    """Every date the text states, as the month and the year that identify it.

    The day is dropped rather than compared. A claim and the provision it cites
    are two spellings of one date, and holding them to the same one would drop
    a correct answer that wrote the month alone.
    """
    return {(month.lower(), year) for month, year in CALENDAR_DATE.findall(text)}


def states_a_grounded_date(claim: Claim) -> bool:
    """Whether the claim gives a date, and gives one the text it cites carries.

    Both halves are load-bearing. A claim naming no date has not answered when
    something applies whatever it cites, and a claim naming a date its cited
    text does not carry has supplied one from outside the Act, which on a
    compliance deadline is the most expensive thing this system can do.
    """
    stated = dates_in(claim.statement)
    if not stated:
        return False
    cited = {date for citation in claim.citations for date in dates_in(citation.text)}
    return bool(stated & cited)


def rests_on_a_date(claims: tuple[Claim, ...]) -> bool:
    """Whether the answer gives a date the text it cites carries."""
    return any(states_a_grounded_date(claim) for claim in claims)


def _refused(answer: Answer, reason: str, missing: str) -> Answer:
    """The same refusal shape from either exit, carrying what was read."""
    consulted = tuple(
        dict.fromkeys(
            citation for claim in answer.claims for citation in claim.citations
        )
    )
    return answer.model_copy(
        update={
            'claims': (),
            'refusal': Refusal(reason=reason, missing=(missing,), consulted=consulted),
        }
    )


def verify(answer: Answer, *, threshold: float = GROUNDING_THRESHOLD) -> Answer:
    """Drop every ungrounded claim, and refuse where that leaves nothing.

    A refusal is a return value rather than an error, per the refusal decision
    in `.claude/ARCHITECTURE.md`, and it carries the citations that were read
    so it is evidenced rather than asserted.

    Two of the pipeline's four refusal exits are here, and each logs which one
    fired for the reason `annex.agent.pipeline.parse_draft` gives at the other
    two: nothing downstream records the stage.
    """
    if answer.refusal is not None:
        return answer

    kept = tuple(claim for claim in answer.claims if is_grounded(claim, threshold))
    dropped = len(answer.claims) - len(kept)
    if dropped:
        logger.info('verification dropped %d of %d claims', dropped, len(answer.claims))

    if kept and asks_when(answer.question) and not rests_on_a_date(kept):
        logger.info(
            'refusal exit: verify timing, %d grounded claims on a question about '
            'timing state no date the text they cite carries',
            len(kept),
        )
        return _refused(
            answer,
            reason=(
                'The question asks when an obligation applies, and no statement '
                'drafted from the retrieved provisions gives a date those '
                'provisions carry.'
            ),
            missing='the provision of the Act carrying the date this applies from',
        )

    if kept:
        return answer.model_copy(update={'claims': kept})

    logger.info(
        'refusal exit: verify grounding, all %d claims fell below the %.2f threshold',
        len(answer.claims),
        threshold,
    )
    return _refused(
        answer,
        reason=(
            'Every statement drafted from the retrieved provisions failed the '
            'grounding check against the text it cited.'
        ),
        missing='a provision of the Act that settles the question as described',
    )
