# Combat System

## Status
**Implemented** in `src/game/combatEngine.ts`.

## Overview
Resolves fleet arrival at a destination planet: friendly reinforcement, neutral capture, or probabilistic coin-flip combat against an enemy garrison. Called by `turnEngine.resolveTurn` for each fleet returned from `advanceFleets` with `turnsRemaining <= 0`.

## Entry Point
`resolveArrival(rng: () => number, fleet: Fleet, map: GameMap, roundNumber: number, events?: TurnEvent[], players?: Player[], fleets?: Fleet[]): ResolveArrivalResult`

Returns `{ map, players?, fleets? }`; does not mutate inputs. When `events` is provided, appends `fleet_arrived` (friendly reinforcement or neutral capture) or `combat` (enemy garrison battle) entries with player/planet names and troop losses. On home-planet conquest, optionally returns updated `players` (elimination flag) and `fleets` (eliminated player's in-transit fleets removed).

## Arrival Scenarios

| Condition | Result |
|-----------|--------|
| `fleet.ownerId === planet.owner` | **Friendly reinforcement** — add `fleet.shipCount` to `planet.shipCount`. No ownership change. |
| `planet.owner === 'neutral'` | **Neutral capture** — set `planet.owner = fleet.ownerId`, `planet.shipCount = fleet.shipCount`, `troopAccumulator = 0`. |
| Otherwise (enemy-owned) | **Combat** — probabilistic coin-flip resolution (see below). |

`isHomePlanet` is never modified here; home-planet elimination is detected later in the turn engine when ownership no longer matches the player's id.

## Fleet Grouping

Multiple fleets from the same owner arriving at the same destination in the same round are merged into one combined fleet (summed `shipCount`) before `resolveArrival` is called. Within each destination, the current planet owner's merged fleet is always processed first as a friendly reinforcement. Subsequent fleets resolve as attacks against the post-reinforcement garrison in fleet-ID order.

## Multi-way Combat

When three or more distinct combatants are present at the same destination in the same round, `resolveMultiwayCombat` in `combatEngine.ts` runs instead of the sequential `resolveArrival` path.

### When it activates

Total distinct combatants = (number of unique arriving fleet owners) + (1 if the planet has a non-neutral owner who is **not** arriving with a fleet of their own). If this total is ≥ 3, multi-way combat runs. If ≤ 2, the existing `resolveArrival` sequential path is used unchanged.

The planet owner's arriving reinforcement (if any) is silently absorbed into their garrison before counting and before building the combatants list.

Examples:

- Planet owned by A (50 ships), B arrives (30), C arrives (25) → 3 combatants → **multi-way**
- Planet owned by A (50 ships), A arrives (20) reinforcement, B arrives (30) → 2 combatants → **existing 1v1**
- Neutral planet, A (40), B (35), C (20) all arrive → 3 combatants → **multi-way**
- Any 2-player game → never more than 2 combatants → always 1v1

### Melee algorithm

```
troops = all combatants, each with ownerId and ships count

while survivors (ships > 0).length > 1:
  n = survivors.length
  aIdx    = floor(rng() * n)
  bIdxRaw = floor(rng() * (n - 1))
  bIdx    = bIdxRaw < aIdx ? bIdxRaw : bIdxRaw + 1

  a = survivors[aIdx]; b = survivors[bIdx]

  techDiff = techLevel(a) - techLevel(b)
  pAWins   = (7 + max(0, techDiff)) / (14 + |techDiff|)

  if rng() < pAWins: b.ships -= 1
  else:              a.ships -= 1

winner = last survivor with ships > 0
```

Three RNG calls per iteration (`aIdx`, `bIdx`, coin flip). The pair selection is unbiased — no rejection sampling needed. For 2 combatants this degenerates to the existing 50/50 duel with identical expected outcomes.

### `multiway_combat` event

Emitted once per destination after the melee resolves (when `events` is provided):

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `'multiway_combat'` | |
| `planetName` | `string` | |
| `planetId` | `string?` | |
| `participants` | `Array<{ name, ownerId, shipsBefore, survived }>` | All combatants; `survived: true` only on the winner |
| `winnerName` | `string` | |
| `winnerId` | `OwnerId` | |
| `remainingShips` | `number` | Winner's garrison after the melee |
| `roundNumber` | `number?` | |
| `isHomePlanetConquest` | `true?` | Set when the winner takes the previous owner's home planet |

### Home planet capture

If the winner takes a planet that was the previous owner's `homePlanetId`, `resolveMultiwayCombat` calls `applyHomePlanetElimination` — identical to the `resolveArrival` path: `isEliminated: true` on the defender, all other owned planets forfeited to neutral (0 ships, buildings intact), in-transit fleets removed.

## Combat Formula

Attacker = arriving fleet. Defender = planet garrison.

Each "flip" of the battle removes one troop from one side. The fight continues until one side reaches 0 troops.

```
techDiff       = attacker.techLevel - defender.techLevel
pAttackerWins  = (7 + max(0, techDiff)) / (14 + |techDiff|)

while (attackerShips > 0 && defenderShips > 0):
  if rng() < pAttackerWins → defenderShips -= 1
  else                      → attackerShips -= 1
```

### Tech advantage table

| Tech difference | p_attacker per flip | Flip ratio |
|-----------------|---------------------|------------|
| 0 (equal)       | 7/14 = 50.0%        | 7 : 7      |
| Attacker +1     | 8/15 ≈ 53.3%        | 8 : 7      |
| Attacker +2     | 9/16 = 56.25%       | 9 : 7      |
| Attacker +3     | 10/17 ≈ 58.8%       | 10 : 7     |
| Defender +1     | 7/15 ≈ 46.7%        | 7 : 8      |
| Defender +2     | 7/16 = 43.75%       | 7 : 9      |

Tech levels are looked up from the `players` array passed to `resolveArrival`. Both sides default to `techLevel = 0` if the player record is not found, producing a fair 50/50 fight.

### Combat model and expected win rates

The combat model is a sequential 1v1 duel loop — one troop from each side fights at a time, 50/50 at equal tech. More troops means more duels before elimination; no structural bonus applies to either the attacking or defending role. Tech level is the only factor that shifts per-duel probability. Expected win rates at equal tech: 10 vs 5 → ~67% attacker; 18 vs 6 → ~75% attacker; equal forces → 50%.

## RNG Seeding

`resolveArrival` receives a `rng: () => number` from the caller (`turnEngine`). Each combat gets a fresh `mulberry32` instance seeded with:

```
seed = hashSeed(gameState.seed + roundNumber × 10000 + combatRngCounter × 100)
```

A Wang-hash mixing step is applied before mulberry32 to ensure combats with numerically close seeds produce fully independent sequences from the first flip.

`combatRngCounter` increments for every `resolveArrival` call within a single `resolveTurn` execution (including non-combat arrivals), keeping each combat's RNG sequence unique and deterministic. The same game seed and game state always produce the same battle outcomes.

## Turn report events

When `events` is supplied, `resolveArrival` records:

| Scenario | Event kind | Notes |
|----------|------------|-------|
| Friendly reinforcement | `fleet_arrived` | Attacker name, planet name, ship count; optional `roundNumber` (round when combat/arrival resolved) |
| Neutral capture | `fleet_arrived` | Same as reinforcement |
| Enemy combat | `combat` | Attacker/defender names, winner, `attackerLost` / `defenderLost`, plus `attackerShipsBefore`, `defenderShipsBefore`, `remainingShips` for battle-report UI; optional `roundNumber`; optional `isHomePlanetConquest: true` when the attacker wins and the conquered planet is the defender's `homePlanetId` |

`roundNumber` is set from `state.roundNumber` at the time `turnEngine` calls `resolveArrival` (early-arrivals block or round-wrap block). The Battle Report and ⋮ Report **Troop Landings** cards show a muted **Round N** label when present so two same-planet fights from different rounds are distinguishable. Older persisted events without `roundNumber` still render (field optional).

### Resolution

- **Attacker wins** (`attackerShips > 0` when loop exits):
  - `planet.shipCount = attackerShips` (≥ 1 — guaranteed by loop termination)
  - `planet.owner = fleet.ownerId`
  - `planet.troopAccumulator = 0` (new owner does not inherit fractional production progress from the previous owner)
- **Defender holds** (`defenderShips > 0` when loop exits):
  - `planet.shipCount = defenderShips` (≥ 1 — guaranteed by loop termination)
  - `planet.owner` unchanged

Ties (exactly equal armies at equal tech) resolve randomly — each side has a 50% chance of losing the final troop, so the result is genuinely uncertain.

## Home Planet Capture
When an attacker wins combat on a defender's `homePlanetId`, `resolveArrival` triggers **full elimination**:

1. **`isHomePlanetConquest: true`** on the combat `TurnEvent` (Task 125).
2. **`defender.isEliminated = true`** on the defending player record.
3. **Forfeit remaining planets** — every other planet still owned by the defender becomes `owner: 'neutral'` and `shipCount: 0`; **`buildings` are left intact** so the next arrival claims the planet with existing structures.
4. **Remove in-transit fleets** — all fleets with `ownerId === defender.id` are removed from the active fleet list passed through from `turnEngine`.

The captured home planet keeps the attacker's garrison (`owner = fleet.ownerId`, `shipCount = remainingShips`).

`turnEngine` also re-checks home ownership after each turn as a safety net (`isEliminated` when home is not owned by the player), but forfeiture and fleet removal happen only in `combatEngine`.

### Battle report UI (Task 125)
When `resolveArrival` emits a combat event with `isHomePlanetConquest: true`, the **Battle Report** modal in `GameScreen` sorts those cards to the top. If the local human player was the winning attacker, the card shows a bold blue banner **"You took their home planet!"** (`#2255cc`) and a blue-tinted card (`#e8eeff` background, `#2255cc` left border) instead of the standard victory green.

### Knockout UI (Task 126)
In pass-and-play, when a human player is eliminated during another player's turn cycle, `gameStore.endTurn` sets `currentPlayerId` to the eliminated player and `eliminatedPlayerPendingKnockout: true`. After the lock screen, the **Battle Report** modal auto-opens with a bold red/orange banner **"You have been knocked out of the game!"** (`#cc3300`) above the cards. No **End Turn** button is shown. Closing the modal calls `acknowledgeKnockout()`, which advances turn order to the next non-eliminated player.

## Planet Ownership

- A planet remains owned until an enemy fleet wins combat there
- `shipCount = 0` on an owned planet does NOT revert ownership
- A fleet arriving at a 0-garrison owned planet wins immediately (loop does not run; attacker wins with full fleet)

## Changelog
- 2026-06-01: Task 198 — `multiway_combat` TurnEvent and `resolveMultiwayCombat` added to combatEngine.
- 2026-06-01: Task 193 — `resolveArrival` takes `roundNumber`; `combat` and `fleet_arrived` events include optional `roundNumber`; Battle Report cards show **Round N** when set.
- 2026-06-01: Task 192 — `troopAccumulator` reset to 0 on neutral capture and enemy-combat victory ownership change.
- 2026-05-29: Task 126 — home-planet conquest triggers full elimination in `resolveArrival`: `isEliminated` on defender, forfeit other owned planets to neutral (0 troops, buildings intact), remove defender's in-transit fleets; `ResolveArrivalResult` return type; knockout battle-report banner and pass-and-play `acknowledgeKnockout` flow in store/UI.
- 2026-05-29: Task 125 — combat `TurnEvent` adds optional `isHomePlanetConquest`; `resolveArrival` sets it when attacker wins on defender's `homePlanetId`; Battle Report modal sorts and highlights home-planet conquests for the winning human attacker (blue banner + tint).
- ~~2026-05-28: Victor garrison floor — `remainingShips` after combat uses `max(1, floor(strength delta))` so the battle-report footer never shows 0 for the winner.~~ *(superseded by Task 117 — loop termination guarantees ≥ 1 survivor without a floor)*
- ~~2026-05-28: Task 109 — combat turn-report events now include `attackerShipsBefore`, `defenderShipsBefore`, and `remainingShips` for the auto-opening Battle Report modal.~~ *(fields retained in Task 117)*
- ~~2026-05-28: Task 104 — optional `events` + `players` on `resolveArrival`; emits `fleet_arrived` and `combat` turn-report entries.~~ *(retained; `rng` added as new first param in Task 117)*
- ~~Formula (pre-Task 117): `attackerStrength = fleet.shipCount × ATTACKER_TECH_MULTIPLIER`; `defenderStrength = planet.shipCount × DEFENDER_TECH_MULTIPLIER × DEFENSE_BONUS (1.2)`; attacker wins if `attackerStrength > defenderStrength`; remaining = `max(1, floor(strength delta))`; ties favoured defender.~~ *(replaced by coin-flip loop in Task 117)*
- 2026-05-27: Task 15 — documented that ownership persists at 0 garrison; confirmed auto-capture rule
- 2026-05-27: Implemented `resolveArrival` with three arrival scenarios, deterministic combat, and exported constants.
- 2026-05-27: File created. System not yet implemented.
