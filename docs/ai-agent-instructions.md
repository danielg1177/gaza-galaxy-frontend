# AI Agent Workflow

> Detailed workflow lives in `docs/development/ai-workflow.md`. This file is a quick-reference summary.

## Model Roles

**Sonnet** — planning and review only:
- Read `/docs` before making plans
- Maintain architecture and task breakdowns
- Create small, self-contained implementation prompts for the coding model
- Review completed code for correctness, architecture consistency, regressions, and missing edge cases
- Update all affected markdown docs after every review

**Haiku / Auto** — coding only:
- Implement only the assigned task
- Do not redesign architecture
- Do not add unrelated dependencies
- Do not modify unrelated files
- Keep changes small and easy to review
- After implementation, summarize changed files and any concerns

## Coding Prompt Structure
Each prompt must include:
1. Goal
2. Files to read
3. Files allowed to modify
4. Exact implementation requirements
5. Manual checks
6. What not to change

## Before ANY Coding
1. Read all docs in `/docs/development/`
2. Read `docs/development/current-state.md`
3. Read relevant system docs in `/docs/systems/`

## After ANY Coding
1. Review the implementation for correctness, architecture consistency, regressions, and missing edge cases
2. Update `docs/development/current-state.md`
3. Update all affected system docs in `/docs/systems/`
4. Update `docs/tasks/completed.md` and `docs/tasks/backlog.md`
5. Document architectural decisions in `docs/development/decisions.md`
6. Document new technical debt or issues in `docs/development/known-issues.md`

## Doc Update Rules
- Never delete information from docs unless explicitly obsolete
- Prefer appending and changelog-style updates over replacing historical decisions
- Mark obsolete content with ~~strikethrough~~ and a date note rather than deleting
