---
title: CI
description: GitHub Actions workflow triggers and checks
---

# CI

## Overview

Owns the GitHub Actions workflow that gates a merge: which events start a run, and which checks have to pass before the branch can land. The checks call package scripts rather than defining commands of their own, so what each one runs is the development entry's subject.

## Layout

- `.github/workflows/` owns the workflow definitions a trigger below starts

## Triggers

- Pull requests targeting `main`
- `workflow_dispatch` (manual run from the Actions tab)

## Jobs

Defined in `.github/workflows/verify.yml`. All jobs must pass before merge, and they run in parallel.

| Job              | Command                | What it asserts                                         |
| ---------------- | ---------------------- | ------------------------------------------------------- |
| 🛡️ Static Checks | `bun run check:format` | prettier and shfmt are clean across the tree            |
|                  | `bun run check:spell`  | cspell passes against dictionaries                      |
|                  | `bun run check:shell`  | shellcheck passes at warning level                      |
| 🐍 Python Checks | `bun run check:python` | mypy, ruff, ruff format check, and pytest all pass      |
| 🌐 Web Checks    | `bun run check:web`    | prettier, tsc, eslint at zero warnings, and vitest pass |

The Python job installs through `astral-sh/setup-uv` and `uv sync --frozen`, honouring the interpreter `python/.python-version` pins. The web job installs its own dependencies, since `web/` carries a separate lockfile and the root install does not reach it.

Neither half's job runs Playwright. End-to-end coverage is `cd web && bun run test:e2e`, which needs a browser download, and it gates nothing yet.

The Python job is what makes the corpus count check load-bearing. A parse that loses the six articles the amendment inserted fails `pytest` here rather than only at a developer's pre-push hook.

## Running CI locally

`bun run check` runs everything the three jobs run, in the same order, and auto-formats first. It chains the shared verify script, then `check:python`, then `check:web`, so a green local run means a green CI run for the same commit.

If CI fails on format, run `bun run check` locally and commit the diff.
