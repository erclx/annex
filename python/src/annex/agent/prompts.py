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

Write one sentence in the Act's own vocabulary naming the obligations or
concepts the description touches. Do not name article numbers. Do not answer
the question. Reply with the sentence alone.

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
