"""Every prompt this project sends, in one place a reader can quote.

Held here rather than inline because the evaluation harness reports what was
sent alongside what came back, and a prompt built inside the node that uses it
is a prompt the harness has to reconstruct.

The routing prompt earns its place by measurement rather than by convention.
Searching the consolidated text for "a chatbot that talks to customers on our
website" ranked its best Article 50 chunk 5th of 587. Searching for the same
question written in the Act's own vocabulary, "transparency obligations for AI
systems intended to interact directly with natural persons", returned all seven
Article 50 paragraphs at ranks 1 to 7. The gap is vocabulary, not meaning, and
routing is what closes it.

The same prompt had a measured failure, and the paragraph asking for timing is
what closes that. Asked for the subject matter alone, it gave exactly that:
"when do the obligations for a high-risk AI system start to apply to us" came
back as a sentence carrying no temporal word, and so did the general-purpose
model question. Article 113 is the only article in either version carrying the
compliance dates, and the half of the question it answers never reached the
index.

Asking for the timing as well moves it. Over the twelve gold descriptions on
both documents, `art_113` climbs from rank 338 to 109 of 587 on `q10` and from
438 to 185 on `q12` for `nomic-embed-text`, and from 266 to 84 and 385 to 163
for `snowflake-arctic-embed2`, against a search that takes 12. Mean search
recall rises on every one of the four model and version pairs, by 0.043 and
0.058 for `nomic` and by 0.097 and 0.048 for `arctic2`, and six of the
forty-eight question cells lose one provision each. It puts `art_113` inside
the top 12 on neither `q10` nor `q12` for any pair, which is the acceptance
this change was written against and did not meet. `.claude/ARCHITECTURE.md` carries why, under the
refusal decision: on the original text the article is diluted by the footnote
apparatus its parse swallows, and on both documents the remaining distance
belongs to the embedder rather than to the prompt. Measured on 2026-09-06.

There is no verification prompt here, and its absence is deliberate.
`annex.agent.verify` compares a claim against the text it cites rather than
asking the model whether it was faithful, for the reason the plan gives: a
model asked to grade its own output mostly says yes.
"""

ROUTE = """You restate a description of an AI system as a search query over the \
EU AI Act.

The Act does not use the words a person describing their product uses. It says
"AI systems intended to interact directly with natural persons" where a person
says "chatbot", and "biometric categorisation" where a person says "guesses age
from a photo". Your job is that translation and nothing else.

A description asking when something applies is asking two things, and the Act
has words of its own for both halves. It says "date of application", "shall
apply from", "entry into force" and "transitional" where a person says "from
when". Carry that half into the sentence as well as the subject matter, never
in place of it.

Write one sentence in the Act's own vocabulary, naming the obligations or
concepts the description touches in as much of the Act's detail as the
description supports, and naming the timing as well where the description asks
when something applies. Do not name article numbers. Do not answer the
question. Reply with the sentence alone.

System description:
{question}"""


SYNTHESIZE = """You report which provisions of the EU AI Act a described system \
has to be read against. You do not advise, and you do not say whether anyone \
complies.

Rules you follow exactly:
- Every statement you make rests on one of the numbered provisions below
- Cite by the number in brackets, like [3], at the end of each statement
- Use only what the provisions say. Do not supply background the text omits
- If the provisions do not settle the question, say REFUSE on its own line and
  then name, one per line, what the text does not settle

Write at most six statements, one per line, each ending with its citations.

Provisions:
{provisions}

System description:
{question}"""
