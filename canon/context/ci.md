---
title: CI
description: GitHub Actions workflow triggers, the checks that gate a merge, and the deploy that ships the recorded page
---

# CI

## Overview

Owns the GitHub Actions workflow that gates a merge: which events start a run, and which checks have to pass before the branch can land. The checks call package scripts rather than defining commands of their own, so what each one runs is the development entry's subject.

## Layout

- `.github/workflows/` owns the workflow definitions a trigger below starts

## Triggers

- Pull requests targeting `main`
- Pushes to `main`, which reach the deploy workflow alone
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

## The deploy

Defined in `.github/workflows/deploy.yml`, on a push to `main` and on a manual dispatch from any ref. Three jobs in sequence: the web checks, a static export built with `NEXT_PUBLIC_ANNEX_MODE=replay`, and an upload of that same artifact to a Cloudflare Pages Direct Upload project named `annex`.

| Job              | What it does                                                                     |
| ---------------- | -------------------------------------------------------------------------------- |
| 🌐 Web Checks    | `bun run check:web`, the same gate the verify workflow runs                      |
| 📦 Static Export | `bun run build` under the replay flag, uploading `web/out` as an artifact        |
| 🚀 Deploy        | `cloudflare/wrangler-action`, uploading that artifact rather than building again |

**The deploy job builds nothing and still installs a toolchain.** Its checkout brings `bun.lock`, `wrangler-action` reads that lockfile, picks bun on the strength of it, and installs wrangler with bun, so the job fails before reaching Cloudflare when bun is not on the runner. Node and bun are set up ahead of the upload for that reason alone. The portfolio repository this pattern came from dropped those two steps as dead weight and broke its deploy on every push until they were restored.

**The deploy builds its own artifact, which the pattern it copies does not.** `/home/erclx/repos/private/career/public/erclx.dev` gates its deploy on a `build-verify` job and downloads what that job produced. `verify.yml` here carries no build job and does not run on a push to `main`, so a deploy reusing its artifact would have nothing to download. The gate is kept by repeating the web checks in this file instead. Folding the two workflows together is the alternative and it is a change to the merge gate, which this row did not own.

The flag decides both halves of what ships: `web/src/lib/ask.ts` answers from the committed fixtures rather than the service, and `next.config.ts` turns the build into a static export. A build without it deploys a page calling a localhost service nobody is running.

`github.ref_name` supplies the Pages branch, so only a run on `main` marks its upload as a production deployment and a dispatch from any other ref lands on a preview host. Two secrets are read, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, scoped to Pages Edit alone. The operator sets both, creates the Pages project, and attaches `annex.erclx.dev` as a custom domain. None of the three is a thing this tree can do, so the workflow lands ahead of the first upload rather than with it.

**The upload is skipped rather than failed while the token is unset.** Both secrets are lifted to the job's `env` so the upload step's own `if` can read one, since a job-level conditional cannot reach the secrets context at all. Without that gate the first merge puts a red Deploy run on the trunk and every push keeps it there until the operator's two acts are done, which is a failing check that reports nothing anybody can act on from inside the repository. A skipped step reads as a green job and says nothing either, so a second step fires on the same condition inverted and writes a notice naming what did not upload and what would make it.

## Running CI locally

`bun run check` runs everything the three jobs run, in the same order, and auto-formats first. It chains the shared verify script, then `check:python`, then `check:web`, so a green local run means a green CI run for the same commit.

If CI fails on format, run `bun run check` locally and commit the diff.
