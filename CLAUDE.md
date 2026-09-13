# Project

An agent over the EU AI Act. It reports which articles apply to a described AI system, cited to the text, and refuses where the text does not settle the question.

## Context

- Before non-trivial work in a domain read `canon/context/<domain>.md`, and before touching a UI surface read `canon/wireframes/<surface>.md`. Pick which from the index anchors below.
- Read `canon/context/ai-act.md` before touching ingestion, retrieval, or any answer text. It holds the corpus structure, the amended deadlines, and the claims this project does not make.

@canon/REQUIREMENTS.md
@canon/ARCHITECTURE.md
@canon/context/index.md
@canon/wireframes/index.md

## Commands

- These conventions came from a toolkit with its own CLI. A rule or standard naming a command is naming that CLI, present only where this project installed it.
- Run `./scripts/verify.sh` before committing, and `bun run check` for the whole gate across both halves. Full script reference in the development entry under `canon/context/`.

## Constraints

- A measurement holds only under the conditions it ran in. Read a setting back rather than trusting the call that set it, and reset a cache or a loaded model before timing a first call.

## Key paths

- `canon/context/ai-act.md`: the corpus. Regulation structure, amended deadlines, and the claims this project does not make
- `scripts/verify.sh`: the pre-commit gate
- `canon/DESIGN.md`: design tokens and the visual system
- `canon/context/`: per-domain narrative (how a domain is structured, decisions, gotchas), indexed via `canon/context/index.md`
- `canon/wireframes/`: per-surface ASCII layouts loaded on demand, indexed via `canon/wireframes/index.md`
