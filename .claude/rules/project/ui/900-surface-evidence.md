---
description: Require the shipped state of the answer surface to be captured and carried on the pull request that changed it
paths:
  - 'web/src/app/**/*.tsx'
  - 'web/src/components/**/*.tsx'
  - 'web/src/app/globals.css'
---

# Surface evidence standards

## What to capture

- Capture every state `.claude/wireframes/answer.md` names after changing what the surface renders, in light and dark, against a production build rather than a dev server.
- Write the shipped state to `web/ui-states/`, one file per state, replacing the file that is there rather than adding beside it.
- Leave `web/screenshots/` gitignored. That path holds the working set, which changes on every iteration and belongs in no one's history.
- Read the design source before capturing, being `.claude/wireframes/answer.md` for layout and copy, `.claude/DESIGN.md` for tokens, and `web/ui-states/settled-design.html` for the type scale, spacing and treatments the drawn design settled.
- Cite a tracked path and never a path under `.canon/`, which is gitignored, in no history, and swept by the skill that wrote it. A rule pointing there resolves on one machine and nowhere else.

## What to carry on the pull request

- Link `web/ui-states/` from the pull request body whenever the diff changes what the surface renders. A reviewer who cannot see the surface is reviewing the diff alone.
- Name which states changed and which did not. A folder of nine files says nothing about which one the branch moved.
- Refresh a capture in the same change that invalidates it. A stale capture is worse than none, because a reviewer trusts it.

## What a capture is not

- Do not commit a capture taken while iterating. The shipped state is the artifact, and the run that produced it is not.
- Do not treat a green suite as evidence about appearance. A test asserts that text is present and reports nothing about whether the surface reads correctly.
