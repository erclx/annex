# annex

Ask what the EU AI Act requires of a system you're building, and get back the articles you have to read, quoted, with a refusal when the text doesn't settle it.

It won't tell you whether you comply. That's a judgment about your system that no text answers. It tells you where to look and shows you what it read.

## Why this exists

The Act decides things in one place and states the consequences in another. Whether a CV-screening tool counts as high-risk is decided in Article 6, which points at a list in Annex III. What you then have to do sits in Articles 8 to 15, and how you prove it is Article 43. Four articles to read, and the phrase "CV screening" appears in only one of them.

That's the interesting part. The Act writes its cross-references into its own sentences, so the links between provisions can be parsed rather than guessed at. Parsing the original text yields 523 of them and the amended text 607, and following them two steps out from Article 6 reaches every one of Articles 8 to 15 along with Article 43, in both versions.

## The question behind it

The Act is 90,483 words. Put through the model this project runs, the original text comes back as 114,720 tokens and the amended text as 77,040, both inside a context window this machine holds on the GPU. So a model can read the whole thing and answer from it, and prompt caching removes most of the cost argument for repeated questions.

So retrieval is not obviously worth doing here. This project exists to find out whether it is. The same questions run three ways:

1. Put the whole Act in the context window
2. Retrieve by meaning alone
3. Retrieve by meaning, then walk the cross-references outward

Each arm reports accuracy and cost. The answer is allowed to be that the first one wins, and reporting that is the point rather than a failure of it.

## Status

The command line answers questions. Describe a system and it returns the provisions to read, each quoted, or a refusal naming what the text leaves open. The three-arm evaluation and the web surface are not built yet, so the number this project exists to report does not exist yet either.

## Setup

Requires [bun](https://bun.sh), [uv](https://docs.astral.sh/uv/), and [Ollama](https://ollama.com) with `qwen3.8:27b` and `nomic-embed-text` pulled. Everything runs locally and nothing calls a paid API.

```bash
bun install
cd python && uv sync
bash scripts/ollama-build.sh   # the model, built with the context it needs
uv run python -m annex embed   # the vector index, a few minutes
cd .. && bun run check
```

The Ollama build step is not optional. Its `/v1` route accepts a per-request context length and ignores it, so the setting is carried by a tracked Modelfile instead, and the client refuses to run against a model that does not have it.

## Usage

```bash
cd python
uv run python -m annex ask "a chatbot that answers customer questions"
uv run python -m annex search "transparency obligations" --k 5
uv run python -m annex ask "..." --version original --no-traversal
uv run python -m annex context   # what context the models are carrying
```

```bash
cd web && bun run dev             # the answer surface
bun run check                     # verify chain over both halves
cd python && uv run pytest -m live  # the tests that need the model up
```

## How it's put together

`web/` is a Next.js app, `python/` is a uv-managed package, and one `bun run check` at the root covers both. The retrieval index is one `sqlite-vec` file and the reference graph is an in-process map, because 806 provisions and 607 edges do not need a database and standing one up would be the wrong signal.

A question runs through four stages. It is restated in the Act's own vocabulary, searched against the index, expanded over the citations the retrieved provisions carry, and answered. Every claim is then checked against the text it cites, and one that cannot be grounded is dropped rather than softened. An answer with nothing left becomes a refusal.

`.claude/ARCHITECTURE.md` carries the decisions and what's still open. `.claude/REQUIREMENTS.md` carries the scope. `.claude/context/ai-act.md` carries the corpus itself: the amended deadlines, the reference structure, and the claims this project does not make. `.claude/context/retrieval.md` carries the chunking rule, the traversal decision and the measurements behind both.

## What it doesn't do

- Give legal advice, or say whether you comply
- Take your own documents. The corpus is the Act and nothing else
- Cover national implementations beyond Swedish guidance
- Remember you, or save anything between visits

## Help

Open an issue. `.claude/context/` carries the per-domain detail if you're working on it rather than using it.
