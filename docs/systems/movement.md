# Movement System

Fleet transit timing and fleet object construction. Used by the turn engine when processing `SEND_FLEET` actions and advancing fleets each turn.

## Module

`src/game/movementEngine.ts`

## Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `BASE_FLEET_RANGE_CLICKS` | 11 | Base maximum click distance a fleet may be dispatched (tech level 0) |
| `BASE_FLEET_SPEED_CLICKS_PER_TURN` | 5 | Base fleet travel speed in clicks per turn (tech level 0) |
| `RANGE_CLICKS_PER_TECH_LEVEL` | 1 | Additional range clicks per tech level |
| `SPEED_CLICKS_PER_TECH_LEVEL` | 0.5 | Additional speed clicks per turn per tech level |

## Public API

### `computeClickDistance(origin, destination): number`

Returns the Euclidean distance in clicks between two map positions:

- `sqrt((dx)² + (dy)²)` where `dx = origin.x - destination.x`, `dy = origin.y - destination.y`

Pure function; no RNG.

### `isInRange(origin, destination, rangeClicks?): boolean`

Returns whether `computeClickDistance(origin, destination) <= rangeClicks`.

- Default `rangeClicks`: `BASE_FLEET_RANGE_CLICKS` (11)

Pure function; no RNG.

### `effectiveRange(techLevel): number`

Returns dispatch range for a player at the given tech level:

- `BASE_FLEET_RANGE_CLICKS + techLevel × RANGE_CLICKS_PER_TECH_LEVEL`
- Example: tech 0 → 11; tech 5 → 16; tech 15 → 26

Pure function; no RNG.

### `effectiveSpeed(techLevel): number`

Returns fleet travel speed (clicks per turn) for a player at the given tech level:

- `BASE_FLEET_SPEED_CLICKS_PER_TURN + techLevel × SPEED_CLICKS_PER_TECH_LEVEL`
- Example: tech 0 → 5; tech 5 → 7.5; tech 15 → 12.5

Pure function; no RNG.

### `computeTurnsInTransit(origin, destination, speedClicksPerTurn?): number`

Returns how many turns a fleet needs to travel between two map positions:

- Click distance: `computeClickDistance(origin, destination)`
- Turns: `Math.ceil(clickDistance / speedClicksPerTurn)` with default speed `BASE_FLEET_SPEED_CLICKS_PER_TURN` (5)
- Clamped to a minimum of **1** turn

Pure function; no RNG.

### `createFleet(ownerId, shipCount, originPlanetId, destinationPlanetId, turnsRemaining, turnNumber, fleetIndex, dispatchedInRound): Fleet`

Builds a new in-transit fleet record:

- `id`: `fleet-{turnNumber}-{fleetIndex}` (index is the dispatch order within the turn)
- `dispatchedInRound`: the `GameState.roundNumber` when the fleet was sent; the turn engine uses this with `roundNumber` to enforce a minimum one-round delay before combat (see below)
- `totalTurns`: same as `turnsRemaining` at creation (initial transit length for UI interpolation)
- Remaining fields copied from arguments

Does not mutate game state; callers append the returned fleet to `GameState.fleets`.

### `Fleet.dispatchedInRound` and arrival eligibility

A fleet is **eligible to arrive** only when:

- `turnsRemaining <= 0`, and  
- `dispatchedInRound < state.roundNumber`

Fleets that reach `turnsRemaining: 0` via `advanceFleets` in the same round they were dispatched (`dispatchedInRound === state.roundNumber`) stay in `GameState.fleets` until a later round; they are **not** resolved at turn start until `roundNumber` advances.

With round-based ticking, a fleet dispatched in round 1 with ETA 2 is advanced at the end of round 1 (2→1) and end of round 2 (1→0); on that round-2 wrap, `turnEngine` calls `resolveArrival` immediately so capture is visible at the **start of round 3** (first player turn of round 3).

### `advanceFleets(fleets): { inTransit: Fleet[]; arrived: Fleet[] }`

Simulates one turn of fleet movement for all fleets:

1. Decrements `turnsRemaining` by 1 on each fleet (new objects; input array unchanged)
2. Fleets with `turnsRemaining <= 0` after decrement go to `arrived` with `turnsRemaining: 0`
3. All others go to `inTransit` with the decremented value

## Turn engine integration

`turnEngine.resolveTurn`:

1. At turn **start**, resolves eligible arrivals (`turnsRemaining <= 0` and `dispatchedInRound < roundNumber`) via `combatEngine.resolveArrival`
2. Rejects `SEND_FLEET` when destination is beyond the dispatching player's `effectiveRange(techLevel)` (`isInRange` with computed range)
3. Calls `computeTurnsInTransit` with `effectiveSpeed(techLevel)` when validating each `SEND_FLEET` action (origin/destination planet positions)
4. Calls `createFleet` with `dispatchedInRound: state.roundNumber` for each dispatch
5. Calls `advanceFleets` only on round wrap (once per full player cycle); calls `resolveArrival` for each `arrived` fleet immediately; keeps only `inTransit` in `GameState.fleets`. Turn-start eligibility resolution remains as a safety net.

### Client UI

Fleet dispatch is initiated in `GameScreen` via touch-and-drag from an owned planet to a destination planet. On release over a valid in-range target, a ship-count modal confirms the order; the stepper supports − / + / **All**, and the ship count is **tappable** to open a numeric `TextInput` (digits only, clamped to `0…max` on blur or keyboard submit, where `max` is garrison minus other queued outbound from that planet this turn). `gameStore.confirmPendingFleet` calls `queueOrder` (appends to `queuedOrders` without resolving the turn). The player presses **End Turn** to call `endTurn()`, which batches all queued orders as `SEND_FLEET` actions plus `END_TURN` in one `resolveTurn` call.

### Fleet visualization (`GameScreen`)

In-transit fleets render on an SVG overlay (`react-native-svg`) sized to the map canvas, above planet nodes and below the pinch/pan gesture layer.

For each fleet in `gameState.fleets`:

1. Resolve `originPlanet` and `destinationPlanet` from the map.
2. Interpolate position along the route:
   - `progress = totalTurns > 0 ? 1 - (turnsRemaining / totalTurns) : 1`
   - Pixel center: origin planet center + (destination − origin) × `CELL_SIZE` × `progress`
3. Draw a dashed `<Line>` from the interpolated point to the destination planet center (owner color, opacity 0.6).
4. Draw a filled arrow-head `<Polygon>` at the interpolated point, tip pointing toward the destination (owner fill).
5. Draw ship count as `<SvgText>` offset from the marker, using the same owner color as the arrow.

`Fleet.totalTurns` is set in `createFleet` to the initial `turnsRemaining` at dispatch so the UI can compute progress without recomputing transit time. ~~Destination-cluster markers (arrow + dot below target planet)~~ removed 2026-05-27 (Task 25).

## Determinism

No randomness. Same positions and fleet list always produce the same transit times and advance results.

## Send validation (via turn engine)

`processSendFleet` in `turnEngine.ts` validates each `SEND_FLEET` action: origin owned by sender, destination in range (`isInRange` + `effectiveRange`), and `1 <= shipCount <= origin.shipCount`. Players may send every ship off an owned planet; ownership persists at 0 garrison until combat changes it (see `combat.md`).

## Changelog

- 2026-06-01: Fleet dispatch modal — tap ship count to type a value; clamped to `0…max` on blur/submit; − / + / **All** unchanged.
- 2026-05-28: In-transit and queued-departure fleet markers use arrow-head polygons (tip toward destination) instead of circles; ship-count labels use owner color (same as marker).
- 2026-05-28: Task 76 — removed minimum 1-ship garrison on dispatch; `shipCount` may equal `origin.shipCount`.
- 2026-05-28: Task 74 — round-wrap `advanceFleets` arrivals resolved immediately in `turnEngine`; updated `advanceFleets` comment.
- 2026-05-28: Task 57 — documented round-wrap fleet ticking cadence (one transit decrement per full player cycle) and explicit ETA-2 arrival timing (start of round 3 when dispatched in round 1).

- 2026-05-27: Task 25 — interpolated fleet position viz; react-native-svg; `totalTurns` field.
- 2026-05-27: Task 24 — drag-to-move fleet UX; tap-based dispatch removed.
- 2026-05-27: Tech-scaled fleet stats — `effectiveRange`, `effectiveSpeed`, `RANGE_CLICKS_PER_TECH_LEVEL`, `SPEED_CLICKS_PER_TECH_LEVEL`; turn engine uses dispatching player's `techLevel` for range and transit speed.
- 2026-05-27: **Task 13** — `dispatchedInRound` on `Fleet` and `createFleet`; arrival/combat at turn start when `dispatchedInRound < roundNumber`; `advanceFleets` no longer implies immediate combat.
- 2026-05-27: Task 11 — reworked movement to clicks model; added range check, `computeClickDistance`, `isInRange`, `BASE_FLEET_RANGE_CLICKS`, `BASE_FLEET_SPEED_CLICKS_PER_TURN`.
- 2026-05-27: Initial movement system — `computeTurnsInTransit`, `createFleet`, `advanceFleets`; extracted from `turnEngine.ts`.
