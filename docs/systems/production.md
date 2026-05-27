# Production System

Planet production runs once per turn during turn resolution, after fleet arrivals are resolved.

## Module

`src/game/productionEngine.ts`

## Public API

```typescript
runProduction(map: GameMap, players: Player[]): { map: GameMap; players: Player[] }
```

Returns a new `GameMap` (updated planet garrisons) and a new `Player[]` (updated resource totals). Does not mutate the input `map` or `players`.

## Formula

For each planet where `owner !== 'neutral'`:

1. **Class multiplier** — from `PLANET_CLASS_MULTIPLIERS`:
   - A = 2.0, B = 1.6, C = 1.2, D = 0.8, E = 0.5
2. **Manufacturing bonus** — each `manufacturingFacility` building adds `level × MANUFACTURING_BONUS_PER_LEVEL` (0.4 per level) to the multiplier.
3. **Effective multiplier** — `classMultiplier + manufacturingBonus`
4. **Output per turn** (floored):
   - `shipsProduced = Math.floor(BASE_SHIP_PRODUCTION × multiplier)` — default base 2
   - `resourcesProduced = Math.floor(BASE_RESOURCE_PRODUCTION × multiplier)` — default base 1

Ships are added to `planet.shipCount`. Resources are added to the owning player's `resources`.

Neutral planets are skipped. Planets owned by a player id not present in the `players` array are skipped (no production applied).

## Exported constants

| Constant | Value |
|----------|-------|
| `PLANET_CLASS_MULTIPLIERS` | Record of class → multiplier (see above) |
| `BASE_SHIP_PRODUCTION` | 2 |
| `BASE_RESOURCE_PRODUCTION` | 1 |
| `MANUFACTURING_BONUS_PER_LEVEL` | 0.4 |

## Turn engine integration

`turnEngine.resolveTurn` calls `runProduction` after `resolveArrival` for all arriving fleets and assigns the returned `map` and `players` into the turn state.

## Changelog

- 2026-05-27: Initial production system — `runProduction`, class multipliers, manufacturing facility bonus, immutable inputs.
