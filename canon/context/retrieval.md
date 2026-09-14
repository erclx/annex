---
title: Retrieval
description: How the Act is chunked, embedded, searched and traversed, the model capacity that bounds it, and the measurements each decision rests on
---

# Retrieval

## Overview

Owns the path from a plain-language system description to a set of provisions:
chunking the corpus into units the embedder can read whole, embedding them into
a `sqlite-vec` index, searching one version by meaning, and walking the Act's
own citations outward from what search returned.

The corpus and its reference graph are the CI entry's neighbours rather than
this one's. This entry starts where `annex.corpus` stops.

Every figure below was read off the shipped modules rather than estimated,
and each names the specific model it belongs to rather than "embedding" in
general, since a figure is a property of one model's tokenizer and
dimensions rather than of embedding as a technique.

## Layout

- `python/src/annex/retrieval/` owns chunking, embedding, the vector store, search and traversal
- `python/src/annex/llm/` owns the client that talks to Ollama, including the embedding-prefix table
- `python/tests/retrieval/` owns the chunk, embed, store and traversal tests, including the `live` token-count check

## The chunk rule

Three lines, in order:

1. A paragraph is a chunk
2. A provision carrying no paragraph is a chunk, which covers every annex,
   every recital, every chapter heading (13 in each version), and the 19
   articles in each version no paragraph parses out of
3. A chunk still over the budget is split on its own `(n)` point markers

| Version      | Provisions covered | Chunks after splitting | Split provisions |
| ------------ | ------------------ | ---------------------- | ---------------- |
| Original     | 725                | 727                    | `art_3`          |
| Consolidated | 598                | 600                    | `art_3`          |

Provisions covered is the figure that survives a change to the budget, and it
is what a count check should assert. Chunks after splitting moves whenever the
budget does. `art_113` parses to 535 characters holding only the compliance
dates, since `annex.corpus.parse_oj` ends the article before the Official
Journal's signature block and its footnotes. Measured at this branch on
2026-09-14.

## The budget is set from the embedder, not from a ratio

Both embedding models this project has run report a 2048-token context, so a
chunk budget set for one holds for the other. `snowflake-arctic-embed2` declares
8192 and Ollama serves 2048 of it, at 1024 dimensions. `nomic-embed-text`
declares and serves 2048, at 768. Over-length input comes back looking
successful under either: measured on 2026-09-06, an input past the limit
returned a full-width vector and `usage.prompt_tokens` of exactly 2048, with
no error. A chunk that overflows is a silent quality loss.

The declared 8192 is not reachable from here. A model serving its full
declared context would fit every article whole and drop the index from 727
and 600 chunks to 113 and 119, which is a different corpus unit and its own
comparison. Reaching it needs a Modelfile for the embedder, the way
`annex-qwen3-27b` reaches its window.

The document-wide ratio of 5.03 characters a token is an average and is wrong
per provision in both directions. Measured across every chunk of both versions
under `nomic-embed-text`, the real ratio runs from **3.13 to 6.43**. So:

- At a budget of 8000 characters the widest chunk measured **2007 tokens** of
  the 2048 available, which is 41 tokens of headroom on a limit that truncates
  in silence
- At 6000 the widest measures **1680**, and that is the shipped value of
  `CHARACTER_BUDGET`

The budget is a split trigger and not a guarantee. Two annexes in each version
carry no `(n)` markers to split on and stay above it whole, at 1462 and 1399
tokens. `annex.retrieval.embed` is what refuses an over-length chunk, because
only the embedder knows the real count, and `tests/retrieval/test_chunk_tokens.py`
measures every chunk against it under the `live` marker.

### A swap re-measures the ratio rather than inheriting it

Those token figures belong to `nomic-embed-text`. A model swap re-measures the
ratio rather than assuming it carries across: under `snowflake-arctic-embed2`
the widest of 716 and 587 chunks reached 1586 and 1615 tokens, densest at
3.21 and 3.20 characters a token, so `CHARACTER_BUDGET` holds at 6000 and the
live gate passes unchanged. The chunk count has since grown to 727 and 600
provisions, and the widest and densest chunk under that count is unmeasured.

The `limit * 3` screen in `_refuse_truncated` rests on that density rather than
on arithmetic. Nothing shorter than three characters a token can reach the
limit, and both models measured sit above three, so the screen is a
tokenizer-specific floor that a denser model would move.

### The embedder was the untested part of the stack, and the test moved it

`snowflake-arctic-embed2` is the shipped embedder. A five-model comparison
across both documents, on the routed query the shipped pipeline actually
sends, ranks it first: 0.5177 and 0.6591 recall on the original and
consolidated text, ahead of `bge-m3` at 0.4747 and 0.5770, a no-prefix run of
the same model at 0.4899 and 0.5745, `mxbai-embed-large` at 0.4141 and
0.5846, `nomic-embed-text` at 0.4116 and 0.4571, and the 23-million-parameter
`all-minilm` floor at 0.3990 and 0.4697. `bge-m3` loses despite needing no
query prefix at all, since `snowflake-arctic-embed2` still beats it by 0.04
on the original and 0.08 on the consolidated, and it misses `art_6` and
`anx_III` on `q06`. `mxbai-embed-large` beats the shipped model on the
consolidated text alone, while failing to read 52 of 1303 chunks whole at its
native width. `snowflake-arctic-embed2` beats `nomic-embed-text` by 0.106 on
the original and 0.202 on the consolidated: search alone reaches 0.41 and
0.46 of the gold provisions under `nomic-embed-text` against 0.61 and 0.71
under `snowflake-arctic-embed2`, and every later pipeline stage inherits that
ceiling, so an embedder short of recall sits in front of the graph rather
than behind it.

On the built index at `search_k` 12, searching the raw description rather
than a routed query, over the nine questions carrying a gold set:

| Model                     | Original recall | Consolidated recall |
| ------------------------- | --------------- | ------------------- |
| `snowflake-arctic-embed2` | 0.475           | 0.475               |
| `nomic-embed-text`        | 0.288           | 0.273               |

Both figures come from one index build apiece and one scoring pass, so the
gain is **+0.187 and +0.202** on identical footing. Read them against each
other rather than against the pipeline numbers below, which search a routed
query and average over all twelve questions.

Read the query form before comparing this table to the benchmark's. Searching
the raw description, `q06-worker-promotion` returns neither `art_6` nor
`anx_III` inside the top 12 on either version under either model. The benchmark
scored the routed form instead and found both, so the two results measure
different queries rather than disagreeing, and the routed form is the one the
pipeline sends. The run below records its routed query per row, which is what
lets the next reader check that rather than re-derive it.

`annex.retrieval.store` fixes the shipped width at `DIMENSIONS`, now 1024, and
`write` takes the width as a keyword so a sweep can hold tables of several
widths in one file without restating `connect`, `_pack` and the `vec0`
statement. Nothing else in the pipeline reads the width.

Comparing the next candidate is cheap, and a bad estimate is what delayed this
one for as long as it went unmeasured. A scored search sweep is 24 query
embeddings and 24 index lookups, never calls the generation model, and finishes
in under a second. An `annex evaluate` arm costs about 350 seconds. Anyone
sizing the next embedding comparison wants the first number rather than the
second.

## The task prefixes belong to the model, not to embedding

An embedding model puts a corpus passage and a question into different regions
of one space, and a prefix is what tells it which of the two it is reading.
Omitting the prefix raises no error and costs retrieval quality silently.

Which prefix is a fact about one model's training. `annex.llm.client` therefore
keys the pair by model name and `embedding_prefixes` resolves it, dropping any
tag so that `snowflake-arctic-embed2:latest` and the untagged name reach one
entry.

| Model                     | Document side       | Query side       |
| ------------------------- | ------------------- | ---------------- |
| `snowflake-arctic-embed2` | none                | `query: `        |
| `nomic-embed-text`        | `search_document: ` | `search_query: ` |
| Anything unlisted         | none                | none             |

An unlisted model embeds unprefixed, and `verify_embedding_context` warns once
per process naming it. Refusing outright would block the one workflow that
measures a candidate model, which is pointing the CLI at it.

Measured over the consolidated text under `nomic-embed-text`, the question "a
chatbot that talks to customers on our website" ranked its best Article 50
chunk **27th of 587** without that model's prefixes and **5th** with them.
Sending one model's pair to another is the quiet failure: the groundwork
measured it at 0.10 and 0.12 of recall across the two versions. A width
mismatch is the loud one, since `vec0` refuses a vector that is not the table's
width, so the pair is the half that needs a test rather than a stack trace.

## Routing exists because the vocabulary gap is measurable

The same index, the same 587 chunks, two spellings of one question:

| Query                                                                                        | Where Article 50 lands             |
| -------------------------------------------------------------------------------------------- | ---------------------------------- |
| "a chatbot that talks to customers on our website"                                           | `art_50.3` at rank 5               |
| "transparency obligations for AI systems intended to interact directly with natural persons" | all seven paragraphs, ranks 1 to 7 |

The gap is vocabulary rather than meaning, and the agent's route node is what
closes it. That is the whole argument for spending a model call before the
search rather than searching the user's words directly.

Measured retrieval and traversal results for `art_113` and the deadline
questions live in `docs/evaluation.md` rather than here, alongside the rest
of the harness's per-question figures.

Reaching `art_6` by traversal is not the same as searching it: `q05` for
`snowflake-arctic-embed2` on the original text reaches `art_6` at depth 2 and
still drops from 0.91 to 0.36, because a provision the walk arrives at is
where the walk stops rather than somewhere it continues from. This scores
what the walk reaches rather than what a prompt would carry, since the
budget that trims a real prompt needs the provision text and a generation
window.

## Traversal walks citation edges only

No Chapter or Section membership edges. The decisive fact is that they do not
exist and cannot be added from inside retrieval: `ProvisionKind` is `article`,
`annex`, `recital`, `paragraph`, and neither parse adapter reads a Chapter or a
Section heading. Adding membership is ingest work reopened under a retrieval
task.

The case on merit runs the same way. From `art_6` at depth 2, both versions
reach every one of `art_8` through `art_15`, plus `art_43` and `anx_III`.
Chapter III entire would add `art_16` through `art_27`, which nothing on that
route cites, so it is width with no measured recall behind it. Revisit only if
the evaluation reports a recall miss that traces to structure.

| Depth | Original reached | Consolidated reached |
| ----- | ---------------- | -------------------- |
| 1     | 8                | 8                    |
| 2     | 43               | 51                   |
| 3     | 98               | 123                  |
| 4     | 130              | 163                  |

Depth 2 and a cap of 40 are the shipped defaults, so the cap bites gently at
the demo's own worst case rather than never. Both are `Settings` fields and the
evaluation is what should move them.

Re-walking the seeds the search-only arm recorded, recall runs 0.78, 0.89 and
0.89 for depths 1, 2 and 3 on the original text, and 0.82, 0.85 and 0.85 on
the consolidated. Depth 3 buys nothing on either document while sending four
more nodes on the original: a walk starting from the right provisions reaches
the chain at depth 2 and has nowhere further worth going. Depth 2 ships on
the measurement rather than on cost alone. Measured at v0.9.

### Traversal is capped by the prompt budget

The table above is a property of the graph and not of the pipeline. Reaching
every obligation article from `art_6` requires `art_6` among the seeds, and
search has to return it first. On `q06-worker-promotion`,
`snowflake-arctic-embed2` returns `anx_III` and `art_6.3`, `traverse` lifts
the paragraph to `art_6`, and the walk reaches `art_10` through `art_15` and
`art_43`. The question scores 0.27.

Every one of those obligation articles is in `dropped_ids`.
`Pipeline._within_budget` trims from the far end until the prompt fits the
window, and 40 traversed provisions of legal text do not fit 32 768 tokens at
2.6 characters a token. Across the whole set the walk lifts recall from 0.61 to
0.74 on the original and 0.71 to 0.81 on the consolidated, while precision over
nodes falls from 0.236 to 0.170. Scored against everything the walk reached
before the budget cut it, the arm makes 0.89 on the original rather than 0.74.

**The ceiling on traversal is the prompt budget.** The 0.15 between those
two figures is what retrieval found and the model never saw, and it lands
entirely on the three high-risk chain questions: `q04` scores 0.18 against 0.82
reached, `q05` 0.09 against 0.36, `q06` 0.27 against 0.82. Read 0.89 as a
diagnosis rather than an achievable score, since a prompt carrying all of it
would truncate mid-answer. `python/tests/corpus/test_graph.py` still asserts the
graph half and still passes. Measured on 2026-09-07 over 72 runs.

### The budget spends on recitals search returned, not on what the walk added

`_within_budget` sorts every citation by `(kind is RECITAL, position)` before
its greedy fill, so a recital sits behind every article, annex and paragraph
the walk reached and spends only the budget nothing else wants. `_citations`
builds its list in arrival order, search hits then traversal, nearest first,
so without that sort a recital search returned would spend the budget before
an obligation article the walk had already found got a turn. On `q04`, `q05`
and `q06` of the original text, recitals are 8 to 10 of the 12 search hits and
0 of the 40 traversed provisions, so the sort only ever displaces search's
own recitals, never the walk's.

The sort only matters on the original text, since the consolidated text
carries no recitals to reorder and its 0.81 recall is unaffected. On the
original, mean recall for the arm is 0.83, against the walk's own 0.89
ceiling. `q04-cv-screening` reaches 0.73 and `q06-worker-promotion` 0.73,
both by keeping `art_10` through `art_15`, which an unsorted recital would
otherwise crowd out. `q05-university-admission` sits at 0.18, since search
never returns `art_6` there and no ranking fix delivers a provision the walk
never reached.

`art_43` still drops on both `q04` and `q06`, and `art_8` and `art_9` never
enter either question's traversed set at all, excluded by the 40-node cap
before the budget ever runs. Sorting recitals behind the walk's own finds
does not guarantee every gold provision now fits, and recall short of the
walk's own reach is a cap question rather than a ranking one. Measured at
this branch on 2026-09-08, over 72 runs.

## A paragraph seed is lifted to its article before the walk

Chunks are paragraphs, so search returns ids like `art_50.1`. The reference
extractor sources edges from articles, annexes and recitals only, and an
article's parsed text already contains its paragraphs, so every citation
written inside `Article 50(1)` is attributed to `art_50`. **Not one of the 500
paragraphs of the original carries an outgoing edge.**

Walking from a paragraph without that lift reaches nothing, which is
traversal silently doing no work on exactly the results search returns.
`annex.retrieval.traverse` lifts a paragraph seed to its holding article and
enters it at distance zero, so the cap keeps it ahead of anything a hop away.
The lift lives there rather than in `annex.corpus`, which this side reads
rather than reshapes.

## The walk reports the edge it took to each provision

`_distances` keeps the provision it walked from at the moment it enqueues a
target, so `Expansion` carries which edge reached each provision rather than
two flat id tuples with nothing about how they connect. A provision is
marked `seen` the moment it is first discovered, so it is reported through
exactly one edge regardless of how many other provisions cite it, and a
dropped provision still carries its edge since the budget marks it rather
than removing it from the trace.

The paragraph-to-article lift above is also an edge, from the seed to the
article it sits in, carried at hop 0. It is the one edge in the drawing that
is not a citation, since nothing in the text points from a paragraph to its
own article.

Measured at `2d2abc6` on 2026-09-08 by rebuilding both reference graphs from
the committed corpus HTML and reading the twenty-four committed fixtures
against them:

| Quantity                                       | Original | Consolidated |
| ---------------------------------------------- | -------- | ------------ |
| Provisions an answer carries, median           | 52       | 52           |
| Reference edges among those provisions, median | 87       | 99           |
| Edges the walk itself took, at the cap         | 40       | 40           |

Drawing every reference edge among the 52 provisions a median answer carries
gives 93 edges at the median, a hairball rather than a walk. Drawing only the
edge the walk took to reach each provision gives exactly one edge a traversed
provision, so 40 at the cap, which is what `RetrievalTrace.edges` now carries
and what `web/src/components/answer/walk-chips.tsx` lays out, one row per search result.

## The synthesis prompt is bounded against the window

The prompt grows with `search_k` and `traversal_cap`. The window does not, so
without a bound the two eventually meet and the model stops writing at the
context boundary rather than at its budget, mid-word, returning a cut draft
that parses as a finished answer, missing whatever obligations it had yet to
reach.

Measured in PR #2, seeded on Article 6's paragraphs of the consolidated
text: traversal returns 51 provisions, which assemble to 137 759 characters and
read back as 29 154 prompt tokens, leaving under 3 700 of a 32 768 window to
answer in. Whether that run truncates depends on how long the answer runs, and
the answer to a high-risk question is long.

`Pipeline._within_budget` drops from the far end of `Expansion.provision_ids`,
which is search first and then traversal ranked nearest first, so a budget that
bites removes the furthest-traversed provisions and keeps what search matched.
The same seed after bounding is 35 provisions, 69 755 characters and 15 651
prompt tokens.

The bound is set at 2.6 characters a token rather than at the document-wide
5.07. Measured over 20 provisions of the consolidated text against
`annex-qwen3-27b`, the per-provision ratio runs from 2.61 on `anx_I`, dense with
legislation numbers, to 5.33 on `anx_VII`. Budgeting a 40-provision prompt at
the average asks for twice the window whenever the retrieved text lands on the
dense end.

`Completion.is_truncated` is the second half of it. The client reads
`finish_reason` back and separates the two limits: hitting the generation budget
is a warning, and hitting the window is an error naming the prompt that left no
room to answer in.

### A budget cut gets one retry before it refuses

A cut at the budget and a cut at the window read identically to `parse_draft`:
a draft with an unclosed thinking block and no line left to cite. `q04-cv-screening`
and `q09-wider-rollout` on the consolidated text both stopped this way, at the
4096-token `SYNTHESIS_BUDGET` with the thinking block still open, and reached
the answer's fallback refusal exit rather than the answer they had carried in
an earlier recording.

`annex.llm.hit_the_window` tells the two limits apart from outside the client,
reusing the arithmetic `_report_a_cut` already carries rather than repeating
it. `Pipeline._synthesize` retries once when a cut hit the budget rather than
the window, re-asking the same prompt with `max_tokens` set to whatever the
window has left: `generation_context - completion.prompt_tokens - WINDOW_MARGIN`.
Both calls' tokens land on the trace, and `truncated` reads off the second
call. A window cut is not retried, since a larger budget buys it nothing.

A draft still cut and still citing nothing after the retry refuses with
`CUT_DRAFT_REASON`, naming the cut, rather than the fallback's "the model
produced no statement resting on a retrieved provision," which is a different
failure and the wrong one to report against a draft that never finished.

A probe raising `SYNTHESIS_BUDGET` to 8192 for `q04-cv-screening` on the
consolidated text finishes at `finish_reason=stop` after 2413 completion
tokens with the thinking block closed, confirming the room the retry's
window leaves is enough rather than tuning a prompt against one question.
Measured on this branch on 2026-09-12.

Both halves reach the answer rather than only the log. `RetrievalTrace` carries
`dropped_ids`, naming the provisions the budget cut, and `truncated`, saying the
model stopped for want of room. The first is what a scorer cannot infer:
`traversed_ids` names what traversal reached, and crediting traversal for all of
it without subtracting what the budget cut credits it for text nothing read. On
the Article 6 seed that is 16 of 51 provisions. Ids rather than a count, because
the scorer resolves them, and the same field is what should say whether 2.6
characters a token is too conservative, since the bounded run spends 18 229 of a
32 768 window.

## Verification is lexical, not a second model call

A model asked whether its own output was faithful mostly says yes, and a
verification step that agrees with whatever it is shown is worse than none,
because it reports a guarantee it does not provide. So `annex.agent.verify`
compares a claim's content words against the text of the provisions it cites
and drops the claim where the share falls below `GROUNDING_THRESHOLD`, shipped
at 0.6.

`shall` and `must` are in the stopword set precisely because legal text is
saturated with them, so keeping them would ground almost any
obligation-shaped sentence against almost any provision.

An answer emptied by verification becomes a `Refusal` carrying the citations
that were read, which is a return value rather than an exception.

## How `num_ctx` reaches the model

Measured on 2026-09-06 against Ollama 0.33.1, on `gemma2:9b` and on
`qwen3.8:27b`, by sending an over-length prompt and reading `prompt_tokens`
back alongside `context_length` from `/api/ps`:

| Route                                                       | Honoured |
| ----------------------------------------------------------- | -------- |
| `/v1` with `extra_body={'options': {'num_ctx': n}}`         | No       |
| `/v1` with a top-level `extra_body={'num_ctx': n}`          | No       |
| Ollama's native `/api/chat` with `options.num_ctx`          | Yes      |
| A model built from a Modelfile carrying `PARAMETER num_ctx` | Yes      |

The `/v1` route accepts the `options` block and discards it, with no error and
no change to what the runner loaded. `canon/context/development.md` fixes the
transport as the OpenAI SDK against `/v1`, so the Modelfile is the route taken.
`python/ollama/annex-qwen3-27b.Modelfile` is the tracked artifact,
`python/scripts/ollama-build.sh` builds it, and `OllamaClient.verify_context`
reads the parameter back so a model nobody rebuilt fails loudly rather than
truncating.

The same measurement found that an over-length prompt truncates to roughly
half the context rather than to the whole of it: at 8192 a 12 800-token
prompt came back as 4099 tokens, and at 2048 as 1027. A prompt that fits is
unaffected.

## Local model capacity

- `qwen3.8:27b` is Q4_K_M at 17.9 GB, trained context 262 144, 27.3B parameters
- The Ollama server on this machine runs with `OLLAMA_CONTEXT_LENGTH=131072`,
  which is why the whole document fits without a per-call setting. This project
  does not rely on it: a machine-level environment variable is not a property
  of this code
- Loaded at 131 072 the model holds 29.9 GB of a 32.6 GB card, so nothing else
  can use the GPU at the same time
- **Both versions fit that window.** The original is 581 082 characters over
  its articles, annexes and recitals and comes back as 114 720 prompt tokens.
  The consolidated is 384 515 characters and 77 040. Prompt evaluation alone
  took 83 seconds and 35 seconds
- `annex-qwen3-27b` is built at 32 768 rather than the ceiling. The agent sends
  a retrieval result rather than the whole Act, and the evaluation's
  full-context arm is what needs the window
- `snowflake-arctic-embed2` is the shipped embedder, a 566.70M-parameter BERT
  at 1.2 GB, declaring 8192 of context and serving 2048, at 1024 dimensions
- `nomic-embed-text` is 137M with a 2048 context and 768 dimensions

## Recitals are embedded for the original and cannot be for the consolidated

The original carries 180 recitals and the consolidated carries none, so a
claim resting on a recital cannot be cited at all in the amended text. They are
indexed anyway: 34 559 words of the original's interpretive reasoning is a large
thing to discard, and the index is per version, so the asymmetry is visible in
the trace rather than hidden inside one shared table.

## Gotchas

- **The index is derived and gitignored.** `python/data/index/` is rebuilt by
  `uv run python -m annex embed`, which needs Ollama. A fresh clone has no index
  and `search` says so by name rather than failing on a missing table. The
  rebuild took **27.3 seconds** over 716 chunks of the original and 587 of the
  consolidated under `snowflake-arctic-embed2`, with the corpus cache warm and
  the model cold, against 10.6 seconds under `nomic-embed-text` with that model
  already resident. Neither figure is the other's cold or warm counterpart, so
  read the gap as two models rather than as a slowdown. The chunk count has
  since moved to 727 and 600, and a rebuild under the current count is
  unmeasured under either model.
- **One writer, four readers.** `embed` writes the index, and `search`,
  `traverse`, the agent and the evaluation read it. A rule about chunk ids or the
  per-version table has to hold for the writer as well as the reader that
  prompted it
- **A chunk id is not always a provision id.** A split chunk is `art_3#0`, and
  `Chunk.provision_id` is what a citation resolves through. Nothing downstream
  should parse the `#`
- **A tightly budgeted generation returns nothing.** The model spends the
  budget inside a thinking block: `num_predict=32` gave 32 eval tokens and an
  empty response. `MINIMUM_GENERATION_BUDGET` is 512 and no caller gets less
- **Routing meets that at 2048, not only at 32.** `Pipeline._route` gives the
  model 2048 tokens and searches the raw description when the completion comes
  back empty. Observed on `q05`: the route prompt's timing paragraph can make
  the completion long enough to come back empty at 2048 tokens, and the
  fallback is what keeps that a quiet loss of routing rather than a failure
- **`live` tests are deselected by default.** `pytest.ini` runs `-m "not live"`,
  so the acceptance tests and the real token counts need `pytest -m live` and a
  running Ollama. CI has neither and skips them
