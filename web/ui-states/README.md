# Answer surface, as it renders

Twenty captures of the one surface this project has, every state in both themes,
taken at 1280px against a production build. They are here so a reviewer can see
what a change did to the surface without running it, and so a later change has
something to be compared against.

**The bodies behind them are captured, not written.** The answered, cut-short
and refused states are driven by three files out of `web/src/fixtures/`, which
`uv run python -m annex capture` fills from the real pipeline. An earlier
version of these captures was built from hand-written statute text that no model
produced, on a project whose whole argument is that a citation can be checked.
Regenerating them from real output is what retired that.

Both themes, symmetrically, because both ship and neither is a variant of the
other. The dark theme re-values every role rather than inverting the light one,
and `.claude/DESIGN.md` records contrast measured separately for each, so a
regression in one is invisible in a capture of the other.

They sit under `web/` rather than under the repository's `docs/` because of who
reads them. `docs/` serves an operator running what the project ships, who has
never opened the source. These serve a reviewer reading a diff and a developer
about to change the surface, both of whom have it open.

The folder is not called `screenshots/`, which would be the obvious name, because
`web/.gitignore` ignores any directory of that name at any depth. That entry
covers the harness output and is deliberate, so this folder is named for what it
holds instead.

Every state `.claude/wireframes/answer.md` names appears here except the
moved-citation one, which is folded into the answered capture because it renders
on top of an answer rather than instead of it.

| State | Light | Dark |
| ----- | ----- | ---- |
| On arrival, before anything is asked | [light](1-empty-light.png) | [dark](1-empty-dark.png) |
| The description is empty or past the bound | [light](2-invalid-light.png) | [dark](2-invalid-dark.png) |
| The skeleton, and the measured range in the copy | [light](3-loading-light.png) | [dark](3-loading-dark.png) |
| Claims, inline citations, the moved-citation chip, the trace opened | [light](4-answered-light.png) | [dark](4-answered-dark.png) |
| The answer stopped for want of prompt room | [light](5-answered-cut-short-light.png) | [dark](5-answered-cut-short-dark.png) |
| The text does not settle it, and what was read before saying so | [light](6-refused-light.png) | [dark](6-refused-dark.png) |
| The model or the index is not running | [light](7-failure-unavailable-light.png) | [dark](7-failure-unavailable-dark.png) |
| Nothing is listening on the service port | [light](8-failure-unreachable-light.png) | [dark](8-failure-unreachable-dark.png) |
| The deployed build on arrival, the replay band and the recorded picks | [light](9-replay-empty-light.png) | [dark](9-replay-empty-dark.png) |
| A description the recording does not hold | [light](10-unrecorded-light.png) | [dark](10-unrecorded-dark.png) |

The last two are the deployed build and reach no service. They carry the replay
band, which renders above every state there and on no local build, so the eight
above show the surface as a developer running both halves sees it.

## What the real bodies changed about these

Swapping the invented bodies for captured ones moved the page height by a factor
the invented ones hid, and the numbers are worth carrying:

| State     | Height at 1280px |
| --------- | ---------------- |
| Answered  | 4388px           |
| Cut short | 4102px           |
| Refused   | 10022px          |

The refusal is the outlier and the reason is in the data rather than in the
layout. Its `consulted` list carries the twenty provisions the pipeline read
before saying the text did not settle the question, quoted in full, which is
67 320 characters of statute under one two-sentence refusal. The wireframe draws
that list with two entries and never caps it, and a capture built from
hand-written bodies carried two, so nothing before this showed what the section
costs at real size.

Whether to cap it, collapse it, or leave it is a layout decision, and this
project settles those by rendering candidates and looking. No row owns that yet.
What is recorded here is the measurement, so whoever opens the question starts
from a number rather than an impression.

## The design these are measured against

`settled-design.html` is the final round of the draft-and-pick that chose this
layout, carrying both themes in one self-contained file. Open it in a browser
beside a capture above. It is the source for the type scale, the spacing, the
segmented control, the drawn switch, the citation treatments and the trace grid,
none of which `.claude/DESIGN.md` states at that resolution.

It is committed here because the folder it came from is not durable. The rounds
were written to `.canon/`, which is gitignored and reaches no history, and
`draft-and-pick` deletes its own scratch folder at close. A pointer there
resolves on the machine that ran the pick and nowhere else, which is how the
first version of this surface came to be built without ever seeing the design.

`.claude/wireframes/answer.md` still owns layout and copy and is the record that
wins on any disagreement. This file owns what that one does not draw.

## Regenerating these

`e2e/capture-states.ts` writes every file here. Run it from `web/` against a
production build, so no dev overlay lands in a capture:

```bash
bun run build
bunx next start --port 4131 &
CAPTURE_BASE_URL=http://localhost:4131 bun e2e/capture-states.ts
```

It stubs the service at the network layer, which is the only way to reach a
refusal, a cut-short answer or a named failure on demand. What it stubs with is
read out of `src/fixtures/`, so the statute text in those three captures is text
the pipeline returned rather than text anyone typed.

The last two rows need the deployed build, which is a static export and answers
from those same fixtures without a service to stub:

```bash
NEXT_PUBLIC_ANNEX_MODE=replay bun run build
(cd out && python3 -m http.server 4132) &
CAPTURE_REPLAY_BASE_URL=http://localhost:4132 bun e2e/capture-states.ts
```

Either run captures the cases its base URL can reach and prints the ones it
skipped, so a half-refreshed folder says so rather than looking complete.

It is a sibling of `e2e/screenshot.ts` rather than part of it. That script
captures the routes a deployment serves and checks the console is clean, and it
cannot run at all until a `preview` script exists, which no manifest defines.
That repair belongs to the row that owns the harness.

Refresh these when the surface changes, and only then. A capture that no longer
matches what the surface renders is worse than none, because a reviewer trusts
it.

## Why these are committed

`.claude/rules/canon/ui/440-surface-capture.md` keeps captures out of git, and
that rule governs the working set. A capture taken while building is one of
dozens, it changes on every iteration, and committing it puts a stream of
binaries in history that no reader ever goes back to.

A shipped state is a different artifact. It is the evidence a reviewer needs to
judge a pull request that changed the surface, and attaching it by hand does not
reach this project's tooling, since `gh` has no image upload. So the working
captures stay ignored under `web/screenshots/` and the folder stays in
`.gitignore`, and what lands here is the final state alone: one file per state
the wireframe names, replaced rather than appended to when the surface changes.

Currently 1.1 MB across sixteen files, being eight states in two themes. That
count is the ceiling as well as the floor: a state gains a file here only by
being added to the wireframe, and a theme only by the project shipping one. If
this folder starts
growing per commit rather than per state, the split above has stopped being
honored.
