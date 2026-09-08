---
title: Development
description: Local dev workflow across the web and python halves, the scripts that verify them, and the git hooks
---

# Development

## Overview

Owns how the project runs on a developer machine: the toolchain, the two halves and how each starts, the scripts that verify a change, and the git hooks that run them before a commit or a push leaves. CI calls the same scripts from a workflow, which is the CI entry's subject.

Everything runs locally and nothing calls a paid API. That is a constraint rather than a convenience, and `.claude/REQUIREMENTS.md` states why.

## Layout

- `web/` owns the Next.js app and its own `package.json`
- `python/` owns the `uv`-managed package, importable as `annex`, and its own `package.json` wrapping the Python tools as bun scripts
- `scripts/` owns the shell scripts the root package scripts call
- `.husky/` owns the git hooks

Each half verifies itself and the root chains both. Neither half's `package.json` carries the spelling or shell checks, which run once at the root over the whole tree.

## Setup

- Install [Bun](https://bun.sh): `curl -fsSL https://bun.sh/install | bash`
- Install [uv](https://docs.astral.sh/uv/): `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Install [Ollama](https://ollama.com), then `ollama pull qwen3.8:27b` and `ollama pull nomic-embed-text`
- **Build the derived generation model: `cd python && bash scripts/ollama-build.sh`.** The OpenAI-compatible `/v1` route accepts a per-request `num_ctx` and ignores it, so the context this project needs is carried by `python/ollama/annex-qwen3-27b.Modelfile` instead. Without this step `uv run python -m annex context` refuses by name and every agent call refuses with it. See the retrieval entry for the measurement
- **Build the vector index: `cd python && uv run python -m annex embed`.** It takes a few minutes, needs Ollama up, and writes the gitignored `python/data/index/`. A fresh clone or a new worktree has no index and `search` says so rather than failing on a missing table
- Root dependencies: `bun install`
- Python dependencies: `cd python && uv sync`
- **Playwright browsers: `cd web && bunx playwright install chromium`**. `bun install` does not fetch them, and the end-to-end run fails with an executable-not-found error until it has been done once.

## Running each half

| Command                               | What it starts                                  |
| ------------------------------------- | ----------------------------------------------- |
| `cd web && bun run dev --port 4100`   | The answer surface at `http://localhost:4100`   |
| `cd python && uv run python -m annex` | The retrieval and evaluation side               |
| `ollama serve`                        | The model backend, if it is not already running |

Ollama answers on `11434` and exposes an OpenAI-compatible endpoint at `/v1`, so the client is written against the OpenAI SDK with `base_url` pointed there. Confirm it is up with `curl http://localhost:11434/v1/models`, which lists the pulled models.

## Ports

The web app takes `4100` rather than the `3000` Next defaults to, so it does not collide with another local app.

`web/scripts/worktree-port.sh` derives a per-worktree offset and the `test:e2e` scripts export it as `WORKTREE_PORT_OFFSET`. `web/playwright.config.ts` adds that offset to its base, so two worktrees of this repository never serve on one port. Override the base alone with `E2E_BASE_PORT`.

## Scripts

| Command                      | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `bun run check`              | The whole gate. Runs the shared verify chain, then the python half, then the web half |
| `bun run check:python`       | `cd python && bun run check`: mypy, ruff, ruff format check, pytest                   |
| `bun run check:web`          | `cd web && bun run check`: prettier check, typecheck, eslint, vitest                  |
| `bun run format`             | Auto-fix prettier and shfmt formatting at the root                                    |
| `cd web && bun run test:e2e` | Playwright against the app, starting a server if one is not already up                |

## Python specifics

- **`pytest.ini` sets `pythonpath = src .` rather than `src` alone.** Without the project root on the path, `uv run pytest` cannot import `tests.agent.conftest` and collection fails, while `python -m pytest` succeeds because it puts the working directory on `sys.path` itself. The two invocations disagreeing is what lets the narrower setting pass in a shell and fail in the verify chain.
- **Tests needing a model are deselected by default.** `pytest.ini` runs `-m "not live"`. The `live` marker covers the acceptance tests that ask the real model a real question and the chunk-length check that counts real tokens against the embedder, since one pass of the 27B holds most of the GPU and CI has neither Ollama nor the models. Run them with `cd python && uv run pytest -m live` after changing chunking, routing, traversal or the prompts. They skip rather than fail where the index or the model is absent.
- **`networkx` cannot be imported on this interpreter.** The library declares `requires_python: !=3.14.1` and `python/.python-version` pins 3.14, so the import raises inside `dataclasses` before any graph is built. The dependency is dropped and the reference graph is a plain in-process adjacency map. Repinning to 3.13 is the alternative, and it moves `mypy.ini`, `ruff.toml` and every task that follows.

## Web specifics

- **Route types are generated and no clone carries them.** `src/app/layout.tsx` uses `LayoutProps<'/'>`, a Next 16 global living in `.next/types/`, and `tsconfig.json` includes that path, so `tsc --noEmit` fails on a fresh checkout or a new worktree. `web/scripts/verify.sh` runs `bun run typegen` ahead of the typecheck, so the verify chain repairs it rather than reporting it.
- **`agentRules` is off in `next.config.ts`.** Next 16 writes `AGENTS.md` and `CLAUDE.md` into `web/` on every run. The root `CLAUDE.md` governs this repository, and a second one under `web/` is loaded alongside it and competes with it.
- The eslint config comes from canon's `web` tooling stack, which targets Vite. Three things were added by hand for Next: `.next` and `next-env.d.ts` in the ignore list, and a scoped override under `src/app/**` turning off `react-refresh/only-export-components`, which forbids the metadata export the App Router requires.
- Vitest excludes `e2e/` so it stops collecting Playwright specs, which use fixtures it cannot provide.

## Spelling

Prose in this repository uses American spellings, and `bun run check` gates on it through cspell. `neighbour` and `neighbours` sit in `.cspell/project-terms.txt` as identifiers out of `annex.corpus.graph` rather than as a house style, and `categorisation` is there because the Act's own text spells it that way. A British spelling written into new prose is a failing check rather than a matter of taste.

## Shell scripts

All `.sh` files live under a `scripts/` folder, at the root or inside a half. Do not place shell scripts elsewhere.

## Husky hooks

- `pre-commit` runs `lint-staged` (prettier, cspell, shfmt, shellcheck on staged files).
- `commit-msg` runs `commitlint` against the conventional commit format.
- `pre-push` runs `bun run check`. When a markdown-bans audit tool is on PATH, it also gates on banned characters, words, and spellings across every tracked markdown file except `CHANGELOG.md`. After pushing, run `git status`. If files changed, commit the diff as `style(<scope>):` and push again.
