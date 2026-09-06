# Architecture

Authoring guidance: the architecture standard.

## Overview

A retrieval system over one corpus, the consolidated EU AI Act, where the corpus carries its own link structure and the answers have to be traceable.

Five stages in request order. A plain-language system description arrives at a web frontend and reaches a Python service. An agent routes the question, retrieves candidate passages by meaning, walks the Act's cross-references outward from those passages, synthesizes an answer citing what it read, and verifies each claim against the retrieved text before returning it. A claim that cannot be grounded is dropped, and a question left unsettled by the text returns a refusal instead of an answer.

The graph and the vector index are two views of the same corpus rather than two systems. Semantic search finds where to start. Traversal finds what that start point depends on.

## Key technical decisions

### The reference graph is parsed, not extracted

The Act ships as structured legal text with numbered articles, annexes and recitals, and its cross-references are written into the sentences themselves. That makes the graph a parsing job over an explicit reference structure rather than an extraction job handing text to a model and trusting what comes back.

Parsing wins twice. It is roughly a day cheaper than model extraction, and it is checkable: a parsed edge either matches a reference in the text or it does not, where an extracted edge is only ever as good as the extraction. The Official Journal text carries 113 articles, 13 annexes and 180 recitals, and the text consolidated at 2026-07-27 carries 119 articles, 14 annexes and no recitals. The shipped predicate yields 523 reference edges on the first and 607 on the second. An earlier figure of 518 phrases appears in the record with no rule attached and no rule reproduces it, so it is retired rather than carried. Measured at 2c74d20 on 2026-09-06. On a corpus whose whole value is traceability, a graph nobody can verify would undercut the thing being built.

### The whole Act is ingested, and only the demo question is narrowed

An early proposal cut the corpus down to Article 50, on the grounds that the high-risk obligations were postponed. That confuses two things. The postponement changes when obligations bite. It removes no cross-reference from the text.

The reference structure is what the graph is built from, and the richest chain in the Act runs from Article 6 to the obligation articles and on to conformity assessment. Traversal reaches all eight obligation articles and Article 43 from Article 6 in two hops, in both versions. It does not pass through Annex III, which cites only Article 6 and Article 6(2), so the chain is a reachability claim rather than the four-hop route the earlier wording drew. Measured at 2c74d20 on 2026-09-06. Cutting the corpus to one article would remove the only part of the text where traversal visibly beats semantic search, and parsing every article costs nothing over parsing one.

### Refusal is a feature, not a safety net

The system reports which articles to read. It does not say whether an organization complies. Where the text genuinely leaves a question open, it says so and names what is missing.

This is a product decision before it is a safety one. A tool that always answers is indistinguishable from a tool that guesses, and on a legal corpus the cost of a confident wrong answer is the whole downside. Grandfathering is the worked example: systems already on the market before the amended deadlines fall outside full high-risk compliance unless later substantially modified, and no regulator has defined that threshold. The text does not settle it, so neither does the system.

The decision stands, the cause of the gap is named, and the retrieval half of it is still open. The recorded evaluation put three questions the text does not settle to each arm on each version, which is eighteen chances to refuse correctly, and the arms took five, every false refusal by a retrieval arm landing on the version-comparison flow. That flow was not a refusal defect. `ROUTE` asked for the obligations a description touches and got exactly that, so a question about when an obligation applies had its timing discarded, and Article 113, the only article in either version carrying the compliance dates, was never searched for. Replaying the refusing runs put every one of them at the declared `REFUSE` marker, and one named Article 113(3), point (a) as the text it had not been handed. The prompt asks for the timing now as well. Refusing was never the sharper half: three recorded runs answered a deadline question out of provisions carrying no date and scored as successes, so a fourth refusal exit drops a timing answer whose statements give no date their own citations carry, which caught the one replayed run that had crossed from refusing into answering. Retrieval did not follow the prompt. On the consolidated text the shipped embedder moves Article 113 from rank 338 of 587 to 109 on the high-risk deadline and from 438 to 185 on the general-purpose one, against a search that takes twelve, and neither question clears it on any model or version measured. On the original text it stays past rank 360 on both, which is the footnote apparatus that parse swallows rather than anything a prompt reaches. Walking the same searched sets splits that by model: the high-risk deadline question reaches both its provisions on the candidate embedder and loses Article 113 on two questions on the one that ships today, which is a result top-12 search recall cannot show and `.claude/context/retrieval.md` carries. What is left is the embedder in front of the graph, and the chunking risk below owns it. Measured on #6 on 2026-09-06.

### Both versions of the text are indexed

The Digital Omnibus, Regulation (EU) 2026/1744, amended the Act on 27 July 2026 and moved two of the three compliance deadlines. A system reading only the original text answers deadline questions confidently and wrongly.

Indexing the original alongside the amended text turns a staleness bug into an observable property: an answer that changed between versions can say so and show which citation moved. That covers data freshness with a real amendment rather than a hypothetical one.

### The evaluation is the deliverable, not a feature of it

The harness answers the same question set three ways: full-context stuffing, vector retrieval alone, and vector retrieval plus reference traversal. It reports accuracy and cost per arm.

This inverts the usual order because the premise demands it. The Act fits a current context window, so a model can read the whole document and answer from it. Both versions were put through `qwen3.8:27b` and the token counts read back off it rather than estimated: the original is 581 082 characters over its articles, annexes and recitals and comes back as **114 720 prompt tokens**, and the consolidated is 384 515 characters and **77 040**. Both sit inside the 131 072 this machine can hold GPU-resident, so the baseline arm is not constrained on either side. Prompt evaluation alone took 83 seconds and 35 seconds. Measured at 2c74d20 on 2026-09-06. Prompt caching removes most of the per-query cost argument on a fixed corpus. Retrieval is therefore not obviously justified here, and a pipeline shipped without the comparison is one nobody can defend.

The figure of roughly 145 000 tokens this entry used to carry was 582 489 characters divided by four, an estimate nobody had checked. The real ratio is 5.07 on the original and 4.99 on the consolidated. Recording the correction rather than deleting the claim, because the same bad ratio also decided an early version of the chunking rule.

Faithfulness is the metric that carries the most weight. Retrieval can be correct while the synthesized answer drifts from what was retrieved, and on a legal corpus that drift is the failure mode with consequences. It is scored as span containment against what the model was supplied rather than against what its claims cite, since the second is already enforced by the grounding check and would report the threshold back rather than the arm. What that measure cannot do is compare arms without its denominator beside it, because an arm supplied with the whole document is matched against the whole document's vocabulary.

The harness is built and has been run, and the baseline won. Over 72 runs: full context reached every gold provision, search alone reached 0.41 and 0.46 of them, and search plus traversal 0.54 and 0.56. Measured at f6a33c8 on 2026-09-06. Retrieval's case on this corpus is cost and checkability rather than accuracy. `docs/evaluation.md` carries the numbers and `python/data/eval/results.json` carries the run they were rendered from, including the provision ids each arm searched, traversed and dropped on every question. This entry keeps the decision and that document keeps the numbers, so a figure moves in one place.

One claim above needs qualifying against that run rather than deleting. Traversal reaching every obligation article and Article 43 from Article 6 in two hops is a property of the graph, asserted by `python/tests/corpus/test_graph.py` and still true. It is not a property of the pipeline, which has to retrieve Article 6 before it can walk from it, and on most of the question set search did not. A walk cannot recover an entry point retrieval never found, so the third arm is capped by the second and the bottleneck is the embedder rather than the graph.

Cut a retrieval arm before cutting the eval.

### Full-context stuffing is a first-class arm, not a straw man

The baseline gets the same corpus, the same questions, and prompt caching where the provider offers it. Weakening it would make the comparison worthless.

Two things survive if the baseline wins on accuracy, and both are worth stating rather than hiding. Retrieval means the exact passages sent are known, so a citation can be checked against them programmatically rather than trusted. And the technique matters one size up: this document fits a context window, while a national implementation plus guidance plus standards plus case law does not.

### Four production concerns are built, three are reasoned about

Cost and token control, failure modes, data freshness and CI are implemented. Prompt injection, latency and observability are designed for and documented, not built.

This entry used to read three and four, and v0.4 moved CI across by shipping the workflow. The split is recorded rather than corrected in place, because which concerns were cut and why is itself part of the record and a heading that quietly renumbers loses that.

The window does not fit all seven at a quality worth showing, and thin coverage of seven is worse than four that hold. `docs/evaluation.md` carries the per-concern account, being what each one would have cost and what standing in for it looks like.

## Risks / open questions

- **Vector store. Settled: `sqlite-vec`.** Exercised on this interpreter rather than assumed, which is the check `networkx` failed. `sqlite_vec` 0.1.9 loads on Python 3.14.1, `vec_version()` returns `v0.1.9`, and a `vec0` virtual table over `float[768]` is created against SQLite 3.50.4. The shipped index holds 716 chunks of the original and 587 of the consolidated in one file at `python/data/index/annex.db`, which is derived and gitignored. `pgvector` costs a service and a connection string for operational realism nobody exercises inside this window. Measured at `2c74d20` on 2026-09-06.
- **Graph representation.** Settled by measurement rather than by preference. `networkx` declares `requires_python: !=3.14.1` against this project's pinned 3.14, so it cannot be imported at all, and the graph is a plain in-process adjacency map over parsed references. At hundreds of articles and hundreds of edges that carries the two operations this project needs, a bounded walk and a reverse lookup. A graph database stays unjustified at this scale.
- **Chunking strategy. Partly settled, and the open half is still open.** The embedder decided the rule before retrieval taste could: `nomic-embed-text` holds 2048 tokens and truncates over-length input silently, and article-level chunks do not fit, so a paragraph is a chunk, a provision carrying no paragraph is a chunk, and a chunk still over budget splits on its own `(n)` points. That covers 712 provisions in the original and 585 in the consolidated. The budget was set from real token counts read off the embedder rather than from the document-wide 5.03 characters a token, since the real ratio runs 3.13 to 6.43. `.claude/context/retrieval.md` carries the figures. What remains open is the question this entry originally asked, whether these units retrieve better than fixed-size windows. The eval harness now exists to decide it and has not been pointed at it, but it has narrowed where the answer matters: search alone reached 0.41 and 0.46 of the gold provisions across twelve questions, which is the ceiling every downstream stage inherits. Whatever is wrong is in front of the graph rather than behind it, and the embedder was chosen for its context limit rather than compared against an alternative, so swapping `nomic-embed-text` is the cheaper experiment to run first. `store.py` fixes the vector width at 768, so a 1024-dimension model costs that constant and an index rebuild. Measured at f6a33c8 on 2026-09-06.
- **Frontend scope. Settled by looking rather than by reasoning.** Three layouts were rendered side by side, varying only where citations sit, and inline under each claim won. Proximity never breaks, and the requirements make visible source text what separates this from a chatbot. The cost is measured: inline spreads three claims over 471px against a right rail's 216px, and apparatus weight brings that to 356px. The reference graph is not visualized, closing the question this entry left open. Both themes ship. `.claude/wireframes/answer.md` carries the layout, `.claude/DESIGN.md` the tokens. Measured at `b08b598` on 2026-09-06.
- **Prompt injection surface is narrower than it first appears.** The corpus is trusted public law. The untrusted input is the user's own system description. Worth defending, not worth overstating.
- **The service meets the server-security bar except on transport, and the gap is stated rather than silent.** `.claude/rules/canon/lib/360-security-server.md` asks for a bounded body, a bounded request, and a CORS origin list that is never reflected and never a wildcard. All three ship. TLS does not: the service binds to `127.0.0.1` for a local demo, where a certificate defends a loopback hop against nobody and costs a trust store on every machine. Authorization and rate limiting are not gaps but absences, since accounts are deferred in `.claude/REQUIREMENTS.md` and one card holds one model, so concurrent asks queue inside Ollama rather than multiplying cost. What a deployment off loopback has to add is TLS, and nothing in the code will notice on its own. `.claude/context/service.md` carries the endpoint's own record.
- **Hosting.** Undecided. The gate is released: the vector store settled as `sqlite-vec`, so the index is a file that travels with the deployment rather than a service to stand up beside it. What remains open is where the model runs, since nothing hosted answers this project's questions for free and the local one holds 30 GB of a card.
