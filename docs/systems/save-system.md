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

## Changelog
- 2026-05-27: File created. Not yet in scope.
