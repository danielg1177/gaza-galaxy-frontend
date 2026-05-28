# Multiplayer System

## Status
**Not yet planned for implementation.** Local single-player game engine comes first.

## Overview
Async turn-based multiplayer via a Laravel backend. Players submit turns independently.

## Play Modes

Matches store a `playMode` on `GameState` (set from `GameConfig` at creation):

| Value | UI label | Description |
|-------|----------|-------------|
| `passAndPlay` | Pass & Play | Multiple humans share one device; turns hand off on the same screen. Default for new campaigns. |
| `asyncMultiplayer` | Async Multiplayer | Each player uses their own device; turns submit independently when it is their turn. Requires the Laravel backend (Phase 4). **Not yet functional** — selectable in setup for future wiring only. |

## Architecture
- Backend is authoritative source of truth
- Clients submit intended actions; backend computes resulting state
- Players cannot see other players' in-progress turn actions
- Turn privacy enforced server-side (never trust frontend-only restrictions)

## Player Accounts
- Email/password authentication via Laravel Sanctum
- Future: Apple Sign In

## Game Lobby
- Players need: login, friends/invites, active games list
- Game creator selects player count, map settings

## Turn Flow
1. Player A opens app → sees it is their turn
2. Player A submits actions
3. Backend validates and resolves turn
4. Backend advances turn to Player B
5. Push notification sent to Player B

## Turn Privacy
- If it is Player A's turn, Player B's client must receive only the last committed state
- Player B cannot see Player A's planned moves even if they open the app mid-turn

## Backend Tables (planned)
| Table         | Key Columns                                                  |
|---------------|--------------------------------------------------------------|
| users         | id, name, email, password                                    |
| games         | id, status, current_player_id, turn_number, state_json, winner_player_id |
| game_players  | id, game_id, player_id, team/color, eliminated, turn_order   |
| turns         | id, game_id, player_id, turn_number, submitted_actions_json, resulting_state_json |

## Changelog
- 2026-05-27: Task 21 — PlayMode type added; mode selector in setup form.
- 2026-05-27: File created. Not yet in scope.
