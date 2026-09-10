# Turn Engine System

## Status
**Implemented** in `src/game/turnEngine.ts`.

## Overview
Orchestrates the resolution of a single player turn. Applies that player's fleet dispatches, resolves eligible arrivals at turn start, checks elimination/victory, advances turn order, applies round-gated simulation ticks (fleet transit + production) only when the player order wraps after a full cycle, then dispatches the **next** player's scheduled movements so they are in transit when that turn opens.

## Public API

### `PlayerAction`
```typescript
| { type: 'SEND_FLEET'; fromPlanetId: string; toPlanetId: string; shipCount: number }
| { type: 'END_TURN' }
```
- `SEND_FLEET` — dispatch ships from one owned planet to another.
- `END_TURN` — client commit signal; included in `TurnInput.actions` when the human presses **End Turn**. The engine does not branch on it separately (turn resolution runs when `resolveTurn` is called with the batched actions).

### `TurnInput`
```typescript
{
  actions: PlayerAction[];
  playerId: string;
}
```

### `resolveTurn(state, input): ResolveTurnResult`
Single entry point for turn resolution. Returns `GameState` fields plus `events: TurnEvent[]` collected during resolution. Throws if `input.playerId !== state.currentPlayerId` or `state.status !== 'active'`.

## Round vs turn

- **`turnNumber`** — increments every time any player completes a turn.
- **`roundNumber`** — on `GameState`; starts at **1** when a match is created. Increments by **1** each time all players have taken a turn (when `resolveTurn` advances `currentPlayerId` and the next player's index in `state.players` is ≤ the current player's index, i.e. the turn order wrapped).

Fleets record **`dispatchedInRound`** (the `roundNumber` at dispatch). Combat does not run when a fleet is sent; eligible arrivals resolve at the **start** of the current player's turn, before their `SEND_FLEET` actions.

## Two-phase arrival model

A fleet may only **arrive** (combat resolves) when:

1. `turnsRemaining <= 0`, and  
2. `dispatchedInRound < state.roundNumber` (minimum **one full round** in transit after dispatch).

Fleets with `turnsRemaining <= 0` but `dispatchedInRound === state.roundNumber` remain in `fleets` with `turnsRemaining: 0` until the next round; they are **not** resolved at turn start until `roundNumber` advances.

When `advanceFleets` brings a fleet to `turnsRemaining: 0` on **round wrap**, `turnEngine` calls `resolveArrival` immediately for each returned `arrived` fleet (only `inTransit` fleets stay in `GameState.fleets`). Capture state is therefore visible at the start of the next player's turn, not one turn later.

## Turn Resolution Order
1. **Validate** — current player and active game status.
1a. **Pre-compute round-wrap + run production early** — using the unmodified `state.players` array, compute whether this turn will wrap the player order (`preNextIndex <= preCurrentIndex`). If yes, call `productionEngine.runProduction` immediately (before any combat in step 2) and set `productionAlreadyRan = true`. This guarantees factory output is credited to every planet's garrison **before** any arriving fleet can attack — even if an early-arrival fleet (step 2 below) resolves combat this turn. On non-wrap turns this block is a no-op.
2. **Resolve eligible arrivals** — split `state.fleets` into fleets with `turnsRemaining <= 0` and `dispatchedInRound < roundNumber` vs still in transit; group eligible fleets by destination, merge same-owner fleets at each destination (summed `shipCount`), and sort so the current planet owner's merged fleet resolves first. After grouping, each destination checks total combatants (unique arriving owners + 1 if the garrison owner is not arriving). If ≥ 3, `resolveMultiwayCombat` is called once for that destination (one `combatRngCounter` slot). If ≤ 2, the existing `resolveArrival` sequential path runs unchanged. Apply optional `players` / `fleets` updates from `ResolveArrivalResult`; keep only still-in-transit fleets. (Safety net under normal play — round-wrap resolution handles fleets that hit zero on the prior wrap.)
3. **Process `SEND_FLEET` actions** (in submission order):
   - Origin planet exists and is owned by `input.playerId`.
   - `shipCount >= 1` and `shipCount <= origin.shipCount` (may send entire garrison; ownership does not require ships on planet).
   - Destination planet exists and differs from origin.
   - `turnsRemaining` from `movementEngine.computeTurnsInTransit` (Euclidean distance, `Math.ceil`, minimum 1).
   - Deduct `shipCount` from origin; append fleet via `movementEngine.createFleet` with `dispatchedInRound: state.roundNumber` (`fleet-{turnNumber}-{index}`).
4. ~~**Advance fleets** per player turn~~ — removed with Task 57; fleet transit advances only on round wrap (step 8).
5. **Elimination/Victory** — a player is eliminated when their home planet is conquered (`combatEngine` sets `isEliminated` and forfeits planets) or when their `homePlanetId` planet is not owned by them (safety-net re-check after fleet dispatches). If exactly one non-eliminated player remains, set `status: 'finished'` and `winnerId` to that player.
6. **Advance turn** — `turnNumber += 1`; if still `active`, `currentPlayerId` moves to the next non-eliminated player in `state.players` array order (wrap around).
7. **Round-wrap check** — compute whether turn order wrapped (`nextPlayerIndex <= currentPlayerIndex`).
8. **Round tick (wrap only)** — on wrap only:
   - `productionEngine.runProduction(map, players, state.roundNumber, events)` runs once for the completed round — **skipped** if `productionAlreadyRan` (production already ran before step 2)
   - `movementEngine.advanceFleets` decrements all fleet `turnsRemaining` by 1
   - Group `arrived` fleets by destination, merge same-owner fleets at each destination (summed `shipCount`), and sort so the current planet owner's merged fleet resolves first. After grouping, each destination checks total combatants (unique arriving owners + 1 if the garrison owner is not arriving). If ≥ 3, `resolveMultiwayCombat` is called once for that destination (one `combatRngCounter` slot). If ≤ 2, the existing `resolveArrival` sequential path runs unchanged. Apply optional `players` / `fleets` updates; keep only `inTransit` in `fleets`
   - The defending planet's owner receives production before any attacker lands; a player who captures a planet does not receive its production on the turn of capture.
9. **Advance round** — if wrap occurred, `roundNumber += 1`.
9a. **Prune + apply scheduled movements** — drop standing orders whose origin is no longer owned by the scheduler, whose owner is eliminated, or whose planets are missing (`pruneScheduledMovements`). If the game is still `active` and the **new** `currentPlayerId` is AI-controlled, dispatch their remaining `scheduledMovements` (lenient: skip if 0 ships or out of range; fixed count sends `min(amount, garrison)`; `'all'` sends the full garrison). Human players instead get those orders seeded into `queuedOrders` at turn start (`seedQueuedOrdersFromSchedules`) so they appear as pending departures until End Turn. Recapture does not restore a pruned order.

## Turn Order Logic
- Players are ordered by their index in `state.players`.
- After each resolved turn, the engine scans forward from the current player's index (wrapping) and selects the first player with `isEliminated === false`.
- Eliminated players are skipped for normal gameplay turns.
- **Pass-and-play knockout (Task 126, Task 252):** when a human is eliminated mid-cycle, `gameStore.endTurn` temporarily sets `currentPlayerId` to that player so they see the knockout battle report, and stores the engine's next living player as `knockoutResumePlayerId`. `acknowledgeKnockout()` restores that player (then runs AI turns until the next human). Walking forward from the eliminated slot is wrong after round-wrap combat: the kill often resolves on the last player's `endTurn`, when the engine's next player is already the first living player of the new round.
- **Async knockout (Task 243, Task 258):** the same round-wrap kill is often a **deferred** knockout (`id === outgoingPlayerId` on the victim's submit). Async must redirect `currentPlayerId` to that human on the same submit — Zustand pending farewells do not survive `resetGame`. `GameState.pendingFarewellPlayerIds` / `knockoutResumePlayerId` persist in `state_json`. `Player.knockoutFarewellComplete` prevents a second farewell. If the engine wraps back to the submitter and an eliminated human has not completed farewell, that submit still redirects to them (recovery for already-skipped victims). `acknowledgeKnockout` does not finish the game while any non-eliminated player (including AI) remains.

## Victory
When exactly one player has `isEliminated !== true`, `status` becomes `'finished'` and `winnerId` is set. `GameScreen` shows a **Victory** modal for the winning local human ("You are the last player standing!") or a **Game Over** modal naming the winner otherwise; both dismiss to Home via `resetGame`.

## Stub Integration Points
| Module | Function | Contract |
|--------|----------|----------|
| `combatEngine.ts` | `resolveArrival(rng, fleet, map, roundNumber, events?, players?, fleets?)` | Returns `ResolveArrivalResult` with updated `map`; optional `players` / `fleets` on home-planet elimination; `roundNumber` stamped on `combat` / `fleet_arrived` turn-report events. |
| `productionEngine.ts` | `runProduction(map, players, currentRound, events?)` | Returns updated `map` and `players`; optionally appends turn-report events. |
| `movementEngine.ts` | `computeTurnsInTransit`, `createFleet`, `advanceFleets` | Transit time, fleet records, and per-turn fleet advance. See `docs/systems/movement.md`. |

## Determinism
- No RNG in turn resolution.
- Same `GameState` + `TurnInput` always yields the same output.

## Client turn commit (Task 27)

The Zustand store (`src/store/gameStore.ts`) keeps human fleet dispatches in **`queuedOrders`** (`PendingFleet[]`) until **`endTurn()`**. Each confirm in the ship-count modal calls **`queueOrder`** only (no `GameState` mutation). **`endTurn()`** builds one `TurnInput`: all queued orders as `SEND_FLEET` actions (in queue order), then `{ type: 'END_TURN' }`, calls **`resolveTurn`**, then **`runAiTurnsUntilHuman`**, saves state, sets **`turnReport`** from aggregated `events`, and clears **`queuedOrders`**. **`cancelQueuedOrder(index)`** removes a queued row without touching the engine.

`runAiTurnsUntilHuman` continues while `isAiControlled(currentPlayer, playMode)` is true: created AI slots, forfeited humans in async multiplayer, and pass-and-play humans who checked **Don't ask again**. It stops for a living human, including a forfeited pass-and-play player who still wants the rejoin prompt (`needsForfeitPrompt`).

## Pass-and-play forfeit (Task 253–254)

A human may **Forfeit** from the ⋮ menu on their turn without being eliminated. `Player.isAI` stays false (identity, fog, victory/defeat). `isForfeited` marks them sitting out; `autoAiUntilEnd` skips the per-turn prompt. The store discards queued orders, inits `aiStates` + `difficulty: 'hard'`, and runs `computeAiTurn` for that slot.

When the turn order later reaches a forfeited human without `autoAiUntilEnd`, GameScreen shows a **Sitting out** overlay (not the map, not the lock screen): **Rejoin**, **Let the AI take this turn**, and a checkbox to stop asking. Rejoin clears the flags so they play the map. Let-AI runs one AI turn then `runAiTurnsUntilHuman`. Sitting-out humans skipped knockout farewells.

## Async forfeit (Task 256)

Async ⋮ **Forfeit** uses the same `isAiControlled` loop. The store discards queued human orders, marks the current player sitting out locally (so the last human forfeiting can play out to `finished`), submits the AI actions with **pre-resolution** `turnNumber`/`roundNumber`, then calls `POST /forfeit`. `loadAsyncGame` overlays server `is_forfeited` onto each human slot so the next submitter's `runAiTurnsUntilHuman` skips sitters.

## Player status notices (Task 257)

`resolveTurn` copies `GameState.commanderStatusNotices` through to the result (it rebuilds the snapshot field-by-field and would otherwise drop the queue during AI play-out). Forfeit and rejoin enqueue a notice; each other playing human acknowledges it on their next turn via the GameScreen **Player update** overlay.

## Stale fleet drain on load (Task 193)

`loadGame` and `loadAsyncGame` call **`drainStaleFleets`**, which removes any fleet with `turnsRemaining <= 0` from `GameState.fleets` before the match resumes. Under normal play, round-wrap resolution leaves only `turnsRemaining > 0` fleets in state; persisted saves from before that invariant (or corrupted state) could otherwise re-enter the early-arrivals block at the next turn start and produce a phantom second combat on the same planet.

## Changelog
- 2026-09-10: Scheduled movements — `pruneScheduledMovements` after combat/elimination; apply next player's `scheduledMovements` after turn advance and round wrap (step 9a). `resolveTurn` copies `scheduledMovements` through the result snapshot.
- 2026-08-26: Overlay title **Player update**; rejoin copy "has rejoined." Persisted field remains `commanderStatusNotices`.
- 2026-08-19: **Task 258** — async knockout farewells include deferred/self wrap-kills; persist farewell queue on `GameState`; `acknowledgeKnockout` keeps the match active while AIs remain.
- 2026-08-19: **Task 257** — `resolveTurn` preserves `commanderStatusNotices`; forfeit/rejoin briefings survive AI play-out and async submit.
- 2026-08-19: **Task 256** — async forfeit submits the AI-resolved turn then `POST /forfeit`; `loadAsyncGame` overlays `is_forfeited`.
- 2026-08-19: **Task 253–254** — pass-and-play forfeit: `runAiTurnsUntilHuman` uses `isAiControlled`; sitting-out humans without `autoAiUntilEnd` stop the AI loop for the rejoin prompt; `resolveTurn` writes fog memory for any AI-controlled player (not only `isAI`).
- 2026-08-19: **Task 252** — pass-and-play knockout stores `knockoutResumePlayerId` (the living player `resolveTurn` already selected) and restores it in `acknowledgeKnockout`; local knockout no longer sets `isSubmittingTurn`.
- 2026-06-01: **Task 211** — production pre-runs before step 2 early-arrivals combat on round-wrap turns (`willRoundWrap` pre-computed from `state.players`; `productionAlreadyRan` guard prevents double-run in step 8).
- 2026-06-01: **Task 199** — multi-way combat wired into both arrival loops; `groupArrivalsByDestination`, `countTotalCombatants`, `buildCombatantList` helpers added to turnEngine.
- 2026-06-01: **Task 193** — `roundNumber` on `combat` / `fleet_arrived` events via `resolveArrival(..., state.roundNumber, ...)`; `drainStaleFleets` on `loadGame` / `loadAsyncGame`.
- 2026-05-31: **Pass-and-Play Automatic Turn Handoff** — when a player ends their turn in pass-and-play mode, the lock screen now auto-dismisses after 1.5 seconds, automatically advancing to the next human player's turn without requiring manual interaction. The "Start Turn" button remains visible and functional for manual override if desired.
- 2026-05-29: **Task 126** — home-planet conquest elimination in `combatEngine`; `ResolveArrivalResult`; pass-and-play knockout via `eliminatedPlayerPendingKnockout` / `acknowledgeKnockout`; victory when one non-eliminated player remains.
- 2026-05-28: **Task 104** — `resolveTurn` returns `ResolveTurnResult` with `events: TurnEvent[]`; store `turnReport` populated on `endTurn`.
- 2026-05-28: **Task 76** — `processSendFleet` allows `shipCount === origin.shipCount`; removed minimum 1-ship garrison on origin.
- 2026-05-28: **Task 74** — round-wrap `advanceFleets` arrivals now resolve immediately via `resolveArrival`; only `inTransit` fleets remain in state after wrap.
- 2026-05-28: **Task 57** — corrected round semantics: fleet transit advance and production now run once per full player cycle (on turn-order wrap), and `roundNumber` increments only on that wrap.
- 2026-05-27: **Task 27** — Queue-then-commit human turns: store batches `SEND_FLEET` in `queuedOrders`; `endTurn()` submits them plus `END_TURN`; removed per-send turn end (`sendFleet`).
- 2026-05-27: **Task 13** — Round-based arrival delay: `roundNumber` on `GameState`, `dispatchedInRound` on `Fleet`; eligible arrivals resolved at turn start before dispatches; `advanceFleets` no longer triggers combat; `roundNumber` increments when all players complete a turn.
- 2026-05-27: Fleet dispatch and advance delegated to `movementEngine` (`computeTurnsInTransit`, `createFleet`, `advanceFleets`).
- 2026-05-27: Implemented `resolveTurn`, `PlayerAction`, `TurnInput`; wired stub `resolveArrival` and `runProduction`.
- 2026-05-27: File created. System not yet implemented.
