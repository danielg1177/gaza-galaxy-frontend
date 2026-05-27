# Current State

## Last Updated
2026-05-27

## Overall Status
**Phase 1 local MVP complete.** Core game engine (tasks 2–9) and playable local client (task 10) are implemented. Backend not started.

## Completed
- Expo SDK 54 + TypeScript project initialized
- `src/game/` folder structure created with stub modules
- Task 2: Core game types/interfaces defined in `src/game/types.ts`
- Task 3: Deterministic map generator (`src/game/mapGenerator.ts`)
- Task 4: Fair spawn placement (`src/game/spawnPlacer.ts`)
- Task 5: Turn engine orchestrator (`src/game/turnEngine.ts`)
- Task 6: Planet production (`src/game/productionEngine.ts`)
- Task 7: Fleet movement (`src/game/movementEngine.ts`)
- Task 8: Combat resolver (`src/game/combatEngine.ts`)
- Task 9: Heuristic AI (`src/game/aiEngine.ts`)
- Task 10: Playable local screen — Zustand store, HomeScreen, GameScreen with pan/zoom map and fleet dispatch
- Documentation structure established under `/docs`

## In Progress
_None._

## Next Up
- Phase 2: Laravel backend and persistence (see `docs/development/roadmap.md`)

## Dependencies (client)
- `zustand` — game store
- `@react-navigation/native`, `@react-navigation/native-stack` — `NavigationContainer` + native stack (`Home`, `Game`)
- `react-native-screens`, `react-native-safe-area-context` — React Navigation peers (Expo SDK 54 pins)

## What Works Right Now
- **Home → Game flow:** configure match on HomeScreen, launch into full game view
- **GameScreen:** 2D pannable map (`CELL_SIZE` 18), colored planets by owner, home rings, selected-planet pulse, ship counts, in-transit fleet markers at destinations (→ + dot)
- **Fleet dispatch:** select owned planet on your turn, pick destination (transit turns shown), ship stepper, Send — store resolves turn + AI turns until human again
- **End game:** victory/defeat banner, New Game returns to Home
- `npx tsc --noEmit` passes clean
- Full engine: map gen, spawns, turns, production, movement, combat, AI

## What Does NOT Work Yet
- No fleet route SVG lines (`react-native-svg` not installed)
- One human fleet dispatch per turn (MVP limitation — see backlog)
- No backend / multiplayer / persistence

## Active Files
| File | Status |
|------|--------|
| `src/game/types.ts` | Defined — core types |
| `src/game/mapGenerator.ts` | Implemented — seeded map generation |
| `src/game/spawnPlacer.ts` | Implemented — fair home planet placement |
| `src/game/turnEngine.ts` | Implemented — turn resolution orchestrator |
| `src/game/productionEngine.ts` | Implemented — `runProduction` with class/building multipliers |
| `src/game/movementEngine.ts` | Implemented — transit time, fleet creation, advance |
| `src/game/combatEngine.ts` | Implemented — `resolveArrival` with reinforcement, capture, combat |
| `src/game/aiEngine.ts` | Implemented — `computeAiTurn`, `AiDifficulty` |
| `src/game/validationEngine.ts` | Stub only |
| `src/game/index.ts` | Re-exports all modules |
| `src/store/gameStore.ts` | Zustand store — local match state and actions |
| `src/screens/HomeScreen.tsx` | New-game setup UI |
| `src/screens/GameScreen.tsx` | Playable galaxy map + fleet dispatch |
| `App.tsx` | Navigation root (`SafeAreaProvider`, stack navigator) |

## Changelog
- 2026-05-27: Task 10 complete — playable `GameScreen` (map canvas, status bar, bottom panel, fleet send, game over).
- 2026-05-27: Task 10b — `App.tsx` wired with React Navigation; `HomeScreen` and `GameScreen` stub.
- 2026-05-27: Task 10a — `src/store/gameStore.ts`; zustand + React Navigation deps.
- 2026-05-27: Task 9 complete — `aiEngine.ts` implements `computeAiTurn` with three-priority heuristic AI; engine tasks 2–9 are done.
- 2026-05-27: Task 8 complete — `combatEngine.ts` implements `resolveArrival` (friendly reinforce, neutral capture, deterministic combat with `DEFENSE_BONUS` and tech multiplier placeholders).
- 2026-05-27: Task 7 complete — `movementEngine.ts` implements `computeTurnsInTransit`, `createFleet`, `advanceFleets`; `turnEngine` refactored to delegate fleet logic.
- 2026-05-27: Task 6 complete — `productionEngine.ts` implements `runProduction` with planet class multipliers, manufacturing facility bonuses, and immutable `{ map, players }` return; `turnEngine` updated to destructure result.
- 2026-05-27: Task 5 complete — `turnEngine.ts` implements `resolveTurn` with fleet dispatch, transit advance, stub combat/production hooks, elimination/victory, and turn order cycling.
- 2026-05-27: Task 4 complete — `spawnPlacer.ts` implements 200-candidate random search with distance, nearby-count variance, and center-bias scoring.
- 2026-05-27: Task 3 complete — `mapGenerator.ts` implements mulberry32 RNG, `MapConfig`, planet placement, and class weights.
- 2026-05-27: File created. Recorded initial project state after tasks 1–2.
