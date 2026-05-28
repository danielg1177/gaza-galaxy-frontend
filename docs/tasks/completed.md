# Completed Tasks

## Task 82 — Fix planet label text sizes (too large after CELL_SIZE reduction)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — scaled map-canvas planet label typography by 11/18: `planetNameLabel` and `planetClassLabel` `fontSize` 7→4, `shipCountLabel` `fontSize` 9→6 and `marginTop` 2→1; `PLANET_NAME_LABEL_WIDTH` / `PLANET_NAME_LABEL_TOP` left as Task 79 `(value/18)*CELL_SIZE` constants; modals, status bar, HUD, and distance pill unchanged.
**Notes:** Fleet SVG overlay labels (`fontSize` 8) not planet-node labels — untouched. `npx tsc --noEmit` passes clean.

---

## Task 81 — Fix map pan during non-owned drag + draw measurement line
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `measureDrag` sets `isFleetDragging` via `runOnUI` when a non-owned origin is confirmed in `handleMeasureDragStart`; `measureDrag.onFinalize` clears flag and resets `panStartTranslateX/Y` like `fleetDrag`; `measureDragOriginPlanetId` + `dragFingerLocal` (absolute coords in `handleMeasureDragUpdate`) feed the existing `DragLine` overlay (same accent style; separate state avoids `dragOriginPlanetId` ownership effect clearing non-owned origins).
**Notes:** Fleet dispatch, distance pill, and owned-planet drag behaviour unchanged. `npx tsc --noEmit` passes clean.

---

## Task 80 — Show live click-distance label while dragging a fleet
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `dragDistanceLabel` state + bottom-center pill UI; owned-planet `handleFleetPanUpdate` updates label via `computeClickDistance` (finger map pixels → grid position); `measureDrag` `Gesture.Pan()` composed `Gesture.Simultaneous` with map gestures for non-owned planet measurement only (no `handleDragStart`, modal, or queue); `handleDragEnd` early path no longer calls full `cancelDrag` so measurement label survives non-owned drags.
**Notes:** `formatDragDistanceLabel` shows one decimal (`X.X clicks`). Fleet dispatch behaviour for owned planets unchanged. `npx tsc --noEmit` passes clean.

---

## Task 79 — Reduce visual planet spacing to ~60% of current
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `CELL_SIZE` 18→11; `PLANET_SIZE` / `PLANET_SIZE_SELECTED` / name-label width and top offset scaled from prior 18px baseline; `PLANET_HIT_RADIUS` stays `CELL_SIZE * 2.5`; pending-departure offset `CELL_SIZE`; default pinch scale 0.6→1.0 (min/max clamp 0.4–4 unchanged).
**Notes:** Rendering-only; `screenToMapCoords`, pan clamp, fleet SVG, and hit tests all use the same `CELL_SIZE` lever. `computeClickDistance`, `isInRange`, `effectiveRange`, and `movementEngine.ts` untouched. `npx tsc --noEmit` passes clean.

---

## Task 78 — Fix turn counter: show shared round number
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — HUD turn line now displays `roundNumber` directly (`Turn {roundNumber}`) instead of `(roundNumber - 1) * playerCount + playerIndex + 1`; removed unused `numberOfPlayers` / `currentPlayerIndex` / `humanTurn` locals.
**Notes:** Rendering-only fix; store and `turnEngine` unchanged (`roundNumber` already increments once per full player cycle). All players see the same Turn N during round N. `npx tsc --noEmit` passes clean.

---

## Task 77 — Simplify building placement (single-tap chip)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — removed `selectedBuildType` and two-step chip-then-slot flow; Factory/Research Lab chips call `queueBuildOrder` directly; empty slot tiles are non-interactive `View`s; filled slots still cancel/demolish. `src/store/gameStore.ts` verified unchanged (`queueBuildOrder(planetId, buildingType)` already appends to first available slot).
**Notes:** Build chips stay disabled when no slots remain; insufficient-gold feedback unchanged. `npx tsc --noEmit` passes clean.

---

## Task 76 — Remove garrison constraint (send all ships off planet)
**Completed:** 2026-05-28
**Files modified:** `src/game/turnEngine.ts` — `processSendFleet` now rejects only when `shipCount > origin.shipCount` (was `>=`, which forced leaving ≥1 ship). `gameStore.ts` and `movementEngine.ts` audited; no garrison guards present.
**Notes:** `combatEngine.resolveArrival` friendly branch adds fleet ships without clearing `owner` at 0 garrison — ownership unchanged. `npx tsc --noEmit` passes clean.

---

## Task 75 — Fix AI generating out-of-range fleet dispatches
**Completed:** 2026-05-28
**Files modified:** `src/game/aiEngine.ts` — `computeAiTurn` derives `rangeClicks` via `effectiveRange(player.techLevel)`; `nearestOwnedPlanet` accepts optional `rangeClicks` and skips out-of-range candidates; `tryReinforceHome`, `tryAttackWeakestEnemy`, and `tryExpandToNeutral` pass range through; expand loop guards with `isInRange` before transit scoring.
**Notes:** Transit-turn distance still used for nearest-source scoring among in-range planets only. Fixes intermittent `processSendFleet` throw when nearest-by-turns target exceeded click-range cap. `npx tsc --noEmit` passes clean.

---

## Task 74 — Fix fleet arrival delay (resolve at round wrap)
**Completed:** 2026-05-28
**Files modified:** `src/game/turnEngine.ts` — round-wrap block now sets `fleets = inTransit` and calls `resolveArrival` for each fleet in `justArrived` instead of re-merging arrived fleets into `fleets`. `src/game/movementEngine.ts` — `advanceFleets` comment updated to reflect immediate resolution by turn engine.
**Notes:** Turn-start eligible-arrival loop (lines 133–148) kept as safety net. Fixes fleet dot on destination for a full human turn before capture. `npx tsc --noEmit` passes clean.

---

## Task 73 — Disable map pan/scroll while dragging a fleet
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — replaced outer `Gesture.Simultaneous(composed, planetFleet)` with `Gesture.Exclusive(planetFleet, composed)` so planet tap / fleet drag take priority over map pan+pinch; empty-map pan and pinch unchanged when no planet gesture wins.
**Notes:** No `isFleetDragging` shared value (Exclusive composition sufficient). `npx tsc --noEmit` passes clean.

---

## Task 72 — Remove blue planet highlight (no planet should ever highlight blue)
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `PlanetNode` selection pulse `borderColor` interpolation changed from white-to-`#4a9eff` to white opacity fade (`rgba(255,255,255,0.85)` → `rgba(255,255,255,0.15)`); drag-origin static border uses `rgba(255,255,255,0.6)` instead of `COLORS.accent`. `COLORS.accent` unchanged (buttons, chips, slider).
**Notes:** No other planet rendering logic changed. `npx tsc --noEmit` passes clean.

---

## Task 71 — Tapping an active (prior-turn) filled slot prompts confirmation before deletion (no gold refund)
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `demolishBuilding(planetId, buildingIndex)` removes building when `builtOnRound < currentRound`, no gold refund, ownership guard. `src/screens/GameScreen.tsx` — active filled slots tappable; `Alert.alert` confirmation before `demolishBuilding`; under-construction tap (`cancelBuildOrder`) unchanged.
**Notes:** Slot grid, production output label, and research modal lab count update immediately via store. `npx tsc --noEmit` passes clean.

---

## Task 70 — Tapping a just-built (this-turn) filled slot cancels the build and refunds gold
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `cancelBuildOrder(planetId, buildingIndex)` removes building when `builtOnRound === currentRound`, refunds factory/lab gold cost to current player, filters hypothetical `BUILD` entries from `queuedOrders`. `src/screens/GameScreen.tsx` — under-construction slots tappable; `handleBuildingSlotPress` calls `cancelBuildOrder` for same-round buildings; active slots remain disabled until Task 71.
**Notes:** No confirmation prompt; status bar gold updates immediately via store. `npx tsc --noEmit` passes clean.

---

## Task 69 — Show error message when player taps a build slot without enough gold
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `queueBuildOrder` returns `QueueBuildOrderResult` (`'ok' | 'insufficient_gold' | 'no_slots' | 'not_owner'`); slot and gold checks ordered so gold failure is reported when slots remain. `src/screens/GameScreen.tsx` — `buildError` local state; red **Not enough gold** label between build chips and slot grid on `insufficient_gold`; 2s auto-dismiss via `useEffect`; clears when planet modal closes (`selectedPlanetId` null).
**Notes:** Placement flow unchanged (select chip → tap empty slot). `no_slots` still handled by disabled chips. `npx tsc --noEmit` passes clean.

---

## Task 68 — Move queued orders out of the HUD into a dedicated "Queued" modal button
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — removed left-side `queueOverlay` list and status-bar queued-order count; added **Queued (N)** pill button (`bottom: insets.bottom + 128`, above R&D) matching R&D styling; fade `Modal` lists orders by planet name → planet name with ship count and ✕ calling `cancelQueuedOrder`; empty state **No orders queued**; closes on backdrop or ✕.
**Notes:** Button visible on every human turn (including zero queued). Map pending-departure markers and display-only troop deduction unchanged. `npx tsc --noEmit` passes clean.

---

## Task 67 — Fix conquered planet: immediately green and interactible on capture turn
**Completed:** 2026-05-28
**Files modified:** `src/store/gameStore.ts` — `endTurn` sets `selectedPlanetId: null` atomically with resolved game state; `src/screens/GameScreen.tsx` — `useEffect` clears `selectedPlanetId` and `dragOriginPlanetId` when referenced planet is missing or not owned by local human player. Verified `combatEngine.resolveArrival` assigns `owner` on neutral capture and combat victory (unchanged).

---

## Task 64 — Conquered planet full rendering and interactivity
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts` — `getLocalHumanPlayerId` for fog and ownership UI; `Gesture.Exclusive(fleetDrag, planetTap)` so tap wins over drag; fleet drag starts on first `onUpdate` after `minDistance(10)` (not `onStart`). Verified `combatEngine.resolveArrival` already sets `owner` on capture.

---

## Task 63 — Fix turn counter display in pass-and-play
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — HUD derives `humanTurn = (roundNumber - 1) * players.length + currentPlayerIndex + 1` at render time instead of showing `turnNumber`/`roundNumber` directly; `roundNumber` unchanged in engine.

---

## Task 62 — Shrink default map scale
**Completed:** 2026-05-28
**Files modified:** `src/screens/GameScreen.tsx` — `useSharedValue` initial values for `scale` and `savedScale` changed from `1` to `0.6`
**Notes:** Visual-only default zoom; pinch clamp `[0.4, 4]` and map-dimension reset effect unchanged. `npx tsc --noEmit` passes clean.

---

## Task 61 — Fleet dispatch: tap-to-drag (no hold), tap-only opens modal; clean up HUD
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — removed `activateAfterLongPress(300)` from `fleetDrag` (plain `Gesture.Pan()`); `Gesture.Exclusive(planetTap, fleetDrag)` replaces simultaneous tap+drag; `handleMapTap` opens owned-planet modal (`selectPlanet(planet.id)`) and no-ops on non-owned; status bar sub-line shows `Gold · Tech Level` (removed `sumOwnedShips` / ship count)
- `docs/development/current-state.md` — recorded Task 61 in status, completed list, What Works, and changelog
- `docs/tasks/backlog.md` — marked Task 61 complete
**Notes:** Map pinch/pan composition unchanged (`Gesture.Simultaneous(composed, planetFleet)`). Ownership check on drag start unchanged. `npx tsc --noEmit` passes clean.

---

## Task 60 — Fix zoom/scroll viewport jump (screen teleports when zooming or panning)
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — pinch `onStart` now snapshots live `scale.value`/`translateX.value`/`translateY.value` into `pinchStartScale`/`pinchStartTranslateX/Y` (was incorrectly reading stale `savedTranslate*`); pinch `onUpdate` uses `pinchStartScale` as scale baseline; pan gained `onStart` with `panStartTranslateX/Y` baselines (was missing, causing pan to accumulate from last-committed translate); pan `onUpdate` uses pan-start baselines; both `onEnd` handlers commit without reset; `screenToMapCoords` restored center-compensation (`effectiveTx/Y = raw + mapDim*(scale-1)/2`) for planet tap/drag at all zoom levels
- `docs/development/current-state.md` — recorded Task 60 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 60 complete
**Notes:** Map-dimension reset in `useEffect` (scale/translate → 1/0 on new map size) unchanged — only runs when `gameState.map` dimensions change. Pan clamping (`clampTranslation`) unchanged from Task 40. `npx tsc --noEmit` passes clean.

---

## Task 59 — Remove double-tap-to-zoom gesture
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — removed `doubleTap` gesture (`Gesture.Tap().numberOfTaps(2)` with 1.5× spring zoom); `mapGesture` now composes pinch/pan (`composed`), `planetTap`, and `fleetDrag` only; removed unused `withSpring` import
- `docs/development/current-state.md` — recorded Task 59 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 59 complete
**Notes:** Pinch-to-zoom (0.4×–4×), pan clamping, single-tap planet selection, and long-press fleet drag are unchanged.

---

## Task 58 — Conquered planet rendering and build access identical to home planet
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — verified ownership-based rendering (`getPlanetColor`, `isOwned`, tap handler, owned-planet modal); troop count label now renders for every owned planet (including 0 garrison), not only when `shipCount > 0`
- `src/store/gameStore.ts` — `setProductionSlider` now rejects updates when `planet.owner !== currentPlayerId` (aligned with `queueBuildOrder`)
- `docs/development/current-state.md` — recorded Task 58 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 58 complete
**Notes:** Audit found no `isHomePlanet` usage in `GameScreen` (legacy `isHome` prop removed in earlier UI refactor). `combatEngine.resolveArrival` already assigns `planet.owner = fleet.ownerId` on neutral capture and successful combat; fog-of-war `buildVisibleState` returns full planet data for any `owner === viewingPlayerId`, so captured worlds pick up green fill and modal detail on the next render automatically.

---

## Task 57 — Fix turn/round semantics: round increments only after all players have acted
**Completed:** 2026-05-28
**Files modified:**
- `src/game/turnEngine.ts` — moved round-gated simulation ticks to turn-order wrap only; `advanceFleets` and `runProduction` now execute once per full player cycle, and `roundNumber` increments only on wrap; added maintainer comment clarifying turn vs round semantics
- `src/game/movementEngine.ts` — documented transit/arrival timing near `advanceFleets` (zero-turn fleets resolve later at turn start)
- `docs/systems/turn-engine.md` — updated turn-resolution order and round-wrap tick semantics
- `docs/systems/movement.md` — clarified once-per-round transit cadence and explicit ETA-2 example (round 1 dispatch arrives at start of round 3)
- `docs/systems/production.md` — corrected production cadence to once per round and aligned `currentRound` activation wording
- `docs/development/current-state.md` — recorded Task 57 in status, completed list, and changelog
- `docs/tasks/backlog.md` — marked Task 57 complete
**Notes:** `src/store/gameStore.ts` already initialized `roundNumber: 1` and `endTurn` already routed updated game state through `resolveTurn`; no store changes were required.

---

## Task 56 — Closest planet minimum distance = 4 clicks
**Completed:** 2026-05-28
**Files modified:**
- `src/game/mapGenerator.ts` — replaced `MIN_DISTANCE_FLOOR` with fixed `MIN_PLANET_DISTANCE = 4`; simplified `minPlanetDistance` to return the constant for all maps; updated generate-path call site to use the new constant-driven function
- `src/screens/HomeScreen.tsx` — resized map presets to keep placement feasible with `PLANET_EDGE_PADDING = 3` and 4-click minimum spacing: Small `40 × 40 · 16 worlds`, Medium `60 × 60 · 32 worlds`, Large `80 × 80 · 54 worlds`
- `docs/systems/map-generation.md` — replaced old dynamic min-distance formula docs with fixed-constant rule and added updated preset capacity table/changelog note
- `docs/development/current-state.md` — recorded Task 56 in Completed and Changelog and updated overall status
- `docs/tasks/backlog.md` — marked Task 56 complete
**Notes:** Home-planet separation logic in `spawnPlacer.ts` already maximizes pairwise distance across 200 candidate assignments and required no code changes. Presets satisfy the density guard `planetCount <= ((width - 6) * (height - 6) / 12.57) * 0.5`.

---

## Task 55 — Production slider: show live gold and troop output at current position
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — imported `FACTORY_TROOP_OUTPUT` and `FACTORY_GOLD_OUTPUT`, computed active factory count (`builtOnRound < roundNumber`) for the selected planet, and added a live output label under the existing slider split label: `⚔ X.X troops/turn · 💰 Y.Y gold/turn`
- `docs/systems/production.md` — documented the new planet-modal live output label behavior in the Production slider section and changelog
- `docs/development/current-state.md` — recorded Task 55 in Completed and Changelog; updated overall Phase 6 status to Tasks 47–55 complete
- `docs/tasks/backlog.md` — marked Task 55 complete
**Notes:** The live output label re-renders as `productionSlider` changes, so values update in real time while dragging. The slider and split-percentage label behavior are unchanged.

---

## Task 54 — Visual icons for factory and research lab buildings in the planet modal
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — in the owned-planet modal building slot grid, replaced filled-slot labels from `F`/`R` to emoji icons (`🏭` for `factory`, `🔬` for `researchLab`) and increased `buildingSlotLabel` font size to `22` for clean fit in 40×40 tiles
- `docs/development/current-state.md` — recorded Task 54 in Completed and Changelog; updated owned planet modal description to icon-based slot labels
- `docs/tasks/backlog.md` — marked Task 54 complete (strikethrough + completed date)
**Notes:** Under-construction visual behavior is unchanged (`buildingSlotUnderConstruction` still applies `opacity: 0.35`), so same-round placed buildings appear dimmed with the new emoji icons. Empty slots remain outline-only with no icon.

---

## Task 53 — Home planet class variation (A-G) with class-specific starting gold and slot count
**Completed:** 2026-05-28
**Files modified:**
- `src/game/spawnPlacer.ts` — exported `HOME_PLANET_CLASS_CONFIG`; `placeSpawns` now returns `{ map, homePlanetClassByPlayerId }`, assigns each home planet a seeded-random class A-G (`Math.floor(rng() * 7)`), and applies class-specific home `buildingSlots`
- `src/store/gameStore.ts` — imports `HOME_PLANET_CLASS_CONFIG`; `startNewGame` reads `homePlanetClassByPlayerId` from `placeSpawns`; `buildPlayers` initializes each player's `gold` from the assigned home-planet class config instead of flat `STARTING_GOLD`
- `docs/systems/map-generation.md` — added Home Planet Classes table and behavior notes
- `docs/development/current-state.md` — recorded Task 53 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 53 complete
**Notes:** Spawn fairness search/scoring and candidate selection are unchanged. Only home planets are affected; non-home planets retain map-generated class and slot values.

---

## Task 52 — Increase spawn rate of A, B, C planet classes
**Completed:** 2026-05-28
**Files modified:**
- `src/game/mapGenerator.ts` — updated `PLANET_CLASS_WEIGHTS` to A=0.08, B=0.15, C=0.25, D=0.27, E=0.25 and removed classes F–P from weighted roll entries
- `docs/systems/map-generation.md` — updated class distribution table and changelog to reflect new A–E weights
- `docs/development/current-state.md` — recorded Task 52 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 52 complete
**Notes:** Weights now sum to exactly 1.00 (`0.08 + 0.15 + 0.25 + 0.27 + 0.25`). D and E remain the most common classes while A/B/C appear more frequently than before.

---

## Task 51 — Research info button + modal
**Completed:** 2026-05-28
**Changed files:**
- `src/screens/GameScreen.tsx` — added `showResearchModal` state, R&D button (bottom-right above End Turn), and research modal showing tech level, banked points vs threshold, active lab count, and projected turns to next level; uses `researchThreshold` and `MAX_TECH_LEVEL` from `productionEngine`

---

## Task 50 — Building purchase: deduct gold immediately and enforce slot capacity
**Completed:** 2026-05-28
**Files modified:**
- `src/store/gameStore.ts` — `queueBuildOrder` now validates active player ownership, required build gold (`FACTORY_GOLD_COST` / `RESEARCH_LAB_GOLD_COST`), and planet slot availability using committed + same-round queued builds; invalid requests no-op; valid requests now immediately deduct player gold and append under-construction building
- `src/screens/GameScreen.tsx` — owned-planet modal now computes `availableSlots` from committed + same-round queued builds and disables/dims Factory/Research Lab chips when no slots remain
- `docs/systems/production.md` — documented immediate build-order gold deduction and slot-capacity enforcement at queue time
- `docs/development/current-state.md` — recorded Task 50 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 50 complete
**Notes:** Turn resolution and production pipeline are unchanged; this is a queue-time validation/economy UX fix. Gold in the status bar now updates instantly after each successful build order.

---

## Task 49 — Fleet dispatch modal: show click distance and turn count
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — imported `computeClickDistance`, `computeTurnsInTransit`, and `effectiveSpeed`; added memoized pending-route metrics for the confirm-fleet modal; rendered a new modal info line showing `Distance: X.X clicks · ETA: N turn(s)` between route text and ship stepper; added `modalRouteInfo` style matching existing muted modal metadata
- `docs/development/current-state.md` — recorded Task 49 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 49 complete
**Notes:** No store or engine changes. Existing modal open/close, confirm/cancel flow, and ship stepper behavior remain unchanged.

---

## Task 48 — Add padding between planets and board edges
**Completed:** 2026-05-28
**Files modified:**
- `src/game/mapGenerator.ts` — added `PLANET_EDGE_PADDING = 3` and constrained random candidate position sampling to padded bounds: `x ∈ [3, width - 1 - 3]`, `y ∈ [3, height - 1 - 3]`, applied directly where `(x, y)` is generated before minimum-distance rejection checks
- `docs/systems/map-generation.md` — documented `PLANET_EDGE_PADDING` and padded coordinate sampling bounds in planet placement notes
- `docs/development/current-state.md` — recorded Task 48 in Completed and Changelog
- `docs/tasks/backlog.md` — marked Task 48 complete
**Notes:** Minimum-distance rejection logic and class-weight sampling were unchanged. Seeded RNG remains deterministic, with maps now generated within padded interior bounds.

---

## Task 47 — Fix planet tap hit-detection (click box centred on planet with padding)
**Completed:** 2026-05-28
**Files modified:**
- `src/screens/GameScreen.tsx` — `PlanetNode` touch wrapper now anchors to the exact planet center using `left/top = center - PLANET_SIZE_SELECTED / 2`, keeping the circle inside the touch container rather than offset from it
- `src/screens/GameScreen.tsx` — added uniform `PLANET_TAP_HIT_SLOP` (`top/bottom/left/right: 8`) to `TouchableOpacity` presses and drag-enabled tap/pan gestures for padded, reliable taps at scale 1 and while zoomed
**Notes:** Planet visuals (circle size, labels, fonts, colors, gesture behavior) were preserved; change is hit-area-only. Manual verification pending in simulator/device for home-planet modal open at default zoom.

---

## Task 46 — Building construction delay: gray icon for just-built buildings
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `Building` now includes `builtOnRound: number`
- `src/store/gameStore.ts` — `queueBuildOrder` now stamps new buildings with `builtOnRound: record.state.roundNumber`
- `src/game/productionEngine.ts` — `runProduction(map, players, currentRound)` now counts only active buildings where `builtOnRound < currentRound`
- `src/game/turnEngine.ts` — passes `state.roundNumber` into `runProduction`
- `src/screens/GameScreen.tsx` — planet modal slot tiles render with `opacity: 0.35` when `building.builtOnRound === gameState.roundNumber`
- `docs/systems/production.md` — added "Construction Delay" section and updated production counting notes
**Notes:** Newly placed buildings are visible immediately but remain under construction for the rest of the current round; they become productive starting next round. `npx tsc --noEmit` passes clean.

---

## Task 45 — Redesign owned-planet detail modal
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — added `queueBuildOrder(planetId, buildingType)` for optimistic build placement into owned planet slots, and `setProductionSlider(planetId, value)` to update per-planet slider values in active game state (with `[0,1]` clamping)
- `src/screens/GameScreen.tsx` — replaced old label/value planet modal with redesigned layout: centered header + close button, class tile + troop summary row, Factory/Research Lab selectable build chips, interactive building-slots grid (`F`/`R` filled states), and conditional production slider (`@react-native-community/slider`) showing `% troops / % gold`
- `package.json`, `package-lock.json` — installed `@react-native-community/slider`
**Notes:** Modal closes on backdrop tap or `✕`; selecting a build chip then tapping an empty slot immediately queues a build on that planet; production slider only appears when at least one factory exists. `npx tsc --noEmit` passes clean.

---

## Task 44 — Shorter planet names (no truncation with "...")
**Completed:** 2026-05-27
**Files modified:**
- `src/game/mapGenerator.ts` — replaced `PLANET_ADJECTIVES` and `PLANET_NOUNS` with short one- or two-syllable word pools (16 each) to keep generated `[Adjective] [Noun]` labels compact while preserving deterministic seeded name selection
- `src/screens/GameScreen.tsx` — removed `numberOfLines={1}` from `PlanetNode` name label so names render naturally without ellipsis truncation
**Notes:** RNG behavior remains identical in structure and call order (`generatePlanetName(rng)` still performs two indexed `rng()` draws and returns `${adj} ${noun}`), so seeded determinism is unchanged. `npx tsc --noEmit` passes clean.

---

## Task 43 — Non-owned planet rendering: gray with class letter and name
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `PlanetNode` now always renders planet name above and class letter inside for all planets; non-owned labels use muted fog colors (`#666688` name and `rgba(180, 180, 200, 0.5)` class) while owned planets keep bright label styling; ship count rule remains `isOwned && shipCount > 0`
**Notes:** Restores intended fog UX: non-owned planets are still gray blobs for ownership detail, but retain basic identity context (name + class). `npx tsc --noEmit` passes clean.

---

## Task 42 — Fix fog of war: enemy-owned planets must not show white border
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — selection pulse branch (`highlighted && !isDragOrigin`) now requires `isOwned`; non-owned planet taps now call `selectPlanet(null)` instead of setting `selectedPlanetId`
**Notes:** Enemy/neutral planets now render as plain gray circles when tapped, with no white/blue pulse border. Drag-origin accent border remains unchanged and still applies only to owned drag starts. `npx tsc --noEmit` passes clean.

---

## Task 41 — Remove ownership ring/circle from planets
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — removed `homeRing` render block and deleted `styles.homeRing`; removed `isHome` prop from `PlanetNode`; removed home-based touch offset and white home border logic from planet circle rendering
**Notes:** Planet ownership no longer adds any ring/border. Interaction feedback borders remain intact: drag origin still uses accent border and selected/highlighted planets still use the animated pulse border. `npx tsc --noEmit` passes clean.

---

## Task 40 — Fix pinch-zoom scroll clamping (can't reach board edges when zoomed in)
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `clampTranslation` now clamps exactly to `[-(mapSize * scale - viewportSize), 0]` per axis with a zero-offset guard when the scaled map is smaller than the viewport; map transform no longer depends on `transformOrigin` and explicitly compensates center-based scaling so effective screen math stays `screen = map * scale + translate`
**Notes:** Focal-point pinch anchoring (`pinchFocalX/Y`, `pinchStartTranslateX/Y`) and hit detection (`screenToMapCoords`) were kept aligned to the same transform formula, so no gameplay interaction regressions. `npx tsc --noEmit` passes clean.

---

## Task 39 — Research system overhaul (exponential level-up thresholds)
**Completed:** 2026-05-27
**Files modified:**
- `src/game/productionEngine.ts` — removed flat `RESEARCH_POINTS_PER_LEVEL`; added exported `researchThreshold(level)` using `Math.round(10 * Math.pow(1.5, level))`; updated level-up loop to recalculate threshold after each tech gain; kept `MAX_TECH_LEVEL=15`
- `docs/systems/production.md` — Research Level-Up section updated with exponential formula and sample curve values; flat-threshold documentation removed
**Notes:** Verified `RESEARCH_LAB_POINTS_PER_TURN` remains `1` and `buildPlayers` already initializes `techLevel: 0`. `npx tsc --noEmit` passes clean.

---

## Task 38 — End Turn button: smaller, bottom-right corner
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `bottomPanel` View removed entirely; End Turn replaced with compact absolutely-positioned `Pressable` (`right: 16`, `bottom: insets.bottom+16`, `zIndex: 10`); queued orders moved to `queueOverlay` (bottom-left absolute, semi-transparent); game-over banner moved to `gameOverOverlay` (centred absolute overlay); new styles: `endTurnButton`, `endTurnButtonText`, `queueOverlay`, `queueOverlayHeader`, `queueOverlayRow`, `queueOverlayText`, `queueOverlayCancelText`, `gameOverOverlay`
**Notes:** Map now fills the full screen height. Lock screen, fleet dispatch modal, and planet detail modal unaffected. `npx tsc --noEmit` passes clean.

---

## Task 37 — Planet detail modal popup on tap
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — planet detail `Modal` added (transparent, fade, backdrop-close); shows planet name, class, troops, building slots used/total, buildings breakdown (factory/lab counts), production slider %; `planetSection` block removed from bottom panel `ScrollView`; new styles: `planetDetailCard`, `planetDetailHeader`, `planetDetailName`, `planetDetailClose`, `planetDetailRow`, `planetDetailLabel`, `planetDetailValue`, `planetDetailHint`
**Notes:** Modal only opens when `selectedPlanet.owner === humanPlayer.id`. Tapping non-owned planets still toggles `selectedPlanetId` in the store but no modal appears. Fleet dispatch modal and queue list unaffected. `npx tsc --noEmit` passes clean.

---

## Task 36 — Planet display: name above, class inside, troops below (non-zero only)
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — `isOwned: boolean` prop added to `PlanetNode`; planet name rendered as absolutely-positioned label (`top: -11`, `width: 48`) above circle when `isOwned`; class letter centered inside both circle variants when `isOwned`; troop count suppressed when `!isOwned || shipCount === 0`; `styles.planetCircle` gains `alignItems/justifyContent: 'center'`; `styles.planetNameLabel` and `styles.planetClassLabel` added
**Notes:** Name label uses `position: 'absolute'` so it does not shift the circle's pixel position. `npx tsc --noEmit` passes clean.

---

## Tasks 34–35 — Fog-of-war planet rendering + own-planet green tint
**Completed:** 2026-05-27
**Files modified:**
- `src/screens/GameScreen.tsx` — added `getPlanetColor(planet, humanPlayerId)` for visibility-aware planet coloring; planet nodes now render with palette: own `#27ae60`, neutral `#2a2a4a`, enemy/non-owned `#333355`
- `docs/systems/map-generation.md` — fog-of-war rendering behavior updated to document the new three-color palette and fleet-color exception
**Notes:** `getPlayerColor(ownerId, humanPlayerId, players)` remains in use by `FleetLayer` so fleet dots/lines still render in player colors. `npx tsc --noEmit` passes clean.

---

## Task 33 — AI names: simple, unique, non-clashing with humans
**Completed:** 2026-05-27
**Files modified:**
- `src/game/aiEngine.ts` — replaced `[Name] [Epithet]` lists with a single pool of short first-names; `generateAiName(rng, usedNames)` now shuffles deterministically and picks the first case-insensitive unused name, with `AI {n}` fallback
- `src/store/gameStore.ts` — `buildPlayers` now tracks `usedNames` while iterating slots; human and AI names are added as they are assigned; AI calls `generateAiName(aiNameRng, usedNames)` to avoid collisions with both humans and prior AIs
**Notes:** AI logic/difficulty behavior unchanged; only naming path updated. `npx tsc --noEmit` passes clean.

---

## Task 32 — Human player name input in game setup
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `PlayerSlot` now includes optional `name`; `buildPlayers` now names human players from `slot.name?.trim()` with fallback `Player {n}` (`n` = 1-based human index), AI naming unchanged
- `src/screens/HomeScreen.tsx` — added compact `TextInput` ("Player name") for each human slot (including fixed slot 0); hooked local slot state updates for name entry
**Notes:** `PlayerSlot` is defined in the store (not `src/game/types.ts`), so `types.ts` did not require changes. `npx tsc --noEmit` passes clean.

---

## Task 31 — Fix zoom/pan and touch hit-detection
**Completed:** 2026-05-27  
**Files modified:**
- `src/screens/GameScreen.tsx` — `transformOrigin: '0% 0%'` added as static style on the map `Animated.View`; four new shared values (`pinchFocalX`, `pinchFocalY`, `pinchStartTranslateX`, `pinchStartTranslateY`); `Gesture.Pinch` rewritten with `onStart` (captures focal point + initial translation), `onUpdate` (focal-point–anchored scale math + clamp), `onEnd` (saves final values)
**Notes:** Root cause was React Native's default scale origin at element center, which invalidated `screenToMapCoords`, `clampTranslation`, and the pinch gesture. Adding `transformOrigin: '0% 0%'` makes scale anchor at the top-left corner, making all existing math correct. Focal-point anchoring formula: `newTx = fx - (fx - savedTx) * (newScale / savedScale)`. `pan`, `doubleTap`, `clampTranslation`, and `screenToMapCoords` unchanged. `npx tsc --noEmit` passes clean.

---

## Task 1 — Set up clean folder structure
**Completed:** 2026-05-27
**Files created:**
- `src/game/types.ts`
- `src/game/mapGenerator.ts`
- `src/game/spawnPlacer.ts`
- `src/game/turnEngine.ts`
- `src/game/productionEngine.ts`
- `src/game/movementEngine.ts`
- `src/game/combatEngine.ts`
- `src/game/aiEngine.ts`
- `src/game/validationEngine.ts`
- `src/game/index.ts`
**Notes:** All stubs. `npx tsc --noEmit` passes clean.

---

## Task 2 — Define game types/interfaces
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts`
**Types defined:** `PlanetClass`, `BuildingType`, `OwnerId`, `Position`, `Building`, `Planet`, `Fleet`, `Player`, `GameMap`, `GameState`
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 3 — Build deterministic map generator
**Completed:** 2026-05-27
**Files modified:**
- `src/game/mapGenerator.ts`
**Exports:** `MapConfig`, `generateMap()`
**Notes:** Mulberry32 seeded RNG (no `Math.random()`). Planet class weights E=35%, D=30%, C=20%, B=10%, A=5%. Minimum planet spacing `max(2, min(width,height) / (planetCount * 0.5))`. `npx tsc --noEmit` passes clean.

---

## Task 4 — Build fair starting-position placement
**Completed:** 2026-05-27
**Files modified:**
- `src/game/spawnPlacer.ts`
**Exports:** `placeSpawns()`
**Notes:** Evaluates 200 random one-planet-per-player assignments. Scores each set with weighted, batch-normalized metrics: minimum pairwise home distance (0.5), variance of nearby planet counts within `R = min(width,height)*0.25` (0.3, lower is better), and center-bias penalty averaged per home (0.2, lower is better). Winning assignment sets `isHomePlanet`, `owner`, and `shipCount: 5`. Returns a new `GameMap` without mutating the input. `npx tsc --noEmit` passes clean.

---

## Task 5 — Build turn engine
**Completed:** 2026-05-27
**Files modified:**
- `src/game/turnEngine.ts`
- `src/game/combatEngine.ts` (stub `resolveArrival` signature)
- `src/game/productionEngine.ts` (stub `runProduction` signature)
**Exports:** `PlayerAction`, `TurnInput`, `resolveTurn()`
**Notes:** Validates active player and game status. Processes `SEND_FLEET` (distance-based `turnsRemaining`, garrison rules, fleet ids `fleet-{turnNumber}-{index}`). Advances all fleets, calls `resolveArrival` and `runProduction` stubs, updates elimination from home-planet ownership, sets winner when one player remains, cycles `currentPlayerId` among non-eliminated players. Immutable input — returns new `GameState`. `npx tsc --noEmit` passes clean.

---

## Task 6 — Build planet production
**Completed:** 2026-05-27
**Files modified:**
- `src/game/productionEngine.ts`
- `src/game/turnEngine.ts`
**Files created:**
- `docs/systems/production.md`
**Exports:** `runProduction()`, `PLANET_CLASS_MULTIPLIERS`, `BASE_SHIP_PRODUCTION`, `BASE_RESOURCE_PRODUCTION`, `MANUFACTURING_BONUS_PER_LEVEL`
**Notes:** Per owned planet each turn: `multiplier = classMultiplier + Σ(manufacturingFacility.level × 0.4)`; class multipliers A=2.0, B=1.6, C=1.2, D=0.8, E=0.5; `ships = floor(2 × multiplier)` added to `planet.shipCount`; `resources = floor(1 × multiplier)` added to owner `Player.resources`. Neutral planets skipped. Returns `{ map, players }` without mutating inputs. `turnEngine.resolveTurn` destructures the result. `npx tsc --noEmit` passes clean.

---

## Task 7 — Build fleet movement
**Completed:** 2026-05-27
**Files modified:**
- `src/game/movementEngine.ts`
- `src/game/turnEngine.ts`
**Files created:**
- `docs/systems/movement.md`
**Exports:** `computeTurnsInTransit()`, `createFleet()`, `advanceFleets()`
**Notes:** Transit time = `Math.max(1, Math.ceil(euclidean distance))`. Fleet ids `fleet-{turnNumber}-{fleetIndex}`. `advanceFleets` decrements `turnsRemaining` immutably and splits into `inTransit` / `arrived` (arrived fleets get `turnsRemaining: 0`). `turnEngine` delegates dispatch and advance; removed inline `euclideanDistanceCeil`. `npx tsc --noEmit` passes clean.

---

## Task 8 — Build combat resolver
**Completed:** 2026-05-27
**Files modified:**
- `src/game/combatEngine.ts`
**Files created:**
- `docs/systems/combat.md` (documented implementation)
**Exports:** `resolveArrival()`, `DEFENSE_BONUS`, `ATTACKER_TECH_MULTIPLIER`, `DEFENDER_TECH_MULTIPLIER`
**Notes:** On fleet arrival: friendly owner match adds `fleet.shipCount` to garrison; neutral planets transfer ownership with fleet ships as garrison; enemy planets run deterministic combat — `attackerStrength = fleet.shipCount × ATTACKER_TECH_MULTIPLIER`, `defenderStrength = planet.shipCount × DEFENDER_TECH_MULTIPLIER × DEFENSE_BONUS` (1.2 defender bonus). Attacker wins if strictly greater (`shipCount = floor(attacker - defender)`, owner changes); defender holds on tie or win (`shipCount = floor(defender - attacker)`, owner unchanged). Tech multipliers fixed at 1.0 pending player lookup. Returns new `GameMap` without mutating inputs. `npx tsc --noEmit` passes clean.

---

## Task 9 — Build simple AI
**Completed:** 2026-05-27
**Files modified:**
- `src/game/aiEngine.ts`
**Files created:**
- `docs/systems/ai-system.md` (documented implementation)
**Exports:** `computeAiTurn()`, `AiDifficulty`
**Notes:** Deterministic heuristic AI (no randomness). Priority: (1) reinforce home if garrison < any incoming enemy fleet and source has `shipCount > 5`; (2) attack lowest `shipCount / distanceToNearestAiPlanet` enemy where `floor(60% ships)` wins combat (`DEFENSE_BONUS`); (3) expand to nearest neutral with `floor(50% ships)` from closest AI planet with `shipCount > 4`; (4) `END_TURN`. One source planet per turn; always leaves ≥1 ship on source. `AiDifficulty` (`easy` | `normal`) exported for future tuning (same logic today). `npx tsc --noEmit` passes clean.

---

## Task 10 — Build playable local screen
**Completed:** 2026-05-27
**Sub-tasks:** 10a (Zustand store), 10b (HomeScreen + navigation), 10c (GameScreen gameplay UI)
**Files created:**
- `src/store/gameStore.ts`
- `src/screens/HomeScreen.tsx`
- `src/screens/GameScreen.tsx`
**Files modified:**
- `App.tsx` — `NavigationContainer`, native stack, `RootStackParamList`
- `package.json` — zustand, React Navigation, safe-area/screens peers
**Notes:** Local MVP: Home configures match and calls `startNewGame`; Game shows pannable 2D map (`CELL_SIZE` 18), owner-colored planets, fleet dispatch UI, auto AI turn resolution via store. MVP limits: one human `sendFleet` per turn (full turn resolves on send); no SVG fleet lines (`react-native-svg` not installed). `npx tsc --noEmit` passes clean.

---

## Task 28 — Pass-and-play screen blanking between turns
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `showingLockScreen` state; `dismissLockScreen`; `endTurn` sets lock screen when `playMode === 'passAndPlay'` and game is still active; cleared on `startNewGame`, `loadGame`, `resetGame`
- `src/screens/GameScreen.tsx` — full-screen lock overlay after main UI; "Pass the device" / "Tap anywhere to continue"; absolute positioning with `zIndex: 100` and safe-area padding
**Notes:** UI-only; no `turn-engine.md` changes. With one human player per device, the lock screen appears every time the human's turn begins after End Turn (prevents accidental peek at AI-resolved state before intentional dismiss). Map renders underneath overlay to avoid flash on dismiss. `npx tsc --noEmit` passes clean.

---

## Task 26 — Cancel in-transit fleet (same turn only)
**Completed:** 2026-05-27
**Satisfied by:** Task 27 queue model — no dedicated code change
**Notes:** Ships are not deducted from `GameState` until `endTurn()` commits queued `SEND_FLEET` actions. Cancelling a queued order via the ✕ button in the orders list removes it from `queuedOrders` before commit, so troops remain on the origin planet. Only same-turn (pre–End Turn) orders are cancellable; in-transit fleets from prior turns are not in the queue.

---

## Task 27 — End Turn button + multiple fleet orders per turn
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `queuedOrders`, `queueOrder`, `cancelQueuedOrder`, `endTurn`; `confirmPendingFleet` queues instead of resolving; `sendFleet` removed; UI state resets include `queuedOrders: []`
- `src/screens/GameScreen.tsx` — queued orders list with cancel; End Turn button; status bar shows queue count; `modalMaxShips` accounts for ships already queued from same origin
- `docs/systems/turn-engine.md` — client commit model and Task 27 changelog
**Notes:** Human turn ends only on **End Turn**, which submits all queued `SEND_FLEET` actions plus `{ type: 'END_TURN' }` in one `resolveTurn` call, then `runAiTurnsUntilHuman`. `turnEngine.ts` unchanged (already supported multiple dispatches). `npx tsc --noEmit` passes clean.

---

## Task 25 — In-transit fleet position visualization
**Completed:** 2026-05-27
**Files modified:**
- `package.json` — `react-native-svg 15.12.1` added
- `src/game/types.ts` — `totalTurns: number` added to `Fleet`
- `src/game/movementEngine.ts` — `createFleet` sets `totalTurns: turnsRemaining` on the returned fleet
- `src/screens/GameScreen.tsx` — `FleetLayer` SVG component renders interpolated fleet position dots, dashed lines to destination, and ship count labels; old `FleetMarker` component and `fleetsByDestination` memo removed
- `docs/systems/movement.md` — fleet visualization section updated
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 24 — Drag-to-move fleet UX
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `PendingFleet` type; `pendingFleet`, `setPendingFleet`, `confirmPendingFleet` added to store; `resetGame` clears pending fleet
- `src/screens/GameScreen.tsx` — long-press on owned planets starts drag; drag line drawn to finger position; on release: planet hit detection within `CELL_SIZE × 1.5` radius; `isInRange`/`effectiveRange` check; out-of-range toast; ship-count modal with stepper; old destination chips, stepper, and Send button removed; `destPlanetId`/`canSend`/`handleSendFleet` all removed
- `docs/systems/movement.md` — drag-to-move UX documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 23 — Pinch-to-zoom map
**Completed:** 2026-05-27
**Files modified:**
- `package.json` — `react-native-gesture-handler ~2.28.0` and `react-native-reanimated ~4.1.1` added
- `App.tsx` — `GestureHandlerRootView` wraps root
- `src/screens/GameScreen.tsx` — double-`ScrollView` replaced with Reanimated-animated `Animated.View` inside `GestureDetector`; pinch (scale 0.4–4×), pan (clamped), double-tap (1.5× spring zoom) gestures composed with `Gesture.Simultaneous`; saved values reset on game change
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 22 — Support up to 8 players with configurable AI difficulty
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `difficulty?: AiDifficulty` added to `Player`
- `src/game/aiEngine.ts` — confirmed `AiDifficulty` export in place; no logic changes
- `src/store/gameStore.ts` — `PlayerSlot { type, difficulty? }` and `GameConfig.playerSlots[]` replace `aiCount`; `startNewGame` derives player count and AI flags from slots; `difficulty` stored on each AI player
- `src/screens/HomeScreen.tsx` — player slot builder UI; slot 0 fixed as human; slots 1+ human/AI toggle; AI slots show Easy/Normal difficulty chips; Add Player / Remove buttons; min 2, max 8 slots
- `docs/systems/ai-system.md` — difficulty and slot system documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 21 — Pass-and-play vs. async multiplayer mode selection
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `PlayMode = 'passAndPlay' | 'asyncMultiplayer'` exported; `playMode: PlayMode` added to `GameState`
- `src/store/gameStore.ts` — `playMode` added to `GameConfig`; passed through to `GameState` in `startNewGame`
- `src/screens/HomeScreen.tsx` — `playMode` state added; two-card selector added to setup form; async card styled as "coming soon"
- `docs/systems/multiplayer.md` — Play Modes section added
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 20 — Remove map seed from new game setup
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `seed` removed from `GameConfig`; seed generated internally as `Date.now()` in `startNewGame`; still stored in `GameState.seed` and `GameRecord.config` for reproducibility
- `src/screens/HomeScreen.tsx` — `seedText` state, seed `TextInput`, hint text, and seed parsing logic removed from setup form
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 19 — Multi-game lobby home screen
**Completed:** 2026-05-27
**Files modified:**
- `src/store/gameStore.ts` — `GameRecord { id, name, state, config }` added and exported; store refactored from `gameState/config` to `games[]`/`activeGameId`; `loadGame`, `deleteGame`, `getActiveRecord` implemented; all existing actions (`sendFleet`, `selectPlanet`, `resetGame`, `getVisibleGameState`) updated to operate on active record
- `src/screens/HomeScreen.tsx` — rewritten as lobby + inline setup form; `GameCard` component shows game name, players, current player, YOUR TURN badge, VICTORY/DEFEAT; "New Campaign" footer button; empty state message
- `docs/systems/save-system.md` — multi-game architecture documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 18 — Random AI player names
**Completed:** 2026-05-27
**Files modified:**
- `src/game/aiEngine.ts` — `AI_FIRST_NAMES`, `AI_EPITHETS` word lists added; `generateAiName(rng)` exported
- `src/store/gameStore.ts` — imports `generateAiName`; `aiNameRng = mulberry32(config.seed + 2)` created in `startNewGame`; `buildPlayers` accepts and uses `aiNameRng`; AI players now get `[Name] [Epithet]` names
- `docs/systems/ai-system.md` — AI Player Names section added
**Notes:** `npx tsc --noEmit` passes clean. Phase 2 complete.

---

## Task 17 — Random planet names
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `name: string` added to `Planet` and `VisiblePlanet` interfaces
- `src/game/mapGenerator.ts` — `PLANET_ADJECTIVES` and `PLANET_NOUNS` word lists added; `generatePlanetName(rng)` helper generates `[Adjective] [Noun]` format using seeded RNG; `name` field set on every planet at creation
- `docs/systems/map-generation.md` — Planet Names section added
**Notes:** `spawnPlacer.ts` unchanged — uses object spread so `name` is preserved automatically. `npx tsc --noEmit` passes clean.

---

## Task 16 — Research level system
**Completed:** 2026-05-27
**Files modified:**
- `src/game/productionEngine.ts` — `MAX_TECH_LEVEL=15`, `RESEARCH_POINTS_PER_LEVEL=10` added; level-up loop in `runProduction` increments `techLevel` and drains `researchPoints`
- `src/game/movementEngine.ts` — `effectiveRange(techLevel)`, `effectiveSpeed(techLevel)`, `RANGE_CLICKS_PER_TECH_LEVEL=1`, `SPEED_CLICKS_PER_TECH_LEVEL=0.5` added
- `src/game/turnEngine.ts` — `processSendFleet` accepts `players`, looks up dispatching player's `techLevel`, applies `effectiveRange`/`effectiveSpeed` to range check and transit time
- `docs/systems/production.md` — Research Level-Up section added
- `docs/systems/movement.md` — new constants and helpers documented
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 15 — Planet ownership persistence
**Completed:** 2026-05-27
**Files modified:**
- `docs/systems/combat.md` — Planet Ownership section added; 0-garrison auto-capture rule documented
**Notes:** No code changes required. Existing `combatEngine.ts` and `turnEngine.ts` already correctly implement the rule — elimination is triggered by `home.owner !== player.id`, not by `shipCount = 0`. `npx tsc --noEmit` passes clean.

---

## Task 14 — Fog of war
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `VisiblePlanet` interface added (for future UI use)
- `src/store/gameStore.ts` — `buildVisibleState` helper zeros non-owned planet details and strips enemy fleets; `getVisibleGameState()` added to `GameStore` interface and implemented
- `src/screens/GameScreen.tsx` — now reads `getVisibleGameState()` instead of raw `gameState`
- `docs/systems/map-generation.md` — fog of war section added
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 13 — Round-based simultaneous resolution
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `GameState` gains `roundNumber: number`; `Fleet` gains `dispatchedInRound: number`
- `src/game/movementEngine.ts` — `createFleet` accepts and stores `dispatchedInRound`
- `src/game/turnEngine.ts` — arrivals resolved at turn start only when `turnsRemaining <= 0 && dispatchedInRound < roundNumber`; newly-advanced fleets with `turnsRemaining: 0` retained in fleet list; `roundNumber` increments on player-order wrap; bug fix: `arrived` fleets from `advanceFleets` merged back into transit list
- `src/store/gameStore.ts` — initial `GameState` includes `roundNumber: 1`
- `docs/systems/turn-engine.md` — updated
- `docs/systems/movement.md` — updated
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 12 — Rework production system
**Completed:** 2026-05-27
**Files modified:**
- `src/game/types.ts` — `PlanetClass` extended to A–P; `Building.level` removed; `Planet` gains `troopAccumulator`, `buildingSlots`, `productionSlider`; `Player.resources` renamed to `gold`, `researchPoints` added; `BuildingType` changed to `'factory' | 'researchLab'`
- `src/game/productionEngine.ts` — full rewrite; slot-based factory/lab output with A–P tables, slider mechanic, `troopAccumulator` logic
- `src/game/mapGenerator.ts` — `PLANET_CLASS_WEIGHTS` expanded to A–P; planets initialized with `buildingSlots` (1–20), `troopAccumulator: 0`, `productionSlider: 0.5`, `buildings: []`
- `src/store/gameStore.ts` — player init updated to `gold: STARTING_GOLD, researchPoints: 0`
- `src/screens/GameScreen.tsx` — status bar updated from `resources` to `gold`
- `docs/systems/production.md` — fully rewritten to document new system
**Exports added:** `FACTORY_GOLD_COST`, `RESEARCH_LAB_GOLD_COST`, `STARTING_GOLD`, `RESEARCH_LAB_POINTS_PER_TURN`, `FACTORY_TROOP_OUTPUT`, `FACTORY_GOLD_OUTPUT`
**Notes:** `npx tsc --noEmit` passes clean.

---

## Task 11 — Rework movement system (clicks)
**Completed:** 2026-05-27
**Files modified:**
- `src/game/movementEngine.ts`
- `src/game/turnEngine.ts`
- `docs/systems/movement.md`
**Exports added:** `BASE_FLEET_RANGE_CLICKS`, `BASE_FLEET_SPEED_CLICKS_PER_TURN`, `computeClickDistance()`, `isInRange()`
**Notes:** Replaced euclidean-distance-as-turns with clicks model. `computeTurnsInTransit` now divides click distance by speed (default 5 clicks/turn), minimum 1 turn. Range check (`isInRange`) added to `processSendFleet` in `turnEngine` — throws if destination > 11 clicks from origin. Old private `euclideanDistance` helper removed. `npx tsc --noEmit` passes clean.

---

## Changelog
- 2026-05-28: Task 68 entry added.
- 2026-05-28: Task 57 entry added.
- 2026-05-28: Task 56 entry added.
- 2026-05-28: Task 55 entry added.
- 2026-05-28: Task 54 entry added.
- 2026-05-28: Task 53 entry added.
- 2026-05-28: Task 52 entry added.
- 2026-05-28: Task 50 entry added.
- 2026-05-28: Task 49 entry added.
- 2026-05-28: Task 48 entry added.
- 2026-05-28: Task 47 entry added.
- 2026-05-27: Task 46 entry added.
- 2026-05-27: Task 44 entry added.
- 2026-05-27: Task 43 entry added.
- 2026-05-27: Task 41 entry added.
- 2026-05-27: Task 39 entry added.
- 2026-05-27: Task 33 entry added.
- 2026-05-27: Task 32 entry added.
- 2026-05-27: Tasks 26 and 28 entries added.
- 2026-05-27: Task 27 entry added.
- 2026-05-27: Task 25 entry added.
- 2026-05-27: Task 24 entry added.
- 2026-05-27: Task 23 entry added.
- 2026-05-27: Task 22 entry added.
- 2026-05-27: Task 21 entry added.
- 2026-05-27: Task 20 entry added.
- 2026-05-27: Task 19 entry added.
- 2026-05-27: Task 18 entry added. Phase 2 complete.
- 2026-05-27: Task 17 entry added.
- 2026-05-27: Task 16 entry added.
- 2026-05-27: Task 15 entry added.
- 2026-05-27: Task 14 entry added.
- 2026-05-27: Task 13 entry added.
- 2026-05-27: Task 12 entry added.
- 2026-05-27: Task 11 entry added.
- 2026-05-27: Task 10 entry added.
- 2026-05-27: Task 9 entry added.
- 2026-05-27: Task 8 entry added.
- 2026-05-27: Task 7 entry added.
- 2026-05-27: Task 6 entry added.
- 2026-05-27: Task 5 entry added.
- 2026-05-27: Task 4 entry added.
- 2026-05-27: Task 3 entry added.
- 2026-05-27: File created with tasks 1–2.
