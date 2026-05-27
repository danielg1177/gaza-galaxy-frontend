# AI Agent Workflow

## Model Roles

### Sonnet (Planning / Review Model)
- Reads all `/docs` before making plans
- Creates small, self-contained implementation prompts for the coding model
- Reviews completed code for correctness, architecture consistency, regressions, and missing edge cases
- Updates docs after every review
- Does NOT directly implement large features

### Haiku / Auto (Coding Model)
- Implements only the assigned task
- Does not redesign architecture
- Does not add unrelated dependencies
- Does not modify unrelated files
- Keeps changes small and easy to review
- After implementation: summarizes changed files and any concerns

## Prompt Structure
Each coding prompt must include:
1. **Goal** — one sentence
2. **Files to read** — explicit list
3. **Files allowed to modify** — explicit list
4. **Exact implementation requirements** — numbered list
5. **Manual checks** — how to verify correctness
6. **What not to change** — explicit exclusions

## Before ANY Coding
1. Read all docs in `/docs/development/`
2. Read `docs/development/current-state.md`
3. Read relevant system docs in `/docs/systems/`

## After ANY Coding (both models)
1. Update `docs/development/current-state.md`
2. Update affected system docs in `/docs/systems/`
3. Update `docs/tasks/completed.md` and `docs/tasks/backlog.md`
4. Document architectural decisions in `docs/development/decisions.md`
5. Document new technical debt or known issues in `docs/development/known-issues.md`

## Doc Update Rules
- Never delete information from docs unless explicitly obsolete
- Prefer appending and changelog-style updates over replacing historical decisions
- Mark obsolete sections with `~~strikethrough~~` and a date note rather than deleting

## Changelog
- 2026-05-27: Moved from `docs/ai-agent-instructions.md` and expanded with doc-update rules.
