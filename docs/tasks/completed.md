# Completed Tasks

## Task 1 — Set up clean folder structure
**Completed:** 2026-05-27
**Files created:**
- `src/game/types.ts`
- `src/game/mapGenerator.ts`
- `src/game/spawnPlacer.ts`
- `src/game/turnEngine.ts`
- `src/game/productionEngine.ts`
- `src/game/movementEngine.ts`
- `src/game/combatEngine.ts`
- `src/game/aiEngine.ts`
- `src/game/validationEngine.ts`
- `src/game/index.ts`
**Notes:** All stubs. `npx tsc --noEmit` passes clean.

---

## Task 2 — Define game types/interfaces
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts`
**Types defined:** `PlanetClass`, `BuildingType`, `OwnerId`, `Position`, `Building`, `Planet`, `Fleet`, `Player`, `GameMap`, `GameState`
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 3 — Build deterministic map generator
**Completed:** 2026-05-27
**Files modified:**
- `src/game/mapGenerator.ts`
**Exports:** `MapConfig`, `generateMap()`
**Notes:** Mulberry32 seeded RNG (no `Math.random()`). Planet class weights E=35%, D=30%, C=20%, B=10%, A=5%. Minimum planet spacing `max(2, min(width,height) / (planetCount * 0.5))`. `npx tsc --noEmit` passes clean.

---

## Task 4 — Build fair starting-position placement
**Completed:** 2026-05-27
**Files modified:**
- `src/game/spawnPlacer.ts`
**Exports:** `placeSpawns()`
**Notes:** Evaluates 200 random one-planet-per-player assignments. Scores each set with weighted, batch-normalized metrics: minimum pairwise home distance (0.5), variance of nearby planet counts within `R = min(width,height)*0.25` (0.3, lower is better), and center-bias penalty averaged per home (0.2, lower is better). Winning assignment sets `isHomePlanet`, `owner`, and `shipCount: 5`. Returns a new `GameMap` without mutating the input. `npx tsc --noEmit` passes clean.

---

## Task 5 — Build turn engine
**Completed:** 2026-05-27
**Files modified:**
- `src/game/turnEngine.ts`
- `src/game/combatEngine.ts` (stub `resolveArrival` signature)
- `src/game/productionEngine.ts` (stub `runProduction` signature)
**Exports:** `PlayerAction`, `TurnInput`, `resolveTurn()`
**Notes:** Validates active player and game status. Processes `SEND_FLEET` (distance-based `turnsRemaining`, garrison rules, fleet ids `fleet-{turnNumber}-{index}`). Advances all fleets, calls `resolveArrival` and `runProduction` stubs, updates elimination from home-planet ownership, sets winner when one player remains, cycles `currentPlayerId` among non-eliminated players. Immutable input — returns new `GameState`. `npx tsc --noEmit` passes clean.

---

## Task 6 — Build planet production
**Completed:** 2026-05-27
**Files modified:**
- `src/game/productionEngine.ts`
- `src/game/turnEngine.ts`
**Files created:**
- `docs/systems/production.md`
**Exports:** `runProduction()`, `PLANET_CLASS_MULTIPLIERS`, `BASE_SHIP_PRODUCTION`, `BASE_RESOURCE_PRODUCTION`, `MANUFACTURING_BONUS_PER_LEVEL`
**Notes:** Per owned planet each turn: `multiplier = classMultiplier + Σ(manufacturingFacility.level × 0.4)`; class multipliers A=2.0, B=1.6, C=1.2, D=0.8, E=0.5; `ships = floor(2 × multiplier)` added to `planet.shipCount`; `resources = floor(1 × multiplier)` added to owner `Player.resources`. Neutral planets skipped. Returns `{ map, players }` without mutating inputs. `turnEngine.resolveTurn` destructures the result. `npx tsc --noEmit` passes clean.

---

## Task 7 — Build fleet movement
**Completed:** 2026-05-27
**Files modified:**
- `src/game/movementEngine.ts`
- `src/game/turnEngine.ts`
**Files created:**
- `docs/systems/movement.md`
**Exports:** `computeTurnsInTransit()`, `createFleet()`, `advanceFleets()`
**Notes:** Transit time = `Math.max(1, Math.ceil(euclidean distance))`. Fleet ids `fleet-{turnNumber}-{fleetIndex}`. `advanceFleets` decrements `turnsRemaining` immutably and splits into `inTransit` / `arrived` (arrived fleets get `turnsRemaining: 0`). `turnEngine` delegates dispatch and advance; removed inline `euclideanDistanceCeil`. `npx tsc --noEmit` passes clean.

---

## Task 8 — Build combat resolver
**Completed:** 2026-05-27
**Files modified:**
- `src/game/combatEngine.ts`
**Files created:**
- `docs/systems/combat.md` (documented implementation)
**Exports:** `resolveArrival()`, `DEFENSE_BONUS`, `ATTACKER_TECH_MULTIPLIER`, `DEFENDER_TECH_MULTIPLIER`
**Notes:** On fleet arrival: friendly owner match adds `fleet.shipCount` to garrison; neutral planets transfer ownership with fleet ships as garrison; enemy planets run deterministic combat — `attackerStrength = fleet.shipCount × ATTACKER_TECH_MULTIPLIER`, `defenderStrength = planet.shipCount × DEFENDER_TECH_MULTIPLIER × DEFENSE_BONUS` (1.2 defender bonus). Attacker wins if strictly greater (`shipCount = floor(attacker - defender)`, owner changes); defender holds on tie or win (`shipCount = floor(defender - attacker)`, owner unchanged). Tech multipliers fixed at 1.0 pending player lookup. Returns new `GameMap` without mutating inputs. `npx tsc --noEmit` passes clean.

---

## Task 9 — Build simple AI
**Completed:** 2026-05-27
**Files modified:**
- `src/game/aiEngine.ts`
**Files created:**
- `docs/systems/ai-system.md` (documented implementation)
**Exports:** `computeAiTurn()`, `AiDifficulty`
**Notes:** Deterministic heuristic AI (no randomness). Priority: (1) reinforce home if garrison < any incoming enemy fleet and source has `shipCount > 5`; (2) attack lowest `shipCount / distanceToNearestAiPlanet` enemy where `floor(60% ships)` wins combat (`DEFENSE_BONUS`); (3) expand to nearest neutral with `floor(50% ships)` from closest AI planet with `shipCount > 4`; (4) `END_TURN`. One source planet per turn; always leaves ≥1 ship on source. `AiDifficulty` (`easy` | `normal`) exported for future tuning (same logic today). `npx tsc --noEmit` passes clean.

---

## Task 10 — Build playable local screen
**Completed:** 2026-05-27
**Sub-tasks:** 10a (Zustand store), 10b (HomeScreen + navigation), 10c (GameScreen gameplay UI)
**Files created:**
- `src/store/gameStore.ts`
- `src/screens/HomeScreen.tsx`
- `src/screens/GameScreen.tsx`
**Files modified:**
- `App.tsx` — `NavigationContainer`, native stack, `RootStackParamList`
- `package.json` — zustand, React Navigation, safe-area/screens peers
**Notes:** Local MVP: Home configures match and calls `startNewGame`; Game shows pannable 2D map (`CELL_SIZE` 18), owner-colored planets, fleet dispatch UI, auto AI turn resolution via store. MVP limits: one human `sendFleet` per turn (full turn resolves on send); no SVG fleet lines (`react-native-svg` not installed). `npx tsc --noEmit` passes clean.

---

## Changelog
- 2026-05-27: Task 10 entry added.
- 2026-05-27: Task 9 entry added.
- 2026-05-27: Task 8 entry added.
- 2026-05-27: Task 7 entry added.
- 2026-05-27: Task 6 entry added.
- 2026-05-27: Task 5 entry added.
- 2026-05-27: Task 4 entry added.
- 2026-05-27: Task 3 entry added.
- 2026-05-27: File created with tasks 1–2.
