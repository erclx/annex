"""The gold question set: twelve descriptions and what each one has to reach.

Written once here and read three times. `.canon/tasks/v00.7-mock-capture-and-deploy.md`
settles five demo flows, and the same set is the evaluation's gold set, the
fixtures the deployed build replays, and the spine of the recorded walkthrough.
Four of the five flows ask the corpus something. The fifth is the result screen
this harness produces, so it asks nothing and appears here as no question.

Three questions a flow rather than one, because twelve is already a small
denominator: one wrong answer moves accuracy by more than eight points, and at
four questions it would move it by twenty-five. The four demo questions are the
named spine and the other eight vary the system description inside the flow
they belong to.

## What a gold set can and cannot assert

`gold` names the provisions a correct answer has to have read, per version,
because the two documents are not one corpus: the consolidated text carries no
recitals and six articles the original does not. Every id is article-level or
annex-level even where the answer lives in one paragraph, since search returns
paragraphs and traversal lifts them to their article, so scoring resolves a
retrieved `art_50.1` up to `art_50` rather than asking the gold set to guess
which paragraph ranked.

`expects_refusal` is scored in both directions. An arm that refuses everything
would otherwise win the refusal flow outright while answering nothing, which is
the failure this field exists to make visible rather than to reward.
"""

import json
from enum import StrEnum
from pathlib import Path
from typing import Self

from pydantic import BaseModel, ConfigDict, model_validator

from annex.corpus import CorpusVersion

QUESTIONS_PATH = (
    Path(__file__).resolve().parents[3] / 'data' / 'eval' / 'questions.json'
)
"""Where the set is emitted as data, for v0.7 to replay and the demo to read.

This module is the single source. The file is generated from it by
`write_questions`, so a question edited here and not re-emitted is a stale file
rather than a second definition.
"""


class Flow(StrEnum):
    """Which of the settled demo flows a question serves."""

    TRANSPARENCY = 'transparency'
    HIGH_RISK_CHAIN = 'high-risk-chain'
    SUBSTANTIAL_MODIFICATION = 'substantial-modification'
    VERSION_COMPARISON = 'version-comparison'


class Question(BaseModel):
    """One described system, and the provisions a correct answer reads."""

    model_config = ConfigDict(frozen=True)

    id: str
    description: str
    flow: Flow
    gold: dict[CorpusVersion, tuple[str, ...]]
    expects_refusal: bool = False

    @model_validator(mode='after')
    def _gold_names_both_versions(self) -> Self:
        """A question scored against one version only cannot be compared.

        Every arm runs both documents, so a gold set covering one of them
        scores the other against an empty set and reports perfect precision on
        a retrieval that found nothing.
        """
        empty = [version for version in CorpusVersion if not self.gold.get(version)]
        if empty:
            names = ', '.join(sorted(empty))
            raise ValueError(f'{self.id} names no gold provision for {names}')
        return self

    def gold_for(self, version: CorpusVersion) -> tuple[str, ...]:
        return self.gold[version]


def _both(*provision_ids: str) -> dict[CorpusVersion, tuple[str, ...]]:
    """The same gold set on both versions, which is the ordinary case.

    The chain a question walks is the same in both documents wherever the
    amendment did not touch it. Where it did, the question spells the two sides
    out rather than calling this.
    """
    return dict.fromkeys(CorpusVersion, provision_ids)


HIGH_RISK_CHAIN = (
    'anx_III',
    'art_6',
    'art_8',
    'art_9',
    'art_10',
    'art_11',
    'art_12',
    'art_13',
    'art_14',
    'art_15',
    'art_43',
)
"""What a reader of Article 6 has to reach, and the chain traversal is measured on.

Annex III is where the use case is listed, Article 6 is where the listing makes
a system high risk, Articles 8 to 15 are the duties that follow, and Article 43
is how conformity is shown. Depth 1 from Article 6 reaches one of these and
depth 2 reaches all of them, in both versions, which is the measurement that
settled the traversal depth.
"""


QUESTIONS: tuple[Question, ...] = (
    Question(
        id='q01-support-chatbot',
        description=(
            'a chatbot on our website that answers customer questions about '
            'our products'
        ),
        flow=Flow.TRANSPARENCY,
        gold=_both('art_50'),
    ),
    Question(
        id='q02-synthetic-voice-agent',
        description=(
            'a voice agent that phones our customers to confirm appointments, '
            'speaking in a synthesized voice'
        ),
        flow=Flow.TRANSPARENCY,
        gold=_both('art_50'),
    ),
    Question(
        id='q03-generated-product-images',
        description=(
            'we generate product photographs with an image model and publish '
            'them in our online shop'
        ),
        flow=Flow.TRANSPARENCY,
        gold=_both('art_50'),
    ),
    Question(
        id='q04-cv-screening',
        description=(
            'software that ranks job applicants by reading their CVs and '
            'shortlists who we interview'
        ),
        flow=Flow.HIGH_RISK_CHAIN,
        gold=_both(*HIGH_RISK_CHAIN),
    ),
    Question(
        id='q05-university-admission',
        description=(
            'a system that scores university applications and decides which '
            'applicants are admitted'
        ),
        flow=Flow.HIGH_RISK_CHAIN,
        gold=_both(*HIGH_RISK_CHAIN),
    ),
    Question(
        id='q06-worker-promotion',
        description=(
            'a tool that monitors warehouse staff productivity and recommends '
            'who to promote'
        ),
        flow=Flow.HIGH_RISK_CHAIN,
        gold=_both(*HIGH_RISK_CHAIN),
    ),
    Question(
        id='q07-retrained-credit-model',
        description=(
            'our credit scoring system has been on the market since 2025 and '
            'we have since retrained it on newer data'
        ),
        flow=Flow.SUBSTANTIAL_MODIFICATION,
        gold=_both('art_3', 'art_111', 'art_43'),
        expects_refusal=True,
    ),
    Question(
        id='q08-redesigned-interface',
        description=(
            'our high-risk recruitment tool was placed on the market before '
            'the deadline and we have redesigned its user interface'
        ),
        flow=Flow.SUBSTANTIAL_MODIFICATION,
        gold=_both('art_3', 'art_111', 'art_43'),
        expects_refusal=True,
    ),
    Question(
        id='q09-wider-rollout',
        description=(
            'we placed a high-risk system on the market in 2025 and have since '
            'rolled it out in two more member states'
        ),
        flow=Flow.SUBSTANTIAL_MODIFICATION,
        gold=_both('art_3', 'art_111', 'art_6'),
        expects_refusal=True,
    ),
    Question(
        id='q10-high-risk-deadline',
        description=(
            'when do the obligations for a high-risk AI system start to apply to us'
        ),
        flow=Flow.VERSION_COMPARISON,
        gold=_both('art_113', 'art_111'),
    ),
    Question(
        id='q11-prohibited-deadline',
        description='from when are the prohibited practices in the Act enforceable',
        flow=Flow.VERSION_COMPARISON,
        gold=_both('art_113', 'art_5'),
    ),
    Question(
        id='q12-gpai-deadline',
        description=(
            'we train a general-purpose AI model, from when do its obligations '
            'apply to us'
        ),
        flow=Flow.VERSION_COMPARISON,
        gold=_both('art_113', 'art_53'),
    ),
)


def by_id(question_id: str) -> Question:
    """One question by id, or a failure naming what the set does hold."""
    for question in QUESTIONS:
        if question.id == question_id:
            return question
    known = ', '.join(item.id for item in QUESTIONS)
    raise KeyError(f'no question {question_id!r}. The set holds: {known}')


def write_questions(path: Path = QUESTIONS_PATH) -> Path:
    """Emit the set as data, from the models rather than beside them."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [question.model_dump(mode='json') for question in QUESTIONS]
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + '\n')
    return path
