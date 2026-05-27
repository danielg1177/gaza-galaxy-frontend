# Turn Engine System

## Status
**Implemented** in `src/game/turnEngine.ts` (2026-05-27). Combat and production are stub call points only.

## Overview
Orchestrates the resolution of a single game turn. Applies the current player's fleet dispatches, advances all fleets in transit, resolves arrivals, runs production, checks elimination/victory, and advances turn order. Returns a new `GameState` without mutating the input.

## Public API

### `PlayerAction`
```typescript
| { type: 'SEND_FLEET'; fromPlanetId: string; toPlanetId: string; shipCount: number }
| { type: 'END_TURN' }
```
- `SEND_FLEET` — dispatch ships from one owned planet to another.
- `END_TURN` — accepted in the union for client signaling; no engine effect today (turn ends when `resolveTurn` is called).

### `TurnInput`
```typescript
{
  actions: PlayerAction[];
  playerId: string;
}
```

### `resolveTurn(state, input): GameState`
Single entry point for turn resolution. Throws if `input.playerId !== state.currentPlayerId` or `state.status !== 'active'`.

## Turn Resolution Order
1. **Validate** — current player and active game status.
2. **Process `SEND_FLEET` actions** (in submission order):
   - Origin planet exists and is owned by `input.playerId`.
   - `shipCount >= 1` and `shipCount < origin.shipCount` (at least one ship must remain).
   - Destination planet exists and differs from origin.
   - `turnsRemaining` from `movementEngine.computeTurnsInTransit` (Euclidean distance, `Math.ceil`, minimum 1).
   - Deduct `shipCount` from origin; append fleet via `movementEngine.createFleet` (`fleet-{turnNumber}-{index}`).
3. **Advance fleets** — `movementEngine.advanceFleets` decrements each fleet; arrivals (`turnsRemaining <= 0`) are passed to combat; remainder stays in `fleets`.
4. **Resolve arrivals** — for each arrived fleet, `combatEngine.resolveArrival(fleet, map)` (stub: returns map unchanged).
5. **Production** — `productionEngine.runProduction(map, players)` (stub: returns players unchanged).
6. **Victory check** — a player is eliminated when their `homePlanetId` planet is missing or not owned by them (`isEliminated` updated). If exactly one non-eliminated player remains, set `status: 'finished'` and `winnerId` to that player.
7. **Advance turn** — `turnNumber += 1`; if still `active`, `currentPlayerId` moves to the next non-eliminated player in `state.players` array order (wrap around).

## Turn Order Logic
- Players are ordered by their index in `state.players`.
- After each resolved turn, the engine scans forward from the current player's index (wrapping) and selects the first player with `isEliminated === false`.
- Eliminated players are skipped for the remainder of the match.

## Stub Integration Points
| Module | Function | Contract |
|--------|----------|----------|
| `combatEngine.ts` | `resolveArrival(fleet, map)` | Returns updated `GameMap` after battle/capture at destination. |
| `productionEngine.ts` | `runProduction(map, players)` | Returns updated `map` and `players` after ship/resource generation. |
| `movementEngine.ts` | `computeTurnsInTransit`, `createFleet`, `advanceFleets` | Transit time, fleet records, and per-turn fleet advance. See `docs/systems/movement.md`. |

## Determinism
- No RNG in turn resolution.
- Same `GameState` + `TurnInput` always yields the same output.

## Changelog
- 2026-05-27: Fleet dispatch and advance delegated to `movementEngine` (`computeTurnsInTransit`, `createFleet`, `advanceFleets`).
- 2026-05-27: Implemented `resolveTurn`, `PlayerAction`, `TurnInput`; wired stub `resolveArrival` and `runProduction`.
- 2026-05-27: File created. System not yet implemented.
