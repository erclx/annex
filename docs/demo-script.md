# Demo script

The walkthrough the recording follows. Four questions against the live local
system, then the evaluation report for the fifth flow, which has no screen.

The deployed page at `annex.erclx.dev` replays this same run from fixtures and
says so on every screen. This script is what shows the live system doing the
work the recording holds, which is the only thing a recording cannot prove
about itself.

## Before recording

Everything here needs the models on the card and the index on disk. Nothing
else may generate on that card while this runs, or the timings stop meaning
anything.

```bash
ollama serve                                  # if it is not already up
cd python
bash scripts/ollama-build.sh                  # both derived models
uv run python -m annex context                # read the windows back off them
uv run python -m annex embed                  # the index, about 30 seconds
uv run python -m annex serve                  # the endpoint on 4200
```

In a second shell:

```bash
cd web && bun run dev --port 4100
```

Ask one throwaway question before recording. The first call after Ollama loads
the model pays a load nothing here has measured, and a demo should not open on
it.

## The four questions

Each is a flow, and each is one of the twelve the evaluation scores and the
capture recorded. Ask them in this order: the shortest chain first, the one
that refuses in the middle, and the one that turns on the amendment last.

### 1. Transparency

> a chatbot on our website that answers customer questions about our products

Reaches Article 50. One short chain, one claim, one quoted provision under it.
What to point at: the citation sits under the claim it supports and carries the
Act's own words, so a reader checks the answer rather than trusting it.

Then open the trace at the foot of the page. It carries the model, the prompt
and completion tokens, the wall time, and how many provisions were searched,
traversed and dropped. Cost is on the page rather than buried.

### 2. The high-risk chain

> software that ranks job applicants by reading their CVs and shortlists who we
> interview

Annex III lists the use case, Article 6 makes the listing decisive, Articles 8
to 15 are the duties, Article 43 is how conformity is shown. The phrase "CV
screening" appears in one of those.

**Say what this one costs.** On the original text this question delivers 0.18 of
the provisions a correct answer needs, with 27 dropped by the synthesis prompt
budget before the model saw them. The walk finds them and the window cannot
carry them. That is a known defect, it belongs to another row, and the dropped
ids are named under the trace rather than hidden. Showing it is the point:
a demo that only opens the questions it wins is a demo of nothing.

### 3. Refusal

> our high-risk recruitment tool was placed on the market before the deadline
> and we have redesigned its user interface

**Ask this one against the amended text.** The Act makes substantial
modification the trigger and never defines the threshold. No regulator has
either. The text does not settle it, so the system says so, names what is
missing, and lists what it read before saying so. The capture taken at this
branch names two things it was not given: whether a redesigned interface is a
significant change in design under Article 111(2), and whether it meets the
Article 3(23) definition. Both are cited, and both are questions rather than
guesses.

What to point at: the refusal renders as a result rather than an error, and the
consulted provisions are what separate a refusal from a shrug.

**Do not toggle the version on this one without saying what happens.** The same
description answers on the original text rather than refusing, and the other
two questions of this flow answer on both. Refusal is the weakest thing this
project measures: eighteen chances to refuse correctly and the arms took four.
That is in the evaluation, it is in the architecture record as the weakest
measured behavior, and it is a better thing to be asked about than to be caught
on.

### 4. The amendment

> when do the obligations for a high-risk AI system start to apply to us

Ask it, then move the version toggle from the amended text to the original and
let it re-ask. Two different dates, each cited to Article 113, and the citation
that moved is marked.

This is the flow the project exists to make visible. An answer derived from the
original text is confidently wrong about a date carrying penalties, and nothing
about the original text announces that it is stale. All three deadline
questions score 1.00 on both documents in the traversal arm, each reaching
Article 113 from Article 111. Search alone still misses Article 113 on the
original text, where two of its three chunks are Official Journal footnotes the
parse swallowed, and the walk is what closes that.

## The fifth flow has no screen

The three-arm comparison is a report rather than a surface. There is no second
screen and no navigation, and the reference graph is not visualized, so this
one is read rather than clicked:

```bash
cd python && uv run python -m annex evaluate --report-only
```

That re-renders the last run without asking the model anything.
[evaluation.md](evaluation.md) carries the same numbers in prose.

What to say over it: the baseline reached every provision, retrieval reached 61
to 71 per cent alone and 74 to 81 per cent with the walk, and the baseline
therefore won on accuracy. Retrieval's case on this corpus is cost and
checkability. Reporting that is the deliverable rather than a failure of it.

## What not to claim

- Do not say the deployed page is asking a model. It replays this run and says
  so in a band on every screen
- Do not say the system tells anyone whether they comply. It reports which
  articles to read
- Do not present a weak answer as a strong one. Question 2 is weak on the
  original text and the trace says why

## The recording itself

Not committed. A repository is a poor host for a binary nobody diffs, and the
audience gets a file or a link rather than a clone. This script is the tracked
half. `canon:canon-screencast` covers the scripting and the capture.
