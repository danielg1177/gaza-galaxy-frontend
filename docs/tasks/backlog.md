# Backlog

Tasks not yet started, in priority order.

## Phase 1 — Local Game Engine

- [ ] **Task 3:** Build deterministic map generator (`src/game/mapGenerator.ts`)
- [ ] **Task 4:** Build fair starting-position placement (`src/game/spawnPlacer.ts`)
- [ ] **Task 5:** Build turn engine (`src/game/turnEngine.ts`)
- [ ] **Task 6:** Build planet production (`src/game/productionEngine.ts`)
- [ ] **Task 8:** Build combat resolver (`src/game/combatEngine.ts`)
- [ ] **Task 9:** Build simple AI (`src/game/aiEngine.ts`)

## Known limitations (from Task 10 MVP)

- **One fleet per human turn:** `sendFleet` in the store resolves the entire turn (production, fleet advance, AI turns) on each dispatch. The UI allows only one Send action per human turn. Future: split turn into move phase + end-turn, or queue multiple fleet orders before resolving.
- **No in-transit fleet route lines:** `react-native-svg` not installed; fleets shown as → markers at destination. Future: install `react-native-svg` and draw transit lines, or lerp positions along routes.

## Phase 2+ (future)

See `docs/development/roadmap.md` for full list.

## Changelog
- 2026-05-27: Added Task 10 MVP known limitations (one fleet per turn, no SVG fleet lines).
- 2026-05-27: File created. Tasks 1–2 moved to completed.md.
