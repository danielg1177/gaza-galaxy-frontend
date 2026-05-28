# Current State

## Last Updated
2026-05-28

## Overall Status
**Phase 10 complete (Tasks 68–72 complete). Phase 11 in progress (Tasks 73–75 complete).** Phase 7 complete (Tasks 56–61 complete). Phase 6 complete (Tasks 47–55 complete). Phase 3 UI/UX overhaul complete (Tasks 19–28). Phase 2 complete (Tasks 11–18). Core game engine (tasks 2–9) and playable local client (task 10) are implemented. Backend not started.

## Completed
- Expo SDK 54 + TypeScript project initialized
- `src/game/` folder structure created with stub modules
- Task 2: Core game types/interfaces defined in `src/game/types.ts`
- Task 3: Deterministic map generator (`src/game/mapGenerator.ts`)
- Task 4: Fair spawn placement (`src/game/spawnPlacer.ts`)
- Task 5: Turn engine orchestrator (`src/game/turnEngine.ts`)
- Task 6: Planet production (`src/game/productionEngine.ts`)
- Task 7: Fleet movement (`src/game/movementEngine.ts`)
- Task 8: Combat resolver (`src/game/combatEngine.ts`)
- Task 9: Heuristic AI (`src/game/aiEngine.ts`)
- Task 10: Playable local screen — Zustand store, HomeScreen, GameScreen with pan/zoom map and fleet dispatch
- Documentation structure established under `/docs`
- Task 11: Movement system reworked to clicks model — `BASE_FLEET_RANGE_CLICKS=11`, `BASE_FLEET_SPEED_CLICKS_PER_TURN=5`, `computeClickDistance`, `isInRange`; range check added to `turnEngine`
- Task 12: Production system reworked — planet classes A–P (16 grades), slot-based buildings (`factory`/`researchLab`), `troopAccumulator`, `productionSlider`, `buildingSlots`; `Player.resources` renamed to `gold`, `researchPoints` added; `STARTING_GOLD=500`; store and GameScreen wired
- Task 13: Round-based simultaneous resolution — `roundNumber` added to `GameState`; `dispatchedInRound` added to `Fleet`; arrivals resolve at turn start only if `dispatchedInRound < currentRound`; `roundNumber` increments when player order wraps
- Task 14: Fog of war — `VisiblePlanet` type added; `buildVisibleState` filters non-owned planet details and enemy fleets; `GameScreen` reads `getVisibleGameState()` from store
- Task 15: Planet ownership persistence — confirmed existing code correct; `combat.md` updated with ownership rules and 0-garrison auto-capture
- Task 16: Research level system — `MAX_TECH_LEVEL=15`, `RESEARCH_POINTS_PER_LEVEL=10`; level-up loop in `productionEngine`; `effectiveRange`/`effectiveSpeed` in `movementEngine`; `processSendFleet` applies per-player tech scaling
- Task 17: Random planet names — `name: string` added to `Planet`; seeded `generatePlanetName` using adjective+noun word lists; `spawnPlacer` unaffected (uses object spread)
- Task 18: Random AI names — `generateAiName` exported from `aiEngine`; `[Name] [Epithet]` format; `aiNameRng` seeded at `seed+2` in store; AI players no longer named "AI 1"
- Task 19: Multi-game lobby — `GameRecord` interface; store refactored to `games[]` + `activeGameId`; `loadGame`, `deleteGame`, `getActiveRecord` added; `HomeScreen` is now a lobby with game cards and inline setup form
- Task 20: Seed removed from `GameConfig`; auto-generated as `Date.now()` in `startNewGame`; seed input removed from setup form
- Task 21: `PlayMode` type added (`passAndPlay` | `asyncMultiplayer`); added to `GameState` and `GameConfig`; two-card selector in setup form; async marked "coming soon"
- Task 22: `PlayerSlot` + `playerSlots[]` replace `aiCount`; `difficulty` on `Player`; slot builder UI (2–8 players, human/AI toggle, Easy/Normal difficulty chips)
- Task 23: Pinch-to-zoom map — `react-native-gesture-handler` + `react-native-reanimated` installed; `GestureHandlerRootView` in App; double-`ScrollView` replaced with Reanimated pinch/pan/double-tap gesture canvas (scale 0.4×–4×)
- Task 24: Drag-to-move fleet UX — `pendingFleet` in store; long-press drag from owned planet, release on destination; range check via `effectiveRange`/`isInRange`; ship-count modal (Confirm/Cancel); old tap-dispatch UI removed
- Task 25: In-transit fleet viz — `react-native-svg` installed; `totalTurns` on `Fleet`; `FleetLayer` SVG overlay with interpolated position dots, dashed lines to destination, ship count labels; `FleetMarker` removed
- Task 27: End Turn + multiple fleet orders — `queuedOrders` in store; `queueOrder`/`cancelQueuedOrder`/`endTurn`; human batches `SEND_FLEET` then `END_TURN`; GameScreen queue list + End Turn button; `sendFleet` removed
- Task 26: Cancel queued fleet (same turn) — satisfied by Task 27; ✕ on queued orders; no ship deduction until `endTurn`
- Task 28: Pass-and-play lock screen — `showingLockScreen`/`dismissLockScreen` in store; full-screen overlay in `GameScreen` after End Turn when `playMode === 'passAndPlay'`
- Task 32: Human slot names in setup — `PlayerSlot.name?` added; human slots in `HomeScreen` now show "Player name" inputs (including slot 0); store uses `slot.name?.trim() || \`Player {n}\`` for human player names while AI naming remains unchanged
- Task 33: AI names simplified and made unique — `generateAiName(rng, usedNames)` now draws from a single first-name pool and skips case-insensitive collisions with existing human/AI names in `buildPlayers`; fallback is `AI {n}`
- Tasks 34–35: Fog-of-war planet rendering + own-planet green tint — `GameScreen` planet nodes now use visibility-aware palette (`#27ae60` own, `#2a2a4a` neutral dim, `#333355` enemy/non-owned gray blob); fleet colors remain player-colored via existing fleet `getPlayerColor`
- Task 39: Research thresholds now use exponential curve — `researchThreshold(level) = Math.round(10 * Math.pow(1.5, level))`; flat per-level cost removed from `productionEngine`
- Task 40: Zoomed pan edge clamping fixed — `GameScreen` now clamps `translateX/Y` to `[-(mapSize * scale - viewportSize), 0]` (with small-map zero guard), and map render transform explicitly compensates center-based scaling so runtime screen math remains `screen = map * scale + translate`
- Task 41: Ownership ring/border removed from planet nodes — `PlanetNode` no longer renders `homeRing`, home planets no longer get a white border, and only interaction feedback borders remain (drag-origin accent and animated selection pulse)
- Task 42: Non-owned planets no longer trigger selection pulse/border — `PlanetNode` animated pulse now requires `isOwned`, and map `onSelect` now clears selection for non-owned planets so `selectedPlanetId` never points at enemy/neutral planets
- Task 43: Non-owned planets now show muted class/name labels — `PlanetNode` renders class letter and name for all planets, with subdued gray text for non-owned planets while keeping non-owned ship counts hidden
- Task 44: Planet names shortened to avoid clipping — `generatePlanetName` adjective/noun pools now use short one- or two-syllable words (16x16 combinations), and `PlanetNode` no longer truncates names with `numberOfLines`
- Task 45: Owned-planet detail modal redesigned — new header/info layout, build-type chips (Factory/Research Lab), tappable building slot grid with optimistic placement via `queueBuildOrder`, and conditional production slider wired to `setProductionSlider`
- Task 46: Building construction delay — `Building` now tracks `builtOnRound`; `queueBuildOrder` stamps current `roundNumber`; `runProduction` only counts active buildings where `builtOnRound < currentRound`; current-round buildings render in the planet modal at reduced opacity (`0.35`)
- Task 47: Planet tap hit target centered + padded — `PlanetNode` touch wrapper now anchors to planet center (`center - PLANET_SIZE_SELECTED / 2`), and both tap/press interactions include uniform 8px hit slop for reliable selection at default zoom
- Task 48: Planet edge padding in map generation — `PLANET_EDGE_PADDING=3` added to placement sampling so candidate `(x, y)` stays within padded bounds and planets do not spawn clipped against map edges
- Task 49: Fleet dispatch modal now shows route distance and ETA — Send Fleet confirm modal displays `Distance: X.X clicks · ETA: N turns` using `computeClickDistance` and `computeTurnsInTransit` with `effectiveSpeed(humanPlayer.techLevel)`
- Task 50: Build orders now deduct gold immediately and enforce slot capacity — `queueBuildOrder` validates cost + available slots before placing, applies immediate player-gold deduction, and rejects invalid orders; planet modal build chips disable when no slots remain
- Task 51: Research info button + modal — R&D button above End Turn opens modal with tech level, research points vs threshold, active lab count, and turns-to-next-level projection
- Task 52: Planet class spawn weights adjusted — `PLANET_CLASS_WEIGHTS` now uses A=8%, B=15%, C=25%, D=27%, E=25%, increasing A/B/C frequency while keeping D/E most common
- Task 53: Home planet class variation — `placeSpawns` now assigns each home planet a seeded-random class A-G (equal 1/7), applies class-specific `buildingSlots` (5–8), and `gameStore` now sets player `gold` from `HOME_PLANET_CLASS_CONFIG` (1000–1600) instead of flat start gold
- Task 54: Building slot icons in planet modal — filled slots now render emoji icons (`🏭` factory, `🔬` research lab) instead of letter labels, while preserving existing under-construction dimming (`opacity: 0.35`)
- Task 55: Production slider live output label — owned-planet modal now shows real-time projected `⚔ troops/turn` and `💰 gold/turn` below the split label using active factories (`builtOnRound < roundNumber`) and current slider position
- Task 56: Fixed planet minimum spacing at 4 clicks — `mapGenerator` now uses a constant `MIN_PLANET_DISTANCE=4` (dynamic formula removed), and HomeScreen map presets were resized to `Small 40×40/16`, `Medium 60×60/32`, `Large 80×80/54` to keep placement feasible with `PLANET_EDGE_PADDING=3`
- Task 57: Corrected round semantics — in `turnEngine`, fleet transit advance and `runProduction` now tick once per full player cycle (turn-order wrap), `roundNumber` increments only on wrap, and ETA-2 fleets dispatched in round 1 now arrive at the start of round 3
- Task 58: Owned-planet parity — all planets with `owner ===` local human id render green with name/class/troop labels and open the full build/detail modal; no `isHomePlanet` gating in `GameScreen`; `combatEngine` sets `owner` on capture; troop count shown for all owned planets including 0
- Task 59: Double-tap-to-zoom removed — `Gesture.Tap().numberOfTaps(2)` handler deleted from `GameScreen`; map gesture composition is pinch + pan + planet tap + fleet drag only
- Task 60: Zoom/pan viewport jump fixed — pinch `onStart` snapshots live `scale`/`translateX`/`translateY` (`pinchStartScale`, `pinchStartTranslateX/Y`); pan `onStart` snapshots live translate (`panStartTranslateX/Y`); gesture `onUpdate` accumulates from those baselines; `onEnd` commits to `saved*` without reset; `screenToMapCoords` applies center-compensation offset aligned with `animatedStyle`
- Task 61: Fleet dispatch tap-to-drag — `fleetDrag` is plain `Gesture.Pan()` (no long-press); `Gesture.Exclusive(fleetDrag, planetTap)` so stationary tap on owned planet opens detail modal, movement starts drag; status bar shows gold + tech level only (ship count removed)
- Task 64: Conquered-planet parity restored — `getLocalHumanPlayerId` drives fog + `owner ===` checks; fleet drag defers origin highlight until pan `onUpdate` after `minDistance(10)`; tap priority over drag via Exclusive order
- Task 65: Planet tap and fleet-drop hit targets enlarged — `PLANET_HIT_RADIUS` raised from `CELL_SIZE * 1.5` to `CELL_SIZE * 2.5` (~27 screen px at default 0.6 scale); `findPlanetAtMapCoords` nearest-planet logic unchanged
- Task 66: Queued fleet orders — display-only troop deduction on origin planets (`queuedShipsPerPlanet` subtracts queued `SEND_FLEET` ship counts from map labels); pending departure SVG markers (dashed line + dot + count) in `FleetLayer` for each queued order until End Turn
- Task 67: Same-turn conquered planet — `endTurn` clears `selectedPlanetId` with resolved state; `GameScreen` effect drops stale `selectedPlanetId`/`dragOriginPlanetId` when planet owner ≠ local human; capture turn renders green and accepts tap/drag immediately
- Task 68: Queued orders modal — inline HUD queue list removed; **Queued (N)** pill button above R&D opens modal with planet-name routes, per-order ✕ cancel, and empty state; status bar no longer shows queued-order count
- Task 69: Insufficient-gold build feedback — `queueBuildOrder` returns `'ok' | 'insufficient_gold' | 'no_slots' | 'not_owner'`; planet modal shows red **Not enough gold** below build chips when a slot placement is rejected for gold (auto-dismiss 2s, clears on modal close)
- Task 70: Cancel under-construction build — tap dimmed slot (`builtOnRound === currentRound`) calls `cancelBuildOrder`; removes building, refunds full gold immediately, clears matching `BUILD` queued order if present; no confirmation
- Task 71: Demolish active building — tap filled slot (`builtOnRound < currentRound`) shows `Alert` confirmation; `demolishBuilding` removes building with no gold refund; production output label and research modal projections update immediately
- Task 72: Remove blue planet highlight — `PlanetNode` selection pulse animates white opacity fade (`rgba(255,255,255,0.85)` → `0.15`); drag-origin ring uses `rgba(255,255,255,0.6)` instead of `COLORS.accent`; no planet ever shows blue border/tint
- Task 73: Fleet drag blocks map pan (not pinch) — `mapGesture` is `Gesture.Simultaneous(composed, planetFleet)`; `isFleetDragging` set via `runOnUI` only after `handleDragStart` confirms an owned planet (not on every `fleetDrag.onUpdate`); `fleetDrag.onFinalize` resets flag and pan baselines; pinch always available
- Task 74: Fleet arrival at round wrap — `turnEngine` round-wrap block now calls `resolveArrival` for each fleet returned by `advanceFleets` instead of re-queuing them in `fleets`; captures visible at the start of the human's next turn (no extra turn of delay)
- Task 75: AI fleet range cap — `aiEngine` derives `effectiveRange(player.techLevel)` and filters source/target selection with `isInRange`; prevents intermittent `processSendFleet` out-of-range throws when transit turns are short but click distance exceeds range
- Task 76: Garrison constraint removed — `processSendFleet` allows `shipCount === origin.shipCount`; players may send all ships off an owned planet without engine error
- Task 77: Building placement simplified — Factory/Research Lab chips call `queueBuildOrder` directly (single tap); slot grid empty tiles are display-only; cancel/demolish on filled slots unchanged
- Task 78: Turn counter displays `roundNumber` directly — all players see Turn 1, Turn 2, etc. on each shared round (reverts Task 63 per-player formula)

## In Progress
_None._

## Next Up
- Phase 4: Async multiplayer & notifications (Tasks 29–30) — requires backend
- See `docs/tasks/backlog.md` for full task list and `docs/development/roadmap.md` for phase overview

## Dependencies (client)
- `zustand` — game store
- `@react-navigation/native`, `@react-navigation/native-stack` — `NavigationContainer` + native stack (`Home`, `Game`)
- `react-native-screens`, `react-native-safe-area-context` — React Navigation peers (Expo SDK 54 pins)
- `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` — map pinch/pan and gestures (`metro.config.js` enables `inlineRequires` for Worklets)
- `react-native-svg` — in-transit fleet overlay

## What Works Right Now
- **Home → Game flow:** configure match on HomeScreen, launch into full game view
- **GameScreen:** 2D pannable map (`CELL_SIZE` 18), fog-aware planet tinting (any owned planet green via `owner ===` local human id, neutral very dim, enemy gray), class/name/troop labels on owned planets (non-owned labels muted, troops hidden), owned-planet white fade selection pulse (no blue), drag-origin white ring accent, in-transit fleet markers at destinations (→ + dot)
- **Owned planet modal:** redesigned card with centered header + close button, class tile + large troop counter, Factory/Research Lab build chips (single tap places into next available slot), display-only empty slot grid plus tappable filled tiles (`🏭`/`🔬`), and factory-gated production slider label (`XX% troops / YY% gold`)
- **Production split feedback:** planet modal slider now also shows live projected output (`⚔ X.X troops/turn · 💰 Y.Y gold/turn`) that updates continuously while dragging
- **Build-order validation and economy feedback:** tapping Factory/Lab chips places immediately (no slot pick step), deducts gold instantly in the status bar, and build chips gray out when no slots remain; insufficient-gold chip taps show a brief red **Not enough gold** label in the planet modal (between build chips and slot grid)
- **Construction feedback:** buildings placed this round are shown dimmed in the slot grid and do not produce troops/gold/research until the next round; tapping a dimmed slot cancels the build and refunds gold immediately (no prompt); tapping an active (prior-round) filled slot prompts demolition confirmation with no gold refund
- **Status bar:** turn line unchanged; sub-line shows gold balance and tech level only (no aggregate ship count)
- **Fleet dispatch:** touch-and-drag immediately from owned planets (no hold); owned-planet tap opens modal (`handleMapTap` reads fresh state from `useGameStore.getState()`); fleet drag blocks map pan only after confirmed owned-planet drag start; pinch always available; ship-count modal confirms each order; queued orders immediately reduce displayed origin troop counts and show pending departure markers on the map; **Queued (N)** button (above R&D) opens a modal to review/cancel queued orders; **End Turn** batches all queued `SEND_FLEET` actions + `END_TURN`, then AI turns run until human again
- **Zoom/pan math:** at every zoom level, pan can reach all map edges; gesture/tap transforms use a consistent top-left-anchored formula (`screen = map * scale + translate`) without relying on `transformOrigin`
- **End game:** victory/defeat banner, New Game returns to Home
- **Pass-and-play:** after End Turn, lock screen ("Pass the device") until tap to dismiss; map stays mounted underneath
- `npx tsc --noEmit` passes clean
- Full engine: map gen, spawns, turns, production, movement, combat, AI

## What Does NOT Work Yet
- No backend / multiplayer / persistence

## Active Files
| File | Status |
|------|--------|
| `src/game/types.ts` | Defined — core types |
| `src/game/mapGenerator.ts` | Implemented — seeded map generation |
| `src/game/spawnPlacer.ts` | Implemented — fair home planet placement |
| `src/game/turnEngine.ts` | Implemented — turn resolution orchestrator |
| `src/game/productionEngine.ts` | Implemented — `runProduction` with class/building multipliers |
| `src/game/movementEngine.ts` | Implemented — transit time, fleet creation, advance |
| `src/game/combatEngine.ts` | Implemented — `resolveArrival` with reinforcement, capture, combat |
| `src/game/aiEngine.ts` | Implemented — `computeAiTurn`, `AiDifficulty` |
| `src/game/validationEngine.ts` | Stub only |
| `src/game/index.ts` | Re-exports all modules |
| `src/store/gameStore.ts` | Zustand store — local match state and actions |
| `src/screens/HomeScreen.tsx` | New-game setup UI |
| `src/screens/GameScreen.tsx` | Playable galaxy map + fleet dispatch |
| `App.tsx` | Navigation root (`SafeAreaProvider`, stack navigator) |

## Changelog
- 2026-05-28: Task 78 complete — turn counter now displays `roundNumber` directly; all players see Turn 1, Turn 2, etc. on each shared round
- 2026-05-28: Task 77 complete — building placement simplified to single-tap chip; slot grid is now display-only (empty slots not tappable); filled under-construction/active slots still support cancel/demolish
- 2026-05-28: Task 76 complete — garrison constraint removed; players can now send all ships off an owned planet without an error
- 2026-05-28: Bug fix — Task 75 complete — AI fleet selection now respects player click-range cap (`effectiveRange` + `isInRange` in `nearestOwnedPlanet`, reinforce/attack/expand helpers); fixes intermittent `processSendFleet` "out of range" when nearest-by-transit target exceeded 11-click base range.
- 2026-05-28: Bug fix — Task 74 complete — round-wrap `advanceFleets` arrivals now resolve immediately via `resolveArrival` (only `inTransit` kept in `fleets`); fixes fleet dot sitting on destination for a full human turn before capture; turn-start eligibility check retained as safety net; `movementEngine` comment updated.
- 2026-05-28: Bug fix — Task 73 revision (2): `isFleetDragging` no longer set in `fleetDrag.onUpdate` (was blocking all pans after 10px on empty map); flag now set via `runOnUI` only in `handleDragStart` / cleared in `cancelDrag`; `fleetDrag.onFinalize` resets flag and pan baselines on end/cancel. Conquered-planet tap: `handleMapTap` reads `useGameStore.getState()` at call time with fresh `getLocalHumanPlayerId` ownership check (empty `useCallback` deps).
- 2026-05-28: Bug fix — Task 73 revision: restored `Gesture.Simultaneous(composed, planetFleet)` (Exclusive had broken pinch on two-finger gestures); fleet-drag pan blocking now uses worklet `isFleetDragging` on pan handlers instead. Conquered-planet tap fix: removed stale `owner !== localHumanPlayerId` guard from `handleMapTap` — `selectPlanet` runs for any hit planet; modal visibility and selection-clear `useEffect` still gate owned-only UI. *(Superseded by revision 2 entry above.)*
- 2026-05-28: Task 73 complete — `GameScreen` map gesture composition changed from `Gesture.Simultaneous(composed, planetFleet)` to `Gesture.Exclusive(planetFleet, composed)` so fleet drag and planet tap block map pan/pinch while active; pan and pinch on empty map unchanged. *(Superseded same day — see revision entry above.)*
- 2026-05-28: Task 72 complete — `PlanetNode` selection pulse `borderColor` interpolation changed from white-to-blue to white opacity fade (`rgba(255,255,255,0.85)` → `0.15`); drag-origin static border uses `rgba(255,255,255,0.6)` instead of `COLORS.accent`; `COLORS.accent` unchanged elsewhere.
- 2026-05-28: Task 71 complete — `demolishBuilding(planetId, buildingIndex)` in `gameStore` removes active buildings (`builtOnRound < currentRound`) with no gold refund; planet modal active filled slots show `Alert.alert` confirmation before demolition; slot grid, production output label, and research modal lab count update on store change.
- 2026-05-28: Task 70 complete — `cancelBuildOrder(planetId, buildingIndex)` in `gameStore` removes same-round buildings (`builtOnRound === currentRound`), refunds `FACTORY_GOLD_COST`/`RESEARCH_LAB_GOLD_COST`, and strips matching `BUILD` entries from `queuedOrders` if any; planet modal under-construction slots are tappable for instant cancel (no confirmation).
- 2026-05-28: Task 69 complete — `queueBuildOrder` now returns `'ok' | 'insufficient_gold' | 'no_slots' | 'not_owner'`; planet modal shows red **Not enough gold** below build chips when slot placement fails for gold (2s auto-dismiss, clears on modal close).
- 2026-05-28: Task 68 complete — removed inline queued-orders HUD overlay from `GameScreen`; added **Queued (N)** pill button above R&D opening a fade modal (planet-name routes, ship counts, ✕ cancel via `cancelQueuedOrder`, empty state when none); status bar shows only “Your turn” / “AI’s turn”.
- 2026-05-28: Bug fix — End Turn now calls `cancelDrag()` before `endTurn()` so lingering `dragOriginPlanetId` / fleet-drag refs do not leave a blue accent border on planets (including newly captured ones) after turn resolution.
- 2026-05-28: Bug fix — `screenToMapCoords` inverse transform corrected: removed double-applied center-compensation (`map = (screen - rawTranslate) / scale`); forward `animatedStyle` compensation unchanged; planet tap and fleet drag-drop hit-testing now accurate at all zoom levels.
- 2026-05-28: Task 67 complete — conquered planets render green and accept tap/drag on the capture turn: `endTurn` atomically clears `selectedPlanetId`; `GameScreen` effect clears stale selection/drag-origin when ownership no longer matches local human; `resolveArrival` ownership verified correct.
- 2026-05-28: Task 66 complete — queued fleet orders now subtract queued ship counts from origin planet labels (display-only; store unchanged until End Turn) and render pending departure indicators in `FleetLayer` (dashed line, dot 18px toward destination, ship count label); cancelling a queued order restores both immediately.
- 2026-05-28: Task 65 complete — enlarged `PLANET_HIT_RADIUS` from `CELL_SIZE * 1.5` to `CELL_SIZE * 2.5` in `GameScreen` so planet tap and fleet drag-drop both use a comfortable touch target at default zoom (~27 screen px radius at scale 0.6).
- 2026-05-28: Task 64 complete — audited and fixed conquered-planet rendering and tap handling; all planets with `owner === localHumanPlayerId` now render green with full labels and open the owned-planet modal on tap; fleet drag works from captured planets.
- 2026-05-28: Task 63 complete — HUD turn counter now shows per-player turn number (humanTurn = (roundNumber-1)*playerCount + playerIndex + 1) instead of roundNumber, so pass-and-play players see Turn 1, 2, 3… each.
- 2026-05-28: Task 62 complete — default map scale reduced from 1 to 0.6 so planets appear closer together at game start.
- 2026-05-28: Fix planet tap after Task 61 — `fleetDrag` now uses `Gesture.Pan().minDistance(10)` so micro-movement during a tap no longer wins `Gesture.Exclusive(planetTap, fleetDrag)` and cancels `planetTap`; deliberate drags still activate fleet dispatch immediately once movement exceeds 10px.
- 2026-05-28: Task 61 complete — fleet dispatch UX: replaced `Gesture.Pan().activateAfterLongPress(300)` with immediate `Gesture.Pan()` (ownership check on drag start unchanged); composed planet interactions as `Gesture.Exclusive(planetTap, fleetDrag)` inside map gestures so tap opens owned-planet modal and drag wins on movement; non-owned taps no-op; status bar sub-line now `Gold · Tech Level` (removed total ship count and `sumOwnedShips`).
- 2026-05-28: Task 60 complete — fixed pinch/pan viewport teleport on gesture transitions: pinch `onStart` now snapshots live `scale`/`translateX`/`translateY` into `pinchStartScale`/`pinchStartTranslateX/Y` (not stale `saved*`); pan gained `onStart` with `panStartTranslateX/Y`; both gestures accumulate from session baselines and commit on `onEnd` only; restored `screenToMapCoords` center-compensation (`effectiveTx/Y = raw + mapDim*(scale-1)/2`) for planet tap/drag hit-testing at all zoom levels.
- 2026-05-28: Task 59 complete — removed double-tap-to-zoom from `GameScreen` (`Gesture.Tap().numberOfTaps(2)` and its `Gesture.Simultaneous` slot); pinch, pan, single-tap planet selection, and long-press fleet drag unchanged.
- 2026-05-28: Task 58 complete — audited `GameScreen` planet rendering and modal gating: colour, labels, tap selection, and owned-planet modal all key off `planet.owner ===` local human player id (not `isHomePlanet`); troop count label now renders for every owned planet including 0 garrison; verified `combatEngine.resolveArrival` assigns `owner` on neutral and combat capture; added `setProductionSlider` ownership guard matching `queueBuildOrder`.
- 2026-05-28: Task 57 complete — fixed turn/round semantics so round-gated simulation ticks (`advanceFleets`, `runProduction`) execute only on turn-order wrap (once per full player cycle), preserving `roundNumber` as a true full-round counter; documented cadence in turn-engine/movement/production system docs.
- 2026-05-28: Task 56 complete — `mapGenerator` now enforces fixed `MIN_PLANET_DISTANCE=4` clicks (replacing the old dynamic `max(2, ...)` formula), and HomeScreen map presets were resized to `40×40/16`, `60×60/32`, and `80×80/54` to avoid placement failures with edge padding.
- 2026-05-28: Fix planet interaction — consolidated all planet touch handling at map-level `GestureDetector`; removed per-planet nested `GestureDetector`/`TouchableOpacity` (were competing with map gesture in RNGH v2); `PlanetNode` is now purely presentational (`pointerEvents="none"`); added `planetTap` (`Gesture.Tap().maxDuration(300)`) and `fleetDrag` (`Gesture.Pan().activateAfterLongPress(300)`) to map gesture; fixed `screenToMapCoords` to account for `animatedStyle` center-compensation offset (`effectiveTx = rawTx + mapW*(scale-1)/2`), correcting planet hit-testing at all zoom levels.
- 2026-05-28: Task 55 complete — owned-planet production slider now renders a second live output label below the percentage split, showing projected `⚔ troops/turn` and `💰 gold/turn` from active factories and current slider value.
- 2026-05-28: Task 54 complete — updated owned-planet building slot glyphs from letter labels (`F`/`R`) to emoji icons (`🏭`/`🔬`) in `GameScreen`; under-construction slot opacity behavior unchanged.
- 2026-05-28: Task 53 complete — home planets now roll seeded classes A-G at spawn placement, applying class-specific home `buildingSlots`; player starting `gold` now initializes from `HOME_PLANET_CLASS_CONFIG` using each player's assigned home class.
- 2026-05-28: Task 52 complete — updated `PLANET_CLASS_WEIGHTS` in map generation to A=8%, B=15%, C=25%, D=27%, E=25%; removed classes F–P from weighted rolls so only A–E generate.
- 2026-05-28: Task 51 complete — added R&D button (bottom-right, above End Turn) and research modal to GameScreen; displays tech level, banked vs threshold research points, active lab count, and ∞/N turns projection; uses exported researchThreshold and MAX_TECH_LEVEL.
- 2026-05-28: Task 50 complete — `queueBuildOrder` now validates ownership, gold cost, and available slots before applying a build; successful orders deduct `FACTORY_GOLD_COST`/`RESEARCH_LAB_GOLD_COST` immediately from the active player and append an under-construction building (`builtOnRound = currentRound`). `GameScreen` now computes modal `availableSlots` using committed + same-round builds and disables/dims Factory/Research Lab chips when no slots remain.
- 2026-05-28: Task 49 complete — `GameScreen` Send Fleet confirm modal now computes route metrics when `pendingOriginPlanet` and `pendingDestPlanet` are present, displaying one decimal click distance and tech-scaled ETA turns (`computeClickDistance`, `computeTurnsInTransit`, `effectiveSpeed`).
- 2026-05-28: Task 48 complete — map generation now enforces `PLANET_EDGE_PADDING=3` when sampling candidate planet positions (`x/y` constrained to padded interior bounds) before minimum-distance checks, preventing edge-clipped planets while preserving seeded deterministic generation behavior.
- 2026-05-28: Task 47 complete — fixed planet tap-target alignment in `PlanetNode` by centering the touch wrapper on planet center coordinates and adding 8px hit slop (`top/bottom/left/right`) to both tap gesture and touchable presses for reliable home-planet selection at scale 1.
- 2026-05-27: Task 46 complete — added `builtOnRound` to `Building`, stamped queued builds with current `roundNumber`, updated production to count only active buildings (`builtOnRound < currentRound`), and dimmed current-round slot tiles in the owned-planet modal.
- 2026-05-27: Task 45 complete — replaced old owned-planet label/value modal with redesigned layout (header, class/troop info row, build chips, slot grid, conditional slider), added store actions `queueBuildOrder` and `setProductionSlider`, and installed `@react-native-community/slider`.
- 2026-05-27: Task 44 complete — replaced planet-name word pools with shorter adjective/noun lists to keep labels within map UI bounds, and removed `numberOfLines` truncation from `PlanetNode` name labels.
- 2026-05-27: Task 43 complete — non-owned planets now render the class letter inside the gray node and name above it using muted gray label colors; ship counts remain hidden for non-owned planets.
- 2026-05-27: Task 42 complete — non-owned planets can no longer become selected targets; animated white/blue pulse border now renders only for owned planets, preventing enemy ownership leakage via selection feedback.
- 2026-05-27: Task 41 complete — removed home-planet ownership ring/white border from `PlanetNode`; retained interaction-only borders for drag origin and animated selection.
- 2026-05-27: Task 40 complete — fixed zoomed pan edge clamping; map transform now explicitly preserves `screen = map * scale + translate` even when `transformOrigin` support is inconsistent.
- 2026-05-27: Task 39 complete — production research level-up switched from flat cost to exported exponential `researchThreshold(level)` curve.
- 2026-05-27: Task 38 complete — bottomPanel removed; compact End Turn button (bottom-right absolute); queue and game-over moved to floating overlays; map fills full screen.
- 2026-05-27: Task 37 complete — planet detail modal on tap; planetSection removed from bottom panel; modal gates on owned planet, closes on backdrop/✕.
- 2026-05-27: Task 36 complete — planet name above (absolute, 48px centered), class letter inside circle, troop count conditional on isOwned && > 0; `isOwned` prop added to PlanetNode.
- 2026-05-27: Tasks 34 and 35 complete — fog-of-war planet rendering updated with three-state tinting (`#27ae60` own, `#2a2a4a` neutral, `#333355` enemy/non-owned); fleet colors unchanged.
- 2026-05-27: Task 33 complete — AI names now use single first-names with deterministic shuffle, case-insensitive uniqueness against human and AI names, and `AI {n}` fallback when pool is exhausted.
- 2026-05-27: Task 32 complete — human name input per human slot in setup; store now resolves human names from `PlayerSlot.name` with `Player {n}` fallback.
- 2026-05-27: Task 31 complete — pinch-to-zoom fix; `transformOrigin: '0% 0%'` on map Animated.View; focal-point–anchored pinch gesture with `pinchFocalX/Y` + `pinchStartTranslateX/Y` shared values.
- 2026-05-27: Fix GameScreen infinite loop — `useVisibleGameState()` replaces `useGameStore((s) => s.getVisibleGameState())`; see `known-issues.md`.
- 2026-05-27: Fix Reanimated startup crash — `metro.config.js` (`inlineRequires: true`); `react-native-worklets` added; see `known-issues.md`.
- 2026-05-27: Task 28 complete — pass-and-play lock screen; `showingLockScreen`/`dismissLockScreen`; overlay in GameScreen.
- 2026-05-27: Task 26 complete — cancel queued fleet satisfied by Task 27 queue model (no separate implementation).
- 2026-05-27: Task 27 complete — queue-then-commit turns; `queuedOrders`, `endTurn`, End Turn UI; multiple human fleet orders per turn.
- 2026-05-27: Task 25 complete — in-transit fleet viz; react-native-svg; totalTurns; FleetLayer SVG overlay.
- 2026-05-27: Task 24 complete — drag-to-move; pendingFleet store; long-press drag; ship-count modal; old dispatch UI removed.
- 2026-05-27: Task 23 complete — pinch-to-zoom; gesture-handler + reanimated installed; GestureHandlerRootView in App.
- 2026-05-27: Task 22 complete — PlayerSlot/playerSlots; 2-8 player slot builder; human/AI toggle; difficulty chips.
- 2026-05-27: Task 21 complete — PlayMode type; passAndPlay/asyncMultiplayer; mode selector in setup form.
- 2026-05-27: Task 20 complete — seed removed from GameConfig; auto-generated in store; seed input removed from HomeScreen.
- 2026-05-27: Task 19 complete — multi-game lobby; GameRecord; store refactored; HomeScreen lobby + setup form.
- 2026-05-27: Task 18 complete — random AI player names; generateAiName; seed+2 RNG offset.
- 2026-05-27: Task 17 complete — random planet names; name field on Planet; seeded adjective+noun generator.
- 2026-05-27: Task 16 complete — research level system; effectiveRange/effectiveSpeed; techLevel scales fleet range and speed.
- 2026-05-27: Task 15 complete — ownership persistence verified correct; combat.md updated.
- 2026-05-27: Task 14 complete — fog of war; buildVisibleState filters non-owned planets and enemy fleets; GameScreen uses getVisibleGameState.
- 2026-05-27: Task 13 complete — round-based resolution; roundNumber + dispatchedInRound; fleets held until next round; store initialized with roundNumber:1.
- 2026-05-27: Task 12 complete — production system reworked; planet classes A–P; slot-based factories/labs; gold/troops slider; store and UI updated.
- 2026-05-27: Task 11 complete — movement system reworked to clicks model; range check added to turnEngine.
- 2026-05-27: Design review — Tasks 11–30 added to backlog. Roadmap updated with Phases 2–4.
- 2026-05-27: Task 10 complete — playable `GameScreen` (map canvas, status bar, bottom panel, fleet send, game over).
- 2026-05-27: Task 10b — `App.tsx` wired with React Navigation; `HomeScreen` and `GameScreen` stub.
- 2026-05-27: Task 10a — `src/store/gameStore.ts`; zustand + React Navigation deps.
- 2026-05-27: Task 9 complete — `aiEngine.ts` implements `computeAiTurn` with three-priority heuristic AI; engine tasks 2–9 are done.
- 2026-05-27: Task 8 complete — `combatEngine.ts` implements `resolveArrival` (friendly reinforce, neutral capture, deterministic combat with `DEFENSE_BONUS` and tech multiplier placeholders).
- 2026-05-27: Task 7 complete — `movementEngine.ts` implements `computeTurnsInTransit`, `createFleet`, `advanceFleets`; `turnEngine` refactored to delegate fleet logic.
- 2026-05-27: Task 6 complete — `productionEngine.ts` implements `runProduction` with planet class multipliers, manufacturing facility bonuses, and immutable `{ map, players }` return; `turnEngine` updated to destructure result.
- 2026-05-27: Task 5 complete — `turnEngine.ts` implements `resolveTurn` with fleet dispatch, transit advance, stub combat/production hooks, elimination/victory, and turn order cycling.
- 2026-05-27: Task 4 complete — `spawnPlacer.ts` implements 200-candidate random search with distance, nearby-count variance, and center-bias scoring.
- 2026-05-27: Task 3 complete — `mapGenerator.ts` implements mulberry32 RNG, `MapConfig`, planet placement, and class weights.
- 2026-05-27: File created. Recorded initial project state after tasks 1–2.
