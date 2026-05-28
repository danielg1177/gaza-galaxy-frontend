# Known Issues & Technical Debt

## Open Issues

_None._

## Resolved Issues

### Same-turn capture: conquered planet stayed blue and non-interactible until next turn (2026-05-28)
**Symptom:** After End Turn resolved a fleet capture, the planet showed selection/drag-origin accent (blue highlight) and could not be tapped or dragged from until the following turn; next turn it behaved as a normal owned planet.

**Cause:** `selectedPlanetId` and/or `dragOriginPlanetId` in React/local store survived past `resolveTurn` while the planet's `owner` updated in game state — accent styles overrode green ownership rendering and interaction gates still treated the planet as non-owned for that frame/turn.

**Fix:** `endTurn` now sets `selectedPlanetId: null` in the same `set()` as the resolved game state; `GameScreen` runs a `useEffect` that clears selection and drag-origin when the referenced planet is missing or `owner !== localHumanPlayerId`. `combatEngine.resolveArrival` already assigns `owner` on neutral and combat victory (no engine change).

### Conquered owned planets: blue highlight only, tap did not open modal (2026-05-28)
**Symptom:** After capturing a non-home planet, the node showed a blue accent (drag/selection) but not full green owned rendering; tapping did not open the owned-planet detail modal.

**Cause:** `Gesture.Exclusive(planetTap, fleetDrag)` gave `fleetDrag` higher priority (last gesture wins). `fleetDrag.onStart` called `handleDragStart` immediately, setting drag-origin accent before tap could win. Fog/UI ownership used the first human player id only, so pass-and-play could mis-classify the current human's captured planets.

**Fix:** `Gesture.Exclusive(fleetDrag, planetTap)` so tap wins when stationary; fleet drag begins on first `onUpdate` after `minDistance(10)`; exported `getLocalHumanPlayerId` for fog and all `owner ===` UI checks in `GameScreen`.

### Planet tap and long-press drag non-functional (2026-05-28)
**Symptom:** Tapping an owned planet did not open the modal; long-press drag to dispatch a fleet did not activate.

**Cause (1 — gesture competition):** Each `PlanetNode` used its own `GestureDetector` nested inside the map-level `GestureDetector`. In RNGH v2, nested detectors compete for gestures without automatic coordination — the outer map gesture consumed touches before planet gestures could fire.

**Cause (2 — coordinate transform bug):** `screenToMapCoords` used the raw `translateX/Y` values but `animatedStyle` applied an additional center-compensation of `mapDimension * (scale - 1) / 2`. At scale ≠ 1, planet hit-testing was offset by hundreds of pixels.

**Fix:** Removed all gesture/touch handling from `PlanetNode` (now purely presentational with `pointerEvents="none"`). Added `planetTap` (`Gesture.Tap().maxDuration(300)`) and `fleetDrag` (`Gesture.Pan().activateAfterLongPress(300)`) directly to the map-level `GestureDetector`. Updated `screenToMapCoords` to apply the center-compensation: `effectiveTx = rawTx + mapW*(scale-1)/2`.

### Reanimated startup crash — `[runtime not ready]: Exception in HostFunction` (2026-05-27)
**Symptom:** App fails on launch (or when loading Worklets) with `[runtime not ready]: Error: Exception in HostFunction: <unknown>`.

**Cause:** Expo Metro defaults to `inlineRequires: false`. Reanimated 4 / `react-native-worklets` require inline requires so worklets `init()` runs before other exports ([reanimated#8904](https://github.com/software-mansion/react-native-reanimated/issues/8904)).

**Fix:** `metro.config.js` with `inlineRequires: true`, explicit `react-native-worklets` dependency, then `npx expo start --clear`.

### GameScreen infinite re-render — `getSnapshot should be cached` (2026-05-27)
**Symptom:** Starting a game crashes with "The result of getSnapshot should be cached" and "Maximum update depth exceeded".

**Cause:** `useGameStore((s) => s.getVisibleGameState())` calls `buildVisibleState`, which allocates a new object on every selector run. React 19 treats each snapshot as a change.

**Fix:** `useVisibleGameState()` hook — selects the stable `GameRecord` from the store, memoizes fog-of-war projection with `useMemo`. Imperative `getVisibleGameState()` unchanged for non-React callers.

## Technical Debt

_None yet._

---

## Changelog
- 2026-05-28: Task 73 revision — pinch restored (`Gesture.Simultaneous` + `isFleetDragging` pan guard); conquered-planet tap no longer blocked by stale `handleMapTap` ownership closure (modal/effect still gate owned UI).
- 2026-05-28: Documented same-turn capture stale selection/drag-origin fix (Task 67).
- 2026-05-28: Documented planet tap/drag gesture competition + coordinate transform fix.
- 2026-05-27: Documented GameScreen Zustand getSnapshot / useVisibleGameState fix.
- 2026-05-27: Documented Reanimated/Worklets Metro inline-requires fix.
- 2026-05-27: File created.
