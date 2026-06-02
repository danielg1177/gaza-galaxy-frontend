# Save System

## Status
**Phase 15 complete — async game state persistence via backend. Phase 23 planned — local game persistence via AsyncStorage.**

## Overview

### Pass-and-Play and Solo (AsyncStorage persisted)
Pass-and-play and solo games are persisted to the device via Zustand's `persist` middleware backed by AsyncStorage. The `games[]` array (local records only — `asyncGameId == null`) is written to AsyncStorage under the key `'gaza-galaxy-local-games'` and reloaded automatically on every app start. On first launch after the app rename, data is migrated once from the legacy key `'strategic-commander-local-games'`. Games survive app restarts and appear in the Solos / Pass & Play lobby sections exactly as the user left them.

### Async Multiplayer (backend persisted)
Async multiplayer games are persisted on the Laravel backend. The client uses:
- **Backend `state_json`** — authoritative game state (full `GameState` JSON)
- **Backend `in_progress_actions_json`** — mid-turn save state (partial)
- **AsyncStorage** — auth token + last-fetched state cache (non-authoritative)

---

## State Architecture

### Authoritative State (Backend)
```
games.state_json          — last fully committed GameState (JSON string)
turns.in_progress_actions_json — mid-turn save blob (partial state + queued orders)
```

The `state_json` only advances when a human player submits their completed turn via `POST /api/games/{id}/turn/submit`.

### Client State (Zustand)
The Zustand `gameStore` continues to be the single source of truth for the active game UI. For async games:
- On game open: client fetches `GET /api/games/{id}` and loads `state_json` into the Zustand store
- If `in_progress_actions` is present: also restore the partial state and queued orders
- All in-game interactions continue to work exactly as they do today (no API calls during gameplay)
- On End Turn: client runs `endTurn` locally (as today), then submits via API before returning to HomeScreen

### AsyncStorage (Client Cache)
| Key | Value | Purpose |
|-----|-------|---------|
| `auth_token` | Sanctum token string | Persistent login (never re-auth) |
| `current_user` | `{ id, username }` JSON | Quick access without API call |

The client does NOT cache `state_json` in AsyncStorage — the backend is always fetched fresh on game open.

---

## Multi-Game Store

The Zustand `gameStore` currently supports multiple simultaneous local campaigns via `GameRecord[]`. With backend integration:

- Local pass-and-play `GameRecord`s remain as-is (in-memory only)
- Async multiplayer games are fetched from the API on HomeScreen load; they are NOT stored in Zustand's `games[]` array permanently — they are loaded on-demand when the user opens a game
- When an async game is opened, its state is loaded into the active `GameRecord` slot as it is today

---

## Mid-Turn Save/Resume

### Save (when player exits mid-turn)

The player taps "Exit Game" from the ⋮ menu. The client:
1. Reads the current Zustand `GameState` (with all mutations from this turn: builds, slider changes, and queued orders already applied to local state)
2. Reads the current `queuedOrders` array (fleet dispatches not yet committed)
3. Calls `POST /api/games/{id}/turn/save` with:
   ```json
   {
     "in_progress_actions": {
       "partial_state_json": "<serialized current GameState>",
       "queued_orders": [{ "fromPlanetId": "...", "toPlanetId": "...", "shipCount": 50 }]
     }
   }
   ```
4. On success: navigates back to HomeScreen

**What `partial_state_json` includes:**
- The full `GameState` as it sits in the Zustand store, including all build orders placed this turn (with `builtOnRound = currentRound`), all production slider changes, all previously committed in-turn state changes. This is NOT the last committed backend state — it is the current working state.
- The `queued_orders` captures fleet dispatches that have been staged but not yet run through `endTurn`.

### Resume (when player reopens the game)

1. Client calls `GET /api/games/{id}`
2. Response includes both `state_json` (last committed) and `in_progress_actions` (if saved)
3. If `in_progress_actions.partial_state_json` is present:
   - Load `partial_state_json` as the game state (NOT `state_json`)
   - Restore `queued_orders` into the Zustand store
   - Player sees their game exactly as they left it
4. If no `in_progress_actions`: load `state_json` as normal (fresh turn start)

---

## Turn Submission Flow

When `endTurn` is called on an async multiplayer game:
1. Client runs the existing `endTurn` logic completely (resolves human turn + all AI turns until next human)
2. Captures the resulting `GameState` and the list of `PlayerAction[]` for this human's turn
3. Calls `POST /api/games/{id}/turn/submit`
4. On HTTP 200: navigate back to HomeScreen (or stay in-game showing the committed state)
5. On HTTP 409 (stale turn): show error "Game state is out of sync — please reload" and refresh

---

## HomeScreen Game List

### Async Games
Fetched from `GET /api/games` on every HomeScreen focus event. Each entry includes `alert_state`:
- `your_turn` — show bold indicator, high contrast card
- `in_progress` — show orange badge "In Progress"
- `waiting` — **Waiting...** badge, muted style, card not tappable (`!isMyTurn`)
- `waiting_for_players` — show muted "Waiting for players..." label
- `finished` — show "VICTORY" (green) or "DEFEAT" (red) label

### Local Pass-and-Play and Solo Games
Read from Zustand `games[]`. Rehydrated from AsyncStorage on app start (via Zustand `persist`). The HomeScreen suppresses the local sections until `_hasHydrated` is `true` to prevent an empty-list flash.

Each `GameRecord` may carry an optional `pendingTurnReport?: TurnEvent[]` — the battle-report events from the most recently completed turn that the player has not yet dismissed.

| Lifecycle step | Behaviour |
|----------------|-----------|
| **Write** | `endTurn()` sets `pendingTurnReport` on the active local `GameRecord` to the same `TurnEvent[]` written to in-memory `turnReport`. Because `partialize` already persists `games[]`, the report survives app exit without widening the persist slice. |
| **Restore** | `loadGame(id)` copies `record.pendingTurnReport` into `turnReport` (or `[]` if absent) so `GameScreen` can auto-open the battle report modal, then removes `pendingTurnReport` from that record in the same `set()` call. |
| **Clear** | When the player dismisses the battle report modal, `clearPendingTurnReport()` sets `turnReport: []` and strips `pendingTurnReport` from the active `GameRecord`. |

Async multiplayer games do not use this field (`loadAsyncGame` unchanged; async records are excluded from `partialize`).

### Combined List
HomeScreen shows both lists merged, with async games appearing first. A section header distinguishes them if both types are present.

---

## Changelog
- 2026-06-01: Async lobby — `waiting` (`!isMyTurn`) cards non-tappable; only `your_turn` / `in_progress` open the game.
- 2026-06-01: App rename — persist key `gaza-galaxy-local-games`; legacy `strategic-commander-local-games` migrated on first persist read via `ensureStorageMigrated` (must not block `registerRootComponent` in `index.ts`).
- 2026-06-01: Task 187 complete — `GameRecord.pendingTurnReport` persists undismissed battle reports for local games; `loadGame` restores to `turnReport`; `clearPendingTurnReport` on modal dismiss.
- 2026-05-31: Phase 23 planned — Tasks 165–166 added. Local games (Pass & Play + Solo) will persist via Zustand `persist` + AsyncStorage. `save-system.md` updated to reflect the new architecture.
- 2026-05-29: Task 146 complete — async open fetches fresh state before navigate; read-only spectator when `alert_state === 'waiting'`.
- 2026-05-29: Task 145 complete — `gameStore.endTurn` async path: snapshots queued fleet orders as `PlayerAction[]`, calls `submitTurn` with actions + resulting state + turn/round numbers; `isSubmittingTurn` flag drives "Submitting turn…" overlay in `GameScreen`; `shouldReturnHome` triggers navigation on success; pass-and-play endTurn unchanged.
- 2026-05-29: Task 144 complete — `loadAsyncGame` branches on `inProgressActions.partialStateJson`: mid-turn restore loads partial state + fleet queue; normal open loads committed `state_json` only.
- 2026-05-29: Task 143 complete — `GameScreen` ⋮ **Exit Game** serializes active `GameState` + `queuedOrders` and calls `saveTurnProgress`; loading spinner on menu item; `Alert` on failure; navigates home on success via `resetGame()`.
- 2026-05-29: Task 141 complete — `gameStore.loadAsyncGame` loads API `ApiGameDetail` into active `GameRecord` (mid-turn `partialStateJson` + `queuedOrders` restore); HomeScreen fetches async list via `listGames()` on focus and opens games via `getGame()` + navigate.
- 2026-05-29: Full backend integration plan written — auth token persistence, mid-turn save/resume format, turn submission flow, HomeScreen game list architecture. Phase 15 planning complete.
- 2026-05-28: Task 64 — `getLocalHumanPlayerId` drives `buildVisibleState` viewing player (pass-and-play aware).
- 2026-05-27: Task 19 — multi-game store; `GameRecord`; lobby `HomeScreen`.
- 2026-05-27: File created. Not yet in scope.
