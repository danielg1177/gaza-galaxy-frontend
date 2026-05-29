# AI System

## Status
**Implemented** in `src/game/aiEngine.ts`.

## Overview
Provides deterministic heuristic decisions for AI players. The AI returns a `TurnInput` for the turn engine; it does not call `resolveTurn` itself. Normal and Hard difficulty use a persistent fog-of-war memory stored in `GameState.aiStates`, so they only act on information they have actually observed.

## Exports

### `computeAiTurn(state: GameState, playerId: string): TurnInput`
Builds one full turn of actions for the given player from the current `GameState`.
Returns any combination of `BUILD`, `SET_PRODUCTION_SLIDER`, and `SEND_FLEET` actions (up to the difficulty's fleet budget), always terminated with `END_TURN`.

### `updateAiObservation(state: GameState, playerId: string, existing?: AiPlayerState): AiPlayerState`
Updates the AI's fog-of-war memory based on what is currently visible from its owned planets and in-transit fleet destinations. Called by `turnEngine.resolveTurn` at the end of each AI turn so the next decision starts with fresh intel.

### `AiDifficulty`
```ts
type AiDifficulty = 'easy' | 'normal' | 'hard'
```

---

## Difficulty Tiers

| Behaviour | Easy | Normal | Hard |
|---|---|---|---|
| Fog-of-war memory | No — full state access | Yes | Yes |
| Max fleets per turn | 1 | 3 | 5 |
| Building decisions | No | Yes | Yes |
| Production slider management | No | Yes | Yes |
| Strategic phases | No | Yes | Yes |
| Scout probes into unknown territory | No | No | Yes |
| Home-planet targeting priority | No | Opportunistic | Deliberate |
| Attack advantage required | 1.5× | 1.35× | 1.2× |
| Gold reserve before building | — | 400 | 300 |
| Garrison keep ratio | 50% | 40% | 35% |

---

## Fog-of-War Memory (`AiPlayerState`)

Each AI player's brain state is stored in `GameState.aiStates[playerId]` so it persists across turns and serialises into `state_json` when the backend is added.

```ts
interface AiPlanetMemory {
  lastSeenRound: number;
  lastSeenOwner: OwnerId;
  lastSeenShipCount: number;
  isExplored: boolean;
}

interface AiPlayerState {
  planetMemory: Record<string, AiPlanetMemory>;
  knownEnemyHomePlanetIds: string[];
  strategicPhase: 'expand' | 'build' | 'strike' | 'defend';
}
```

**What the AI can see each round:**
- All planets it owns (always fresh).
- All planets within `effectiveRange(techLevel)` of any owned planet.
- Destinations of its own in-transit fleets.

Planets outside this visibility retain stale memory. Enemy garrison estimates for stale planets add `2 ships × staleness_rounds` to the last-seen count.

---

## Strategic Phases

Phases are recomputed dynamically each turn and stored in `aiState.strategicPhase`.

| Phase | Trigger | Focus |
|---|---|---|
| `expand` | Tech < 3 or owned planets < 4 | Claim neutral planets, spider-web outward |
| `build` | Decent territory, no clear force advantage | Fill building slots, adjust sliders, limited expansion |
| `strike` | Knows enemy location and owns 20%+ more ships | Attack weakest enemy planet, priority on known home planet |
| `defend` | Home planet threatened (incoming > 80% garrison) | Reinforce home from nearest friendly planet; overrides all |

---

## Decision Priority (Normal / Hard)

Each turn the AI resolves actions in this order, stopping fleet dispatch when the per-difficulty budget is exhausted:

1. **Economy first** — `BUILD` actions (A-C planets → factories; D-G → 1 factory then labs; H-P → labs only). Only spends above the gold reserve threshold.
2. **Slider adjustments** — `SET_PRODUCTION_SLIDER` for owned planets with active factories. Interior planets: 25% troops / 75% gold. Frontier planets (enemies within 2× range): 50/50. Strike phase frontiers: 75% troops. Gold emergency (< 400 gold): 10% troops everywhere.
3. **Defend home** — Send just enough ships from the nearest source to cover the largest incoming threat.
4. **Strike enemy home planet** — (Strike phase only) Commit a large force when ships > estimated enemy × advantage factor.
5. **Attack weakest known enemy** — Score enemies by `estimatedShipCount / distance`; attack when fleet has the advantage.
6. **Expand to neutrals** — Explored neutrals first (known position + class), then unexplored; prefer closer + better class.
7. **Scout** — (Hard only) Send 3-ship probes toward the nearest unexplored planet.

---

## Easy AI Strategy (unchanged from original)

Full state access (no fog). Single fleet per turn. Three priorities:
1. Reinforce threatened home planet.
2. Attack weakest reachable enemy (score = `shipCount / distance`; only attack if 60% of source > defender × 1.5).
3. Expand to nearest neutral.

---

## Building Strategy (Normal / Hard)

| Planet Class | Building Mix |
|---|---|
| A–C | All factories (high gold and troop output) |
| D–G | 1 factory first, then research labs |
| H–P | Research labs only |

Buildings are placed one per planet per turn to spread gold investment. The AI only builds if `gold − spent ≥ reserve + cost`.

---

## Rules and Guarantees

| Rule | Behaviour |
|---|---|
| Garrison | Keeps `max(5, shipCount × ratio)` ships on each source |
| One source per fleet | Each planet is used as a source at most once per turn (`usedSourceIds` set) |
| Range enforcement | All fleet dispatches validated against `effectiveRange(techLevel)` via `isInRange` |
| Randomness | None — same `GameState + playerId` always yields the same `TurnInput` |
| Turn resolution | AI returns `TurnInput`; `resolveTurn` in `turnEngine` applies all actions |
| Memory initialisation | `gameStore.startNewGame` calls `updateAiObservation` for each AI player so their first turn starts with home-area intel |

---

## Architecture Constraints
- All AI logic lives in `aiEngine.ts` — no AI logic in UI or turn engine.
- Uses the same `PlayerAction` / `TurnInput` types as human players.
- `BUILD` and `SET_PRODUCTION_SLIDER` actions added to `PlayerAction` and handled in `turnEngine.resolveTurn`; human store flow remains store-direct for UI feedback.
- Designed to run identically client-side (pass-and-play today) and server-side (async multiplayer, future).

---

## AI Player Names

`generateAiName(rng, usedNames)` shuffles a fixed 50-name pool deterministically, returning the first name not already used (case-insensitive). Falls back to `AI {n}`. Seeded at `seed + 2` in the store.

---

## Future Work
- Differentiate Easy further (deliberately worse economy decisions, occasional retreat).
- Multi-wave coordinated attacks (Hard tier).
- Adaptive threat response: evacuate planets that are about to fall.
- Tech-level investment priority curves.

---

## Changelog
- 2026-05-29: Full AI brain overhaul — fog-of-war memory (`AiPlayerState` in `GameState.aiStates`), three difficulty tiers (Easy/Normal/Hard), multi-fleet dispatch, `BUILD`/`SET_PRODUCTION_SLIDER` `PlayerAction` variants, strategic phases (expand/build/strike/defend), building strategy (A-C factories/D-G mixed/H-P labs), slider management, scout probes (Hard). `AiDifficulty` expanded to include `'hard'`; HomeScreen adds Hard chip.
- 2026-05-28: Task 75 — AI source/target selection now filters with `effectiveRange` + `isInRange`.
- 2026-05-27: Task 33 — AI naming changed to unique short first-names.
- 2026-05-27: Task 32 — added optional human slot names.
- 2026-05-27: 2–8 player slots; `Player.difficulty`; `GameConfig.playerSlots`.
- 2026-05-27: Task 18 — random AI player names added.
- 2026-05-27: Implemented `computeAiTurn`, three-priority heuristic, `AiDifficulty` scaffolding.
- 2026-05-27: File created.
