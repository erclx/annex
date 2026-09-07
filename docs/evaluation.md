---
title: The three-arm evaluation
description: What one question set scored under full-context stuffing, vector search, and search plus reference traversal, and what each arm cost to run
---

# The three-arm evaluation

The premise of this project is that the EU AI Act fits inside a current context window. If that is true, a model can read the whole document and answer from it, and prompt caching removes most of the per-query cost argument for asking it many questions. Retrieval is then not obviously worth building, and a retrieval pipeline shipped without the comparison is one nobody can defend.

So the comparison is the deliverable. The same twelve questions are answered three ways and scored the same way.

1. **Full context.** The whole Act in the prompt, no retrieval at all
2. **Search only.** Top-k vector search over the embedded provisions
3. **Search plus traversal.** The same search, then a bounded walk over the cross-references the retrieved provisions carry

The answer is allowed to be that the baseline wins. Reporting that is the point rather than a failure of it.

## How it was measured

### The question set

Twelve questions, in `python/src/annex/eval/questions.py` and emitted to `python/data/eval/questions.json`. They instantiate the four corpus-answering demo flows, three questions each: an Article 50 transparency question, a CV-screening question that has to walk the high-risk chain, a substantial-modification question the text does not settle, and a deadline question whose answer moved between the two versions.

Each question names the provisions a correct answer has to have read, per version, and whether the correct behavior is an answer or a refusal. Gold ids are article-level and annex-level, and a retrieved paragraph counts as having found the article holding it, because search returns paragraphs and asking a gold set to predict which paragraph would rank would score the tokenizer.

Twelve is a small denominator and the report says so. One wrong answer moves a rate by more than eight points, so every rate is given with its count.

### The three arms

All three satisfy one protocol, return the same `Answer` object, and are scored by one function with no branch on which produced the result. They share the synthesis prompt, the draft parser and the grounding check, so a gap between arms is a gap between ways of finding text rather than between pieces of scaffolding.

The baseline needs its own model. Ollama's OpenAI-compatible `/v1` route accepts a per-request `num_ctx` and silently discards it, so the window is carried by `python/ollama/annex-longctx.Modelfile` at 131,072 and `verify_context` reads back what the loaded model actually holds. `annex-qwen3-27b` stays at 32,768 because it answers from a retrieval result, and widening it would hold 30 GB of the card for every agent call.

One trap is worth naming because no artifact in the repository would show it. The machine this ran on has `OLLAMA_CONTEXT_LENGTH=131072` set on the server, so the baseline appears to work with no Modelfile at all here and truncates silently anywhere that variable is unset. That is the whole reason the setting is carried by a tracked file.

### What is scored

Everything is read off `RetrievalTrace`, which the pipeline fills as it runs. Nothing is scored from the answer's citations alone, because an arm handed a quarter of the document that cites three provisions would score 1.0 on every metric derived from its citations.

- **Recall.** Of the provisions a correct answer has to read, how many reached the model
- **Precision**, against two denominators. Against every node supplied, which is what the model actually read, and against articles alone once paragraphs are collapsed. Never against every provision the corpus addresses, which flatters any arm
- **Faithfulness**, as span containment of a claim's content words against the text that was supplied
- **Refusal**, scored in both directions, so an arm that refuses everything does not win the refusal flow
- **Cost**, as prompt and completion tokens and wall time, per question

Supplied is not the same as retrieved. `traversed_ids` names what traversal reached and `dropped_ids` names which of those the prompt budget cut before synthesis, and every metric runs over the difference. Crediting traversal for text nothing read is the specific dishonesty that field exists to prevent.

## The result

72 runs, none failed. Measured on 2026-09-07 against `annex-longctx` and `annex-qwen3-27b`, both `qwen3.8:27b` derivatives, embedding with `snowflake-arctic-embed2`, on one RTX 5090.

**Stuffing the whole document still wins on recall, precision and faithfulness. It loses on tokens, and it loses on completeness. The gap narrowed by a third when the embedding model changed.**

| Arm              | Version      | Recall | v0.6 | Precision, nodes | Nodes sent | Faithfulness | Correct refusals | False refusals | Answers cut |
| ---------------- | ------------ | ------ | ---- | ---------------- | ---------- | ------------ | ---------------- | -------------- | ----------- |
| full-context     | original     | 1.00   | 1.00 | 0.014            | 306.0      | 0.98         | 0/3              | 0/9            | 1           |
| full-context     | consolidated | 1.00   | 1.00 | 0.032            | 133.0      | 0.97         | 2/3              | 0/9            | 2           |
| search-only      | original     | 0.61   | 0.41 | 0.236            | 12.0       | 0.91         | 0/3              | 2/9            | 0           |
| search-only      | consolidated | 0.71   | 0.46 | 0.364            | 11.9       | 0.93         | 1/3              | 1/9            | 0           |
| search-traversal | original     | 0.74   | 0.54 | 0.170            | 25.8       | 0.94         | 0/3              | 0/9            | 2           |
| search-traversal | consolidated | 0.81   | 0.56 | 0.248            | 26.0       | 0.92         | 1/3              | 0/9            | 0           |

The v0.6 column is the same harness over the same questions on `nomic-embed-text`, kept at `python/data/eval/runs/v0.6-nomic-embed-text.json` and recomputed from that file rather than copied from the old table. One change to the embedding model moved every retrieval row by 0.20 to 0.25 of recall, and it moved precision the same way rather than trading against it.

The completeness half of the headline is the last column. Three of the baseline's twenty-four answers stopped because the window filled rather than because the model had finished, against none for search alone. A cut answer reads as a finished one, and every metric beside it scores whatever survived the cut, so those rows are measuring a shorter answer than the arm meant to give. That is a cost of stuffing and it belongs in the sentence rather than in a footnote under it.

| Arm              | Version      | Prompt tokens | Wall time | First call | Later calls |
| ---------------- | ------------ | ------------- | --------- | ---------- | ----------- |
| full-context     | original     | 1 416 797     | 438.0 s   | 115.5 s    | 29.3 s      |
| full-context     | consolidated | 940 889       | 327.7 s   | 62.7 s     | 24.1 s      |
| search-only      | original     | 51 622        | 345.8 s   | 45.7 s     | 27.3 s      |
| search-only      | consolidated | 54 072        | 338.5 s   | 34.1 s     | 27.7 s      |
| search-traversal | original     | 187 225       | 387.7 s   | 28.5 s     | 32.7 s      |
| search-traversal | consolidated | 189 460       | 406.2 s   | 34.7 s     | 33.8 s      |

The baseline still reads 27 times the prompt tokens of search alone on the original text. Its first call is the one to read: 115.5 s against 29.3 s for the calls behind it, which is the cache filling rather than the model thinking.

Recall of 1.00 on the baseline is not an achievement, it is a definition: the arm was handed every provision, so it cannot miss one. What the number does is set the bar. Neither retrieval arm reaches it, and the nearer one now reaches 0.81.

### Traversal beats search alone, and the bottleneck behind it moved

Following the Act's cross-references lifts recall from 0.61 to 0.74 on the original and from 0.71 to 0.81 on the consolidated. That is a real gain and it is the reason the reference graph exists. It costs precision, 0.236 falling to 0.170, as the walk brings in provisions the question did not need.

Where the walk pays for itself is the deadline flow. All three version-comparison questions went from 0.50 to 1.00 on both documents, each by recovering Article 113 from Article 111, which search returns and Article 113 is cited by. Article 113 is the only article in either version carrying the compliance dates, and search alone never returns it on the original text. Attribute that to the embedding swap and the merged routing change together rather than to either alone: the routing change is what stopped a temporal question reaching the index with its timing discarded, and the swap is what put Article 111 in the top twelve.

At v0.6 the ceiling on this arm was search, because search never returned an entry point to walk from. That is no longer where the loss is. On `q06-worker-promotion` search now returns both `anx_III` and `art_6.3`, the walk lifts the paragraph to Article 6 and reaches Article 10 through Article 15 and Article 43, and the arm still scores 0.27.

```plaintext
q06-worker-promotion, original
  searched    anx_III, art_6.3, art_14.4, and nine recitals
  traversed   art_6, art_10, art_11, art_12, art_13, art_15, art_43, and 33 more
  dropped     art_10, art_11, art_12, art_13, art_15, art_43, and 21 more
  scored      recall 0.27
```

Every obligation article the question needed was reached and then cut. `Pipeline._within_budget` drops from the far end until the prompt fits the 32 768-token window, and 40 traversed provisions of legal text do not fit. Scoring the same rows against everything the walk reached, before the budget trimmed it:

| Version      | Arm scores | Walk reached | Lost to the budget |
| ------------ | ---------- | ------------ | ------------------ |
| original     | 0.74       | 0.89         | 0.149              |
| consolidated | 0.81       | 0.85         | 0.045              |

**That gap is what retrieval found and the model was never shown.** The reached column is not a recall the pipeline can achieve, since a prompt carrying all of it would truncate mid-answer, and it is quoted only to locate the loss.

The loss is three times larger on the original text, and that asymmetry is the useful half. The original carries 180 recitals the consolidated does not, so its walk pulls in more text per hop and fills the window sooner. The three high-risk chain questions carry all of it there: q04 scores 0.18 against 0.82 reached, q05 0.09 against 0.36, and q06 0.27 against 0.82.

The harness is behaving as designed here rather than failing. `RetrievalTrace.dropped_ids` exists precisely so the scorer subtracts text nothing read, because crediting traversal for provisions the budget cut would credit it for text the model never saw. What changed is which limit binds. **The bottleneck is now the synthesis prompt budget, not the embedder and not the graph.** Widening it means a larger window, a smaller traversal cap, or sending provisions the walk ranked rather than the ones it reached first, and none of those is measured here.

### Depth 2 is a cost setting rather than a forced one

| Version      | Depth | Recall | Nodes reached | Articles reached |
| ------------ | ----- | ------ | ------------- | ---------------- |
| original     | 1     | 0.78   | 31.5          | 22.7             |
| original     | 2     | 0.89   | 48.2          | 35.2             |
| original     | 3     | 0.89   | 52.0          | 38.4             |
| consolidated | 1     | 0.82   | 44.0          | 28.0             |
| consolidated | 2     | 0.85   | 51.9          | 35.5             |
| consolidated | 3     | 0.85   | 51.9          | 35.5             |

Depth 2 is now the setting on both documents, and for the first time the table says so without qualification. Depth 3 buys nothing on either version while sending four more nodes on the original, which reverses the v0.6 reading where it bought 0.06 there. Better seeds are what changed it: a walk that starts from the right provisions reaches the chain at depth 2 and has nowhere further worth going.

These rows re-walk the recorded seeds and call no model, so they measure what the graph reaches rather than what the prompt carries. Read them against the 0.74 and 0.81 the arm actually scores, and the difference is the budget rather than the depth.

### The prompt cache is real, and it is what makes the baseline affordable

Measured from a cold model, with `ollama stop annex-longctx` first, three questions against the consolidated text: **70.1 s on the first call and 25.0 s on the next two.** The corpus is a fixed prefix and the question a short suffix, so only the first question of a version pays the prefill.

This is the local form of the prompt-caching argument that the record otherwise only asserts, and it matters because it is the whole cost case against retrieval. On the original text the baseline sends 7.6 times the prompt tokens of the traversal arm and 27 times the search-only arm, and still finishes a twelve-question sweep in about the same wall time, because those tokens are cached and the retrieval arms each pay two uncached model calls per question.

The first-call column in the tables above reads cold on this run, unlike the v0.6 one. Full-context on the original shows 115.5 s against a 29.3 s later mean, which is the prefill the controlled probe isolates rather than an artifact of an earlier partial run having warmed the same prefix.

### The wrong refusals are mostly gone, and the right ones are still rare

Three of the twelve questions are ones the text does not settle. Across six arm and version pairs that is eighteen chances to refuse correctly, and the arms took **four**, against five at v0.6. Refusing correctly is no better than it was.

Refusing wrongly is much better. False refusals fell from **eight to three**, and the pattern that made the v0.6 eight worth writing about has gone:

```plaintext
false refusals, by question
                    v0.6                    v0.9
  full-context      q02, q03, q05           none
  search-only       q10, q11, q12           q03, q10, q12
  search-traversal  q10, q10                none
```

At v0.6 every false refusal by a retrieval arm landed on the version-comparison flow, the one asking what the amendment moved, which is MVP feature 5 and the flow where a wrong answer carries a penalty date. The traversal arm now refuses none of them on either document, and the baseline makes no false refusal at all. The baseline still refuses where it should, twice on the consolidated text, which is the two columns moving in opposite directions and the only pair in the table that does.

Two changes account for that together and neither is the refusal machinery. The routing step used to ask the model for the obligations a description touches and got exactly that, so a question about when an obligation applies reached the index with its timing discarded, and Article 113 was never searched for. That prompt now asks for the timing, and the embedding swap put Article 111 in reach, from which the walk arrives at Article 113. An arm handed the date stops refusing to give it.

The three that remain belong to `search-only`, and two of them are the arm without the walk missing Article 113 on `q10` and `q12` and declining to answer a date it was never shown. Refusing there is the machinery working on a genuinely inadequate retrieval, and it is scored false because the text does settle the question. The third, `q03` on the original text, is a transparency question the same arm answers correctly on the consolidated text, and nothing here explains it.

Refusal remains the product's headline safety property and its weakest measured behavior. Four correct refusals in eighteen is not a number to ship a safety claim on, and the count is small enough that the honest reading is a direction rather than a rate. `.claude/ARCHITECTURE.md` carries the account under its refusal decision.

### What this means

On this corpus, with this model, **retrieval still does not earn its place on accuracy.** It earns it on cost, on completeness, and on the property no accuracy column shows: the exact passages sent are known, so a citation can be checked against them programmatically rather than trusted. That is why `python/data/eval/results.json` carries the ids, and it now carries the routed query beside them, so the retrieval half of a run can be reproduced from its own output.

What changed is the size of the gap and where the remaining loss sits. Swapping one embedding model closed a third of the distance to the baseline, 0.54 to 0.74 on the original and 0.56 to 0.81 on the consolidated, for no new dependency and a 27-second index rebuild. That is the cheapest change measured against this harness so far.

Neither side comes out clean. The baseline pays for its recall with three cut answers out of twenty-four. The traversal arm now finds provisions it cannot show the model, losing 0.15 of recall to a prompt budget rather than to retrieval. A reader picking an arm off the recall column alone would get neither.

Three limits keep this from being a general claim, and all three are worth stating before someone else does.

- Twelve questions is a small denominator, and one wrong answer moves a rate by more than eight points.
- One generation model, one machine, and now a second embedding model. `nomic-embed-text` reached this project on its context limit rather than on a comparison, and five models have since been measured over both versions on the routed query form: `snowflake-arctic-embed2` scored 0.5177 and 0.6591, `bge-m3` 0.4747 and 0.5770, `mxbai-embed-large` 0.4141 and 0.5846, `nomic-embed-text` 0.4116 and 0.4571, and `all-minilm` 0.3990 and 0.4697. The winner ships and the run above is scored on it. Five is still one family of open-weight models on one card, and no hosted embedding model has been measured at all.
- Refusal is scored over three questions per arm and version, which is eighteen readings in total. That is enough to say the behavior is weak and not enough to rank the arms on it. The flow the false refusals concentrate in is the finding worth carrying, rather than the counts themselves.

The technique also matters one size up, which no arm here can show. This document fits a context window. A national implementation plus guidance plus standards plus case law does not, and at that size the baseline arm stops being available at all.

## Production concerns: four built, three reasoned about

Seven concerns were in scope. Four are implemented and three are designed for and documented. The window did not fit all seven at a quality worth showing, and thin coverage of seven is worse than four that hold.

### Built

**Cost and token control.** The context window is carried by a tracked Modelfile per model and read back off the loaded model rather than trusted, because a `num_ctx` a client believes it set and did not is a fluent answer over a truncated document. `Pipeline._within_budget` bounds the assembled prompt against the window and names what it cut in `dropped_ids`. `MINIMUM_GENERATION_BUDGET` floors every generation at 512 tokens, measured after a 32-token budget came back with 32 tokens of unclosed reasoning and an empty answer. This harness reports tokens and wall time per question and projects what the same token counts would cost hosted.

**Failure modes.** Refusal is a return value rather than an error, and the schema enforces that an answer carries claims or a refusal and never both or neither. Ungrounded claims are dropped by comparing a claim's own words against the text it cites, not by asking the model whether it was faithful. `Completion.is_truncated` separates a generation stopped by its budget from one stopped by the window and logs which. The baseline refuses a prompt whose reported token count is below what its characters allow, because Ollama truncates an over-length prompt to roughly half the window rather than to the whole of it, so proximity to the window would not detect it. In the harness, one question failing is recorded against that question and the sweep continues.

**Data freshness.** Both the original text and the text consolidated at 2026-07-27 are parsed, indexed and answerable, and every provision, citation and answer carries which version it came from. A cited provision that the amendment moved is marked with what changed, computed from the two parses rather than from a diff service. The evaluation answers every question against both versions, so an answer that changed is visible rather than asserted.

**CI.** GitHub Actions runs the same scripts the pre-push hook runs. Shipped in v0.4.

### Reasoned about, not built

**Prompt injection.** The surface is narrower than it first appears and worth stating plainly rather than overstating. The corpus is trusted public law, so the only untrusted input is the user's own description of their system. Two things already limit it, neither designed for this: the synthesis prompt's rules precede the description rather than following it, and the draft parser drops any citation marker naming a provision that was not retrieved, so a description that talks the model into citing something invented produces no claim. What is missing is a boundary the model cannot be talked across: the description is interpolated into the prompt with no delimiter and no escaping, and nothing checks the answer for instructions the description planted. Roughly a day to do properly, and it needs its own adversarial question set to show it works.

**Latency.** Measured throughout and engineered nowhere. Every wall time in this report is real, and none of it has been optimized. Nothing streams, so a reader waits for the whole answer. There is no answer cache, so the same description costs the same twice. And the routing step spends a model call restating a question that is sometimes already in the Act's vocabulary. Streaming is the change with the largest felt effect and the smallest risk, and it belongs to the web surface rather than here.

**Observability.** There is structured logging at the boundaries and `RetrievalTrace` is a real per-request record of what was retrieved and what it cost. The HTTP seam added the correlation id that was missing from this list: every request carries one, both boundary log lines and every error body quote it, and the log records the description's length and never its text. What is still missing is anywhere to put any of it, being no metrics export and no trace store, so a reader answers a question by grepping a terminal. That is why this stays under reasoned about rather than moving up. The obvious tool is the one this project refuses on purpose. `langsmith` ships with LangGraph and is a hosted telemetry client, on a project whose stated constraint is that nothing leaves the machine, so `annex.settings` writes its switches off rather than trusting a default and a test asserts it.

## Reproducing this

```bash
cd python
bash scripts/ollama-build.sh                     # both models, at the windows they need
uv run python -m annex embed                     # the vector index, about 30 seconds
uv run python -m annex evaluate --label v0.9     # the full sweep, about 40 minutes
```

`--arm`, `--version` and `--limit` narrow the sweep, and `--report-only` re-renders the last run without repeating it. `--label` keeps a copy under `python/data/eval/runs/<label>.json` so the run before it survives, which is what makes the v0.6 column above checkable rather than quoted. Results are written after every question, so a run stopped halfway is still readable.

The run behind the numbers above is `python/data/eval/results.json`, and the one before it is `python/data/eval/runs/v0.6-nomic-embed-text.json`. Both are tracked. Each row carries the query the router produced and the provision ids that arm searched, traversed and dropped, so any figure in this document can be recomputed rather than taken on trust, and the two runs can be compared without re-running either. Recomputing the v0.6 file is what confirmed the two runs average recall the same way, which is the check that licenses the delta column. Being checkable is the one thing retrieval buys over stuffing whatever the accuracy columns say, and it would be strange to claim it and then report only totals.
