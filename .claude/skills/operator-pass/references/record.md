# The pass record

Read when starting the pass file, recording a finding, and recording a pick.

## File

- Write to `.canon/review/<nn>-<pass>/operator-pass.md`, with `<nn>` the pass's place in order and `<pass>` its name, such as `04-fourth-use`.
- Open with one paragraph naming the pass, the date, the commit and what landed since the last pass, then `## Conditions`, `## Findings`, `## Picks`, `## Pass summary` and `## Handoff`.
- Number findings with one letter per pass and a counter, and never reuse a number.

## Folder names

- Prefix the pass folder with two digits counting the passes before it plus one, since names alone sort out of order: `fourth-use` sorts ahead of `second-use`.
- Put a round's captures at `.canon/review/<nn>-<pass>/evidence/<nn>-<slug>/` and its candidate pages at `.canon/tmp/<nn>-<slug>/`, where `<nn>` is the finding's own number, so T1's folders start `01-`.
- Leave a gap where a finding has no draft. The missing number is what maps each folder to its entry in the record.
- Take `<slug>` from the decision sentence the way `draft-and-pick` Step 1 derives it, and add only the prefix.
- Rename no folder from a pass that predates this rule. Tracked documents cite those paths, and a rename breaks every citation.

## A finding

- Head it `### T<n>: <what is wrong, as a claim>`.
- State what the operator saw, the code behind it by path and line, and the measurement in a table when it has more than two readings.
- Name an earlier pick the finding revises, and a collision with work in flight.

## A pick

- Head it `### Pick <n>, T<n>: arm <id>, <what won>`.
- One paragraph on what the arm does and its measured result, then `It beat:` with one bullet per losing arm and the number that lost it.
- One `Evidence:` line naming the evidence folder and its file set.
- `Build criteria:` as bullets a builder checks against the built page, each measurable, including what the render shows that the prose does not.
- An answer to a question the operator asked with the pick goes under the criteria, stated as a decision with its reason.

## Close

- `## Pass summary` is one table row per finding: the finding, the pick, and the arms it beat.
- `## Handoff` proposes how the picks split into pull requests by the files each writes, and names shared files and the order they force.
