# Backend API System

## Status
**Not yet planned for implementation.**

## Overview
Laravel REST API with Sanctum authentication. JSON-based game state storage.

## Tech Stack
- Laravel
- Sanctum authentication
- MySQL
- API-first architecture
- `state_json` column for game state

## Planned Endpoints (draft)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/games
POST   /api/games
GET    /api/games/{id}
POST   /api/games/{id}/turn
GET    /api/games/{id}/state

GET    /api/users/{id}/invites
POST   /api/users/{id}/invites
```

## Key Rules
- Backend validates all submitted actions — client is never trusted
- Turn privacy enforced at API level (player B cannot fetch player A's in-progress state)
- State is always stored as resolved snapshots, never partial/speculative

## Future Additions (not now)
- WebSockets via Laravel Reverb
- Queues and Horizon
- Spectator endpoints

## Changelog
- 2026-05-27: File created. Not yet in scope.
