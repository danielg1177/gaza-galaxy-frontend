# Production System

Planet production runs once per round (one full cycle of all players) during turn resolution.

## Module

`src/game/productionEngine.ts`

## Public API

```typescript
runProduction(map: GameMap, players: Player[], currentRound: number): { map: GameMap; players: Player[] }
```

Returns a new `GameMap` (updated planet garrisons and troop accumulators) and a new `Player[]` (updated gold and research points). Does not mutate the input `map` or `players`.

## Building types

| Type | Cost (gold) | Effect |
|------|-------------|--------|
| `factory` | `FACTORY_GOLD_COST` (200) | Produces troops and/or gold per turn via the production slider |
| `researchLab` | `RESEARCH_LAB_GOLD_COST` (250) | Generates `RESEARCH_LAB_POINTS_PER_TURN` (1) research point per lab per turn |

Buildings occupy slots on a planet (`buildingSlots`, set at map generation, range 1–20). New planets start with `buildings: []`.

## Build Order Validation

When a player queues a building from the planet modal, the store validates the order immediately:

- Player must have enough gold (`factory` = 200, `researchLab` = 250).
- Planet must have at least one free slot.
- Used slots are computed as committed buildings plus same-round queued builds (`builtOnRound === currentRound`).

If validation fails, the order is rejected as a no-op.

If validation passes:

- Gold is deducted from the current player's balance immediately (before turn resolution).
- The building is appended to the planet's `buildings` array at the first available slot index (dense array — next index after existing buildings), as an under-construction entry (`builtOnRound = currentRound`).

## Planet modal build UX

- **Single-tap placement:** Tapping the Factory or Research Lab chip in the owned-planet modal calls `queueBuildOrder(planetId, buildingType)` directly. No separate "select build type, then tap slot" step.
- **Slot grid (display + management):** The slot grid shows filled, empty, and under-construction tiles. Empty slots are not tappable. Filled under-construction slots remain tappable to cancel (`cancelBuildOrder`); active (prior-round) filled slots remain tappable to demolish (`demolishBuilding` with confirmation).
- **Chip disabled state:** Factory and Research Lab chips are disabled/dimmed when no slots remain (`no_slots`).
- **Insufficient gold:** Failed placement for gold shows red **Not enough gold** below the chips (2s auto-dismiss).

## Construction Delay

Buildings track `builtOnRound` (the round they were placed). A building is considered active only when:

- `builtOnRound < currentRound`

Effects:

- Buildings placed in the current round (`builtOnRound === currentRound`) are under construction.
- Under-construction factories and research labs contribute **0** production this turn.
- They become active starting next round.

## Cancel under-construction build

`cancelBuildOrder(planetId, buildingIndex)` in `gameStore` reverses a same-round placement:

- Only buildings with `builtOnRound === currentRound` can be cancelled.
- Removes the building from `planet.buildings` at the given index.
- Refunds `FACTORY_GOLD_COST` (200) or `RESEARCH_LAB_GOLD_COST` (250) to the current player's `gold` immediately.
- Removes any matching `BUILD` entry from `queuedOrders` for that planet and building type if present (defensive; builds are applied directly to state today).

The planet modal enables tap on dimmed (under-construction) slots with no confirmation prompt.

## Demolish active building

`demolishBuilding(planetId, buildingIndex)` in `gameStore` removes a prior-round building:

- Only buildings with `builtOnRound < currentRound` can be demolished (under-construction buildings use `cancelBuildOrder`).
- Removes the building from `planet.buildings` at the given index.
- Does **not** refund gold.

The planet modal shows `Alert.alert` ("Demolish building?", no-refund warning) before calling `demolishBuilding`. Production output and research lab projections update immediately when the store changes.

## Production slider

Each owned planet has `productionSlider` in `[0, 1]` (default `0.5` at generation):

- **Troops:** `rawTroopOutput = factories × FACTORY_TROOP_OUTPUT[class] × productionSlider`
- **Gold:** `rawGoldOutput = factories × FACTORY_GOLD_OUTPUT[class] × (1 - productionSlider)`

In the owned-planet modal (`GameScreen`), planets with at least one factory show:

- Percentage split label (`XX% troops / YY% gold`)
- Live projected output label (`⚔ X.X troops/turn · 💰 Y.Y gold/turn`) computed from active factories (`builtOnRound < currentRound`) and current slider position

Fractional troops accumulate in `troopAccumulator`. Each turn, whole troops are floored from the accumulator, added to `shipCount`, and subtracted from the accumulator. Gold is floored before adding to the owner's `gold`.

## Factory output by planet class (A–P)

Troop output per factory per turn (before slider):

| Class | Troops | Class | Troops | Class | Troops | Class | Troops |
|-------|--------|-------|--------|-------|--------|-------|--------|
| A | 1.0 | E | 0.75 | I | 0.5 | M | 0.25 |
| B | 0.9375 | F | 0.6875 | J | 0.4375 | N | 0.1875 |
| C | 0.875 | G | 0.625 | K | 0.375 | O | 0.125 |
| D | 0.8125 | H | 0.5625 | L | 0.3125 | P | 0.0625 |

Gold output per factory per turn (before `(1 - slider)`):

| Class | Gold | Class | Gold | Class | Gold | Class | Gold |
|-------|------|-------|------|-------|------|-------|------|
| A | 50.0 | E | 37.5 | I | 25.0 | M | 12.5 |
| B | 46.875 | F | 34.375 | J | 21.875 | N | 9.375 |
| C | 43.75 | G | 31.25 | K | 18.75 | O | 6.25 |
| D | 40.625 | H | 28.125 | L | 15.625 | P | 3.125 |

Values step uniformly: troops decrease by 1/16 per grade; gold decreases by 3.125 per grade.

## Exported constants

| Constant | Value |
|----------|-------|
| `FACTORY_GOLD_COST` | 200 |
| `RESEARCH_LAB_GOLD_COST` | 250 |
| `STARTING_GOLD` | 500 |
| `RESEARCH_LAB_POINTS_PER_TURN` | 1 |
| `MAX_TECH_LEVEL` | 15 |
| `RESEARCH_THRESHOLDS` | `readonly number[]` — 15-entry cumulative lookup, one per tech level 0–14 |
| `FACTORY_TROOP_OUTPUT` | `Record<PlanetClass, number>` — see table above |
| `FACTORY_GOLD_OUTPUT` | `Record<PlanetClass, number>` — see table above |

## `runProduction` logic

For each planet where `owner !== 'neutral'`:

1. Count active `factory` and `researchLab` buildings (`builtOnRound < currentRound`).
2. Compute `rawTroopOutput` and `rawGoldOutput` from factory count, class tables, and `productionSlider`.
3. Add `rawTroopOutput` to `troopAccumulator`; floor accumulator for whole troops; add whole troops to `shipCount`; subtract whole troops from accumulator.
4. Add `Math.floor(rawGoldOutput)` to the owning player's `gold`.
5. Add `labs × RESEARCH_LAB_POINTS_PER_TURN` to the owning player's `researchPoints`.

Planets owned by a player id not present in the `players` array are skipped. Neutral planets are skipped.

## Research level-up

After all planets contribute research for the turn, each player's accumulated `researchPoints` may advance `techLevel`:

1. Start from the player's current `techLevel` and post-production `researchPoints` total.
2. Look up the cumulative threshold from the exported `RESEARCH_THRESHOLDS` array (15 entries, index = current tech level 0–14): `researchThreshold(level)` returns `RESEARCH_THRESHOLDS[level] ?? Infinity`.
   - Threshold sequence (cumulative totals): 10, 23, 38, 58, 82, 113, 151, 198, 258, 333, 426, 542, 688, 869, 1097.
   - Level 1 requires 10 total points; Level 2 requires 23 total (13 more after Level 1); Level 3 requires 38 total (15 more); and so on.
3. While `researchPoints >= researchThreshold(techLevel)` and `techLevel < MAX_TECH_LEVEL` (15):
   - Increment `techLevel` by 1
4. Persist the resulting `researchPoints` and `techLevel` on the player record.

Research points are **never subtracted or reset** on level-up — they accumulate forever. The cumulative threshold array encodes the total required at each level; the level-up loop only compares total accumulated points against the next threshold.

Multiple levels can be gained in a single turn if enough research was banked. `techLevel` never exceeds 15; excess research points remain banked once capped.

The R&D modal in `GameScreen` projects turns to next level as `(researchThreshold(techLevel) - researchPoints) / activeLabCount`, which correctly yields remaining points needed under cumulative thresholds.

## Map generation defaults

Each generated planet receives:

- `buildingSlots`: `Math.floor(rng() * 20) + 1` (1–20)
- `troopAccumulator`: 0
- `productionSlider`: 0.5
- `buildings`: []

Planet class is rolled from `PLANET_CLASS_WEIGHTS` (A–P, mid-range classes most common).

## Turn engine integration

`turnEngine.resolveTurn` calls `runProduction` only when turn order wraps (the last active player ends their turn). It passes `state.roundNumber` as `currentRound`, so building activation (`builtOnRound < currentRound`) stays aligned with the same once-per-round round counter used by transit and round progression. Optional `events` collects `research_levelup` (each level gained) and `build_complete` (buildings with `builtOnRound === currentRound`).

## Turn report events

When `events` is supplied:

| Trigger | Event kind | Payload |
|---------|------------|---------|
| Tech level increases in level-up loop | `research_levelup` | `playerName`, `newLevel` |
| Building finished construction this round | `build_complete` | `planetName`, `buildingType` (`factory` \| `researchLab`) |

Build completion is detected at the start of `runProduction` when `builtOnRound === currentRound` (emitted at the round wrap where the building was placed; visible in the ⋮ Report at the start of the next round, when `builtOnRound < currentRound` makes it active).

## Client build-order feedback

`queueBuildOrder(planetId, buildingType)` in `gameStore` returns `'ok' | 'insufficient_gold' | 'no_slots' | 'not_owner'`. The planet modal surfaces **Not enough gold** when a chip tap is rejected for insufficient funds; full-slot rejections remain handled by disabled build chips (Task 50).

## Changelog

- 2026-05-29: Task 124 — research points no longer subtracted on level-up; `RESEARCH_THRESHOLDS` is cumulative and points accumulate forever; level-up loop only increments `techLevel` when `researchPoints >= researchThreshold(techLevel)`.
- 2026-05-29: Task 120 — replaced exponential formula with hand-tuned `RESEARCH_THRESHOLDS` lookup array [10, 23, 38, 58, 82, 113, 151, 198, 258, 333, 426, 542, 688, 869, 1097]; `researchThreshold(level)` now returns `RESEARCH_THRESHOLDS[level] ?? Infinity`; array exported.
- 2026-05-29: Task 116 — `build_complete` emission condition changed from `builtOnRound === currentRound - 1` to `builtOnRound === currentRound` so Report **Built** aligns with building activation timing.
- 2026-05-28: Task 104 — optional `events` on `runProduction`; emits `research_levelup` and `build_complete` turn-report entries.
- 2026-05-28: Task 77 — building placement simplified to single-tap Factory/Research Lab chips; `queueBuildOrder` auto-assigns first available slot; slot grid empty tiles are display-only.
- 2026-05-28: Task 70 — `cancelBuildOrder` refunds and removes same-round buildings; planet modal under-construction slots tappable for instant cancel.
- 2026-05-28: Task 69 — `queueBuildOrder` returns a result union instead of `void`; gold failures are distinguishable from slot/ownership failures for UI feedback in `GameScreen`.
- 2026-05-28: Task 57 — production cadence corrected to once per full round (on turn-order wrap), and API docs updated to include `currentRound`.
- 2026-05-28: Task 55 — owned-planet production slider now shows live projected per-turn output (`⚔ troops/turn` and `💰 gold/turn`) based on active factories and current slider value.
- 2026-05-28: Task 50 — build orders now validate gold and slot capacity at queue time; successful orders deduct gold immediately and reject overflow/insufficient-funds attempts as no-ops.
- 2026-05-27: Task 46 — added construction delay; production now counts only active buildings where `builtOnRound < currentRound`.
- 2026-05-27: Research thresholds changed from flat cost to exponential curve via `researchThreshold(level) = Math.round(10 * 1.5^level)`; level-up loop now recalculates threshold each level.
- 2026-05-27: Research level-up — `MAX_TECH_LEVEL=15`, `RESEARCH_POINTS_PER_LEVEL=10`; `runProduction` spends research points to increment `techLevel` after each turn's lab output.
- 2026-05-27: Task 12 — reworked to slot-based building system; planet classes A–P; factories, research labs, gold/troops slider, troopAccumulator.
- 2026-05-27: Initial production system — `runProduction`, class multipliers, manufacturing facility bonus, immutable inputs.
