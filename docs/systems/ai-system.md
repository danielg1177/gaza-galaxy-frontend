# AI System

## Status
**Implemented** in `src/game/aiEngine.ts`.

## Overview
Provides deterministic heuristic decisions for AI players. The AI returns a `TurnInput` for the turn engine; it does not call `resolveTurn` itself. Normal and Hard difficulty use a persistent fog-of-war memory stored in `GameState.aiStates`, so they only act on information they have actually observed.

The game setup UI no longer exposes AI difficulty selection. All newly created AI players are now assigned `hard` difficulty by default.

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
| Max fleets per turn | 1 | 3 | Unlimited (500 cap) |
| Fleet sources per planet per turn | 1 | unlimited (reservedShips gate) | unlimited (reservedShips gate) |
| Building decisions | No | Yes | Yes |
| Production slider management | No | Yes | Yes |
| Strategic phases | No | Yes | Yes |
| Factory-only build phase | No | Until round 20 | Until round 15 |
| Scout probes into unknown territory | No | No | Yes — every reachable unexplored planet per turn |
| Scout fleet size | — | — | 1 ship |
| Home-planet targeting priority | No | Opportunistic | Deliberate |
| Attack advantage required | 1.5× | 1.35× | 1.2× |
| Multi-wave attacks on same enemy | No | No (diversifies targets) | Yes |
| Expansion send amount | — | 50% of sendable | min needed to capture (estDefense + 2) |
| Expansion priority | — | Distance + class | Hub value × class ÷ dist² (choke points first) |
| Min ships to attempt attack | — | 4 | 3 |
| Gold reserve before building | — | 0 | 0 |
| Building slots per planet per turn | — | 1 (spread investment) | Unlimited (focus on top-class) |
| Garrison keep ratio (base) | 50% | 40% | 20% |
| Garrison during early-game explore (rounds 1–10) | 50% | 0% unless home/buildings/chokepoint | 0% unless home/buildings/chokepoint |
| Garrison safe-minimum ratio (far from all threats) | — | 10% | 5% |
| Minimum garrison (absolute floor, threat-scaled) | 5 ships | 1–5 ships (× threat level) | 1–2 ships (× threat level) |

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

**Observation timing:** `buildContext` (called at the start of every AI turn) runs `updateAiObservation` inline before any decision is made, so the AI always uses the **current** game state to determine what is visible — not the state stored at the end of the previous AI turn.  The turnEngine still writes a post-action observation at the end of each AI turn as before; the inline call is read-only and does not mutate `state.aiStates`.

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
2. **Slider adjustments** — `SET_PRODUCTION_SLIDER` for owned planets with active factories. Priority order:
   - Known enemy within **20 clicks** → **100% troops** (overrides all other rules — survival over economy).
   - Gold emergency (< 400 gold) → 5% troops.
   - Hard factory phase (before round 15) → 10% troops.
   - Strike phase + frontier → 75% troops.
   - Peacetime frontier → 50% troops.
   - Peacetime interior → 25% troops.
   Reverts automatically the turn the enemy leaves the 20-click radius or the memory goes stale.
3. **Defend home** — Send just enough ships from the nearest source to cover the largest incoming threat.
4. **Defend valuable asset** — Mobilise ships from multiple nearby sources to any non-home valuable planet (class A–F or has buildings) that has incoming enemy fleets. Worst-deficit planet first. Overrides all offensive and expansion actions.
5. **Recapture valuable planet** — If a valuable planet is now enemy-held and reachable: commit exactly enough ships to beat the estimated garrison × advantage factor; skip entirely if unwinnable (focus on building up elsewhere). Re-evaluated every turn — ends automatically once the planet is back in AI hands or the enemy becomes too strong to challenge.
6. **Strike enemy home planet** — (Strike phase only) Commit a large force when ships > estimated enemy × advantage factor.
7. **Attack weakest known enemy** — Score enemies by `estimatedShipCount / distance`; attack when fleet has the advantage.
8. **Expand to neutrals** — Explored neutrals first (known position + class), then unexplored; prefer closer + better class.
9. **Scout** — (Hard only) Send 1-ship probes toward every unexplored planet in range.

---

## Easy AI Strategy (unchanged from original)

Full state access (no fog). Single fleet per turn. Three priorities:
1. Reinforce threatened home planet.
2. Attack weakest reachable enemy (score = `shipCount / distance`; only attack if 60% of source > defender × 1.5).
3. Expand to nearest neutral.

---

## Building Strategy (Normal / Hard)

### Factory Phase (before `RESEARCH_START_ROUND`)

All planets get factories regardless of class. Factories compound: gold → more factories → more gold. Research is a liability before you have a strong economic base.

| Difficulty | Research starts at round |
|---|---|
| Normal | 20 |
| Hard | 15 |

### Research Phase (on and after `RESEARCH_START_ROUND`)

| Planet Class | Building Mix |
|---|---|
| A–C | All factories — too productive to waste on labs |
| D–G | 1 factory first, then research labs |
| H–P | Research labs only — low production value, best used as tech hubs |

**Hard:** Spends all available gold on buildings, focusing on the highest-class planets first (A → B → C → ...) until they're fully slotted. Can place multiple buildings per planet in a single turn.

**Normal:** (preserves original one-building-per-planet-per-turn behavior for steady growth)

The AI stops building when it runs out of either gold or available slots.

### Production Slider During Factory Phase (Hard)

All planets run at `10% troops / 90% gold` to maximise factory purchasing power. After the factory phase, or during a strike, slider targets revert to the standard phase-based logic.

---

## Valuable-Asset Defence and Recapture

### What counts as "valuable"?

| Context | Criteria |
|---|---|
| Owned planet | Class A–F **OR** has ≥ 1 building **OR** is the home planet |
| Enemy-held planet (memory) | Class A–F **OR** is a known home planet (buildings not stored in memory) |

`VALUABLE_CLASS_INDEX = 5` → class 'F' is the threshold; classes A–F are the top ~37 % of the 16-tier A–P scale.

### Defend valuable asset (`tryDefendValuableAsset`)

Triggered when any non-home valuable owned planet has incoming enemy fleets and is outgunned.  The function:

1. Collects all threatened valuable planets; sorts worst-deficit first.
2. For each threatened planet, draws ships from every nearby friendly source until the deficit is covered or sources are exhausted.
3. Runs before any offensive or expansion actions so the fleet budget is spent here first.

### Recapture valuable planet (`tryRecaptureValuablePlanet`)

Triggered when a valuable planet is now enemy-held and reachable from AI territory.  The function:

1. Filters only *winnable* fights: `totalAvailableForce ≥ estimatedEnemyGarrison × ATTACK_ADVANTAGE`.
2. Commits exactly enough ships (from multiple sources) to meet that threshold — no more, no fewer.
3. **Unwinnable case** (enemy too strong): planet is skipped entirely; AI focuses on building up and expanding elsewhere.
4. Re-evaluated from scratch each turn:
   - **Fight won**: planet re-appears in `ownedPlanets` → no longer in `memorized.isEnemy` → commitment ends.
   - **Front line pushed back**: enemy planets around the contested area thin out → `computeThreatLevel` falls → garrison commitment naturally reduces.
   - **Became unwinnable**: enemy reinforces faster than AI can match → feasibility check fails → AI pivots away.

---

## Early-Game Exploration Behaviour (rounds 1–`EARLY_EXPLORE_ROUNDS`)

During the first 10 rounds the AI's sole goal is to spider-web outward and discover as many planets as possible.  The garrison rule is relaxed to remove the normal ratio entirely unless there is an actual strategic reason to leave ships behind:

| Planet type during rounds 1–10 | Normal / Hard garrison |
|---|---|
| Home planet | `MIN_GARRISON` (always protected) |
| Planet with at least one building | `MIN_GARRISON` |
| Choke-point relay (hubValue ≥ 3) | `MIN_GARRISON` |
| Anything else | **0** — send everything forward |

Easy AI is not affected (flat ratio unchanged).

---

## Threat-Based Garrison (post early-game)

After round 10, the garrison ratio for Normal and Hard AIs scales continuously between a safe-interior minimum and the full `GARRISON_RATIO`, driven by **`computeThreatLevel`**:

```
threat = max(
  clamp(1 − minEnemyTurns / ENEMY_SAFE_TURNS,  0, 1),          // 1× weight
  clamp(1 − minUnknownTurns / UNKNOWN_SAFE_TURNS, 0, 1) × 0.5  // 0.5× weight
)

adjustedRatio = MIN_SAFE_GARRISON_RATIO + (GARRISON_RATIO − MIN_SAFE_GARRISON_RATIO) × threat
```

| Situation | Resulting garrison ratio |
|---|---|
| No enemies known, no fog nearby | `MIN_SAFE_GARRISON_RATIO` (10% Normal / 5% Hard) |
| Enemy 3 turns away (moderate threat) | ~50–70% of base ratio |
| Enemy or fog adjacent (1 turn) | full `GARRISON_RATIO` |

Known enemy planets count as **full threat** (`1×`); unexplored territory counts as **half threat** (`0.5×`) because it might be empty neutral space.

---

## Rules and Guarantees

| Rule | Behaviour |
|---|---|
| Early-game garrison | Rounds 1–10: 0 garrison unless home planet, has buildings, or is a choke-point relay (Normal/Hard) |
| Post-early garrison | `computeThreatLevel` scales ratio between `MIN_SAFE_GARRISON_RATIO` and `GARRISON_RATIO` based on proximity to enemies/fog |
| Multi-fleet from one source | A planet may dispatch multiple fleets per turn; `reservedShips` tracks cumulative committed ships so garrison is always respected |
| Target deduplication | `usedTargetIds` prevents sending two fleets to the same neutral in one turn; Hard allows multi-wave enemy attacks |
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
- 2026-05-31: Setup simplification — removed HomeScreen AI difficulty selector chips; all AI slots now default to hard; `gameStore` enforces `player.difficulty = 'hard'` when building players, so legacy/non-hard slot input is ignored for new games.
- 2026-05-31: Observation timing fix — `buildContext` now calls `updateAiObservation` inline (read-only, does not write `state.aiStates`) so every AI decision uses the current game state for visibility, eliminating the one-full-round staleness lag caused by the previous end-of-turn-only update cadence.
- 2026-05-31: Factory threat response — any factory planet with a known non-stale enemy within `FACTORY_DEFENSE_RANGE_CLICKS` (20 clicks ≈ 1.8× base range) switches to 100 % troop output; overrides gold-emergency and factory-phase rules; reverts automatically when the threat leaves range or goes stale (`STALE_ROUNDS`).
- 2026-05-31: Valuable-asset defence and recapture — `tryDefendValuableAsset` mobilises multi-source reinforcements for any non-home A–F class or building-bearing planet under attack (highest priority after home defence); `tryRecaptureValuablePlanet` commits forces to retake lost valuable planets when winnable and pivots to building-up-elsewhere when the fight is unwinnable; priority order updated (7 steps → 9 steps); new helpers `isOwnedPlanetValuable`, `isMemorizedPlanetValuable`; `VALUABLE_CLASS_INDEX = 5` constant.
- 2026-05-31: AI garrison overhaul — (1) Early-exploration phase (rounds 1–10): Normal/Hard keep 0 garrison unless planet is the home planet, has buildings, or is a strategic choke-point (hubValue ≥ 3); this lets the AI spider-web outward without holding ships back. (2) Threat-based garrison (post round 10): `computeThreatLevel` scores each planet by transit turns to the nearest known enemy (1× weight) and unexplored territory (0.5× weight), then scales the garrison ratio linearly from `MIN_SAFE_GARRISON_RATIO` (5–10%) up to the full `GARRISON_RATIO` — interior planets now route almost all ships to the frontier while genuinely threatened planets keep full cover. New constants: `EARLY_EXPLORE_ROUNDS`, `CHOKEPOINT_THRESHOLD`, `ENEMY_SAFE_TURNS`, `UNKNOWN_SAFE_TURNS`, `MIN_SAFE_GARRISON_RATIO`.
- 2026-05-31: Hard AI pass 4 — `GOLD_RESERVE` 100→0 for all difficulties; removed "one building per planet per turn" limit for Hard so it saturates top-class planets first with all available gold.
- 2026-05-31: Hard AI pass 3 — factory-first building phase (no labs before round 15); `GOLD_RESERVE.hard` 300→100; slider 90% gold in factory phase; hub/choke-point scoring in expansion (`hubValue` × class ÷ dist²); `RESEARCH_START_ROUND` constant; removed unused `preferredBuilding`; `buildingMix` is now round- and difficulty-aware.
- 2026-05-31: Hard AI pass 2 — no fleet limit (500 cap), garrison ratio 0.35→0.2, minimum garrison 5→2, scout ships 3→1, scouts fire for every unexplored planet in range (not just nearest), expansion sends minimum needed to capture (`estDefense + 2`) instead of 65% of sendable so the AI simultaneously claims all reachable neutrals in one turn.
- 2026-05-31: Hard AI pass 1 — removed `usedSourceIds` one-fleet-per-planet-per-turn constraint; a planet now dispatches multiple fleets per turn limited only by garrison (`reservedShips`). Added `usedTargetIds` to prevent wasteful duplicate expansion fleets. `MAX_FLEETS.hard` raised 5→10. Minimum attack fleet size lowered 6→3 for Hard (4 for Normal). Hard expansion send fraction raised 0.5→0.65. Hard strike minimum source size lowered 10→5. Multi-wave enemy attacks enabled for Hard (Normal diversifies targets instead).
- 2026-05-29: Full AI brain overhaul — fog-of-war memory (`AiPlayerState` in `GameState.aiStates`), three difficulty tiers (Easy/Normal/Hard), multi-fleet dispatch, `BUILD`/`SET_PRODUCTION_SLIDER` `PlayerAction` variants, strategic phases (expand/build/strike/defend), building strategy (A-C factories/D-G mixed/H-P labs), slider management, scout probes (Hard). `AiDifficulty` expanded to include `'hard'`; HomeScreen adds Hard chip.
- 2026-05-28: Task 75 — AI source/target selection now filters with `effectiveRange` + `isInRange`.
- 2026-05-27: Task 33 — AI naming changed to unique short first-names.
- 2026-05-27: Task 32 — added optional human slot names.
- 2026-05-27: 2–8 player slots; `Player.difficulty`; `GameConfig.playerSlots`.
- 2026-05-27: Task 18 — random AI player names added.
- 2026-05-27: Implemented `computeAiTurn`, three-priority heuristic, `AiDifficulty` scaffolding.
- 2026-05-27: File created.
