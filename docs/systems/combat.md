# Combat System

## Status
**Implemented** in `src/game/combatEngine.ts`.

## Overview
Resolves fleet arrival at a destination planet: friendly reinforcement, neutral capture, or deterministic combat against an enemy garrison. Called by `turnEngine.resolveTurn` for each fleet returned from `advanceFleets` with `turnsRemaining <= 0`.

## Entry Point
`resolveArrival(fleet: Fleet, map: GameMap): GameMap`

Returns a new `GameMap`; does not mutate `fleet` or `map`.

## Arrival Scenarios

| Condition | Result |
|-----------|--------|
| `fleet.ownerId === planet.owner` | **Friendly reinforcement** — add `fleet.shipCount` to `planet.shipCount`. No ownership change. |
| `planet.owner === 'neutral'` | **Neutral capture** — set `planet.owner = fleet.ownerId`, `planet.shipCount = fleet.shipCount`. |
| Otherwise (enemy-owned) | **Combat** — deterministic strength comparison (see below). |

`isHomePlanet` is never modified here; home-planet elimination is detected later in the turn engine when ownership no longer matches the player's id.

## Combat Formula

Attacker = arriving fleet. Defender = planet garrison.

```
attackerStrength = fleet.shipCount × ATTACKER_TECH_MULTIPLIER
defenderStrength = planet.shipCount × DEFENDER_TECH_MULTIPLIER × DEFENSE_BONUS
```

### Constants (exported)

| Constant | Value | Purpose |
|----------|-------|---------|
| `DEFENSE_BONUS` | `1.2` | 20% defender advantage |
| `ATTACKER_TECH_MULTIPLIER` | `1.0` | Placeholder until player tech is wired into this API |
| `DEFENDER_TECH_MULTIPLIER` | `1.0` | Placeholder until player tech is wired into this API |

Tech multipliers are fixed at `1.0` because `resolveArrival` only receives `Fleet` and `GameMap` (no `players` lookup yet). Replace these constants with per-player tech lookups when the signature can access player state.

### Resolution (deterministic, no randomness)

- **Attacker wins** (`attackerStrength > defenderStrength`):
  - `planet.shipCount = floor(attackerStrength - defenderStrength)`
  - `planet.owner = fleet.ownerId`
- **Defender holds** (`defenderStrength >= attackerStrength`):
  - `planet.shipCount = floor(defenderStrength - attackerStrength)`
  - `planet.owner` unchanged

Ties favor the defender (`>=`).

## Home Planet Capture
When combat or neutral capture changes `planet.owner` away from a player's id on their home planet, `turnEngine` marks that player eliminated on the same turn (after production). Eliminated players' other planets becoming neutral is not handled in combat yet.

## Changelog
- 2026-05-27: Implemented `resolveArrival` with three arrival scenarios, deterministic combat, and exported constants.
- 2026-05-27: File created. System not yet implemented.
