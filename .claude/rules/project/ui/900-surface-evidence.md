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

- Capture every state `.claude/wireframes/answer.md` names after changing what the surface renders, in light and dark, against a production build rather than a dev server. `web/e2e/capture-states.ts` does this, and its own header states how to run it.
- Write the shipped state to `web/evidence/<state>/`, one file per theme, replacing the file that is there rather than adding beside it.
- Commit both themes for every state. The dark theme re-values each role rather than inverting the light one, so a regression in one is invisible in a capture of the other, and a set carrying one theme for most states and both for a few reports nothing about which was checked.
- Leave `web/screenshots/` gitignored. That path holds the working set, which changes on every iteration and belongs in no one's history.
- Read the design source before capturing, being `.claude/wireframes/answer.md` for layout and copy, `.claude/DESIGN.md` for tokens, and `web/evidence/settled-design.html` for the type scale, spacing and treatments the drawn design settled.
- Cite a tracked path and never a path under `.canon/`, which is gitignored, in no history, and swept by the skill that wrote it. A rule pointing there resolves on one machine and nowhere else.

## What to carry on the pull request

- Link `web/evidence/` from the pull request body whenever the diff changes what the surface renders. A reviewer who cannot see the surface is reviewing the diff alone.
- Name which states changed and which did not. A folder of ten states says nothing about which one the branch moved.
- Refresh a capture in the same change that invalidates it. A stale capture is worse than none, because a reviewer trusts it.

## What a capture is not

- Do not treat a green suite as evidence about appearance. A test asserts that text is present and reports nothing about whether the surface reads correctly.
