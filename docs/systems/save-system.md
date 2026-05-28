# Save System

## Status
**Not yet planned for implementation.**

## Overview
Game state persisted on the backend as JSON. Client uses AsyncStorage only for session/cache data (not authoritative game state).

## Architecture
- Authoritative state: server `state_json` column in `games` table
- Client cache: AsyncStorage for session tokens and last-known game state
- Client never writes game state directly to persistent storage

## Local (Offline) Prototype
For initial local development/testing, game state is held in-memory in Zustand. No persistence until backend is integrated.

### Multi-game store (client)
The Zustand `gameStore` supports multiple simultaneous local campaigns:

| Field / API | Role |
|-------------|------|
| `GameRecord` | `{ id, name, state: GameState, config: GameConfig }` — one row per campaign |
| `games: GameRecord[]` | All in-memory campaigns |
| `activeGameId: string \| null` | Which record `GameScreen` and actions target |
| `loadGame(id)` | Sets `activeGameId` so the player resumes that campaign |
| `deleteGame(id)` | Removes a record; clears `activeGameId` if it matched |
| `getActiveRecord()` | Returns `games.find(g => g.id === activeGameId) ?? null` |

`startNewGame` appends a new `GameRecord` (id from `Date.now().toString()`, name `Game N`) and sets it active. `selectPlanet`, `queueOrder`, `endTurn`, `getVisibleGameState`, and `resetGame` operate on the active record only. **UI:** `GameScreen` uses `useVisibleGameState()` (memoized fog-of-war snapshot); do not subscribe with `useGameStore((s) => s.getVisibleGameState())` — that returns a new object every read and triggers React 19 infinite re-renders. Fog projection uses exported `getLocalHumanPlayerId(state)` — current human on their turn, otherwise the first human (during AI turns). `resetGame` calls `deleteGame` for the active id and clears selection and `queuedOrders`.

`HomeScreen` is a lobby: lists `games`, tap to `loadGame` + navigate to `Game`; "New Campaign" opens the setup form.

Persistence (AsyncStorage / backend) is not wired yet; restarting the app clears all records.

## Changelog
- 2026-05-28: Task 64 — `getLocalHumanPlayerId` drives `buildVisibleState` viewing player (pass-and-play aware).
- 2026-05-27: Task 19 — multi-game store; `GameRecord`; lobby `HomeScreen`.
- 2026-05-27: File created. Not yet in scope.
