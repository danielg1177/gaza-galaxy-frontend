# Roadmap

## Phase 1 — Local Game Engine (complete)
- [x] Folder structure
- [x] Core types/interfaces
- [x] Deterministic map generator
- [x] Fair spawn placement
- [x] Turn engine
- [x] Planet production
- [x] Fleet movement
- [x] Combat resolver
- [x] Simple AI
- [x] Playable local screen (MVP)

## Phase 2 — Core Rules & Engine Redesign (next)
- [ ] Task 11: Rework movement system (clicks — range, speed, research scaling)
- [ ] Task 12: Rework production system (building slots, factories, research labs, gold/troops slider, class values)
- [ ] Task 13: Round-based simultaneous resolution (fleets never arrive same round sent)
- [ ] Task 14: Fog of war (information hiding between players)
- [ ] Task 15: Planet ownership persists without troops
- [ ] Task 16: Research level system (levels 1–15)
- [ ] Task 17: Random planet names
- [ ] Task 18: Random AI player names

## Phase 3 — UI/UX Overhaul
- [ ] Task 19: Multi-game lobby home screen (load/new game, turn alerts)
- [ ] Task 20: Remove map seed from new game setup (auto-generate)
- [ ] Task 21: Pass-and-play vs. async multiplayer mode selection
- [ ] Task 22: Support up to 8 players (human + AI) with configurable AI difficulty
- [ ] Task 23: Pinch-to-zoom map
- [ ] Task 24: Drag-to-move fleet UX
- [ ] Task 25: In-transit fleet position visualization (SVG lines + moving markers)
- [ ] Task 26: Cancel in-transit fleet (same turn only)
- [ ] Task 27: End Turn button + multiple fleet orders per turn
- [ ] Task 28: Pass-and-play screen blanking between turns

## Phase 4 — Async Multiplayer & Notifications
- [ ] Task 29: Push notifications for turn alerts
- [ ] Task 30: Backend persistence and async game state sync
- [ ] Laravel project setup
- [ ] Auth (register/login via Sanctum)
- [ ] Game state API
- [ ] Turn submission endpoint
- [ ] Turn privacy enforcement

## Future / Optional
- Replays
- Statistics
- Spectator mode
- Diplomacy
- ~~Custom map seeds~~ (removed by design — maps auto-generate)
- Ranked AI difficulties beyond Hard
- Alliance system

## Changelog
- 2026-05-27: Roadmap overhauled — Phase 1 marked complete, Phases 2–4 rewritten to match design review tasks 11–30.
- 2026-05-27: File created. Phase 1 in progress.
