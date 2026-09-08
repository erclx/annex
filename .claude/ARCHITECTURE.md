# Architecture

Authoring guidance: the architecture standard.

## Overview

A retrieval system over one corpus, the consolidated EU AI Act, where the corpus carries its own link structure and the answers have to be traceable.

Five stages in request order. A plain-language system description arrives at a web frontend and reaches a Python service. An agent routes the question, retrieves candidate passages by meaning, walks the Act's cross-references outward from those passages, synthesizes an answer citing what it read, and verifies each claim against the retrieved text before returning it. A claim that cannot be grounded is dropped, and a question left unsettled by the text returns a refusal instead of an answer.

The graph and the vector index are two views of the same corpus rather than two systems. Semantic search finds where to start. Traversal finds what that start point depends on.

## Key technical decisions

### The reference graph is parsed, not extracted

The Act ships as structured legal text with numbered articles, annexes and recitals, and its cross-references are written into the sentences themselves. That makes the graph a parsing job over an explicit reference structure rather than an extraction job handing text to a model and trusting what comes back.

Parsing wins twice. It is roughly a day cheaper than model extraction, and it is checkable: a parsed edge either matches a reference in the text or it does not, where an extracted edge is only ever as good as the extraction. The Official Journal text carries 518 explicit cross-reference phrases across 113 articles, 13 annexes and 180 recitals. Measured at 43d4ead on 2026-09-05. On a corpus whose whole value is traceability, a graph nobody can verify would undercut the thing being built.

### The whole Act is ingested, and only the demo question is narrowed

An early proposal cut the corpus down to Article 50, on the grounds that the high-risk obligations were postponed. That confuses two things. The postponement changes when obligations bite. It removes no cross-reference from the text.

The reference structure is what the graph is built from, and the richest chain in the Act runs from Article 6 through Annex III to the obligation articles and on to conformity assessment. Cutting the corpus to one article would remove the only part of the text where traversal visibly beats semantic search. Parsing every article costs nothing over parsing one.

### Refusal is a feature, not a safety net

The system reports which articles to read. It does not say whether an organization complies. Where the text genuinely leaves a question open, it says so and names what is missing.

This is a product decision before it is a safety one. A tool that always answers is indistinguishable from a tool that guesses, and on a legal corpus the cost of a confident wrong answer is the whole downside. Grandfathering is the worked example: systems already on the market before the amended deadlines fall outside full high-risk compliance unless later substantially modified, and no regulator has defined that threshold. The text does not settle it, so neither does the system.

### Both versions of the text are indexed

The Digital Omnibus, Regulation (EU) 2026/1744, amended the Act on 27 July 2026 and moved two of the three compliance deadlines. A system reading only the original text answers deadline questions confidently and wrongly.

Indexing the original alongside the amended text turns a staleness bug into an observable property: an answer that changed between versions can say so and show which citation moved. That covers data freshness with a real amendment rather than a hypothetical one.

### The evaluation is the deliverable, not a feature of it

The harness answers the same question set three ways: full-context stuffing, vector retrieval alone, and vector retrieval plus reference traversal. It reports accuracy and cost per arm.

This inverts the usual order because the premise demands it. The Act is 90 483 words and roughly 145 000 tokens, which fits a current context window, so a model can read the whole document and answer from it. Measured at 43d4ead on 2026-09-05. Prompt caching removes most of the per-query cost argument on a fixed corpus. Retrieval is therefore not obviously justified here, and a pipeline shipped without the comparison is one nobody can defend.

Faithfulness is the metric that carries the most weight. Retrieval can be correct while the synthesized answer drifts from what was retrieved, and on a legal corpus that drift is the failure mode with consequences.

Cut a retrieval arm before cutting the eval.

### Full-context stuffing is a first-class arm, not a straw man

The baseline gets the same corpus, the same questions, and prompt caching where the provider offers it. Weakening it would make the comparison worthless.

Two things survive if the baseline wins on accuracy, and both are worth stating rather than hiding. Retrieval means the exact passages sent are known, so a citation can be checked against them programmatically rather than trusted. And the technique matters one size up: this document fits a context window, while a national implementation plus guidance plus standards plus case law does not.

### Three production concerns are built, four are reasoned about

Cost and token control, failure modes, and data freshness are implemented. Prompt injection, latency, observability and CI are designed for and documented, not built.

The window does not fit all seven at a quality worth showing, and thin coverage of seven is worse than three that hold. Which four were cut and why is itself part of the record.

## Risks / open questions

- **Vector store.** Undecided. `sqlite-vec` keeps the whole system in one file and has been shipped before. `pgvector` costs a service and buys operational realism.
- **Graph representation.** Undecided. An in-process graph over parsed references may be sufficient at the Act's scale, which is hundreds of articles rather than millions of nodes. A graph database would be more legible as an architectural claim and more expensive to stand up.
- **Chunking strategy.** Legal text has natural units, since an article or a numbered paragraph is a coherent span. Whether article-level chunks retrieve better than fixed-size windows is unmeasured, and the eval harness is what should decide it.
- **Frontend scope.** A chat surface with a citation panel is the minimum. Whether the reference graph is visualized is open and depends on time remaining.
- **Prompt injection surface is narrower than it first appears.** The corpus is trusted public law. The untrusted input is the user's own system description. Worth defending, not worth overstating.
- **Hosting.** Undecided, and gated on the vector store choice.
