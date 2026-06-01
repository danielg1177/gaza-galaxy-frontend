# Known Issues & Technical Debt

## Open Issues

### AI observer mode plumbing is unreachable (2026-06-01)

**Context:** The **Watch AI Turns** setup toggle was removed from `HomeScreen`. The underlying store flag (`aiObserverMode`) and in-game observer UI in `GameScreen` / `gameStore` (`showingAiObserver`, `advanceStagedAiTurn`, etc.) remain but cannot be enabled.

**Follow-up:** Remove dead observer-mode code paths in a future cleanup task, or restore the toggle if the feature is wanted again.

---

### Duplicate planet names cause battle-report and map-indicator cross-contamination (2026-06-01)

**Symptom:** Two planets can be generated with the same name (e.g. both "Red Shard"). Because battle-report events and map indicators use `planetName` as a lookup key, events from one planet bleed into the other — the wrong planet lights up on the map, and combat entries appear under the wrong planet in the report.

**Root cause:**
- `generatePlanetName` draws from 16 adjectives × 16 nouns = 256 combinations with no uniqueness check. Bridge planets inserted by `ensureConnectivity` increase collision probability further.
- `TurnEvent` types carry only `planetName` — no `planetId`. All event-keyed lookups (`humanCombatByPlanetName`, `battlePlanetNames`, `buildPlayerReports` `build_complete` owner lookup) use the name as the key.

**Fix (Phase 39):** Task 195 adds a post-generation deduplication pass in `generateMap`. Task 196 adds `planetId?: string` to all planet-referencing `TurnEvent` types and emits it from the engines. Task 197 updates all event-keyed lookups to use `planetId` with name fallback for backward compat.

---

### Battle report and map indicators missing after re-entering a solo/pass-and-play game (2026-06-01)

**Symptom:** In a solo game, after ending a turn and exiting from the "Start Turn" lock screen via the "Exit" button, re-entering the game from the home screen shows no battle report, no map combat indicators (sword icons on planets where battles occurred), and an empty ⋮ Report — even though the turn events were correctly saved to `pendingTurnReport`.

**Root cause (two parts):**

**Part 1 — `playerBattleArchiveByPlayerId` is not restored:** `loadGame()` resets both `playerBattleArchiveByPlayerId` and `playerTurnReportByPlayerId` to `{}`. `humanCombatEvents` (which drives map battle indicators and battle-report modal content) is derived from `playerBattleArchiveByPlayerId[localHumanPlayerId]`, not from the raw `turnReport`. So even though `turnReport` is correctly restored, `humanCombatEvents` is always empty after re-entry.

**Part 2 — Lock-screen transition never fires:** The `setShowBattleReportModal(true)` call is inside a `useEffect` that watches `showingLockScreen` for a `true → false` transition. `loadGame()` sets `showingLockScreen: false` directly with no prior `true` state, so the auto-open never fires.

**Fix (Phase 38, Task 194):** Extract a shared `buildPlayerReports(events, players)` helper used by both `endTurn()` and `loadGame()`. In `loadGame`, when `pendingTurnReport` is non-empty, call the helper to rebuild per-player maps and set `showingLockScreen: true` so the lock screen re-appears and triggers the battle-report auto-open on "Start Turn".

## Resolved Issues

### ~~Large map launch crash with 6+ players~~ (2026-06-01, resolved 2026-06-01)

**Symptom:** Tapping "Launch" for a 2-human + 4-AI game on a Large map either froze the app indefinitely or threw `"No starting planet assigned for player player-5"`.

**Root cause — freeze:** `enforceMinimumSpacing` in `mapGenerator.ts` set `maxIter = n² × 4`. For 135 planets (Large, 6P) that is 72,900 outer iterations × 9,045 pairwise checks = ~659 million operations on the JS main thread.

**Root cause — crash:** `assignAis` in `spawnPlacer.ts` requires each AI to land in a unique zone AND be ≥50 clicks from all human home planets. With only 8 zones, 2 used by humans, and humans near opposite map edges, the overlap constraint made it geometrically impossible to place all 4 AIs. After 50 retries the incomplete assignment reached `placeSpawns`, which threw a hard error.

**Fix (Phase 41, Tasks 202–203):**
- Task 202: `maxIter` capped to `500` in `enforceMinimumSpacing`.
- Task 203: `assignAis` now runs a guaranteed fallback after all retries — drops zone-uniqueness and human-separation constraints and places remaining AIs on any available neutral planet. `placeSpawns` also has a last-resort fallback before throwing.

---

### ~~Two combat entries for the same planet in one battle report~~ (2026-06-01, resolved 2026-06-01)

**Symptom:** Players saw duplicate combat (or combat + landing) lines for one planet and could not tell whether they were separate rounds or a bug.

**Fix (Phase 37, Task 193):** `combat` and `fleet_arrived` events include optional `roundNumber`; Battle Report and Troop Landings cards show muted **Round N** when set; `loadGame` / `loadAsyncGame` call `drainStaleFleets` to drop persisted `turnsRemaining <= 0` fleets that could re-trigger the early-arrivals path.

---

### ~~Production troops on captured planet / invisible garrison production~~ (2026-06-01, resolved 2026-06-01)

**Symptom:** Captured planets could inherit fractional `troopAccumulator` from the previous owner; battle report showed no troop-production lines, so garrison changes before combat were opaque.

**Fix (Phase 36, Task 192):** `resolveArrival` sets `troopAccumulator: 0` on neutral capture and enemy-combat victory; `runProduction` emits `troop_produced` when whole troops are added; Battle Report and ⋮ Report show production lines.

---

### ~~Async game: battle report always empty when loading opponent's turn~~ (2026-06-01, resolved 2026-06-01)

**Symptom:** After the opponent submitted an async turn, the waiting player saw map changes with no battle report.

**Fix (Phase 35, Tasks 188–191):** Backend stores `events_json` on submit; `GET /api/games/{id}` returns `latest_events`; frontend `submitTurn` sends `events`; `loadAsyncGame` sets `turnReport` from `detail.latestEvents`.

---

### ~~Battle report lost after app exit in solo / pass-and-play games~~ (2026-06-01, resolved 2026-06-01)

**Root cause:** `turnReport` was in-memory only; only `games[]` was persisted via Zustand `partialize`.

**Fix:** Task 187 — `GameRecord.pendingTurnReport` written in `endTurn`, restored in `loadGame`, cleared via `clearPendingTurnReport` when the battle report modal is dismissed.

---

### ~~AI setup exposes avoidable difficulty configuration~~ (2026-05-31, resolved 2026-05-31)

**Root cause:** `HomeScreen.tsx` rendered per-AI difficulty chips and passed slot-selected values into game creation, which introduced unnecessary setup complexity for the current product direction.

**Fix:** Task 172 removed the difficulty chips from setup, defaults all AI slots to hard in `HomeScreen`, and enforces `player.difficulty = 'hard'` in `gameStore.buildPlayers`.

---

### ~~Solo game "Start Turn" screen missing between turns~~ (2026-05-31, resolved 2026-05-31)

**Root cause:** `handleLaunch` in `HomeScreen.tsx` passed `playMode: 'asyncMultiplayer'` to `startNewGame` for the all-AI solo branch. `gameStore.endTurn()` only sets `showingLockScreen: true` when `finalState.playMode === 'passAndPlay'`, so the lock screen was never shown. Fixed by passing `playMode: 'passAndPlay'` explicitly in the solo branch (Task 167).

---

### ~~"Start Turn" lock screen auto-dismisses after ~1.5 seconds~~ (2026-05-31, resolved 2026-05-31)

**Root cause:** A `useEffect` in `GameScreen.tsx` started a `setTimeout(..., 1500)` that called `dismissLockScreen()` automatically whenever `showingLockScreen` became `true`. Removed the entire `useEffect` (Task 168). The "Start Turn" button's `onPress={dismissLockScreen}` remains as the only way to close the screen.

---

### ~~"Start Turn" lock screen has no way to exit to Home~~ (2026-05-31, resolved 2026-05-31)

**Fix:** Added an **"Exit"** button above the "Start Turn" button. Uses the existing `handleExitToHome` handler (`navigation.navigate('Home')`) — game record is preserved, no `resetGame()` called (Task 169).

## Resolved Issues

### Multiplayer End Turn: Submit fails AND exposes opponent's turn (2026-05-31, resolved 2026-05-31)

**Symptom:** In a real multiplayer game between two human users, tapping End Turn shows "Submit Failed — Could not submit your turn." When the user taps OK on the error, they are on the other player's turn — they can see that player's full game state, interact with it, and end that player's turn. Confirmed with live two-human game.

**Root cause (two parts):**

**Part 1 — Frontend UX/security:** `endTurn()` in `gameStore.ts` resolves the full turn cycle locally (human `resolveTurn` + `runAiTurnsUntilHuman`) and commits the result as the new active game state BEFORE calling `submitTurn`. If `submitTurn` fails, `shouldReturnHome` is never set, so the user stays in `GameScreen` viewing and interacting with the next human player's state.

**Part 2 — Backend stale check:** `TurnController::submit()` advances `games.turn_number` by `+1` on each human submit. But the frontend's `GameState.turnNumber` increments by `+1` per `resolveTurn` call — one for the human, one per AI player during `runAiTurnsUntilHuman`. The resulting state's `turnNumber` is therefore `previous + 1 + N_ai`. This value is stored in `state_json`. The next human loads it and sends `turn_number = previous + 1 + N_ai` while the backend has `previous + 1` → 409 Stale turn data → "Submit Failed" on every turn in games with AI players.

**Impact:** Every multiplayer game that includes AI players fails to submit. Additionally, any submit failure (any cause) leaves the user able to play the opponent's turn.

**Fix:** Tasks 159 (frontend navigate-home on failure), 160 (surface HTTP error for diagnosis), 161 (backend fix `turn_number` advancement to match `resulting_state.turnNumber`). See `docs/tasks/backlog.md` Phase 20.

## Resolved Issues

### Phase 19 async save/submit failures — Tasks 155–157 (2026-05-31)

Phase 19 tasks 155–157 address the async save/submit failures. Pass-and-play API-call guards confirmed present and correct (Task 158).

---

### Async end turn always failed with 409 — `turnNumber`/`roundNumber` sent post-resolution (2026-05-31, resolved 2026-05-31)

**Symptom:** Tapping End Turn in any async multiplayer game ("Play with Friends") immediately showed "Submit Failed — Could not submit your turn." for every game, every turn, without exception.

**Root cause:** `endTurn()` in `gameStore.ts` submitted `turnNumber: finalState.turnNumber` and `roundNumber: finalState.roundNumber`. The turn engine (`turnEngine.ts`) increments `turnNumber` by +1 on every `resolveTurn` call — once for the human player, then once per AI player that resolves during `runAiTurnsUntilHuman`. By the time `finalState` was produced, `turnNumber` was `gameState.turnNumber + 1 + N_ai`. The backend's stale check (`$request->turn_number != $game->turn_number`) compared this inflated value against the pre-resolution database value, which never matched → always 409 Stale turn data.

**Fix (Task 156):** Captured `preTurnNumber = gameState.turnNumber` and `preRoundNumber = gameState.roundNumber` immediately after `const gameState = record.state`, before `resolveTurn`/`runAiTurnsUntilHuman` run. These pre-resolution values are passed to `submitTurn` instead of `finalState.turnNumber`/`finalState.roundNumber`, matching the backend's stored values exactly.

---

### Async game creation — both multiplayer bugs traced to handleLaunch never calling the backend (2026-05-31)
**Root cause (both bugs):** `handleLaunch` in `HomeScreen.tsx` called `startNewGame` for ALL play modes — including `asyncMultiplayer`. `startNewGame` creates a local-only `GameRecord` with no `asyncGameId`. Because `asyncGameId` is `undefined`, `isAsyncGame()` always returned `false` for any game created via the setup form. This meant:
1. After End Turn: `isAsync = false` → `submitTurn` never called → `shouldReturnHome` never set → the game advanced to the next human player's turn locally on the same device (Bug 2).
2. On HomeScreen: the game appeared in the local "Pass & Play" section under `localGames` (filtered by `asyncGameId == null`) rather than the "Play with Friends" async games list, and was never stored on the backend (Bug 1).

**Additional backend bugs found:**
- `GameController::store()` returned `{ "data": { ... } }` but the frontend's `CreateGameResponse` expected `{ "game": { ... } }` — `createGame()` would always crash when reading `data.game`.
- `InviteController::index()` returned `{ "data": [...] }` but frontend expected `{ "invites": [...] }`.
- `InviteController::accept()` returned `{ "data": { id, status, game_id } }` but frontend expected `{ "accepted": true, "game_started": true/false }`.
- `GameService::startGame()` always ran `engine/init-game.js` (which doesn't exist), so any game without pending invites would throw a 500.

**Fix (2026-05-31):**
- `gameStore.ts`: extracted `generateInitialGameState(config, seed)` pure function from `startNewGame`.
- `HomeScreen.tsx`: `handleLaunch` now forks on `playMode`. Pass-and-play: unchanged local path. Async: generates initial `GameState` client-side, calls `createGame()` API with `stateJson`, returns to lobby on success (useFocusEffect refreshes the list). Shows `ActivityIndicator` on the button during the API call.
- `gamesService.ts`: added optional `stateJson?: string` to `CreateGamePayload`; sent as `state_json` in POST body when present.
- `GameService.php`: `startGame()` now checks `$game->state_json !== null` first — if already populated, parse it to find `currentPlayerId`, set `status = in_progress` and `current_user_id`, then return without running the engine script.
- `GameController.php`: `store()` accepts optional `state_json`, stores it on the `games` row at creation, calls `$game->refresh()` after `startGame()`, and returns response in the correct `{ "game": ApiGameRaw }` format.
- `InviteController.php`: `index()` response key changed from `"data"` to `"invites"`; `accept()` response changed to `{ "accepted": true, "game_started": bool }`.

---

### Async multiplayer end turn opens next player's turn instead of returning to HomeScreen (2026-05-31)
**Symptom:** In a multiplayer (async) game, tapping "End Turn" advanced the game to the next human player's turn locally — showing their map state and allowing full interaction instead of submitting and returning to HomeScreen.

**Cause:** Decoded `state_json` / `partial_state_json` could carry `playMode: 'passAndPlay'`, so `endTurn` showed the pass-and-play lock screen and advanced to the next human locally even when `GameRecord.asyncGameId` was set.

**Fix:** Task 150 — `isAsyncGame()` keyed on `asyncGameId != null`; `loadAsyncGame` overrides `playMode` to `'asyncMultiplayer'`; GameScreen hides lock screen when async; async `endTurn` submits then navigates home via `shouldReturnHome`.

---

### Games not visible in active campaigns after exit (2026-05-31)
**Symptom:** After creating a game and exiting via the ⋮ menu, the game did not appear in the HomeScreen active campaigns list.

**Cause:** **Exit to Home** and **Exit Game** both called `resetGame()`, which removed the active game from Zustand `games[]`. Pass-and-play games are local-only, so the campaign was lost on exit.

**Fix:** Task 149 — **Exit to Home** / **Exit Game** navigate home without `resetGame()`; HomeScreen **Pass & Play** section always lists every `GameRecord` with `asyncGameId == null`.

---

### Same-turn capture: conquered planet stayed blue and non-interactible until next turn (2026-05-28)
**Symptom:** After End Turn resolved a fleet capture, the planet showed selection/drag-origin accent (blue highlight) and could not be tapped or dragged from until the following turn; next turn it behaved as a normal owned planet.

**Cause:** `selectedPlanetId` and/or `dragOriginPlanetId` in React/local store survived past `resolveTurn` while the planet's `owner` updated in game state — accent styles overrode green ownership rendering and interaction gates still treated the planet as non-owned for that frame/turn.

**Fix:** `endTurn` now sets `selectedPlanetId: null` in the same `set()` as the resolved game state; `GameScreen` runs a `useEffect` that clears selection and drag-origin when the referenced planet is missing or `owner !== localHumanPlayerId`. `combatEngine.resolveArrival` already assigns `owner` on neutral and combat victory (no engine change).

### Conquered owned planets: blue highlight only, tap did not open modal (2026-05-28)
**Symptom:** After capturing a non-home planet, the node showed a blue accent (drag/selection) but not full green owned rendering; tapping did not open the owned-planet detail modal.

**Cause:** `Gesture.Exclusive(planetTap, fleetDrag)` gave `fleetDrag` higher priority (last gesture wins). `fleetDrag.onStart` called `handleDragStart` immediately, setting drag-origin accent before tap could win. Fog/UI ownership used the first human player id only, so pass-and-play could mis-classify the current human's captured planets.

**Fix:** `Gesture.Exclusive(fleetDrag, planetTap)` so tap wins when stationary; fleet drag begins on first `onUpdate` after `minDistance(10)`; exported `getLocalHumanPlayerId` for fog and all `owner ===` UI checks in `GameScreen`.

### Planet tap and long-press drag non-functional (2026-05-28)
**Symptom:** Tapping an owned planet did not open the modal; long-press drag to dispatch a fleet did not activate.

**Cause (1 — gesture competition):** Each `PlanetNode` used its own `GestureDetector` nested inside the map-level `GestureDetector`. In RNGH v2, nested detectors compete for gestures without automatic coordination — the outer map gesture consumed touches before planet gestures could fire.

**Cause (2 — coordinate transform bug):** `screenToMapCoords` used the raw `translateX/Y` values but `animatedStyle` applied an additional center-compensation of `mapDimension * (scale - 1) / 2`. At scale ≠ 1, planet hit-testing was offset by hundreds of pixels.

**Fix:** Removed all gesture/touch handling from `PlanetNode` (now purely presentational with `pointerEvents="none"`). Added `planetTap` (`Gesture.Tap().maxDuration(300)`) and `fleetDrag` (`Gesture.Pan().activateAfterLongPress(300)`) directly to the map-level `GestureDetector`. Updated `screenToMapCoords` to apply the center-compensation: `effectiveTx = rawTx + mapW*(scale-1)/2`.

### Reanimated startup crash — `[runtime not ready]: Exception in HostFunction` (2026-05-27)
**Symptom:** App fails on launch (or when loading Worklets) with `[runtime not ready]: Error: Exception in HostFunction: <unknown>`.

**Cause:** Expo Metro defaults to `inlineRequires: false`. Reanimated 4 / `react-native-worklets` require inline requires so worklets `init()` runs before other exports ([reanimated#8904](https://github.com/software-mansion/react-native-reanimated/issues/8904)).

**Fix:** `metro.config.js` with `inlineRequires: true`, explicit `react-native-worklets` dependency, then `npx expo start --clear`.

### GameScreen infinite re-render — `getSnapshot should be cached` (2026-05-27)
**Symptom:** Starting a game crashes with "The result of getSnapshot should be cached" and "Maximum update depth exceeded".

**Cause:** `useGameStore((s) => s.getVisibleGameState())` calls `buildVisibleState`, which allocates a new object on every selector run. React 19 treats each snapshot as a change.

**Fix:** `useVisibleGameState()` hook — selects the stable `GameRecord` from the store, memoizes fog-of-war projection with `useMemo`. Imperative `getVisibleGameState()` unchanged for non-React callers.

## Technical Debt

_None yet._

---

## Changelog
- 2026-06-01: Fixed WorkletsError on web — disabled `worklets` and `reanimated` babel plugins in `babel.config.js` (web-only PWA; Reanimated's web polyfill handles everything without babel transformation).
- 2026-06-01: Resolved large map launch crash (Phase 41, Tasks 202–203) — `enforceMinimumSpacing` O(n⁴) capped at 500; spawn placer guaranteed fallback for geometrically impossible AI placement.
- 2026-06-01: Added open issue — duplicate planet names + name as identifier (Phase 39, Tasks 195–197).
- 2026-06-01: Added open issue — battle report and map indicators missing on solo re-entry (Phase 38, Task 194).
- 2026-06-01: Resolved production-on-capture / invisible troop production (Task 192, Phase 36).
- 2026-05-31: Resolved "no exit button on lock screen" (Task 169); all Phase 24 issues resolved.
- 2026-05-31: Resolved "Start Turn auto-dismiss" (Task 168); one open issue remains (no exit button).
- 2026-05-31: Resolved "Solo game Start Turn screen missing" (Task 167); two open issues remain (auto-dismiss, no exit button).
- 2026-05-31: Added three open issues for Phase 24 — solo "Start Turn" screen missing, auto-dismiss, and no exit button.
- 2026-05-31: Removed open issue "Async Exit Game fails" (Tasks 155–157 fixes); added resolved note for Phase 19 + Task 158 pass-and-play guard verification.
- 2026-05-28: Task 73 revision — pinch restored (`Gesture.Simultaneous` + `isFleetDragging` pan guard); conquered-planet tap no longer blocked by stale `handleMapTap` ownership closure (modal/effect still gate owned UI).
- 2026-05-28: Documented same-turn capture stale selection/drag-origin fix (Task 67).
- 2026-05-28: Documented planet tap/drag gesture competition + coordinate transform fix.
- 2026-05-27: Documented GameScreen Zustand getSnapshot / useVisibleGameState fix.
- 2026-05-27: Documented Reanimated/Worklets Metro inline-requires fix.
- 2026-05-27: File created.
