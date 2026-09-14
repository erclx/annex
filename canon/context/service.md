---
title: Service
description: HTTP boundary between the web app and the agent, the eight results a call can return, the ports and timeouts, the replay seam the deployed build takes instead, and the CORS and TLS position
---

# Service

## Overview

Owns the seam between the two halves. A plain-language description arrives at `POST /ask`, reaches one long-lived `Pipeline`, and comes back as the answer object `annex.answer` defines. Everything about how a question is answered belongs to the agent and the retrieval entries. What belongs here is the transport: which result a caller can meet, which status carries it, what the boundary logs, and what the endpoint refuses.

The answer object is not defined here and must not be. The evaluation harness reads the same object without going over HTTP, so a response model of the transport's own would make the contract a property of one of its two consumers.

## The seven results

Five of these are failures and two are not. Each names a different next action, which is why the surface draws one inline validation state and a failure region carrying four copy variants rather than one generic region.

An eighth, `unrecorded`, belongs to the deployed build alone and no server writes it either. It is described under the replay seam below rather than in this table, which is the transport's own.

| Result        | Transport                                | What happened                                       |
| ------------- | ---------------------------------------- | --------------------------------------------------- |
| `answered`    | 200, `claims` non-empty, `refusal` null  | The Act settles it                                  |
| `refused`     | 200, `claims` empty, `refusal` populated | The retrieved text does not settle it               |
| `invalid`     | 422, `{ state, detail }`                 | The description was empty or past the length bound  |
| `unavailable` | 503, `{ state, detail, correlationId }`  | The service is up and the model or the index is not |
| `timeout`     | 504, `{ state, detail, correlationId }`  | The model did not answer inside the budget          |
| `failed`      | 500, `{ state, detail, correlationId }`  | Anything unexpected, with no internals in `detail`  |
| `unreachable` | no response, `fetch` rejected            | Nothing is listening on the service port            |

**A refusal is a 200 carrying a populated `refusal`, never a 4xx.** Refusing where the text does not settle a question is the product's argument, per the refusal decision in `canon/ARCHITECTURE.md`, and a transport mapping it to an error would have turned that argument into a fault. `python/tests/service/test_states.py` asserts the status rather than the shape alone, because the shape alone passes on a transport that got this wrong.

`detail` is a fixed sentence per state, written in `annex.service.errors` rather than taken from an exception. The reader-facing copy the surface actually renders lives in `canon/wireframes/answer.md` and is quoted there verbatim, so a sentence changed in one place is a change to the other.

`unreachable` is the one row no server writes. It is what `web/src/lib/service/ask.ts` returns when the fetch itself rejected, and it is the only failure carrying no correlation id, since nothing answered and so nothing logged one.

## What the boundary logs

Two lines per request at INFO, plus one at ERROR where a request failed. Every line carries a correlation id, which is eight hex characters split by a dash so a reader can quote it off a screen and the log answers.

**The description text reaches no log record.** It is the one untrusted input this project takes and the one part of a request a visitor might have pasted from somewhere private. The log carries its length instead, which separates an empty submission from a paragraph without reproducing either and is the field that explains a slow ask.

The pipeline's own INFO line at `python/src/annex/agent/pipeline.py` logs the routed query, which is the model restating the description and can carry its distinctive terms. The service raises that logger to WARNING at startup rather than editing a merged surface, so the command line keeps a line a person is watching on purpose and the service does not. `python/tests/service/test_logging.py` asserts the absence against a distinctive token rather than a plausible sentence, so it fails on an echo instead of passing on a log nobody would have written.

## Ports and timeouts

| Setting                     | Default                 | What it bounds                              |
| --------------------------- | ----------------------- | ------------------------------------------- |
| `ANNEX_SERVICE_PORT`        | `4200`                  | Where the service listens                   |
| `ANNEX_SERVICE_HOST`        | `127.0.0.1`             | Which interface it binds                    |
| `ANNEX_ASK_TIMEOUT_SECONDS` | `120`                   | One model call, enforced by the OpenAI SDK  |
| `ANNEX_MAX_BODY_BYTES`      | `16384`                 | The request body, read off `Content-Length` |
| `NEXT_PUBLIC_ANNEX_API_URL` | `http://localhost:4200` | Where the browser looks for the above       |

4200 sits above the 4100 to 4150 band `web/scripts/worktree-port.sh` derives, so a linked worktree's dev server cannot land on it, and it avoids uvicorn's 8000 default.

**The timeout bounds the model call rather than the request.** An `asyncio.wait_for` around the threadpool call returns to the caller promptly and leaves the worker thread running until the model answers, which under a stuck Ollama runs to the 600 seconds `Settings.request_timeout_seconds` defaults to. Handing the budget to the SDK instead means the call itself raises `APITimeoutError`, the service maps it to a named 504, and no thread is left behind. An ask makes two model calls, so the worst case is 240 seconds against a measured warm ask of 21 to 28. The client aborts at 300, above the server's worst case, so the named 504 arrives rather than the browser giving up first.

Warm figures were measured in PR #2 on 2026-09-06 over two questions. The first request after Ollama evicts the model from the card pays a load nothing here has measured.

## What the endpoint refuses

- A body past `max_body_bytes`, read off `Content-Length` before the body is buffered. It answers `invalid` rather than a status of its own, because a body past the cap is the same fact as a description past the bound and the seven results above are what the surface draws against
- A description that is empty, whitespace, or past 4000 characters, bounded through `Annotated[str, StringConstraints(...)]` rather than a hand-rolled check
- Any field the request model does not declare, through `extra='forbid'`
- A validation message is never forwarded. Pydantic names the input that failed, and the input here is the description this service has promised not to echo

## `/ask/stream`: the same run, framed as it happens

`POST /ask/stream` answers the identical question `/ask` does, over the identical `Pipeline`, as a sequence of Server-Sent Events instead of one JSON body. It reads `pipeline.compiled.stream(initial_state, stream_mode='updates')`, the compiled LangGraph's own generator, so the frames are the graph's node names in the order it runs them: a `node` frame per completed node (`route`, `retrieve`, `traverse`, `budget`, `synthesize`, and `refuse` where the graph takes that edge), a terminal `answer` frame carrying the same `Answer` body `/ask` returns, or a mid-stream `error` frame naming a `ServiceState` where a call fails after bytes have already started.

**A node frame carries what its node reached, as ids and never as text.** `retrieve` names `searched_ids`, deduplicated across the chunks of one provision. `traverse` names `searched_ids`, `traversed_ids` and `edges`. `budget` names `supplied_ids` and `dropped_ids`, where `supplied_ids` keeps the prompt's own order and its repeats so it matches the numbering the model reads. `route`, `synthesize` and `refuse` carry the node name alone, and a field a node did not produce is absent from its frame rather than null. The page resolves an id against the corpus export it already ships, and the terminal `answer` frame carries the text anyway. `python/schema/stream-node.schema.json` and `python/schema/stream-error.schema.json` hold the two frame contracts, and `web/src/lib/service/stream-node.ts` and `web/src/lib/service/stream-error.ts` are generated from them by the same command and stale check as `answer.ts`.

`synthesize` sets `answer` on every path, refusal included, but the generator does not stop there: it drains the graph to exhaustion before sending the terminal `answer` frame, so a refused question still reaches its `refuse` node frame first. That frame is the one place the system's judgment that the text does not settle the question becomes visible, and it is the reason this seam exists rather than a detail of it.

Validation and pipeline readiness are checked before the response starts, so `invalid` and the pre-stream half of `unavailable` still answer as ordinary JSON with the right status. Once the body starts streaming, a failure can no longer become a JSON error response: `bound_and_identify` maps what `call_next` raises, and a `StreamingResponse`'s generator runs after `call_next` has already returned, outside that middleware's reach. `build_stream` in `python/src/annex/service/streaming.py` classifies its own failures for that reason, which is the one place this route's error handling differs from the rest of the boundary.

**The live build asks through it.** `web/src/lib/service/ask.ts` calls `/ask/stream` whenever its caller wants frames, which the page always does, and `web/src/lib/service/stream.ts` parses every frame strictly and maps an `error` frame into the same states `/ask` returns. A body that closes with no terminal frame reads as `failed`. A `ServiceError` body answered before any frame is final and is not asked twice. Any other status before a frame is a service older than this route, and only then does the client fall back to `/ask`, which is otherwise unchanged and still answers a caller that wants no frames.

## CORS, and the TLS bar this does not meet

Origins are listed rather than reflected, and never a wildcard. The default names both spellings of the dev origin, `http://localhost:4100` and `http://127.0.0.1:4100`, because a browser sends whichever the address bar carries and they are different origins to it. A worktree serving elsewhere in the 4100 band adds its own through `ANNEX_ALLOWED_ORIGINS`, which pydantic-settings reads as JSON.

**Middleware order decides whether a refusal reaches the browser.** `add_middleware` prepends, so the last registration is the outermost layer, and a middleware returning early from inside `CORSMiddleware` sends its response without an `Access-Control-Allow-Origin` header. The body-size check is registered before CORS for that reason. Measured on 2026-09-06 against a 20 000-byte body: registered the other way round, the 422 went out with no CORS header while the `invalid` and `unavailable` responses both carried one, so the browser rejected the refusal unread and the surface reported `unreachable` against a service that was running. A test asserts the header on that response, since it is the one path that can skip a layer the route's own responses pass through.

**The TLS bullet in `.claude/rules/canon/lib/360-security-server.md` is knowingly not met.** That rule requires every route served over TLS with plaintext rejected. This service binds to `127.0.0.1` for a local demo, where a certificate protects a loopback hop against nobody and costs a trust store every developer has to populate. Stating the gap is the point: a deployment that moves this off loopback has to meet the bar, and nothing in the code will notice on its own.

The browser reaches the service directly rather than through a Next route handler proxying it. That keeps the deployed build static and needs no function at the edge, which is what the fixture-replay work depends on, and it puts the swap inside one client module. The cost is that CORS has to be configured rather than avoided.

## How the two halves deploy

**The web build deploys first, or both deploy together.** `web/src/lib/service/answer.ts` is generated strict, so a client rejecting an unknown field rejects the whole response rather than degrading, and a field added to the Pydantic models and deployed ahead of the web build fails every request at runtime. `canon/context/development.md` carries the same deploy-order rule.

This row ships both halves on one branch, so they land together and the coupling is satisfied by construction rather than by anyone remembering it. A later change touching the Pydantic models alone does not have that protection.

## The deployed build calls nothing

The seam above describes a local run. A deployed build has no service on the other side of it, because the model this project runs holds 30 GB of a card and nothing hosted answers these questions for free. What ships instead is a static export that replays answers the live system already gave.

The swap sits in one module. `web/src/lib/service/ask.ts` returns to `replay` when `NEXT_PUBLIC_ANNEX_MODE` reads `replay`, and `web/src/lib/service/replay.ts` is the only module that knows fixtures exist. Nothing above either one changes: the surface reads the same `AskResult` union, which is what that seam was drawn for and what `canon/wireframes/answer.md` was built against.

**The fixtures come from the pipeline, not from a hand.** `uv run python -m annex capture` walks the same twelve questions the evaluation scores, calls `Pipeline.ask` in process on each version, and writes one `Answer` per pair into `web/src/fixtures/` with a manifest carrying the commit and the date. In process rather than over HTTP, because this service defines no response model of its own and returns that same object, so the transport would add a hop and no fidelity. The recorded walkthrough is what proves the HTTP path live.

The union gained an eighth result for this build alone. `unrecorded` is what a description the recording does not hold returns, and it is a state rather than a nearest-fixture match on purpose: the nearest fixture to an unasked question is text a model produced for a different one, which is the invention the capture exists to retire. It renders in the failure region under the neutral treatment, since it is the deployment working as built rather than a fault.

**The traversal switch cannot be honored on that build.** Capture ran with reference following on, so a recording holds one answer a question and both positions of the switch would return it. That control is held inactive there and relabelled `recorded`. Beside it the version toggle is untouched, since both texts were captured, and comparing them is what the deployed page is for.

**The committed manifest's `commit` field cannot be the shipped stamp, because this repository squash-merges.** `head_commit()` in `python/src/annex/eval/capture.py` reads the capturing branch's own `HEAD`, and a squash merge discards that commit entirely: the branch is deleted, and nothing on `main` ever carries that hash. Two captures shipped exactly that defect, `f486520` and `299b13e`, both stamping a hash `git merge-base --is-ancestor` confirms is not an ancestor of `main`, which means neither would resolve at all in a fresh clone. `.github/workflows/deploy.yml`'s `build` job resolves the stamp a second time instead, from `git log -1 --format=%H -- web/src/fixtures/manifest.json` against a `fetch-depth: 0` checkout, and overwrites the field before Next statically imports it. That query asks a different question than `head_commit()` does: not which commit captured the fixtures, but which commit on `main`'s own history last touched the file, which resolves on the `push` trigger because `main` is the branch nothing squashes away. The workflow also carries `workflow_dispatch`, which accepts any ref, and a dispatch from a branch ref hands the same query that branch's own commit, the exact hash a later squash discards. A build dispatched from a branch is already deploying a branch, so this is a property of the ordinary `push` path rather than a guarantee the step gives on every trigger.

This means the tracked file and the deployed page disagree on purpose. The repository's own copy of `web/src/fixtures/manifest.json` keeps whatever `capture.py` last wrote, and only the build artifact `deploy.yml` uploads carries the corrected hash. A reader diffing the two is seeing the fix work, not drift.

**A fixture expires against the pipeline that produced it, and only half of that is visible.** `web/src/lib/service/answer.ts` is strict, so a field added to the Pydantic models makes every committed fixture fail to parse, and `web/src/lib/service/replay.test.ts` parses all of them in the gate. The invisible half is a fixture that still parses and no longer matches what the pipeline says. Any later change to prompts, chunking, retrieval or the corpus invalidates the set that way and nothing will report it, so the manifest carries the commit and the date and a re-capture is the repair. It costs minutes of GPU rather than a day of work.

## What is not built

- No rate limit. The endpoint costs GPU time rather than money, one card holds one model, and two concurrent asks queue inside Ollama rather than multiplying. `OLLAMA_NUM_PARALLEL` is where a limit would go if a demo turns out to need one
- No authentication. Accounts and multi-tenancy are deferred in `canon/REQUIREMENTS.md`, so there is no caller identity to authorize against and no record a caller could reach that another could not
- No retry. An ask is not idempotent in cost, and the failure states name what to do instead
