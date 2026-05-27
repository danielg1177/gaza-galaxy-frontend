# Architecture

## Overview
Strategic Commander is an asynchronous turn-based strategy game. The client is an Expo React Native app (iPhone only). The backend is a Laravel API.

## High-Level Architecture
```
[iPhone App]  ←→  [Laravel API]  ←→  [MySQL DB]
    ↓
[Expo Notifications]
```

## Frontend Structure
```
/
├── App.tsx                  — root component
├── index.ts                 — entry point
├── src/
│   ├── game/                — pure game engine (no React)
│   │   ├── types.ts         — all shared TypeScript types
│   │   ├── mapGenerator.ts  — galaxy map generation
│   │   ├── spawnPlacer.ts   — fair home planet placement
│   │   ├── turnEngine.ts    — turn resolution orchestrator
│   │   ├── productionEngine.ts — planet production
│   │   ├── movementEngine.ts   — fleet transit
│   │   ├── combatEngine.ts     — battle resolution
│   │   ├── aiEngine.ts         — AI player logic
│   │   ├── validationEngine.ts — action validation
│   │   └── index.ts            — barrel export
│   ├── screens/             — React Native screens (not yet created)
│   ├── components/          — reusable UI (not yet created)
│   └── store/               — Zustand state (not yet created)
└── docs/                    — all documentation
```

## Key Architectural Constraints
- `src/game/` is pure TypeScript — zero React/RN imports allowed
- Game engine must be deterministic (seeded RNG, no bare `Math.random()`)
- Backend is the authoritative source of truth for all game state
- Client submits intended actions; backend computes resulting state
- Turn privacy enforced server-side

## State Management
- Client: Zustand (lightweight, no Redux boilerplate)
- Persistent: Server `state_json` column
- Client cache: AsyncStorage for session/token only

## Backend (future — not yet built)
- Laravel + Sanctum + MySQL
- REST API, JSON game state
- See `docs/systems/backend-api.md`

## Changelog
- 2026-05-27: File created. Reflects state after Tasks 1–2.
