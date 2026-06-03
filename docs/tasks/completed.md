# Completed Tasks

## Restore "Watch AI Turns" on new-game setup
**Completed:** 2026-06-03
**Files modified:** `src/screens/HomeScreen.tsx`, `docs/development/current-state.md`, `docs/development/known-issues.md`, `docs/tasks/completed.md`
**Notes:** Re-added the observer-mode toggle, store selectors, `Switch` import, and toggle styles to the campaign setup form. Visible when at least one AI slot is configured; wires to existing `aiObserverMode` / in-game observer UI. `npx tsc --noEmit` passes clean.

---

## In-transit fleet tooltip — auto-dismiss and close button
**Completed:** 2026-06-02
**Files modified:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`, `docs/systems/movement.md`, `docs/tasks/completed.md`
**Notes:** `FleetTooltipOverlay` shows owner, ships, and ETA on in-flight fleet tap; fades out after 4s (300ms animation); **✕** dismisses early; timer resets on another fleet tap. `npx tsc --noEmit` passes clean.

---

## Async lobby — non-tappable when not your turn
**Completed:** 2026-06-01
**Files modified:** `src/screens/HomeScreen.tsx`, `App.tsx`, `docs/development/current-state.md`, `docs/systems/multiplayer.md`, `docs/systems/save-system.md`, `docs/systems/notifications.md`
**Notes:** **Play with Friends** cards use `isMyTurn` for tap eligibility (`your_turn` and `in_progress` only). Opponent-turn (`waiting`) cards show **Waiting...** badge and render as non-interactive. `handleOpenAsyncGame` and notification deep-link bail when `!isMyTurn`. Reverts Task 146 lobby spectator entry. `npx tsc --noEmit` passes clean.

---

## Remove "Watch AI Turns" from new-game setup
**Completed:** 2026-06-01
**Files modified:** `src/screens/HomeScreen.tsx`, `docs/development/current-state.md`
**Notes:** Removed the observer-mode toggle, related store selectors, `Switch` import, and observer toggle styles from the campaign setup form. In-game observer plumbing (`aiObserverMode`, `showingAiObserver`, etc.) remains in the store and `GameScreen` but is unreachable (flag defaults `false`). `npx tsc --noEmit` passes clean.

---

## App rename — Strategic Commander → Gaza Galaxy
**Completed:** 2026-06-01
**Files modified:**
- `src/constants/app.ts` — `APP_NAME`, storage keys
- `src/utils/migrateStorage.ts` — one-time AsyncStorage key migration
- `index.ts` — run migration before app register
- `src/screens/LoginScreen.tsx`, `RegisterScreen.tsx`, `HomeScreen.tsx` — display title
- `app.json`, `package.json` — Expo/npm identifiers
- `src/store/gameStore.ts` — persist key
- Docs: `project-spec.md`, `architecture.md`, `backend-build-instructions.md`, `setup.md`, `save-system.md`, `backlog.md`, `current-state.md`, `decisions.md`
**Notes:** Palm OS original name retained in `project-spec.md` historical sections. `StrategicMapModal` and AI "strategic phase" naming unchanged (feature terminology, not product name). `npx tsc --noEmit` passes clean.

---

## Fleet dispatch modal — tap ship count to type value
**Completed:** 2026-06-01
**Files modified:** `src/screens/GameScreen.tsx`, `docs/systems/movement.md`, `docs/development/current-state.md`
**Notes:** Send/Edit Fleet modal ship count is tappable; opens numeric `TextInput` with value clamped to `0…modalMaxShips` on blur/submit. **Confirm** resolves the draft synchronously (does not rely on blur). − / + / **All** stepper unchanged. `npx tsc --noEmit` passes clean.

---

## Bug fix — Remove `troop_produced` from all player-facing reports
**Completed:** 2026-06-01
**Files modified:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `docs/systems/production.md`, `docs/development/current-state.md`
**Notes:** Removed `TroopProducedReportCard`, Battle Report production lines, and ⋮ Report **Production** section; `gameStore` no longer routes `troop_produced` to `playerTurnReportByPlayerId`. Events may still be emitted for engine/async payloads.

---

## ~~Bug fix — `troop_produced` owner-only in ⋮ Report~~ *(superseded 2026-06-01 — UI removed entirely)*

---

## Strategic map modal (⋮ Map menu)
**Completed:** 2026-06-01
**Files modified:**
- `src/components/StrategicMapModal.tsx` — new full-board overview modal with pinch-zoom and pan; owned planets green, others muted
- `src/screens/GameScreen.tsx` — **Map** row in ⋮ header menu; wires `StrategicMapModal`
- `docs/development/current-state.md`
**Notes:** Opens from in-game ⋮ menu during human turn. Shows all planet positions (not fog-filtered). Fit-to-viewport on open. `npx tsc --noEmit` passes clean.

---

## Task 193 — Frontend: Round context on battle report + stale-fleet drain on load
**Completed:** 2026-06-01
**Files modified:**
- `src/game/types.ts` — optional `roundNumber` on `fleet_arrived` and `combat` `TurnEvent` variants
- `src/game/combatEngine.ts` — `resolveArrival` takes `roundNumber`; populates it on emitted events
- `src/game/turnEngine.ts` — passes `state.roundNumber` into `resolveArrival`
- `src/store/gameStore.ts` — `drainStaleFleets` filters `turnsRemaining <= 0` fleets on `loadGame` / `loadAsyncGame`
- `src/screens/GameScreen.tsx` — muted **Round N** label on `BattleReportCard` and `FleetArrivedReportCard` (⋮ Report Troop Landings)
- `docs/systems/combat.md`, `docs/systems/turn-engine.md`, task docs, `docs/development/current-state.md`
**Notes:** Phase 37 complete. Two same-planet combat cards from different rounds are distinguishable; stale `turnsRemaining = 0` fleets no longer trigger phantom early-arrival combat after reload. `npx tsc --noEmit` passes clean.

---

## Task 192 — Frontend: Reset `troopAccumulator` on ownership change and add troop-production events
**Completed:** 2026-06-01
**Files modified:**
- `src/game/types.ts` — `TurnEvent` adds `troop_produced` (`planetName`, `ownerName`, `troopsAdded`)
- `src/game/combatEngine.ts` — `troopAccumulator: 0` on neutral capture and enemy-combat victory ownership change
- `src/game/productionEngine.ts` — emits `troop_produced` when `wholeTroops >= 1`
- `src/store/gameStore.ts` — routes `troop_produced` to planet owner and humans involved in combat on that planet
- `src/screens/GameScreen.tsx` — `TroopProducedReportCard` in Battle Report modal (below combat cards for same planet); ⋮ Report **Production** section; `formatTurnEvent` case
- `docs/systems/production.md`, `docs/systems/combat.md`, task docs, `docs/development/current-state.md`, `docs/development/known-issues.md`
**Notes:** Phase 36 complete. `npx tsc --noEmit` passes clean.

---

## Task 191 — Frontend: Restore `turnReport` from loaded events in `loadAsyncGame`
**Completed:** 2026-06-01
**Files modified:**
- `src/services/gamesService.ts` — `GameDetailResponse.latest_events`; `ApiGameDetail.latestEvents`; `mapGameDetail` maps `latestEvents: data.latest_events ?? []`
- `src/store/gameStore.ts` — `loadAsyncGame` sets `turnReport: detail.latestEvents ?? []`
- `docs/tasks/backlog.md`, `docs/tasks/completed.md`, `docs/tasks/in-progress.md`, `docs/development/known-issues.md`, `docs/development/current-state.md`, `docs/systems/multiplayer.md`, `backend/docs/development/known-issues.md`
**Notes:** Phase 35 complete. Waiting player sees battle report when opening game after opponent submits. `npx tsc --noEmit` passes clean.

---

## Task 190 — Frontend: Include `events` in `submitTurn` payload
**Completed:** 2026-06-01
**Files modified:**
- `src/services/gamesService.ts` — `SubmitTurnPayload.events?: TurnEvent[]`; `submitTurn` POST body includes `events: payload.events ?? []`
- `src/store/gameStore.ts` — async `endTurn()` passes aggregated `events` to `submitTurn`
- `docs/tasks/backlog.md`, `docs/tasks/completed.md`, `docs/tasks/in-progress.md`, `backend/docs/development/known-issues.md`
**Notes:** Waiting player still gets empty battle report until Task 191 restores `turnReport` from `detail.latestEvents` in `loadAsyncGame`. `npx tsc --noEmit` passes clean.

---

## Task 189 — Backend: return latest_events from GET /api/games/{id}
**Completed:** 2026-06-01
**Files modified:**
- `backend/app/Http/Controllers/GameController.php` — `show()` queries latest submitted turn (`resulting_state_json` not null); returns decoded `events_json` as `latest_events`, or `[]`
- `backend/docs/backend/api-contract.md`, `backend/docs/development/task-log.md`, `backend/docs/project/current-state.md`, `backend/docs/development/known-issues.md`
- `docs/tasks/backlog.md`, `docs/tasks/completed.md`
**Notes:** Frontend still does not consume `latest_events` (Task 191).

---

## Task 188 — Backend: store turn events on submit
**Completed:** 2026-06-01
**Files modified:**
- `backend/database/migrations/2026_06_01_000001_add_events_json_to_turns_table.php` — nullable `events_json` `longText` on `turns`
- `backend/app/Http/Controllers/TurnController.php` — optional `events` validation; persist `events_json` on turn upsert
- `backend/app/Models/Turn.php` — `events_json` in `$fillable`
- `backend/docs/backend/database-schema.md`, `backend/docs/backend/turn-engine.md`, `backend/docs/development/task-log.md`, `backend/docs/project/current-state.md`
- `docs/tasks/backlog.md`, `docs/tasks/completed.md`
**Notes:** Storage only; `GET /api/games/{id}` does not return events yet (Task 189). `php artisan migrate` run successfully.

---

## Task 187 — Persist pending turn report across app exit for local games
**Completed:** 2026-06-01
**Files modified:**
- `src/store/gameStore.ts` — `GameRecord.pendingTurnReport?: TurnEvent[]`; `endTurn` writes events to active record; `loadGame` restores `turnReport` and strips `pendingTurnReport` from persisted record; `clearPendingTurnReport` clears in-memory report and persisted field
- `src/screens/GameScreen.tsx` — `handleCloseBattleReport` calls `clearPendingTurnReport` after dismiss
- `docs/tasks/backlog.md`, `docs/tasks/completed.md`, `docs/development/known-issues.md`, `docs/development/current-state.md`, `docs/systems/save-system.md`
**Notes:** Local games only (`loadAsyncGame` unchanged). Battle report auto-open on resume uses restored `turnReport`. `npx tsc --noEmit` passes clean.

---

## Task 172 — Remove AI difficulty picker; default AI to hard
**Completed:** 2026-05-31
**Files modified:**
- `src/screens/HomeScreen.tsx` — removed AI difficulty chips from player slot rows; new AI slots and human→AI toggles now set `difficulty: 'hard'`; async `createGame` payload always sends `difficulty: 'hard'` for AI slots
- `src/store/gameStore.ts` — `buildPlayers` now forces all AI `Player.difficulty` values to `'hard'`
- `docs/development/current-state.md` — status/changelog updated for Task 172
- `docs/systems/ai-system.md` — documented hard-only AI setup behavior
**Notes:** AI engine still supports Easy/Normal/Hard internally, but setup flow now standardizes gameplay to hard AI only. `npx tsc --noEmit` passes clean.

---

## Task 171 — Reduce average inter-planet distance by ~1.5 clicks
**Completed:** 2026-05-31
**Files modified:**
- `src/game/mapGenerator.ts` — `MIN_PLANET_DISTANCE` 4→2.5; `growthPosition` parent offset `4 + rng() * 7` → `2.5 + rng() * 7` (uniform [2.5, 9.5] clicks, mean ~6.0)
**Notes:** Constants-only tune; placement algorithms, galaxy shapes, connectivity/bridge pass, bounding-box normalization, and `spawnPlacer` unchanged. `npx tsc --noEmit` passes clean.

---

## Command Center — creator delete async game
**Completed:** 2026-05-31
**Files modified:**
- `src/services/gamesService.ts` — `ApiGame.createdByUserId` mapped from `created_by_user_id` (fallback `creator_id`)
- `src/screens/HomeScreen.tsx` — `AsyncGameCard` **Delete** when creator; confirmation alert; `deleteApiGame` + optimistic list removal + `deleteLocalGame` for matching `asyncGameId`; `ApiError` messages on failure
**Notes:** No status gate. `npx tsc --noEmit` passes clean.

---

## Fleet dispatch modal — All button for max ship count
**Completed:** 2026-05-31
**Files modified:**
- `src/screens/GameScreen.tsx` — **All** button beside ship-count stepper sets count to `modalMaxShips` (garrison minus already-queued outbound); disabled when already at max or max is 0
**Notes:** Display-only UX shortcut; no store/engine changes. `npx tsc --noEmit` passes clean.

---

## Bug fix — pass-and-play lock screen turn counter
**Completed:** 2026-05-31
**Files modified:**
- `src/screens/GameScreen.tsx` — lock screen turn label now displays `roundNumber` (shared round counter) instead of `turnNumber` (global per-player-turn counter)
**Notes:** HUD already showed `roundNumber` (Task 78); lock screen was missed when turn info was added. In a 2-player game both players now see Turn 1 on round 1, Turn 2 on round 2, etc. `npx tsc --noEmit` passes clean.

---

## Task 150 — Bug fix: async end turn returns home instead of next player's turn
**Completed:** 2026-05-31
**Files modified:**
- `src/store/gameStore.ts` — `isAsyncGame()` returns true when `activeRecord.asyncGameId != null` (not `config.playMode` or decoded `state.playMode`); `loadAsyncGame` sets `playMode: 'asyncMultiplayer'` on parsed `partialStateJson` / `stateJson` before storing; `endTurn` async branch keyed on `asyncGameId`
- `src/screens/GameScreen.tsx` — pass-and-play lock screen rendered only when `showingLockScreen && !isAsyncGame`; `isAsyncGame` selector subscribes to `activeGameId` + `games[].asyncGameId`; `shouldReturnHome` effect early-returns when false
**Notes:** Async flow unchanged: resolve turn locally (including AI), `submitTurn`, `resetGame()`, `shouldReturnHome` → navigate Home. Pass-and-play lock screen and turn handoff unchanged when `asyncGameId == null`. `npx tsc --noEmit` passes clean.

---

## Task 149 — Bug fix: campaigns visible after exit to Home
**Completed:** 2026-05-31
**Files modified:**
- `src/screens/GameScreen.tsx` — **Exit to Home** (pass-and-play) calls `navigation.navigate('Home')` only; removed `resetGame()` so local games stay in `games[]`; **Exit Game** (async mid-turn save) navigates home without `resetGame()` after `saveTurnProgress` (or when no `asyncGameId`)
- `src/screens/HomeScreen.tsx` — **Pass & Play** section always renders every `GameRecord` where `asyncGameId == null` (no status filter); decoupled from empty-state ternary so local cards never hidden
**Notes:** Victory/game-over **Return to Home** still calls `resetGame()` for finished games. Async games after successful `endTurn` submit still call `resetGame()` (local copy discarded; server is source of truth). `npx tsc --noEmit` passes clean.

---

## GameScreen — pass-and-play lock screen turn info + Start Turn button
**Completed:** 2026-05-31
**Files modified:**
- `src/screens/GameScreen.tsx` — lock screen shows round number (`roundNumber`), active player name, and **Start Turn** button; overlay is non-tappable except via the button (replaces "Tap anywhere to continue")
**Notes:** `dismissLockScreen` behaviour unchanged; map snap and battle-report auto-open on dismiss unchanged.

---

## HomeScreen — "Play with Friends" label + remove coming soon UI
**Completed:** 2026-05-31
**Files modified:**
- `src/screens/HomeScreen.tsx` — play-mode card title "Play with Friends" (was "Async Multiplayer"); subtitle "Separate devices" (removed coming soon); lobby async games section label updated; removed `playMode*ComingSoon` dimmed styles
**Notes:** Internal `playMode` value remains `asyncMultiplayer`. No engine/store changes.

---

## AppTopBar — Friends (top-left) + Logout (top-right)
**Completed:** 2026-05-31
**Files modified:**
- `src/components/AppTopBar.tsx` (new) — shared safe-area top row; Friends pill with pending-request badge; Logout with confirmation `Alert`; calls `authStore.logout()`
- `src/screens/HomeScreen.tsx` — uses `AppTopBar` on lobby and campaign-setup views; removed inline `FriendsNavButton` / top-bar styles
- `src/screens/FriendsScreen.tsx` — uses `AppTopBar` with `showFriendsButton={false}` (Logout only on right)
**Notes:** `GameScreen` unchanged (in-game ⋮ menu retains Exit to Home). `npx tsc --noEmit` passes clean.

---

## Bug fix — HomeScreen Friends button hidden under iOS status bar
**Completed:** 2026-05-31
**Files modified:**
- `src/screens/HomeScreen.tsx` — Friends nav button moved from absolutely positioned `friendsButtonContainer` into in-flow `topBar` inside `SafeAreaView` (lobby + campaign setup); React Native absolute children ignore parent safe-area padding, which caused overlap with battery/time indicators
**Notes:** `GameScreen` already uses `useSafeAreaInsets()` for HUD placement. No system doc changes.

---

## Task 148 — Notification deep-link handler (tap notification → open game)
**Completed:** 2026-05-29
**Files modified:**
- `App.tsx` — `pendingGameId` ref; `useNavigationContainerRef<RootStackParamList>()` on `NavigationContainer`; `addNotificationResponseReceivedListener` stores `game_id` from notification data; `consumePendingGameId()` fetches via `getGame`, loads via `loadAsyncGame`, navigates `Home` then `Game` with `isReadOnly` when `alertState === 'waiting'`; cold-start via `useEffect([currentUser])`, warm-start via direct listener call when authenticated; all errors swallowed
**Notes:** Phase 16 complete. No screen or `pushNotificationService.ts` changes. `npx tsc --noEmit` passes clean.

---

## Task 147 — Expo push token registration + API upload on startup
**Completed:** 2026-05-29
**Files modified:**
- `package.json` / `package-lock.json` — `expo-notifications` installed (Expo SDK 54)
- `src/services/pushNotificationService.ts` (new) — `registerNotificationHandler()` sets foreground notification behavior; `setupPushNotifications()` requests permissions, fetches Expo push token, deduplicates via AsyncStorage key `push_token`, uploads via `POST /push-token`, swallows all errors
- `App.tsx` — module-level `registerNotificationHandler()`; `useEffect` on `currentUser` calls `setupPushNotifications()` when user is logged in
**Notes:** `shouldShowBanner` and `shouldShowList` added alongside deprecated `shouldShowAlert` for Expo SDK 54 `NotificationBehavior` types. Deep-link handler is Task 148. `npx tsc --noEmit` passes clean.

---

## Task 146 — Async game state fetch on open + read-only spectator mode
**Completed:** 2026-05-29
**Files modified:**
- `App.tsx` — `Game` route params add optional `isReadOnly?: boolean`
- `src/screens/HomeScreen.tsx` — `loadingGameId` per-card loading; block other taps while loading; navigate only after successful `getGame`; `Alert` on failure; pass `isReadOnly: detail.alertState === 'waiting'`; `waiting` cards tappable
- `src/screens/GameScreen.tsx` — read `isReadOnly` from route; amber spectator banner; hide End Turn and ⋮ when read-only; `handleDragStart` early return when read-only
**Notes:** Phase 15 complete. `loadAsyncGame` unchanged. `npx tsc --noEmit` passes clean.

---

## Task 145 — Async endTurn: submit via API and navigate home
**Completed:** 2026-05-29
**Files modified:**
- `src/store/gameStore.ts` — `isSubmittingTurn: boolean`, `shouldReturnHome: boolean`, `clearReturnHome()`; post-resolution async block in `endTurn`: snapshots `queuedOrders` as actions, calls `submitTurn`, sets `shouldReturnHome` on success, `Alert` on failure; pass-and-play path unchanged
- `src/screens/GameScreen.tsx` — `useEffect` on `shouldReturnHome` → navigate Home; full-screen "Submitting turn…" overlay with `ActivityIndicator` while `isSubmittingTurn`; End Turn button disabled during submit
**Notes:** All local turn resolution logic unchanged. `npx tsc --noEmit` passes clean.

---

## Task 144 — Mid-turn state restoration on async game open
**Completed:** 2026-05-29
**Files modified:**
- `src/store/gameStore.ts` — `loadAsyncGame` explicit mid-turn branch: when `inProgressActions.partialStateJson` is present, parse as `GameState` and map `queuedOrders` to `PendingFleet[]`; otherwise parse `stateJson` with empty queue; `asyncGameId` unchanged
**Notes:** HomeScreen tap handler unchanged (`getGame` → `loadAsyncGame` → navigate). `npx tsc --noEmit` passes clean.

---

## Task 143 — Exit Game in ⋮ menu + mid-turn save to API
**Completed:** 2026-05-29
**Files modified:**
- `src/store/gameStore.ts` — `isAsyncGame()` returns true when active record `config.playMode === 'asyncMultiplayer'`
- `src/screens/GameScreen.tsx` — ⋮ menu **Exit Game** (async: `saveTurnProgress` with serialized `GameState` + `queuedOrders`, `ActivityIndicator` while saving, `Alert` on failure) and **Exit to Home** (pass-and-play: `resetGame` + navigate); skips API when `asyncGameId` falsy
**Notes:** Phase 15 started. `npx tsc --noEmit` passes clean.

---

## Task 142 — Turn alert badges on async game cards
**Completed:** 2026-05-29
**Files modified:**
- `src/screens/HomeScreen.tsx` — `sortAsyncGamesByAlertPriority`; `AsyncGameCard` badges (YOUR TURN, IN PROGRESS, Waiting..., VICTORY/DEFEAT/FINISHED); left accent for actionable cards; tappable only for `your_turn`/`in_progress`; victory heuristic via non-eliminated human player match
**Notes:** Phase 14 complete. `npx tsc --noEmit` passes clean.

---

## Task 141 — Async games list in HomeScreen from API
**Completed:** 2026-05-29
**Files modified:**
- `src/store/gameStore.ts` — `GameRecord.asyncGameId?`; `loadAsyncGame(detail)` parses `stateJson` or mid-turn `partialStateJson`, builds minimal `GameConfig`, restores `queuedOrders`, upserts into `games[]`, sets `activeGameId`
- `src/screens/HomeScreen.tsx` — `asyncGames`/`asyncGamesLoading` state; `listGames()` in `useFocusEffect` (first-load spinner only); "Async Multiplayer" section above pass-and-play; `AsyncGameCard` with waiting/finished/active states; tap → `getGame` + `loadAsyncGame` + navigate; invite accept with `gameStarted` refreshes list; local games filtered by `asyncGameId == null`
**Notes:** Pull-to-refresh deferred (not in task requirements). `npx tsc --noEmit` passes clean.

---

## Task 140 — Game invites section on HomeScreen
**Completed:** 2026-05-29
**Files modified:**
- `src/screens/HomeScreen.tsx` — `invites`/`inviteLoadingId` state; `listInvites()` in `useFocusEffect` (silent errors); "Game Invites (N)" section above games list with accept/decline rows; `ActivityIndicator` while action in-flight; `Alert` on failure; `// TODO Task 141` stub when `gameStarted`
**Notes:** Section hidden when `invites.length === 0`. `npx tsc --noEmit` passes clean.

---

## Task 139 — Friend picker for human slots in async game creation
**Completed:** 2026-05-29
**Files modified:**
- `src/store/gameStore.ts` — `PlayerSlot` gains optional `userId?: number` for async human invite targets
- `src/screens/HomeScreen.tsx` — async non-slot-0 human slots show tappable friend picker row + modal; `getFriends()` loaded when `playMode === 'asyncMultiplayer'`; select sets `name`/`userId`, clear resets; empty state links to Friends; pass-and-play and slot 0 keep TextInput
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 138 — Username default in game setup
**Completed:** 2026-05-29
**Files modified:**
- `src/screens/HomeScreen.tsx` — imports `useAuthStore`; `createDefaultPlayerSlots(slot0Name)` replaces hardcoded `DEFAULT_PLAYER_SLOTS`; slot 0 initializes with `currentUser?.username ?? 'Commander'`; TextInput remains controlled and editable
**Notes:** Applies to both pass-and-play and async multiplayer modes. `handleLaunch` fallback `'Commander'` unchanged for empty trimmed names. `npx tsc --noEmit` passes clean.

---

## Task 137 — Games service layer
**Completed:** 2026-05-29
**Files created:**
- `src/services/gamesService.ts` — exports `ApiGame`, `ApiGamePlayer`, `ApiGameDetail`, `CreateGamePayload`, `InProgressTurnPayload`, `SubmitTurnPayload`, `ApiInvite`; nine API functions (`listGames`, `getGame`, `createGame`, `deleteGame`, `saveTurnProgress`, `submitTurn`, `listInvites`, `acceptInvite`, `declineInvite`); private snake_case response interfaces + mapper functions; all calls via `apiClient`
**Notes:** `saveTurnProgress` sends `partial_state_json` over the wire; `submitTurn` sends `resulting_state`, `turn_number`, `round_number`. `npx tsc --noEmit` passes clean.

---

## AI Brain Overhaul — Fog-of-war memory, three difficulty tiers, economy decisions
**Completed:** 2026-05-29
**Files modified:**
- `src/game/types.ts` — added `AiPlanetMemory`, `AiPlayerState` interfaces; added `aiStates?: Record<string, AiPlayerState>` to `GameState`
- `src/game/turnEngine.ts` — added `BUILD` and `SET_PRODUCTION_SLIDER` to `PlayerAction`; added `processBuild` and `processSetProductionSlider` handlers in `resolveTurn`; calls `updateAiObservation` at end of each AI turn to persist fog-of-war memory; imports `FACTORY_GOLD_COST`/`RESEARCH_LAB_GOLD_COST` from `productionEngine`
- `src/game/aiEngine.ts` — full rewrite: `AiDifficulty` expanded to `'easy' | 'normal' | 'hard'`; `updateAiObservation` (exported, called by `turnEngine`); fog-of-war memory with staleness-aware enemy garrison estimates; `computeAiTurn` dispatches to `computeEasyTurn` (original 3-priority heuristic, full state access) or `computeNormalOrHardTurn` (memory-based, multi-fleet, economy decisions); building strategy (A-C factories, D-G mixed, H-P labs); production slider management (interior=gold, frontier=balanced/troops, gold emergency); strategic phases (expand/build/strike/defend); scout probes (Hard only); up to 3 fleets (Normal) or 5 fleets (Hard) per turn
- `src/store/gameStore.ts` — imports `updateAiObservation`, `AiPlayerState`; `startNewGame` initialises `aiStates` for each AI player by calling `updateAiObservation` on the initial state so first-turn memory includes home area
- `src/screens/HomeScreen.tsx` — difficulty chip array expanded from `['easy', 'normal']` to `['easy', 'normal', 'hard']`; Hard label added
**Notes:** All AI memory lives in `GameState.aiStates` so it serialises with `state_json` when the backend is built. `npx tsc --noEmit` passes clean.

---

## Bug fix — Map connectivity guarantee at base fleet range (11 clicks)
**Completed:** 2026-05-29
**Files modified:**
- `src/game/mapGenerator.ts` — `ensureConnectivity(positions)` after shape placement/normalization, before planet object construction; Union-Find at 11-click edge distance; bridge planets along shortest inter-component gap when multiple components exist.
**Notes:** Fixes seeds that produced disconnected galaxy clusters with gaps larger than `BASE_FLEET_RANGE_CLICKS`. Bridge planets use the same RNG-driven name/class as other planets. `MIN_PLANET_DISTANCE` and placement functions unchanged. `spawnPlacer` unaffected. `npx tsc --noEmit` passes clean.

---

## Bug fix — Deferred farewell for last-player-in-round knockout
**Completed:** 2026-05-29
**Files modified:**
- `src/store/gameStore.ts` — `pendingFarewellPlayerIds`; `findFarewellInPath`; `endTurn` defers knockout farewell when the eliminated player triggered the round wrap; `acknowledgeKnockout` shows deferred farewells at the next natural turn slot.
- `src/screens/GameScreen.tsx` — victory modal copy: "last commander standing" → "last player standing".
**Notes:** Fixes pass-and-play showing the knockout modal immediately after the last player ends their turn (before others play in the new round). `npx tsc --noEmit` passes clean.

---

## Task 127 — Zone-based starting planet placement (human vs AI)
**Completed:** 2026-05-29
**Files modified:**
- `src/game/types.ts` — exported `MapSize` (`'small' | 'medium' | 'large'`)
- `src/game/spawnPlacer.ts` — replaced 200-candidate scored-random search with zone-based placement (4 edge bands + 4 interior quadrants); `PlaceSpawnsOptions` API; human min-separation 30/40/50 by map size with 50-attempt retry; removed scoring helpers
- `src/store/gameStore.ts` — `mapSize: MapSize` on `GameConfig`; `startNewGame` derives `humanPlayerIds`/`aiPlayerIds` from slots and passes options to `placeSpawns`
- `src/screens/HomeScreen.tsx` — imports `MapSize` from types; passes `mapSize` to `startNewGame`
- `docs/systems/spawn-placement.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/development/decisions.md`

**Notes:** Humans spawn from edge zones near map sides (not corners); AIs can land anywhere including centre. `SpawnPlacementResult` shape unchanged. `npx tsc --noEmit` passes clean.

----

## Task 126 — Home planet conquest elimination mechanics
**Completed:** 2026-05-29
**Files modified:**
- `src/game/combatEngine.ts` — `ResolveArrivalResult` return type; on home-planet conquest sets `isEliminated`, forfeits other owned planets to neutral (0 troops, buildings intact), removes defender's in-transit fleets; optional `fleets` param threaded from `turnEngine`.
- `src/game/turnEngine.ts` — passes `fleets` to `resolveArrival`; applies optional `players`/`fleets` updates; exports `advanceToNextNonEliminatedPlayer`; skips re-checking already-eliminated players; `runAiTurnsUntilHuman` skips eliminated AI.
- `src/store/gameStore.ts` — `eliminatedPlayerPendingKnockout`, `acknowledgeKnockout()`; pass-and-play knockout turn after `endTurn`; victory via existing `status: 'finished'` / `winnerId`.
- `src/screens/GameScreen.tsx` — knockout banner on Battle Report modal; victory / game-over modals with Return to Home; End Turn hidden during knockout.
**Notes:** Uses existing `Player.isEliminated` (not a separate `eliminated` field). `npx tsc --noEmit` passes clean.

---

## Task 125 — Home planet conquest battle report UI (blue highlight + "took their home planet" message)
**Completed:** 2026-05-29
**Files modified:**
- `src/game/types.ts` — optional `isHomePlanetConquest?: boolean` on combat `TurnEvent` variant.
- `src/game/combatEngine.ts` — `resolveArrival` sets `isHomePlanetConquest: true` when attacker wins and conquered planet equals defender's `homePlanetId`.
- `src/screens/GameScreen.tsx` — Battle Report modal sorts home-conquest cards first; winning human attacker sees blue banner **"You took their home planet!"** and blue-tinted card (`#e8eeff` background, `#2255cc` left border) instead of victory green.
**Notes:** Display-only; elimination mechanics deferred to Task 126. `npx tsc --noEmit` passes clean.

---

## Task 124 — Research points carry over after level-up (no reset)
**Completed:** 2026-05-29
**Files modified:**
- `src/game/productionEngine.ts` — removed `researchPoints -= researchThreshold(techLevel)` from the level-up `while` loop in `runProduction`; cumulative threshold comparison only increments `techLevel`.
**Notes:** `RESEARCH_THRESHOLDS` is cumulative; points accumulate forever. R&D modal projection in `GameScreen` already correct (`threshold - totalPoints`). `npx tsc --noEmit` passes clean.

---

## Task 123 — Turn report research message uses "You" instead of player name
**Completed:** 2026-05-29
**Files modified:**
- `src/screens/GameScreen.tsx` — `formatTurnEvent` `research_levelup` case gates on `localHumanPlayerId` + `players` to render `"You reached Tech Level N"` for the local human and keep the player name for others (same pattern as combat reports).
**Notes:** Display-only; no engine or store changes. `npx tsc --noEmit` passes clean.

---

## Task 121 — Diagnose and fix map generator boundary-fill at large planet counts
**Completed:** 2026-05-29
**What was done:**
- Part A: Changed `gridSide` multiplier in `computeMapDimensions` from ×30 to ×90, reducing planet packing fraction from ~42% to ~14% so the organic growth model has room for natural voids.
- Part B: `growthPosition` now operates on a virtual canvas 2× width by 2× height; the first planet seeds at the virtual centre; after all planets are placed, a bounding-box normalization pass rescales positions into the configured grid with `PLANET_EDGE_PADDING`. Hard boundary walls no longer force the cluster to fill a rectangle.
**Files modified:**
- `src/screens/HomeScreen.tsx`, `src/game/mapGenerator.ts`

---

## Task 122 — Galaxy shape templates
**Completed:** 2026-05-29
**What was done:**
- `GalaxyShape` type (`'scattered' | 'arms' | 'dense_core' | 'ring'`) added to `src/game/types.ts`.
- `MapConfig.galaxyShape?` optional field added; `generateMap` picks a shape via seeded RNG when none is provided.
- Four placement functions implemented in `mapGenerator.ts`: `placePlanetsScattered` (organic parent-linked growth), `placePlanetsArms` (2–4 arms with Gaussian lateral spread), `placePlanetsDenseCore` (inverse-square-root radial density), `placePlanetsRing` (annular band, inner radius 40%, width 45% of max radius). All share `isFarEnough` minimum-spacing enforcement and the bounding-box normalization pass.
**Files modified:**
- `src/game/types.ts`, `src/game/mapGenerator.ts`

---

## Task 119 — Map size selection with player-count-driven planet count
**Completed:** 2026-05-29
**Files modified:**
- `src/screens/HomeScreen.tsx` — replaced hardcoded `MAP_PRESETS` with `MAP_SIZE_CONFIG`, `computeMapDimensions(mapSize, playerCount)`, and `MAP_SIZE_LABELS`; `handleLaunch` passes computed `mapWidth`/`mapHeight`/`planetCount`; map size buttons show label only (no dimension subtitle).
**Notes:** `GameConfig` already carried `mapWidth`, `mapHeight`, `planetCount`; `gameStore.startNewGame` forwards them to `generateMap` unchanged. `npx tsc --noEmit` passes clean.

---

## Task 120 — Replace research threshold formula with exact lookup table
**Completed:** 2026-05-29
**Files modified:**
- `src/game/productionEngine.ts` — added exported `RESEARCH_THRESHOLDS` readonly array [10, 23, 38, 58, 82, 113, 151, 198, 258, 333, 426, 542, 688, 869, 1097]; `researchThreshold(level)` now returns `RESEARCH_THRESHOLDS[level] ?? Infinity` instead of `Math.round(10 * Math.pow(1.5, level))`; level-up loop in `runProduction` unchanged.
**Notes:** `npx tsc --noEmit` passes clean. R&D modal continues to use exported `researchThreshold`.

---

## Task 117 — Probabilistic coin-flip combat resolution
**Completed:** 2026-05-29
**Files modified:**
- `src/game/combatEngine.ts` — removed `DEFENSE_BONUS`, `ATTACKER_TECH_MULTIPLIER`, `DEFENDER_TECH_MULTIPLIER` exports; added `rng: () => number` as first parameter to `resolveArrival`; looks up attacker and defender `techLevel` from `players` array (defaults to `0`); replaced deterministic strength-comparison block with iterative coin-flip loop using `pAttackerWins = (7 + Math.max(0, techDiff)) / (14 + Math.abs(techDiff))`; loop removes 1 troop per flip until one side reaches 0; all `TurnEvent` combat fields unchanged.
- `src/game/turnEngine.ts` — imported `mulberry32` from `./mapGenerator`; added `combatRngCounter` local variable in `resolveTurn`; each `resolveArrival` call gets a fresh `mulberry32(state.seed + state.roundNumber * 10000 + combatRngCounter * 100)` RNG instance; counter shared across both arrival loops (eligibleArrivals and justArrived).
**Notes:** `npx tsc --noEmit` passes clean. Three old constants confirmed absent from entire `src/` tree.

---

## Task 116 — Bug fix: `build_complete` report notification fires one round too late
**Completed:** 2026-05-29
**Files modified:** `src/game/productionEngine.ts` — `build_complete` emission when `builtOnRound === currentRound` (was `currentRound - 1`).
**Notes:** `countActiveBuildings` (`builtOnRound < currentRound`) unchanged. `npx tsc --noEmit` passes clean.

---

## Task 115 — Bug fix: per-player turn report for ⋮ Report modal in pass-and-play
**Completed:** 2026-05-29
**Files modified:**
- `src/store/gameStore.ts` — added `playerTurnReportByPlayerId`; populated in `endTurn` (clears outgoing player, routes combat/fleet_arrived/research_levelup/build_complete to involved humans); initialised in `startNewGame`, `loadGame`, `resetGame`.
- `src/screens/GameScreen.tsx` — Research/Troop Landings/Built sections filter `playerTurnReport` from per-player archive; Battles unchanged; global `turnReport` retained for `BattleReportCard` and simultaneous-neutral-landing detection.
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 113 — Battle report card: attacker on left, defender on right, "attacked" centre text
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `getBattleReportSides` / `isSimultaneousNeutralLanding` helpers; `BattleReportCard` troop row uses attacker-left / defender-right from combat `attackerName`/`defenderName`; centre divider **attacked**; simultaneous neutral landing flips defender-viewer to left when same-planet `fleet_arrived` ship count equals `defenderShipsBefore`; **You**/name labels per side; W/L badge and remaining footer unchanged; `turnEvents={turnReport}` on modal and planet-tap cards.
**Notes:** Display-only; no engine or type changes. `npx tsc --noEmit` passes clean.

---

## Task 112 — Bug fix: second player sees no battle card on planet tap and no battles in turn report
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — planet-tap battle card via `humanCombatByPlanetName`; Report modal **Battles** section uses `humanCombatEvents`.
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 111 — Bug fix: battle UI shown to both human players in pass-and-play
**Completed:** 2026-05-28
**Files modified:**
- `src/store/gameStore.ts` — added `battleAckPlayerId: string | null` (defers lock screen when outgoing player has battles; set to their id in `endTurn` when `hasBattlesForOutgoingPlayer && showLock`, null otherwise); added `acknowledgeBattleReport()` action (clears `battleAckPlayerId`, then sets `showingLockScreen: true`); reset to null in `startNewGame`, `loadGame`, `resetGame`.
- `src/screens/GameScreen.tsx` — reads `battleAckPlayerId` + `acknowledgeBattleReport` from store; adds `battlePreAckedPlayerIdRef` (tracks which player last pre-acked to prevent double-show in 1-human loops); adds `effectiveHumanPlayer` useMemo (resolves to player with `battleAckPlayerId` when set, else `humanPlayer`); `humanCombatEvents` uses `effectiveHumanPlayer.name`; Effect 1 and Effect 2 guard `setShowBattleReportModal(true)` with `effectiveHumanPlayer?.id !== battlePreAckedPlayerIdRef.current`; battle modal Close `onPress` + `onRequestClose` both set `battlePreAckedPlayerIdRef.current` and call `acknowledgeBattleReport()` when `battleAckPlayerId !== null`; `BattleReportCard` in the modal uses `effectiveHumanPlayer?.id ?? localHumanPlayerId` for correct W/L perspective.
**Notes (revised implementation):** Initial fix deferred the lock screen until the outgoing player closed their battle modal, but that was wrong timing — the outgoing player should NOT see battle results until the start of their next turn. Final fix uses a `playerBattleArchiveByPlayerId` record: `endTurn` clears the outgoing player's entry and re-populates archives for all human players involved in combat; the lock screen shows immediately as before; `humanCombatEvents` sources from the archive so each player sees their battles at their own turn start (Effect 2, lock-screen dismiss) and 🔥 markers persist until their own next `endTurn`. `npx tsc --noEmit` passes clean.

---

## Task 110 — Restructure turn report into ordered categories
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — Report modal replaces flat `turnReport.map` with sectioned layout (Battles → Research → Troop Landings → Built); four filtered arrays via `useMemo`; empty sections omitted; `reportSectionHeader` / `reportSectionDivider` styles; `formatTurnEvent` strings unchanged.
**Notes:** Display-only; no store, engine, or type changes. Empty state "Nothing to report this turn." unchanged when all sections empty. `npx tsc --noEmit` passes clean.

---

## Task 109 — Battle results modal at turn start
**Completed:** 2026-05-28
**Files modified:** `src/game/types.ts` — combat `TurnEvent` adds `attackerShipsBefore`, `defenderShipsBefore`, `remainingShips`; `src/game/combatEngine.ts` — populates new fields in both attacker-wins and defender-holds branches; `src/screens/GameScreen.tsx` — `showBattleReportModal` state, `turnReport`/`showingLockScreen` effects (pass-and-play defer until lock dismiss), **Battle Report** modal with per-combat cards (planet, opponent, troop counts, outcome, remaining), Close-only dismiss.
**Notes:** Auto-opens when human turn begins and last cycle included combat; existing ⋮ Report modal unchanged. Human perspective derived via `localHumanPlayerId` + player name match on combat event names. `npx tsc --noEmit` passes clean.

---

## Task 108 — Scale planet hit/select radius with zoom level
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `findPlanetAtMapCoords` now accepts `scale` and compares distance against `PLANET_HIT_RADIUS / scale` (constant screen-space radius); all call sites pass current gesture scale (planet tap, fleet drag-start, fleet drag-drop, measure drag-start).
**Notes:** Fixes oversized hit zones when zoomed in and undersized targets when zoomed out. `PLANET_HIT_RADIUS` constant unchanged. `npx tsc --noEmit` passes clean.

---

## Bug fix — Queued modal: group build orders by planet + type
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — added `BuildDisplayGroup` and `buildDisplayGroups` useMemo grouping `buildDisplayEntries` by `${planetId}:${buildingType}`; `queuedModalItems` emits one build row per group; modal label `🏭 Planet — 2× Factory` when count > 1 else `🏭 Planet — Factory`; group ✕ cancels all indices via `cancelBuildOrder` in descending order; `queuedOrderCount` badge still sums individual buildings; fleet rows unchanged.
**Notes:** Fixes duplicate identical rows when multiple same-type buildings are queued on one planet. No store/engine/type changes. `npx tsc --noEmit` passes clean.

---

## Bug fix — Fleet dispatch modal cancel at 0 ships
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `modalMaxShips` minimum 0; decrement stepper floor 0 and disabled at `shipCount <= 0`; `handleConfirmFleet` at `shipCount === 0` calls `cancelQueuedOrder` when editing an existing queued order or closes without queuing on a new dispatch; primary button label **Cancel Order** at 0; clears `pendingFleet`, `editingOrderIndex`, `dragOriginPlanetId`.
**Notes:** Players can cancel a queued fleet route from the Send/Edit Fleet modal without opening the Queued modal separately. No store/engine/type changes. `npx tsc --noEmit` passes clean.

---

## Bug fix — Instant snap to home planet (no animation)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `animateMapToSnap` worklet assigns `scale`, `translateX`, `translateY`, and matching `saved*` shared values directly instead of 350 ms `withTiming`; removed `HOME_PLANET_SNAP_DURATION_MS` and unused `withTiming` import; snap logic (`snapToHomePlanet`, clamp, triggers) unchanged.
**Notes:** Fixes visible map scroll on initial load and pass-and-play lock-screen dismiss. `npx tsc --noEmit` passes clean.

---

## Bug fix — Enemy planet colour reveals home planet (fog of war)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `getPlanetColor` final fallback changed from enemy-specific tint to `NEUTRAL_COLOR` for all non-owned planets (neutral and enemy); human-owned home (`HOME_PLANET_COLOR`) and other owned (`#2e8a50`) unchanged; `getPlayerColor` retained for `FleetLayer` in-transit and queued fleet markers only.
**Notes:** At game start only home planets are owned; distinct enemy player colours on planet nodes immediately revealed every enemy home. Fleet dots/lines still show owner colour. `npx tsc --noEmit` passes clean.

---

## Task 107 — Retheme colour palette for off-white background
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx`, `src/screens/HomeScreen.tsx` — replaced dark-navy `COLORS` with warm light-mode palette (`background` `#f5f0eb`, dark navy text, indigo accent, warm panel/border); updated map planet/fleet constants (`HUMAN_COLOR`, `NEUTRAL_COLOR`, `AI_COLORS`, owned green `#2e8a50`, neutral `#9090a8`); hardcoded map label and overlay colours aligned to `COLORS.text` / `COLORS.textMuted`; selection pulse border uses accent tint; game-over overlay uses `COLORS.panel`; `BG_COLOR` unchanged.
**Notes:** Display-only theme change across both screens. `npx tsc --noEmit` passes clean.

---

## Task 106 — Fleet dispatch modal: center the ship count input
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `stepperControls` StyleSheet entry now includes `justifyContent: 'center'` and `width: '100%'` so the − / ship count / + stepper row is horizontally centred in the Send Fleet / Edit Fleet modal; route label, distance/ETA, and modal actions unchanged.
**Notes:** Display-only layout change. `npx tsc --noEmit` passes clean.

---

## Task 105 — Fleet dispatch modal: use planet names only (no internal IDs)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — Send Fleet / Edit Fleet confirm modal route line now shows `{pendingOriginPlanet.name} → {pendingDestPlanet.name}` instead of `formatPlanetId` (which exposed numeric indices like "Planet 15 → Planet 0").
**Notes:** Display-only change; no store or engine updates. Audited modal — distance/ETA, ship stepper, and actions had no planet ID leaks. `npx tsc --noEmit` passes clean.

---

## Task 104 — Report modal: turn summary of all events this turn
**Completed:** 2026-05-28
**Files modified:** `src/game/types.ts` — `TurnEvent` union (`fleet_arrived`, `combat`, `research_levelup`, `build_complete`). `src/game/combatEngine.ts` — optional `events` + `players` on `resolveArrival`; pushes arrival/combat events with player/planet names and troop losses. `src/game/productionEngine.ts` — optional `events` on `runProduction`; pushes research level-ups and buildings where `builtOnRound === currentRound - 1`. `src/game/turnEngine.ts` — `ResolveTurnResult` with `events[]`; passes events through arrival/production calls. `src/store/gameStore.ts` — `turnReport: TurnEvent[]`; `endTurn` aggregates events across human + AI turns. `src/screens/GameScreen.tsx` — Report modal (scrollable list, empty state); removed placeholder Alert.
**Notes:** Report covers the full End Turn resolution cycle (human + intervening AI turns). Resets on each new End Turn. `npx tsc --noEmit` passes clean.

---

## Task 103 — Header dropdown: consolidate Queued, R&D, and Report into top-right menu
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — added `showHeaderMenu` and `showReportModal` state; top-right **⋮** circular trigger (respects safe-area insets) toggles dropdown panel with Queued (accent count badge via `queuedOrderCount`), R&D, and Report rows; backdrop tap or item tap closes menu; Queued/R&D open existing modals; Report sets `showReportModal` and shows placeholder Alert; removed standalone **Queued (N)** and **R&D** pill buttons and unused `researchButton` styles; dropdown z-index 50 above map content.
**Notes:** Menu visible during active human turn only (same gating as former pills). Report modal UI deferred to Task 104. `npx tsc --noEmit` passes clean.

---

## Task 102 — Queued modal: include builds queued this turn
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — Queued Orders modal renders fleet rows (unchanged) plus build rows (planet name, Factory/Research Lab label, 🏭/🔬 prefix, ✕ cancel via `cancelBuildOrder`); **Queued (N)** badge counts fleet + build orders; `buildDisplayEntries` derived from human-owned planets with `builtOnRound === currentRound`; `queuedModalItems` interleaves `BUILD` entries from `queuedOrders` when present; fleet-only filters on pending-departure viz, `queuedShipsPerPlanet`, and snap-back edit logic.
**Notes:** Builds are applied directly to planet state today (not appended to `queuedOrders` in store); modal derives under-construction buildings from map state. Cancel removes building, refunds gold, and entry disappears. `npx tsc --noEmit` passes clean.

---

## Task 101 — Fix zoom-edge map shift: add map viewport padding
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — added `MAP_VIEWPORT_PADDING` (150); `clampTranslation` now clamps translate X/Y to `[-(mapDim×scale−viewport)−padding, padding]` with `Math.min(..., padding)` on min when map is smaller than viewport; pinch `onEnd`, pan `onEnd`, and `snapToHomePlanet` all use the shared helper.
**Notes:** Prevents map jump when releasing pinch near edges by never allowing the map boundary flush with the viewport. Small maps at low zoom collapse to a single valid translate (padding, padding). Gesture logic and zoom levels unchanged. `npx tsc --noEmit` passes clean.

---

## Task 100 — Background colour: soft off-white
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — added `BG_COLOR` (`#f5f0eb`); applied to `root`, `mapArea`, and pass-and-play `lockScreen`; darkened map-canvas labels (`planetNameLabel`, `planetNameLabelFogged`, `shipCountLabel`) and lock-screen text for legibility on off-white. `src/screens/HomeScreen.tsx` — local `BG_COLOR` on `safeArea`; header title/subtitle and empty-state message use dark text colours.
**Notes:** Modal backgrounds, pill buttons, planet node fills, and status bar panel unchanged. `npx tsc --noEmit` passes clean.

---

## Task 99 — Home planet colour: light brown tint
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — added `HOME_PLANET_COLOR` (`#c8a26b`); `getPlanetColor` checks `planet.id === homePlanetId` before owned green when `planet.owner === localHumanPlayerId`; map render passes `humanPlayer.homePlanetId`.
**Notes:** Circle fill only; labels unchanged. Captured planets stay green. Pass-and-play: active human sees their home brown via `getLocalHumanPlayerId`. `npx tsc --noEmit` passes clean.

---

## Task 98 — Snap to home planet at turn start
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — added `HOME_PLANET_SNAP_SCALE` (2.0) and `snapToHomePlanet` helper (centres home planet grid position, clamps via `clampTranslation`); `animateMapToSnap` applies 350 ms `withTiming` to scale/translate and `saved*` shared values; initial-load effect (once per `activeGameId` after viewport layout) and lock-screen dismiss effect (`showingLockScreen` true→false) call snap for local human player's `homePlanetId`; map-dimension effect no longer resets transform to default on load.
**Notes:** Prevents pass-and-play positional leakage from previous player's pan/zoom. Edge planets stay within clamp bounds. No store changes required. `npx tsc --noEmit` passes clean.

---

## Task 97 — Re-open and edit queued fleet order by dragging back to origin planet
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — added `updateQueuedOrder(index, shipCount)` to replace ship count on an existing queued order in place. `src/screens/GameScreen.tsx` — snap-back drag (release on same origin) opens edit flow; single queued route opens ship-count modal pre-populated; multiple routes opens queued-orders list; `editingOrderIndex` state; `shipsAlreadyQueued` excludes order being edited; confirm calls `updateQueuedOrder`; cancel clears edit state; modal title "Edit Fleet" when editing.
**Notes:** Same-turn only; in-transit fleets unaffected. `npx tsc --noEmit` passes clean.

---

## Task 96 — Move owned-planet name label up so it doesn't overlap the planet node
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `PLANET_NAME_LABEL_TOP` numerator `-11` → `-18` (`Math.round((-18/18)*CELL_SIZE)`); 7px higher at `CELL_SIZE` 18 for all planet name labels.
**Notes:** Label `top` is relative to the touch target; previous offset placed label bottom too close to the 14px planet circle. Universal offset improves owned and non-owned consistency. `npx tsc --noEmit` passes clean.

---

## Task 95 — Fix troop send cap: can't send more than 1 troop even when planet has 2+
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `modalMaxShips` calculation removed stale `- 1` garrison reserve; max is now `Math.max(1, pendingOriginPlanet.shipCount - shipsAlreadyQueued)`.
**Notes:** Leftover UI constraint after Task 76 allowed sending all ships in the engine but capped the dispatch modal at 1 when garrison was 2. `npx tsc --noEmit` passes clean.

---

## Task 93 — Simplify planet growth distance to uniform [4, 11] clicks
**Completed:** 2026-05-28
**Files modified:** `src/game/mapGenerator.ts` — in `growthPosition`, parent offset distance changed from `4 + (rng() + rng()) * 4.5` (triangular, peak ~8–9) to `4 + rng() * 7` (uniform [4, 11] clicks).
**Notes:** No other map-generator changes. `npx tsc --noEmit` passes clean.

---

## Task 92 — Replace Gaussian planet placement with organic growth model
**Completed:** 2026-05-28
**Files modified:** `src/game/mapGenerator.ts` — removed `gaussianPosition` and `connectivityCeiling`; added `growthPosition` (first planet random in padded bounds; later planets attach to random parent at triangular distance `4 + (rng()+rng())*4.5` and uniform angle); placement loop uses `growthPosition` + `isFarEnough` only (Phase A/B removed).
**Notes:** Produces varied irregular galaxy shapes (chains, arms, bridges) per seed instead of symmetric central blobs. `MIN_PLANET_DISTANCE=4`, `MAX_PLACEMENT_ATTEMPTS_PER_PLANET=2000`, `paddedBounds`, `randomPosition`, `nearestDistance`, and `isFarEnough` unchanged. `spawnPlacer` unaffected. `npx tsc --noEmit` passes clean.

---

## Task 91 — Fix planet placement failure: increase map preset sizes
**Completed:** 2026-05-28
**Files modified:** `src/screens/HomeScreen.tsx` — map presets `24×24/16`, `40×40/32`, `52×52/54` (planet counts unchanged); `src/game/mapGenerator.ts` — `MAX_PLACEMENT_ATTEMPTS_PER_PLANET` 1000→2000; Phase A connectivity ceiling `Math.round(width * 0.55)` instead of hard-coded 11.
**Notes:** Fixes placement failures after Task 90's `MIN_PLANET_DISTANCE=4` on undersized grids; presets remain smaller than pre-Task-84 originals. `npx tsc --noEmit` passes clean.

---

## Task 90 — Fix planet spacing: minimum 4 clicks, prefer 6–10 click neighbours
**Completed:** 2026-05-28
**Files modified:** `src/game/mapGenerator.ts` — `MIN_PLANET_DISTANCE` 2→4; `gaussianPosition` σ `width * 0.28` → `width * 0.38`; `nearestDistance` helper; two-phase placement loop (attempts 0–699 require nearest placed planet ≤ 11 clicks when group non-empty; attempts 700–999 min-distance only).
**Notes:** Hard minimum 4-click separation; Phase A biases toward connected 6–10 click neighbour spacing via Gaussian spread + connectivity ceiling; Phase B fallback preserves placement success. `spawnPlacer` and rendering untouched. `npx tsc --noEmit` passes clean.

---

## Task 89 — Replace multi-cluster planet placement with single organic blob
**Completed:** 2026-05-28
**Files modified:** `src/game/mapGenerator.ts` — removed `PlanetCluster`, `createPlanetClusters`, and `clusterPosition`; added `gaussianPosition` (centre `(width/2, height/2)`, σ = `width * 0.28`, sum-of-3-uniforms normal approximation); out-of-bounds candidates return `null` and the placement loop `continue`s; `MIN_PLANET_DISTANCE` / `isFarEnough` / 1000-attempt retry unchanged; `randomPosition` and `paddedBounds` retained.
**Notes:** Replaces Task 86 multi-cluster layout with one organic density falloff from map centre (no rectangular footprint, no edge clamp bunching). `spawnPlacer` and rendering constants untouched. `npx tsc --noEmit` passes clean.

---

## Task 88 — Restore visual proportions by reverting CELL_SIZE to 18
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `CELL_SIZE` 6→18 only; all derived constants (`PLANET_SIZE`, `PLANET_HIT_RADIUS`, label fonts, fleet/pending SVG markers, `DEFAULT_MAP_SCALE` ~0.6) resolve via existing `(value/18)*CELL_SIZE` formulas from Task 85.
**Notes:** Reverts Task 85 visual shrink while keeping Task 84 halved grid coordinates. Map canvas 360×360 px at scale 1 for Small (20×20); labels readable; pinch zoom meaningful. No engine or preset changes. `npx tsc --noEmit` passes clean.

---

## Task 87 — Rebalance planet class weights (A–E only slightly more common than F–P)
**Completed:** 2026-05-28
**Files modified:** `src/game/mapGenerator.ts` — `PLANET_CLASS_WEIGHTS` restored to all 16 classes (A–P); A–E each weight `8/117`, F–P each weight `7/117`; `rollPlanetClass` cumulative draw logic unchanged; home planet spawn classes (A–G in `spawnPlacer`) unaffected.
**Notes:** Previous Task 52 weighting (A–E only) superseded. A–E now ~34% combined share vs F–P ~66%, giving a clear but not dominant lean toward the better tiers. `npx tsc --noEmit` passes clean.

---

## Task 86 — Randomise planet distribution (clustered layout)
**Completed:** 2026-05-28
**Files modified:** `src/game/mapGenerator.ts` — after seeding RNG, creates 2–5 `PlanetCluster` entries (centre via padded `randomPosition`, spread `width * (0.2 + rng() * 0.3)`); placement loop uses `clusterPosition` (uniform cluster pick, `[-1,1]` offset × spread, clamp + round to padded bounds) instead of uniform `randomPosition`; `MIN_PLANET_DISTANCE` / `isFarEnough` / 1000-attempt retry unchanged.
**Notes:** `spawnPlacer` and movement/rendering constants untouched. Maps remain deterministic from seed. `npx tsc --noEmit` passes clean.

---

## Task 85 — Reduce visual click-distance by half (CELL_SIZE)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `CELL_SIZE` 11→6; planet diameters, name-label width/top, `PLANET_HIT_RADIUS`, and pending-departure offset unchanged formulas (`(value/18)*CELL_SIZE` or `CELL_SIZE * N`); map label `fontSize`/`marginTop` now constants `PLANET_LABEL_FONT_SIZE`, `SHIP_COUNT_FONT_SIZE`, `SHIP_COUNT_LABEL_MARGIN_TOP`; fleet/pending SVG marker radius, text size, and offsets derived from same baseline; `DEFAULT_MAP_SCALE` 1.8 from `REFERENCE_VIEWPORT_WIDTH` 390 × 0.55 / (20 × `CELL_SIZE`); pinch clamp 0.4–4 unchanged.
**Notes:** Rendering-only; `screenToMapCoords`, pan clamp, and hit tests use updated map pixel dimensions via `CELL_SIZE`. Modals, status bar, HUD buttons, and distance pill untouched. `npx tsc --noEmit` passes clean.

---

## Task 84 — Reduce planet starting distance by half (map coordinate scale)
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/HomeScreen.tsx` — halved `MAP_PRESETS` grid dimensions while keeping planet counts: Small `20 × 20 · 16 worlds`, Medium `30 × 30 · 32 worlds`, Large `40 × 40 · 54 worlds`
- `src/game/mapGenerator.ts` — `MIN_PLANET_DISTANCE` 4→2; `PLANET_EDGE_PADDING` 3→2
- `docs/systems/map-generation.md` — updated min-distance, edge-padding, and preset table
- `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`
**Notes:** Visual rendering (`CELL_SIZE`, default scale, font sizes) unchanged per Task 85 scope split. Click-distance between planets at game start is halved because grid coordinates span half the previous range. `npx tsc --noEmit` passes clean.

---

## Task 82 — Fix planet label text sizes (too large after CELL_SIZE reduction)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — scaled map-canvas planet label typography by 11/18: `planetNameLabel` and `planetClassLabel` `fontSize` 7→4, `shipCountLabel` `fontSize` 9→6 and `marginTop` 2→1; `PLANET_NAME_LABEL_WIDTH` / `PLANET_NAME_LABEL_TOP` left as Task 79 `(value/18)*CELL_SIZE` constants; modals, status bar, HUD, and distance pill unchanged.
**Notes:** Fleet SVG overlay labels (`fontSize` 8) not planet-node labels — untouched. `npx tsc --noEmit` passes clean.

---

## Task 81 — Fix map pan during non-owned drag + draw measurement line
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `measureDrag` sets `isFleetDragging` via `runOnUI` when a non-owned origin is confirmed in `handleMeasureDragStart`; `measureDrag.onFinalize` clears flag and resets `panStartTranslateX/Y` like `fleetDrag`; `measureDragOriginPlanetId` + `dragFingerLocal` (absolute coords in `handleMeasureDragUpdate`) feed the existing `DragLine` overlay (same accent style; separate state avoids `dragOriginPlanetId` ownership effect clearing non-owned origins).
**Notes:** Fleet dispatch, distance pill, and owned-planet drag behaviour unchanged. `npx tsc --noEmit` passes clean.

---

## Task 80 — Show live click-distance label while dragging a fleet
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `dragDistanceLabel` state + bottom-center pill UI; owned-planet `handleFleetPanUpdate` updates label via `computeClickDistance` (finger map pixels → grid position); `measureDrag` `Gesture.Pan()` composed `Gesture.Simultaneous` with map gestures for non-owned planet measurement only (no `handleDragStart`, modal, or queue); `handleDragEnd` early path no longer calls full `cancelDrag` so measurement label survives non-owned drags.
**Notes:** `formatDragDistanceLabel` shows one decimal (`X.X clicks`). Fleet dispatch behaviour for owned planets unchanged. `npx tsc --noEmit` passes clean.

---

## Task 79 — Reduce visual planet spacing to ~60% of current
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `CELL_SIZE` 18→11; `PLANET_SIZE` / `PLANET_SIZE_SELECTED` / name-label width and top offset scaled from prior 18px baseline; `PLANET_HIT_RADIUS` stays `CELL_SIZE * 2.5`; pending-departure offset `CELL_SIZE`; default pinch scale 0.6→1.0 (min/max clamp 0.4–4 unchanged).
**Notes:** Rendering-only; `screenToMapCoords`, pan clamp, fleet SVG, and hit tests all use the same `CELL_SIZE` lever. `computeClickDistance`, `isInRange`, `effectiveRange`, and `movementEngine.ts` untouched. `npx tsc --noEmit` passes clean.

---

## Task 78 — Fix turn counter: show shared round number
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — HUD turn line now displays `roundNumber` directly (`Turn {roundNumber}`) instead of `(roundNumber - 1) * playerCount + playerIndex + 1`; removed unused `numberOfPlayers` / `currentPlayerIndex` / `humanTurn` locals.
**Notes:** Rendering-only fix; store and `turnEngine` unchanged (`roundNumber` already increments once per full player cycle). All players see the same Turn N during round N. `npx tsc --noEmit` passes clean.

---

## Task 77 — Simplify building placement (single-tap chip)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — removed `selectedBuildType` and two-step chip-then-slot flow; Factory/Research Lab chips call `queueBuildOrder` directly; empty slot tiles are non-interactive `View`s; filled slots still cancel/demolish. `src/store/gameStore.ts` verified unchanged (`queueBuildOrder(planetId, buildingType)` already appends to first available slot).
**Notes:** Build chips stay disabled when no slots remain; insufficient-gold feedback unchanged. `npx tsc --noEmit` passes clean.

---

## Task 76 — Remove garrison constraint (send all ships off planet)
**Completed:** 2026-05-28
**Files modified:** `src/game/turnEngine.ts` — `processSendFleet` now rejects only when `shipCount > origin.shipCount` (was `>=`, which forced leaving ≥1 ship). `gameStore.ts` and `movementEngine.ts` audited; no garrison guards present.
**Notes:** `combatEngine.resolveArrival` friendly branch adds fleet ships without clearing `owner` at 0 garrison — ownership unchanged. `npx tsc --noEmit` passes clean.

---

## Task 75 — Fix AI generating out-of-range fleet dispatches
**Completed:** 2026-05-28
**Files modified:** `src/game/aiEngine.ts` — `computeAiTurn` derives `rangeClicks` via `effectiveRange(player.techLevel)`; `nearestOwnedPlanet` accepts optional `rangeClicks` and skips out-of-range candidates; `tryReinforceHome`, `tryAttackWeakestEnemy`, and `tryExpandToNeutral` pass range through; expand loop guards with `isInRange` before transit scoring.
**Notes:** Transit-turn distance still used for nearest-source scoring among in-range planets only. Fixes intermittent `processSendFleet` throw when nearest-by-turns target exceeded click-range cap. `npx tsc --noEmit` passes clean.

---

## Task 74 — Fix fleet arrival delay (resolve at round wrap)
**Completed:** 2026-05-28
**Files modified:** `src/game/turnEngine.ts` — round-wrap block now sets `fleets = inTransit` and calls `resolveArrival` for each fleet in `justArrived` instead of re-merging arrived fleets into `fleets`. `src/game/movementEngine.ts` — `advanceFleets` comment updated to reflect immediate resolution by turn engine.
**Notes:** Turn-start eligible-arrival loop (lines 133–148) kept as safety net. Fixes fleet dot on destination for a full human turn before capture. `npx tsc --noEmit` passes clean.

---

## Task 73 — Disable map pan/scroll while dragging a fleet
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — replaced outer `Gesture.Simultaneous(composed, planetFleet)` with `Gesture.Exclusive(planetFleet, composed)` so planet tap / fleet drag take priority over map pan+pinch; empty-map pan and pinch unchanged when no planet gesture wins.
**Notes:** No `isFleetDragging` shared value (Exclusive composition sufficient). `npx tsc --noEmit` passes clean.

---

## Task 72 — Remove blue planet highlight (no planet should ever highlight blue)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `PlanetNode` selection pulse `borderColor` interpolation changed from white-to-`#4a9eff` to white opacity fade (`rgba(255,255,255,0.85)` → `rgba(255,255,255,0.15)`); drag-origin static border uses `rgba(255,255,255,0.6)` instead of `COLORS.accent`. `COLORS.accent` unchanged (buttons, chips, slider).
**Notes:** No other planet rendering logic changed. `npx tsc --noEmit` passes clean.

---

## Task 71 — Tapping an active (prior-turn) filled slot prompts confirmation before deletion (no gold refund)
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `demolishBuilding(planetId, buildingIndex)` removes building when `builtOnRound < currentRound`, no gold refund, ownership guard. `src/screens/GameScreen.tsx` — active filled slots tappable; `Alert.alert` confirmation before `demolishBuilding`; under-construction tap (`cancelBuildOrder`) unchanged.
**Notes:** Slot grid, production output label, and research modal lab count update immediately via store. `npx tsc --noEmit` passes clean.

---

## Task 70 — Tapping a just-built (this-turn) filled slot cancels the build and refunds gold
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `cancelBuildOrder(planetId, buildingIndex)` removes building when `builtOnRound === currentRound`, refunds factory/lab gold cost to current player, filters hypothetical `BUILD` entries from `queuedOrders`. `src/screens/GameScreen.tsx` — under-construction slots tappable; `handleBuildingSlotPress` calls `cancelBuildOrder` for same-round buildings; active slots remain disabled until Task 71.
**Notes:** No confirmation prompt; status bar gold updates immediately via store. `npx tsc --noEmit` passes clean.

---

## Task 69 — Show error message when player taps a build slot without enough gold
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `queueBuildOrder` returns `QueueBuildOrderResult` (`'ok' | 'insufficient_gold' | 'no_slots' | 'not_owner'`); slot and gold checks ordered so gold failure is reported when slots remain. `src/screens/GameScreen.tsx` — `buildError` local state; red **Not enough gold** label between build chips and slot grid on `insufficient_gold`; 2s auto-dismiss via `useEffect`; clears when planet modal closes (`selectedPlanetId` null).
**Notes:** Placement flow unchanged (select chip → tap empty slot). `no_slots` still handled by disabled chips. `npx tsc --noEmit` passes clean.

---

## Task 68 — Move queued orders out of the HUD into a dedicated "Queued" modal button
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — removed left-side `queueOverlay` list and status-bar queued-order count; added **Queued (N)** pill button (`bottom: insets.bottom + 128`, above R&D) matching R&D styling; fade `Modal` lists orders by planet name → planet name with ship count and ✕ calling `cancelQueuedOrder`; empty state **No orders queued**; closes on backdrop or ✕.
**Notes:** Button visible on every human turn (including zero queued). Map pending-departure markers and display-only troop deduction unchanged. `npx tsc --noEmit` passes clean.

---

## Task 67 — Fix conquered planet: immediately green and interactible on capture turn
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `endTurn` sets `selectedPlanetId: null` atomically with resolved game state; `src/screens/GameScreen.tsx` — `useEffect` clears `selectedPlanetId` and `dragOriginPlanetId` when referenced planet is missing or not owned by local human player. Verified `combatEngine.resolveArrival` assigns `owner` on neutral capture and combat victory (unchanged).

---

## Task 64 — Conquered planet full rendering and interactivity
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts` — `getLocalHumanPlayerId` for fog and ownership UI; `Gesture.Exclusive(fleetDrag, planetTap)` so tap wins over drag; fleet drag starts on first `onUpdate` after `minDistance(10)` (not `onStart`). Verified `combatEngine.resolveArrival` already sets `owner` on capture.

---

## Task 63 — Fix turn counter display in pass-and-play
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — HUD derives `humanTurn = (roundNumber - 1) * players.length + currentPlayerIndex + 1` at render time instead of showing `turnNumber`/`roundNumber` directly; `roundNumber` unchanged in engine.

---

## Task 62 — Shrink default map scale
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `useSharedValue` initial values for `scale` and `savedScale` changed from `1` to `0.6`
**Notes:** Visual-only default zoom; pinch clamp `[0.4, 4]` and map-dimension reset effect unchanged. `npx tsc --noEmit` passes clean.

---

## Task 61 — Fleet dispatch: tap-to-drag (no hold), tap-only opens modal; clean up HUD
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — removed `activateAfterLongPress(300)` from `fleetDrag` (plain `Gesture.Pan()`); `Gesture.Exclusive(planetTap, fleetDrag)` replaces simultaneous tap+drag; `handleMapTap` opens owned-planet modal (`selectPlanet(planet.id)`) and no-ops on non-owned; status bar sub-line shows `Gold · Tech Level` (removed `sumOwnedShips` / ship count)
- `docs/development/current-state.md` — recorded Task 61 in status, completed list, What Works, and changelog
- `docs/tasks/backlog.md` — marked Task 61 complete
**Notes:** Map pinch/pan composition unchanged (`Gesture.Simultaneous(composed, planetFleet)`). Ownership check on drag start unchanged. `npx tsc --noEmit` passes clean.

---

## Task 60 — Fix zoom/scroll viewport jump (screen teleports when zooming or panning)
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — pinch `onStart` now snapshots live `scale.value`/`translateX.value`/`translateY.value` into `pinchStartScale`/`pinchStartTranslateX/Y` (was incorrectly reading stale `savedTranslate*`); pinch `onUpdate` uses `pinchStartScale` as scale baseline; pan gained `onStart` with `panStartTranslateX/Y` baselines (was missing, causing pan to accumulate from last-committed translate); pan `onUpdate` uses pan-start baselines; both `onEnd` handlers commit without reset; `screenToMapCoords` restored center-compensation (`effectiveTx/Y = raw + mapDim*(scale-1)/2`) for planet tap/drag at all zoom levels
- `docs/development/current-state.md` — recorded Task 60 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 60 complete
**Notes:** Map-dimension reset in `useEffect` (scale/translate → 1/0 on new map size) unchanged — only runs when `gameState.map` dimensions change. Pan clamping (`clampTranslation`) unchanged from Task 40. `npx tsc --noEmit` passes clean.

---

## Task 59 — Remove double-tap-to-zoom gesture
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — removed `doubleTap` gesture (`Gesture.Tap().numberOfTaps(2)` with 1.5× spring zoom); `mapGesture` now composes pinch/pan (`composed`), `planetTap`, and `fleetDrag` only; removed unused `withSpring` import
- `docs/development/current-state.md` — recorded Task 59 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 59 complete
**Notes:** Pinch-to-zoom (0.4×–4×), pan clamping, single-tap planet selection, and long-press fleet drag are unchanged.

---

## Task 58 — Conquered planet rendering and build access identical to home planet
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — verified ownership-based rendering (`getPlanetColor`, `isOwned`, tap handler, owned-planet modal); troop count label now renders for every owned planet (including 0 garrison), not only when `shipCount > 0`
- `src/store/gameStore.ts` — `setProductionSlider` now rejects updates when `planet.owner !== currentPlayerId` (aligned with `queueBuildOrder`)
- `docs/development/current-state.md` — recorded Task 58 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 58 complete
**Notes:** Audit found no `isHomePlanet` usage in `GameScreen` (legacy `isHome` prop removed in earlier UI refactor). `combatEngine.resolveArrival` already assigns `planet.owner = fleet.ownerId` on neutral capture and successful combat; fog-of-war `buildVisibleState` returns full planet data for any `owner === viewingPlayerId`, so captured worlds pick up green fill and modal detail on the next render automatically.

---

## Task 57 — Fix turn/round semantics: round increments only after all players have acted
**Completed:** 2026-05-28
**Files modified:**
- `src/game/turnEngine.ts` — moved round-gated simulation ticks to turn-order wrap only; `advanceFleets` and `runProduction` now execute once per full player cycle, and `roundNumber` increments only on wrap; added maintainer comment clarifying turn vs round semantics
- `src/game/movementEngine.ts` — documented transit/arrival timing near `advanceFleets` (zero-turn fleets resolve later at turn start)
- `docs/systems/turn-engine.md` — updated turn-resolution order and round-wrap tick semantics
- `docs/systems/movement.md` — clarified once-per-round transit cadence and explicit ETA-2 example (round 1 dispatch arrives at start of round 3)
- `docs/systems/production.md` — corrected production cadence to once per round and aligned `currentRound` activation wording
- `docs/development/current-state.md` — recorded Task 57 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 57 complete
**Notes:** `src/store/gameStore.ts` already initialized `roundNumber: 1` and `endTurn` already routed updated game state through `resolveTurn`; no store changes were required.

---

## Task 56 — Closest planet minimum distance = 4 clicks
**Completed:** 2026-05-28
**Files modified:**
- `src/game/mapGenerator.ts` — replaced `MIN_DISTANCE_FLOOR` with fixed `MIN_PLANET_DISTANCE = 4`; simplified `minPlanetDistance` to return the constant for all maps; updated generate-path call site to use the new constant-driven function
- `src/screens/HomeScreen.tsx` — resized map presets to keep placement feasible with `PLANET_EDGE_PADDING = 3` and 4-click minimum spacing: Small `40 × 40 · 16 worlds`, Medium `60 × 60 · 32 worlds`, Large `80 × 80 · 54 worlds`
- `docs/systems/map-generation.md` — replaced old dynamic min-distance formula docs with fixed-constant rule and added updated preset capacity table/changelog note
- `docs/development/current-state.md` — recorded Task 56 in Completed and Changelog and updated overall status
- `docs/tasks/backlog.md` — marked Task 56 complete
**Notes:** Home-planet separation logic in `spawnPlacer.ts` already maximizes pairwise distance across 200 candidate assignments and required no code changes. Presets satisfy the density guard `planetCount <= ((width - 6) * (height - 6) / 12.57) * 0.5`.

---

## Task 55 — Production slider: show live gold and troop output at current position
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — imported `FACTORY_TROOP_OUTPUT` and `FACTORY_GOLD_OUTPUT`, computed active factory count (`builtOnRound < roundNumber`) for the selected planet, and added a live output label under the existing slider split label: `⚔ X.X troops/turn · 💰 Y.Y gold/turn`
- `docs/systems/production.md` — documented the new planet-modal live output label behavior in the Production slider section and changelog
- `docs/development/current-state.md` — recorded Task 55 in Completed and Changelog; updated overall Phase 6 status to Tasks 47–55 complete
- `docs/tasks/backlog.md` — marked Task 55 complete
**Notes:** The live output label re-renders as `productionSlider` changes, so values update in real time while dragging. The slider and split-percentage label behavior are unchanged.

---

## Task 54 — Visual icons for factory and research lab buildings in the planet modal
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — in the owned-planet modal building slot grid, replaced filled-slot labels from `F`/`R` to emoji icons (`🏭` for `factory`, `🔬` for `researchLab`) and increased `buildingSlotLabel` font size to `22` for clean fit in 40×40 tiles
- `docs/development/current-state.md` — recorded Task 54 in Completed and Changelog; updated owned planet modal description to icon-based slot labels
- `docs/tasks/backlog.md` — marked Task 54 complete (strikethrough + completed date)
**Notes:** Under-construction visual behavior is unchanged (`buildingSlotUnderConstruction` still applies `opacity: 0.35`), so same-round placed buildings appear dimmed with the new emoji icons. Empty slots remain outline-only with no icon.

---

## Task 53 — Home planet class variation (A-G) with class-specific starting gold and slot count
**Completed:** 2026-05-28
**Files modified:**
- `src/game/spawnPlacer.ts` — exported `HOME_PLANET_CLASS_CONFIG`; `placeSpawns` now returns `{ map, homePlanetClassByPlayerId }`, assigns each home planet a seeded-random class A-G (`Math.floor(rng() * 7)`), and applies class-specific home `buildingSlots`
- `src/store/gameStore.ts` — imports `HOME_PLANET_CLASS_CONFIG`; `startNewGame` reads `homePlanetClassByPlayerId` from `placeSpawns`; `buildPlayers` initializes each player's `gold` from the assigned home-planet class config instead of flat `STARTING_GOLD`
- `docs/systems/map-generation.md` — added Home Planet Classes table and behavior notes
- `docs/development/current-state.md` — recorded Task 53 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 53 complete
**Notes:** Spawn fairness search/scoring and candidate selection are unchanged. Only home planets are affected; non-home planets retain map-generated class and slot values.

---

## Task 52 — Increase spawn rate of A, B, C planet classes
**Completed:** 2026-05-28
**Files modified:**
- `src/game/mapGenerator.ts` — updated `PLANET_CLASS_WEIGHTS` to A=0.08, B=0.15, C=0.25, D=0.27, E=0.25 and removed classes F–P from weighted roll entries
- `docs/systems/map-generation.md` — updated class distribution table and changelog to reflect new A–E weights
- `docs/development/current-state.md` — recorded Task 52 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 52 complete
**Notes:** Weights now sum to exactly 1.00 (`0.08 + 0.15 + 0.25 + 0.27 + 0.25`). D and E remain the most common classes while A/B/C appear more frequently than before.

---

## Task 51 — Research info button + modal
**Completed:** 2026-05-28
**Changed files:**
- `src/screens/GameScreen.tsx` — added `showResearchModal` state, R&D button (bottom-right above End Turn), and research modal showing tech level, banked points vs threshold, active lab count, and projected turns to next level; uses `researchThreshold` and `MAX_TECH_LEVEL` from `productionEngine`

---

## Task 50 — Building purchase: deduct gold immediately and enforce slot capacity
**Completed:** 2026-05-28
**Files modified:**
- `src/store/gameStore.ts` — `queueBuildOrder` now validates active player ownership, required build gold (`FACTORY_GOLD_COST` / `RESEARCH_LAB_GOLD_COST`), and planet slot availability using committed + same-round queued builds; invalid requests no-op; valid requests now immediately deduct player gold and append under-construction building
- `src/screens/GameScreen.tsx` — owned-planet modal now computes `availableSlots` from committed + same-round queued builds and disables/dims Factory/Research Lab chips when no slots remain
- `docs/systems/production.md` — documented immediate build-order gold deduction and slot-capacity enforcement at queue time
- `docs/development/current-state.md` — recorded Task 50 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 50 complete
**Notes:** Turn resolution and production pipeline are unchanged; this is a queue-time validation/economy UX fix. Gold in the status bar now updates instantly after each successful build order.

---

## Task 49 — Fleet dispatch modal: show click distance and turn count
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — imported `computeClickDistance`, `computeTurnsInTransit`, and `effectiveSpeed`; added memoized pending-route metrics for the confirm-fleet modal; rendered a new modal info line showing `Distance: X.X clicks · ETA: N turn(s)` between route text and ship stepper; added `modalRouteInfo` style matching existing muted modal metadata
- `docs/development/current-state.md` — recorded Task 49 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 49 complete
**Notes:** No store or engine changes. Existing modal open/close, confirm/cancel flow, and ship stepper behavior remain unchanged.

---

## Task 48 — Add padding between planets and board edges
**Completed:** 2026-05-28
**Files modified:**
- `src/game/mapGenerator.ts` — added `PLANET_EDGE_PADDING = 3` and constrained random candidate position sampling to padded bounds: `x ∈ [3, width - 1 - 3]`, `y ∈ [3, height - 1 - 3]`, applied directly where `(x, y)` is generated before minimum-distance rejection checks
- `docs/systems/map-generation.md` — documented `PLANET_EDGE_PADDING` and padded coordinate sampling bounds in planet placement notes
- `docs/development/current-state.md` — recorded Task 48 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 48 complete
**Notes:** Minimum-distance rejection logic and class-weight sampling were unchanged. Seeded RNG remains deterministic, with maps now generated within padded interior bounds.

---

## Task 47 — Fix planet tap hit-detection (click box centred on planet with padding)
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — `PlanetNode` touch wrapper now anchors to the exact planet center using `left/top = center - PLANET_SIZE_SELECTED / 2`, keeping the circle inside the touch container rather than offset from it
- `src/screens/GameScreen.tsx` — added uniform `PLANET_TAP_HIT_SLOP` (`top/bottom/left/right: 8`) to `TouchableOpacity` presses and drag-enabled tap/pan gestures for padded, reliable taps at scale 1 and while zoomed
**Notes:** Planet visuals (circle size, labels, fonts, colors, gesture behavior) were preserved; change is hit-area-only. Manual verification pending in simulator/device for home-planet modal open at default zoom.

---

## Task 46 — Building construction delay: gray icon for just-built buildings
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `Building` now includes `builtOnRound: number`
- `src/store/gameStore.ts` — `queueBuildOrder` now stamps new buildings with `builtOnRound: record.state.roundNumber`
- `src/game/productionEngine.ts` — `runProduction(map, players, currentRound)` now counts only active buildings where `builtOnRound < currentRound`
- `src/game/turnEngine.ts` — passes `state.roundNumber` into `runProduction`
- `src/screens/GameScreen.tsx` — planet modal slot tiles render with `opacity: 0.35` when `building.builtOnRound === gameState.roundNumber`
- `docs/systems/production.md` — added "Construction Delay" section and updated production counting notes
**Notes:** Newly placed buildings are visible immediately but remain under construction for the rest of the current round; they become productive starting next round. `npx tsc --noEmit` passes clean.

---

## Task 45 — Redesign owned-planet detail modal
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — added `queueBuildOrder(planetId, buildingType)` for optimistic build placement into owned planet slots, and `setProductionSlider(planetId, value)` to update per-planet slider values in active game state (with `[0,1]` clamping)
- `src/screens/GameScreen.tsx` — replaced old label/value planet modal with redesigned layout: centered header + close button, class tile + troop summary row, Factory/Research Lab selectable build chips, interactive building-slots grid (`F`/`R` filled states), and conditional production slider (`@react-native-community/slider`) showing `% troops / % gold`
- `package.json`, `package-lock.json` — installed `@react-native-community/slider`
**Notes:** Modal closes on backdrop tap or `✕`; selecting a build chip then tapping an empty slot immediately queues a build on that planet; production slider only appears when at least one factory exists. `npx tsc --noEmit` passes clean.

---

## Task 44 — Shorter planet names (no truncation with "...")
**Completed:** 2026-05-27
**Files modified:**
- `src/game/mapGenerator.ts` — replaced `PLANET_ADJECTIVES` and `PLANET_NOUNS` with short one- or two-syllable word pools (16 each) to keep generated `[Adjective] [Noun]` labels compact while preserving deterministic seeded name selection
- `src/screens/GameScreen.tsx` — removed `numberOfLines={1}` from `PlanetNode` name label so names render naturally without ellipsis truncation
**Notes:** RNG behavior remains identical in structure and call order (`generatePlanetName(rng)` still performs two indexed `rng()` draws and returns `${adj} ${noun}`), so seeded determinism is unchanged. `npx tsc --noEmit` passes clean.

---

## Task 43 — Non-owned planet rendering: gray with class letter and name
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `PlanetNode` now always renders planet name above and class letter inside for all planets; non-owned labels use muted fog colors (`#666688` name and `rgba(180, 180, 200, 0.5)` class) while owned planets keep bright label styling; ship count rule remains `isOwned && shipCount > 0`
**Notes:** Restores intended fog UX: non-owned planets are still gray blobs for ownership detail, but retain basic identity context (name + class). `npx tsc --noEmit` passes clean.

---

## Task 42 — Fix fog of war: enemy-owned planets must not show white border
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — selection pulse branch (`highlighted && !isDragOrigin`) now requires `isOwned`; non-owned planet taps now call `selectPlanet(null)` instead of setting `selectedPlanetId`
**Notes:** Enemy/neutral planets now render as plain gray circles when tapped, with no white/blue pulse border. Drag-origin accent border remains unchanged and still applies only to owned drag starts. `npx tsc --noEmit` passes clean.

---

## Task 41 — Remove ownership ring/circle from planets
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — removed `homeRing` render block and deleted `styles.homeRing`; removed `isHome` prop from `PlanetNode`; removed home-based touch offset and white home border logic from planet circle rendering
**Notes:** Planet ownership no longer adds any ring/border. Interaction feedback borders remain intact: drag origin still uses accent border and selected/highlighted planets still use the animated pulse border. `npx tsc --noEmit` passes clean.

---

## Task 40 — Fix pinch-zoom scroll clamping (can't reach board edges when zoomed in)
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `clampTranslation` now clamps exactly to `[-(mapSize * scale - viewportSize), 0]` per axis with a zero-offset guard when the scaled map is smaller than the viewport; map transform no longer depends on `transformOrigin` and explicitly compensates center-based scaling so effective screen math stays `screen = map * scale + translate`
**Notes:** Focal-point pinch anchoring (`pinchFocalX/Y`, `pinchStartTranslateX/Y`) and hit detection (`screenToMapCoords`) were kept aligned to the same transform formula, so no gameplay interaction regressions. `npx tsc --noEmit` passes clean.

---

## Task 39 — Research system overhaul (exponential level-up thresholds)
**Completed:** 2026-05-27
**Files modified:**
- `src/game/productionEngine.ts` — removed flat `RESEARCH_POINTS_PER_LEVEL`; added exported `researchThreshold(level)` using `Math.round(10 * Math.pow(1.5, level))`; updated level-up loop to recalculate threshold after each tech gain; kept `MAX_TECH_LEVEL=15`
- `docs/systems/production.md` — Research Level-Up section updated with exponential formula and sample curve values; flat-threshold documentation removed
**Notes:** Verified `RESEARCH_LAB_POINTS_PER_TURN` remains `1` and `buildPlayers` already initializes `techLevel: 0`. `npx tsc --noEmit` passes clean.

---

## Task 38 — End Turn button: smaller, bottom-right corner
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `bottomPanel` View removed entirely; End Turn replaced with compact absolutely-positioned `Pressable` (`right: 16`, `bottom: insets.bottom+16`, `zIndex: 10`); queued orders moved to `queueOverlay` (bottom-left absolute, semi-transparent); game-over banner moved to `gameOverOverlay` (centred absolute overlay); new styles: `endTurnButton`, `endTurnButtonText`, `queueOverlay`, `queueOverlayHeader`, `queueOverlayRow`, `queueOverlayText`, `queueOverlayCancelText`, `gameOverOverlay`
**Notes:** Map now fills the full screen height. Lock screen, fleet dispatch modal, and planet detail modal unaffected. `npx tsc --noEmit` passes clean.

---

## Task 37 — Planet detail modal popup on tap
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — planet detail `Modal` added (transparent, fade, backdrop-close); shows planet name, class, troops, building slots used/total, buildings breakdown (factory/lab counts), production slider %; `planetSection` block removed from bottom panel `ScrollView`; new styles: `planetDetailCard`, `planetDetailHeader`, `planetDetailName`, `planetDetailClose`, `planetDetailRow`, `planetDetailLabel`, `planetDetailValue`, `planetDetailHint`
**Notes:** Modal only opens when `selectedPlanet.owner === humanPlayer.id`. Tapping non-owned planets still toggles `selectedPlanetId` in the store but no modal appears. Fleet dispatch modal and queue list unaffected. `npx tsc --noEmit` passes clean.

---

## Task 36 — Planet display: name above, class inside, troops below (non-zero only)
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `isOwned: boolean` prop added to `PlanetNode`; planet name rendered as absolutely-positioned label (`top: -11`, `width: 48`) above circle when `isOwned`; class letter centered inside both circle variants when `isOwned`; troop count suppressed when `!isOwned || shipCount === 0`; `styles.planetCircle` gains `alignItems/justifyContent: 'center'`; `styles.planetNameLabel` and `styles.planetClassLabel` added
**Notes:** Name label uses `position: 'absolute'` so it does not shift the circle's pixel position. `npx tsc --noEmit` passes clean.

---

## Tasks 34–35 — Fog-of-war planet rendering + own-planet green tint
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — added `getPlanetColor(planet, humanPlayerId)` for visibility-aware planet coloring; planet nodes now render with palette: own `#27ae60`, neutral `#2a2a4a`, enemy/non-owned `#333355`
- `docs/systems/map-generation.md` — fog-of-war rendering behavior updated to document the new three-color palette and fleet-color exception
**Notes:** `getPlayerColor(ownerId, humanPlayerId, players)` remains in use by `FleetLayer` so fleet dots/lines still render in player colors. `npx tsc --noEmit` passes clean.

---

## Task 33 — AI names: simple, unique, non-clashing with humans
**Completed:** 2026-05-27
**Files modified:**
- `src/game/aiEngine.ts` — replaced `[Name] [Epithet]` lists with a single pool of short first-names; `generateAiName(rng, usedNames)` now shuffles deterministically and picks the first case-insensitive unused name, with `AI {n}` fallback
- `src/store/gameStore.ts` — `buildPlayers` now tracks `usedNames` while iterating slots; human and AI names are added as they are assigned; AI calls `generateAiName(aiNameRng, usedNames)` to avoid collisions with both humans and prior AIs
**Notes:** AI logic/difficulty behavior unchanged; only naming path updated. `npx tsc --noEmit` passes clean.

---

## Task 32 — Human player name input in game setup
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `PlayerSlot` now includes optional `name`; `buildPlayers` now names human players from `slot.name?.trim()` with fallback `Player {n}` (`n` = 1-based human index), AI naming unchanged
- `src/screens/HomeScreen.tsx` — added compact `TextInput` ("Player name") for each human slot (including fixed slot 0); hooked local slot state updates for name entry
**Notes:** `PlayerSlot` is defined in the store (not `src/game/types.ts`), so `types.ts` did not require changes. `npx tsc --noEmit` passes clean.

---

## Task 31 — Fix zoom/pan and touch hit-detection
**Completed:** 2026-05-27  
**Files modified:**
- `src/screens/GameScreen.tsx` — `transformOrigin: '0% 0%'` added as static style on the map `Animated.View`; four new shared values (`pinchFocalX`, `pinchFocalY`, `pinchStartTranslateX`, `pinchStartTranslateY`); `Gesture.Pinch` rewritten with `onStart` (captures focal point + initial translation), `onUpdate` (focal-point–anchored scale math + clamp), `onEnd` (saves final values)
**Notes:** Root cause was React Native's default scale origin at element center, which invalidated `screenToMapCoords`, `clampTranslation`, and the pinch gesture. Adding `transformOrigin: '0% 0%'` makes scale anchor at the top-left corner, making all existing math correct. Focal-point anchoring formula: `newTx = fx - (fx - savedTx) * (newScale / savedScale)`. `pan`, `doubleTap`, `clampTranslation`, and `screenToMapCoords` unchanged. `npx tsc --noEmit` passes clean.

---

## Task 1 — Set up clean folder structure
**Completed:** 2026-05-27
**Files created:**
- `src/game/types.ts`
- `src/game/mapGenerator.ts`
- `src/game/spawnPlacer.ts`
- `src/game/turnEngine.ts`
- `src/game/productionEngine.ts`
- `src/game/movementEngine.ts`
- `src/game/combatEngine.ts`
- `src/game/aiEngine.ts`
- `src/game/validationEngine.ts`
- `src/game/index.ts`
**Notes:** All stubs. `npx tsc --noEmit` passes clean.

---

## Task 2 — Define game types/interfaces
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts`
**Types defined:** `PlanetClass`, `BuildingType`, `OwnerId`, `Position`, `Building`, `Planet`, `Fleet`, `Player`, `GameMap`, `GameState`
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 3 — Build deterministic map generator
**Completed:** 2026-05-27
**Files modified:**
- `src/game/mapGenerator.ts`
**Exports:** `MapConfig`, `generateMap()`
**Notes:** Mulberry32 seeded RNG (no `Math.random()`). Planet class weights E=35%, D=30%, C=20%, B=10%, A=5%. Minimum planet spacing `max(2, min(width,height) / (planetCount * 0.5))`. `npx tsc --noEmit` passes clean.

---

## Task 4 — Build fair starting-position placement
**Completed:** 2026-05-27
**Files modified:**
- `src/game/spawnPlacer.ts`
**Exports:** `placeSpawns()`
**Notes:** Evaluates 200 random one-planet-per-player assignments. Scores each set with weighted, batch-normalized metrics: minimum pairwise home distance (0.5), variance of nearby planet counts within `R = min(width,height)*0.25` (0.3, lower is better), and center-bias penalty averaged per home (0.2, lower is better). Winning assignment sets `isHomePlanet`, `owner`, and `shipCount: 5`. Returns a new `GameMap` without mutating the input. `npx tsc --noEmit` passes clean.

---

## Task 5 — Build turn engine
**Completed:** 2026-05-27
**Files modified:**
- `src/game/turnEngine.ts`
- `src/game/combatEngine.ts` (stub `resolveArrival` signature)
- `src/game/productionEngine.ts` (stub `runProduction` signature)
**Exports:** `PlayerAction`, `TurnInput`, `resolveTurn()`
**Notes:** Validates active player and game status. Processes `SEND_FLEET` (distance-based `turnsRemaining`, garrison rules, fleet ids `fleet-{turnNumber}-{index}`). Advances all fleets, calls `resolveArrival` and `runProduction` stubs, updates elimination from home-planet ownership, sets winner when one player remains, cycles `currentPlayerId` among non-eliminated players. Immutable input — returns new `GameState`. `npx tsc --noEmit` passes clean.

---

## Task 6 — Build planet production
**Completed:** 2026-05-27
**Files modified:**
- `src/game/productionEngine.ts`
- `src/game/turnEngine.ts`
**Files created:**
- `docs/systems/production.md`
**Exports:** `runProduction()`, `PLANET_CLASS_MULTIPLIERS`, `BASE_SHIP_PRODUCTION`, `BASE_RESOURCE_PRODUCTION`, `MANUFACTURING_BONUS_PER_LEVEL`
**Notes:** Per owned planet each turn: `multiplier = classMultiplier + Σ(manufacturingFacility.level × 0.4)`; class multipliers A=2.0, B=1.6, C=1.2, D=0.8, E=0.5; `ships = floor(2 × multiplier)` added to `planet.shipCount`; `resources = floor(1 × multiplier)` added to owner `Player.resources`. Neutral planets skipped. Returns `{ map, players }` without mutating inputs. `turnEngine.resolveTurn` destructures the result. `npx tsc --noEmit` passes clean.

---

## Task 7 — Build fleet movement
**Completed:** 2026-05-27
**Files modified:**
- `src/game/movementEngine.ts`
- `src/game/turnEngine.ts`
**Files created:**
- `docs/systems/movement.md`
**Exports:** `computeTurnsInTransit()`, `createFleet()`, `advanceFleets()`
**Notes:** Transit time = `Math.max(1, Math.ceil(euclidean distance))`. Fleet ids `fleet-{turnNumber}-{fleetIndex}`. `advanceFleets` decrements `turnsRemaining` immutably and splits into `inTransit` / `arrived` (arrived fleets get `turnsRemaining: 0`). `turnEngine` delegates dispatch and advance; removed inline `euclideanDistanceCeil`. `npx tsc --noEmit` passes clean.

---

## Task 8 — Build combat resolver
**Completed:** 2026-05-27
**Files modified:**
- `src/game/combatEngine.ts`
**Files created:**
- `docs/systems/combat.md` (documented implementation)
**Exports:** `resolveArrival()`, `DEFENSE_BONUS`, `ATTACKER_TECH_MULTIPLIER`, `DEFENDER_TECH_MULTIPLIER`
**Notes:** On fleet arrival: friendly owner match adds `fleet.shipCount` to garrison; neutral planets transfer ownership with fleet ships as garrison; enemy planets run deterministic combat — `attackerStrength = fleet.shipCount × ATTACKER_TECH_MULTIPLIER`, `defenderStrength = planet.shipCount × DEFENDER_TECH_MULTIPLIER × DEFENSE_BONUS` (1.2 defender bonus). Attacker wins if strictly greater (`shipCount = floor(attacker - defender)`, owner changes); defender holds on tie or win (`shipCount = floor(defender - attacker)`, owner unchanged). Tech multipliers fixed at 1.0 pending player lookup. Returns new `GameMap` without mutating inputs. `npx tsc --noEmit` passes clean.

---

## Task 9 — Build simple AI
**Completed:** 2026-05-27
**Files modified:**
- `src/game/aiEngine.ts`
**Files created:**
- `docs/systems/ai-system.md` (documented implementation)
**Exports:** `computeAiTurn()`, `AiDifficulty`
**Notes:** Deterministic heuristic AI (no randomness). Priority: (1) reinforce home if garrison < any incoming enemy fleet and source has `shipCount > 5`; (2) attack lowest `shipCount / distanceToNearestAiPlanet` enemy where `floor(60% ships)` wins combat (`DEFENSE_BONUS`); (3) expand to nearest neutral with `floor(50% ships)` from closest AI planet with `shipCount > 4`; (4) `END_TURN`. One source planet per turn; always leaves ≥1 ship on source. `AiDifficulty` (`easy` | `normal`) exported for future tuning (same logic today). `npx tsc --noEmit` passes clean.

---

## Task 10 — Build playable local screen
**Completed:** 2026-05-27
**Sub-tasks:** 10a (Zustand store), 10b (HomeScreen + navigation), 10c (GameScreen gameplay UI)
**Files created:**
- `src/store/gameStore.ts`
- `src/screens/HomeScreen.tsx`
- `src/screens/GameScreen.tsx`
**Files modified:**
- `App.tsx` — `NavigationContainer`, native stack, `RootStackParamList`
- `package.json` — zustand, React Navigation, safe-area/screens peers
**Notes:** Local MVP: Home configures match and calls `startNewGame`; Game shows pannable 2D map (`CELL_SIZE` 18), owner-colored planets, fleet dispatch UI, auto AI turn resolution via store. MVP limits: one human `sendFleet` per turn (full turn resolves on send); no SVG fleet lines (`react-native-svg` not installed). `npx tsc --noEmit` passes clean.

---

## Task 28 — Pass-and-play screen blanking between turns
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `showingLockScreen` state; `dismissLockScreen`; `endTurn` sets lock screen when `playMode === 'passAndPlay'` and game is still active; cleared on `startNewGame`, `loadGame`, `resetGame`
- `src/screens/GameScreen.tsx` — full-screen lock overlay after main UI; "Pass the device" / "Tap anywhere to continue"; absolute positioning with `zIndex: 100` and safe-area padding
**Notes:** UI-only; no `turn-engine.md` changes. With one human player per device, the lock screen appears every time the human's turn begins after End Turn (prevents accidental peek at AI-resolved state before intentional dismiss). Map renders underneath overlay to avoid flash on dismiss. `npx tsc --noEmit` passes clean.

---

## Task 26 — Cancel in-transit fleet (same turn only)
**Completed:** 2026-05-27
**Satisfied by:** Task 27 queue model — no dedicated code change
**Notes:** Ships are not deducted from `GameState` until `endTurn()` commits queued `SEND_FLEET` actions. Cancelling a queued order via the ✕ button in the orders list removes it from `queuedOrders` before commit, so troops remain on the origin planet. Only same-turn (pre–End Turn) orders are cancellable; in-transit fleets from prior turns are not in the queue.

---

## Task 27 — End Turn button + multiple fleet orders per turn
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `queuedOrders`, `queueOrder`, `cancelQueuedOrder`, `endTurn`; `confirmPendingFleet` queues instead of resolving; `sendFleet` removed; UI state resets include `queuedOrders: []`
- `src/screens/GameScreen.tsx` — queued orders list with cancel; End Turn button; status bar shows queue count; `modalMaxShips` accounts for ships already queued from same origin
- `docs/systems/turn-engine.md` — client commit model and Task 27 changelog
**Notes:** Human turn ends only on **End Turn**, which submits all queued `SEND_FLEET` actions plus `{ type: 'END_TURN' }` in one `resolveTurn` call, then `runAiTurnsUntilHuman`. `turnEngine.ts` unchanged (already supported multiple dispatches). `npx tsc --noEmit` passes clean.

---

## Task 25 — In-transit fleet position visualization
**Completed:** 2026-05-27
**Files modified:**
- `package.json` — `react-native-svg 15.12.1` added
- `src/game/types.ts` — `totalTurns: number` added to `Fleet`
- `src/game/movementEngine.ts` — `createFleet` sets `totalTurns: turnsRemaining` on the returned fleet
- `src/screens/GameScreen.tsx` — `FleetLayer` SVG component renders interpolated fleet position dots, dashed lines to destination, and ship count labels; old `FleetMarker` component and `fleetsByDestination` memo removed
- `docs/systems/movement.md` — fleet visualization section updated
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 24 — Drag-to-move fleet UX
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `PendingFleet` type; `pendingFleet`, `setPendingFleet`, `confirmPendingFleet` added to store; `resetGame` clears pending fleet
- `src/screens/GameScreen.tsx` — long-press on owned planets starts drag; drag line drawn to finger position; on release: planet hit detection within `CELL_SIZE × 1.5` radius; `isInRange`/`effectiveRange` check; out-of-range toast; ship-count modal with stepper; old destination chips, stepper, and Send button removed; `destPlanetId`/`canSend`/`handleSendFleet` all removed
- `docs/systems/movement.md` — drag-to-move UX documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 23 — Pinch-to-zoom map
**Completed:** 2026-05-27
**Files modified:**
- `package.json` — `react-native-gesture-handler ~2.28.0` and `react-native-reanimated ~4.1.1` added
- `App.tsx` — `GestureHandlerRootView` wraps root
- `src/screens/GameScreen.tsx` — double-`ScrollView` replaced with Reanimated-animated `Animated.View` inside `GestureDetector`; pinch (scale 0.4–4×), pan (clamped), double-tap (1.5× spring zoom) gestures composed with `Gesture.Simultaneous`; saved values reset on game change
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 22 — Support up to 8 players with configurable AI difficulty
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `difficulty?: AiDifficulty` added to `Player`
- `src/game/aiEngine.ts` — confirmed `AiDifficulty` export in place; no logic changes
- `src/store/gameStore.ts` — `PlayerSlot { type, difficulty? }` and `GameConfig.playerSlots[]` replace `aiCount`; `startNewGame` derives player count and AI flags from slots; `difficulty` stored on each AI player
- `src/screens/HomeScreen.tsx` — player slot builder UI; slot 0 fixed as human; slots 1+ human/AI toggle; AI slots show Easy/Normal difficulty chips; Add Player / Remove buttons; min 2, max 8 slots
- `docs/systems/ai-system.md` — difficulty and slot system documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 21 — Pass-and-play vs. async multiplayer mode selection
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `PlayMode = 'passAndPlay' | 'asyncMultiplayer'` exported; `playMode: PlayMode` added to `GameState`
- `src/store/gameStore.ts` — `playMode` added to `GameConfig`; passed through to `GameState` in `startNewGame`
- `src/screens/HomeScreen.tsx` — `playMode` state added; two-card selector added to setup form; async card styled as "coming soon"
- `docs/systems/multiplayer.md` — Play Modes section added
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 20 — Remove map seed from new game setup
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `seed` removed from `GameConfig`; seed generated internally as `Date.now()` in `startNewGame`; still stored in `GameState.seed` and `GameRecord.config` for reproducibility
- `src/screens/HomeScreen.tsx` — `seedText` state, seed `TextInput`, hint text, and seed parsing logic removed from setup form
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 19 — Multi-game lobby home screen
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `GameRecord { id, name, state, config }` added and exported; store refactored from `gameState/config` to `games[]`/`activeGameId`; `loadGame`, `deleteGame`, `getActiveRecord` implemented; all existing actions (`sendFleet`, `selectPlanet`, `resetGame`, `getVisibleGameState`) updated to operate on active record
- `src/screens/HomeScreen.tsx` — rewritten as lobby + inline setup form; `GameCard` component shows game name, players, current player, YOUR TURN badge, VICTORY/DEFEAT; "New Campaign" footer button; empty state message
- `docs/systems/save-system.md` — multi-game architecture documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 18 — Random AI player names
**Completed:** 2026-05-27
**Files modified:**
- `src/game/aiEngine.ts` — `AI_FIRST_NAMES`, `AI_EPITHETS` word lists added; `generateAiName(rng)` exported
- `src/store/gameStore.ts` — imports `generateAiName`; `aiNameRng = mulberry32(config.seed + 2)` created in `startNewGame`; `buildPlayers` accepts and uses `aiNameRng`; AI players now get `[Name] [Epithet]` names
- `docs/systems/ai-system.md` — AI Player Names section added
**Notes:** `npx tsc --noEmit` passes clean. Phase 2 complete.

---

## Task 17 — Random planet names
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `name: string` added to `Planet` and `VisiblePlanet` interfaces
- `src/game/mapGenerator.ts` — `PLANET_ADJECTIVES` and `PLANET_NOUNS` word lists added; `generatePlanetName(rng)` helper generates `[Adjective] [Noun]` format using seeded RNG; `name` field set on every planet at creation
- `docs/systems/map-generation.md` — Planet Names section added
**Notes:** `spawnPlacer.ts` unchanged — uses object spread so `name` is preserved automatically. `npx tsc --noEmit` passes clean.

---

## Task 16 — Research level system
**Completed:** 2026-05-27
**Files modified:**
- `src/game/productionEngine.ts` — `MAX_TECH_LEVEL=15`, `RESEARCH_POINTS_PER_LEVEL=10` added; level-up loop in `runProduction` increments `techLevel` and drains `researchPoints`
- `src/game/movementEngine.ts` — `effectiveRange(techLevel)`, `effectiveSpeed(techLevel)`, `RANGE_CLICKS_PER_TECH_LEVEL=1`, `SPEED_CLICKS_PER_TECH_LEVEL=0.5` added
- `src/game/turnEngine.ts` — `processSendFleet` accepts `players`, looks up dispatching player's `techLevel`, applies `effectiveRange`/`effectiveSpeed` to range check and transit time
- `docs/systems/production.md` — Research Level-Up section added
- `docs/systems/movement.md` — new constants and helpers documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 15 — Planet ownership persistence
**Completed:** 2026-05-27
**Files modified:**
- `docs/systems/combat.md` — Planet Ownership section added; 0-garrison auto-capture rule documented
**Notes:** No code changes required. Existing `combatEngine.ts` and `turnEngine.ts` already correctly implement the rule — elimination is triggered by `home.owner !== player.id`, not by `shipCount = 0`. `npx tsc --noEmit` passes clean.

---

## Task 14 — Fog of war
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `VisiblePlanet` interface added (for future UI use)
- `src/store/gameStore.ts` — `buildVisibleState` helper zeros non-owned planet details and strips enemy fleets; `getVisibleGameState()` added to `GameStore` interface and implemented
- `src/screens/GameScreen.tsx` — now reads `getVisibleGameState()` instead of raw `gameState`
- `docs/systems/map-generation.md` — fog of war section added
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 13 — Round-based simultaneous resolution
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `GameState` gains `roundNumber: number`; `Fleet` gains `dispatchedInRound: number`
- `src/game/movementEngine.ts` — `createFleet` accepts and stores `dispatchedInRound`
- `src/game/turnEngine.ts` — arrivals resolved at turn start only when `turnsRemaining <= 0 && dispatchedInRound < roundNumber`; newly-advanced fleets with `turnsRemaining: 0` retained in fleet list; `roundNumber` increments on player-order wrap; bug fix: `arrived` fleets from `advanceFleets` merged back into transit list
- `src/store/gameStore.ts` — initial `GameState` includes `roundNumber: 1`
- `docs/systems/turn-engine.md` — updated
- `docs/systems/movement.md` — updated
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 12 — Rework production system
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `PlanetClass` extended to A–P; `Building.level` removed; `Planet` gains `troopAccumulator`, `buildingSlots`, `productionSlider`; `Player.resources` renamed to `gold`, `researchPoints` added; `BuildingType` changed to `'factory' | 'researchLab'`
- `src/game/productionEngine.ts` — full rewrite; slot-based factory/lab output with A–P tables, slider mechanic, `troopAccumulator` logic
- `src/game/mapGenerator.ts` — `PLANET_CLASS_WEIGHTS` expanded to A–P; planets initialized with `buildingSlots` (1–20), `troopAccumulator: 0`, `productionSlider: 0.5`, `buildings: []`
- `src/store/gameStore.ts` — player init updated to `gold: STARTING_GOLD, researchPoints: 0`
- `src/screens/GameScreen.tsx` — status bar updated from `resources` to `gold`
- `docs/systems/production.md` — fully rewritten to document new system
**Exports added:** `FACTORY_GOLD_COST`, `RESEARCH_LAB_GOLD_COST`, `STARTING_GOLD`, `RESEARCH_LAB_POINTS_PER_TURN`, `FACTORY_TROOP_OUTPUT`, `FACTORY_GOLD_OUTPUT`
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 11 — Rework movement system (clicks)
**Completed:** 2026-05-27
**Files modified:**
- `src/game/movementEngine.ts`
- `src/game/turnEngine.ts`
- `docs/systems/movement.md`
**Exports added:** `BASE_FLEET_RANGE_CLICKS`, `BASE_FLEET_SPEED_CLICKS_PER_TURN`, `computeClickDistance()`, `isInRange()`
**Notes:** Replaced euclidean-distance-as-turns with clicks model. `computeTurnsInTransit` now divides click distance by speed (default 5 clicks/turn), minimum 1 turn. Range check (`isInRange`) added to `processSendFleet` in `turnEngine` — throws if destination > 11 clicks from origin. Old private `euclideanDistance` helper removed. `npx tsc --noEmit` passes clean.

---

## Changelog
- 2026-05-28: Task 108 entry added.
- 2026-05-28: Task 68 entry added.
- 2026-05-28: Task 57 entry added.
- 2026-05-28: Task 56 entry added.
- 2026-05-28: Task 55 entry added.
- 2026-05-28: Task 54 entry added.
- 2026-05-28: Task 53 entry added.
- 2026-05-28: Task 52 entry added.
- 2026-05-28: Task 50 entry added.
- 2026-05-28: Task 49 entry added.
- 2026-05-28: Task 48 entry added.
- 2026-05-28: Task 47 entry added.
- 2026-05-27: Task 46 entry added.
- 2026-05-27: Task 44 entry added.
- 2026-05-27: Task 43 entry added.
- 2026-05-27: Task 41 entry added.
- 2026-05-27: Task 39 entry added.
- 2026-05-27: Task 33 entry added.
- 2026-05-27: Task 32 entry added.
- 2026-05-27: Tasks 26 and 28 entries added.
- 2026-05-27: Task 27 entry added.
- 2026-05-27: Task 25 entry added.
- 2026-05-27: Task 24 entry added.
- 2026-05-27: Task 23 entry added.
- 2026-05-27: Task 22 entry added.
- 2026-05-27: Task 21 entry added.
- 2026-05-27: Task 20 entry added.
- 2026-05-27: Task 19 entry added.
- 2026-05-27: Task 18 entry added. Phase 2 complete.
- 2026-05-27: Task 17 entry added.
- 2026-05-27: Task 16 entry added.
- 2026-05-27: Task 15 entry added.
- 2026-05-27: Task 14 entry added.
- 2026-05-27: Task 13 entry added.
- 2026-05-27: Task 12 entry added.
- 2026-05-27: Task 11 entry added.
- 2026-05-27: Task 10 entry added.
- 2026-05-27: Task 9 entry added.
- 2026-05-27: Task 8 entry added.
- 2026-05-27: Task 7 entry added.
- 2026-05-27: Task 6 entry added.
- 2026-05-27: Task 5 entry added.
- 2026-05-27: Task 4 entry added.
- 2026-05-27: Task 3 entry added.
- 2026-05-27: File created with tasks 1–2.
