---
title: Development
description: Local dev workflow across the web and python halves, the scripts that verify them, the capture that records the deployed page, and the git hooks
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
- Install [Ollama](https://ollama.com), then `ollama pull qwen3.8:27b` and `ollama pull snowflake-arctic-embed2`
- **Build the derived generation models: `cd python && bash scripts/ollama-build.sh`.** The OpenAI-compatible `/v1` route accepts a per-request `num_ctx` and ignores it, so the context this project needs is carried by a Modelfile instead. The script walks `python/ollama/*.Modelfile` and builds both: `annex-qwen3-27b` at 32 768, which every agent call uses, and `annex-longctx` at 131 072, which only the evaluation's full-context arm uses. Without this step `uv run python -m annex context` refuses by name and every agent call refuses with it. See the retrieval entry for the measurement
- **The two models are sized apart on purpose and cannot both be resident.** `annex-longctx` holds 29.8 to 30.4 GB of a 32.6 GB card, so Ollama unloads one to load the other and a run that alternates arms pays a model swap. The evaluation's own loop sweeps a whole arm before changing, which is why. Nothing else should generate on this card while the baseline arm runs, or layers spill to CPU and the wall-time column stops comparing
- **Build the vector index: `cd python && uv run python -m annex embed`.** It needs Ollama up and writes the gitignored `python/data/index/`. A fresh clone or a new worktree has no index and `search` says so rather than failing on a missing table. It took 27.3 seconds over both versions under `snowflake-arctic-embed2` with the corpus cache warm and the model cold, rather than the few minutes this step once claimed, and the retrieval entry carries the conditions that figure holds under
- Root dependencies: `bun install`
- **Web dependencies: `cd web && bun install`.** The root install does not reach `web/`, which carries its own lockfile, so a fresh clone or a new worktree has no `web/node_modules` and every web command fails on a missing module until this has run once
- Python dependencies: `cd python && uv sync`
- **Playwright browsers: `cd web && bunx playwright install chromium`**. `bun install` does not fetch them, and the end-to-end run fails with an executable-not-found error until it has been done once.

## Running each half

| Command                                     | What it starts                                  |
| ------------------------------------------- | ----------------------------------------------- |
| `cd web && bun run dev --port 4100`         | The answer surface at `http://localhost:4100`   |
| `cd python && uv run python -m annex`       | The retrieval and evaluation side               |
| `cd python && uv run python -m annex serve` | The answer endpoint at `http://localhost:4200`  |
| `ollama serve`                              | The model backend, if it is not already running |

Ollama answers on `11434` and exposes an OpenAI-compatible endpoint at `/v1`, so the client is written against the OpenAI SDK with `base_url` pointed there. Confirm it is up with `curl http://localhost:11434/v1/models`, which lists the pulled models.

## Ports

The web app takes `4100` rather than the `3000` Next defaults to, so it does not collide with another local app.

`web/scripts/worktree-port.sh` derives a per-worktree offset and the `test:e2e` scripts export it as `WORKTREE_PORT_OFFSET`. `web/playwright.config.ts` adds that offset to its base, so two worktrees of this repository never serve on one port. Override the base alone with `E2E_BASE_PORT`.

The answer endpoint takes `4200`, above the 4100 to 4150 band that offset derives, so a linked worktree's web app cannot land on it and uvicorn's 8000 default is avoided. Override it with `ANNEX_SERVICE_PORT`, and point the browser somewhere else with `NEXT_PUBLIC_ANNEX_API_URL`. The service entry carries the rest.

## Scripts

| Command                                             | Purpose                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `bun run check`                                     | The whole gate. Runs the shared verify chain, then the python half, then the web half                              |
| `bun run check:python`                              | `cd python && bun run check`: mypy, ruff, ruff format check, pytest                                                |
| `bun run check:web`                                 | `cd web && bun run check`: prettier check, typecheck, eslint, vitest                                               |
| `bun run format`                                    | Auto-fix prettier and shfmt formatting at the root                                                                 |
| `cd web && bun run generate:answer`                 | Regenerate `web/src/lib/answer.ts` from `python/schema/answer.schema.json`                                         |
| `cd web && bun run test:e2e`                        | Playwright against the app, starting a server if one is not already up                                             |
| `cd web && bun run capture:evidence`                | Drive every answer-surface state into `web/evidence/<state>/`, asserting each state was reached before it captures |
| `cd python && uv run python -m annex capture`       | Record the pipeline's answers into `web/src/fixtures/`, which the deployed build replays                           |
| `cd python && uv run python -m annex export-corpus` | Write both versions' provisions into `web/src/fixtures/corpus/`, which the reading panel renders                   |

`web/src/lib/answer.ts` is generated and committed. `web/scripts/verify.sh` hashes it, regenerates it, and fails when the two hashes differ, so a schema change nobody regenerated against stops the gate rather than drifting until a shape mismatch surfaces at runtime. Regenerate it after any change to the Pydantic models the schema is emitted from.

The guard compares the file against its own regeneration rather than against git. A git-based check answers a different question and gets it wrong twice: `git diff` reports nothing for a file git does not track, and a status-based check fails on the commit that first adds one.

The generator resolves the schema's `$defs` references itself, in `web/scripts/generate-answer.ts`, because `json-schema-to-zod` leaves every `$ref` as `z.any()` and its `--depth` option does not change that. The same pass injects `additionalProperties: false`, which is what makes the emitted objects strict at the HTTP boundary.

**The strict parse couples the deploy order of the two halves.** A client rejecting an unknown field rejects the whole response rather than degrading, so a field added to the Pydantic models and deployed ahead of the web build fails every request at runtime. This is not hypothetical: `RetrievalTrace` gained `dropped_ids` and `truncated` inside one week. Deploy the web build first, or deploy both together. A lenient parse is the alternative and it costs the guarantee that the browser and the service agree on the contract, which is the thing generating the file was chosen to buy.

## The evaluation

`uv run python -m annex evaluate` answers the gold question set with all three arms and writes `python/data/eval/results.json` beside the report it prints. Both files are tracked, so a figure in `docs/evaluation.md` is checkable against the run that produced it.

| Flag               | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `--arm <name>`     | One arm, repeatable. Every arm by default                           |
| `--version <name>` | One version, repeatable. Both by default                            |
| `--limit <n>`      | The first n questions of the set                                    |
| `--report-only`    | Re-render the report from the last run rather than running it again |
| `--questions-only` | Write `python/data/eval/questions.json` from the models and stop    |
| `--results <path>` | Write somewhere other than the tracked file                         |

- **The full run takes tens of minutes rather than minutes.** Three arms over twelve questions and two versions is 72 model runs, and the baseline arm reads the whole Act on each of its 24. Start it expecting to leave it. Results are written after every question, so a run stopped halfway is still readable and `--report-only` renders what landed.
- **One question failing does not end the run.** A cut prompt, a model nobody built or a missing index is recorded against the question that met it and the sweep continues. The report lists those separately rather than averaging them into a score.
- **The baseline arm depends on Ollama's KV cache to stay affordable.** Every prompt in it is one version's corpus followed by the question, so the prefix repeats and only the first question of a version pays the full prefill. Measured on the consolidated text after `ollama stop annex-longctx`, which is the only reading here taken from a genuinely unloaded model: **70.1 s on the first call and 25.0 s across the next two**.
- **A cold start is the only way to measure that prefill, and a killed run defeats it.** Ollama holds the prefix across processes, so a sweep started after an earlier attempt sent the same corpus reads its first call as cheap and reports a cache effect backwards. Stop the model with `ollama stop annex-longctx` before timing a first call, and write the probe somewhere else with `--results` so it does not overwrite the tracked run.

## The capture

`uv run python -m annex capture` answers the same twelve questions the evaluation scores, keeps the `Answer` objects rather than their scores, and writes them to `web/src/fixtures/` as the recording the deployed build replays. `--question`, `--version` and `--out` narrow it, the last so a trial run does not overwrite the committed set.

- **It costs what an evaluation arm costs, not what a full run costs.** Twenty-four pipeline calls, one per question per version. The 21 to 28 seconds warm this bullet once carried is superseded: a full run measured on `feat/draw-the-traversal` on 2026-09-12, models already resident, ran roughly 42 seconds an answer, fifteen of twenty-four fixtures written ten minutes in. Closer to 17 minutes than to ten with the models loaded, against the tens of minutes `evaluate` takes over three arms.
- **The setup is the expensive half.** Ollama up, both derived models built, and `annex embed` run, which is a further 27 seconds and needs the corpus cache. Nothing else may generate on the card while it runs.
- **One question failing does not end the run.** The pair is left out and the manifest names what was captured, so a missing question is visible as an absent entry rather than as a fixture nobody can replay.
- **A re-capture is the only repair for a stale fixture.** Any change to prompts, chunking, retrieval or the corpus invalidates the set, and only half of that is visible: the strict parse in `web/src/lib/replay.test.ts` fails on a schema change and nothing fails on a fixture that still parses and no longer matches. The manifest carries the commit and the date for that reason.
- **Never hand-edit a captured answer.** A weak answer on a demo question is a defect belonging to the stage that produced it. Report it and keep what came back.

`web/src/fixtures/index.ts` is generated by the same command and imports every fixture by name, because Next resolves a static import at build time and the glob import that would replace the list is an idiom its bundler does not offer.

**Run `bun run format` after a capture.** The generator emits the repository's prettier style and cannot predict where prettier breaks a long line, so `check:format` fails on a re-capture nobody formatted. That is the same pairing `generate:answer` makes, which runs prettier over its own output inside the package script.

`cspell.json` ignores the fixtures folder, the way it ignores `python/data/`, since the Act's own text carries spellings this project does not author.

## Python specifics

- **`pytest.ini` sets `pythonpath = src .` rather than `src` alone.** Without the project root on the path, `uv run pytest` cannot import `tests.agent.conftest` and collection fails, while `python -m pytest` succeeds because it puts the working directory on `sys.path` itself. The two invocations disagreeing is what lets the narrower setting pass in a shell and fail in the verify chain.
- **Tests needing a model are deselected by default.** `pytest.ini` runs `-m "not live"`. The `live` marker covers the acceptance tests that ask the real model a real question and the chunk-length check that counts real tokens against the embedder, since one pass of the 27B holds most of the GPU and CI has neither Ollama nor the models. Run them with `cd python && uv run pytest -m live` after changing chunking, routing, traversal or the prompts. They skip rather than fail where the index or the model is absent.
- **`networkx` cannot be imported on this interpreter.** The library declares `requires_python: !=3.14.1` and `python/.python-version` pins 3.14, so the import raises inside `dataclasses` before any graph is built. The dependency is dropped and the reference graph is a plain in-process adjacency map. Repinning to 3.13 is the alternative, and it moves `mypy.ini`, `ruff.toml` and every task that follows.

## Web specifics

- **Route types are generated and no clone carries them.** `src/app/layout.tsx` uses `LayoutProps<'/'>`, a Next 16 global living in `.next/types/`, and `tsconfig.json` includes that path, so `tsc --noEmit` fails on a fresh checkout or a new worktree. `web/scripts/verify.sh` runs `bun run typegen` ahead of the typecheck, so the verify chain repairs it rather than reporting it.
- **`agentRules` is off in `next.config.ts`.** Next 16 writes `AGENTS.md` and `CLAUDE.md` into `web/` on every run. The root `CLAUDE.md` governs this repository, and a second one under `web/` is loaded alongside it and competes with it.
- The eslint config comes from canon's `web` tooling stack, which targets Vite. Three things were added by hand for Next: `.next` and `next-env.d.ts` in the ignore list, and a scoped override under `src/app/**` turning off `react-refresh/only-export-components`, which forbids the metadata export the App Router requires.
- Vitest excludes `e2e/` so it stops collecting Playwright specs, which use fixtures it cannot provide.
- **Next 16 refuses a second `next dev` out of one project directory whatever port it is given.** It answers `Another next dev server is already running` and names the first server's PID. The end-to-end run needs two builds of the web half, since the replay flag is read at module scope, so `playwright.config.ts` serves the replay one as a static export behind `python3 -m http.server` rather than as a second dev server. That costs a production build at the head of the run and buys a test against the artifact the deploy uploads rather than against a development stand-in.
- **The two servers must not share a build directory.** Both write `.next` by default and the dev server holds it, so `ANNEX_DIST_DIR` sends the replay build to `out-replay` instead. Under `output: 'export'` the exported site lands in that directory rather than in `out`, which is why the value reads as an output folder. A build setting neither variable writes `.next` and exports to `out`, which is what the deploy workflow and `capture-states.ts` both do.
- **`out/` is gitignored and was not in eslint's ignore list.** `output: 'export'` writes minified bundles there, which `eslint . --max-warnings 0` then read as source and failed on. The entry is in `eslint.config.mjs` beside `.next`.

## Spelling

Prose in this repository uses American spellings, and `bun run check` gates on it through cspell. `neighbour` and `neighbours` sit in `.cspell/project-terms.txt` as identifiers out of `annex.corpus.graph` rather than as a house style, and `categorisation` is there because the Act's own text spells it that way. A British spelling written into new prose is a failing check rather than a matter of taste.

cspell checks fenced code blocks inside markdown too, unlike `canon markdown audit`'s banned-word scan, which excludes them. A wireframe's ASCII mockup carrying invented UI copy is prose for spelling purposes even though it is a drawing for everything else, so mockup text inside a `plaintext` fence still has to spell American or `bun run check:spell` fails on it.

## Shell scripts

All `.sh` files live under a `scripts/` folder, at the root or inside a half. Do not place shell scripts elsewhere.

## Husky hooks

- `pre-commit` runs `lint-staged` (prettier, cspell, shfmt, shellcheck on staged files).
- `commit-msg` runs `commitlint` against the conventional commit format.
- `pre-push` runs `bun run check`. When a markdown-bans audit tool is on PATH, it also gates on banned characters, words, and spellings across every tracked markdown file except `CHANGELOG.md`. After pushing, run `git status`. If files changed, commit the diff as `style(<scope>):` and push again.
