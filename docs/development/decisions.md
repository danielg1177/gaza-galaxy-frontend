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

## Changelog
- 2026-05-28: Added round-gated simulation tick decision (Task 57).
- 2026-05-27: File created with initial decisions.
