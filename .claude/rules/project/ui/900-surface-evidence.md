---
description: Require the shipped state of the answer surface to be captured and carried on the pull request that changed it
paths:
  - 'web/src/app/**/*.tsx'
  - 'web/src/components/**/*.tsx'
  - 'web/src/app/globals.css'
---

# Surface evidence standards

`.claude/rules/canon/ui/440-surface-capture.md` splits every capture into an
ignored sweep and a committed evidence case. The toolkit's upstream carries a
further bullet, committed 2026-09-08, admitting that a project whose own
established convention already commits that comparison may route a flagged
case's evidence there instead of a separate evidence folder. This repository's
synced copy is pinned a release behind and does not carry that sentence. This
file is that established convention regardless: `web/evidence/` is where
this project has committed the answer surface's shipped state since before the
toolkit carried any carve-out. What follows is what the toolkit rule leaves to
the project to decide, being where the folder lives, how it is organized, and
what a pull request has to carry.

## What to capture

- Capture every state `canon/wireframes/answer.md` names after changing what the surface renders, in light and dark, against a production build rather than a dev server. `web/e2e/capture-states.ts` does this, and its own header states how to run it.
- Write the shipped state to `web/evidence/<state>/`, one file per theme, replacing the file that is there rather than adding beside it.
- Commit both themes for every state. The dark theme re-values each role rather than inverting the light one, so a regression in one is invisible in a capture of the other, and a set carrying one theme for most states and both for a few reports nothing about which was checked.
- Leave `web/screenshots/` gitignored. That path holds the working set, which changes on every iteration and belongs in no one's history.
- Read the design source before capturing, being `canon/wireframes/answer.md` for layout and copy and `canon/DESIGN.md` for tokens.
- Cite a tracked path and never a path under `.canon/`, which is gitignored, in no history, and swept by the skill that wrote it. A rule pointing there resolves on one machine and nowhere else.
- `web/evidence/3-loading/` renders a live elapsed-time counter, shipped in `#35`, so two runs of the capture never come back byte-identical. The toolkit's double-capture check binds only at first commit, and this state committed before the counter existed, so nothing today is in violation. A session recapturing it anyway meets the variance and has nothing warning it why: `#36` hit exactly this and its worker named the difference by hand rather than re-running toward a match that cannot happen. Expect the mismatch on this one state and do not chase it as a bug. Name the
  actual difference in the pull request body, the way `#36` named a
  one-millisecond change to a step's duration label, so a reviewer can tell a
  live-counter capture from a real regression rather than trusting that this
  bullet was the reason.

## What to carry on the pull request

- Link `web/evidence/` from the pull request body whenever the diff changes what the surface renders. A reviewer who cannot see the surface is reviewing the diff alone.
- Name which states changed and which did not. A folder of ten states says nothing about which one the branch moved.
- Run the capture, then commit only the states this branch changed, leaving
  every other file in `web/evidence/` untouched.
- Two branches touching different states do not collide, since each commits
  its own subset and neither overwrites a file the other never captured. That
  holds only while each branch's subset stays partial. A change to a
  surface-wide property, such as the font, a label treatment, or a band that
  renders on every state, puts every state in the branch's subset, so it
  touches whatever any other in-flight branch touches and the next bullet
  governs it instead.
- When two branches change the same state, the branch that merges second
  rebases onto the merged trunk and recaptures that state before its own
  merge, so what lands is never compared against a version it has since
  moved past. A surface-wide change recaptures every state this way, not only
  the one state the previous bullet's narrowing names, since its subset is the
  whole set.

## What a capture is not

- Do not treat a green suite as evidence about appearance. A test asserts that text is present and reports nothing about whether the surface reads correctly.
