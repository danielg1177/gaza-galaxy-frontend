# Multiplayer System

## Status
**Phase 12 planned — implementation ready to begin.**

## Overview
Async turn-based multiplayer via a Laravel backend. Players submit turns independently from their own devices.
Pass-and-play is purely local (no backend required). Only `asyncMultiplayer` games use the API.

## Play Modes

Matches store a `playMode` on `GameState` (set from `GameConfig` at creation):

| Value | UI label | Description |
|-------|----------|-------------|
| `passAndPlay` | Pass & Play | Multiple humans share one device; turns hand off on the same screen. Entirely local — no backend sync. |
| `asyncMultiplayer` | Async Multiplayer | Each player uses their own device; turns submit independently. Requires Laravel backend. |

---

## User Accounts

### Authentication
- Username + password via Laravel Sanctum
- Sanctum token stored in client AsyncStorage and persists indefinitely
- Once logged in on a device, the user never needs to re-authenticate unless they explicitly log out
- Token is attached as `Authorization: Bearer {token}` header on all API requests

### Account Fields
- `username` — unique, 3–30 chars, alphanumeric + underscores (display name and login identifier)
- `password` — bcrypt hashed on backend

### Session Persistence
- On app launch, check AsyncStorage for stored token
- If token exists: attempt `GET /api/auth/me` to verify validity; if valid go to HomeScreen; if 401 go to LoginScreen (`loadStoredAuth` clears storage; does not use the global 401 → logout callback)
- If no token: go to LoginScreen
- Login/register bump an internal `authGeneration` so an in-flight `logout()` from a prior expired-token check cannot wipe a session the user just created

---

## Friends System

### Overview
Players can add friends by searching for their username. Friend connections must be established before inviting someone to a game.

### Friend States
| State | Description |
|-------|-------------|
| `none` | No relationship |
| `pending_sent` | Current user sent a request; awaiting acceptance |
| `pending_received` | Another user sent the current user a request |
| `accepted` | Mutual friends |

### Flow
1. User searches for another user by username (`GET /api/users/search?q=...`)
2. User sends a friend request (`POST /api/friends/request`)
3. Target user sees the request in their Friends screen under "Pending Requests"
4. Target user accepts or declines
5. On accept: both users become friends; the game creation flow can now include them as a human player

### Friends Screen
- Tab or dedicated screen accessible from HomeScreen
- Lists: accepted friends, pending incoming requests, and a search bar
- Pending incoming request count shown as a badge on the HomeScreen Friends button (top-left `AppTopBar`)
- Logout available top-right on HomeScreen and FriendsScreen via shared `AppTopBar`

---

## Game Lobby & Creation

### HomeScreen Lobby
- Lists all async games the user is in (via `GET /api/games`)
- Also lists local pass-and-play games (Zustand-only)
- Turn alert badges on async game cards (see Turn Alerts section)
- Pending game invites section or badge for unanswered invites
- **Delete game (creator only):** when `created_by_user_id` on the list payload equals the authenticated user, each async card shows a **Delete** control. Confirmation alert → `DELETE /api/games/{id}` → card removed from lobby state and any matching local `GameRecord` (`asyncGameId`) dropped from Zustand. No status gate (waiting, in progress, and finished may all be deleted by the creator). Non-creators never see the control.

### Async Game Creation
When the user selects "Async Multiplayer" mode in the new-game setup:

1. Human player slots (other than slot 0 — the creator) show a friend picker instead of a name text input
2. Slot 0 defaults to the current user's username (read from auth store) — user may rename it
3. Each human slot the creator fills with a friend shows that friend's username as the slot name (editable by the creator)
4. AI slots remain unchanged (difficulty selector, generated name)
5. On "Create Game": client calls `POST /api/games` with the player_slots array
6. Backend creates the game and sends invites to all named friends
7. Creator is taken directly into the game on their first turn

### Default Player Name
- In any game mode, slot 0 (the local user) defaults to their username from the auth store
- Human slots filled with friends default to that friend's username
- All names remain editable by the creator

### Game Invites
- Invited users see pending invites in their HomeScreen (badge count + invite list)
- Tapping an invite shows game details (creator, map size, player list, AI count)
- User accepts → they join the game; if all invites are now accepted the game auto-starts
- User declines → game is cancelled; creator is notified

---

## Turn Flow (Async Multiplayer)

### High-Level Flow
1. Game starts → push notification sent to the first player
2. Player opens app → HomeScreen shows game with `alert_state: 'your_turn'`
3. Player opens game → client fetches `GET /api/games/{id}` and loads `state_json` into Zustand store
4. Player takes their turn (orders, builds, sliders) via the existing GameScreen UI
5. Player taps "End Turn" → client runs the full turn resolution cycle locally (existing `endTurn` logic including AI turns)
6. Client submits via `POST /api/games/{id}/turn/submit` with actions, resulting state, and `events` (the `TurnEvent[]` from resolution — combat, fleet arrivals, production, eliminations)
7. Backend validates, stores `resulting_state` and `events_json` on the `turns` row, advances turn, sends push notification to next player
8. Player is returned to HomeScreen (or stays in-game showing the committed state)
9. Opponent opens the game → `GET /api/games/{id}` returns `state_json` plus `latest_events` (decoded `events_json` from the most recently submitted turn, or `[]`)
10. `loadAsyncGame` maps `latest_events` to `detail.latestEvents` and sets `turnReport` so the battle report modal shows what happened on the opponent's turn

### Turn events pipeline (async battle report)

| Step | Location | What happens |
|------|----------|----------------|
| 1 | `gameStore.endTurn()` | `runAiTurnsUntilHuman` aggregates `TurnEvent[]` for the submitted round |
| 2 | `gamesService.submitTurn()` | POST body includes `events` alongside `resultingState` |
| 3 | `TurnController::submit()` | Persists `events` as `turns.events_json` |
| 4 | `GameController::show()` | Returns `latest_events` from the latest submitted turn |
| 5 | `gamesService.getGame()` | Maps `latest_events` → `ApiGameDetail.latestEvents` |
| 6 | `gameStore.loadAsyncGame()` | Sets `turnReport: detail.latestEvents ?? []` |

### Mid-Turn Exit
Players can exit a game mid-turn and resume later:
1. Player taps "Exit Game" from the ⋮ menu
2. Client serializes current state (`partial_state_json` = full current `GameState` with all mutations applied) + `queued_orders`
3. Client calls `POST /api/games/{id}/turn/save`
4. Client navigates back to HomeScreen
5. Game card shows `alert_state: 'in_progress'` badge (distinct style from unstarted `your_turn`)

### Mid-Turn Resume
1. Player taps a game card with `alert_state: 'in_progress'`
2. Client calls `GET /api/games/{id}` which returns both `state_json` AND `in_progress_actions`
3. If `in_progress_actions.partial_state_json` exists: client loads that as the game state (restores all builds/slider changes)
4. Client restores `queued_orders` from `in_progress_actions.queued_orders`
5. Player sees their game exactly as they left it

---

## Turn Alert States

Each async game card in HomeScreen displays a visual alert indicator based on `alert_state`:

| `alert_state` | Display | Badge Color |
|---------------|---------|-------------|
| `your_turn` | "Your Turn" badge | Accent (indigo) — high urgency |
| `in_progress` | "In Progress" badge | Orange — turn started but not submitted |
| `waiting` | No badge / muted | Gray |
| `waiting_for_players` | "Waiting for players" | Yellow/muted |
| `finished` | "Victory" or "Defeat" label | Green / Red |

---

## Turn Privacy
- `GET /api/games/{id}` only returns `state_json` (last fully committed round)
- `in_progress_actions` are ONLY returned to the player whose turn it currently is
- Backend enforces this at the API layer — not just on the client

---

## Backend Tables
See `docs/systems/backend-api.md` for full schema. Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Accounts (username, password, push token) |
| `friendships` | Friend relationships and pending requests |
| `games` | Game state, status, current player |
| `game_players` | Player slots per game (human or AI) |
| `game_invites` | Pending/accepted/declined invites |
| `turns` | Turn history + mid-turn save state |

---

## Pass-and-Play
Pass-and-play games remain entirely local:
- No backend sync
- No auth required to play (but user must be logged in to use the app)
- State lives in Zustand only (lost on app restart — same as current behavior)
- Game cards in HomeScreen show local pass-and-play games separately from async games
- Lock screen after End Turn displays `roundNumber` (shared round) for all players — same as the in-game HUD
- **Auto-handoff:** When a player ends their turn, the lock screen automatically dismisses after 1.5 seconds, immediately showing the next human player's turn without requiring manual interaction. The "Start Turn" button remains visible for manual override if desired.

---

## Changelog
- 2026-06-08: Fixed win/loss outcome correctness and finished-game UI.
  - `GameRecord` now stores `localPlayerId` (e.g. `"player-1"`) — the authenticated user's player-slot ID in an async game. `loadAsyncGame` resolves it via `resolveAsyncLocalPlayerId`, which matches `detail.players[i].userId` against the current user's ID from the auth store. This replaces the broken `getLocalHumanPlayerId` fallback which always returned the winner's player-ID for finished games (causing every player to see the victory modal).
  - `GameScreen` now prefers `activeRecord.localPlayerId` over `getLocalHumanPlayerId(gameState)` when computing `localHumanPlayerId`.
  - Victory / defeat modals are now gated by `!showingLockScreen && !isViewingFinishedGame` so they cannot appear on top of the "Pass the device" / "See what happened" lock screen.
  - After a player closes the final battle report in `isViewingFinishedGame` mode, `handleCloseBattleReport` now shows a "Game Over" alert and navigates home (previously it set `pendingGameOverAlertRef` but never triggered navigation).
  - `HomeScreen` `getFinishedOutcome` now returns `'defeat'` for eliminated players even in active games (not just finished ones), so their card shows red while others continue playing.
  - `AsyncGameCard` card styling: victory/defeat outcome now applies a green (`#eaf5ec` / `#2e8a50` border) or red (`#fdecea` / `#c0392b` border) background instead of a pill badge. The neutral "FINISHED" badge remains for ambiguous outcomes.
- 2026-06-01: Phase 35 complete — async turn events pipeline documented: `endTurn` → `submitTurn(events)` → `turns.events_json` → `GET /api/games/{id}` `latest_events` → `loadAsyncGame` restores `turnReport`.
- 2026-05-31: **Pass-and-Play Auto-Handoff** — lock screen now auto-dismisses after 1.5 seconds, automatically advancing to the next human player's turn without manual interaction. The "Start Turn" button remains available for manual override.
- 2026-05-31: Task 154 complete — async game creation navigates creator directly into GameScreen on their first turn instead of returning to the lobby.
- 2026-05-31: Bug fix — pass-and-play lock screen turn label uses `roundNumber` instead of `turnNumber` so it matches the HUD (e.g. second round in a 2-player game shows "Turn 2", not "Turn 3").
- 2026-05-31: Task 150 complete — `isAsyncGame()` uses `GameRecord.asyncGameId` (not decoded `state.playMode`); `loadAsyncGame` forces `playMode: 'asyncMultiplayer'` on API-loaded state; GameScreen suppresses pass-and-play lock screen for async games; async End Turn submits then returns home (no local next-player handoff).
- 2026-05-31: Command Center creator delete — `HomeScreen` `AsyncGameCard` **Delete** for games where `createdByUserId === currentUser.id`; `DELETE /api/games/{id}` with confirmation; removes API list entry and local Zustand copy; errors via `ApiError.message`.
- 2026-05-31: Task 149 complete — pass-and-play **Exit to Home** and async **Exit Game** no longer call `resetGame()`; local pass-and-play games persist in Zustand `games[]` and appear under HomeScreen **Pass & Play**; async mid-turn exit relies on `listGames()` refresh on focus (local async copy retained until turn submit).
- 2026-06-01: Lobby — async game cards with `alert_state: 'waiting'` (`!isMyTurn`) are visible but not tappable; no read-only entry from Command Center or notification deep-link when it is not the player's turn.
- 2026-05-29: Task 146 complete — read-only spectator mode when opening async game with `alert_state: 'waiting'`; amber turn banner; End Turn/⋮/fleet drag disabled; map exploration enabled; ~~`waiting` cards tappable on HomeScreen~~ *(superseded 2026-06-01 — waiting cards non-tappable)*.
- 2026-05-29: Task 145 complete — async `endTurn` submits resolved turn to API via `submitTurn`; `isSubmittingTurn` overlay and `shouldReturnHome` navigation signal wired in `GameScreen`; pass-and-play path unchanged.
- 2026-05-29: Task 142 complete — HomeScreen `AsyncGameCard` renders turn alert badges and sorts async games by `alert_state` priority; Phase 14 client work complete.
- 2026-05-29: Phase 12 planning complete — friends system, async game creation with friend picker, mid-turn exit/resume, turn alert states, username defaults, full backend integration plan added.
- 2026-05-27: Task 21 — PlayMode type added; mode selector in setup form.
- 2026-05-27: File created. Not yet in scope.
