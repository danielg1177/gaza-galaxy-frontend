# Movement System

Fleet transit timing and fleet object construction. Used by the turn engine when processing `SEND_FLEET` actions and advancing fleets each turn.

## Module

`src/game/movementEngine.ts`

## Public API

### `computeTurnsInTransit(origin, destination): number`

Returns how many turns a fleet needs to travel between two map positions:

- Euclidean distance: `sqrt((dx)² + (dy)²)`
- Rounded up with `Math.ceil`
- Clamped to a minimum of **1** turn

Pure function; no RNG.

### `createFleet(ownerId, shipCount, originPlanetId, destinationPlanetId, turnsRemaining, turnNumber, fleetIndex): Fleet`

Builds a new in-transit fleet record:

- `id`: `fleet-{turnNumber}-{fleetIndex}` (index is the dispatch order within the turn)
- Remaining fields copied from arguments

Does not mutate game state; callers append the returned fleet to `GameState.fleets`.

### `advanceFleets(fleets): { inTransit: Fleet[]; arrived: Fleet[] }`

Simulates one turn of fleet movement for all fleets:

1. Decrements `turnsRemaining` by 1 on each fleet (new objects; input array unchanged)
2. Fleets with `turnsRemaining <= 0` after decrement go to `arrived` with `turnsRemaining: 0`
3. All others go to `inTransit` with the decremented value

## Turn engine integration

`turnEngine.resolveTurn`:

1. Calls `computeTurnsInTransit` when validating each `SEND_FLEET` action (origin/destination planet positions)
2. Calls `createFleet` to append each dispatched fleet
3. Calls `advanceFleets` after all dispatches, then passes `arrived` fleets to `combatEngine.resolveArrival`

## Determinism

No randomness. Same positions and fleet list always produce the same transit times and advance results.

## Changelog

- 2026-05-27: Initial movement system — `computeTurnsInTransit`, `createFleet`, `advanceFleets`; extracted from `turnEngine.ts`.
