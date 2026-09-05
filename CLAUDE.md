# Project

An agent over the EU AI Act. It reports which articles apply to a described AI system, cited to the text, and refuses where the text does not settle the question.

## Context

- Before non-trivial work in a domain read `.claude/context/<domain>.md`, and before touching a UI surface read `.claude/wireframes/<surface>.md`. Pick which from the index anchors below.
- Read `.claude/context/ai-act.md` before touching ingestion, retrieval, or any answer text. It holds the corpus structure, the amended deadlines, and the claims this project does not make.

@.claude/REQUIREMENTS.md
@.claude/ARCHITECTURE.md
@.claude/context/index.md
@.claude/wireframes/index.md

## Commands

- These conventions came from a toolkit with its own CLI. A rule or standard naming a command is naming that CLI, present only where this project installed it.
- Run `./scripts/verify.sh` before committing. No `package.json` exists yet, so dependency and script installation arrives with `canon tooling sync <stack> --write`. Full script reference in the development entry under `.claude/context/`.

## Key paths

- `.claude/context/ai-act.md`: the corpus. Regulation structure, amended deadlines, and the claims this project does not make
- `scripts/verify.sh`: the pre-commit gate
- `.claude/DESIGN.md`: design tokens and the visual system
- `.claude/context/`: per-domain narrative (how a domain is structured, decisions, gotchas), indexed via `.claude/context/index.md`
- `.claude/wireframes/`: per-surface ASCII layouts loaded on demand, indexed via `.claude/wireframes/index.md`
