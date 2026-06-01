# Architectural Decisions

This file records significant design decisions with rationale. Never delete entries — mark superseded decisions as obsolete with a note.

---

## 2026-05-31 — AI Difficulty Standardized to Hard
**Decision:** Remove the AI difficulty selector from game setup and always initialize AI players with `difficulty: 'hard'`.
**Rationale:** Simplifies setup UX and avoids low-challenge accidental configurations; current design intent is that all AI opponents play with the strongest available behavior profile.
**Alternatives considered:** Keep selector (rejected — extra setup complexity and inconsistent challenge level); per-mode defaults with optional override (rejected for now — unnecessary UI surface).

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

---

## 2026-05-29 — Client-Side Turn Resolution (Backend Trust Model)

**Decision:** The client runs all turn resolution locally (existing `endTurn` logic) and submits the full resulting `GameState` to the backend. The backend validates player identity, turn/round numbers, and state structure — but does NOT re-compute the turn in PHP.

**Rationale:** This game is for private use among a known group of friends. Full server-side engine re-computation would require either a PHP port of the TypeScript engine (massive duplication) or a Node.js subprocess (significant additional infrastructure). For the private-use scope, client-trust is appropriate. Cheating prevention is not a concern in this context.

**Alternatives considered:** Full PHP engine port (rejected — high cost, drift risk); Node.js engine microservice (deferred — can be adopted later if needed); GraphQL mutations (rejected — REST is simpler for this use case).

**Future path:** If the game ever opens to untrusted players, the Node.js engine CLI script approach can be added: compile `src/game/` to a CLI, have Laravel call it via `Process::run()` to re-validate the submitted state.

---

## 2026-05-29 — Pass-and-Play Remains Local Only

**Decision:** Pass-and-play games do NOT sync to the backend. They remain in-memory in Zustand only, lost on app restart. Only `asyncMultiplayer` games use the API.

**Rationale:** Pass-and-play is a same-device, same-session experience. Persisting it server-side adds complexity (auth requirement for a casual local mode) with minimal benefit. Users who want persistence should use async multiplayer.

---

## 2026-05-29 — Mid-Turn Save Uses Full Partial GameState Snapshot

**Decision:** The mid-turn save payload (`in_progress_actions_json`) contains the full current `GameState` snapshot as it exists in Zustand (with all mutations applied: builds, slider changes) PLUS the `queuedOrders` array (uncommitted fleet dispatches).

**Rationale:** The current architecture applies builds and slider changes directly to the Zustand store (not as queued actions). This means there is no clean action-replay log to reconstruct the partial turn. Saving the full state snapshot is the only reliable way to restore exactly what the player was seeing. The payload is a compressed JSON blob — acceptable for this use case.

**Alternatives considered:** Track all in-turn mutations as a replay log (deferred — requires significant store refactor; worthwhile if we ever add proper undo functionality); save only queuedOrders and re-derive builds from state delta (rejected — fragile and complex).

---

## 2026-05-29 — Username as Primary Identifier (No Email)

**Decision:** Users register with username + password only. No email address is collected.

**Rationale:** This is a private game among friends. Email-based account recovery is not needed. Username-only registration is simpler and avoids collecting unnecessary PII for a private tool.

**Trade-off:** No password reset mechanism. If a user forgets their password, an admin must manually reset it in the database. Acceptable for a private group.

---

## 2026-05-29 — Game Initialization Runs on Backend via Node.js CLI

**Decision:** When a new async multiplayer game starts (all invites accepted), the initial `GameState` is generated by the backend calling a compiled Node.js CLI script wrapping `src/game/mapGenerator.ts` + `src/game/spawnPlacer.ts`. Laravel calls the script via `Process::run()`, passing map config on stdin and receiving the initial `GameState` JSON on stdout.

**Rationale:** The initial game state must be generated server-side so all clients receive the identical seed-deterministic map. The Node.js CLI script reuses the existing TypeScript engine without porting to PHP. It only needs to run once per game (at creation), so a subprocess call is acceptable.

**Alternatives considered:** Client generates and uploads initial state (rejected — allows manipulation of home planet placement); PHP re-implementation of mapGenerator (rejected — high cost, drift risk).

---

## Changelog
- 2026-05-29: Added Phase 12 backend integration architectural decisions (client-trust model, pass-and-play local-only, mid-turn save format, username-only auth, game init via Node.js CLI).
- 2026-05-29: Added AI memory storage and human/AI build-flow decisions.
- 2026-05-29: Added zone-based starting planet placement decision (Task 127).
- 2026-05-29: Added forfeited-planet design decision (Task 126).
- 2026-05-28: Added round-gated simulation tick decision (Task 57).
- 2026-05-27: File created with initial decisions.
