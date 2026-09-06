# Requirements

Authoring guidance: the requirements standard.

## Problem

An organization deploying AI in the EU has to work out which obligations of the AI Act attach to what it is building. The answer is never in one place. Whether a system is high risk is decided in one article, by reference to a list in an annex, and the duties that follow sit in a further run of articles. Reading the chain is slow, specialist, and expensive to get wrong.

The text also moves. The Digital Omnibus amended the Act in July 2026 and shifted two of its three compliance deadlines. An answer derived from the original text is now confidently wrong about dates that carry penalties, and nothing about the original text announces that it is stale.

## Goals

- Someone describes their system in plain language and learns which articles they have to read
- Every statement traces back to the article text it came from, quoted and located
- The system says the text does not settle it, rather than guessing, whenever that is true
- Answers reflect the amended Act, and where an answer changed, the change is visible
- Retrieval quality and answer faithfulness are measured rather than asserted

## Non-goals

- Legal advice, or a verdict on whether an organization complies. It reports which articles to read
- National implementations beyond Swedish guidance (deferred)
- Accounts, authentication, or multi-tenancy (deferred)
- Letting a user bring their own corpus (deferred)
- Fine-tuning a model

## MVP features

1. System intake: a plain-language description of an AI system becomes a structured query
2. Cited answers: every claim carries the article it came from and the text that supports it
3. Refusal: questions the text does not settle return a refusal naming what is missing
4. Reference traversal: answers follow the Act's own cross-references between articles, annexes and definitions
5. Amendment awareness: both the original and amended text are indexed, and an answer that changed says so
6. Three-arm evaluation: the same question set answered by full-context stuffing, by vector retrieval alone, and by vector retrieval plus reference traversal, reporting accuracy and cost for each
7. Cost reporting: tokens and money per question, per arm, surfaced rather than buried

## Tech stack

- Python
- TypeScript
- LangGraph
- OpenAI API
- A vector store and an embedding model
- A graph representation of the Act's cross-references

Specific library choices are open and tracked in `.claude/ARCHITECTURE.md` under risks.

## What this project is actually asking

The Act is 90 483 words. Put through the model this project runs, the original text comes back as 114 720 prompt tokens and the amended text as 77 040, both inside the 131 072 this machine holds on the GPU. Those are `usage.prompt_tokens` read off the model rather than a character count divided by anything, and they retire the 145 000 this entry used to carry, which was 582 489 characters divided by four. So a model can read the whole document and answer from it. Retrieval is therefore not obviously worth doing here, and prompt caching removes most of the cost argument for repeated questions against a fixed corpus.

The question this project exists to answer is whether structure-aware retrieval earns its place against that baseline. The document carries 523 parsed reference edges in its original text and 607 in the amended one, which is what makes the question answerable rather than rhetorical: a corpus with no structure could not be measured this way.

The answer is allowed to be that the baseline wins. Reporting that is the point, not a failure of it.

It won. Measured over 72 runs at v0.6, full-context stuffing reached every gold provision, vector search alone reached 0.41 of them on the original text and 0.46 on the consolidated, and search plus traversal reached 0.54 and 0.56. Retrieval's case on this corpus is cost and checkability rather than accuracy. `docs/evaluation.md` carries the numbers and the two limits that keep it from being a general claim, being twelve questions and one embedder nothing has been compared against.

## Constraints

- The corpus is public law. No licensing or confidentiality limit on ingesting it
- Every layer has to be explainable under questioning. A layer that cannot be explained does not ship
- Correctness is the product. A fluent wrong answer is worse here than a refusal
- Built inside a fixed two-and-a-half-day window, so scope is cut before quality is
