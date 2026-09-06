# Answer surface, as it renders

Nine captures of the one surface this project has, taken at 1280px against a
production build. They are here so a reviewer can see what a change did to the
surface without running it, and so a later change has something to be compared
against.

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

| File                                           | State                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [Empty](1-empty-light.png)                     | On arrival, before anything is asked                                |
| [Invalid](2-invalid-light.png)                 | The description is empty or past the bound                          |
| [Loading](3-loading-light.png)                 | The skeleton, and the measured range in the copy                    |
| [Answered](4-answered-light.png)               | Claims, inline citations, the moved-citation chip, the trace opened |
| [Answered, dark](4-answered-dark.png)          | The same markup with one token set swapped                          |
| [Cut short](5-answered-cut-short-light.png)    | The answer stopped for want of prompt room                          |
| [Refused](6-refused-light.png)                 | The text does not settle it, and what was read before saying so     |
| [Unavailable](7-failure-unavailable-light.png) | The model or the index is not running                               |
| [Unreachable](8-failure-unreachable-light.png) | Nothing is listening on the service port                            |

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

There is no capture script that produces this set. `web/scripts/screenshot.sh`
covers the empty state in both themes and cannot run at all until a `preview`
script exists, which no manifest defines. The states above were driven by hand
against a built app with the service stubbed at the network layer.

Refresh them when the surface changes, and only then. A capture that no longer
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

Currently 648 KB across nine files. Keep it that way. If this folder starts
growing per commit rather than per state, the split above has stopped being
honored.
