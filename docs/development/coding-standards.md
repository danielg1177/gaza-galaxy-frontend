# Coding Standards

## Language
- TypeScript everywhere. No plain JavaScript files.
- Strict mode enabled (`tsconfig.json`).

## File Structure
```
src/game/        — all game engine logic (no UI, no React)
src/screens/     — React Native screens (to be created)
src/components/  — Reusable UI components (to be created)
src/store/       — Zustand state management (to be created)
docs/            — all documentation
```

## Naming Conventions
- Files: `camelCase.ts`
- Types/Interfaces: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

## Game Engine Rules
- `src/game/` must be pure TypeScript — no React, no React Native imports
- Game logic must be deterministic (no `Math.random()` — use seeded RNG)
- All public functions must have explicit return types

## Dependency Rules
- Do not add packages without a clear, justified reason
- Do not use packages that require native linking unless unavoidable
- Prefer standard library or simple utility functions over heavy dependencies

## Comments
- Comment non-obvious logic only
- Do not comment what the code obviously does
- Document edge cases and design decisions inline where they occur

## Changelog
- 2026-05-27: File created.
