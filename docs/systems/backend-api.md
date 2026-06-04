# Backend API System

## Status
**Phase 12 planned — implementation ready to begin.**

## Overview
Laravel REST API with Sanctum authentication. JSON-based game state storage.
All game state is authoritative on the backend. Clients submit actions + computed resulting state;
the backend validates the submission structure, stores the state, and handles notifications.

## Tech Stack
- Laravel (PHP)
- Laravel Sanctum (token authentication)
- MySQL
- REST API (JSON)
- Expo Push Notifications (via Expo's push API, triggered from Laravel)

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK | Auto-increment |
| username | VARCHAR(30) UNIQUE NOT NULL | Alphanumeric + underscores only, 3–30 chars |
| password | VARCHAR(255) NOT NULL | Bcrypt hashed |
| expo_push_token | VARCHAR(255) NULL | Expo push token for notifications |
| created_at | TIMESTAMP NULL | |
| updated_at | TIMESTAMP NULL | |

Indexes: `UNIQUE(username)`

---

### `personal_access_tokens`
Standard Sanctum table — no modifications.

---

### `friendships`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK | |
| requester_id | BIGINT UNSIGNED FK→users | User who sent the request |
| addressee_id | BIGINT UNSIGNED FK→users | User who received the request |
| status | ENUM('pending','accepted','declined','blocked') | Default: 'pending' |
| created_at | TIMESTAMP NULL | |
| updated_at | TIMESTAMP NULL | |

Constraints: `UNIQUE(requester_id, addressee_id)`, cascades on user delete.
Indexes: `(addressee_id, status)`, `(requester_id, status)`

---

### `games`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK | |
| creator_id | BIGINT UNSIGNED FK→users | Player who created the game |
| name | VARCHAR(255) NOT NULL | Default: 'Untitled Game' |
| status | ENUM('waiting','active','finished') | 'waiting' until all invites accepted |
| play_mode | ENUM('pass_and_play','async_multiplayer') | |
| map_config_json | TEXT NOT NULL | Serialized MapConfig (width, height, planetCount, seed, mapSize, galaxyShape) |
| current_user_id | BIGINT UNSIGNED FK→users NULL | NULL when it is an AI's turn |
| turn_number | INT UNSIGNED NOT NULL | Global turn counter, increments each player turn |
| round_number | INT UNSIGNED NOT NULL | Full-cycle counter, increments when all players complete a turn |
| state_json | LONGTEXT NOT NULL | Last fully committed GameState (JSON) |
| winner_user_id | BIGINT UNSIGNED FK→users NULL | Set on game completion |
| created_at | TIMESTAMP NULL | |
| updated_at | TIMESTAMP NULL | |

Indexes: `(creator_id)`, `(current_user_id)`, `(status)`

---

### `game_players`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK | |
| game_id | BIGINT UNSIGNED FK→games | Cascade delete |
| user_id | BIGINT UNSIGNED FK→users NULL | NULL for AI players |
| turn_order | INT UNSIGNED NOT NULL | 0-based index matching GameState player array |
| in_game_name | VARCHAR(100) NOT NULL | Username for humans; AI-generated name for AIs |
| is_ai | BOOLEAN NOT NULL | Default FALSE |
| ai_difficulty | ENUM('easy','normal','hard') NULL | Only set when is_ai = true |
| is_eliminated | BOOLEAN NOT NULL | Default FALSE; updated as game progresses |
| home_planet_id | VARCHAR(50) NOT NULL | Set when game starts; matches Planet.id in state_json |
| created_at | TIMESTAMP NULL | |
| updated_at | TIMESTAMP NULL | |

Constraints: `UNIQUE(game_id, turn_order)`
Indexes: `(user_id)`, `(game_id, user_id)`

---

### `game_invites`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK | |
| game_id | BIGINT UNSIGNED FK→games | Cascade delete |
| inviter_id | BIGINT UNSIGNED FK→users | |
| invitee_id | BIGINT UNSIGNED FK→users | |
| player_slot_index | INT UNSIGNED NOT NULL | Which slot in the game this invite fills |
| status | ENUM('pending','accepted','declined') | Default: 'pending' |
| created_at | TIMESTAMP NULL | |
| updated_at | TIMESTAMP NULL | |

Indexes: `(invitee_id, status)`, `(game_id)`

---

### `turns`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT UNSIGNED PK | |
| game_id | BIGINT UNSIGNED FK→games | Cascade delete |
| user_id | BIGINT UNSIGNED FK→users | Human player whose turn this record covers |
| turn_number | INT UNSIGNED NOT NULL | Matches games.turn_number when this turn was taken |
| round_number | INT UNSIGNED NOT NULL | |
| submitted_actions_json | LONGTEXT NULL | Final `PlayerAction[]` submitted by client |
| in_progress_actions_json | LONGTEXT NULL | Mid-turn save blob (partial state + queued orders) |
| resulting_state_json | LONGTEXT NULL | Full GameState after resolution (set on submit) |
| started_at | TIMESTAMP NULL | First save or submit |
| submitted_at | TIMESTAMP NULL | Set on final submission |
| created_at | TIMESTAMP NULL | |
| updated_at | TIMESTAMP NULL | |

Constraints: `UNIQUE(game_id, user_id, turn_number, round_number)`
Indexes: `(game_id, turn_number)`, `(user_id, game_id)`

---

## API Routes

All routes require `Authorization: Bearer {token}` unless noted.
All responses are JSON. HTTP 422 for validation errors, 401 for unauthenticated, 403 for forbidden, 404 for not found.

---

### Authentication

#### `POST /api/auth/register`
No auth required.
**Request:**
```json
{ "username": "string", "password": "string", "password_confirmation": "string" }
```
**Validation:** username 3–30 chars, alphanumeric + underscore, unique; password min 6 chars, confirmed.
**Logic:** Create user; generate Sanctum token; return user + token.
**Response:**
```json
{ "user": { "id": 1, "username": "commander_dan" }, "token": "..." }
```

---

#### `POST /api/auth/login`
No auth required.
**Request:** `{ "username": "string", "password": "string" }`
**Logic:** Find user by username; verify password via `Hash::check`; create Sanctum token.
**Response:** `{ "user": { "id": 1, "username": "..." }, "token": "..." }`
**Errors:** 401 with `{ "message": "Invalid credentials" }`

---

#### `POST /api/auth/logout`
**Logic:** Delete current access token (`$request->user()->currentAccessToken()->delete()`).
**Response:** `{ "message": "Logged out" }`

---

#### `GET /api/auth/me`
**Response:** `{ "id": 1, "username": "commander_dan" }`

---

### Push Tokens

#### `POST /api/push-token`
**Request:** `{ "token": "ExponentPushToken[...]" }`
**Logic:** Update `users.expo_push_token` for the authenticated user.
**Response:** `{ "saved": true }`

---

### Friends

#### `GET /api/friends`
**Logic:** Query `friendships` where `(requester_id = me OR addressee_id = me) AND status = 'accepted'`; for each row resolve the other user's username.
**Response:**
```json
{
  "friends": [
    { "friendship_id": 3, "user": { "id": 5, "username": "battlestar" } }
  ]
}
```

---

#### `GET /api/friends/requests`
**Logic:** Query `friendships` where `addressee_id = me AND status = 'pending'`.
**Response:**
```json
{
  "requests": [
    { "friendship_id": 7, "from_user": { "id": 2, "username": "nova" }, "created_at": "..." }
  ]
}
```

---

#### `POST /api/friends/request`
**Request:** `{ "username": "string" }`
**Logic:**
1. Find target user by username; reject if self.
2. Check no existing friendship record exists between the two users in either direction (any status).
3. Create `friendships` row with `status = 'pending'`, `requester_id = me`.
**Response:** `{ "friendship_id": 7, "status": "pending" }`
**Errors:** 404 user not found; 422 if request/friendship already exists.

---

#### `POST /api/friends/requests/{friendship_id}/accept`
**Logic:** Find friendship where `id = {friendship_id} AND addressee_id = me AND status = 'pending'`; set status = 'accepted'.
**Response:** `{ "friendship_id": 7, "status": "accepted" }`

---

#### `POST /api/friends/requests/{friendship_id}/decline`
**Logic:** Find friendship where `id = {friendship_id} AND addressee_id = me AND status = 'pending'`; set status = 'declined' (or delete the row — either is acceptable).
**Response:** `{ "message": "Declined" }`

---

#### `DELETE /api/friends/{friendship_id}`
**Logic:** Find friendship where `id = {friendship_id} AND (requester_id = me OR addressee_id = me)`; delete it.
**Response:** `{ "message": "Removed" }`

---

#### `GET /api/users/search?q={query}`
**Logic:** `WHERE username LIKE '%{q}%' AND id != me`; limit 20; for each result include friendship status between me and that user (`none`, `pending_sent`, `pending_received`, `accepted`).
**Response:**
```json
{
  "users": [
    { "id": 4, "username": "warlord99", "friendship_status": "none" }
  ]
}
```

---

### Games

#### `GET /api/games`
**Logic:** Join `game_players` (where `user_id = me`) → `games`; compute `alert_state` for each; return summaries (no full `state_json`).

**`alert_state` computation per game:**
| Condition | `alert_state` |
|-----------|--------------|
| `games.status = 'waiting'` | `waiting_for_players` |
| `games.status = 'finished'` | `finished` |
| `games.status = 'active'` AND `current_user_id != me` | `waiting` |
| `games.status = 'active'` AND `current_user_id = me` AND no `turns` row for this `(game_id, user_id, turn_number, round_number)` | `your_turn` |
| `games.status = 'active'` AND `current_user_id = me` AND turn row exists with `in_progress_actions_json IS NOT NULL AND submitted_at IS NULL` | `in_progress` |
| `games.status = 'active'` AND `current_user_id = me` AND turn row exists with `in_progress_actions_json IS NULL` | `your_turn` |

**Response:**
```json
{
  "games": [{
    "id": 1,
    "name": "The Final War",
    "status": "active",
    "play_mode": "async_multiplayer",
    "alert_state": "your_turn",
    "is_my_turn": true,
    "has_in_progress_actions": false,
    "players": [
      { "in_game_name": "Dan", "is_ai": false, "is_eliminated": false },
      { "in_game_name": "Bob", "is_ai": false, "is_eliminated": false }
    ],
    "current_player_name": "Dan",
    "round_number": 3,
    "turn_number": 12,
    "created_at": "2026-05-29T12:00:00Z"
  }]
}
```

---

#### `POST /api/games`
**Request:**
```json
{
  "name": "The Final War",
  "play_mode": "async_multiplayer",
  "map_config": {
    "mapSize": "medium",
    "mapWidth": 286,
    "mapHeight": 286,
    "planetCount": 30,
    "seed": 1748556123456
  },
  "player_slots": [
    { "type": "human", "user_id": null, "name": "Dan" },
    { "type": "human", "user_id": 5, "name": "Bob" },
    { "type": "ai", "difficulty": "normal", "name": "Commander Zorg" }
  ]
}
```
`user_id: null` in slot 0 means the authenticated creator fills that slot.

**Logic:**
1. Validate `play_mode = 'async_multiplayer'` (pass_and_play games are local-only; this endpoint is for async only).
2. Validate all `user_id` fields in human slots (excluding creator) are friends of the creator.
3. Validate player count is 2–8.
4. Validate map config fields are within valid ranges.
5. Create `games` row with `status = 'waiting'`, `state_json = ''` (empty until game starts).
6. Create `game_players` rows for each slot (turn_order = slot index).
7. For each human slot where `user_id != creator`: create `game_invites` row with `status = 'pending'`.
8. If there are no pending invites (all human slots are the creator, or play_mode is pass_and_play): immediately start the game (see "Starting a Game" section below).
9. Send push notification to all invited users.

**Response:** `{ "game": { "id": 1, "status": "waiting", ... }, "invites_sent": [5] }`

---

#### `GET /api/games/{id}`
Must be a player in this game.

**Logic:**
1. Load game + verify requesting user is a `game_players` member.
2. Return `state_json` (last committed state).
3. If `current_user_id = me` and a turn record exists with `in_progress_actions_json != NULL` and `submitted_at IS NULL`: also return `in_progress_actions`.
4. NEVER return another player's in-progress state.

**Response:**
```json
{
  "game": { "id": 1, "name": "...", "status": "active", "play_mode": "async_multiplayer", "round_number": 3, "turn_number": 12 },
  "state_json": "{...}",
  "is_my_turn": true,
  "alert_state": "in_progress",
  "in_progress_actions": {
    "partial_state_json": "{...}",
    "queued_orders": [{ "fromPlanetId": "p-3", "toPlanetId": "p-7", "shipCount": 50 }]
  }
}
```

---

#### `PATCH /api/games/{id}`
Auth required. Caller must be the creator.

**Request:**
```json
{ "name": "string" }
```

**Validation:** Name must be non-empty and max 100 characters.

**Logic:** Update game name. Allowed regardless of game status.

**Response (200):**
```json
{ "game": { "id": 1, "name": "Updated Game Name" } }
```

**Errors:**
- `403` — not the creator
- `422` — validation failure (name empty or too long)

**Client:** `gamesService.updateGameName(id, newName)`; UI updates game name in list state and detail view.

---

#### `DELETE /api/games/{id}`
Auth required. Caller must be in `game_players` for the game (else 403 `{ "message": "Forbidden" }`). Caller must be the creator (`created_by_user_id` / `creator_id` = me; else 403 `{ "message": "Only the creator can delete this game" }`). No status check — deletion allowed in any game status.

**Logic:** Delete game (cascades to game_players, game_invites, turns).

**Response (200):** `{ "message": "Game deleted" }`

**Client:** `gamesService.deleteGame(id)`; Command Center removes the game from list state and drops any local Zustand `GameRecord` with matching `asyncGameId`.

**List/detail field:** `GET /api/games` (and game payloads) should include `created_by_user_id` so the client can show delete only to the creator.

---

### Turns

#### `POST /api/games/{id}/turn/save`
Must be the current player (`current_user_id = me`).

**Request:**
```json
{
  "in_progress_actions": {
    "partial_state_json": "{...full current GameState...}",
    "queued_orders": [{ "fromPlanetId": "p-3", "toPlanetId": "p-7", "shipCount": 50 }]
  }
}
```

**`partial_state_json`** is the full `GameState` as it exists in the client's Zustand store at exit time — this includes all builds and slider changes already applied to the local state, plus any changes from this turn so far.
**`queued_orders`** are fleet dispatches queued but not yet committed via End Turn.

**Logic:**
1. Verify `current_user_id = me` in the games table.
2. Upsert `turns` row for `(game_id, user_id, turn_number, round_number)`.
3. Set `in_progress_actions_json = {request data}`, `started_at = NOW()` (if first save).

**Response:** `{ "saved": true }`

---

#### `POST /api/games/{id}/turn/submit`
Must be the current player.

**Request:**
```json
{
  "actions": [...PlayerAction array from the client's endTurn cycle...],
  "resulting_state": { ...full GameState after endTurn resolution... },
  "turn_number": 12,
  "round_number": 3
}
```

**Logic:**
1. Verify `current_user_id = me`, `games.turn_number = request.turn_number`, `games.round_number = request.round_number`.
2. Basic structural validation of `resulting_state` (has required fields: map, players, fleets, currentPlayerId, status, roundNumber, etc.).
3. Determine the next human player from `resulting_state.currentPlayerId`:
   - Look up `game_players` for the new `currentPlayerId`'s `user_id`.
4. Update `games`:
   - `state_json = JSON(resulting_state)`
   - `current_user_id = next_human_user_id` (or NULL if next player is AI — but the client resolves all AI turns before submitting, so `resulting_state.currentPlayerId` should always be a human)
   - `turn_number += 1`
   - `round_number = resulting_state.roundNumber`
   - `status = 'finished'` if `resulting_state.status = 'finished'`
   - `winner_user_id` = look up the user_id for `resulting_state.winnerId` if finished
5. Update `game_players.is_eliminated` for any newly eliminated players in `resulting_state`.
6. Save `turns` record: `submitted_actions_json = JSON(actions)`, `resulting_state_json = JSON(resulting_state)`, `submitted_at = NOW()`, clear `in_progress_actions_json`.
7. Send push notification to the next human player (or all remaining players if game finished).

**Response:** `{ "success": true }`
**Errors:** 409 if `turn_number` or `round_number` mismatch (stale submission).

---

#### `POST /api/games/{id}/turn/abandon`
Must be the current player.
**Logic:** Find the turns row for `(game_id, user_id, turn_number, round_number)` where `submitted_at IS NULL`; set `in_progress_actions_json = NULL`.
**Response:** `{ "abandoned": true }`

---

### Invites

#### `GET /api/invites`
**Logic:** Query `game_invites` where `invitee_id = me AND status = 'pending'`; join `games` and `users` (inviter).
**Response:**
```json
{
  "invites": [{
    "id": 3,
    "game": { "id": 1, "name": "The Final War" },
    "inviter": { "id": 1, "username": "dan" },
    "created_at": "..."
  }]
}
```

---

#### `POST /api/invites/{id}/accept`
**Logic:**
1. Find invite where `id = {id} AND invitee_id = me AND status = 'pending'`.
2. Set `status = 'accepted'`.
3. Check if all `game_invites` for this game now have `status = 'accepted'` → if so, start the game (see below).
4. Notify the game creator.

**Starting a Game (triggered when all invites accepted or no invites):**
1. Load the game's `map_config_json`.
2. Run the client-equivalent game initialization server-side using a Node.js engine script (see Architecture section):
   - `generateMap(mapConfig)` → produces `GameMap`
   - `placeSpawns(map, playerSlots)` → assigns home planets
   - Build initial `GameState` with all players, fleets=[], roundNumber=1, currentPlayerId=player-0
3. Store the resulting `GameState` as `games.state_json`.
4. Set `games.status = 'active'`, `games.current_user_id` = the first human player's user_id.
5. Update `game_players.home_planet_id` for each human player.
6. Send push notification to the first player.

**Response:** `{ "accepted": true, "game_started": boolean }`

---

#### `POST /api/invites/{id}/decline`
**Logic:** Set invite `status = 'declined'`; set `games.status = 'finished'` (game cannot proceed without all players); notify creator.
**Response:** `{ "declined": true }`

---

## Architecture Notes

### Turn Resolution Strategy
The backend does NOT re-compute game turns in PHP. Instead:

1. The client (TypeScript) runs the full turn cycle via `endTurn` (as currently implemented).
2. The client submits: the `PlayerAction[]` for this turn + the full resolved `GameState`.
3. The backend validates: correct player, correct turn/round numbers, state is structurally valid.
4. The backend stores the submitted state as authoritative.

**Rationale:** This game is for private use among friends. Full server-side engine re-computation would require either a PHP port or a Node.js subprocess — significant complexity for a private app. The client-trust model is appropriate for this scope. Server-side validation can be added later.

### Game Initialization (Node.js Engine Script)
When a game starts (all invites accepted), the map and initial state must be generated server-side so all clients receive the same initial `state_json`. This requires running the TypeScript engine.

**Approach:** Include a compiled copy of `src/game/` as a CLI script in the backend repo (`engine/init-game.js`). Laravel calls it via `Process::run()` or `shell_exec()` with the map config JSON as input; it outputs the initial `GameState` JSON.

The engine directory needs:
- `mapGenerator.ts` (compiled)
- `spawnPlacer.ts` (compiled)
- `turnEngine.ts` (compiled, for initial state construction)
- `types.ts`
- A CLI entry: `engine/init-game.js` — reads `mapConfig + playerSlots` from stdin, writes initial `GameState` to stdout.

### Push Notifications
Use the Expo Push API (`https://exp.host/--/api/v2/push/send`) directly from Laravel.

**Send notification helper:**
```php
function sendPushNotification(string $expoPushToken, string $title, string $body, array $data = []): void {
    Http::post('https://exp.host/--/api/v2/push/send', [
        'to' => $expoPushToken,
        'title' => $title,
        'body' => $body,
        'data' => $data,
        'sound' => 'default',
    ]);
}
```

**Trigger events:**
| Event | Recipient | Title | Body |
|-------|-----------|-------|------|
| Game invite received | Invitee | "Game Invite" | "{username} invited you to a game" |
| Your turn | Next player | "Your Turn!" | "It's your turn in {game name}" |
| Game finished (you won) | Winner | "Victory!" | "You won {game name}!" |
| Game finished (you lost) | Losers | "Defeated" | "You were defeated in {game name}" |
| Invite declined (game cancelled) | Creator | "Game Cancelled" | "{username} declined the invite" |

### Response Envelope
All API responses should use a consistent envelope. Errors:
```json
{ "message": "Human-readable error", "errors": { "field": ["validation message"] } }
```

## Key Rules
- Backend validates all submitted actions — client is never trusted without the correct player/turn checks
- Turn privacy enforced at API level (player B cannot fetch player A's in-progress state)
- State is stored as resolved snapshots; partial in-progress state is stored separately and never exposed to other players
- Pass-and-play games are LOCAL ONLY — they do not sync to the backend; only `asyncMultiplayer` games use the API
- The Sanctum token is stored in the client's AsyncStorage and persists across app sessions (no need to re-login)

## Changelog
- 2026-05-29: Task 137 complete — `src/services/gamesService.ts` implements client-side games/turns/invites API layer (snake_case ↔ camelCase mapping; all endpoints via `apiClient`).
- 2026-05-29: Task 132 complete — `App.tsx` startup auth gate; conditional main/auth stacks; `setOnUnauthorized` → `logout()` on 401. Phase 12 complete.
- 2026-05-29: Task 131 complete — `src/screens/RegisterScreen.tsx` created; field-level API error display; client-side password validation; `App.tsx` Register route wired.
- 2026-05-29: Task 130 complete — `src/screens/LoginScreen.tsx` and `App.tsx` updated; Login/Register routes added to navigation stack.
- 2026-05-29: Task 129 complete — `src/store/authStore.ts` implements auth state (`currentUser`, `token`, `isLoadingAuth`) with `login`/`register`/`logout`/`loadStoredAuth`; token stored in AsyncStorage.
- 2026-05-29: Task 128 complete — `src/services/apiClient.ts` implements the base API client (fetch wrapper, auth token injection, `ApiError`, `setOnUnauthorized`).
- 2026-05-29: Full backend spec written — all tables, routes, auth, friends, games, turns, invites, push notifications. Phase 12 planning complete.
- 2026-05-27: File created. Not yet in scope.
