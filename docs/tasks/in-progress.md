# In Progress

Tasks currently being worked on.

## Phase 19 — Bug Fix: End Turn and Exit Save Failure

**Status:** Complete (2026-05-31).

These tasks fix two bugs that block all async multiplayer games (any "Play with Friends" game, including solo-AI games) from ending turns and saving progress on exit:
- "Submit Failed — Could not submit your turn." on every End Turn
- "Failed to save — Could not save your progress." on every Exit Game

---

### ~~Task 155 — Backend: Fix unauthenticated API requests returning 500 instead of 401~~ *(complete 2026-05-31)*

Added `$middleware->redirectGuestsTo(fn () => null)` to `bootstrap/app.php`. Unauthenticated requests now return JSON 401.

---

### ~~Task 156 — Frontend: Fix `turnNumber`/`roundNumber` mismatch in `submitTurn` → always 409~~ *(complete 2026-05-31)*

**Root cause:** `endTurn()` in `gameStore.ts` (lines 879–880) sends:
```js
turnNumber: finalState.turnNumber,
roundNumber: finalState.roundNumber,
```
`finalState` is produced after `resolveTurn` runs for the human AND then `runAiTurnsUntilHuman` runs for every AI player. `turnEngine.ts` increments `turnNumber` by `+1` on every `resolveTurn` call (line 381). In a 2-player game with 1 AI, `finalState.turnNumber` is already `gameState.turnNumber + 2`. The backend stale check `$request->turn_number != $game->turn_number` compares this inflated value against the pre-resolution `games.turn_number` — they never match → **409 Stale turn data** → "Submit Failed" on every single async End Turn, for every game configuration.

The same issue can affect `roundNumber` whenever a round wrap occurs during turn resolution, causing the frontend to send the post-wrap round number while the backend still holds the pre-wrap value.

**Fix:** Capture `gameState.turnNumber` and `gameState.roundNumber` BEFORE `resolveTurn`/`runAiTurnsUntilHuman` runs, and pass those captured pre-resolution values into the `submitTurn` call. These match `games.turn_number` and `games.round_number` on the backend.

**File:** `frontend/src/store/gameStore.ts`

---

### ~~Task 157 — Frontend: Investigate and fix `saveTurnProgress` failure on Exit Game~~ *(complete 2026-05-31 — error logging added, pending live test)*

**Symptom:** Tapping "Exit Game" in the ⋮ menu shows "Failed to save — Could not save your progress."

**Investigation steps:**
1. ~~Add error logging to the `catch` block in `handleExitGame` (GameScreen.tsx line 2088) to surface the actual HTTP status code and backend error message.~~
2. Re-test after Task 155 lands — if the save failure was caused by the 500-on-auth-fail bug, it may be resolved.
3. If a different error (403, 422) persists, trace which guard in `TurnController::save` is firing. The three guards are: membership (403), `status !== 'in_progress'` (422), and `current_user_id != me` (403).
4. Verify the `partial_state_json` (string) and `queued_orders` (array) payload shapes are correct when sent from `handleExitGame`.

**Files:** `frontend/src/screens/GameScreen.tsx`, `backend/app/Http/Controllers/TurnController.php`

---

### ~~Task 158 — Frontend: Confirm pass-and-play games do not call backend APIs~~ *(complete 2026-05-31)*

Both API-call guards confirmed in place. Pass-and-play games never call `submitTurn` or `saveTurnProgress`. User-reported pass-and-play failures are consistent with testing a solo-AI "Play with Friends" game, which has `asyncGameId` set and correctly hits the API.

---

## Phase 20 — Bug Fix: Multiplayer End Turn Always Fails + Exposes Opponent's Turn

**Status:** Not started. See `docs/tasks/backlog.md` Phase 20 for full task specifications.

Three tasks to address the active multiplayer submit bug:

- ~~**Task 159**~~ — Frontend: On submitTurn failure, navigate home instead of leaving user on opponent's turn *(complete 2026-05-31)*
- ~~**Task 160**~~ — Frontend: Surface actual HTTP error code and message in Submit Failed alert *(complete 2026-05-31)*
- ~~**Task 161**~~ — Backend: Fix `games.turn_number` stale check — counter out of sync when AI players are present *(complete 2026-05-31)*

---

## Phase 21 — Feature: Solo Games

**Status:** Not started. See `docs/tasks/backlog.md` Phase 21 for full task specifications.

- ~~**Task 162**~~ — Frontend: Silently convert solo-AI "Play with Friends" setup to a local pass-and-play game *(complete 2026-05-31)*
- ~~**Task 163**~~ — Frontend: Add "Solos" section to the Command Center *(complete 2026-05-31)*

---

## Phase 22 — Feature: Delete Any Created Game

**Status:** Not started. See `docs/tasks/backlog.md` Phase 22 for full task specifications.

- ~~**Task 164**~~ — Frontend: Add delete button to Pass & Play and Solo game cards *(complete 2026-05-31)*

---

## Phase 23 — Feature: Persist Local Games (Pass & Play / Solo) to AsyncStorage

**Status:** Not started. See `docs/tasks/backlog.md` Phase 23 for full task specifications.

Two tasks to persist Pass & Play and Solo campaigns across app restarts using AsyncStorage (local device storage). No backend changes required.

- ~~**Task 165**~~ — Frontend: Wrap `gameStore.games[]` with Zustand `persist` middleware + AsyncStorage storage *(complete 2026-05-31)*
- ~~**Task 166**~~ — Frontend: Guard HomeScreen Solos / Pass & Play sections against hydration flash *(complete 2026-05-31)*

---

## Phase 24 — Bug Fix: Solo Game "Start Turn" Screen

**Status:** Complete (2026-05-31).

Three tasks fixing the "Start Turn" lock screen for solo and pass-and-play games:

- ~~**Task 167**~~ — Frontend: Show "Start Turn" lock screen in solo games between turns *(complete 2026-05-31)*
- ~~**Task 168**~~ — Frontend: Remove auto-dismiss from the "Start Turn" lock screen (require manual tap) *(complete 2026-05-31)*
- ~~**Task 169**~~ — Frontend: Add "Exit to Home" button on the "Start Turn" lock screen *(complete 2026-05-31)*

---

## Phase 25 — UX Tweak: Reduce Home Planet Snap Zoom on Turn Start

**Status:** Complete (2026-05-31).

- ~~**Task 170**~~ — Frontend: Halve the default home-planet snap zoom level (`HOME_PLANET_SNAP_SCALE` 2.0 → 1.0) *(complete 2026-05-31)*

---

## Phase 26 — Map Tuning: Tighter Planet Spacing

**Status:** Complete (2026-05-31).

One task to bring planets ~1.5 clicks closer on average without changing map generation algorithms:

- ~~**Task 171**~~ — Frontend: Reduce average inter-planet distance by ~1.5 clicks (tune `growthPosition` offset and `MIN_PLANET_DISTANCE` constants in `mapGenerator.ts` only) *(complete 2026-05-31)*

---

## Phase 27 — Bug Fix: Map Scrolls Slightly When Starting a Fleet Drag

**Status:** Not started. See `docs/tasks/backlog.md` Phase 27 for full task specification.

One task to eliminate the brief map-pan jitter when the player begins a fleet drag from an owned planet:

- **Task 172** — Frontend: Block map pan immediately when a drag begins on an owned planet

---

## Phase 28 — Feature: AI Observer Mode

**Status:** Complete except Task 180.

Six tasks to let the player pause and review each AI player's planned turn before it resolves. When the mode is enabled, after any human turn ends the game shows the current AI player's intended fleet dispatches as dashed map arrows and all their actions (builds, slider changes) in a read-only panel. The player then taps "End Turn" to resolve the AI's turn and advance — repeating for every consecutive AI player — before control returns to the next human.

- ~~**Task 173**~~ — Frontend: Add `aiObserverMode` store flag and "Watch AI Turns" toggle to the new-game setup screen *(complete 2026-05-31)*
- ~~**Task 174**~~ — Frontend: Add staged-AI-turn fields to the store (`showingAiObserver`, `pendingAiTurnInput`, `pendingAiPlayerId`) and a `clearAiObserver()` action *(complete 2026-05-31)*
- ~~**Task 175**~~ — Frontend: Modify `endTurn()` to stage AI turns and add `advanceStagedAiTurn()` action *(complete 2026-05-31)*
- ~~**Task 176**~~ — Frontend: GameScreen observer overlay — AI player banner, disabled human interactions, AI fleet arrows on the map *(complete 2026-05-31)*
- ~~**Task 177**~~ — Frontend: Read-only AI actions panel — observer-mode queued orders modal showing fleet dispatches, builds, and slider changes *(complete 2026-05-31)*
- ~~**Task 178**~~ — Frontend: "End Turn" button in observer mode wired to `advanceStagedAiTurn()` *(complete 2026-05-31)*
- ~~**Task 179**~~ — Frontend: Revamp AI observer to use the AI player's full turn perspective *(complete 2026-05-31)*
- ~~**Task 180**~~ — Frontend: Fix three AI observer visibility issues — remove banner covering status bar, restore ⋮ menu access, show BUILD and slider actions in queued orders modal *(complete 2026-05-31)*
- **Task 181** — Frontend: Show AI's pending BUILD actions as under-construction slots in the planet detail panel during observer mode (switch fog-of-war, reuse existing planet panel + queued orders UI, remove separate overlay UI from Tasks 176–177) *(complete 2026-05-31)*

---

## Phase 29 — Bug Fix: AI Spawn Too Close to Human Players

**Status:** Not started. See `docs/tasks/backlog.md` Phase 29 for full task specification.

One task to fix AI home planets appearing adjacent to the human player:

- **Task 182** — Frontend: Fix AI spawn min-distance from humans enforced at planet-selection time

---

## Phase 30 — Bug Fix: Production Runs Before Combat on Round Wrap

**Status:** Complete (2026-06-01).

One task to fix the round-wrap tick order so that defending garrisons receive factory/lab production before any fleet arrives:

- ~~**Task 183**~~ — Frontend: Run production before fleet arrivals on round wrap *(complete 2026-06-01)*

---

## Phase 31 — Improvement: Combat RNG Seed Hashing

**Status:** Complete (2026-06-01).

One task applying a Wang-hash mixing step to combat RNG seeds. The combat model itself (sequential 1v1 duels, 50/50 at equal tech) is correct and intentional — no combat loop changes:

- ~~**Task 184**~~ — Frontend: Hash combat RNG seeds to eliminate seed-locality correlation *(complete 2026-06-01)*

---

## Phase 32 — Bug Fix: Fleet Arrival Grouping — Merge Same-Owner Fleets and Prioritize Defender Reinforcements

**Status:** Complete (2026-06-01).

One task fixing two related fleet-arrival bugs: split battle reports when multiple friendly fleets hit the same planet, and the zero-garrison owner appearing as the attacker when an enemy fleet happens to be processed before the owner's own reinforcement:

- ~~**Task 185**~~ — Frontend: Group, merge, and sort fleet arrivals by destination before resolving combat *(complete 2026-06-01)*

---

## Phase 33 — Bug Fix: Suppress Redundant `fleet_arrived` Event on Pre-Combat Reinforcement

**Status:** Complete (2026-06-01).

One task suppressing the `fleet_arrived` event when the planet owner's reinforcing fleet arrives at the same time as an enemy attack. The reinforcement is absorbed silently into the garrison; only the single combat card appears in the Battle Report. Without this fix, the player saw two separate entries for the same planet — the reinforcement arrival line and the battle card — even though the battle card's `defenderShipsBefore` already included the reinforcement.

- ~~**Task 186**~~ — Frontend: Suppress `fleet_arrived` event when owner's reinforcement is followed by combat on the same planet *(complete 2026-06-01)*

---

## Phase 38 — Bug Fix: Battle Report and Turn Data Not Preserved for the Full Turn Duration (All Modes)

**Status:** Not started. See `docs/tasks/backlog.md` Phase 38 for full task specifications.

Two tasks to ensure all battle report cards, map sword icons, fleet-arrival entries, and production data remain visible for the entire duration of the player's active turn — surviving any number of exits, app restarts, and re-entries — across solo, pass-and-play, and async multiplayer:

- **Task 194** — Frontend: Restore `playerBattleArchiveByPlayerId` / `playerTurnReportByPlayerId` and re-show lock screen in `loadGame` when `pendingTurnReport` exists; extract shared `buildPlayerReports` helper
- **Task 201** — Frontend: Restore `playerBattleArchiveByPlayerId` in `loadAsyncGame` using `buildPlayerReports` when `detail.isMyTurn === true` and `detail.latestEvents` is non-empty (depends on Task 194)

---

## Phase 39 — Bug Fix: Duplicate Planet Names + Planet Name Used as Identifier

**Status:** Not started. See `docs/tasks/backlog.md` Phase 39 for full task specifications.

Three tasks to fix duplicate planet names and replace name-based event lookups with ID-based ones:

- **Task 195** — Frontend: Guarantee unique planet names in `generateMap` (deduplication pass with numeric suffix)
- **Task 196** — Frontend: Add optional `planetId?: string` to all planet-referencing `TurnEvent` types; emit from `combatEngine.ts` and `productionEngine.ts`
- **Task 197** — Frontend: Use `planetId` in all event-keyed lookups in `gameStore.ts` and `GameScreen.tsx`

---

## Phase 40 — Feature: True Multi-way Combat (3+ Players at Same Planet)

**Status:** Complete (2026-06-01). See `docs/tasks/backlog.md` Phase 40 for full task specifications.

Three tasks to replace the sequential 1v1 arrival model with a simultaneous melee when 3+ distinct combatants land at the same planet in the same round. The algorithm randomly selects two survivors each flip, resolves a tech-weighted coin flip between them, and repeats until one fleet remains — nearly identical to the existing combat loop:

- ~~**Task 198**~~ — Frontend: Add `multiway_combat` TurnEvent type + `resolveMultiwayCombat` in `combatEngine.ts` *(complete 2026-06-01)*
- ~~**Task 199**~~ — Frontend: Wire multi-way combat into `turnEngine.ts` arrival loops *(complete 2026-06-01)*
- ~~**Task 200**~~ — Frontend: `MultiwayBattleReportCard` component + battle report integration *(complete 2026-06-01)*

---

## Phase 41 — Bug Fix: Large Map Launch Crash (6-Player+)

**Status:** Complete (2026-06-01).

Two tasks fixing a JS main-thread freeze and a subsequent spawn-placement crash when launching with 6+ players on a Large map:

- ~~**Task 202**~~ — Frontend: Cap `enforceMinimumSpacing` outer-iteration limit at 500 to eliminate O(n⁴) freeze for large planet counts *(complete 2026-06-01)*
- ~~**Task 203**~~ — Frontend: Fix `assignAis` fallback in `spawnPlacer.ts` — after all retries exhausted, drop zone-uniqueness and human-separation constraints and place remaining AIs on any available neutral planet; harden `placeSpawns` with a last-resort fallback instead of a hard throw *(complete 2026-06-01)*

**Root cause — Task 202:** For 6 players on Large, `planetCount = 135` and `gridSide = 111`. `enforceMinimumSpacing` used `maxIter = n² × 4 = 72,900` outer iterations, each scanning all `n(n−1)/2 = 9,045` planet pairs — ~659 million operations total. Fix: hard-cap `maxIter = 500`.

**Root cause — Task 203:** `assignAis` uses `AI_MIN_SEPARATION_FROM_HUMAN = 50` clicks and requires each AI to land in a unique zone. With only 8 zones, 2 already used by humans, and both human home planets near opposite map edges, the "≥50 clicks from all humans" constraint eliminates most zone candidates — making it geometrically impossible to place 4 AIs. After 50 retries the function returned an incomplete assignment; `placeSpawns` then threw `"No starting planet assigned for player player-5"`.

---

## Phase 42 — PWA Launch

**Status:** Not started. See `docs/tasks/backlog.md` Phase 42 for full task specifications.

Converting the app from iPhone-only Expo native to a Progressive Web App (PWA) distributed over the web. Push notifications require a full Web Push (VAPID) implementation — `expo-notifications` does not support background push on the web platform. This phase also requires coordinated backend changes (see backend docs Phase 9).

**Frontend tasks:**

- ~~**Task 204**~~ — Frontend: Add PWA configuration to `app.json` (manifest, standalone display, theme color, static output) *(complete 2026-06-01)*
- ~~**Task 205**~~ — Frontend: Audit and fix web compatibility for all packages (`@react-native-community/slider`, gesture handler, SVG, safe-area) *(complete 2026-06-01)*
- ~~**Task 206**~~ — Frontend: Create PWA service worker (`public/sw.js`) — handle `push` and `notificationclick` events *(complete 2026-06-01)*
- ~~**Task 207**~~ — Frontend: Replace `expo-notifications` push flow with Web Push API on the web platform (`pushNotificationService.ts` web branch + VAPID subscription) *(complete 2026-06-01)*
- ~~**Task 208**~~ — Frontend: Handle service-worker-to-app `postMessage` deep link in `App.tsx` for web (mirror native notification deep-link handler) *(complete 2026-06-01)*
- ~~**Task 209**~~ — Frontend: Add `build:web` script and document required `.env` vars (`EXPO_PUBLIC_VAPID_PUBLIC_KEY`, `EXPO_PUBLIC_API_URL`) *(complete 2026-06-01)*

**Backend tasks (required — see `backend/docs/project/current-state.md` Phase 9):**

- ~~**Backend Task 9.1**~~ — Generate VAPID key pair, add to `.env` *(complete 2026-06-01)*
- ~~**Backend Task 9.2**~~ — Install `minishlink/web-push` PHP package *(complete 2026-06-01)*
- ~~**Backend Task 9.3**~~ — Add `web_push_subscription` column to `users` table *(complete 2026-06-01)*
- ~~**Backend Task 9.4**~~ — Add `POST /api/push-subscription` endpoint *(complete 2026-06-01)*
- ~~**Backend Task 9.5**~~ — Update `NotificationService` to send Web Push to users with a web subscription *(complete 2026-06-01)*

---

## Phase 43 — Bug Fix: Battle Report Flashes Briefly After Ending Async Multiplayer Turn

**Status:** Complete (2026-06-01).

One task to stop the outgoing async player's own combat events from being written into `playerBattleArchiveByPlayerId` during `endTurn`, which causes the battle report modal to flash open immediately after tapping End Turn (before navigation home):

- ~~**Task 210**~~ — Frontend: Do not populate the outgoing async player's battle archive during `endTurn` *(complete 2026-06-01)*

---

## Phase 44 — Bug Fix: Multiplayer — Factory Planet Attacked with 0 Troops Despite Active Production

**Status:** Complete (2026-06-01).

One task to fix the multiplayer bug where all-troop-dispatched factory planets show 0 defending troops in the battle report and are captured by a single enemy troop, despite having 15+ factories set to full troop output:

- ~~**Task 211**~~ — Frontend: Guarantee production runs before combat in all `resolveTurn` code paths (step 2 early arrivals + round-wrap step 8) *(complete 2026-06-01)*

---

## Phase 45 — Bug Fix: Async End Turn Briefly Exposes Opponent's Full Game State

**Status:** Complete (2026-06-04).

One task to block `GameScreen` from rendering any resolved state (including the next player's map, planets, troops, and battle report) during the async submit window after the outgoing player taps End Turn:

- ~~**Task 212**~~ — Frontend: Block GameScreen from rendering resolved turn state during async submit window *(complete 2026-06-04)*

---

## Phase 46 — Bug Fix: Multiple Battle Report Modals Open on Turn Start

**Status:** Complete (2026-06-04).

One task to consolidate the battle report auto-open into a single-fire effect and prevent duplicate modal instances from appearing when more than one opponent was fought:

- ~~**Task 213**~~ — Frontend: Consolidate battle report auto-open into a single-fire effect; prevent duplicate modal opens *(complete 2026-06-04)*

---

## Phase 47 — Bug Fix: Eliminated/Losing Player Cannot View Final Battle Before Game-Over State

**Status:** Complete (2026-06-04).

Three tasks letting the eliminated/losing player open the finished game, pass through a "View Final Battle" lock screen, and see the final battle report before the game-over state is revealed:

- ~~**Task 214**~~ — Frontend: Allow loading a finished async game to view the final battle report *(complete 2026-06-04)*
- ~~**Task 215**~~ — Frontend: Show "View Final Battle" label on lock screen for game-ending turns *(complete 2026-06-04)*
- ~~**Backend Task 10.1**~~ — Backend: Change elimination/game-over push notification to neutral "view results" framing *(complete 2026-06-04 — see `backend/docs/project/roadmap.md` Phase 10)*

---

## Phase 48 — Bug Fix: Eliminated Player Stranded in Async Game After Knockout

**Status:** Complete (2026-06-04).

Two fixes for async multiplayer elimination UX: wrong alert copy when tapping End Turn as an eliminated player, and no path home after dismissing the battle report:

- ~~**Task 216**~~ — Frontend: Change "Your commander has been eliminated" alert text to "You have been eliminated from the game." *(complete 2026-06-04)*
- ~~**Task 217**~~ — Frontend: In `acknowledgeKnockout`, navigate home immediately when the active game is async (skip local state advancement) *(complete 2026-06-04)*

---

## Phase 49 — Bug Fix: Home Planet Capture Not Prioritized or Highlighted in Battle Report

**Status:** Complete (2026-06-05).

One task to sort the home planet capture card to the top of the battle report, add a red danger banner above it, and apply serious card styling to make the severity of losing your home planet immediately clear:

- ~~**Task 218**~~ — Frontend: Move home planet capture card to top of battle report; add danger banner and serious card styling *(complete 2026-06-05)*

---

## Phase 50 — Bug Fix: Eliminated Player's Owned Planets Show as Neutral During Their Final Turn

**Status:** Complete (2026-06-05).

One task to ensure all planets owned by an eliminated player remain displayed in their faction color for the full duration of their final turn — zero-troop planets must not appear neutral until surviving players start the next round:

- ~~**Task 219**~~ — Frontend: Preserve eliminated player's planet ownership display for their entire final turn *(complete 2026-06-05)*

---

## Phase 51 — Bug Fix: End Turn Does Nothing for Eliminated Player

**Status:** Complete (2026-06-05).

One task to wire the End Turn button for eliminated players so it correctly advances to the next player (or ends the game when the eliminated player was the last human):

- ~~**Task 220**~~ — Frontend: Wire End Turn for eliminated player to advance to next player (or end game if last human) *(complete 2026-06-05)*

---

## Phase 52 — Bug Fix: Async Eliminated Player's Turn Not Advanced on Backend After Knockout

**Status:** Complete (2026-06-05).

One task to submit an empty turn to the backend inside `acknowledgeKnockout` for async games, so `current_user_id` advances to the next player and the home screen no longer shows the eliminated player's turn as pending:

- ~~**Task 221**~~ — Frontend: Submit empty turn to backend in `acknowledgeKnockout` for async eliminated players *(complete 2026-06-05)*

---

## Phase 53 — Bug Fix: Home Screen Still Shows "Your Turn" After Async Knockout Acknowledgement

**Status:** Complete (2026-06-05).

One task to call `resetGame()` and `requestHomeRefresh()` inside the async `acknowledgeKnockout` success path so the local game record is cleaned up and the home screen immediately re-fetches fresh game data from the backend:

- ~~**Task 222**~~ — Frontend: Call `resetGame()` and `requestHomeRefresh()` after successful submit in `acknowledgeKnockout` *(complete 2026-06-05)*

---

## Phase 54 — Bug Fix: `loadAsyncGame` Never Sets `eliminatedPlayerPendingKnockout` — Root Cause of Farewell Turn Submit Never Firing

**Status:** Complete (2026-06-05).

One task to detect the eliminated-farewell-turn scenario in `loadAsyncGame` and set `eliminatedPlayerPendingKnockout: true` (+ show the lock screen), so the End Turn button and battle-report close correctly route to `acknowledgeKnockout` instead of the `endTurn` guard that silently aborts:

- ~~**Task 223**~~ — Frontend: Detect eliminated farewell turn in `loadAsyncGame` and set `eliminatedPlayerPendingKnockout: true` *(complete 2026-06-05)*

---

## Changelog
- 2026-06-05: Phase 54 complete (Task 223) — `loadAsyncGame` now detects eliminated farewell turn (`detail.isMyTurn && localPlayer.isEliminated`) and sets `eliminatedPlayerPendingKnockout: true` + `showingLockScreen: true`; `acknowledgeKnockout` chain now fires correctly end-to-end.
- 2026-06-05: Phase 54 added (Task 223) — root cause found: `loadAsyncGame` always sets `eliminatedPlayerPendingKnockout: false`; Tasks 221–222 fixed `acknowledgeKnockout` correctly but it was never reached; fix is to detect elimination in `loadAsyncGame`.
- 2026-06-05: Phase 53 complete (Task 222) — `resetGame()` and `requestHomeRefresh()` called on `acknowledgeKnockout` success; local game record cleaned up and home screen immediately re-fetches from backend.
- 2026-06-05: Phase 53 added (Task 222) — home screen still shows "your turn" after async knockout acknowledgement; `resetGame()` not called, `activeGameId` not cleared, home screen not force-refreshed.
- 2026-06-05: Phase 52 complete (Task 221) — `acknowledgeKnockout` async path now submits empty turn (`actions: []`, `turnNumber + 1`) before navigating home; backend `current_user_id` advances; retry-on-failure path added.
- 2026-06-05: Phase 52 added (Task 221) — async eliminated player navigates home but backend `current_user_id` never advances; home screen still shows "your turn"; fix by submitting empty turn from `acknowledgeKnockout`.
- 2026-06-05: Phase 51 complete (Task 220) — End Turn button now renders and calls `acknowledgeKnockout()` during knockout turns; battle report close also triggers advance; double-fire is safe via early-return guard.
- 2026-06-05: Phase 51 added (Task 220) — End Turn does nothing for eliminated player; wire End Turn to advance to next player or end game if last human.
- 2026-06-05: Phase 50 complete (Task 219) — `applyHomePlanetElimination` now skips `forfeitEliminatedPlayerPlanets` for human players; planets preserved through farewell turn, forfeited in `acknowledgeKnockout`.
- 2026-06-05: Phase 50 added (Task 219) — eliminated player's zero-troop owned planets show as neutral immediately after battle report dismissed; preserve planet ownership display for full final turn.
- 2026-06-05: Phase 49 complete (Task 218) — home planet capture card sorted to top; red "Your home planet was taken over." danger banner and red-border card styling added.
- 2026-06-05: Phase 49 added (Task 218) — home planet capture card buried in battle report with no emphasis; sort to top, add red danger banner, apply serious card styling.
- 2026-06-04: Phase 48 complete (Tasks 216–217) — async eliminated player now gets correct alert copy and is navigated home on knockout acknowledgement.
- 2026-06-04: Phase 48 added — eliminated async player sees wrong alert text and is left stranded with no way to exit after dismissing battle report.
- 2026-06-04: Phase 47 complete (Tasks 214–215 + Backend Task 10.1) — eliminated/losing player can now open a finished async game, see "View Final Battle" lock screen, view the final battle report, then be taken home with a game-over alert.
- 2026-06-04: Phase 47 added (Tasks 214–215) — eliminated/losing player cannot open finished async game to see the final fight; allow loading finished games, "View Final Battle" lock screen, game-over flow after battle report dismissed.
- 2026-06-04: Phase 46 complete (Task 213) — replaced two competing auto-open effects with one `lastOpenedTurnKeyRef`-guarded effect; exactly one modal per turn.
- 2026-06-04: Phase 46 added (Task 213) — multiple battle report modals open simultaneously on turn start; correlates with number of opponents fought.
- 2026-06-04: Phase 45 complete (Task 212) — async submit overlay now fully opaque; next player's state no longer visible through it.
- 2026-06-04: Phase 45 added (Task 212) — async end turn exposes opponent's full game state for a split second; full-screen overlay blocks resolved state during submit window.
- 2026-06-01: Phase 44 complete (Task 211) — production now pre-runs before step-2 early-arrivals combat on round-wrap turns; `productionAlreadyRan` guard prevents double-run in step 8.
- 2026-06-01: Phase 44 added (Task 211) — multiplayer bug: factory planet loses to 1 troop after owner sends all troops; production must run before any combat in all resolveTurn paths.
- 2026-06-01: Phase 43 complete (Task 210) — battle report no longer flashes after ending an async multiplayer turn.
- 2026-06-01: Phase 41 complete (Tasks 202–203) — large map launch crash: `enforceMinimumSpacing` O(n⁴) fixed + spawn placer guaranteed fallback for high player counts.
- 2026-06-01: Phase 41 complete (Task 202) — large map launch freeze: `enforceMinimumSpacing` O(n⁴) fixed by capping outer iterations at 500.
- 2026-06-01: Phase 38 expanded (Task 201 added) — added async multiplayer coverage: restore `playerBattleArchiveByPlayerId` in `loadAsyncGame`; phase renamed to "Battle Report and Turn Data Not Preserved for the Full Turn Duration (All Modes)".
- 2026-06-01: Phase 40 complete (Tasks 198–200) — true multi-way combat for 3+ players at the same planet: melee algorithm, engine wiring, and battle report UI.
- 2026-06-01: Phase 39 added (Tasks 195–197) — duplicate planet names + name used as identifier in event/report system.
- 2026-06-01: Phase 38 added (Task 194) — battle report and map indicators lost when re-entering solo game after exiting from lock screen.
- 2026-06-01: Task 193 complete — `roundNumber` on `combat` / `fleet_arrived` events; **Round N** labels on battle-report and troop-landing cards; `drainStaleFleets` on game load; Phase 37 complete.
- 2026-06-01: Task 192 complete — `troopAccumulator` reset to 0 on planet capture in `resolveArrival`; `troop_produced` turn-report event from `runProduction`; Battle Report and ⋮ Report Production section; Phase 36 complete.
- 2026-05-31: Task 179 complete — `useVisibleGameState` switches to AI perspective via `overrideViewerId`; `queuedOrders` populated with AI fleet actions; planet taps use `viewingPlayerId` (AI's ID); planet detail panel read-only (build chips, slider, building slots all gated); queued orders cancel buttons hidden. Separate overlay UI from Tasks 176–177 removed.
- 2026-05-31: Task 178 complete — observer "End Turn" button with 300 ms debounce (`canAdvanceAi`); human End Turn hidden via `!showingAiObserver` guard; `advanceStagedAiTurn()` wired.
- 2026-05-31: Task 177 complete — "Orders" badge button + read-only modal with `formatAiActionLabel` helper covering SEND_FLEET, BUILD, and SET_PRODUCTION_SLIDER; auto-closes when observer ends.
- 2026-05-31: Task 176 complete — observer banner (absolute, `zIndex: 50`, AI color pill), all interaction guards extended with `|| showingAiObserver`, AI fleet arrows rendered via new `FleetLayer` props `aiObserverOrders` / `aiObserverColor`.
- 2026-05-31: Task 175 complete — `endTurn()` stages AI turn when observer mode on; `advanceStagedAiTurn()` resolves staged turn and chains to next AI or resumes human (with full knockout logic).
- 2026-05-31: Task 174 complete — `showingAiObserver`, `pendingAiTurnInput`, `pendingAiPlayerId` fields and `clearAiObserver()` action added to store.
- 2026-05-31: Task 173 complete — `aiObserverMode` flag added to store; "Watch AI Turns" toggle added to HomeScreen new-game setup (visible only when at least one AI slot is configured).
- 2026-05-31: Phase 28 added (Tasks 173–178) — AI Observer Mode: pause after each AI turn to review planned fleet dispatches, builds, and slider changes before advancing.
- 2026-05-31: Phase 26 complete (Task 171) — `MIN_PLANET_DISTANCE` 4→2.5; `growthPosition` offset `4 + rng() * 7` → `2.5 + rng() * 7`.
- 2026-05-31: Phase 26 added (Task 171) — tighter planet spacing: ~1.5 clicks closer on average, constants-only change to `mapGenerator.ts`.
- 2026-05-31: Phase 25 complete (Task 170) — home-planet snap zoom halved from 2.0 to 1.0.
- 2026-05-31: Phase 24 complete (Tasks 167–169) — solo "Start Turn" screen fixed, auto-dismiss removed, exit button added.
- 2026-05-31: Task 169 complete — added "Exit" button to lock screen wired to `handleExitToHome`; game record preserved on exit.
- 2026-05-31: Task 168 complete — removed 1500 ms auto-dismiss `useEffect` from `GameScreen.tsx`; lock screen now stays until user taps "Start Turn".
- 2026-05-31: Task 167 complete — solo game "Start Turn" lock screen now shows; root cause was `playMode: 'asyncMultiplayer'` being passed to `startNewGame` in the all-AI branch of `handleLaunch`.
- 2026-05-31: Phase 24 added (Tasks 167–169) — solo/pass-and-play "Start Turn" lock screen bugs: missing screen in solo games, auto-dismiss, and missing exit button.
- 2026-05-31: Phase 23 complete (Tasks 165–166) — local Pass & Play / Solo games now persist to AsyncStorage via Zustand persist middleware; HomeScreen hydration flash fixed.
- 2026-05-31: Phase 23 added (Tasks 165–166) — persist local Pass & Play / Solo games to AsyncStorage.
- 2026-05-31: Phases 20–22 added (Tasks 159–164) — multiplayer submit bug fix, solo games feature, delete-any-game feature.
- 2026-05-31: Task 158 complete — pass-and-play API-call guards verified in `gameStore.ts` (`endTurn`) and `GameScreen.tsx` (`handleExitGame`); no code changes required.
- 2026-05-31: Phase 19 complete — Tasks 155–158 done. Backend 401 fix, turnNumber submit fix, exit-save error logging added, pass-and-play guards verified.
- 2026-05-31: Tasks 151–154 complete (Phase 18 — Play with Friends: Creator-First Start).
- 2026-05-31: Tasks 149–150 added to backlog (Phase 17 — Multiplayer Bug Fixes).
- 2026-05-27: Cleared after Task 10 completion.
- 2026-05-27: Task 10b complete — HomeScreen, GameScreen stub, NavigationContainer stack.
- 2026-05-27: Task 10a started — game store and navigation dependency install.
- 2026-05-27: Cleared after Task 9 completion.
- 2026-05-27: Cleared after Task 8 completion.
- 2026-05-27: Cleared after Task 7 completion.
- 2026-05-27: Cleared after Task 6 completion.
- 2026-05-27: Cleared after Task 5 completion.
- 2026-05-27: Cleared after Task 4 completion.
- 2026-05-27: Cleared after Task 3 completion.
- 2026-05-27: File created.
