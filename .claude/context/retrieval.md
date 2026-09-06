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

Every figure below was read off the shipped modules at `2c74d20` on 2026-09-06.

## The chunk rule

Three lines, in order:

1. A paragraph is a chunk
2. A provision carrying no paragraph is a chunk, which covers every annex,
   every recital, and the 19 articles in each version no paragraph parses out of
3. A chunk still over the budget is split on its own `(n)` point markers

| Version      | Provisions covered | Chunks after splitting | Split provisions   |
| ------------ | ------------------ | ---------------------- | ------------------ |
| Original     | 712                | 716                    | `art_3`, `art_113` |
| Consolidated | 585                | 587                    | `art_3`            |

Provisions covered is the figure that survives a change to the budget, and it
is what a count check should assert. Chunks after splitting moves whenever the
budget does.

## The budget is set from the embedder, not from a ratio

`nomic-embed-text` reports a 2048-token context and 768 dimensions. Over-length
input comes back looking successful: measured on 2026-09-06, an input past the
limit returned a 768-dimension vector and `usage.prompt_tokens` of exactly 2048,
with no error. A chunk that overflows is a silent quality loss.

The document-wide ratio of 5.03 characters a token is an average and is wrong
per provision in both directions. Measured across every chunk of both versions,
the real ratio runs from **3.13 to 6.43**. So:

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

### The embedder is the untested part of the stack

`nomic-embed-text` was chosen for its context limit, which is what set the
chunk rule above, and it has never been compared against another embedder. The
v0.6 evaluation makes that the open question worth answering first: search
alone reached 0.41 and 0.46 of the gold provisions, and every later stage
inherits that ceiling, so what is wrong sits in front of the graph rather than
behind it.

`annex.retrieval.store` fixes the vector width at `DIMENSIONS = 768`, so a
1024-dimension model such as `mxbai-embed-large` or `bge-m3` costs that constant
and a full `annex embed` rebuild. Nothing else in the pipeline reads the width.

## The embedding model needs its task prefixes

`nomic-embed-text` puts a corpus passage and a question into different regions
of one space, and it is told which it is reading by a prefix rather than by the
call. Omitting them is not an error and costs retrieval quality silently.

Measured over the consolidated text, the question "a chatbot that talks to
customers on our website" ranked its best Article 50 chunk **27th of 587**
without the prefixes and **5th** with them. `annex.llm.client` carries them, as
`search_document: ` and `search_query: `, and `OllamaClient.embed` takes which
one through its `purpose` argument.

## Routing exists because the vocabulary gap is measurable

The same index, the same 587 chunks, two spellings of one question:

| Query                                                                                        | Where Article 50 lands             |
| -------------------------------------------------------------------------------------------- | ---------------------------------- |
| "a chatbot that talks to customers on our website"                                           | `art_50.3` at rank 5               |
| "transparency obligations for AI systems intended to interact directly with natural persons" | all seven paragraphs, ranks 1 to 7 |

The gap is vocabulary rather than meaning, and the agent's route node is what
closes it. That is the whole argument for spending a model call before the
search rather than searching the user's words directly.

### Article 113 stays out of reach on two of the three deadline questions

`art_113` carries the compliance dates and is the only article in either
version that does. One model reaches it and on one question:
`snowflake-arctic-embed2` returns it inside the top 12 on `q11`, at rank 10 of
587 on the consolidated text before the route prompt asked for timing and rank
9 after. On `q10` and `q12` no model measured returns it at any query form.

Asking for the timing narrows that gap without closing it. On the consolidated
text `art_113` moves from rank 338 of 587 to 109 on `q10` and from 438 to 185
on `q12` for `nomic-embed-text`, and from 266 to 84 and from 385 to 163 for
`snowflake-arctic-embed2`, against a search that takes 12.

The original text is where the gap does not narrow. `art_113` sits between rank
367 and 692 of 716 there on `q10` and `q12` under both routed forms measured,
which is the parse rather than the query: two of the three original-text chunks
under that `provision_id` are the Official Journal footnote apparatus, so the
date-bearing text is diluted before anything embeds it. v0.9 owns both halves,
being the embedder swap and the parse. Measured at 159fd0c on 2026-09-06, over
both documents, both routed query forms and both candidate models.

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

The evaluation has now read them, over twelve questions at v0.6, by re-walking
the seeds the search-only arm recorded. Recall runs 0.49, 0.60 and 0.66 for
depths 1, 2 and 3 on the original text, and 0.57, 0.61 and 0.61 on the
consolidated. Depth 3 is therefore a defensible setting on the original rather
than the waste an earlier reading predicted, and it buys that 0.06 for seven
more nodes. The consolidated pair is identical at 2 and 3 because both hit the
cap of 40, so that row measures the cap rather than the depth. Depth 2 ships on
cost rather than because nothing above it helps.

### Traversal is capped by what search returned

The table above is a property of the graph and not of the pipeline, and the
distinction cost a wrong expectation. Reaching every obligation article from
`art_6` requires `art_6` to be among the seeds, and search has to return it
first. Where search misses the entry point, the walk expands nothing: measured
on `q06-worker-promotion`, search returned neither `art_6` nor `anx_III`, so
traversal recovered neither and the question scored 0.18 against a gold set of
eleven.

Across the whole set the walk lifts recall from 0.41 to 0.54 on the original
and 0.46 to 0.56 on the consolidated, while precision over nodes falls from
0.188 to 0.137. That is a real gain and it does not reach the 1.00 the
full-context arm scores by construction. **The ceiling on traversal is search,
so the reference graph cannot be scored apart from the embedder in front of
it.** `python/tests/corpus/test_graph.py` still asserts the graph half and
still passes.

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

## The synthesis prompt is bounded against the window

The prompt grows with `search_k` and `traversal_cap`. The window does not, so
without a bound the two eventually meet and the model stops writing at the
context boundary rather than at its budget, mid-word, returning a cut draft
that parses as a finished answer, missing whatever obligations it had yet to
reach.

Measured at `6e7d6e0`, seeded on Article 6's paragraphs of the consolidated
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
no change to what the runner loaded. `.claude/context/development.md` fixes the
transport as the OpenAI SDK against `/v1`, so the Modelfile is the route taken.
`python/ollama/annex-qwen3-27b.Modelfile` is the tracked artifact,
`python/scripts/ollama-build.sh` builds it, and `OllamaClient.verify_context`
reads the parameter back so a model nobody rebuilt fails loudly rather than
truncating.

One more thing that route measurement turned up: an over-length prompt is
truncated to roughly half the context rather than to the whole of it. At 8192
a 12 800-token prompt came back as 4099 tokens, and at 2048 as 1027. A prompt
that fits is unaffected.

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
  took 83 seconds and 35 seconds. The 14m37s an earlier record carries is a
  full pass including generation, not the cost of reading the document
- `annex-qwen3-27b` is built at 32 768 rather than the ceiling. The agent sends
  a retrieval result rather than the whole Act, and the evaluation's
  full-context arm is what needs the window
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
  rebuild took 10.6 seconds over 716 chunks of the original and 587 of the
  consolidated, with the corpus cache warm and `nomic-embed-text` already
  resident. A cold figure is unmeasured, and the few minutes this entry and the
  setup step in `.claude/context/development.md` both carried was never measured
  at all
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
  back empty. Observed once on `q05` across three routing passes over the twelve
  gold questions, after the route prompt gained its paragraph asking for timing.
  The fallback is what keeps it a quiet loss of routing rather than a failure
- **`live` tests are deselected by default.** `pytest.ini` runs `-m "not live"`,
  so the acceptance tests and the real token counts need `pytest -m live` and a
  running Ollama. CI has neither and skips them
