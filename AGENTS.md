# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

# Documentation Requirements

Before ANY coding:
1. Read `docs/development/current-state.md`
2. Read `docs/development/ai-workflow.md`
3. Read relevant system docs in `docs/systems/`

After ANY coding:
1. Review implementation for correctness, architecture consistency, regressions, and missing edge cases
2. Update `docs/development/current-state.md`
3. Update all affected docs in `docs/systems/`
4. Update `docs/tasks/completed.md` and `docs/tasks/backlog.md`
5. Update `docs/development/decisions.md` if any architectural choices were made
6. Update `docs/development/known-issues.md` if any debt or issues were introduced

## Doc Update Rules
- Never delete information from docs unless explicitly obsolete
- Prefer appending/changelog-style updates over replacing historical decisions
- Mark obsolete content with ~~strikethrough~~ and a date note rather than deleting

## Docs Structure
```
docs/
├── project-spec.md          — canonical game design reference
├── architecture.md          — system architecture overview
├── systems/                 — one file per game/backend system
├── gameplay/                — rules, balancing, factions
├── development/             — setup, standards, workflow, current state
└── tasks/                   — backlog, in-progress, completed
```
