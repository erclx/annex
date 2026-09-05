# annex

Ask what the EU AI Act requires of a system you're building, and get back the articles you have to read, quoted, with a refusal when the text doesn't settle it.

It won't tell you whether you comply. That's a judgment about your system that no text answers. It tells you where to look and shows you what it read.

## Why this exists

The Act decides things in one place and states the consequences in another. Whether a CV-screening tool counts as high-risk is decided in Article 6, which points at a list in Annex III. What you then have to do sits in Articles 8 to 15, and how you prove it is Article 43. Four hops, and the phrase "CV screening" appears in only one of them.

That's the interesting part. The document carries 518 explicit cross-references written into its own sentences, so the links between provisions can be parsed rather than guessed at.

## The question behind it

The Act is 90,483 words, roughly 145,000 tokens. That fits inside a current model's context window, so a model can read the whole thing and answer from it, and prompt caching removes most of the cost argument for repeated questions.

So retrieval is not obviously worth doing here. This project exists to find out whether it is. The same questions run three ways:

1. Put the whole Act in the context window
2. Retrieve by meaning alone
3. Retrieve by meaning, then walk the cross-references outward

Each arm reports accuracy and cost. The answer is allowed to be that the first one wins, and reporting that is the point rather than a failure of it.

## Status

Early. The scope docs and the governance are in place, the corpus is measured and fetchable, and the two halves build and test clean. Nothing answers a question yet.

## Setup

Requires [bun](https://bun.sh), [uv](https://docs.astral.sh/uv/), and [Ollama](https://ollama.com) with `qwen3.8:27b` and `nomic-embed-text` pulled. Everything runs locally and nothing calls a paid API.

```bash
bun install
cd python && uv sync && cd ..
bun run check
```

## Usage

```bash
cd web && bun run dev        # the answer surface
cd python && uv run pytest   # the retrieval and eval side
bun run check                # verify chain over both halves
```

## How it's put together

`web/` is a Next.js app, `python/` is a uv-managed package, and one `bun run check` at the root covers both. The retrieval index and the reference graph both live in files rather than services, because 300 provisions and 500 edges do not need a database and standing one up would be the wrong signal.

`.claude/ARCHITECTURE.md` carries the decisions and what's still open. `.claude/REQUIREMENTS.md` carries the scope. `.claude/context/ai-act.md` carries the corpus itself: the amended deadlines, the reference structure, and the claims this project does not make.

## What it doesn't do

- Give legal advice, or say whether you comply
- Take your own documents. The corpus is the Act and nothing else
- Cover national implementations beyond Swedish guidance
- Remember you, or save anything between visits

## Help

Open an issue. `.claude/context/` carries the per-domain detail if you're working on it rather than using it.
