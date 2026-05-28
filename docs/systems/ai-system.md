# AI System

## Status
**Implemented** in `src/game/aiEngine.ts`.

## Overview
Provides deterministic heuristic decisions for AI players. The AI returns a `TurnInput` for the turn engine; it does not call `resolveTurn` itself.

## Exports

### `computeAiTurn(state: GameState, playerId: string): TurnInput`
Builds one turn of actions for the given player from the current `GameState`. Returns at most one `SEND_FLEET` action (plus `END_TURN`), or only `END_TURN` when no move is viable.

### `AiDifficulty`
```ts
type AiDifficulty = 'easy' | 'normal'
```
Scaffolding for future difficulty tuning. Both levels currently use the same logic inside `computeAiTurn`.

## Strategy (priority order)

The AI evaluates strategies in order and takes the first viable action.

### 1. Reinforce threatened home planet
If the AI’s home planet has fewer ships than **any** incoming enemy fleet targeting it:
- Find the nearest friendly planet with `shipCount > 5` (not already used as a source this turn).
- Send `min(source.shipCount - 1, maxIncomingShips - home.shipCount)` ships (at least 1), keeping at least 1 ship on the source.

### 2. Attack weakest reachable enemy planet
Score each enemy-owned planet: `planet.shipCount / distanceToNearestAiPlanet`, where distance uses `computeTurnsInTransit`. Lowest score = easiest target (tie-break: planet id).

For each target in score order:
- Use the nearest AI-owned planet with `shipCount > 6` as source.
- Send `floor(source.shipCount * 0.6)` ships (40% garrison), capped so at least 1 ship remains on the source.
- Skip targets where the fleet cannot win combat (`shipCount > defender.shipCount × DEFENSE_BONUS`).

If no enemy planet passes the combat check, fall through to expansion.

### 3. Expand to nearest neutral planet
When no good attack exists (all enemies are too strong for a winning fleet from any eligible source):
- Among pairs of AI planet + neutral planet, pick the pair with minimum transit distance (`shipCount > 4` on source).
- Send `floor(source.shipCount * 0.5)` ships, keeping at least 1 on the source.

### 4. Do nothing
Return `{ actions: [{ type: 'END_TURN' }], playerId }`.

## Rules and guarantees

| Rule | Behavior |
|------|----------|
| Garrison | Never sends all ships; send count is clamped to `source.shipCount - 1` |
| One dispatch per source | Each planet may be the origin of at most one `SEND_FLEET` per AI turn (`usedSources` set) |
| Distance | Transit scoring uses `computeTurnsInTransit`; fleet dispatch must also satisfy click-range via `effectiveRange(player.techLevel)` and `isInRange` (same cap as human `processSendFleet`) |
| Randomness | **None** — same `GameState` + `playerId` always yields the same `TurnInput` |
| Turn resolution | AI only returns `TurnInput`; `resolveTurn` in `turnEngine` applies actions |

## AI Player Names

At game creation, each AI player now receives a **single short first-name** (for example, `Aria`, `Dax`, `Quinn`) from a fixed name pool in `aiEngine.ts`.

`generateAiName(rng, usedNames)` shuffles the pool deterministically with the provided RNG, then returns the first name that is not already in `usedNames` (case-insensitive check). The store tracks names as players are built, so AI names cannot duplicate:

- any human player name already assigned in the same game
- any earlier AI name assigned in the same game

If all names in the pool are exhausted, naming falls back to `AI {n}` where `n = usedNames.size + 1`.

The game store seeds a dedicated `mulberry32(config.seed + 2)` instance for AI names so assignment stays deterministic per match seed and does not share state with spawn placement (`seed + 1`) or planet naming (map generator uses `config.seed` directly).

Human player names now come from `GameConfig.playerSlots[index].name` in the setup form. At game creation, the store trims each human slot name and falls back to `Player N` where `N` is the 1-based index among human slots only.

## New-game player slots

`GameConfig.playerSlots` defines 2–8 participants before map generation:

| Field | Meaning |
|-------|---------|
| `type: 'human' \| 'ai'` | Slot 0 must be human (local player); slots 1+ may toggle |
| `name?: string` | Optional display name for human slots; trimmed at start with fallback naming if blank |
| `difficulty?: AiDifficulty` | Only for AI slots; defaults to `'normal'` in the store |

`HomeScreen` provides a slot builder: fixed “You · Human” on slot 0, Human/AI toggle and Easy/Normal difficulty chips on other slots, Add Player (max 8), Remove on the last slot (min 2).

Each AI `Player` created in `buildPlayers` stores `difficulty` from its slot. `computeAiTurn` does not read `player.difficulty` yet — both levels use the same heuristic until difficulty tuning is implemented.

## Architecture constraints
- AI logic lives entirely in `aiEngine.ts` — no AI logic in UI or turn engine
- Uses the same `PlayerAction` / `TurnInput` types as human players
- Intended to be replaceable with stronger AI later (MCTS, server simulation, etc.)

## Future work
- Differentiate `easy` vs `normal` (and harder tiers) via `AiDifficulty`
- Multiple fleet dispatches per turn when strategically sound
- Tech-level and production-class scoring
- Building and research decisions

## Changelog
- 2026-05-28: Task 75 — AI source/target selection now filters with `effectiveRange` + `isInRange` so `SEND_FLEET` actions never exceed the player's click-range cap (transit-turn distance alone is insufficient).
- 2026-05-27: Task 33 — AI naming changed from `[Name] [Epithet]` to unique short first-names with human/AI collision avoidance and `AI {n}` fallback.
- 2026-05-27: Task 32 — added optional human slot names (`PlayerSlot.name`) with trimmed `Player N` fallback in store.
- 2026-05-27: 2–8 player slots in new-game setup; `Player.difficulty`; `GameConfig.playerSlots` replaces `aiCount`.
- 2026-05-27: Task 18 — random AI player names added.
- 2026-05-27: Implemented `computeAiTurn`, three-priority heuristic, `AiDifficulty` scaffolding, deterministic guarantees.
- 2026-05-27: File created. System not yet implemented.
