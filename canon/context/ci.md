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

Defined in `.github/workflows/verify.yml`. Every job names a check in the pull request's checks list, and they run in parallel.

None of them is a GitHub-enforced merge gate: `gh api repos/:owner/:repo/branches/main/protection` returned `404 Branch not protected` on 2026-09-13, so `main` carries no branch protection rule at all. "Must pass before merge" describes a convention among reviewers reading that list, not something the platform blocks on. Enforcing one is a repository-settings act, the same kind `canon/ARCHITECTURE.md` names for creating the Cloudflare Pages project, and no file in this tree can perform it.

| Job              | Command                      | What it asserts                                         |
| ---------------- | ---------------------------- | ------------------------------------------------------- |
| 🛡️ Static Checks | `bun run check:format`       | prettier and shfmt are clean across the tree            |
|                  | `bun run check:spell`        | cspell passes against dictionaries                      |
|                  | `bun run check:shell`        | shellcheck passes at warning level                      |
| 🐍 Python Checks | `bun run check:python`       | mypy, ruff, ruff format check, and pytest all pass      |
| 🌐 Web Checks    | `bun run check:web`          | prettier, tsc, eslint at zero warnings, and vitest pass |
| 🎭 E2E Tests     | `cd web && bun run test:e2e` | Chromium drives the app end to end across `web/e2e/`    |

The Python job installs through `astral-sh/setup-uv` and `uv sync --frozen`, honouring the interpreter `python/.python-version` pins. The web job installs its own dependencies, since `web/` carries a separate lockfile and the root install does not reach it.

The E2E job runs on every pull request now, unwired from the other three: nothing in this workflow uploads a build artifact for it to consume, since Playwright's own `webServer` entries in `web/playwright.config.ts` build the dev server and the replay static export it needs, inside the job itself.

It installs Chromium fresh every run through `--with-deps`, since a GitHub-hosted runner is a new virtual machine each time and the OS packages that flag installs are never persisted regardless of a cache hit. Only the browser binary download is cached, keyed on the `@playwright/test` version read from `web/package.json`. Its report and traces upload on failure alone, matching every other job in this file.

The Python job is what makes the corpus count check load-bearing. A parse that loses the six articles the amendment inserted fails `pytest` here rather than only at a developer's pre-push hook.

**The workflow and the pull request template diverge from the base seed on purpose.** A base seed `verify.yml` carries the static checks job alone, so `canon tooling sync base . --write` deletes the Python and web jobs above and takes every merge gate on pytest, mypy, ruff, tsc, eslint and vitest with them. Running it also drops the `Evidence states changed` line from `.github/pull_request_template.md`, which is the checkbox every branch fills in naming the states it captured. Restore both files from the trunk after a base sync. Each reads as ordinary drift in its report, and nothing else flags what it removed.

## The deploy

Defined in `.github/workflows/deploy.yml`, on a push to `main` and on a manual dispatch from any ref. Three jobs in sequence: the web checks, a static export built with `NEXT_PUBLIC_ANNEX_MODE=replay`, and an upload of that same artifact to a Cloudflare Pages Direct Upload project named `annex`.

| Job              | What it does                                                                     |
| ---------------- | -------------------------------------------------------------------------------- |
| 🌐 Web Checks    | `bun run check:web`, the same gate the verify workflow runs                      |
| 📦 Static Export | `bun run build` under the replay flag, uploading `web/out` as an artifact        |
| 🚀 Deploy        | `cloudflare/wrangler-action`, uploading that artifact rather than building again |

**The deploy job builds nothing and still installs a toolchain.** Its checkout brings `bun.lock`, `wrangler-action` reads that lockfile, picks bun on the strength of it, and installs wrangler with bun, so the job fails before reaching Cloudflare when bun is not on the runner. Node and bun are set up ahead of the upload for that reason alone. The portfolio repository this pattern came from dropped those two steps as dead weight and broke its deploy on every push until they were restored.

**The deploy builds its own artifact, which the pattern it copies does not.** `/home/erclx/repos/private/career/public/erclx.dev` gates its deploy on a `build-verify` job and downloads what that job produced. `verify.yml` here carries no build job and does not run on a push to `main`, so a deploy reusing its artifact would have nothing to download. The gate is kept by repeating the web checks in this file instead. Folding the two workflows together is the alternative and it is a change to the merge gate, which this row did not own.

The flag decides both halves of what ships: `web/src/lib/service/ask.ts` answers from the committed fixtures rather than the service, and `next.config.ts` turns the build into a static export. A build without it deploys a page calling a localhost service nobody is running.

`github.ref_name` supplies the Pages branch, so only a run on `main` marks its upload as a production deployment and a dispatch from any other ref lands on a preview host. Two secrets are read, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, scoped to Pages Edit alone. The operator sets both, creates the Pages project, and attaches `annex.erclx.dev` as a custom domain. None of the three is a thing this tree can do, so the workflow lands ahead of the first upload rather than with it.

**The upload is skipped rather than failed while the token is unset.** Both secrets are lifted to the job's `env` so the upload step's own `if` can read one, since a job-level conditional cannot reach the secrets context at all. Without that gate the first merge puts a red Deploy run on the trunk and every push keeps it there until the operator's two acts are done, which is a failing check that reports nothing anybody can act on from inside the repository. A skipped step reads as a green job and says nothing either, so a second step fires on the same condition inverted and writes a notice naming what did not upload and what would make it.

## Running CI locally

`bun run check` runs everything the three jobs run, in the same order, and auto-formats first. It chains the shared verify script, then `check:python`, then `check:web`, so a green local run means a green CI run for the same commit.

If CI fails on format, run `bun run check` locally and commit the diff.
