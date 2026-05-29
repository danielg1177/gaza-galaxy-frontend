# Architectural Decisions

This file records significant design decisions with rationale. Never delete entries — mark superseded decisions as obsolete with a note.

---

## 2026-05-27 — Tech Stack Selected
**Decision:** Expo React Native + TypeScript for frontend; Laravel + Sanctum + MySQL for backend.
**Rationale:** Expo enables rapid iPhone-only development with TestFlight distribution. Laravel is familiar and well-suited for async game state APIs.
**Alternatives considered:** Flutter (rejected — team unfamiliarity), SwiftUI (rejected — cross-platform not needed but Expo simplifies build pipeline).

---

## 2026-05-27 — Game Engine Isolation
**Decision:** All game logic lives in `src/game/`. No React or React Native imports allowed in that directory.
**Rationale:** Keeps game logic testable, portable, and reusable on the backend for future server-side validation.

---

## 2026-05-27 — Deterministic Engine
**Decision:** Game engine must be deterministic. Seeded RNG required — no bare `Math.random()`.
**Rationale:** Enables replay, debugging, and future backend re-simulation of turns.

---

## 2026-05-27 — Backend as Source of Truth
**Decision:** Backend computes all game state. Clients submit intended actions only.
**Rationale:** Prevents cheating, enables turn privacy, simplifies conflict resolution in async multiplayer.

---

## 2026-05-27 — State Management: Zustand
**Decision:** Zustand for client-side state management.
**Rationale:** Lightweight, minimal boilerplate, appropriate for this scale. Redux is overkill.

---

## 2026-05-28 — Round-Gated Simulation Tick
**Decision:** Treat one round as a full cycle of all active players, and execute round-gated simulation (`advanceFleets`, `runProduction`, building activation checks) only on turn-order wrap, not on every individual player turn.
**Rationale:** Keeps fleet ETA, production cadence, and construction activation aligned with game design semantics and prevents per-player over-ticking in multi-player matches.

---

## 2026-05-29 — Forfeited Planets on Elimination
**Decision:** When a player is eliminated by home-planet conquest, their remaining owned planets become neutral with `shipCount: 0` but **buildings remain intact**. The next fleet to arrive claims the planet and inherits existing structures.
**Rationale:** Preserves strategic value in conquered territory without requiring a separate "ruined planet" state; simplifies capture logic (neutral arrival path already assigns ownership and garrison).

---

## 2026-05-29 — Zone-Based Starting Planet Placement
**Decision:** Replace the 200-candidate scored-random spawn search with zone-based seeded-random placement: humans draw from edge-adjacent bands first; AIs draw from interior quadrants plus the full edge pool afterward.
**Rationale:** The scoring algorithm produced technically fair but unpredictable edge/corner placements that did not match design intent — humans should start near (but not at) map edges so the centre remains contested territory, with variety across seeds rather than converging on the same scored optimum. Zones make that intent explicit and easier to tune.
**Alternatives considered:** Retaining scored-random with adjusted weights (rejected — still optimizes a composite metric rather than regional randomness); fixed spawn points per side (rejected — too predictable across games).

---

## 2026-05-29 — AI Memory Stored in GameState (not backend)
**Decision:** `AiPlayerState` (fog-of-war memory, strategic phase) lives as `GameState.aiStates` — a plain serialisable field alongside map, players, and fleets.
**Rationale:** The game engine is pure TypeScript with no backend dependency. Storing AI state in `GameState` means it round-trips through `state_json` automatically when the backend is built, and the same `computeAiTurn` function runs identically client-side (pass-and-play) and server-side (async multiplayer). No backend-specific AI storage layer is needed.
**Alternatives considered:** Server-side AI state separate from game state (rejected — adds coupling and delays local play improvements); recomputing observation fresh every turn without persistence (rejected — AI would have no memory between turns).

---

## 2026-05-29 — Human Build Flow Stays Store-Direct; AI Uses PlayerAction
**Decision:** Human players continue to build via store-direct `queueBuildOrder` (for immediate UI gold deduction and feedback). AI players issue `BUILD` and `SET_PRODUCTION_SLIDER` as `PlayerAction` entries processed by `resolveTurn`.
**Rationale:** The human path benefits from optimistic UI updates (gold visibly deducted before End Turn). Adding `BUILD`/`SET_PRODUCTION_SLIDER` to `PlayerAction` gives the AI a clean, backend-compatible way to issue economy decisions without restructuring the human flow. When the backend validates actions server-side, human builds will eventually route through the same `PlayerAction` path.
**Alternatives considered:** Giving the AI direct state mutation access (rejected — bypasses validation and is not backend-portable); routing human builds through `PlayerAction` immediately (deferred — requires rework of the human UI queue system).

---

## Changelog
- 2026-05-29: Added AI memory storage and human/AI build-flow decisions.
- 2026-05-29: Added zone-based starting planet placement decision (Task 127).
- 2026-05-29: Added forfeited-planet design decision (Task 126).
- 2026-05-28: Added round-gated simulation tick decision (Task 57).
- 2026-05-27: File created with initial decisions.
