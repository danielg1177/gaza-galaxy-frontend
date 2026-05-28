# Strategic Commander Modern Remake — Project Specification

## Project Overview

This project is a private modern remake/inspired recreation of the Palm OS game “Strategic Commander”.

The goal is NOT commercial release. The app is intended only for private use among friends on iPhone devices.

The original game was a turn-based asynchronous space strategy game where players capture planets, research technology, build fleets, and eliminate opponents by capturing their home planets.

This remake should preserve the original gameplay feel while modernizing:

* multiplayer
* UI/UX
* AI quality
* game balance
* map generation
* notifications
* private asynchronous play

The AI agent is expected to perform nearly all implementation work.

The human operator (Daniel) primarily acts as:

* architecture reviewer
* tester
* gameplay reviewer
* prompt/controller

The AI should:

* read and maintain all documentation
* update markdown docs as implementation evolves
* keep architecture clean
* isolate game logic from UI
* avoid unnecessary complexity
* prefer maintainability over cleverness

---

# Tech Stack

## Frontend

Use:

* Expo React Native
* TypeScript
* React Navigation
* Zustand or lightweight state management
* Expo Notifications
* AsyncStorage only for caching/session data

Do NOT use:

* Flutter
* SwiftUI
* Vue Native
* unnecessary native modules

The app is iPhone-only.

---

## Backend

Use:

* Laravel
* Sanctum authentication
* MySQL
* API-first architecture
* JSON-based game state storage

Potential future additions:

* WebSockets
* Laravel Reverb
* queues
* Horizon

But avoid unnecessary infrastructure initially.

---

# Deployment / Distribution

Use:

* Apple TestFlight
* Private beta distribution only

No public App Store release required.

---

# Core Gameplay

## High-Level Gameplay Loop

The game is asynchronous turn-based multiplayer.

Games may last:

* days
* weeks
* months

Players submit turns independently.

Only the active/current player may interact with the game state.

Other players:

* cannot see current in-progress moves
* cannot spectate active turn actions
* cannot inspect hidden planning state

The backend is the authoritative source of truth.

---

# Original Strategic Commander Mechanics

## Objective

Capture all enemy home planets.

When a player's home planet is captured:

* that player is eliminated
* their owned planets become neutral/unowned

Last remaining player wins.

---

# Planet System

Each planet has:

* position
* owner
* planet class
* ship count
* buildings
* production values

## Planet Classes

Planet classes run **A through P** (16 grades). A is the best, P is the weakest.

Each step down reduces troop output by 1/16 and gold output by 50/16 (3.125) per factory per turn:

| Class | Troops/factory/turn | Gold/factory/turn |
|-------|--------------------|--------------------|
| A | 1.0 | 50.0 |
| B | 0.9375 | 46.875 |
| C | 0.875 | 43.75 |
| D | 0.8125 | 40.625 |
| E | 0.75 | 37.5 |
| F | 0.6875 | 34.375 |
| G | 0.625 | 31.25 |
| H | 0.5625 | 28.125 |
| I | 0.5 | 25.0 |
| J | 0.4375 | 21.875 |
| K | 0.375 | 18.75 |
| L | 0.3125 | 15.625 |
| M | 0.25 | 12.5 |
| N | 0.1875 | 9.375 |
| O | 0.125 | 6.25 |
| P | 0.0625 | 3.125 |

Better planets produce faster and generate more resources. Research speed is NOT affected by planet class.

---

# Buildings

## Manufacturing Facility

Responsible for:

* ship production
* resource generation

Should support allocation sliders:

* ships
* resources
* mixed allocation

---

## Research Facility

Increases technology progression.

Technology improves:

* combat strength
* possibly movement speed

---

# Combat

Combat is automatic.

Important combat factors:

* ship count
* technology level
* possible defense bonus
* randomness

The remake does NOT need exact original formulas.

Gameplay feel is more important than exact replication.

---

# Fleet Movement

Players send fleets:

* from planet
* to planet

Movement likely consumes turns/time.

Fleet arrival:

* empty planet -> capture
* enemy planet -> combat

---

# Modern Improvements Required

## 1. Turn Privacy

Critical requirement.

If it is Player A's turn:

* Player B must NOT be able to open the app and see Player A’s planned moves.
* Player B should only see:

  * completed historical state
  * waiting-for-turn status
  * notifications
  * possibly public map information

The backend must enforce this.

Never trust frontend-only restrictions.

---

## 2. Push Notifications

Required.

Notify users when:

* it becomes their turn
* a game finishes
* they are eliminated
* optional reminders for inactive turns

Use:

* Expo push notifications initially

---

## 3. Stronger AI

The original game's AI was weak.

This remake should support:

* significantly improved AI
* modular AI logic
* multiple difficulty levels

AI architecture should be isolated and extensible.

Potential future AI approaches:

* heuristic AI
* weighted decision systems
* Monte Carlo approaches
* GPT-assisted AI experiments
* server-side AI simulations

The initial implementation should use:

* heuristic/scoring-based AI

---

# Critical Map Generation Improvements

This is one of the MOST IMPORTANT requested improvements.

The original game had poor starting placement logic.

Problems included:

* human players spawning adjacent
* players spawning in the center
* unfair expansion opportunities
* unbalanced map symmetry

The remake MUST implement improved spawn balancing.

---

# Required Spawn Logic

Human players should:

* start reasonably spaced apart
* avoid immediate adjacency
* avoid being trapped
* avoid unfair center dominance

The generator should:

* score spawn fairness
* regenerate maps if fairness thresholds fail

Potential metrics:

* minimum distance between home planets
* nearby resource density
* nearby expansion count
* center bias penalty
* reachable planet count

The map generator should be deterministic when seeded.

---

# Suggested Spawn Algorithm

1. Generate map.
2. Generate candidate home planets.
3. Score fairness.
4. Reject unfair layouts.
5. Repeat until fairness threshold passes.

---

# Multiplayer Requirements

## Accounts

Players need:

* login
* friends/invites
* active games list

Use:

* email/password initially

Potential future:

* Apple Sign In

---

## Game State Authority

Backend controls:

* turn order
* rule validation
* move legality
* final game state
* victory conditions

Clients submit:

* intended actions

Backend computes:

* resulting state

---

# Suggested Backend Tables

## users

* id
* name
* email
* password

---

## games

* id
* status
* current_player_id
* turn_number
* state_json
* winner_player_id

---

## game_players

* id
* game_id
* player_id
* team/color
* eliminated
* turn_order

---

## turns

* id
* game_id
* player_id
* turn_number
* submitted_actions_json
* resulting_state_json

---

# Game Engine Architecture

The game engine should be isolated from UI.

Preferred structure:

/src/game/

* mapGenerator.ts
* turnEngine.ts
* combatEngine.ts
* aiEngine.ts
* movementEngine.ts
* productionEngine.ts
* researchEngine.ts
* validationEngine.ts

The engine should:

* be deterministic
* support replay/debugging
* support future multiplayer validation

---

# Frontend Screens

Required:

* Login
* Register
* Games List
* Create Game
* Galaxy Map
* Planet Details
* Turn Submission
* Battle Results
* Notifications
* Settings

---

# UI Direction

UI should:

* feel modern
* be clean/minimal
* avoid overdesigned “mobile game” aesthetics
* prioritize readability and turn clarity

The map should:

* support zoom/pan
* clearly show ownership
* clearly show fleet paths

---

# Development Workflow

The AI should:

* always read /docs before coding
* keep docs updated
* update architecture docs when systems change
* avoid tightly coupling UI and game logic
* keep files organized
* avoid premature optimization

---

# Important Design Philosophy

The goal is NOT:

* exact binary recreation
* monetization
* App Store success
* graphical complexity

The goal IS:

* preserve original gameplay feel
* modernize multiplayer
* improve fairness
* improve AI
* improve usability
* create a stable async strategy game for friends

---

# Future Features (Optional)

Potential future additions:

* alliances/teams
* fog of war
* ranked AI difficulties
* replays
* statistics
* custom map seeds
* custom game rules
* cloud saves
* spectator mode
* diplomacy systems

Do NOT build these initially unless requested.

---

# MVP Priority Order

1. Local game engine
2. Map generation
3. Turn system
4. Combat
5. AI
6. Backend persistence
7. Multiplayer sync
8. Notifications
9. TestFlight deployment

---

# Final Important Instruction

Prioritize:

* clean architecture
* deterministic game logic
* maintainability
* separation of concerns
* modularity

Avoid:

* overengineering
* microservices
* unnecessary dependencies
* premature scaling decisions

This is a small private multiplayer strategy game, not a massive commercial MMO.
