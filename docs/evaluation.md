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

72 runs, none failed. Measured on 2026-09-06 against `annex-longctx` and `annex-qwen3-27b`, both `qwen3.8:27b` derivatives, on one RTX 5090.

**Stuffing the whole document wins on recall, precision and faithfulness. It loses on tokens, and it loses on completeness.**

| Arm              | Version      | Recall | Precision, nodes | Nodes sent | Faithfulness | Correct refusals | False refusals | Answers cut |
| ---------------- | ------------ | ------ | ---------------- | ---------- | ------------ | ---------------- | -------------- | ----------- |
| full-context     | original     | 1.00   | 0.014            | 306.0      | 0.97         | 1/3              | 1/9            | 3           |
| full-context     | consolidated | 1.00   | 0.032            | 133.0      | 0.96         | 1/3              | 2/9            | 2           |
| search-only      | original     | 0.41   | 0.188            | 12.0       | 0.87         | 1/3              | 1/9            | 0           |
| search-only      | consolidated | 0.46   | 0.308            | 11.8       | 0.87         | 1/3              | 2/9            | 0           |
| search-traversal | original     | 0.54   | 0.137            | 27.2       | 0.92         | 0/3              | 1/9            | 0           |
| search-traversal | consolidated | 0.56   | 0.201            | 27.1       | 0.93         | 1/3              | 1/9            | 2           |

The completeness half of that headline is the last column. Five of the baseline's twenty-four answers stopped because the window filled rather than because the model had finished, against none for search alone. A cut answer reads as a finished one, and every metric beside it scores whatever survived the cut, so those rows are measuring a shorter answer than the arm meant to give. That is a cost of stuffing and it belongs in the sentence rather than in a footnote under it.

| Arm              | Version      | Prompt tokens | Wall time | First call | Later calls |
| ---------------- | ------------ | ------------- | --------- | ---------- | ----------- |
| full-context     | original     | 1 416 797     | 353.6 s   | 15.3 s     | 30.8 s      |
| full-context     | consolidated | 940 889       | 298.3 s   | 29.1 s     | 24.5 s      |
| search-only      | original     | 36 353        | 298.8 s   | 27.9 s     | 24.6 s      |
| search-only      | consolidated | 43 501        | 317.5 s   | 24.8 s     | 26.6 s      |
| search-traversal | original     | 166 026       | 351.1 s   | 31.4 s     | 29.1 s      |
| search-traversal | consolidated | 184 754       | 358.1 s   | 33.0 s     | 29.6 s      |

Recall of 1.00 on the baseline is not an achievement, it is a definition: the arm was handed every provision, so it cannot miss one. What the number does is set the bar. Neither retrieval arm gets close to it.

### Traversal beats search alone, and does not close the gap

Following the Act's cross-references lifts recall from 0.41 to 0.54 on the original and from 0.46 to 0.56 on the consolidated. That is a real gain and it is the reason the reference graph exists. It is also not enough, and it costs precision: 0.188 falls to 0.137 as the walk brings in provisions the question did not need.

The reason it stops there is the finding worth taking away, and it was not the one expected going in.

```plaintext
q06-worker-promotion, consolidated
  search-only       recall 0.09   missed anx_III, art_6, art_8 ... art_15, art_43
  search-traversal  recall 0.18   missed          art_6, art_8 ... art_15, art_43
```

Search never returned Article 6 for that question, so traversal had no entry point to walk from. Walking from Article 6 does reach every obligation article and Article 43 in two hops, in both versions, and a shipped test still asserts it. That is a property of the reference graph. It is not a property of the pipeline, which has to retrieve Article 6 before it can walk from it.

**Traversal is downstream of search and inherits its misses.** A graph walk cannot recover an entry point retrieval never found, so the ceiling on the third arm is set by the second. That reframes where the remaining work is: the bottleneck is the embedder, not the reference graph.

### Depth 2 is a cost setting rather than a forced one

| Version      | Depth | Recall | Nodes reached | Articles reached |
| ------------ | ----- | ------ | ------------- | ---------------- |
| original     | 1     | 0.49   | 26.5          | 17.7             |
| original     | 2     | 0.60   | 40.5          | 27.6             |
| original     | 3     | 0.66   | 47.7          | 33.3             |
| consolidated | 1     | 0.57   | 40.1          | 23.5             |
| consolidated | 2     | 0.61   | 51.8          | 33.6             |
| consolidated | 3     | 0.61   | 51.8          | 33.6             |

Depth 3 was expected to buy no recall for roughly double the payload. On the original text it buys 0.06 for seven more nodes, so that expectation was wrong and depth 3 is a defensible setting. On the consolidated text depth 2 and depth 3 are identical because both hit the traversal cap of 40, which means that row measures the cap rather than the depth. Depth 2 remains the shipped setting on cost grounds rather than because nothing above it helps.

### The prompt cache is real, and it is what makes the baseline affordable

Measured from a cold model, with `ollama stop annex-longctx` first, three questions against the consolidated text: **70.1 s on the first call and 25.0 s on the next two.** The corpus is a fixed prefix and the question a short suffix, so only the first question of a version pays the prefill.

This is the local form of the prompt-caching argument that the record otherwise only asserts, and it matters because it is the whole cost case against retrieval. The baseline sends 8.5 times the prompt tokens of the traversal arm and 39 times the search-only arm, and still finishes a twelve-question sweep in about the same wall time, because those tokens are cached and the retrieval arms each pay two uncached model calls per question.

The first-call column in the tables above is not a cold reading. Earlier partial runs had already sent the same prefixes, which is why full-context on the original shows a 15.3 s first call against a 30.8 s later mean. Only the controlled probe measures the prefill.

### Nothing is good at refusal, and one arm refuses the wrong flow

Three of the twelve questions are ones the text does not settle. Across six arm and version pairs that is eighteen chances to refuse correctly, and the arms took **five**. The best any pair managed was one in three, and `search-traversal` on the original text caught none.

Refusal is the product's headline safety property. On this evidence it is the weakest measured behavior in the system, and it is the one a reader would most want to trust.

The false refusals are worse than their count, because they are not scattered. Every false refusal by a retrieval arm landed on the deadline questions.

```plaintext
false refusals, by question
  full-context      q02, q03, q05     transparency and high-risk chain
  search-only       q10, q11, q12     version comparison
  search-traversal  q10, q10          version comparison
```

The retrieval arms systematically refuse the version-comparison flow, which is the one that asks what the amendment moved. That is MVP feature 5 of this project, and it is the flow where a wrong answer carries a penalty date. The baseline's three misses scatter across two other flows and show no such pattern.

Nothing in an aggregate refusal rate shows this. It is visible only once the column is split by what the question asked for, which is why the table above carries two.

The cause has since been found and it is not the refusal machinery. The routing step asked the model for the obligations a description touches and got exactly that, so a question about when an obligation applies reached the index with its timing discarded, and Article 113, the only article in either version carrying the compliance dates, was never searched for. Replaying the refusing runs put every one at the model's own declared refusal marker, refusing text that genuinely did not settle the question it was handed. The sharper half was never these refusals but the three runs on the same flow that answered from provisions carrying no date and scored here as successes. The prompt now asks for the timing and a fourth refusal exit drops a timing answer that gives no date its citations carry. Every number in this report predates both and moves with the queued re-run on the new embedder rather than with that change. `.claude/ARCHITECTURE.md` carries the account under its refusal decision.

### What this means

On this corpus, with this model, **retrieval does not earn its place on accuracy.** It earns it on cost, on completeness, and on the property no accuracy column shows: the exact passages sent are known, so a citation can be checked against them programmatically rather than trusted. That is why `python/data/eval/results.json` carries the ids.

Neither side of that comes out clean. The baseline pays for its recall with five cut answers out of twenty-four, and the retrieval arms pay for their cheapness by refusing the one flow that asks what the amendment moved. A reader picking an arm off the recall column alone would get the first without being told about either.

Three limits keep this from being a general claim, and all three are worth stating before someone else does.

- Twelve questions is a small denominator, and one wrong answer moves a rate by more than eight points.
- One model, one embedder, one machine. The recall ceiling here is set by `nomic-embed-text`, which was chosen for its context limit rather than compared against anything. No alternative embedder has been measured, and swapping it is the highest-leverage experiment this harness now makes possible.
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
bash scripts/ollama-build.sh        # both models, at the windows they need
uv run python -m annex embed        # the vector index, a few minutes
uv run python -m annex evaluate     # the full sweep, tens of minutes
```

`--arm`, `--version` and `--limit` narrow the sweep, and `--report-only` re-renders the last run without repeating it. Results are written after every question, so a run stopped halfway is still readable.

The run behind the numbers above is `python/data/eval/results.json`, which is tracked. It carries the provision ids each arm searched, traversed and dropped on every question, so any figure in this document can be recomputed rather than taken on trust. Being checkable is the one thing retrieval buys over stuffing whatever the accuracy columns say, and it would be strange to claim it and then report only totals.
