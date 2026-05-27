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
| Distance | All distances use `computeTurnsInTransit` from `movementEngine` |
| Randomness | **None** — same `GameState` + `playerId` always yields the same `TurnInput` |
| Turn resolution | AI only returns `TurnInput`; `resolveTurn` in `turnEngine` applies actions |

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
- 2026-05-27: Implemented `computeAiTurn`, three-priority heuristic, `AiDifficulty` scaffolding, deterministic guarantees.
- 2026-05-27: File created. System not yet implemented.
