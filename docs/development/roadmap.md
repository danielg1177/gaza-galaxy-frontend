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

## Phase 12 — Auth Layer (Client)
- [ ] Task 128: API client base layer (`src/services/apiClient.ts`)
- [ ] Task 129: Auth store + AsyncStorage token persistence
- [ ] Task 130: LoginScreen
- [ ] Task 131: RegisterScreen
- [ ] Task 132: App startup auth gate (token check → Login or HomeScreen)

## Phase 13 — Friends System (Client)
- [ ] Task 133: Friends service layer (`src/services/friendsService.ts`)
- [ ] Task 134: FriendsScreen (friend list + pending requests)
- [ ] Task 135: User search by username
- [ ] Task 136: Send/accept/decline friend requests
- [ ] Task 137: Pending friend request badge in HomeScreen nav

## Phase 14 — Async Game Setup (Client)
- [ ] Task 138: Games service layer (`src/services/gamesService.ts`)
- [ ] Task 139: Username default in game setup (slot 0 = current user's username)
- [ ] Task 140: Friend picker for human slots in async game creation
- [ ] Task 141: Game invites modal/screen (accept/decline pending invites)
- [ ] Task 142: Async games list in HomeScreen from API
- [ ] Task 143: Turn alert badges on async game cards

## Phase 15 — In-Game Async Integration (Client)
- [ ] Task 144: Exit Game in ⋮ menu + mid-turn save to API
- [ ] Task 145: Mid-turn state restoration on async game open
- [ ] Task 146: Async endTurn — submit via API + navigate home
- [ ] Task 147: Async game state fetch on open (load latest `state_json`)

## Phase 16 — Push Notifications (Client)
- [ ] Task 148: Expo push token registration + API upload on startup
- [ ] Task 149: Notification deep-link handler (tap notification → open game)

## Phase 23 — Persist Local Games to AsyncStorage
- [ ] Task 165: Zustand `persist` middleware on `gameStore.games[]` — AsyncStorage backend, local-only filter, `_hasHydrated` flag
- [ ] Task 166: HomeScreen hydration guard — suppress Solos / Pass & Play sections until `_hasHydrated`

## Future / Optional
- Replays
- Statistics
- Spectator mode
- Diplomacy
- ~~Custom map seeds~~ (removed by design — maps auto-generate)
- Ranked AI difficulties beyond Hard
- Alliance system
- Server-side game engine validation (Node.js CLI wrapping TypeScript engine)
- In-app notification banner for foreground notifications
- Inactivity reminders (push after N days with no turn)

## Changelog
- 2026-05-31: Phase 23 added — persist local games (Pass & Play / Solo) to AsyncStorage (Tasks 165–166).
- 2026-05-29: Phases 12–16 added — full backend integration client-side plan (Tasks 128–149).
- 2026-05-27: Roadmap overhauled — Phase 1 marked complete, Phases 2–4 rewritten to match design review tasks 11–30.
- 2026-05-27: File created. Phase 1 in progress.
