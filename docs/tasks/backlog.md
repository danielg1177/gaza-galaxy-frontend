# Backlog

Tasks not yet started, in priority order.

---

## Phase 2 — Core Rules & Engine Redesign

These tasks overhaul the game engine to match the intended design. They must be completed before any UI work that depends on them.

---

~~### Task 11 — Rework movement system (clicks)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 12 — Rework production system (building slots, factories, research buildings, gold/troops slider)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 13 — Round-based simultaneous resolution (fleets never arrive same round they are sent)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 14 — Fog of war (information hiding between players)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 15 — Planet ownership persists without troops (capture = permanent until retaken)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 16 — Research level system (levels 1–15, affects movement)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 17 — Random planet names~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 18 — Random AI player names~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

## Phase 3 — UI/UX Overhaul

These tasks rebuild the frontend experience. Some depend on Phase 2 engine changes.

---

~~### Task 19 — Multi-game lobby home screen~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 20 — Remove map seed from new game setup~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 21 — Pass-and-play vs. async multiplayer mode selection~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 22 — Support up to 8 players (human + AI) with configurable AI difficulty~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`; setup difficulty selector superseded 2026-05-31 by Task 172 hard-only AI default)*

---

~~### Task 23 — Pinch-to-zoom map~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 24 — Drag-to-move fleet UX~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 25 — In-transit fleet position visualization~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 26 — Cancel in-transit fleet (same turn only)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 27 — End Turn button + multiple fleet orders per turn~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

~~### Task 28 — Pass-and-play screen blanking between turns~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

---

## Phase 5 — UX Polish & Design Alignment

These tasks address specific UX issues and design mismatches identified by the product owner after Phase 3. They are independent and can be worked in order.

---

~~### Task 31 — Fix zoom/pan and touch hit-detection~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** Pinch-to-zoom is glitchy — zooming near the board edges does not keep the view anchored at the zoom focal point; releasing a pinch sometimes snaps the zoom level unexpectedly. Panning while zoomed in cannot reach the board edges. Because the gesture system miscalculates screen-to-map coordinates, planet tap detection is unreliable (the engine thinks the user is tapping a different location than they actually are).

**Goal:** Natural-feeling pinch-to-zoom that anchors to the focal point, allows panning all the way to every edge of the board at any zoom level, and produces accurate planet hit-detection on tap.

**Requirements:**
1. Use `react-native-gesture-handler` `Gesture.Pinch` with the pinch focal point (`event.focalX`, `event.focalY`) to keep the zoom anchored under the user's fingers — do not just scale from the centre.
2. Pan clamping must account for current scale so the user can scroll to every edge (left, right, top, bottom) at any zoom level without the view "bouncing back" before the edge is reached.
3. Tap coordinates used for planet hit-detection must be transformed through the current `translateX`, `translateY`, and `scale` shared values so they map accurately to map space.
4. After releasing a pinch, the zoom level must not change (no snap/reset).
5. Scale limits: 0.4× minimum, 4× maximum (unchanged from Task 23).
6. All gesture changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 32 — Human player name input in game setup~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** When adding a human player slot in the setup form, the player's name is not configurable — it defaults to something generic. Players should be able to type their own name.

**Goal:** Each human player slot in the setup form has a text input for the player's name.

**Requirements:**
1. Each `PlayerSlot` of `type: 'human'` gains an optional `name?: string` field.
2. The slot builder UI in `HomeScreen` renders a `TextInput` for human slots where the player can type their name (placeholder: "Player name").
3. `startNewGame` in the store uses `slot.name` (trimmed, fallback to `"Player {n}"` if blank) as `player.name` for human players.
4. AI player names are unaffected.
5. Changes confined to `src/game/types.ts` (if `PlayerSlot` is defined there), `src/store/gameStore.ts`, and `src/screens/HomeScreen.tsx`.

**Files to read:** `src/game/types.ts`, `src/store/gameStore.ts`, `src/screens/HomeScreen.tsx`  
**Files to modify:** `src/game/types.ts` (if needed), `src/store/gameStore.ts`, `src/screens/HomeScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 33 — AI names: simple, unique, non-clashing with humans~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** AI names currently use a `[Name] [Epithet]` format (e.g. "Arin the Wise") which is more dramatic than desired. They should be simple single first-names. AI names must not duplicate any human player name or another AI name in the same game.

**Goal:** AI players receive simple, unique first-name identifiers that never clash with human or other AI names in the same game.

**Requirements:**
1. Replace the `[Name] [Epithet]` format with a plain first-name list (a pool of ~40+ simple names, e.g. "Aria", "Cael", "Dax", "Lyra", …).
2. During `startNewGame`, collect all human player names first, then assign AI names by drawing from the pool in RNG order, skipping any name already used by a human or earlier AI in the same game.
3. If the pool is exhausted, fall back to `"AI {n}"`.
4. `generateAiName` signature changes to accept a `usedNames: Set<string>` parameter so it can skip duplicates.
5. Changes confined to `src/game/aiEngine.ts` and `src/store/gameStore.ts`.

**Files to read:** `src/game/aiEngine.ts`, `src/store/gameStore.ts`, `docs/systems/ai-system.md`  
**Files to modify:** `src/game/aiEngine.ts`, `src/store/gameStore.ts`  
**Docs to update:** `docs/systems/ai-system.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 34 — Fix fog of war rendering (non-owned planets grayed out)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** The fog-of-war engine filter (`buildVisibleState`) is implemented but the UI still renders non-owned planets with full colour, making all planets visible to every player. Non-owned planets should appear visually grayed out.

**Goal:** On `GameScreen`, any planet not owned by the current human player renders as a gray, featureless dot. Only the current player's planets show full colour and detail.

**Requirements:**
1. In `GameScreen`, when rendering a planet node, check whether `planet.owner === currentPlayerId`. If not, render the planet with a gray fill (e.g. `#555` or similar dark neutral) and no detail text.
2. Neutral/unowned planets (owner `null` or `'neutral'`) that are within sensor range (i.e. visible via `getVisibleGameState`) may render with a dim neutral colour to indicate they exist, but show no troop count.
3. The `buildVisibleState` / `getVisibleGameState` store logic is already zeroing out hidden data — the fix is purely in the rendering layer.
4. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/systems/map-generation.md` (fog of war section), `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 35 — Player's own planets are green~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** The current player's planets should always render in a distinct green colour, regardless of what colour is assigned to that player slot.

**Goal:** Planets owned by the current human player render in green; other visible (enemy) planets retain their assigned colour; non-visible planets are gray (per Task 34).

**Requirements:**
1. When rendering a planet on `GameScreen`, if `planet.owner === currentPlayerId`, use a green fill (e.g. `#2ecc71` or `#27ae60`).
2. This takes priority over any existing owner-colour mapping for the current player.
3. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

**Note:** Tasks 34 and 35 touch the same rendering logic and should be implemented together in one pass.

---

~~### Task 36 — Planet display: name above, class inside, troops below (non-zero only)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** Planet labels are incomplete or incorrectly positioned. The desired layout is: planet name above the circle, planet class letter inside the circle, troop count below the circle — but only when troops > 0 (no "0" clutter on empty planets).

**Goal:** Each planet renders three pieces of text in the correct positions; the troop count is suppressed when zero.

**Requirements:**
1. Above the planet circle: planet `name` in small text (e.g. font size 8–9, truncated if too long).
2. Inside the planet circle: planet `class` letter (single character, centred).
3. Below the planet circle: troop count (`planet.shipCount`) only when `planet.shipCount > 0`; hidden (render nothing) when zero.
4. All text respects fog-of-war: non-owned planets (grayed per Task 34) show no text at all.
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 37 — Planet detail modal popup on tap~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** Tapping a planet currently shows its data in a bottom panel below the map. This takes up screen real estate and is awkward. The data should appear in a floating modal overlay instead.

**Goal:** Tapping an owned (visible) planet opens a centred modal card showing all available planet data; the bottom info panel is removed.

**Requirements:**
1. On planet tap, open a `Modal` (React Native `Modal` component, `transparent: true`, `animationType: 'fade'`) centered on screen.
2. Modal displays: planet name, planet class, current troop count, building slots (total / used), list of buildings present, production slider value, and any other data available on the `VisiblePlanet`.
3. Modal has a close button (✕) or closes on backdrop tap.
4. The existing bottom info panel / selected-planet strip is removed.
5. The modal should only be openable for planets whose detail is visible to the current player (owned planets, or neutrals where applicable per fog-of-war rules). Tapping a grayed-out enemy planet does nothing (or shows a minimal "Unknown" modal at most).
6. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 38 — End Turn button: smaller, bottom-right corner~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** The End Turn button is too large and in a prominent central location. It should be a compact button anchored to the bottom-right corner of the screen.

**Goal:** A small, unobtrusive End Turn button fixed to the bottom-right corner of `GameScreen`.

**Requirements:**
1. Position the End Turn button with `position: 'absolute'`, `bottom: 24`, `right: 16` (adjust for safe area inset).
2. Button size: compact — e.g. ~120×40 px, or use a small pill/chip style.
3. The existing large End Turn button / footer bar is removed or replaced.
4. Queue count indicator (e.g. "3 orders queued") may remain nearby or be removed if it clutters the corner — use judgment to keep the UI clean.
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 39 — Research system overhaul (exponential level-up thresholds)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** The current research system uses a flat `RESEARCH_POINTS_PER_LEVEL=10` for all levels, meaning each level always costs the same number of research points. The intended design is: level 0→1 costs 10 points; level 1→2 costs 15; costs grow exponentially each level. Research facilities generate 1 point per turn each. Players start at level 0.

**Goal:** Replace the flat research threshold with an exponential curve; ensure players start at level 0 and that `researchLab` buildings generate exactly 1 point per turn each.

**Requirements:**
1. Remove `RESEARCH_POINTS_PER_LEVEL` constant.
2. Add a `researchThreshold(level: number): number` pure function that returns the points required to advance from `level` to `level + 1`. Formula: `threshold(0) = 10`, `threshold(n) = Math.round(10 * Math.pow(1.5, n))` (giving roughly 10, 15, 22, 34, 50, 76, … — adjust the base multiplier if needed to feel right, but document it).
3. In `productionEngine.ts`, the level-up loop calls `researchThreshold(player.techLevel)` instead of the old constant.
4. Each `researchLab` building on an owned planet contributes exactly `1` research point per turn (verify this is currently correct; fix if not).
5. Players start at `techLevel: 0` — confirm `startNewGame` in the store initialises this correctly (currently likely `0` already; just verify).
6. Export `researchThreshold` from `productionEngine.ts` so it can be displayed in the UI later.
7. Update `MAX_TECH_LEVEL` if still relevant (keep at 15 unless the exponential curve makes this unreachable in practice, in which case document the reasoning).
8. Changes confined to `src/game/productionEngine.ts` and `src/store/gameStore.ts` (if init needs fixing).

**Files to read:** `src/game/productionEngine.ts`, `src/store/gameStore.ts`, `docs/systems/production.md`  
**Files to modify:** `src/game/productionEngine.ts` (and `src/store/gameStore.ts` if needed)  
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

---

~~### Task 40 — Fix pinch-zoom scroll clamping (can't reach board edges when zoomed in)~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** When the player zooms in, panning hits an invisible wall before reaching the edges of the board. The map cannot be scrolled all the way to any edge at high zoom levels.

**Goal:** At every zoom level the player can pan to every edge (top, bottom, left, right) of the board without hitting an early boundary.

**Requirements:**
1. Audit the pan-clamping logic in `GameScreen.tsx`. The clamp bounds must be derived from the current `scale` value, the map's total pixel dimensions (`MAP_COLS * CELL_SIZE`, `MAP_ROWS * CELL_SIZE`), and the viewport dimensions.
2. Correct formula for X-clamp: `translateX` must be clamped between `-(mapWidth * scale - viewportWidth)` and `0` (or equivalent formulation that achieves the same result).
3. Same logic for Y-axis.
4. The fix must not break focal-point anchoring from Task 31 or the tap hit-detection coordinate transform.
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 41 — Remove ownership ring/circle from planets~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** Each planet has a visible ring/circle around it indicating ownership (by the current player or any other player). This visual is unwanted — planets should not have an ownership ring.

**Goal:** No planet renders an ownership ring or border circle at any time, for any player.

**Requirements:**
1. Locate and remove any `borderRadius` ring, outer circle `View`, or `SVG` circle that wraps the planet node and serves as an ownership indicator.
2. The planet body circle (the dot itself) should remain; only the surrounding ring is removed.
3. Ensure this affects planets owned by the current player, enemy players, and neutral planets equally — no ring for anyone.
4. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 42 — Fix fog of war: enemy-owned planets must not show white border~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** Planets owned by other players (that should be hidden or minimally visible under fog of war) still render with a white border, revealing ownership information that should be hidden.

**Goal:** Enemy-owned planets (planets whose owner is not the current player) render with no white border — their appearance must not betray that they are owned by anyone.

**Requirements:**
1. In `GameScreen.tsx`, when rendering a planet that is not owned by `currentPlayerId`, ensure no white (or coloured) border/stroke is applied.
2. The planet should appear as a plain gray shape with no border distinguishing it from a neutral unowned planet.
3. This must hold even after Task 41 removes rings — check for any remaining `borderColor`, `borderWidth`, `stroke`, or similar style properties applied conditionally on ownership.
4. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 43 — Non-owned planet rendering: gray with class letter and name~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** Planets the current player does not own currently render as featureless gray blobs with no information. The desired design shows a gray planet with the planet class letter centred inside and the planet name displayed above — matching the layout of owned planets but in gray.

**Goal:** All non-owned planets (neutral and enemy) render in gray with the class letter and planet name visible.

**Requirements:**
1. Non-owned planets render as a gray circle with the planet's `class` letter centred inside (same font treatment as owned planets but in a lighter gray text so it's readable against the dark circle).
2. The planet `name` renders above the planet node in the same position as owned planets but also in a muted/gray colour.
3. Troop count is still hidden (no troop count shown on non-owned planets — fog of war).
4. This applies to both neutral (unowned) and enemy-owned planets.
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 44 — Shorter planet names (no truncation with "...")~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** Generated planet names are too long and get clipped with "..." in the map view. Planet names should be short enough that they always display in full without truncation.

**Goal:** All generated planet names fit comfortably in the label area without being truncated.

**Requirements:**
1. Update the planet name generator in `src/game/mapGenerator.ts` (or wherever `generatePlanetName` lives) to use shorter word lists — target max name length of ~10–12 characters.
2. Replace multi-syllable adjectives and nouns with shorter single-syllable or two-syllable alternatives (e.g. "Red Shard", "Far Keep", "Grim Hold", "New Dawn", etc.).
3. The name pool must still contain at least 200 unique combinations so collisions are rare in large maps.
4. Remove any `numberOfLines` or truncation style on the planet name label in `GameScreen.tsx` — names should now fit naturally without needing truncation.
5. The seeded RNG used for name generation must remain deterministic (same seed = same names).

**Files to read:** `src/game/mapGenerator.ts`, `src/screens/GameScreen.tsx`  
**Files to modify:** `src/game/mapGenerator.ts`, `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 45 — Redesign owned-planet detail modal~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** The current planet detail modal does not match the intended design. The layout needs a full redesign.

**Goal:** Tapping an owned planet opens a redesigned modal with the following layout and interactions.

**Requirements:**
1. **Header row:** Planet name centred at the top of the modal.
2. **Info row (below name):** On the left, a large square tile showing the planet class letter in a large font. On the right (or top of the modal body), the current troop count displayed prominently.
3. **Building slots area (main body):** The majority of the modal is taken up by a grid/list of building slots. Each slot is rendered as a square:
   - Empty slot → empty square outline.
   - Slot with a factory → factory icon.
   - Slot with a research facility → research icon.
   - Slot with a building placed *this turn* (not yet active) → grayed-out version of the appropriate icon (see Task 46).
4. **Build controls (above slots):** Two tappable option buttons — one for Factory, one for Research Facility. Tapping one selects it; then tapping an empty slot in the grid places a build order for that slot. Only one option can be selected at a time; tapping the already-selected option deselects it.
5. **Production slider (below slots, conditional):** Only shown if the planet has at least one active factory. Renders as a horizontal slider (draggable dot on a track) representing the `productionSlider` value (0–100%). The user can drag it to adjust the troop/gold split. The current percentage is shown as a label.
6. Modal closes on backdrop tap or ✕ button.
7. Changes confined to `src/screens/GameScreen.tsx` and `src/store/gameStore.ts` (if build-order dispatch is needed).

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`  
**Files to modify:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 46 — Building construction delay: gray icon for just-built buildings~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

**Problem:** The intended rule is that a building placed during a turn is not completed until the *next* turn, and only begins generating resources the turn after completion. The UI currently does not reflect this — newly placed buildings may appear fully active immediately, or there is no visual indication of their pending state.

**Goal:** Buildings placed during the current turn display as a grayed-out icon in the building slot, clearly communicating they are under construction and not yet active.

**Requirements:**
1. Add a `builtOnRound: number` field (or equivalent) to the building/slot type so the engine can track when a building was placed. This is the round it was queued, not completed.
2. A building placed in round N is "under construction" during round N (the turn it was queued). It becomes active at the start of round N+1.
3. `productionEngine.ts` must only count factories/research labs that are fully active (i.e. `builtOnRound < currentRound`).
4. In the planet modal (from Task 45), any slot whose building has `builtOnRound === currentRound` renders the icon at reduced opacity (e.g. 35–40%) or with a grayscale filter to indicate it is under construction.
5. When the player places a build order (via the modal), the slot should immediately show the grayed-out icon for the remainder of that turn.
6. Changes in: `src/game/types.ts`, `src/game/productionEngine.ts`, `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`.

**Files to read:** `src/game/types.ts`, `src/game/productionEngine.ts`, `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`  
**Files to modify:** `src/game/types.ts`, `src/game/productionEngine.ts`, `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 6 — Vision Alignment & UX Fixes

These tasks address design mismatches and missing features identified by the product owner. They should be worked in order since some share UI surfaces.

---

~~### Task 47 — Fix planet tap hit-detection (click box centred on planet with padding)~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** After game start the player cannot reliably tap their own planet. The tap hit area is sometimes offset below the planet, sometimes undetectable. This is separate from the zoom/pan coordinate transform fixed in Task 31 — the issue is that the hit rect itself is not centred on the planet circle and has no padding.

**Goal:** Every planet has a reliable, accurately-centred tap target with a small padding so it is comfortably tappable at default zoom.

**Requirements:**
1. Audit `PlanetNode` (and its parent `Pressable`/`TouchableOpacity` in `GameScreen.tsx`) to find why the touch area is offset. Common culprits: the pressable wraps an absolutely-positioned child whose origin is not the planet centre; the hitSlop is missing or wrong; the tap coordinate is tested against `(0,0)` of the container instead of the planet centre.
2. Ensure the `Pressable`/`TouchableOpacity` that fires `onSelect` is sized to cover the full planet circle plus a uniform padding of at least 8 px on every side (`hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` or equivalent).
3. The pressable must be centred on the planet circle, not offset from it.
4. Verify that the tap-to-select flow works at default zoom (scale = 1) on a freshly started game before calling the task done.
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 48 — Add padding between planets and board edges~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** Planets can be placed at or very near the edge of the map grid, making them hard to tap (part of the planet circle is clipped by the scroll container edge or sits right against it).

**Goal:** No planet centre is placed within a defined padding distance of any map edge, so every planet is fully visible and comfortably tappable even at default zoom.

**Requirements:**
1. In `src/game/mapGenerator.ts`, add a `PLANET_EDGE_PADDING` constant (suggested value: `3` grid cells).
2. When sampling planet positions, restrict valid `(x, y)` to `[PLANET_EDGE_PADDING, width - 1 - PLANET_EDGE_PADDING]` × `[PLANET_EDGE_PADDING, height - 1 - PLANET_EDGE_PADDING]`.
3. The minimum-distance rejection check is unchanged; this is an additional bounds constraint applied before the distance check.
4. Changes confined to `src/game/mapGenerator.ts`.

**Files to read:** `src/game/mapGenerator.ts`, `docs/systems/map-generation.md`
**Files to modify:** `src/game/mapGenerator.ts`
**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 49 — Fleet dispatch modal: show click distance and turn count~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** When the player confirms sending a fleet from one planet to another, the ship-count modal gives no information about how far the destination is or how long the fleet will take to arrive. Players cannot make informed decisions without this data.

**Goal:** The ship-count/confirm modal that appears after a valid drag-to-dispatch gesture displays the click distance to the destination and the number of turns the fleet will take at the player's current tech level.

**Requirements:**
1. In `GameScreen.tsx`, when the confirm-fleet modal is shown, compute and display:
   - **Click distance:** `computeClickDistance(originPlanet.position, destinationPlanet.position)` rounded to one decimal place.
   - **Turns in transit:** `computeTurnsInTransit(originPlanet.position, destinationPlanet.position, effectiveSpeed(currentPlayer.techLevel))`.
2. Display these as a concise info line in the modal, e.g. `"Distance: 7.3 clicks · ETA: 2 turns"`.
3. Import `computeClickDistance`, `computeTurnsInTransit`, and `effectiveSpeed` from `src/game/movementEngine.ts` (they are already exported).
4. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/movementEngine.ts`, `docs/systems/movement.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 50 — Building purchase: deduct gold immediately and enforce slot capacity~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** When the player places a build order in the planet modal, gold is not deducted from their balance until the turn resolves (or possibly not at all until the building activates). Additionally, it may be possible to queue more build orders than a planet has available empty slots. Both issues make the build UI misleading.

**Goal:** Gold is deducted from the player's balance the moment a build order is queued, and the UI prevents placing orders beyond the number of empty slots.

**Requirements:**
1. In `gameStore.ts`, the `queueBuildOrder` action must:
   a. Check that the player has enough gold to pay (`FACTORY_GOLD_COST` = 200 or `RESEARCH_LAB_GOLD_COST` = 250).
   b. Check that the planet still has at least one empty slot (slots in use = `planet.buildings.length`; also count any build orders already queued for the same planet in `queuedOrders` this turn).
   c. If either check fails, reject the order silently (or surface a brief error — use judgment; a no-op is acceptable at minimum).
   d. If both checks pass, immediately deduct the cost from `state.players[...].gold` before the order is committed.
2. The planet modal in `GameScreen.tsx` should disable the "place building" interaction when the planet has no empty slots remaining (accounting for already-queued-this-turn orders).
3. The gold displayed in the UI must reflect the deduction immediately (since the store update triggers a re-render this should be automatic if step 1d is correct).
4. Changes in `src/store/gameStore.ts` and `src/screens/GameScreen.tsx`.

**Files to read:** `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`, `src/game/types.ts`, `docs/systems/production.md`
**Files to modify:** `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 51 — Research info button + modal~~ *(completed 2026-05-28 — see docs/tasks/completed.md)*

**Problem:** There is no way for the player to see their current research standing, how far they are from the next tech level, or how long it will take at their current investment (number of research labs).

**Goal:** A research icon button sits above the End Turn button. Tapping it opens a modal showing the player's research status and a projection.

**Requirements:**
1. Add a small icon button (⚗ or 🔬 emoji, or a simple "R" label in a styled chip) positioned `position: 'absolute'`, `bottom: 72` (above the End Turn button at `bottom: 24`), `right: 16`.
2. Tapping the button opens a `Modal` (transparent, fade animation) with the following information:
   - **Current tech level** (e.g. `Tech Level 3`).
   - **Research points banked** vs **threshold to next level** (e.g. `34 / 51 research points`).
   - **Active research labs** across all owned planets (count of `researchLab` buildings where `builtOnRound < currentRound`).
   - **Turns to next level** projection: `Math.ceil((threshold - bankedPoints) / labCount)` turns (display `"∞"` if `labCount === 0`).
3. Use `researchThreshold` (exported from `src/game/productionEngine.ts`) for the threshold value.
4. Modal has a close button (✕) or closes on backdrop tap.
5. If the player is already at `MAX_TECH_LEVEL` (15), the modal says `"Maximum tech level reached"` instead of showing a projection.
6. Changes in `src/screens/GameScreen.tsx` (button + modal render); no store or engine changes required.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/productionEngine.ts`, `docs/systems/production.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 52 — Increase spawn rate of A, B, C planet classes~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** The current class distribution (`A: 5%, B: 10%, C: 20%, D: 30%, E: 35%`) means the best planets are very rare. The product owner wants A, B, and C planets to appear slightly more often.

**Goal:** Adjust `PLANET_CLASS_WEIGHTS` in `src/game/mapGenerator.ts` so A, B, C planets appear at a modestly higher rate while D and E remain the most common.

**Requirements:**
1. Update `PLANET_CLASS_WEIGHTS` to the following distribution (must sum to 100):
   - `A: 8%`, `B: 15%`, `C: 25%`, `D: 27%`, `E: 25%`
2. The weights object key names and structure must remain unchanged (only values change).
3. Re-export or re-document the new values in `docs/systems/map-generation.md`.
4. Changes confined to `src/game/mapGenerator.ts`.

**Files to read:** `src/game/mapGenerator.ts`, `docs/systems/map-generation.md`
**Files to modify:** `src/game/mapGenerator.ts`
**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 53 — Home planet class variation (A–G) with class-specific starting gold and slot count~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** All players currently start on the same class of home planet with the same starting gold and slot count. The design calls for home planets to be randomly assigned one of seven tiers (A–G), each granting a different starting gold balance and building slot count, giving each game a different feel and strategic opening.

**Goal:** Each player's home planet is randomly assigned class A, B, C, D, E, F, or G at game start. Starting gold and building slots reflect the assigned class per the table below.

**Home planet class table:**

| Class | Starting Gold | Building Slots |
|-------|--------------|----------------|
| A     | 1000         | 5              |
| B     | 1100         | 6              |
| C     | 1200         | 6              |
| D     | 1300         | 7              |
| E     | 1400         | 7              |
| F     | 1500         | 8              |
| G     | 1600         | 8              |

**Requirements:**
1. In `src/game/spawnPlacer.ts` (or wherever home planets are assigned), after selecting a home planet for each player, randomly assign it one of the seven classes A–G using the seeded RNG (each class equally likely, 1/7 chance each).
2. Set `planet.buildingSlots` to the value from the table above for the assigned class.
3. In `src/store/gameStore.ts`, when initialising each human/AI player, set `player.gold` based on the home planet class from the table above (instead of the flat `STARTING_GOLD = 500`).
4. Non-home planets are **unaffected** — their class and slot count continue to be generated by `mapGenerator.ts` as normal.
5. Export a `HOME_PLANET_CLASS_CONFIG` constant (or equivalent record) in `src/game/spawnPlacer.ts` so the values are documented and testable.
6. The seeded RNG used for home planet class assignment must be derived from the game seed for determinism.
7. Changes in `src/game/spawnPlacer.ts` and `src/store/gameStore.ts`.

**Files to read:** `src/game/spawnPlacer.ts`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/systems/map-generation.md`
**Files to modify:** `src/game/spawnPlacer.ts`, `src/store/gameStore.ts`
**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 54 — Visual icons for factory and research lab buildings in the planet modal~~ (Completed 2026-05-28)

**Problem:** Building slots in the planet modal currently use letter labels (`F` / `R`) or plain-text chips to represent factories and research labs. The design calls for distinct visual icons for each building type.

**Goal:** Each filled building slot renders a dedicated icon representing the building type. If suitable vector assets cannot be generated in code, the task includes a clear decision point for the product owner to supply a custom image.

**Requirements:**
1. **Preferred approach — emoji/unicode icons:** Use `🏭` (factory) and `🔬` (research lab) as large centred text inside each filled slot tile. This requires no external assets and renders acceptably on iOS/Android. Implement this as the default.
2. **Alternative approach — SVG-drawn icons:** If the product owner prefers a custom look, replace the emoji with inline `react-native-svg` drawings (a simple factory silhouette and a flask/beaker shape). Only implement this if the product owner confirms they want custom graphics; otherwise the emoji approach is sufficient.
3. **Image asset approach:** If neither emoji nor SVG icons are acceptable, leave a clearly commented `{/* TODO: replace with <Image source={require('...')} /> */}` placeholder and document in this task that the product owner needs to supply PNG/SVG assets (factory icon and research lab icon at 32×32 px minimum).
4. Under-construction slots (opacity 0.35, from Task 46) still apply on top of the icon — the icon should be visible but dimmed.
5. Empty slots continue to render as an outlined square with no icon.
6. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 55 — Production slider: show live gold and troop output at current position~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** The production slider in the planet modal only shows a percentage label (e.g. `"50% troops / 50% gold"`). The player has no way to know the actual troop or gold output per turn without doing mental arithmetic.

**Goal:** The slider label dynamically shows the computed troop output per turn and gold output per turn at the current slider position, based on the planet's active factory count and class.

**Requirements:**
1. Compute the projected per-turn output whenever the slider value changes:
   - `troopsPerTurn = activeFactories × FACTORY_TROOP_OUTPUT[planet.class] × sliderValue` (display as one decimal, e.g. `"1.5 troops/turn"`).
   - `goldPerTurn = activeFactories × FACTORY_GOLD_OUTPUT[planet.class] × (1 - sliderValue)` (display as one decimal, e.g. `"23.4 gold/turn"`).
   - `activeFactories` = count of `factory` buildings on the planet where `builtOnRound < currentRound`.
2. Display both values as a single descriptive label below the slider, e.g.:
   `"⚔ 1.5 troops/turn  |  💰 23.4 gold/turn"`
3. The label updates in real time as the user drags the slider (no need to debounce — the RN Slider `onValueChange` callback updates state on every frame already).
4. Import `FACTORY_TROOP_OUTPUT` and `FACTORY_GOLD_OUTPUT` from `src/game/productionEngine.ts` (they are already exported).
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/productionEngine.ts`, `docs/systems/production.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 7 — Design Corrections & UX Refinements

These tasks address design mismatches and interaction bugs identified by the product owner after Phase 6. Work them in order; Tasks 59–61 all touch `GameScreen.tsx` and should share one reading pass.

---

~~### Task 56 — Closest planet minimum distance = 4 clicks~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** Planet spacing feels too large — the nearest neighbour planet from any spawn is much farther than 4 clicks, making early expansion slow and the map feel sparse. The desired feel is that the closest planet is visually close and only 4 clicks away.

**Goal:** Tune the map generation constants so that the minimum planet spacing equals exactly 4 clicks, making nearby planets look close in the UI at default zoom.

**Requirements:**
1. In `src/game/mapGenerator.ts`, locate the `MIN_PLANET_DISTANCE` constant (or equivalent) that controls minimum separation between any two planets.
2. Determine the current pixel/cell to click conversion (currently `CELL_SIZE = 18`; 1 click = 1 cell). Set `MIN_PLANET_DISTANCE` so the closest any two planet centres can be is exactly `4` clicks (i.e. 4 cells, or whichever unit `computeClickDistance` uses).
3. Verify that at this spacing the home planets still have enough separation from each other to be fair (home planet minimum distance should remain substantially larger — use judgment, suggest ≥ 15–20 clicks between home planets).
4. Check that the map still fits the required number of planets — reduce `MIN_PLANET_DISTANCE` only between non-home planets if needed, or reduce the overall map density constant to compensate.
5. After changing the constant, do a visual sanity check: adjacent planets should appear close (nearly touching at default zoom scale ≈ 1), not half a screen apart.
6. Changes confined to `src/game/mapGenerator.ts` (and `src/game/spawnPlacer.ts` if home-planet separation is controlled there).

**Files to read:** `src/game/mapGenerator.ts`, `src/game/spawnPlacer.ts`, `docs/systems/map-generation.md`, `docs/systems/movement.md`
**Files to modify:** `src/game/mapGenerator.ts` (and `src/game/spawnPlacer.ts` if needed)
**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

~~### Task 57 — Fix turn/round semantics: round increments only after all players have acted~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** The intended model is: one *round* = every player completes exactly one *turn*. In a 3-player game, round 1 contains player-1 turn, player-2 turn, and player-3 turn; only then does round 2 begin. Production (factories, research labs) and fleet transit should advance by one round unit each time this cycle completes. The current implementation may be incrementing `roundNumber` at the wrong point in the cycle, causing production and fleet arrivals to fire on the wrong cadence.

**Goal:** Ensure `roundNumber` increments exactly once per full cycle of all players, and that all round-gated logic (production, building activation, fleet transit) fires on this corrected cadence.

**Requirements:**
1. Audit `src/game/turnEngine.ts`: find where `roundNumber` is incremented. It must only increment after the last player in `playerOrder` has ended their turn (i.e. when the turn index wraps back to player 0), not once per individual player turn.
2. Audit `src/game/productionEngine.ts`: `runProduction` should be called once per round (after all players have acted), not once per player turn.
3. Audit `src/game/movementEngine.ts` / `advanceFleets`: fleet transit advances by 1 per round (i.e. once per full cycle). A fleet dispatched in round 1 with a 2-turn transit arrives at the *start* of round 3 (or end of round 2 — document the exact moment clearly).
4. Audit `src/game/productionEngine.ts`: building activation (`builtOnRound < currentRound`) must use the same `roundNumber` that increments once per full cycle.
5. Verify `src/store/gameStore.ts` initialises `roundNumber: 1` and that `endTurn` in the store calls `resolveTurn` / advances state correctly under the fixed semantics.
6. Write a short comment block in `turnEngine.ts` explaining the round/turn distinction for future maintainers.
7. Changes in `src/game/turnEngine.ts`, `src/game/productionEngine.ts`, `src/game/movementEngine.ts`, and `src/store/gameStore.ts` as needed.

**Files to read:** `src/game/turnEngine.ts`, `src/game/productionEngine.ts`, `src/game/movementEngine.ts`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/systems/turn-engine.md`, `docs/systems/movement.md`, `docs/systems/production.md`
**Files to modify:** `src/game/turnEngine.ts` (and others as required by audit)
**Docs to update:** `docs/systems/turn-engine.md`, `docs/systems/movement.md`, `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 58 — Conquered planet rendering and build access identical to home planet~~ ✅ Completed 2026-05-28

~~**Problem:** When a player captures a neutral or enemy planet, it does not visually match their home planet — it may not render green, may not show the name/class/troops labels, and the planet detail modal may not offer build options. The intended behaviour is that every owned planet — whether captured or starting — looks and functions identically to the player's home planet.~~

~~**Goal:** Any planet owned by the current player renders green with name above, class letter inside, and troop count below, and tapping it opens the full build/detail modal.~~

**Completed:** Audit confirmed `GameScreen` uses `planet.owner === humanPlayer.id` for colour (`getPlanetColor`), `PlanetNode` `isOwned`, tap/drag handlers, and owned-planet modal visibility — no `isHomePlanet` UI gates. `combatEngine.resolveArrival` sets `owner` on neutral and combat capture. Troop label now shows for all owned planets (including 0 garrison); `setProductionSlider` gained ownership guard.

---

### ~~Task 59 — Remove double-tap-to-zoom gesture~~

~~**Problem:** The map currently supports double-tap to zoom in. This is undesirable — it conflicts with rapid tapping and is not part of the intended interaction model.~~

~~**Goal:** Double-tap on the map no longer zooms. Pinch-to-zoom and pan remain unchanged.~~

**Completed (2026-05-28):** Removed `doubleTap` (`Gesture.Tap().numberOfTaps(2)`) and dropped it from `mapGesture` composition; `mapGesture` is now `Gesture.Simultaneous(composed, planetTap, fleetDrag)` where `composed` is pinch + pan. Removed unused `withSpring` import.

---

### ~~Task 60 — Fix zoom/scroll viewport jump (screen teleports when zooming or panning)~~ *(completed 2026-05-28)*

~~**Problem:** When the player zooms in on a specific area or pans to a location, the view sometimes jumps to a completely different part of the map — the viewport does not stay anchored where the user is looking. This is separate from the edge-clamping fix in Task 40; this is a focal-point anchoring bug where the translate values get reset or miscalculated during gesture end/begin transitions.~~

~~**Goal:** After any zoom or pan gesture completes, the viewport stays exactly where the user left it — no jumps, no position resets, no teleportation.~~

**Completed 2026-05-28:** Pinch `onStart` snapshots live `scale`/`translateX`/`translateY`; pan `onStart` snapshots live translate; `onUpdate` accumulates from session baselines; `onEnd` commits to `saved*`; `screenToMapCoords` center-compensation restored. See `docs/tasks/completed.md`.

---

### ~~Task 61 — Fleet dispatch: tap-to-drag (no hold), tap-only opens modal; clean up HUD~~

**Completed 2026-05-28:** `fleetDrag` is immediate `Gesture.Pan()`; `Gesture.Exclusive(planetTap, fleetDrag)` for tap-vs-drag; owned-planet tap opens modal, non-owned no-op; HUD sub-line shows gold + tech level only. See `docs/tasks/completed.md`.

~~**Problem:** Three related issues: (1) fleet dispatch required long-press before drag; (2) tap did not reliably open owned-planet modal; (3) HUD showed aggregate ship count.~~

~~**Goal:** Touch-and-drag immediately dispatches a fleet (no delay). Short tap opens the planet modal. Top HUD shows only gold and research level.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

## Phase 8 — Polish & Bug Fixes

---

### ~~Task 62 — Shrink default map scale~~ *(completed 2026-05-28)*

~~The rendered planets feel too far apart on screen; the default zoom level leaves too much empty space between clicks.~~

~~**Requirements:**~~
~~- Reduce the initial/default `scale` value in `GameScreen` so the map appears more zoomed-out by default (planets closer together visually)~~
~~- Do not change the underlying click-distance or game logic — this is a pure visual scaling change~~
~~- Ensure the new default still allows the user to pinch-zoom in and out within the existing `[0.4, 4]` clamp range~~
~~- Verify pan clamping still works correctly at the new default scale~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~  
~~**Files to modify:** `src/screens/GameScreen.tsx`~~  
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 63 — Fix turn counter display in pass-and-play~~ *(completed 2026-05-28)*

In a two-player pass-and-play game the human player sees "Turn 1" on their first turn and "Turn 3" on their second turn (then 5, 7, …) because `roundNumber` increments once per full player cycle. The display should show a monotonically incrementing human-turn counter (1, 2, 3, …) so it reads naturally.

**Requirements:**
- The status bar / HUD should show a counter that increments by 1 every time the local human player takes a turn — not the `roundNumber`
- In a two-player game: Player 1 sees Turn 1, then Turn 2; Player 2 also sees Turn 1, then Turn 2 (i.e. each player counts their own turn number independently)
- `roundNumber` must remain unchanged — it is used by game-engine logic (fleet transit, production, building construction) and must not be altered
- Introduce a separate display counter (e.g. `humanTurnNumber` derived from player turn-order position) or compute it from `roundNumber` and player count at render time

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `docs/systems/turn-engine.md`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx` (and possibly `src/store/gameStore.ts` if a stored counter is cleaner)
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 64 — Conquered planet full rendering and interactivity~~ *(completed 2026-05-28)*

When a player's troops capture a non-home planet the planet only highlights blue and cannot be tapped to open a detail modal. It should be visually and functionally identical to the home planet: showing its name, class, troop count, and opening the full owned-planet modal on tap so the player can queue build orders and adjust the production slider.

**Note:** Task 58 was intended to fix this (`owner ===` local human id gating) but a regression likely occurred during the gesture refactor in Tasks 59–61 (especially Task 61's `Gesture.Exclusive` + `fleetDrag` rework). Audit the tap path for non-home owned planets specifically.

**Requirements:**
- Any planet whose `owner === localHumanPlayerId` (including freshly captured non-home planets) must render identically to the home planet: green fill, name label, class label, troop count, and selection pulse
- Tapping such a planet must open the full owned-planet detail modal (build chips, slot grid, production slider)
- `fleetDrag` must still work from captured planets (drag initiates fleet dispatch; stationary tap opens modal)
- Troop count of 0 is valid and must still display

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/combatEngine.ts`, `docs/development/current-state.md`  
**Files to modify:** `src/screens/GameScreen.tsx` (primary); possibly `src/game/combatEngine.ts` if ownership assignment is incomplete  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 9 — Vision Alignment Round 2

These tasks address design mismatches and interaction bugs reported by the product owner after Phase 8. They should be worked in order.

---

### ~~Task 65 — Enlarge planet tap and fleet-drop hit targets (no pinpoint precision required)~~ *(completed 2026-05-28)*

**Problem:** Planets are difficult to tap reliably, and releasing a fleet drag onto a destination planet requires pinpoint accuracy. The interactive hit area is too small — it matches the rendered circle size with little or no buffer. The player should be able to tap or drop onto a planet without needing precise aim.

**Goal:** Every planet has a generously padded tap target and an equally generous drop-detection radius so that tapping to open the modal and dropping a fleet drag both feel easy and natural.

**Requirements:**
1. **Tap hit area:** The hit region for the `planetTap` gesture (and any `Pressable`/`TouchableOpacity` inside `PlanetNode`) must extend at least 16px beyond the planet circle edge on all sides. Use `hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}` or increase the pressable container size accordingly.
2. **Fleet drag drop target:** When the player releases a fleet drag, the destination planet lookup (`screenToMapCoords` → find nearest planet) must use a generous snap radius — a released drag should resolve to the nearest planet within at least 20–24px (in map space, accounting for current scale) rather than requiring the finger to land directly on the planet centre. If the current implementation tests for exact overlap with the planet circle, replace it with a nearest-planet-within-radius approach.
3. Both changes must work correctly at all zoom levels (0.4×–4×) — the snap radius must be expressed in map-space coordinates so it scales naturally with zoom.
4. Ensure the enlarged tap area does not cause a tap on one planet to accidentally fire for a neighbouring planet — if two planets are within each other's expanded areas, the tap fires for the closest one.
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 66 — Queued fleet orders: immediately reduce origin troop count and show in-transit departure indicator~~ *(completed 2026-05-28)*

**Problem:** When the player queues a fleet movement order, the origin planet's troop count does not change until End Turn is pressed. This is confusing — the player cannot see how many troops they have left to send after queuing a first order. Additionally there is no visual feedback on the map that troops are "leaving" — the origin planet looks unchanged. The player wants to see: (1) the troop count drop the moment an order is queued, and (2) a small cluster of dots positioned slightly off the origin planet pointing toward the destination, representing troops that have been ordered but not yet resolved.

**Goal:** Queueing a fleet order immediately (a) reduces the displayed troop count on the origin planet by the queued ship count, and (b) renders a small departure indicator near the origin planet showing the troops in motion toward their target.

**Requirements:**
1. **Troop count deduction:** When `queueOrder` adds a `SEND_FLEET` order to `queuedOrders`, derive the visible troop count for each planet by subtracting all queued-but-not-yet-resolved `SEND_FLEET` orders from that planet's `planet.shipCount`. Display this adjusted count in the planet node label (not the raw `planet.shipCount`). The raw count in the store must remain unchanged until `endTurn` actually resolves the orders — this is purely a display adjustment.
2. **Departure indicator:** For each queued `SEND_FLEET` order, render a small cluster of dots (or a single labeled dot with the ship count) positioned a short distance off the origin planet in the direction of the destination. This is separate from the in-transit `FleetLayer` (which renders after turn resolution) — this indicator lives only while the order is in `queuedOrders` and disappears when End Turn is pressed (at which point the normal in-transit fleet viz takes over).
3. The departure indicator must render inside the existing `FleetLayer` SVG overlay (or a parallel overlay) — do not add a separate native-layer `View` for it.
4. The departure indicator dots should be visually distinct from the resolved in-transit fleet markers (e.g. use a dashed outline or lighter opacity to indicate "pending, not yet departed").
5. The queued-order troop display deduction must account for multiple queued orders from the same planet (e.g. two orders from Planet A sending 10 and 15 ships should show `planet.shipCount - 25`).
6. Cancelling a queued order (✕ button) must immediately restore the deducted troop count in the display and remove the departure indicator.
7. Changes in `src/screens/GameScreen.tsx` (display logic + SVG overlay); no store engine changes required — queue state already exists.

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/systems/movement.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/systems/movement.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 67 — Fix conquered planet: immediately green and interactible on the turn troops land~~ *(complete 2026-05-28)*

~~**Problem:** When a fleet lands and captures a planet, that planet appears blue/highlighted for the rest of that turn and cannot be tapped or dragged from. On the *following* turn it renders correctly as a green owned planet.~~

~~**Goal:** As soon as a planet is captured (i.e. the turn resolves and `endTurn` returns), the planet immediately renders green with full labels and responds to tap (open modal) and drag (fleet dispatch) — identical to any other owned planet — without needing to wait for the next turn.~~

**Done:** `endTurn` now clears `selectedPlanetId` atomically with the resolved game state; `GameScreen` `useEffect` clears `selectedPlanetId` and `dragOriginPlanetId` when the referenced planet is missing or not owned by the local human player. `combatEngine.resolveArrival` ownership assignment verified unchanged (Task 58).

---

## Phase 10 — Vision Alignment Round 3

These tasks address design mismatches and interaction gaps reported by the product owner after Phase 9. Work them in order; Tasks 68–71 all touch `GameScreen.tsx` and `gameStore.ts`.

---

### ~~Task 68 — Move queued orders out of the HUD into a dedicated "Queued" modal button~~ *(completed 2026-05-28; see `docs/tasks/completed.md`)*

---

### ~~Task 69 — Show error message when player taps a build slot without enough gold~~ *(completed 2026-05-28; see `docs/tasks/completed.md`)*

**Problem:** When the player taps a build chip (Factory or Research Lab) in the planet modal but does not have enough gold to pay for it, the order is silently rejected. There is no feedback — the chip just does nothing. This is confusing; the player does not know why the action failed.

**Goal:** When the player attempts to place a build order and their gold balance is insufficient, display a brief error message — consistent in style with the existing out-of-range fleet error — so they understand why the order was rejected.

**Requirements:**
1. In `GameScreen.tsx`, when the player taps a Factory or Research Lab build chip and `queueBuildOrder` rejects the order due to insufficient gold, surface an error message in the UI.
2. The error message style should match the existing fleet out-of-range error (same component, colour, and positioning if one already exists; otherwise a red text label displayed near the bottom of the modal or the bottom of the screen for ~2 seconds).
3. Message text: `"Not enough gold"` (or equivalent short phrase).
4. If the rejection is due to no available slots (planet is full), the chips are already disabled per Task 50 — this task only covers the gold-insufficient case.
5. The error should auto-dismiss after ~2 seconds or on the next user interaction.
6. `queueBuildOrder` in the store must return (or expose) enough information for `GameScreen` to distinguish a gold-failure rejection from other rejections (e.g. return a `{ success: boolean; reason?: string }` object instead of `void`, or export a separate validation helper). Minimise store changes — prefer the lightest-weight approach.
7. Changes in `src/screens/GameScreen.tsx` and minimally in `src/store/gameStore.ts` (if return value change is needed).

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/systems/production.md`
**Files to modify:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 70 — Tapping a just-built (this-turn) filled slot cancels the build and refunds gold~~ *(complete 2026-05-28)*

**Problem:** Once a player places a build order this turn (the slot renders dimmed at 0.35 opacity — under construction), there is no way to change their mind. Tapping the dimmed slot does nothing. The intended behaviour is: tapping a slot that was filled *this* turn cancels the queued build order and immediately refunds the gold to the player.

**Goal:** Tapping a filled slot whose building has `builtOnRound === currentRound` removes the building from the slot and refunds the full gold cost to the player's balance.

**Requirements:**
1. In `GameScreen.tsx`, in the planet modal slot grid, make under-construction slots (where `building.builtOnRound === currentRound`) tappable.
2. When such a slot is tapped, call a new store action (e.g. `cancelBuildOrder(planetId, buildingIndex)`) that:
   a. Removes the building entry from `planet.buildings` at the given index.
   b. Refunds the appropriate gold cost (`FACTORY_GOLD_COST` or `RESEARCH_LAB_GOLD_COST`) to the active player's balance immediately.
   c. Also removes any corresponding `BUILD` entry from `queuedOrders` for that planet/slot if one exists, so the queued action does not re-add the building at turn resolution.
3. No confirmation prompt is required — the refund should happen immediately on tap (the building has not yet been built; it is trivially reversible).
4. After cancellation the slot renders as empty (outlined square) and the player's gold balance updates immediately in the status bar.
5. Changes in `src/store/gameStore.ts` (new `cancelBuildOrder` action) and `src/screens/GameScreen.tsx` (slot tap handler).

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/systems/production.md`
**Files to modify:** `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 71 — Tapping an active (prior-turn) filled slot prompts confirmation before deletion (no gold refund)~~ *(completed 2026-05-28; see `docs/tasks/completed.md`)*

---

## Phase 11 — Vision Alignment Round 4

These tasks address design mismatches and interaction bugs reported by the product owner after Phase 10. Work them in order.

---

### ~~Task 72 — Remove blue planet highlight on capture (no planet should ever highlight blue)~~ ✅ 2026-05-28

~~**Problem:** When the player lands troops on a planet and takes it over, the planet renders highlighted blue and is non-interactable until the following turn. The product owner considers this behaviour entirely wrong — there is no game state in which a planet should turn blue. The blue highlight is likely a stale `selectedPlanetId` or `dragOriginPlanetId` leaking a selection/accent style onto the newly captured planet.~~

~~**Goal:** No planet ever renders with a blue highlight or blue accent border under any circumstances. Captured planets render immediately green (as already intended by Task 67) with no blue tint or border at any point.~~

~~**Requirements:**~~
~~1. Audit `GameScreen.tsx` for every place a blue-ish border, background, or tint is applied to a planet node — search for colour values, style conditionals, and any `selectedPlanetId`/`dragOriginPlanetId` checks that could produce a blue visual.~~
~~2. Remove or replace every blue planet colour with either the correct ownership colour (green if owned) or no border (if the intent was selection feedback that should no longer exist).~~
~~3. Verify the fix across scenarios: freshly captured neutral planet, freshly captured enemy planet, own home planet, non-owned planet. None should ever show blue.~~
~~4. Confirm that interaction-feedback styles (drag origin accent, selection pulse) do not use blue — replace with a neutral or white alternative if they do, or remove them entirely if the product owner does not want selection feedback at all.~~
~~5. Changes confined to `src/screens/GameScreen.tsx`.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 73 — Disable map pan/scroll while the player is dragging a fleet~~ ✅ 2026-05-28

**Revision (2026-05-28):** Initial implementation used `Gesture.Exclusive(planetFleet, composed)`, which broke pinch-to-zoom (Exclusive cancelled `composed` as soon as `planetFleet` began, including two-finger pinch). Reverted to `Gesture.Simultaneous(composed, planetFleet)` with worklet `isFleetDragging` guarding pan only; pinch stays simultaneous. Same revision removed stale ownership check in `handleMapTap` so newly conquered planets are selectable on the capture turn (modal still gated in UI).

**Revision 2 (2026-05-28):** `isFleetDragging` was incorrectly set on every `fleetDrag.onUpdate` (blocked normal pan after ~10px); now set only via `runOnUI` in `handleDragStart` after owned-planet confirm, cleared in `cancelDrag`, with `fleetDrag.onFinalize` for cancellation safety. `handleMapTap` rewritten to read `useGameStore.getState()` at tap time (fresh ownership, no stale `useCallback` closure).

~~**Problem:** When the player initiates a fleet drag (touches an owned planet and starts moving to select a destination), the map simultaneously pans along with the drag. This makes it very hard to drag to a destination — the map moves underneath the finger, shifting all planets away from where the player is trying to drop. Pan should only be active when the player is not mid-fleet-drag.~~

~~**Goal:** While a fleet drag gesture is in progress (i.e. `dragOriginPlanetId` is set and the pan gesture is recognised as a fleet dispatch), map panning is fully disabled. Pan resumes the moment the fleet drag is cancelled or completed.~~

~~**Requirements:**~~
~~1. In `GameScreen.tsx`, locate the `Gesture.Simultaneous` (or equivalent) composition that runs the pan gesture alongside the fleet drag gesture.~~
~~2. When the fleet drag is active, prevent the map pan gesture from activating. Approaches in order of preference:~~
   ~~a. Use a `enabled(...)` shared-value guard on the pan gesture that disables it while `dragOriginPlanetId` is non-null.~~
   ~~b. Alternatively, change gesture composition so fleet drag and map pan are `Gesture.Exclusive` (fleet drag wins when active) rather than `Gesture.Simultaneous`.~~
~~3. Pinch-to-zoom should also be disabled (or at minimum not conflict) during an active fleet drag.~~
~~4. After the fleet drag ends (finger released, order confirmed or cancelled), map pan must resume immediately with no extra tap required — the map should feel normally pannable as soon as dragging stops.~~
~~5. Changes confined to `src/screens/GameScreen.tsx`.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 74 — Fix fleet arrival delay (resolve at round wrap, not next turn start)~~ ✅ 2026-05-28

~~**Problem:** After round wrap, `turnEngine` merged `advanceFleets` `arrived` fleets back into `fleets` without calling `resolveArrival`, so fleets sat at `turnsRemaining: 0` on the destination for a full human turn before capture resolved at the next turn start.~~

~~**Fix:** On round wrap, keep only `inTransit` in `fleets`; loop `justArrived` through `resolveArrival`. Turn-start eligibility check retained as safety net.~~

~~**Files modified:** `src/game/turnEngine.ts`, `src/game/movementEngine.ts` (comment)~~

---

### ~~Task 75 — Fix AI generating out-of-range fleet dispatches~~ ✅ 2026-05-28

~~**Problem:** `aiEngine` picked sources/targets using `transitDistance` (turn count) only; planets within a few transit turns but beyond the click-range cap caused `processSendFleet` to throw "Destination planet … is out of range".~~

~~**Fix:** Derive `rangeClicks = effectiveRange(player.techLevel)` in `computeAiTurn`; pass to reinforce/attack/expand helpers; `nearestOwnedPlanet` skips candidates outside `isInRange`; `tryExpandToNeutral` guards source→target pairs before transit scoring.~~

~~**Files modified:** `src/game/aiEngine.ts`~~

---

## Phase 12 — Vision Alignment Round 5

These tasks address design mismatches and bugs reported by the product owner after Phase 11. Work them in order.

---

### ~~Task 76 — Remove "must keep 1 ship" garrison constraint~~ *(completed 2026-05-28)*

**Problem:** When the player tries to send all ships away from a planet they own, the engine throws:
```
ERROR  [Error: Cannot send 1 ships from planet-25; must keep at least 1 ship on the planet]
```
The intended rule is that a planet is permanently owned once captured — it does not require a garrison to maintain possession. The player should be able to send every ship away and still own the planet. The garrison constraint was a mistaken guard and must be removed.

**Goal:** A player can send all ships off any owned planet. Ownership is unaffected by garrison count and is only lost when an enemy fleet resolves combat there.

**Requirements:**
1. In `src/store/gameStore.ts` (and/or `src/game/turnEngine.ts`), locate the validation that rejects a `SEND_FLEET` order when it would leave fewer than 1 ship on the origin planet. Remove that check entirely.
2. In `src/game/movementEngine.ts` or wherever `createFleet` / `processSendFleet` validates ship count, remove any similar "origin must retain ≥ 1 ship" guard.
3. The only remaining validation on a send order should be: (a) the origin planet is owned by the sending player, (b) the destination is in range, and (c) the ship count requested ≤ `planet.shipCount`.
4. Ownership persistence (planet stays owned at 0 garrison) is already the correct behaviour per Task 15 / `combatEngine.resolveArrival` — no combat-engine changes should be needed. Confirm this with a brief audit.
5. Changes confined to `src/store/gameStore.ts` and `src/game/movementEngine.ts` (and `src/game/turnEngine.ts` if the check lives there).

**Files to read:** `src/store/gameStore.ts`, `src/game/movementEngine.ts`, `src/game/turnEngine.ts`, `docs/systems/movement.md`
**Files to modify:** `src/store/gameStore.ts`, `src/game/movementEngine.ts` (and `src/game/turnEngine.ts` if needed)
**Docs to update:** `docs/systems/movement.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 77 — Simplify building placement: tap chip to place directly (no two-step selection)~~ *(completed 2026-05-28)*

**Problem:** The current planet modal build flow requires two taps: (1) tap a Factory or Research Lab chip to select it, then (2) tap an empty slot to place it. This two-step interaction is unnecessarily fiddly. The intended UX is simpler: tapping the chip itself should immediately place that building into the next available empty slot.

**Goal:** Tapping the Factory chip places a factory in the first available empty slot. Tapping the Research Lab chip places a lab in the first available empty slot. No slot selection step is needed.

**Requirements:**
1. In `GameScreen.tsx`, remove the "selected build type" state (e.g. `selectedBuildType`) and the two-step tap-chip-then-tap-slot interaction pattern entirely.
2. Replace it so that tapping the Factory chip directly calls `queueBuildOrder(planetId, 'factory')` and tapping the Research Lab chip calls `queueBuildOrder(planetId, 'researchLab')`. The store action already finds an available slot or rejects if none exist — no slot index need be supplied by the UI.
3. `queueBuildOrder` in `src/store/gameStore.ts` must auto-assign the building to the first empty slot index rather than requiring a caller-supplied slot index. If it already does this, verify and keep; if it currently requires a slot index, update the signature to make that optional or remove it.
4. The slot grid in the modal should remain visible to show the player how many slots are used vs. available and to display under-construction / active building icons — but individual empty slots no longer need to be tappable.
5. Build chips (Factory / Research Lab) should remain disabled/dimmed when no slots remain (existing behaviour from Task 50 — keep this).
6. Changes in `src/screens/GameScreen.tsx` and possibly `src/store/gameStore.ts` (if slot-index signature needs updating).

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/systems/production.md`
**Files to modify:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 78 — Fix turn counter: show shared round number (not per-player sequential index)~~ *(completed 2026-05-28)*

**Problem:** Task 63 introduced a formula `(roundNumber-1) * playerCount + playerIndex + 1` intended to give each player their own sequential turn number. However the result is wrong: in a 2-player game Player 1 sees Turn 1, 3, 5, … and Player 2 sees Turn 2, 4, 6, … — i.e. it is still counting each individual player action as a turn rather than treating one full round (all players acting once) as one turn. The correct display is: both Player 1 and Player 2 see Turn 1 during round 1, Turn 2 during round 2, and so on — i.e. the HUD simply shows `roundNumber`.

**Goal:** The turn counter at the top of `GameScreen` displays the current `roundNumber` for all players. In a 2-player game both players see Turn 1 on their first turns, Turn 2 on their second turns, etc.

**Requirements:**
1. In `GameScreen.tsx`, locate the `humanTurn` (or equivalent) computation that derives the displayed turn number. Replace the `(roundNumber-1)*playerCount + playerIndex + 1` formula with `roundNumber`.
2. The `roundNumber` value from the store already increments once per full player cycle (after the last player acts) — this is the correct cadence. No store or engine changes needed.
3. The displayed string should read e.g. `Turn 1`, `Turn 2`, etc.
4. Verify the counter is consistent across pass-and-play (both human players) and solo-vs-AI games.
5. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `docs/systems/turn-engine.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 13 — Vision Alignment Round 6

These tasks address visual and interaction improvements identified by the product owner after Phase 12. They are independent and can be worked in either order, but Task 79 (visual spacing) should be validated carefully before Task 80 to confirm gesture math is intact.

---

### ~~Task 79 — Reduce visual planet spacing to 3/5 of current distance~~ ✅ 2026-05-28

**Problem:** A planet that is 4 clicks away looks much further than it should. The visual distance between planets on screen is too large — the map feels sparse and distances feel exaggerated relative to their click cost. The product owner wants adjacent planets to feel closer.

**Goal:** Planets should appear at 3/5 (~60%) of their current on-screen distance without changing any game logic, click distances, ranges, or movement rules.

**Background / Risk:** Previous attempts to adjust planet visual spacing caused regressions in planet tap hit-detection, fleet drag targeting, pan clamping, and zoom anchor math. The coordinate system (`screen = mapCoord * CELL_SIZE * scale + translate`) must stay internally consistent.

**Requirements:**
1. Identify the constant that controls how many screen pixels one grid cell occupies (currently `CELL_SIZE = 18` in `GameScreen.tsx` or equivalent). Reducing this is the primary lever — do **not** change planet coordinate values or click-distance math in `movementEngine.ts`.
2. Reduce the effective on-screen pixel size per cell to approximately 60% of the current value (e.g. if `CELL_SIZE = 18`, target `≈ 11`). Use the closest clean integer or half-integer value that gives consistent rendering.
3. All derived layout values that depend on `CELL_SIZE` (planet node size, label offsets, hit radius, fleet SVG positions, pan clamp bounds) must scale with it — audit every usage and update accordingly.
4. `screenToMapCoords` and `mapToScreenCoords` (or equivalent) must remain mathematically correct after the change — verify that planet tap hit-detection and fleet drag drop-targeting still resolve to the correct planet at all zoom levels.
5. Pan clamping bounds (`-(mapWidth * scale - viewportWidth)` etc.) use `MAP_COLS * CELL_SIZE` (or equivalent) for map pixel dimensions — these must also update to the new cell size so the player can still reach all map edges.
6. Do **not** change `computeClickDistance`, `isInRange`, `effectiveRange`, or any movement/engine constant — the game rules are unchanged. Only visual layout is affected.
7. After the change, do a sanity check: a planet 4 clicks away should look noticeably closer than before (roughly "nearly touching" at default zoom rather than half a screen apart).
8. The existing default zoom scale (currently `0.6`) may need to be adjusted slightly if the new cell size causes the map to appear too zoomed-in at start; use judgment and document the choice.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/movementEngine.ts`, `docs/systems/movement.md`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx` (primary); possibly constants in other files if `CELL_SIZE` is defined there
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 80 — Show live click-distance label while dragging a fleet~~ ✅ 2026-05-28

**Problem:** When planning moves the player has no way to measure distances on the map. They must mentally estimate how far a destination is before committing a fleet order, which makes planning ahead difficult.

**Goal:** As soon as the player begins dragging from any planet (whether they own it or not), a floating label displays the current drag distance in clicks, updating live as the finger moves. This lets players measure distances freely without committing a fleet order.

**Requirements:**
1. During an active fleet drag (while `fleetDrag` pan gesture `onUpdate` is firing), compute the click distance from the drag origin planet's position to the current finger position converted to map coordinates. Use `computeClickDistance(originPlanet.position, currentMapCoords)` from `movementEngine.ts`.
2. Display the distance as a compact floating label (e.g. `"4.2 clicks"` or `"≈ 4 clicks"` rounded to one decimal) near the drag cursor — either attached to the drag line near the finger tip or in a fixed HUD position (bottom-center or top-center, away from UI buttons). Choose whichever is clearest without obscuring the map.
3. The label must be visible and updating on every frame of the drag (no debouncing needed — use the existing `onUpdate` firing cadence).
4. **Drag from non-owned planets must be supported for measurement purposes.** If the current implementation ignores drags that originate from non-owned planets (because `handleDragStart` returns early for non-owned), add a separate lightweight measurement-only drag path that does not trigger fleet dispatch but does activate the distance label. The measurement drag should activate from any planet, not just owned ones.
5. When the drag ends (finger lifted, regardless of whether a fleet was dispatched), the distance label disappears immediately.
6. If the drag origin is not over any planet (drag started on empty space), no label is shown — measurement requires a planet origin.
7. The distance label should not interfere with existing fleet drag behaviour for owned planets (dispatch flow, ship-count modal, range checks, etc.) — it is additive only.
8. Changes confined to `src/screens/GameScreen.tsx` (label render + gesture logic); `computeClickDistance` is already exported from `src/game/movementEngine.ts`.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/movementEngine.ts`, `docs/systems/movement.md`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 14 — Polish Round 1

Follow-up fixes and improvements identified after Phase 13 testing.

---

### ~~Task 81 — Fix map pan during non-owned drag + draw measurement line~~ *(completed 2026-05-28)*

**Problem:** Two issues with the non-owned planet measurement drag introduced in Task 80:
1. When the player starts a `measureDrag` from a non-owned planet, the map pans simultaneously — the board slides under the finger making measurement useless.
2. There is no visual line drawn from the origin planet to the current finger position during a measurement drag. The owned-planet fleet drag already draws such a line; the measurement drag should show the same visual.

**Goal:** Non-owned measurement drags block map pan (matching owned-planet fleet drag behaviour), and a line is drawn from the origin planet to the finger during any active drag (both owned and non-owned).

**Requirements:**
1. **Block pan during measurement drag:** When `measureDrag` activates from a non-owned planet, set the same `isFleetDragging` worklet flag that the owned-planet `fleetDrag` sets, so the pan gesture's `enabled(...)` guard blocks scrolling for the duration of the measurement drag. Clear the flag in `measureDrag`'s `onFinalize`.
2. **Draw measurement line:** The existing `FleetLayer` SVG (or equivalent overlay) already draws a line from drag origin to finger during an owned-planet fleet drag. Extend this so that when `measureDrag` is active (non-owned origin), the same style of line is drawn from the measurement origin planet to the current finger map position. Reuse the existing line/dot style — do not introduce a new visual style.
3. Both fixes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 82 — Fix planet label text sizes (too large after CELL_SIZE reduction)~~ *(completed 2026-05-28)*

~~**Problem:** After `CELL_SIZE` was reduced from 18 to 11 in Task 79, planet label font sizes were not scaled down proportionally. Planet names, class letters, and troop counts now appear too large relative to the planet circles and the overall map density.~~

~~**Goal:** All text rendered on the map (planet name, class letter, troop count) is scaled to be proportionate to the new `CELL_SIZE = 11` baseline.~~

~~**Requirements:**~~
~~1. Audit every `fontSize` value in `GameScreen.tsx` used for planet node labels (name above, class inside, troop count below). These were likely set as fixed pixel values calibrated for `CELL_SIZE = 18`.~~
~~2. Scale each font size by the ratio `11/18` (~0.61) from its original value, rounding to the nearest integer. For example, a `fontSize: 9` label (designed for CELL_SIZE 18) should become `fontSize: 5` or `6`.~~
~~3. Adjust any `lineHeight`, `marginTop`, `marginBottom`, or label container sizing that accompanies these text elements if they also look mismatched at the new scale.~~
~~4. Do not change any font sizes used in modals, the status bar, HUD buttons, or other non-map UI — only map-canvas planet labels are affected.~~
~~5. Changes confined to `src/screens/GameScreen.tsx`.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

## Phase 15 — Vision Alignment Round 7

These tasks address interaction and feel issues reported by the product owner after Phase 14.

---

### ~~Task 83 — Fix zoom gesture: jump/teleport on pinch + edge-clamping blocks focal-point anchoring~~ ✅ 2026-05-28

**Problem:** Two related issues with the pinch-to-zoom gesture:

1. **Zoom jump / teleport:** While pinching to zoom, the view sometimes snaps to a noticeably more-zoomed-in level and simultaneously shifts away from the intended focal point. The zoom does not feel continuous — there is a visible pop or jump mid-gesture.

2. **Edge wall blocks zooming:** When the player tries to pinch-zoom while positioned near the edge of the map (top, bottom, left, or right), an invisible wall prevents the zoom from feeling natural. The pan clamping fires during the pinch gesture and kicks the viewport away from the focal point, making it impossible to zoom into edge areas without first panning to the centre and then scrolling back.

**Suspected causes:**
- The pinch `onStart` snapshot may not be capturing the live shared values atomically, causing a frame of stale baseline being used during accumulation.
- The focal-point translate compensation (`newTx = pinchStartTranslateX + (focalX - focalX * scaleRatio)` or equivalent) may have an off-by-one in how it accounts for the existing translate, causing it to over-correct on each frame.
- The pan clamp is applied unconditionally in `onUpdate` during pinch, so as scale grows the clamp immediately caps translate values — this fights the focal-point math and produces the "wall" effect at edges. The clamp should only commit on `onEnd` (or be made aware that the pinch may legitimately shift translate to a value that is valid at the new scale but invalid at the old scale).
- `saved*` values may not be flushed to shared values consistently between gesture sessions, causing the first few frames of a new pinch to start from a wrong baseline.

**Goal:** Pinch-to-zoom anchors smoothly and continuously to the focal point under both fingers at every zoom level and at every position on the map, including the edges. No jumps, snaps, or teleports at any point during or after a pinch gesture.

**Requirements:**
1. Audit the pinch `onStart` / `onUpdate` / `onEnd` handlers in `GameScreen.tsx`. Confirm that `pinchStartScale`, `pinchStartTranslateX`, `pinchStartTranslateY`, `pinchFocalX`, and `pinchFocalY` are all snapshotted from live shared values in `onStart` and never touched again until the next `onStart`.
2. Verify the focal-point translate formula. The correct relationship is:
   ```
   newScale = clamp(pinchStartScale * event.scale, MIN_SCALE, MAX_SCALE)
   scaleDelta = newScale / pinchStartScale
   newTx = pinchFocalX - scaleDelta * (pinchFocalX - pinchStartTranslateX)
   newTy = pinchFocalY - scaleDelta * (pinchFocalY - pinchStartTranslateY)
   ```
   Any deviation from this (e.g. applying an additional center-compensation term during pinch `onUpdate`) is likely the source of drift.
3. **Do not apply pan clamping during pinch `onUpdate`.** Let the translate values track the focal-point formula freely during the gesture. Apply clamping only in pinch `onEnd` (and pan `onEnd`), after the final scale is committed. This removes the "edge wall" mid-gesture.
4. After pinch `onEnd`, commit `savedScale`, `savedTranslateX`, `savedTranslateY` from the clamped final values. The pan `onStart` must subsequently snapshot from these committed saved values so there is no jump on the next pan.
5. Verify `screenToMapCoords` still produces correct planet hit coordinates after the fix (the center-compensation term in the inverse transform is unrelated to pinch math and must remain).
6. Test the following scenarios before marking complete:
   - Pinch-zoom in the centre of the map: view stays anchored under fingers throughout.
   - Pinch-zoom near the top-left corner of the map: view does not jump; zoom anchors as close to the focal point as clamping allows.
   - Pinch-zoom near the right edge: no wall effect; the view zooms naturally until the clamp limit is reached.
   - Pan after zoom: no position jump on the first frame of the subsequent pan.
7. Changes confined to `src/screens/GameScreen.tsx`.

**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 16 — Vision Alignment Round 8

These tasks address planet distribution, visual scale, and class-weight issues reported by the product owner after Phase 15.

---

### ~~Task 84 — Reduce planet starting distance by half (map coordinate scale)~~ *(complete 2026-05-28)*

**Problem:** Planets start too far apart in click-distance terms. The actual game coordinates that determine how many clicks it takes to travel between planets need to be reduced so the map feels denser and more active earlier in the game.

**Goal:** Halve the average click-distance between planets at game start without changing any visual rendering constants (`CELL_SIZE`, default scale, font sizes, etc.) — those are handled separately in Task 85.

**Requirements:**
1. Read `src/game/mapGenerator.ts` and `src/game/types.ts` to understand how planet `x`/`y` coordinates and map dimensions (`width`, `height`) are defined.
2. Halve the effective coordinate spread of planet placement. The most direct approach is to halve the map grid dimensions passed into `mapGenerator` (the `width`/`height` of `MapConfig`) while keeping the planet count the same. Update the three HomeScreen presets (`Small`, `Medium`, `Large`) accordingly.
3. Verify `MIN_PLANET_DISTANCE` still makes sense after the change — the minimum spacing may need to be reduced proportionally so planet placement doesn't fail on denser grids.
4. Verify `PLANET_EDGE_PADDING` still keeps planets away from visual edges.
5. No visual rendering constants changed — all changes in `src/game/mapGenerator.ts`, `src/screens/HomeScreen.tsx`, and any game constants files.
6. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/mapGenerator.ts`, `src/game/types.ts`, `src/screens/HomeScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/game/mapGenerator.ts` (if constants live there), `src/screens/HomeScreen.tsx` (preset sizes)
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 85 — Reduce visual click-distance by half (CELL_SIZE)~~ *(completed 2026-05-28)*

~~**Problem:** The visual distance between planets per map-click is still too large. A previous pass (Task 79) reduced `CELL_SIZE` from 18 to 11; this task reduces it by another half (to ~5–6 px).~~

~~**Goal:** Halve the current `CELL_SIZE` so the map renders with tighter visual spacing. All proportional elements (planet diameters, label font sizes, hit radii, fleet SVG sizes, pan clamp math) must scale correctly so the map remains readable and interactive.~~

~~**Requirements:**~~
~~1. Read `src/screens/GameScreen.tsx` carefully to identify every constant and derived value that uses or is derived from `CELL_SIZE`.~~
~~2. Reduce `CELL_SIZE` from `11` to `6` (nearest integer that is ~half; use 5 or 6 — choose whichever keeps labels readable on a real device).~~
~~3. Planet diameters, label font sizes (name, class letter, troop count), label offsets, `PLANET_HIT_RADIUS`, fleet SVG marker sizes, pending-departure dot offsets, and pan clamp map dimensions must all derive from `CELL_SIZE` or be scaled proportionally (as established in Tasks 79 and 82).~~
~~4. Adjust the default map scale (currently `1.0`) upward if necessary so the map fills the viewport comfortably at launch. Target: the full Small-preset map should be roughly viewport-filling at default scale.~~
~~5. Scrolling, panning, zooming, and screen↔map coordinate transforms must remain accurate at all scale levels. Verify by checking `screenToMapCoords` and clamp formulas still reference the updated `CELL_SIZE`-derived map pixel dimensions.~~
~~6. `npx tsc --noEmit` must pass clean.~~
~~7. After implementation, do a proportionality review: planet node sizes, label fonts, and hit targets should all look/feel the same as they do now relative to each other — just smaller overall.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 86 — Randomise planet distribution (remove square/grid appearance)~~ *(complete 2026-05-28)*

~~**Problem:** Planets always appear to be distributed within a rectangular grid area, giving the map a uniform, square-biased look. The layout feels artificial rather than like a natural galaxy.~~

~~**Goal:** Make planet placement feel organic and irregular. The set of planets on any given map should vary widely in density across regions — some areas of the map may be sparse, others dense — so no two maps feel structurally the same.~~

~~**Requirements:**~~
~~1. Read `src/game/mapGenerator.ts` to understand the current placement algorithm (likely uniform random sampling within `[0, width] × [0, height]`).~~
~~2. Replace the uniform candidate-sampling approach with a multi-cluster distribution:~~
   ~~- At map generation time, choose a seeded-random number of cluster centres (e.g. 2–5 clusters for a typical map size), each at a random position within the padded map bounds.~~
   ~~- For each planet, randomly assign it to a cluster, then sample a candidate position from a Gaussian (or approximate) distribution centred on that cluster, with a seeded-random spread radius per cluster (e.g. 25–60% of map width/height).~~
   ~~- Keep the existing `MIN_PLANET_DISTANCE` rejection check so planets never overlap.~~
   ~~- Keep the 200-candidate retry loop (or increase retries if cluster-based placement is tighter).~~
~~3. Cluster centres and spreads must be derived from the game seed so maps are deterministic.~~
~~4. Home planet spawns (handled by `src/game/spawnPlacer.ts`) should remain unaffected — they use their own placement logic; only non-spawn planet positions are changed.~~
~~5. The change must not affect movement math, click distances, or any values outside `src/game/mapGenerator.ts`.~~
~~6. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/game/mapGenerator.ts`, `src/game/spawnPlacer.ts`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/game/mapGenerator.ts`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 87 — Rebalance planet class weights (A–E only slightly more common than F–P)~~ *(completed 2026-05-28)*

**Problem:** Task 52 over-corrected planet class distribution: it removed classes F–P entirely and made A–E account for 100% of spawns. The intent was only to make the better classes slightly more common, not exclusive. The current map has no variety in the lower-tier planets.

**Goal:** Restore classes F–P to the weighted pool and rebalance so A–E are only mildly more common than F–P, giving a gentle bias toward better classes without making poor planets rare.

**Requirements:**
1. Read `src/game/mapGenerator.ts` to find `PLANET_CLASS_WEIGHTS` (or equivalent).
2. Restore all 16 classes (A–P) to the weight pool.
3. Apply a gentle stepped weighting. One acceptable approach:
   - Tier 1 (A–E): weight 8 each = 40 total
   - Tier 2 (F–J): weight 5 each = 25 total
   - Tier 3 (K–P): weight 3 each = 18 total
   - Grand total: 83 — normalise or use weighted-random draw directly
   - This gives A–E a ~48% combined share vs F–J ~30% and K–P ~22%, so the better classes are noticeably more likely but far from dominant.
4. Adjust weights if a better feel is preferred, but the intent is "slight" bias — A–E should not exceed ~50% combined probability.
5. Home planet class assignment (Task 53, classes A–G) is separate and must remain unchanged.
6. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/mapGenerator.ts`, `docs/development/current-state.md`
**Files to modify:** `src/game/mapGenerator.ts`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 17 — Vision Alignment Round 9

These tasks fix visual regressions introduced by Phase 16 scaling changes.

---

### ~~Task 88 — Restore visual proportions by reverting CELL_SIZE to 18~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

---

### ~~Task 89 — Replace multi-cluster planet placement with single organic blob~~ *(completed 2026-05-28 — see `docs/tasks/completed.md`)*

**Problem:** Task 86 introduced 2–5 random clusters, each placed at a random position within the rectangular map bounds. The result is multiple dense pockets scattered across the full square area, which still looks like planets fill a rectangular region — just in clumps rather than uniformly. The intent is for planets to feel like one natural galaxy mass with no visible rectangular boundary.

**Goal:** Remove the multi-cluster logic and replace it with a single central Gaussian distribution. Planets radiate outward from the map centre with naturally decreasing density toward the edges, producing one organic blob shape with no rectangular footprint.

**Requirements:**
1. In `src/game/mapGenerator.ts`, remove `PlanetCluster`, `createPlanetClusters`, and `clusterPosition`.
2. Add a `gaussianPosition` function that generates a candidate using the Box-Muller approximation (or sum-of-uniforms) centered at `(width/2, height/2)` with spread `σ = width * 0.28`:
   - Generate two independent `[-1, 1]` uniform values using the rng, each approximated as a normal by summing 3 uniform `[0,1]` samples and subtracting 1.5 (range ~[-1.5, 1.5], roughly normal-shaped).
   - Multiply each by `σ`, add to center, round to nearest integer.
   - **Do not clamp** to padded bounds inside this function — instead, treat out-of-bounds candidates as a placement failure so the existing retry loop rejects them naturally. This prevents bunching at the edges.
3. In `generateMap`, replace the `clusterPosition` call with `gaussianPosition`.
4. Keep `randomPosition` (it is used by `spawnPlacer` indirectly) and `paddedBounds`.
5. `MIN_PLANET_DISTANCE`, `isFarEnough`, and the 1000-attempt retry loop are unchanged.
6. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/mapGenerator.ts`, `src/game/spawnPlacer.ts`, `docs/development/current-state.md`
**Files to modify:** `src/game/mapGenerator.ts`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 18 — Vision Alignment Round 10

These tasks fix planet spacing issues reported after Phase 17.

---

### ~~Task 90 — Fix planet spacing: minimum 4 clicks, prefer 6–10 click neighbours~~ *(completed 2026-05-28)*

---

## Phase 19 — Vision Alignment Round 11

---

### ~~Task 91 — Fix planet placement failure: increase map preset sizes to fit MIN_DISTANCE=4~~ *(completed 2026-05-28)*

---

## Phase 20 — Vision Alignment Round 12

---

### ~~Task 92 — Replace Gaussian planet placement with organic growth model~~ *(completed 2026-05-28)*

~~**Problem:** The Gaussian distribution always produces a roughly circular, symmetric blob centred on the map. Every map looks structurally the same. The desired output is varied, irregular galaxy shapes: chains, multi-arm spirals, a fat cluster with a trailing arm, two groups bridged by a few planets, etc.~~

~~**Goal:** Replace the Gaussian-position sampler with a **growth model**: the first planet is seeded at a random map position; each subsequent planet attaches to a randomly-chosen already-placed planet at a random angle and a distance sampled from a distribution that prefers 6–10 clicks. Different seeds produce radically different shapes.~~

~~**Algorithm:**
1. If no planets placed: sample a truly random position within padded bounds (not centred).
2. Otherwise: pick a random parent from all already-placed planets (uniform draw). Sample distance using `4 + (rng() + rng()) * 4.5` (triangular distribution, range ~4–13, peak ~8–9). Sample a uniform angle `0–2π`. Compute candidate = `round(parent + dist * [cos, sin])`. Return `null` if out of padded bounds; the outer retry loop will try again with a new random parent.
3. The existing `isFarEnough` / `MIN_PLANET_DISTANCE=4` / 2000-attempt retry loop remain unchanged.
4. Remove the Phase A/B connectivity ceiling logic (`connectivityCeiling`) — the growth model keeps planets naturally connected without it.
5. Remove `gaussianPosition` and `connectivityCeiling`. Keep `paddedBounds`, `randomPosition`, `nearestDistance`, and `isFarEnough` unchanged.
6. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/game/mapGenerator.ts`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/game/mapGenerator.ts`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

## Phase 21 — Vision Alignment Round 13

---

### ~~Task 93 — Simplify planet growth distance to uniform [4, 11] clicks~~ *(completed 2026-05-28)*

---

## Phase 22 — Vision Alignment Round 14

Product-owner feedback: pass-and-play multi-human bugs and related UX gaps.

---

### Task 94 — Fix End Turn for second+ human in pass-and-play

**Problem:** In pass-and-play mode with two or more human players, the first human can end their turn normally. When play passes to the second human, the **End Turn** button is visible but tapping it does nothing — the turn never advances and the lock screen never appears.

**Reproduction:**
1. Start a new game with **Pass & Play** and at least two human slots (no AI required).
2. Player 1 takes actions and taps **End Turn** — works; lock screen appears; pass device.
3. Player 2 dismisses lock screen, plays their turn, taps **End Turn** — no effect.

**Suspected cause:** `gameStore.endTurn()` resolves the acting player with `gameState.players.find((p) => !p.isAI)` (always the **first** human) and returns early when `currentPlayerId !== humanPlayer.id`. `GameScreen` already uses `getLocalHumanPlayerId(gameState)` for fog, ownership, and `isHumanTurn`, so the button renders for the current human but the store rejects the action.

**Goal:** Any human whose turn it is can press **End Turn** and have their queued orders committed with `playerId` set to that human; pass-and-play lock screen behaviour unchanged.

**Requirements:**
1. In `endTurn`, use the **current** human player (`currentPlayerId` where `!isAI`), not the first human in `players`.
2. Early-return only when `currentPlayerId` is missing, refers to an AI, or game status is not `active`.
3. `TurnInput.playerId` must match the current human's id.
4. Audit other store actions that use `players.find((p) => !p.isAI)` for the same bug (`queueBuildOrder`, `setProductionSlider`, `queueOrder`, etc.) and fix any that should key off the current human in pass-and-play.
5. Manual check: 2-human and 3-human pass-and-play games — each human can end turn, lock screen cycles correctly, AI turns (if any) still run between humans.
6. Solo human vs AI and single-human games must behave as before.

**Files to read:** `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`, `docs/systems/multiplayer.md`, `docs/development/current-state.md`, `docs/development/known-issues.md`  
**Files to modify:** `src/store/gameStore.ts` (primary); `src/screens/GameScreen.tsx` only if needed  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`, `docs/systems/multiplayer.md` (if behaviour note needed)

---

## Phase 23 — Vision Alignment Round 15

Product-owner feedback: troop dispatch bug, planet name label position, and modify-queued-fleet UX.

---

### ~~Task 95 — Fix troop send cap: can't send more than 1 troop even when planet has 2+~~ *(completed 2026-05-28)*

~~**Problem:** When a planet has 2 or more troops, the ship-count selector in the fleet dispatch modal will not allow the value to increase above 1. The player is effectively stuck at sending a maximum of 1 troop regardless of garrison size.~~

~~**Suspected cause:** The max value passed to the ship-count modal (or the store action that computes available troops) may be incorrectly deriving the available troop count — for example using a hardcoded `1`, using the wrong field, or reading the displayed (queued-deducted) count in a way that rounds down to 1 after subtracting some queued amount. Also check whether `queuedShipsPerPlanet` subtraction brings the available count to 0 or 1 prematurely.~~

~~**Goal:** Players can send up to all available troops on a planet (garrison minus already-queued outbound ships from that planet this turn). If 5 troops are on a planet and 2 are already queued outbound, the modal max should be 3.~~

~~**Requirements:**~~
~~1. Identify where the ship-count modal receives its `max` value and trace back to the source.~~
~~2. Fix the off-by-one or miscalculation so `max = planet.shipCount - queuedOutboundFromPlanet`.~~
~~3. Minimum send count remains 1.~~
~~4. Existing queued-order subtraction logic in `queuedShipsPerPlanet` must remain correct (display and modal should agree).~~
~~5. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `docs/development/current-state.md`~~  
~~**Files to modify:** `src/screens/GameScreen.tsx` and/or `src/store/gameStore.ts` (wherever the modal max is set)~~  
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

**Completed 2026-05-28:** Removed leftover `- 1` garrison reserve from `modalMaxShips` in `GameScreen.tsx` (`Math.max(1, shipCount - shipsAlreadyQueued)`). Root cause was stale UI constraint after Task 76 removed engine garrison rule.

---

### ~~Task 96 — Move owned-planet name label up so it doesn't overlap the planet node~~ *(completed 2026-05-28)*

~~**Problem:** For planets the player owns, the planet name label is rendered slightly behind or overlapping the planet circle, making it hard to read.~~

~~**Goal:** Shift the name label upward by a small fixed amount so it sits clearly above the planet node with visible separation, consistent across zoom levels.~~

~~**Requirements:**~~
~~1. Adjust the vertical offset/margin of the planet name label in `PlanetNode` (or its container in `GameScreen`) for owned planets only — or universally if it improves all planets without regression.~~
~~2. The label must not collide with the troop count or class letter at any reasonable zoom level.~~
~~3. Non-owned planet name labels may be adjusted by the same amount for visual consistency, but owned legibility is the priority.~~
~~4. No changes to font size, color, or label content.~~
~~5. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~  
~~**Files to modify:** `src/screens/GameScreen.tsx`~~  
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

**Completed 2026-05-28:** `PLANET_NAME_LABEL_TOP` numerator changed from `-11` to `-18` in `GameScreen.tsx` (`Math.round((-18/18)*CELL_SIZE)`); label shifts up 7px at `CELL_SIZE` 18 for all planets.

---

### ~~Task 97 — Re-open and edit queued fleet order by dragging the pending departure line~~

~~**Problem:** Once a player queues a fleet order this turn (e.g. send 2 troops from Planet A to Planet B), there is no way to adjust the troop count without fully cancelling the order and re-dragging. If the player changes their mind and wants to send 3 instead of 2, they must cancel and restart.~~

~~**Goal:** Let the player drag the pending departure line (or the departure dot) for an already-queued order to re-open the ship-count modal, pre-populated with the currently queued amount. The player can then increase or decrease the count and confirm; the existing order is updated in place. This interaction only works within the same turn — once End Turn is pressed and the fleet is in transit, it cannot be recalled.~~

~~**Scope / behaviour:**~~
~~- Dragging an existing queued departure indicator (the dashed pending line or its origin dot rendered by `FleetLayer`) from an owned planet that has a queued outbound order opens the ship-count modal for that route.~~
~~- The modal's default value is the currently queued ship count for that order.~~
~~- The modal's max is `planet.shipCount - (other queued outbound ships from that planet, excluding this order)`.~~
~~- Confirming replaces the existing queued order with the new ship count (same origin/destination, updated count).~~
~~- Cancelling the modal leaves the existing order unchanged.~~
~~- If the player drags a planet that has multiple queued orders to different destinations, show a route-picker list first (or handle whichever order's line was dragged, if hit-testing allows it).~~
~~- The drag interaction must not conflict with: new fleet dispatch drag (dragging from a planet with no queued order), map pan, or pinch zoom.~~
~~- In-transit fleets (already past End Turn) are unaffected — no mid-transit recall.~~
~~- `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `docs/development/current-state.md`, `docs/tasks/backlog.md`~~  
~~**Files to modify:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`~~  
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

**Completed 2026-05-28:** Snap-back drag (release on same origin planet) opens edit flow; `updateQueuedOrder` in `gameStore.ts`; single queued route opens ship-count modal pre-populated, multiple routes opens queued-orders list; `shipsAlreadyQueued` excludes order being edited; modal title "Edit Fleet" when editing.

---

## Phase 24 — UX Vision Alignment

These tasks address design mismatches and UX issues identified by the product owner after Phase 23.

---

### ~~Task 98 — Snap to home planet at turn start~~ *(completed 2026-05-28)*

---

### ~~Task 99 — Home planet colour: light brown tint~~ *(completed 2026-05-28)*

~~**Problem:** There is currently no visual indicator to help a player identify which planet is their home planet at a glance. All owned planets look identical (green).~~

~~**Goal:** The current human player's home planet renders in a distinct light brown colour instead of the standard green, so they can immediately spot it on the map.~~

~~**Requirements:**~~
~~1. In `GameScreen`, when determining the fill colour of a planet node, add a check: `planet.id === localHumanPlayer.homePlanetId` (or equivalent field). If true and the planet is owned by the local human, use a light brown colour (e.g. `#c8a26b` or similar warm sandy-brown — pick a value that reads clearly against the map background without looking like a neutral/enemy planet).~~
~~2. The light brown colour applies only to that player's own home planet. All other owned planets remain green.~~
~~3. The home planet label (name, class, troop count) is unaffected — only the circle fill colour changes.~~
~~4. Works correctly in pass-and-play: whichever player is active sees their home planet in brown and all other owned planets in green.~~
~~5. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 100 — Background colour: soft off-white~~ *(completed 2026-05-28)*

**Problem:** The current background is either black/very dark or a harsh stark white. The desired look is a warm, soft off-white that is easy on the eyes.

**Goal:** The app's background colour is changed to a soft off-white (e.g. `#f5f0eb` or similar warm off-white — not pure `#ffffff`).

**Requirements:**
1. Update the background colour of `GameScreen`'s map container and any other full-screen containers (`HomeScreen`, lock screen overlay background if applicable) to the new off-white value.
2. Define the colour as a named constant (e.g. `COLORS.background` or `BG_COLOR`) so it can be reused rather than scattered as magic strings.
3. Check that planet nodes, text labels, and UI overlays remain legible against the new background — adjust any element that becomes illegible (e.g. very light text may need darkening).
4. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/screens/GameScreen.tsx`, `src/screens/HomeScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`, `src/screens/HomeScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 101 — Fix zoom-edge map shift: add map viewport padding~~ *(completed 2026-05-28)*

**Problem:** When the edge of the map is visible in the viewport and the user performs a pinch-zoom, releasing the gesture causes the map to jump/shift. This happens because the clamp logic allows the edge to sit flush with the viewport boundary, and the focal-point formula resolves to a slightly different translate after the clamp is applied at gesture end.

**Goal:** Prevent the map from ever sitting flush against the viewport edge by adding significant padding between the viewport boundary and the map content area, so the clamp logic never fights the zoom focal-point calculation near the edges.

**Requirements:**
1. Introduce a `MAP_VIEWPORT_PADDING` constant (suggested value: `150` logical pixels — large enough that the edge is never visible during a typical pinch, but adjust if needed).
2. Apply this padding to all four sides of the pan clamp bounds: instead of clamping `translateX` to `[-(mapWidth * scale - viewportWidth), 0]`, clamp it to `[-(mapWidth * scale - viewportWidth) - MAP_VIEWPORT_PADDING, MAP_VIEWPORT_PADDING]` (and equivalently for Y). This ensures the map can never be pulled so close to the edge that the boundary is in frame.
3. The minimum clamp must still prevent the map from being panned so far that no map content is visible — guard against over-padding on small maps at high zoom.
4. The change applies to both pinch `onEnd` clamp and pan `onEnd` clamp (wherever `clampTranslation` or equivalent is called).
5. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 102 — Queued modal: include builds queued this turn~~ *(completed 2026-05-28)*

~~**Problem:** The Queued Orders modal currently only lists `SEND_FLEET` orders. `BUILD` orders placed this turn are not shown, so players have no single view of everything they've committed to this turn.~~

~~**Goal:** The Queued Orders modal shows all queued actions for this turn — both fleet dispatches and building placements — so the player can see a complete record of their moves before pressing End Turn.~~

~~**Requirements:**~~
~~1. In `GameScreen`, when rendering the Queued Orders modal, iterate over `queuedOrders` and render both `SEND_FLEET` entries (existing) and `BUILD` entries (new).~~
~~2. `BUILD` entries should display: planet name, building type (Factory / Research Lab), and a ✕ cancel button that calls `cancelBuildOrder` for that planet/slot.~~
~~3. The empty state message should still display when there are no queued orders of either type.~~
~~4. The existing fleet-order rows are unchanged in appearance.~~
~~5. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 103 — Header dropdown: consolidate Queued, R&D, and Report into top-right menu~~ *(completed 2026-05-28)*

~~**Problem:** The "Queued (N)" and "R&D" buttons are currently rendered as separate pill buttons on the screen. As more options are added (Report in Task 104), the button clutter will grow. These should be consolidated into a clean dropdown/menu accessible from a single button in the top-right corner of the header.~~

~~**Goal:** A single top-right header button (e.g. "≡" hamburger or "⋮" vertical dots) opens a dropdown menu containing: Queued, R&D, and Report (added in Task 104). The individual Queued and R&D pill buttons are removed from the screen.~~

~~**Requirements:**~~
~~1. Add a dropdown trigger button fixed to the top-right of the `GameScreen` header area (respecting safe-area insets).~~
~~2. Tapping the trigger opens a small inline dropdown/menu listing: **Queued** (with the current queued-order count badge if > 0), **R&D**, and **Report**.~~
~~3. Tapping any menu item closes the dropdown and opens the corresponding modal.~~
~~4. Remove the existing standalone "Queued (N)" and "R&D" pill buttons from the screen.~~
~~5. The Queued, R&D, and Report modals themselves are unchanged (only the trigger mechanism changes).~~
~~6. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 104 — Report modal: turn summary of all events this turn~~ *(completed 2026-05-28)*

~~**Problem:** After a turn resolves, players have no summary of what happened — fleets that arrived, combat outcomes, research level-ups, and completed buildings are all invisible unless the player manually inspects each planet.~~

~~**Goal:** A "Report" option in the header dropdown (Task 103) opens a modal listing all notable events that occurred when the last End Turn was processed: planets captured or reinforced, combat results (attacker, defender, outcome), research level-ups, and buildings that completed construction this turn.~~

~~**Requirements:**~~
~~1. Add a `TurnReport` structure to the game store (or local component state) that is populated at the end of `endTurn` / turn resolution with an array of event entries. Each entry has a type and human-readable description. Event types to track:~~
   ~~- **Fleet arrived** — fleet reached its destination (friendly reinforcement or successful capture).~~
   ~~- **Combat** — battle occurred: attacker name, defender name, planet name, winner, troops lost on each side.~~
   ~~- **Research level-up** — player advanced a tech level (new level number).~~
   ~~- **Build complete** — a building (Factory / Research Lab) finished construction on a named planet.~~
~~2. The Report modal renders these events in a scrollable list, grouped or separated by type, with clear labels.~~
~~3. If no events occurred this turn the modal shows an empty state ("Nothing to report this turn.").~~
~~4. The report covers only the most recently resolved turn; it resets each time End Turn is pressed.~~
~~5. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/turnEngine.ts`, `src/game/combatEngine.ts`, `src/game/productionEngine.ts`, `src/game/types.ts`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts` (if new types needed), `src/game/turnEngine.ts` or `src/game/productionEngine.ts` (emit events)~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 105 — Fleet dispatch modal: use planet names only (no internal IDs)~~ ✅ 2026-05-28

~~**Problem:** The fleet dispatch confirmation modal currently displays something like "Planet 15 → Planet 0", exposing raw internal planet IDs or zero-based indices to the player. Players should only ever see planet names.~~

~~**Goal:** Replace every occurrence of planet IDs or index numbers in the fleet dispatch modal with the planet's `name` field.~~

~~**Requirements:**~~
~~1. In `GameScreen`, locate the Send Fleet / Confirm Fleet modal content where the route is rendered (the "Planet X → Planet Y" text).~~
~~2. Replace any use of `planet.id` or numeric index with `planet.name` for both origin and destination.~~
~~3. Audit the entire fleet dispatch modal for any other place a raw id or number is shown to the player and replace with the name.~~
~~4. No changes to the underlying store or engine — this is a display-only fix.~~
~~5. `npx tsc --noEmit` must pass clean.~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 106 — Fleet dispatch modal: center the ship count input~~ *(completed 2026-05-28)*

~~**Problem:** The ship-count number input/counter in the fleet dispatch modal is left-aligned, making the modal feel unbalanced.~~

---

### ~~Task 107 — Retheme colour palette for off-white background~~ *(completed 2026-05-28)*

~~**Goal:** Replace the dark-navy colour palette with a cohesive warm light-mode palette that works with the `#f5f0eb` background across both screens.~~

~~**Files modified:** `src/screens/GameScreen.tsx`, `src/screens/HomeScreen.tsx`~~

---

### ~~Bug fix — Enemy planet colour reveals home planet (fog of war)~~ *(completed 2026-05-28)*

~~**Problem:** `getPlanetColor` returned distinct player colours for enemy-owned planets, making them visually distinguishable from neutral planets and revealing enemy home planet locations at game start.~~

~~**Goal:** All planets not owned by the local human player render with the same neutral colour; fog of war is visual as well as informational. Fleet markers retain owner colour via `getPlayerColor`.~~

~~**Files modified:** `src/screens/GameScreen.tsx`~~

---

### ~~Bug fix — Fleet dispatch modal: allow 0 ships to cancel order~~ *(completed 2026-05-28)*

~~**Problem:** Ship-count stepper minimum was 1; players editing a queued fleet order could not cancel it from the dispatch modal without opening the Queued modal separately.~~

~~**Goal:** Stepper goes to 0; Confirm at 0 shows **Cancel Order** — closes without queuing (new dispatch) or removes the existing queued order (edit mode).~~

~~**Files modified:** `src/screens/GameScreen.tsx`~~

---

### ~~Bug fix — Queued modal: group build orders by planet + type~~ *(completed 2026-05-28)*

~~**Problem:** Each building placed this turn rendered as a separate row in the Queued Orders modal; two Factories on the same planet appeared as two identical rows.~~

~~**Goal:** Build rows grouped by planet + building type (e.g. `🏭 Iron Peak — 2× Factory`); single ✕ removes all buildings in the group; badge count still reflects total buildings queued.~~

~~**Files modified:** `src/screens/GameScreen.tsx`~~

---

## Phase 25 — Vision Alignment Round 16

Product-owner feedback: zoom-aware hit targets and related interaction accuracy issues.

---

### ~~Task 108 — Scale planet hit/select radius with zoom level~~ ✅ Complete 2026-05-28

~~**Problem:** The touch area used to select or interact with a planet (`PLANET_HIT_RADIUS`) is a fixed size in map coordinates. Because `findPlanetAtMapCoords` and the drag-origin hit-test both use this fixed radius, the effective on-screen hit zone is proportionally enormous when zoomed in (planets fill a large area of the screen but the hit zone extends far beyond the visible planet circle) and uncomfortably small when zoomed out. The buffer should feel consistent relative to the displayed planet size at all zoom levels.

**Reproduction:**
1. Launch a game at default zoom (~0.6×). Planet tap targets feel correct.
2. Pinch-zoom in to ~2×–3×. Planets now appear large and the click/select area extends visibly well beyond the planet circle — tapping empty space near a planet triggers selection unexpectedly.
3. Pinch-zoom out to minimum (~0.4×). Planets are very small and harder to tap than expected.

**Root cause:** `findPlanetAtMapCoords` (and any direct distance check against `PLANET_HIT_RADIUS`) uses map-space coordinates. The radius is constant in map space, which means in screen space the hit zone grows and shrinks directly with `scale`. A planet that appears 30px wide at 1× zoom appears 90px wide at 3× zoom — but the hit zone grows to 90px radius rather than staying proportionate to the visual circle.

**Goal:** Planet tap, fleet drag-start, and fleet drag-drop hit detection all use a hit radius that keeps a consistent feel relative to the visual planet size, regardless of the current zoom level.

**Requirements:**
1. Pass the current `scale` shared value into `findPlanetAtMapCoords` (or compute an adjusted radius before calling it). The effective hit radius in map coordinates should be `PLANET_HIT_RADIUS / scale` so that the screen-space touch radius stays constant regardless of zoom.
2. Apply the same zoom-adjusted radius for fleet drag-origin detection (the check that determines whether a finger-down starts a fleet drag from an owned planet) and fleet drag-drop hit-detection (determining the destination planet on finger-up).
3. `PLANET_HIT_RADIUS` constant itself is unchanged — it defines the screen-space radius target (in px). The scaling is applied at call sites only.
4. At default scale (~0.6×) the effective map-space radius will be larger than the raw constant (providing a bigger tap target at small zoom, matching the current comfortable feel). At 2×+ zoom the effective radius shrinks to match the more precise targeting that zoomed-in users expect.
5. All gesture logic changes confined to `src/screens/GameScreen.tsx`.
6. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/screens/GameScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

~~**Files modified:** `src/screens/GameScreen.tsx`~~

---

## Phase 26 — Vision Alignment Round 17

Product-owner feedback: battle results modal at turn start, and restructured turn report categories.

---

### ~~Task 109 — Battle results modal at turn start~~ *(complete 2026-05-28)*

**Problem:** When the human player starts their turn, there is no clear summary of battles that occurred during the previous round. Combat outcomes are buried in the turn report modal, which is accessed via the ⋮ menu and mixes battle results with other event types.

**Goal:** When the human player's turn begins, if any battles occurred during the turn cycle just resolved, a dedicated modal pops up automatically before they can take any actions. This modal presents each battle as a structured log entry.

**Requirements:**
1. After `endTurn` resolves all AI and human turns in the cycle, check if any `combat` events exist in `turnReport`.
2. If one or more `combat` events exist, set a `showBattleReport` flag in the store (or derive it from `turnReport` in `GameScreen`) so the modal auto-opens on the next render of `GameScreen` after the lock screen is dismissed (pass-and-play) or immediately (single-human game).
3. The modal title is **Battle Report**.
4. Each battle entry must display:
   - **Planet name** where the battle occurred
   - **Opponent name** (the other player involved — attacker or defender depending on perspective)
   - **Your troop count** going into the battle
   - **Their troop count** going into the battle
   - **Outcome:** Win or Loss
   - **Troops remaining** for the winner after combat
5. Entries are listed in the order battles occurred (existing `combat` event order from `turnReport`).
6. A single **Close** button dismisses the modal and allows the player to take their turn.
7. The modal does not replace the Report modal — it is a separate auto-opening modal. The Report modal in the ⋮ menu is unchanged.
8. `npx tsc --noEmit` must pass clean.

**Implementation notes:**
- `combat` events in `TurnEvent` already carry attacker/defender ids, planet id, troop counts, and outcome (see `types.ts` and `combatEngine.ts`). Verify what fields are available before coding.
- Planet name can be looked up from `gameState.map.planets` by planet id.
- Player name can be looked up from `gameState.players` by player id.
- The local human player id determines "your" vs "their" perspective in each battle entry.
- In pass-and-play, show battles relevant to the active human player only (same as the existing turn report scoping).

**Files to read:** `src/game/types.ts`, `src/game/combatEngine.ts`, `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`, `src/game/types.ts` (if combat event fields need expanding), `src/store/gameStore.ts` (if a flag is needed)
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 110 — Restructure turn report into ordered categories~~ *(completed 2026-05-28)*

~~**Problem:** The current Report modal (accessed via ⋮ menu) lists all turn events as a flat chronological list. This makes it hard to quickly scan for the information the player cares about most.~~

~~**Goal:** Reorganise the Report modal into distinct labelled sections, shown only when that category has entries, in the following order:~~

~~1. **Battles** — all `combat` events (wins, losses, and uncontested landings on neutral planets)~~
~~2. **Research** — `research_levelup` events, shown only if at least one level-up occurred this turn~~
~~3. **Troop Landings** — `fleet_arrived` events where the destination was owned by the local human player and no combat occurred (friendly reinforcement arrivals) OR arrivals where the human captured a neutral planet without combat~~
~~4. **Built** — `build_complete` events (buildings that finished construction this turn)~~

~~**Requirements:**~~
~~1. Each section has a bold section header label (e.g. **Battles**, **Research**, **Troop Landings**, **Built**).~~
~~2. Sections with zero events for that turn are omitted entirely (no empty section header shown).~~
~~3. The event text formatting within each section remains the same human-readable strings already used in the flat list.~~
~~4. If all four categories are empty, the existing "Nothing to report this turn." empty state is shown (unchanged).~~
~~5. The ordering above is strict — Battles always appear first, Built always last.~~
~~6. This is a display-only change to `GameScreen`. No changes to `turnReport` structure, event emission, or store logic.~~
~~7. `npx tsc --noEmit` must pass clean.~~

~~**Implementation notes:**~~
~~- Filter `turnReport` events by their `type` field to build each category array.~~
~~- Use a `SectionList` or manual `View` grouping inside the existing `ScrollView`.~~
~~- Section header style should be visually distinct (e.g. slightly larger font, bold, with a subtle separator line above it).~~

~~**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`, `docs/development/current-state.md`~~
~~**Files to modify:** `src/screens/GameScreen.tsx`~~
~~**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`~~

---

### ~~Task 111 — Bug fix: battle UI shown to both human players in pass-and-play~~ *(completed 2026-05-28)*

**Problem:** When a battle occurs between two human players in pass-and-play mode, the full suite of battle UI — the 🔥 map marker on the contested planet, the Battle Report auto-open modal at turn start, the **Battle Report** entry in the ⋮ header menu, and the contextual battle card that appears when tapping a battle planet — only appears for the first human player to take their turn after the combat resolves. The second human player receives no battle feedback at all: no map marker, no auto-open modal, no ⋮ Battle Report entry, and no battle card on planet tap.

**Goal:** Both human players involved in a human-vs-human battle see the complete battle UI on their respective turns.

**Requirements:**
1. The `turnReport` (or a parallel per-player report) must be populated with the combat events for *each* human player involved, not only the one whose turn came first in the cycle.
2. After the pass-and-play lock screen is dismissed and a new human player's turn begins, if there are unacknowledged battle events relevant to that player, the **Battle Report** modal must auto-open exactly as it does for the first human player.
3. The 🔥 map marker must appear on contested planets for both human players on their respective turns, not just the first.
4. The **Battle Report** entry must appear in the ⋮ dropdown for both players when they have unresolved combat events to review.
5. Tapping a battle planet must surface the contextual battle card (win or loss) for both players on their respective turns.
6. Once a human player dismisses the Battle Report modal, that player is considered to have acknowledged the battles; the marker and ⋮ entry may clear after dismissal (matching existing first-player behaviour).
7. The fix must handle games with more than two human players (e.g. a 3-human game where two humans fight — the third uninvolved human should not see a spurious Battle Report).
8. AI-vs-human and AI-vs-AI combat handling is unchanged.
9. `npx tsc --noEmit` must pass clean.

**Implementation notes:**
- The root cause is almost certainly that `turnReport` is a single shared array written once per full player cycle, scoped to whatever events are relevant at cycle-end. Consider whether a per-player `turnReport` map (keyed by player id) or a "pending acknowledgement" set in the store is the cleaner fix.
- The lock-screen dismiss handler in `GameScreen` that triggers the battle modal auto-open must read the *active human player's* relevant events, not a single global flag.
- `humanCombatEvents` filter and all downstream display logic (map markers, ⋮ menu gate, contextual tap cards) must consistently use the active human player's id as the perspective, not a cached value from the previous player's turn.
- Review `endTurn` in `gameStore.ts`, `resolveTurn` in `turnEngine.ts`, and the battle-modal / marker logic in `GameScreen.tsx` together before making changes.

**Files to read:** `src/store/gameStore.ts`, `src/game/turnEngine.ts`, `src/game/combatEngine.ts`, `src/screens/GameScreen.tsx`, `src/game/types.ts`, `docs/development/current-state.md`
**Files to modify:** `src/store/gameStore.ts`, `src/screens/GameScreen.tsx` (and possibly `src/game/types.ts` if report structure changes)
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 27 — Vision Alignment Round 18

Product-owner feedback: residual battle UI gaps for the second player in pass-and-play, attacker/defender layout in battle cards, and simplified turn report message formats.

---

### ~~Task 112 — Bug fix: second player sees no battle card on planet tap and no battles in turn report~~ *(completed 2026-05-28)*

**Problem:** After Task 111, the second human player (in pass-and-play) correctly receives the Battle Report auto-open modal at the start of their turn and sees the 🔥 fire marker next to contested planets. However two pieces of battle feedback are still missing for them:

1. **Planet tap battle card:** Tapping on a planet where a battle occurred this turn does not show the contextual `BattleReportCard` modal. The first player sees this card on tap; the second player taps the planet and gets either the standard owned-planet modal (if they won) or nothing (if they lost), with no battle summary.
2. **Turn Report Battles section:** Opening the ⋮ menu and tapping **Report** shows a **Battles** section that is empty for the second player, even though battles did occur involving them.

**Goal:** Both issues resolved. The second player's tap on a battle planet surfaces the same `BattleReportCard` as the first player, and the ⋮ Report → Battles section lists the same combat events that appeared in the auto-open Battle Report modal.

**Requirements:**
1. The logic that decides whether to show the battle card on a planet tap must use `playerBattleArchiveByPlayerId` keyed by the currently active human player's id — not `turnReport` directly or any stale reference from the previous player's perspective.
2. The Report modal's **Battles** section must also source its data from the active human player's battle archive (same archive already used by the auto-open modal and 🔥 markers) rather than from the shared `turnReport` combat events.
3. The contextual battle card on planet tap (win path: above planet modal; loss path: battle-only modal) must work identically for both players.
4. No regression on the first player's battle UI.
5. No regression on the auto-open modal or 🔥 markers (already working for both players per Task 111).
6. `npx tsc --noEmit` must pass clean.

**Implementation notes:**
- `humanCombatEvents` in `GameScreen` already derives from `playerBattleArchiveByPlayerId[localHumanPlayerId]` (introduced in Task 111). Verify that the planet-tap battle card path and the Report modal Battles section both read `humanCombatEvents` (not `turnReport`) as their data source.
- There may be a code path where a battle planet tap checks `turnReport` directly to find the matching combat event rather than going through `humanCombatEvents`; that reference needs updating.
- Similarly, the sectioned Report modal likely partitions `turnReport` into categories — its **Battles** section must be driven by `humanCombatEvents` so the second player's perspective is correctly scoped.

**Files to read:** `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 113 — Battle report card: attacker on left, defender on right, "attacked" centre text~~ *(completed 2026-05-28)*

**Problem:** The current `BattleReportCard` layout shows the two sides of a battle with a "VS" text in the middle and no clear visual hierarchy indicating who attacked whom. The player always sees themselves on one side, but there is no directional framing to the layout.

**Goal:** Redesign the battle card layout so it reads as an attack report with clear attacker/defender roles and directional language.

**Requirements:**
1. The player who initiated the attack (sent the fleet that arrived to start the battle) is always displayed on the **left** side of the card.
2. The player who was defending (owned the planet at the time the attacking fleet arrived) is always displayed on the **right** side of the card.
3. The centre divider text changes from **VS** to **attacked**.
4. **Special case — simultaneous landing:** If both players sent fleets to the same neutral planet and they arrived in the same round (neither is a "defender" of that planet), both players should see it as if *they* attacked the other: from Player A's perspective, A is on the left (attacker) and B is on the right; from Player B's perspective, B is on the left (attacker) and A is on the right.
5. The attacker/defender role must be derived from existing `TurnEvent` combat fields (`attackerId`, `defenderId`, or equivalent flags) — no new engine fields required unless those fields are absent and need adding.
6. All other aspects of the card layout (planet name, troop counts, W/L badge, remaining forces footer) are unchanged.
7. Both the auto-open Battle Report modal and the planet-tap contextual battle card use the same `BattleReportCard` component, so both benefit from this change automatically.
8. `npx tsc --noEmit` must pass clean.

**Implementation notes:**
- Check `TurnEvent` combat variant in `types.ts` for attacker/defender role fields. If the event already stores `attackerId` and `defenderId`, use those to determine left/right positioning relative to the viewing player.
- For the simultaneous-landing case, a combat event where both parties are "attackers" onto a neutral planet may need a flag or can be inferred from the event data (e.g. previous owner was neutral). Confirm how `combatEngine.resolveArrival` emits the event for this scenario.
- The local human player's perspective determines who appears as "You" vs the named opponent — this is already handled; only the left/right positioning and centre text need to change.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`, `src/game/combatEngine.ts`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx` (and possibly `src/game/types.ts` if attacker/defender role fields need adding to the combat event)
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 116 — Bug fix: `build_complete` report notification fires one round too late~~ *(complete 2026-05-29)*

**Problem:** A player builds a factory on round 1. At the start of round 2, the building visually shows as active in the planet modal (correct — `builtOnRound < roundNumber`), but the **Built** section of the ⋮ Report modal does not contain the `build_complete` event. The notification only appears at the start of round 3 — one full round after the building is already producing.

**Root cause:** `runProduction` is called at round wrap with `state.roundNumber` (the pre-increment value). The `build_complete` event fires when `building.builtOnRound === currentRound - 1`. For a building placed in round 1 (`builtOnRound = 1`), this condition is only true when `currentRound = 2`, which is the round 2 wrap. That wrap fires at the end of the last player's turn in round 2, so Player A doesn't see the notification until round 3's report.

**Goal:** Player sees the `build_complete` notification at the start of the round immediately after placing the building (round 2), which is when the building visually becomes active.

**Requirements:**

1. In `src/game/productionEngine.ts`, change the `build_complete` emission condition from:
   ```ts
   if (building.builtOnRound === currentRound - 1) {
   ```
   to:
   ```ts
   if (building.builtOnRound === currentRound) {
   ```
   This fires the event at the round 1 wrap (where `currentRound = 1`), so the player's `playerTurnReportByPlayerId` entry is populated with the event when the round 1 wrap runs, and they see it in the ⋮ Report at the start of round 2.

2. The `countActiveBuildings` check (`builtOnRound < currentRound`) is **not changed** — production logic is unaffected.

3. No other files need changing.

4. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/productionEngine.ts`, `docs/development/current-state.md`
**Files to modify:** `src/game/productionEngine.ts`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 115 — Bug fix: per-player turn report so Report modal shows the correct player's events in pass-and-play~~ *(complete 2026-05-29)*

**Problem:** `turnReport` is a single shared array in the store, always overwritten by the most recent `endTurn` call. In pass-and-play, this means the ⋮ Report modal's **Troop Landings**, **Research**, and **Built** sections display the *other* player's events from their last turn rather than the current player's. When Player A opens their Report, they see Player B's fleet arrivals and buildings (or nothing, if Player B had no relevant events that round). The **Battles** section is already scoped correctly via `playerBattleArchiveByPlayerId` (Task 112), but the other three sections are not.

**Goal:** Each human player sees only their own events in every section of the ⋮ Report modal.

**Requirements:**

1. Add `playerTurnReportByPlayerId: Record<string, TurnEvent[]>` to `GameStore` in `gameStore.ts`, alongside the existing `playerBattleArchiveByPlayerId`. Initialise to `{}` everywhere `playerBattleArchiveByPlayerId` is initialised.

2. Populate it inside `endTurn` immediately after `events` is computed, clearing the outgoing player's entry first (same pattern as `playerBattleArchiveByPlayerId`):
   - `combat` — assign to each human player whose name matches `event.attackerName` or `event.defenderName`.
   - `fleet_arrived` — assign to the human player whose name matches `event.attackerName` (the fleet owner).
   - `research_levelup` — assign to the human player whose name matches `event.playerName`.
   - `build_complete` — assign to the human player who owns the planet: look up the planet by `event.planetName` in `nextState.map.planets`, find the player whose `id === planet.owner`.
   - Include the new archive in the `set(...)` call alongside `playerBattleArchiveByPlayerId`.

3. In `GameScreen.tsx`, derive `playerTurnReport` from `playerTurnReportByPlayerId[localHumanPlayerId ?? ''] ?? []` via a `useGameStore` selector.

4. Replace the three `useMemo` computations that filter `turnReport` for the Report modal sections:
   - `reportResearchEvents` → filter `playerTurnReport` for `research_levelup`
   - `reportTroopLandingEvents` → filter `playerTurnReport` for `fleet_arrived`
   - `reportBuiltEvents` → filter `playerTurnReport` for `build_complete`
   - `humanCombatEvents` (Battles section) is unchanged — still from `playerBattleArchiveByPlayerId`.

5. `isSimultaneousNeutralLanding` still receives the global `turnReport` as its `turnEvents` argument so it can see both players' fleet events for detection. Do not change this.

6. The global `turnReport` field remains in the store; it is still passed as `turnEvents={turnReport}` to `BattleReportCard`.

7. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`, `src/game/types.ts`, `docs/development/current-state.md`
**Files to modify:** `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 114 — Simplify turn report message format for Battles, Troop Landings, and Built sections~~ ✅

**Problem:** The current turn report messages in the ⋮ Report modal are verbose and inconsistently styled across sections, making them harder to scan quickly.

**Goal:** Replace the existing per-section message format with tighter, icon-driven strings as defined below.

**Requirements:**

**Battles section** — each combat event renders as one of:
- When the viewing player attacked: `PLANET NAME: You (X) attacked OPPONENT (Y) — OPPONENT Won (Z remaining)` or `PLANET NAME: You (X) attacked OPPONENT (Y) — You Won (Z remaining)`
- When the viewing player defended: `PLANET NAME: OPPONENT (Y) attacked You (X) — You Won (Z remaining)` or `PLANET NAME: OPPONENT (Y) attacked You (X) — OPPONENT Won (Z remaining)`
- Where X = viewing player's troop count going in, Y = opponent's troop count going in, Z = winner's remaining forces after battle.
- Use "You" for the local human player; use the opponent's actual player name for the other side.

**Troop Landings section** — each fleet-arrived event renders as:
- `PLANET NAME: N 🚀`
- Where N = number of troops that landed, 🚀 = ship emoji icon.

**Built section** — each build-complete event renders as:
- `PLANET NAME: 🏭 xN` for factories, or `PLANET NAME: 🔬 xN` for research labs
- Where N = number of that building type completed this turn on that planet.
- If both a factory and a research lab completed on the same planet this turn, render as two separate lines.

**General requirements:**
5. The Research section format is unchanged.
6. These are display-only changes in `GameScreen`. No store or engine changes.
7. `npx tsc --noEmit` must pass clean.

**Implementation notes:**
- The `formatTurnEvent` helper (or equivalent inline formatting) in `GameScreen` needs updating for the `combat`, `fleet_arrived`, and `build_complete` event types.
- For the Battles section, use the same attacker/defender role determination introduced in Task 113 (or derive it inline here using existing event fields) to decide the `You attacked X` vs `X attacked You` phrasing.
- For Troop Landings and Built, the icon should be rendered as a string emoji in a `<Text>` element (not a separate image component).
- Check if `build_complete` events fire once per building or once per planet-round — if multiple buildings of the same type complete on the same planet in the same turn, they may need grouping into a single `xN` line.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`, `docs/development/current-state.md`
**Files to modify:** `src/screens/GameScreen.tsx`
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 28 — Probabilistic Combat

Replace the current deterministic strength-comparison combat with an iterative coin-flip model where every individual troop counts and research level differences shift the odds rather than guarantee an outcome.

---

### ~~Task 117 — Probabilistic coin-flip combat resolution~~ ✅

**Problem:** Combat currently resolves by comparing two strength numbers: if `attackerStrength > defenderStrength` the attacker wins and keeps the margin. This means any fight with a clear numerical lead has a 100% certain outcome, and the research-level tech multipliers are permanently stubbed at `1.0`. Two armies of equal size always tie in favour of the defender — no variance at all.

**Goal:** Replace the deterministic block with an iterative per-troop coin-flip loop. Each "round" of battle removes exactly one troop from one side based on a weighted random draw. The fight continues until one side reaches 0 troops. Results are still seeded and reproducible but are now probabilistic within a game session rather than purely deterministic.

**Combat probability formula:**

```
techDiff = attacker.techLevel - defender.techLevel
p_attacker_wins_flip = (7 + max(0, techDiff)) / (14 + abs(techDiff))
```

Examples:
- Equal tech (diff = 0): `7/14 = 50%` — fair coin flip
- Attacker +1 level:      `8/15 ≈ 53.3%` — attacker wins ~8 flips for every 7 the defender wins
- Attacker +2 levels:     `9/16 = 56.25%` — 9:7 advantage
- Attacker +3 levels:     `10/17 ≈ 58.8%` — 10:7 advantage
- Defender +1 level:      `7/15 ≈ 46.7%` — defender now has the 8:7 edge per flip

**Requirements:**

1. **RNG threading** — `resolveArrival` gains a new required parameter `rng: () => number` (a seeded pseudo-random function, same `mulberry32` already used by the map generator). The caller (`turnEngine.ts`) derives a per-combat seed from the base game seed combined with the current round number and the fleet's destination planet id (hash or simple arithmetic). `rng` must never be shared across combats in the same turn — each call to `resolveArrival` gets its own fresh RNG instance.

2. **Tech level lookup** — The `players?: Player[]` parameter already exists for name lookups. Extend the attacker lookup to also read `player.techLevel`. Defender tech level comes from `players.find(p => p.id === destination.owner)?.techLevel`. Both default to `0` if the player record is missing (neutral planets already short-circuit before reaching combat; this is a safety fallback only).

3. **Coin-flip loop** — Replace the two `if (attackerStrength > defenderStrength)` / else blocks with:
   ```
   let attackerShips = fleet.shipCount   // local mutable copies
   let defenderShips = destination.shipCount
   while (attackerShips > 0 && defenderShips > 0) {
     if (rng() < p_attacker_wins_flip) {
       defenderShips -= 1
     } else {
       attackerShips -= 1
     }
   }
   ```
   After the loop: if `attackerShips > 0` the attacker wins (`planet.owner = fleet.ownerId`, `planet.shipCount = attackerShips`); otherwise the defender holds (`planet.owner` unchanged, `planet.shipCount = defenderShips`).

4. **Remove the old strength constants** — `DEFENSE_BONUS`, `ATTACKER_TECH_MULTIPLIER`, and `DEFENDER_TECH_MULTIPLIER` are no longer used. Remove them from `combatEngine.ts` exports. Audit all import sites and remove any references.

5. **Event fields unchanged** — The `combat` `TurnEvent` already carries `attackerShipsBefore`, `defenderShipsBefore`, `attackerLost`, `defenderLost`, `remainingShips`, `attackerWon`. Populate them from the post-loop values exactly as today. The `Math.max(1, ...)` garrison floor on `remainingShips` is no longer needed (the loop always leaves at least 1 troop for the winner since it stops as soon as one side hits exactly 0) — remove it, or keep as a safety guard; both are correct.

6. **No UI changes** — `GameScreen`, `BattleReportCard`, and the turn report display are all driven by the same `TurnEvent` fields and require no changes.

7. **`npx tsc --noEmit` must pass clean.**

**Files to read:** `src/game/combatEngine.ts`, `src/game/turnEngine.ts`, `src/game/types.ts`, `src/game/mapGenerator.ts` (for `mulberry32` reference), `docs/systems/combat.md`  
**Files to modify:** `src/game/combatEngine.ts`, `src/game/turnEngine.ts`  
**Docs to update:** `docs/systems/combat.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 118 — Update combat system documentation~~ ✅

**Goal:** Rewrite `docs/systems/combat.md` to describe the new probabilistic combat model, replacing all references to the deterministic strength-comparison formula and the now-removed constants.

**Requirements:**

1. Update the **Combat Formula** section to document the coin-flip loop and the `(7 + max(0, techDiff)) / (14 + |techDiff|)` probability formula with a table of example tech-diff → win-probability values.
2. Remove the constants table (`DEFENSE_BONUS`, `ATTACKER_TECH_MULTIPLIER`, `DEFENDER_TECH_MULTIPLIER`) and replace with a note that these have been removed as of Task 117.
3. Update the **Resolution** section to describe attacker-wins and defender-holds in terms of who reaches 0 troops first rather than strength comparison.
4. Add a note that results are seeded and reproducible within a game session (same seed + same state = same battle outcome) but are non-deterministic across different seeds.
5. Append a changelog entry: `2026-05-29: Task 117 — deterministic strength comparison replaced with iterative coin-flip loop; tech-level advantage shifts per-flip win probability via (7+d)/(14+|d|) formula; DEFENSE_BONUS / tech multiplier constants removed.`
6. Do not delete historical changelog entries — mark the old formula description with ~~strikethrough~~.

**Files to read:** `docs/systems/combat.md`  
**Files to modify:** `docs/systems/combat.md`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 29 — Map Setup & Research Redesign

These tasks update two core configuration systems to match the intended design vision: player-count-driven planet counts with named size options, and a precise hand-tuned research progression curve.

---

### ~~Task 119 — Map size selection with player-count-driven planet count~~ ✅

*(completed 2026-05-29 — see docs/tasks/completed.md)*

**Problem:** The current setup form lets players pick Small / Medium / Large but hardcodes planet counts (16, 32, 54) regardless of how many players are in the game. A 2-player large map and an 8-player large map should feel very different — more players means more planets to fight over, scaled to keep the map from feeling empty or cramped.

**Goal:** Replace the fixed planet counts with a formula driven by both map size tier and player count. The UI continues to show three named map size options; planet count is derived automatically.

**Planet count formula:**

| Size   | 2 players | Per extra player | Example (4P) | Example (8P) |
|--------|-----------|------------------|--------------|--------------|
| Large  | 35        | +25              | 85           | 185          |
| Medium | 30        | +15              | 60           | 120          |
| Small  | 20        | +10              | 40           | 80           |

Formula in code: `planetCount = BASE[size] + (playerCount - 2) * PER_EXTRA_PLAYER[size]`

**Map grid dimensions** must also scale with the computed planet count so that placement never fails. Use the formula: `gridSide = Math.ceil(Math.sqrt(planetCount * 30))` (gives ~30 cells² of breathing room per planet with `MIN_PLANET_DISTANCE = 4`). Apply this to both width and height (square maps).

**Requirements:**

1. In `HomeScreen`, replace the three hardcoded map preset objects (`{ label, width, height, planetCount }`) with a computed function or derived value that takes the currently selected `mapSize` (Small / Medium / Large) and the total `playerCount` (sum of all player slots) and returns `{ planetCount, width, height }`.
2. The `mapSize` field type should be `'small' | 'medium' | 'large'` (already exists as `GameConfig.mapSize`). Verify this is set correctly on `GameConfig` when the game starts.
3. The displayed map size options (Small / Medium / Large) in the HomeScreen setup UI remain as before — the user still taps one of the three labels. No new UI is needed.
4. Remove the now-unused hardcoded preset planet counts. The grid dimensions must derive from the dynamic `planetCount` using the formula above, so they also update automatically when player count changes.
5. `GameConfig` (or wherever `planetCount`, `mapWidth`, `mapHeight` are passed to `generateMap`) must receive the computed values so the actual generator uses the correct count.
6. Ensure the TypeScript types all remain consistent (`MapConfig.planetCount` is still `number`).
7. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/screens/HomeScreen.tsx`, `src/store/gameStore.ts`, `src/game/types.ts`, `src/game/mapGenerator.ts`, `docs/systems/map-generation.md`
**Files to modify:** `src/screens/HomeScreen.tsx`, `src/store/gameStore.ts` (if `startNewGame` computes dimensions)
**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 120 — Replace research threshold formula with exact hand-tuned lookup table~~ ✅

*(completed 2026-05-29 — see docs/tasks/completed.md)*

**Problem:** The current research threshold uses a generic exponential formula (`Math.round(10 * Math.pow(1.5, level))`), which produces values that don't match the intended progression. The desired thresholds are hand-tuned to feel right across 15 levels and differ meaningfully from the formula output (e.g. formula gives lvl 2 → 23, lvl 3 → 34; desired is lvl 2 → 23, lvl 3 → 38).

**Goal:** Replace the formula with a constant lookup table of exact threshold values, one entry per tech level (0–14), representing the research points needed to advance *from* that level to the next.

**Exact threshold values (index = current tech level):**

| From level | Points required |
|------------|-----------------|
| 0 → 1      | 10              |
| 1 → 2      | 23              |
| 2 → 3      | 38              |
| 3 → 4      | 58              |
| 4 → 5      | 82              |
| 5 → 6      | 113             |
| 6 → 7      | 151             |
| 7 → 8      | 198             |
| 8 → 9      | 258             |
| 9 → 10     | 333             |
| 10 → 11    | 426             |
| 11 → 12    | 542             |
| 12 → 13    | 688             |
| 13 → 14    | 869             |
| 14 → 15    | 1097            |

**Requirements:**

1. In `productionEngine.ts`, replace the `researchThreshold` function body with a `RESEARCH_THRESHOLDS` constant array of 15 values (the table above, in order).
2. The `researchThreshold(level: number): number` exported function continues to exist and return the correct value for a given level — it now simply returns `RESEARCH_THRESHOLDS[level]` (with a safe fallback of `Infinity` or the last value if `level >= MAX_TECH_LEVEL` so the level-up loop terminates correctly).
3. The level-up loop in `runProduction` is unchanged in structure — it still calls `researchThreshold(player.techLevel)` each iteration.
4. `MAX_TECH_LEVEL` remains `15`.
5. The R&D modal in `GameScreen` (which already displays threshold and progress) updates automatically since it calls the same exported `researchThreshold` function.
6. Export `RESEARCH_THRESHOLDS` array from `productionEngine.ts` in case it is needed in UI or tests.
7. Update `docs/systems/production.md` to replace the formula description with the lookup table, and update the "early levels" example sequence.
8. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/productionEngine.ts`, `docs/systems/production.md`, `docs/development/current-state.md`
**Files to modify:** `src/game/productionEngine.ts`
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 30 — Galaxy Map Shape Variety

These tasks address the root cause of planets distributing into square/circle patterns at larger game sizes, and add genuine galaxy shape variety.

---

### ~~Task 121 — Diagnose and fix map generator boundary-fill at large planet counts~~

*(completed 2026-05-29 — see docs/tasks/completed.md)*

**Problem (root cause):**

The current `growthPosition` algorithm uses a hard rectangular boundary (`paddedBounds`). Out-of-bounds candidates are silently rejected and retried. This appears organic at small scales but breaks down at large scales for two compounding reasons:

1. **Grid too dense for organic shapes.** `computeMapDimensions` uses `gridSide = Math.ceil(Math.sqrt(planetCount × 30))`, which gives each planet roughly 30 grid cells² of space. With `MIN_PLANET_DISTANCE = 4`, each planet's exclusion circle has area ≈ π×4 ≈ 12.6 cells². This means ~42% of the grid is already "occupied" by exclusion zones before any shape bias can take effect. Organic algorithms (arms, clusters with voids) typically need the packing fraction to be **below ~15–20%** to produce non-uniform shapes — they need space for deliberate voids and sparse regions.

2. **Hard walls act like a container.** As planet count grows and the growth cluster approaches the grid boundary, all outward-facing growth attempts fail. The algorithm retries by selecting new parents at random — but the only parents that reliably produce valid candidates are those in the interior. The cluster progressively fills inward from the walls. Given enough planets, this produces a filled square (at small ratios, a filled circle). The organic growth model's parent-chaining logic cannot overcome this because it has nowhere else to go.

**Evidence:** The shape degradation is specifically noticeable at Large map sizes (e.g. Large 4P = 85 planets, grid 52×52 = 2704 cells — packing fraction ~42%; Large 8P = 185 planets, grid 75×75 = 5625 cells — packing fraction ~43%). At Small 2P (20 planets, grid 25×25 = 625 cells, packing fraction ~40%) the absolute planet count is too low for the boundary fill to fully manifest so the shape looks more varied.

**What others do:**

Space 4X games and game-dev practitioners consistently address this via one or more of:
- Separating the "canvas size" from the "grid boundary" — grow on a large unconstrained virtual space, then fit coordinates to the game grid after placement (unbounded canvas + bounding-box trim)
- Reducing the packing fraction to 10–20% by making the grid significantly larger than the minimum required by planet count
- Using explicit galaxy-shape templates that direct placement to specific regions, leaving defined voids (see Task 122)

References: [Procedural Generation For Dummies: Galaxies](https://martindevans.me/game-development/2016/01/14/Procedural-Generation-For-Dummies-Galaxies/), [Itinerant Games 2D procedural galaxy](https://itinerantgames.tumblr.com/post/78592276402/a-2d-procedural-galaxy-with-c), [Macrocosm GalaxyGenerator.cs](https://github.com/dshook/Macrocosm/blob/main/Assets/Scripts/7/GalaxyGenerator.cs).

**Fix — Part A: Expand the grid-to-planet ratio**

Change `computeMapDimensions` in `HomeScreen.tsx`:

```
// Before
const gridSide = Math.ceil(Math.sqrt(planetCount * 30));

// After
const gridSide = Math.ceil(Math.sqrt(planetCount * 90));
```

This triples the available area per planet (packing fraction drops from ~42% to ~14%), giving the growth model enough empty space to produce organic shapes with natural voids. The existing `CELL_SIZE` and visual rendering are unaffected — only the coordinate space gets larger.

**Fix — Part B: Soft-bound growth (allow temporary out-of-bounds, clamp after)**

Instead of immediately discarding any candidate that falls outside `paddedBounds`, allow the growth model to generate candidates on a virtual canvas 1.5× larger than the target grid, then after all planets are placed, normalize positions into the actual grid dimensions (scale + translate so the bounding box of placed planets maps to the padded interior). This way the shape is determined by the growth dynamics, not by the container walls.

Implementation outline in `mapGenerator.ts`:
1. Run `growthPosition` against a virtual canvas of `(width × 1.5, height × 1.5)`, still rejecting `MIN_PLANET_DISTANCE` violations.
2. After all planets are placed, compute `minX, maxX, minY, maxY` of placed positions.
3. Rescale each position: `x' = round(PLANET_EDGE_PADDING + (x - minX) / (maxX - minX) × (width - 2 × PLANET_EDGE_PADDING))` (same for y). Use the actual `width` and `height` from `MapConfig`.
4. After rescaling, re-run a duplicate-position check (rescaling can collapse close points) and remove duplicates (accept fewer planets rather than throwing).
5. Since positions are rescaled to fit the grid, `computeClickDistance` and all movement math remain valid.

**Requirements:**

1. Change `gridSide` multiplier in `computeMapDimensions` from `30` to `90` (`HomeScreen.tsx`).
2. Implement soft-bound growth in `mapGenerator.ts` as described in Part B above.
3. The `mapGenerator` `generateMap` function signature, return type, and all downstream consumers remain unchanged.
4. `MIN_PLANET_DISTANCE = 4` and `MAX_PLACEMENT_ATTEMPTS_PER_PLANET = 2000` unchanged.
5. The `spawnPlacer` placement and all game logic downstream of `generateMap` are unaffected.
6. `npx tsc --noEmit` must pass clean.
7. Manually verify on Small/Medium/Large at 2P and 8P: shapes should look noticeably more irregular and should not resemble a filled square or circle.

**Files to read:** `src/game/mapGenerator.ts`, `src/screens/HomeScreen.tsx`, `docs/systems/map-generation.md`, `docs/development/current-state.md`
**Files to modify:** `src/game/mapGenerator.ts`, `src/screens/HomeScreen.tsx`
**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 122 — Galaxy shape templates: give every game a distinct galaxy archetype~~

*(completed 2026-05-29 — see docs/tasks/completed.md)*

**Problem:**

Even after the density/boundary fix in Task 121, every game produces a variant of the same general shape: a single organic blob. Real 4X games (Master of Orion, Stellaris, Endless Space) let players choose — or randomise — a **galaxy type**. Each type has fundamentally different topology that changes the strategic feel of the game: some galaxies have long choke-point arms, others are evenly spread, others have a dense core that is hard to control. Without this variety, large games all feel spatially similar regardless of seed.

**What others do:**

- **Master of Orion / Stellaris**: Explicit galaxy shape selector — spiral, elliptical, ring, cluster, irregular. Each uses a different placement algorithm.
- **Macrocosm** ([source](https://github.com/dshook/Macrocosm/blob/main/Assets/Scripts/7/GalaxyGenerator.cs)): Generates arm spines with Gaussian-spread star clusters along each arm; arm count and spread are randomised per game.
- **CasualGodComplex** ([source](https://github.com/martindevans/CasualGodComplex/blob/master/CasualGodComplex/Galaxies/Spiral.cs)): Arms as sequences of spherical clusters along a spline, with a swirl rotation applied to all stars post-placement.
- **Martin Devans' Procedural Generation blog** ([article](https://martindevans.me/game-development/2016/01/14/Procedural-Generation-For-Dummies-Galaxies/)): Advocates generating on an unbounded canvas and applying galaxy-type-specific shape modifiers (swirl, bulge, ring) as post-placement transforms.
- **Itinerant Games** ([article](https://itinerantgames.tumblr.com/post/78592276402/a-2d-procedural-galaxy-with-c)): Spiral arms via polar-coordinate arm offset with squaring to create denser ridges; distance squaring to produce denser core vs sparse edge.

**Proposed galaxy shapes (4 archetypes, chosen per game via seeded RNG):**

| Shape | Description | Strategic flavour |
|-------|-------------|-------------------|
| `scattered` | Multiple loose independent clusters (2–4 seeds) with deliberate void zones between them; current organic growth runs per cluster | Long-range fleets essential; choke points between clusters |
| `arms` | 2–4 arms radiate outward from a central dense zone; planets placed along arm spines with Gaussian lateral spread | Chokepoint-heavy; controlling arm roots is decisive |
| `dense_core` | Gaussian radial density — many planets near the map centre, thinning toward the edges; no hard cutoff | Rich centre battles; edge planets are isolated outposts |
| `ring` | Planets distributed in an annular band (no dense centre); inner void + outer void with most planets in a ring | High connectivity along the ring; crossing the void is costly |

**Implementation outline (all in `mapGenerator.ts`):**

1. Add `galaxyShape?: 'scattered' | 'arms' | 'dense_core' | 'ring'` to `MapConfig` (optional — if absent, the generator picks one at random using the seed).
2. In `generateMap`, use the seeded RNG to pick a shape type if not provided, then dispatch to a shape-specific placement function:
   - `placePlanetsScattered(rng, config)`: runs 2–4 independent organic-growth clusters; each cluster seeds from a randomly spaced position; growth attaches to that cluster's own placed planets only; inter-cluster min distance = `MIN_PLANET_DISTANCE` as usual.
   - `placePlanetsArms(rng, config)`: picks 2–4 arm count; for each arm, generates a spine as N evenly-spaced points from center outward at that arm's angle; each planet candidate is placed near a random spine point with Gaussian lateral offset `σ ≈ 3`; rejects if within `MIN_PLANET_DISTANCE` of any placed planet.
   - `placePlanetsDenseCore(rng, config)`: samples candidate positions using a radial density function — `radius = sqrt(rng()) × maxRadius` (square-root inversion gives uniform area density but clustered toward center); adds random angle; rejects out-of-bounds and too-close candidates.
   - `placePlanetsRing(rng, config)`: samples in polar coordinates with `radius = innerRadius + rng() × ringWidth` (innerRadius ≈ 30% of half-grid, ringWidth ≈ 25%); random angle; rejects too-close candidates.
3. All placement functions share `isFarEnough` and the same `MAX_PLACEMENT_ATTEMPTS_PER_PLANET` retry logic.
4. After placement, apply the Part B rescaling from Task 121 (normalize bounding box to padded grid) to all shape types.
5. The game's `GameConfig` and `GameState` do **not** need to store `galaxyShape` (it is derived from the seed deterministically) unless we later want to expose it to the UI.

**Requirements:**

1. `GalaxyShape` type and optional `MapConfig.galaxyShape` field added to `types.ts` or top of `mapGenerator.ts`.
2. All four shape placement functions implemented in `mapGenerator.ts`.
3. Default (no shape specified) randomly picks a shape using the existing seeded RNG so the same seed always produces the same shape.
4. `generateMap` return type and all downstream consumers unchanged.
5. `spawnPlacer` works correctly for all shapes (it only reads `planets[].position` and `map.width/height` — no changes needed).
6. HomeScreen does not need a galaxy shape selector for now (shape is part of the seed's surprise); this can be added later as a separate UI task.
7. `npx tsc --noEmit` must pass clean.
8. Manually test each shape at Small 2P and Large 6P to confirm the four types look visually distinct.

**Files to read:** `src/game/mapGenerator.ts`, `src/game/types.ts`, `src/screens/HomeScreen.tsx`, `docs/systems/map-generation.md`
**Files to modify:** `src/game/mapGenerator.ts`, `src/game/types.ts`
**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 31 — Research Fixes

Two targeted fixes to the research system: a cosmetic label correction and a fundamental point-carry-over bug.

---

### ~~Task 123 — Turn report research message uses "You" instead of player name~~ *(completed 2026-05-29 — see docs/tasks/completed.md)*

**Problem:**

The turn report currently says something like "Daniel reached Tech Level 1" (the player's name). Per design intent it should say "You reached Tech Level 1" since the report is always shown to the player whose events are being reported — the use of the second person is cleaner and consistent with the rest of the UI.

**Requirements:**

1. In `formatTurnEvent` (or wherever the `research_levelup` event is rendered as a string), replace the player name with `"You"` for `research_levelup` events shown in the local human player's report.
2. The ⋮ Report modal Research section and the auto-open Battle Report / Research section must both use this wording.
3. If the string is also used in an AI context where a third-person form would be needed, gate on `event.playerName === localHumanPlayerName` (or equivalent) and keep the name for non-human events.
4. No engine or store changes required — display layer only.
5. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/screens/GameScreen.tsx`, `src/game/types.ts`, `src/store/gameStore.ts`  
**Files to modify:** `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 124 — Research points carry over after level-up (incremental cost, not reset-to-zero)~~ *(completed 2026-05-29 — see docs/tasks/completed.md)*

**Problem:**

When a player reaches Tech Level 1 (at 10 research points), their research point counter resets to 0. They must then accumulate the full threshold for level 2 from scratch. The intended behaviour is that research points are **never reset** — they keep accumulating. The `RESEARCH_THRESHOLDS` array already holds cumulative totals (`[10, 23, 38, 58, …]`), so the level-up check should simply be: "if `player.researchPoints >= RESEARCH_THRESHOLDS[player.techLevel]` then increment tech level" — no point subtraction.

Under the correct behaviour:
- Reaching Level 1 costs 10 total points.
- Reaching Level 2 costs 13 **additional** points (23 total).
- Reaching Level 3 costs 15 additional points (38 total).
- The player never "loses" previously earned research points; the threshold simply advances.

**Requirements:**

1. In `runProduction` (`productionEngine.ts`), remove the line that subtracts the threshold from `researchPoints` after a level-up (i.e., do **not** do `player.researchPoints -= threshold` or `player.researchPoints = 0` on level-up).
2. The level-up `while` loop condition must check `player.researchPoints >= RESEARCH_THRESHOLDS[player.techLevel]` (cumulative check against total accumulated points), not a delta from the last level.
3. `RESEARCH_THRESHOLDS` values remain unchanged (`[10, 23, 38, 58, 82, 113, 151, 198, 258, 333, 426, 542, 688, 869, 1097]`).
4. The R&D modal's "turns to next level" projection must reflect the remaining points needed (`RESEARCH_THRESHOLDS[techLevel] - researchPoints`) and remain accurate.
5. Verify: at 10 RP a player reaches Level 1; 13 more RP (23 total) reaches Level 2; 15 more (38 total) reaches Level 3.
6. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/productionEngine.ts`, `src/screens/GameScreen.tsx` (R&D modal projection), `docs/systems/production.md`  
**Files to modify:** `src/game/productionEngine.ts`, `src/screens/GameScreen.tsx` (if projection calculation is wrong)  
**Docs to update:** `docs/systems/production.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

## Phase 32 — Player Elimination & Home Planet Conquest

These tasks implement the full home-planet-capture elimination system: what happens to the conquering player's report, what happens to the eliminated player, how their planets are handled, how the game ends, and how the knockout is communicated.

---

### ~~Task 125 — Home planet conquest battle report UI (blue highlight + "took their home planet" message)~~ *(completed 2026-05-29 — see docs/tasks/completed.md)*

**Problem:**

When Player A captures Player B's **home planet**, the event currently appears as an ordinary combat result in the battle report. Per design intent it is a major game moment and must be visually distinguished:

- The home-planet conquest card appears **at the top** of Player A's battle report.
- The card uses a **blue** background/accent (not the standard green win colour).
- A prominent label above the card reads **"You took their home planet!"** (or similar — see requirements).

**Requirements:**

1. Add a boolean field `isHomePlanetConquest: boolean` (default `false`) to the `combat` variant of `TurnEvent` in `types.ts`.
2. In `resolveArrival` (`combatEngine.ts`), detect when the conquered planet is the defending player's `homePlanetId` and set `isHomePlanetConquest: true` on the emitted combat event.
3. In `GameScreen`, when rendering the battle report modal:
   - Sort/pin home-planet-conquest events to the top of the battle card list.
   - Render a blue banner/label above the card: **"You took their home planet!"**
   - Apply a blue tint/border to that card (e.g. `#2255cc` background accent) instead of the standard victory green.
4. The change is display-only for this task — elimination mechanics are in Task 126.
5. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/types.ts`, `src/game/combatEngine.ts`, `src/screens/GameScreen.tsx`, `src/store/gameStore.ts`  
**Files to modify:** `src/game/types.ts`, `src/game/combatEngine.ts`, `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/systems/combat.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

---

### ~~Task 126 — Home planet conquest elimination mechanics~~ *(completed 2026-05-29 — see docs/tasks/completed.md)*

~~**Problem:**~~

Capturing a player's home planet must trigger full elimination of that player. This involves:

1. **Eliminated player's planets forfeited** — all planets previously owned by the eliminated player become unowned (no owner, but buildings remain intact). Their troop count is set to 0. Any player who lands on such a planet next claims it (along with all existing buildings).
2. **Eliminated player skipped** — the eliminated player is removed from the turn order. They never take another turn.
3. **Eliminated player's knockout message** — when the eliminated player opens their pass-and-play turn (i.e., the lock screen is dismissed for them), the battle report auto-opens showing the home-planet loss at the top, with a large **"You have been knocked out of the game!"** banner. When they close the report, control immediately passes to the next active player (no End Turn button shown for the eliminated player; their turn is over automatically).
4. **Last-player-standing win condition** — if eliminating Player B leaves only one active (non-eliminated) player, the game ends immediately after Player A's turn resolves. The winning player sees a **victory modal** (distinct from the existing end-game banner if any). When they dismiss the modal, the game is over and navigation returns to the Home Screen (same as "New Game" flow).
5. **Existing non-home-planet captures** — these continue to work exactly as before; no change to ordinary combat.

**Detailed requirements:**

1. Add `eliminated: boolean` (default `false`) to the `Player` type in `types.ts`. Add `homePlanetId: string` if not already present (check current type — it may exist).
2. In `resolveArrival` (`combatEngine.ts`), after a successful capture, check: `if (attackedPlanet.id === defender.homePlanetId)`:
   a. Set `defender.eliminated = true`.
   b. Set all planets owned by `defender` (other than the just-captured one) to `owner: null`, `shipCount: 0`, buildings unchanged.
   c. Remove all in-transit fleets **owned by** the eliminated player (they can no longer receive them).
3. In `turnEngine.ts` / `resolveTurn`, skip eliminated players when cycling the turn order. Only non-eliminated players receive turns.
4. In `gameStore.ts` `endTurn`:
   a. After resolving the full cycle, check if exactly one non-eliminated human or AI player remains. If so, set a `gameOver: true` flag and record `winnerId`.
   b. In pass-and-play, when the next turn belongs to an eliminated human player: auto-open their knockout battle report (sources from `playerBattleArchiveByPlayerId` which already has their home-planet combat event from this cycle), display the **"You have been knocked out!"** banner at the top, and on close advance turn to the next active player without giving the eliminated player an End Turn opportunity.
5. In `GameScreen`:
   a. When `gameOver` is true and `winnerId === localHumanPlayerId`, show a **Victory** modal: "You are the last commander standing! The galaxy is yours." Dismiss → navigate to Home Screen.
   b. For an eliminated human player whose turn it technically is in pass-and-play: show the knockout battle report (auto-open, blue home-planet card at top, large red/orange **"You have been knocked out of the game!"** banner), then on close auto-advance without showing the End Turn button.
6. `npx tsc --noEmit` must pass clean.

**Files to read:** `src/game/types.ts`, `src/game/combatEngine.ts`, `src/game/turnEngine.ts`, `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`, `docs/systems/combat.md`, `docs/systems/turn-engine.md`  
**Files to modify:** `src/game/types.ts`, `src/game/combatEngine.ts`, `src/game/turnEngine.ts`, `src/store/gameStore.ts`, `src/screens/GameScreen.tsx`  
**Docs to update:** `docs/systems/combat.md`, `docs/systems/turn-engine.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`, `docs/development/decisions.md`

---

## Phase 33 — Vision Alignment Round 19

Product-owner feedback: human starting planets should feel spread out and edge-adjacent but not obviously pinned to corners; AI placement uses the same zone model but without the edge bias. This replaces the existing scored-random search.

---

### ~~Task 127 — Zone-based starting planet placement (human vs AI)~~ *(completed 2026-05-29)*

**Problem:**

The current `spawnPlacer` selects home planets by running 200 random candidate assignments and picking the highest-scoring one (weighted on pairwise distance, nearby-planet variance, and a center-bias penalty). This produces technically fair results but does not match the intended design feel:

1. Human players should start **near the edges of the map** — spread around the perimeter — so that the map centre is open contested territory. But they must **not** start at the absolute corners or outermost cells, because that makes the human's location trivially obvious.
2. Placement should feel **random within a region**, not always at the same scored optimum. The approach: divide the map into several non-overlapping **zones**, pick a random zone for each player, then pick a random neutral planet inside that zone.
3. **Humans and AIs use different zone pools.** Humans draw only from edge-adjacent zones (near a side of the map). AIs draw from interior zones, and after all humans are placed, the human zones are added to the AI pool too — so AIs can end up anywhere on the map.
4. **Order matters:** place all humans first, then place AIs.
5. The assigned planet should be called the player's **starting planet** in code and docs (not "home planet chosen" or other ambiguous phrasing — note: `isHomePlanet`, `homePlanetId`, and `homePlanetClassByPlayerId` field names in the data model stay as-is, this is a docs/UI copy convention only).

**Goal:**

Replace the 200-candidate scoring algorithm in `spawnPlacer.ts` with a zone-based, seeded-random placement pipeline. The `SpawnPlacementResult` return shape and all downstream behaviour (home-planet class, gold, building slots, `isHomePlanet` flag, `shipCount: 5`) must remain identical.

**Zone geometry:**

Zones are defined as non-overlapping rectangular regions of the grid using `{ minX, maxX, minY, maxY }` bounds. A planet belongs to a zone if its grid `(x, y)` position falls within those bounds (inclusive).

**Edge zones** (human-eligible): rectangular bands running along each side of the map, defined by:
- Inner margin: start 3 grid cells inside the padded edge (so spawns are never at the absolute corner or boundary).
- Depth: extend inward from that margin by approximately 25–30% of the shorter map dimension.
- One band per side: top, bottom, left, right — giving 4 edge zones by default. Corner overlaps between adjacent bands are acceptable; do not add separate corner zones.
- A zone is only useful if it contains at least one neutral planet; skip empty zones during placement.

**Interior zones** (AI-eligible before human zones are merged in): the remaining central area not covered by any edge zone. Split it into a 2×2 grid of quadrants (4 interior zones). Again, only zones containing at least one neutral planet are usable.

After all humans are placed, add all 4 edge zones to the AI's eligible pool so AI players can end up anywhere.

**Placement algorithm:**

1. Generate all edge zones and interior zones from the map grid.
2. **Phase 1 — humans:** shuffle the edge zone list with the seeded RNG. For each human player in order, pick the next unused edge zone and select a random neutral planet inside it. After all humans are tentatively assigned, verify that every pair of human starting planets is at least the map-size minimum apart (see table below). If the check fails, re-shuffle and retry — up to **50 attempts**. If all 50 fail, log a `console.warn` and use the last attempted assignment (do not throw).
3. **Phase 2 — AIs:** eligible pool = interior zones + all 4 edge zones (including zones already used by humans). Shuffle the pool. For each AI player in order, pick the next unused zone and select a random neutral planet inside it. No minimum-separation check for AI.
4. Mark each chosen planet with `isHomePlanet: true`, assign owner, assign seeded class A–G, apply `buildingSlots` and starting gold from `HOME_PLANET_CLASS_CONFIG` — same as today.

**Minimum human separation:**

| Map size | Min click distance between any two human starting planets |
|----------|----------------------------------------------------------|
| Small    | 30 clicks                                               |
| Medium   | 40 clicks                                               |
| Large    | 50 clicks                                               |

Click distance is the Euclidean distance in grid coordinates — same formula used by `computeClickDistance` in `movementEngine.ts`.

**API changes required:**

- `placeSpawns` currently takes `(map, playerIds, rng)`. Replace with a single options object:
  ```typescript
  export interface PlaceSpawnsOptions {
    map: GameMap;
    humanPlayerIds: string[];
    aiPlayerIds: string[];
    mapSize: MapSize;
    rng: () => number;
  }
  export function placeSpawns(options: PlaceSpawnsOptions): SpawnPlacementResult
  ```
- `MapSize` (`'small' | 'medium' | 'large'`) must be a shared type exported from `src/game/types.ts` (not a local type in `HomeScreen.tsx`). `HomeScreen.tsx` imports it instead of re-declaring it.
- Add `mapSize: MapSize` to `GameConfig` in `gameStore.ts`.
- `HomeScreen` passes `mapSize` to `startNewGame`.
- `gameStore.startNewGame` derives `humanPlayerIds` and `aiPlayerIds` from `config.playerSlots` (by `slot.type`) and passes them into `placeSpawns`.

**Requirements:**

1. `MapSize` exported from `src/game/types.ts`; `HomeScreen.tsx` imports it instead of defining its own local type.
2. `mapSize: MapSize` added to `GameConfig`; `HomeScreen` passes it through; `gameStore.startNewGame` reads it.
3. `placeSpawns` signature changed to the options-object form above.
4. Edge zones and interior zones generated from the map grid as described — 4 edge bands + 4 interior quadrants — using concrete `{ minX, maxX, minY, maxY }` bounds.
5. Humans placed first (edge zones only, min-separation enforced, 50-attempt retry with `console.warn` on failure). AIs placed second (full zone pool).
6. The old 200-candidate weighted scoring (`SCORE_WEIGHT_DISTANCE`, `SCORE_WEIGHT_VARIANCE`, `SCORE_WEIGHT_CENTER`) is **removed entirely**.
7. `SpawnPlacementResult` shape (`map`, `homePlanetClassByPlayerId`) unchanged. Home-planet class, gold, building slots, `shipCount: 5`, `isHomePlanet: true`, and `owner` assignment all work exactly as before.
8. Result is fully deterministic: same seed + same config → same placement.
9. `npx tsc --noEmit` passes clean.

**Manual verification:**
- 2-human pass-and-play, Small/Medium/Large: both players start near different sides of the map but not at an obvious corner; restarting with the same slots but a different time (→ different seed) produces different start locations.
- 4-player mixed human+AI: humans near edges, AIs can be anywhere including the centre.
- All-AI game: AIs spawn across the map including central regions.
- Solo-vs-AI game: human starts near an edge, AI may start anywhere.

**Files to read:** `src/game/spawnPlacer.ts`, `src/store/gameStore.ts`, `src/screens/HomeScreen.tsx`, `src/game/types.ts`, `src/game/movementEngine.ts`, `docs/systems/spawn-placement.md`, `docs/development/current-state.md`  
**Files to modify:** `src/game/spawnPlacer.ts`, `src/game/types.ts`, `src/store/gameStore.ts`, `src/screens/HomeScreen.tsx`  
**Docs to update:** `docs/systems/spawn-placement.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`, `docs/development/decisions.md`

---

## Phase 4 — Async Multiplayer & Notifications

These tasks require backend infrastructure (Laravel API) and cannot be completed in local-only mode.

---

### Task 29 — Push notifications for turn alerts

When playing async multiplayer across devices, the player whose turn it is receives a push notification.

**Requirements:**
- Integrate Expo Push Notifications (`expo-notifications`)
- Notification sent when: it becomes a player's turn, a fleet arrives and combat resolves against them, a player is eliminated
- Notification includes game name and context
- Tapping the notification opens the correct game directly

**Files to create/change:** notification service module, `src/store/gameStore.ts`  
**Docs to update:** `docs/systems/notifications.md`

---

### Task 30 — Backend persistence and async game state sync

Persist game state to the Laravel backend so players on different devices share the same game.

**Requirements:**
- Each game stored server-side with full `GameState`
- Turn submission endpoint: player sends their queued actions; server validates, resolves, stores new state
- Turn privacy enforcement: server only returns the subset of game state visible to the requesting player (fog of war — Task 14)
- Player auth via Sanctum (register / login)
- Clients poll or receive push when it is their turn

**Files to create:** Laravel backend (new repo or `backend/` folder)  
**Docs to update:** `docs/systems/backend-api.md`, `docs/systems/multiplayer.md`

---

## Known Limitations Carried Over from Task 10 MVP

~~**One fleet per human turn:**~~ Fixed in Task 27  
~~**No in-transit fleet route lines:**~~ To be fixed in Task 25  

---

## Changelog
- 2026-06-01: Phase 38 expanded — Task 201 added (async multiplayer: restore `playerBattleArchiveByPlayerId` in `loadAsyncGame`); phase renamed to cover all modes.
- 2026-06-01: Phase 40 complete (Tasks 198–200) — true multi-way combat for 3+ players at the same planet: melee algorithm and event type (`combatEngine`), engine wiring (`turnEngine`), and `MultiwayBattleReportCard` UI.
- 2026-05-29: ~~Task 127 complete~~ — zone-based starting planet placement in `spawnPlacer`: edge bands for humans (min separation 30/40/50 by map size), interior+edge pool for AIs; `PlaceSpawnsOptions` API; `MapSize` on `GameConfig`; scored-random search removed; `npx tsc --noEmit` passes clean.
- 2026-05-29: Phase 33 added (Task 127) — zone-based starting planet placement: edge-adjacent non-overlapping zones for humans (random planet within zone, min separation 30/40/50 clicks by map size), broader zone pool for AI after humans placed, terminology **starting planet**.
- 2026-05-29: ~~Task 126 complete~~ — home-planet conquest elimination: `combatEngine` forfeits planets (neutral, 0 troops, buildings intact), removes in-transit fleets, sets `isEliminated`; pass-and-play knockout battle report + `acknowledgeKnockout`; victory/game-over modals; `npx tsc --noEmit` passes clean.
- 2026-05-29: ~~Task 125 complete~~ — combat `TurnEvent` adds optional `isHomePlanetConquest`; `resolveArrival` sets it on defender home-planet capture; `GameScreen` Battle Report modal sorts home-conquest cards first with blue banner **"You took their home planet!"** and blue card tint for winning human attacker; display-only; `npx tsc --noEmit` passes clean.
- 2026-05-29: ~~Task 124 complete~~ — `productionEngine` `runProduction` level-up loop no longer subtracts threshold from `researchPoints`; cumulative `RESEARCH_THRESHOLDS` comparison only increments `techLevel`; R&D modal projection unchanged; `npx tsc --noEmit` passes clean.
- 2026-05-29: ~~Task 123 complete~~ — `GameScreen` `formatTurnEvent` `research_levelup` case uses `"You"` when the event belongs to the local human player (matches combat report wording); other players keep their name; display-only; `npx tsc --noEmit` passes clean.
- 2026-05-29: Phase 31–32 tasks added (Tasks 123–126) — research message uses "You" (Task 123); research points carry over on level-up, no reset (Task 124); home planet conquest blue battle card UI (Task 125); full elimination mechanics: forfeited planets, skip turn order, knockout message, last-player-standing win condition (Task 126).
- 2026-05-29: Phase 30 tasks added (Tasks 121–122) — diagnose and fix map generator boundary-fill at large planet counts: expand grid-to-planet ratio and implement soft-bound growth (Task 121); add four galaxy shape archetypes (scattered, arms, dense core, ring) selected per game via seeded RNG (Task 122).
- 2026-05-28: ~~Task 114 complete~~ — `GameScreen` ⋮ Report modal: **Battles** `PLANET: You (X) attacked NAME (Y) — Winner (Z remaining)` via `formatTurnEvent` + `getBattleReportSides`; **Troop Landings** `PLANET: N 🚀`; **Built** `PLANET: 🏭/🔬 xN` with `groupBuildCompleteEvents` (engine emits one `build_complete` per building); Research unchanged; `npx tsc --noEmit` passes clean.
- 2026-05-28: ~~Task 113 complete~~ — `GameScreen` `BattleReportCard` attacker left / defender right from combat event names; centre **attacked**; simultaneous neutral landing when defender's same-planet `fleet_arrived` count equals `defenderShipsBefore` (viewing defender on left); `getBattleReportSides` + `turnEvents` prop; `npx tsc --noEmit` passes clean.
- 2026-05-28: ~~Task 112 complete~~ — `GameScreen` planet-tap battle card uses `humanCombatByPlanetName` (from per-player archive) instead of `turnReport`; ⋮ Report modal **Battles** section uses `humanCombatEvents` instead of `turnReport` combat filter; second pass-and-play human sees same tap battle card and Report battles as first player; `npx tsc --noEmit` passes clean.
- 2026-05-29: ~~Task 115 complete~~ — `gameStore` `playerTurnReportByPlayerId` populated in `endTurn` (fleet/research/build by player name or planet owner; outgoing entry cleared); `GameScreen` ⋮ Report Research/Troop Landings/Built use `playerTurnReport`; Battles and `BattleReportCard` `turnEvents` unchanged; `npx tsc --noEmit` passes clean.
- 2026-05-29: Phase 29 tasks added (Tasks 119–120) — dynamic planet count from map size + player count (Task 119); replace research formula with hand-tuned exact lookup table (Task 120).
- 2026-05-29: ~~Tasks 117–118 complete~~ — probabilistic coin-flip combat (Task 117); combat.md updated to document new model (Task 118).
- 2026-05-29: Phase 28 tasks added (Tasks 117–118) — replace deterministic strength-comparison combat with iterative coin-flip per-troop resolution where tech level difference shifts per-flip win probability via `(7+d)/(14+|d|)` formula (Task 117); update combat.md to document new model and remove old constants (Task 118).
- 2026-05-29: ~~Task 116 complete~~ — `productionEngine` `build_complete` emission `builtOnRound === currentRound` (was `currentRound - 1`); Report **Built** at round start when building becomes active; `npx tsc --noEmit` passes clean.
- 2026-05-29: Task 116 added — bug fix: `build_complete` event fires one round too late; change emission condition from `builtOnRound === currentRound - 1` to `builtOnRound === currentRound` so notification appears at turn 2 start (not turn 3).
- 2026-05-29: Task 115 added — bug fix: per-player `playerTurnReportByPlayerId` in store so ⋮ Report modal Troop Landings/Research/Built sections show the current player's events instead of the shared global `turnReport`.
- 2026-05-28: Phase 27 tasks added (Tasks 112–114) — bug fix: second player sees no battle card on planet tap and no battles in ⋮ Report (Task 112); battle report card layout: attacker left, defender right, "attacked" centre text with simultaneous-landing handling (Task 113); simplify turn report message format for Battles, Troop Landings, and Built sections (Task 114).
- 2026-05-28: Task 111 added — bug fix: battle UI (map marker, auto-open modal, ⋮ entry, tap battle card) must appear for both human players involved in a human-vs-human battle in pass-and-play, not only the first player to take their turn.
- 2026-05-28: Planet battle markers + tap battle reports — 🚀 on battle planets this turn; win → battle card + planet modal; loss → battle card only; `GameScreen` display-only.
- 2026-05-28: Battle Report in ⋮ menu — `GameScreen` dropdown **Battle Report** row when local human had combat this turn; opens existing battle modal; auto-popup gated on `humanCombatEvents` only.
- 2026-05-28: Battle report victor remaining fix — `getVictorRemainingShips` picks attacker vs defender survivors by `attackerWon` (never wiped loser's 0); `combatEngine` `max(1, floor(strength delta))` for `remainingShips`.
- 2026-05-28: Battle report card UI polish — remaining footer uses winner's garrison (`attackerShipsBefore - attackerLost` or defender equivalent) so defeats show enemy troops left; header class letter enlarged with margin; green **W** / red **L** on right; display-only.
- 2026-05-28: Battle report card UI redesign — `GameScreen` **Battle Report** modal combat cards use structured visual layout (planet + class header, troop vs troop with 🚀, You/opponent labels, remaining ships); victory/defeat card tint; display-only; `getBattleReportDetails` unchanged; `npx tsc --noEmit` passes clean.
- 2026-05-28: Bug fix — fleet/measure drag origin detection used displaced finger position after `minDistance(10)`; `GameScreen` passes finger-down coords to drag-start handlers; `findPlanetAtMapCoords` hit radius floored to `PLANET_SIZE / 2`; no store/engine changes; `npx tsc --noEmit` passes clean.
- 2026-05-28: ~~Task 110 complete~~ — `GameScreen` Report modal sectioned layout: Battles → Research → Troop Landings → Built; empty sections omitted; bold headers + optional dividers; `formatTurnEvent` unchanged; display-only; `npx tsc --noEmit` passes clean.
- 2026-05-28: ~~Task 109 complete~~ — auto-opening **Battle Report** modal in `GameScreen` when `turnReport` has combat events; pass-and-play defers until lock screen dismiss; combat `TurnEvent` adds `attackerShipsBefore`, `defenderShipsBefore`, `remainingShips`; existing Report modal unchanged.
- 2026-05-28: Phase 26 tasks added (Tasks 109–110) — auto-opening battle results modal at turn start (Task 109), restructure turn report modal into ordered sections: Battles → Research → Troop Landings → Built (Task 110).
- 2026-05-28: ~~Bug fix — queued modal group build orders by planet + type~~ — `GameScreen` `BuildDisplayGroup` consolidates same-planet same-type build rows; group cancel in descending index order; badge count unchanged; fleet rows unchanged.
- 2026-05-28: ~~Bug fix — fleet dispatch modal allow 0 ships to cancel order~~ — `GameScreen` stepper min 0, `modalMaxShips` `Math.max(0, …)`, **Cancel Order** at 0 removes queued route or closes without queuing; no store/engine changes.
- 2026-05-28: ~~Bug fix — home planet snap instant (no `withTiming` animation)~~ — `GameScreen` `animateMapToSnap` direct assignment; removed `HOME_PLANET_SNAP_DURATION_MS`; turn start and lock-screen dismiss no longer scroll from previous position.
- 2026-05-28: Task 108 follow-up — `PLANET_HIT_RADIUS` reduced from `CELL_SIZE * 2.5` to `CELL_SIZE * 1.8` (45 → 32 screen-px constant radius); zoom-scaling from Task 108 unchanged; hit box feels tighter and more proportionate at all zoom levels.
- 2026-05-28: Phase 25 tasks added (Task 108) — scale planet tap/select/drag-drop hit radius inversely with zoom so touch targets stay proportionate to the visual planet size at all zoom levels.
- 2026-05-28: Bug fix — `GameScreen` `getPlanetColor` returns `NEUTRAL_COLOR` for all non-owned planets (neutral and enemy); enemy home planets no longer visually distinct at game start; fleet `getPlayerColor` unchanged.
- 2026-05-28: Task 107 complete — warm light-mode `COLORS` palette in `GameScreen` and `HomeScreen`; map planet/fleet colours retuned for off-white background; map labels and overlays aligned to new theme.
- 2026-05-28: Phase 24 tasks added (Tasks 98–106) — snap map to home planet at turn start (Task 98), home planet light-brown colour tint (Task 99), soft off-white background (Task 100), fix zoom-edge map shift via viewport padding (Task 101), queued modal shows build orders (Task 102), consolidate Queued/R&D/Report into header dropdown (Task 103), Report modal with turn event summary (Task 104), fleet modal planet names only (Task 105), center ship-count input in fleet modal (Task 106).
- 2026-05-28: Phase 23 tasks added (Tasks 95–97) — fix troop send cap above 1 (Task 95), move owned-planet name label above the planet node (Task 96), allow dragging queued departure line to re-open and edit ship count within the same turn (Task 97).
- 2026-05-28: Phase 22 tasks added (Task 94) — fix End Turn button no-op for second+ human player in pass-and-play multi-human games.
- 2026-05-28: Task 86 complete — `mapGenerator` multi-cluster planet placement (2–5 centres, 20–50% width spread, Gaussian-approx offsets); `MIN_PLANET_DISTANCE` + retry loop unchanged; `spawnPlacer` unaffected.
- 2026-05-28: Task 85 complete — `CELL_SIZE` 11→6; map-canvas label fonts, fleet/pending SVG markers, and highlight borders derive from `(value/18)*CELL_SIZE`; `DEFAULT_MAP_SCALE` ~1.8 (55% of ~390px viewport for 20×20 Small map); modals/HUD/pill unchanged.
- 2026-05-28: Task 84 complete — halved HomeScreen map preset grid dimensions (`20×20/16`, `30×30/32`, `40×40/54`); `MIN_PLANET_DISTANCE` 4→2 and `PLANET_EDGE_PADDING` 3→2 in `mapGenerator`; visual rendering constants unchanged.
- 2026-05-28: Task 89 complete — `mapGenerator` single central Gaussian blob (`gaussianPosition`, σ = width × 0.28); out-of-bounds → `null` + retry; multi-cluster logic removed.
- 2026-05-28: Task 88 complete — `CELL_SIZE` 6→18 in `GameScreen`; derived `(value/18)*CELL_SIZE` constants and `DEFAULT_MAP_SCALE` (~0.6) recalculate automatically; map labels readable, zoom useful; Task 84 grid spacing unchanged.
- 2026-05-28: Task 90 complete — `mapGenerator` `MIN_PLANET_DISTANCE` 2→4; σ 0.28→0.38; two-phase placement (Phase A nearest ≤ 11 clicks); `nearestDistance` helper.
- 2026-05-28: Task 91 complete — HomeScreen presets `24×24/16`, `40×40/32`, `52×52/54`; `MAX_PLACEMENT_ATTEMPTS_PER_PLANET` 2000; connectivity ceiling `Math.round(width * 0.55)`.
- 2026-05-28: Task 93 complete — `growthPosition` parent distance uniform `4 + rng() * 7` ([4, 11] clicks); replaces triangular `4 + (rng() + rng()) * 4.5`.
- 2026-05-28: Task 92 complete — `mapGenerator` `growthPosition` replaces `gaussianPosition`; organic growth from random seed + parent-linked placement; Phase A/B connectivity ceiling removed.
- 2026-05-28: Phase 21 tasks added (Task 93) — simplify growth distance to uniform [4, 11] clicks, removing triangular bias.
- 2026-05-28: Phase 20 tasks added (Task 92) — replace Gaussian blob placement with growth model for organic, varied galaxy shapes.
- 2026-05-28: Phase 19 tasks added (Task 91) — fix placement failure by increasing map preset grid sizes to fit MIN_DISTANCE=4, bump max attempts to 2000, scale Phase A ceiling with map width.
- 2026-05-28: Phase 18 tasks added (Task 90) — fix planet spacing: MIN 4 clicks, soft preference for 6–10 click neighbours, 11-click connectivity ceiling.
- 2026-05-28: Phase 17 tasks added (Tasks 88–89) — restore CELL_SIZE to 18 to fix unreadable text and zoom (Task 88), replace multi-cluster planet placement with single central Gaussian blob (Task 89).
- 2026-05-28: Task 87 complete — all 16 planet classes (A–P) restored to weight pool; A–E weight 8, F–P weight 7 (total 117, normalised); gentle bias with no excluded tiers.
- 2026-05-28: Phase 16 tasks added (Tasks 84–87) — halve planet coordinate spacing (Task 84), halve visual CELL_SIZE with proportional text/hit-target scaling (Task 85), replace uniform planet placement with clustered random distribution (Task 86), restore F–P classes and rebalance A–E as only slightly more common (Task 87).
- 2026-05-28: Task 83 complete — zoom jump fixed (isPinching flag blocks pan from fighting pinch over translateX); edge wall fixed (clamp removed from pinch onUpdate, applied once on onEnd); pan switched to delta-per-frame tracking.
- 2026-05-28: Phase 15 tasks added (Task 83) — fix pinch-zoom jump/teleport during gesture and edge-wall that prevents zooming near board edges.
- 2026-05-28: Task 81 complete — `measureDrag` blocks map pan via `isFleetDragging`; measurement drags draw the same `DragLine` as fleet drag (`measureDragOriginPlanetId` + `dragFingerLocal`).
- 2026-05-28: Task 82 complete — planet name/class/troop map label font sizes scaled 11/18 for `CELL_SIZE` 11; troop label `marginTop` scaled; label containers already proportional from Task 79.
- 2026-05-28: Phase 14 tasks added (Tasks 81–82) — fix map pan + draw measurement line during non-owned drag (Task 81), fix planet label text sizes after CELL_SIZE reduction (Task 82).
- 2026-05-28: Task 80 complete — live click-distance pill while dragging from any planet; owned planets use fleet-drag `onUpdate`, non-owned use `measureDrag` (no dispatch).
- 2026-05-28: Phase 13 tasks added (Tasks 79–80) — reduce visual planet spacing to 3/5 of current (Task 79), show live click-distance label while dragging a fleet from any planet (Task 80).
- 2026-05-28: Phase 12 tasks added (Tasks 76–78) — remove garrison constraint (can send all ships), simplify building placement to single-tap chip, fix turn counter to show roundNumber.
- 2026-05-28: Task 75 complete — AI fleet selection respects click-range cap (`effectiveRange` + `isInRange`); fixes intermittent out-of-range `SEND_FLEET` from AI turns.
- 2026-05-28: Task 74 complete — fleet arrivals at round wrap resolve immediately via `resolveArrival` (no extra turn delay before capture).
- 2026-05-28: Phase 11 tasks added (Tasks 72–73) — remove blue planet highlight on capture, disable map pan while fleet drag is active.
- 2026-05-28: Phase 10 tasks added (Tasks 68–71) — move queued orders to modal button, insufficient-gold error on build, cancel-and-refund for same-turn builds, confirm-demolish for active buildings.
- 2026-05-28: Bug fix (no backlog task, Phase 9) — End Turn `onPress` now calls `cancelDrag()` first so `dragOriginPlanetId` and fleet-drag refs clear before turn resolution; fixes spurious blue drag-origin border on captured planets after End Turn.
- 2026-05-28: Bug fix (no backlog task) — `screenToMapCoords` was applying center-compensation twice when inverting `animatedStyle`; corrected to `map = (screen - rawTranslate) / scale` so planet tap and fleet drop targets align at all zoom levels (Phase 9 hit-target work assumed correct coordinate math).
- 2026-05-28: Tasks 65 and 67 revised after further investigation — Task 65 reframed as enlarged tap/drop hit targets (drag itself works fine); Task 67 reframed as same-turn interactivity after capture (next turn already works, capture turn does not).
- 2026-05-28: Phase 9 tasks added (Tasks 65–67) — planet tap/drop hit-target enlargement, queued fleet departure indicator + troop deduction display, and conquered planet same-turn interactivity fix.
- 2026-05-28: Task 64 complete — conquered planets now render and interact identically to home planet.
- 2026-05-28: Task 63 complete — HUD turn counter fixed for pass-and-play.
- 2026-05-28: Task 62 complete — default map scale reduced to 0.6.
- 2026-05-28: Phase 8 tasks added (Tasks 62–64) — shrink default map scale, fix turn counter display in pass-and-play, conquered planet full rendering and interactivity.
- 2026-05-28: Phase 7 tasks added (Tasks 56–61) — closest planet distance 4 clicks, fix turn/round semantics, conquered planet rendering parity, remove double-tap zoom, fix zoom/scroll viewport jump, fleet tap-to-drag + HUD cleanup.
- 2026-05-28: Task 50 marked complete — build orders now deduct gold immediately and enforce per-planet slot capacity at queue time.
- 2026-05-28: Phase 6 tasks added (Tasks 47–55) — planet tap hit-detection fix, board-edge padding, fleet modal distance/turns display, immediate gold deduction on build, research info button, increased A/B/C spawn rate, home-planet class variation (A–G), building icons, and production slider live output label.
- 2026-05-27: Task 46 marked complete — buildings now store `builtOnRound`, current-round slots render dimmed, and production counts only active buildings (`builtOnRound < currentRound`).
- 2026-05-27: Task 44 marked complete — planet name pools shortened and `numberOfLines` truncation removed from map labels.
- 2026-05-27: Task 43 marked complete — non-owned planets now show muted class/name labels while keeping fogged ship counts hidden.
- 2026-05-27: Task 40 marked complete — zoom pan clamping now reaches all board edges at high zoom.
- 2026-05-27: Tasks 40–46 added — zoom scroll clamping fix, remove ownership ring, fog-of-war border fix, non-owned planet gray rendering, shorter planet names, modal redesign, and building construction delay.
- 2026-05-27: Task 39 marked complete — research level-up now uses exported exponential `researchThreshold(level)`.
- 2026-05-27: Tasks 34 and 35 marked complete — fog-of-war planet tinting now renders own planets green, neutral planets very dim, and enemy planets gray blobs.
- 2026-05-27: Task 33 marked complete — AI names now use unique simple first-names and avoid human-name clashes.
- 2026-05-27: Task 32 marked complete — human slot name inputs + store fallback naming.
- 2026-05-27: Task 31 marked complete — zoom/pan focal-point fix + transformOrigin.
- 2026-05-27: Phase 5 tasks added (Tasks 31–39) — zoom/pan fix, human name input, AI simple names, fog-of-war rendering, green own planets, planet label layout, planet modal, End Turn button position, research exponential curve.
- 2026-05-27: Tasks 26 and 28 marked complete (26 via Task 27 queue model; 28 pass-and-play lock screen).
- 2026-05-27: Major backlog rewrite — Tasks 11–30 added based on design review. All Phase 1 backlog items removed (Tasks 3–9 already completed). Tasks 11–18 cover engine redesign; Tasks 19–28 cover UI/UX overhaul; Tasks 29–30 cover async multiplayer.
- 2026-05-27: Added Task 10 MVP known limitations (one fleet per turn, no SVG fleet lines).
- 2026-05-27: File created. Tasks 1–2 moved to completed.md.
- 2026-05-29: Bug fix (no backlog task) — `mapGenerator` `ensureConnectivity` guarantees single connected galaxy at 11-click base fleet range; bridge planets inserted when disconnected clusters remain after normalization; `npx tsc --noEmit` passes clean.
- 2026-05-29: Bug fix (no backlog task) — deferred farewell for last-player-in-round knockout (`pendingFarewellPlayerIds`, `findFarewellInPath` in `gameStore`); victory modal "last player standing" copy in `GameScreen`; `npx tsc --noEmit` passes clean.
- 2026-05-29: AI Brain overhaul (no prior backlog task) — `AiDifficulty` expanded to `'easy' | 'normal' | 'hard'`; `AiPlayerState` fog-of-war memory in `GameState.aiStates`; `updateAiObservation` called by `turnEngine` at end of each AI turn; `computeAiTurn` dispatches per difficulty tier; Normal/Hard: multi-fleet (3/5 per turn), `BUILD`/`SET_PRODUCTION_SLIDER` `PlayerAction` variants, building strategy, slider management, strategic phases (expand/build/strike/defend); Hard: scout probes; Easy: original heuristic preserved; ~~HomeScreen adds Hard difficulty chip~~ *(superseded 2026-05-31 by Task 172 hard-only AI setup)*; all AI state lives in `GameState` for backend-portable serialisation; `npx tsc --noEmit` passes clean.
- 2026-05-29: Phase 12–16 tasks added (Tasks 128–149) — full backend integration plan: auth layer, friends system, async game setup, in-game async integration, push notifications.

---

## Phase 12 — Auth Layer (Client)

---

### Task 128 — API client base layer

**Goal:** Create `src/services/apiClient.ts` — a thin wrapper around `fetch` that handles base URL, auth token injection, and common error handling.

**Files to create:**
- `src/services/apiClient.ts`

**Files to read first:**
- `docs/systems/backend-api.md`
- `src/store/gameStore.ts` (to understand the store shape before adding auth state)

**Requirements:**
1. Export an `apiClient` object (or function) with `get`, `post`, `delete` methods.
2. Base URL read from a constant `API_BASE_URL` (e.g. `http://localhost:8000/api` — developer can override).
3. Each request automatically attaches `Authorization: Bearer {token}` if a token is present.
4. Token is read from AsyncStorage key `auth_token` on each request (not cached in memory — AsyncStorage read is fast and avoids stale state).
5. All responses that return HTTP 401 should call a global `onUnauthorized` callback (to be wired to navigate to LoginScreen later).
6. Export types: `ApiError { message: string; errors?: Record<string, string[]> }`.
7. Throws `ApiError` on non-2xx responses (parses backend's JSON error envelope).

**What not to change:** No game engine files, no screen files.

---

### Task 129 — Auth store + AsyncStorage token persistence

**Goal:** Add auth state to the app — `currentUser`, `authToken`, `login`, `logout`, `register` — with token persisted in AsyncStorage so users never need to re-authenticate.

**Files to read first:**
- `src/store/gameStore.ts`
- `src/services/apiClient.ts` (Task 128)
- `docs/systems/multiplayer.md` (Session Persistence section)

**Files to create/modify:**
- `src/store/authStore.ts` (new Zustand store, separate from gameStore)

**Requirements:**
1. Create a new Zustand store `useAuthStore` with:
   - `currentUser: { id: number; username: string } | null`
   - `token: string | null`
   - `isLoadingAuth: boolean` — true while checking stored token on startup
   - `login(username, password): Promise<void>` — calls `POST /api/auth/login`, stores token in AsyncStorage (`auth_token`) and `currentUser` in AsyncStorage (`current_user`), updates store state
   - `register(username, password, passwordConfirmation): Promise<void>` — calls `POST /api/auth/register`, same token storage
   - `logout(): Promise<void>` — calls `POST /api/auth/logout`, clears AsyncStorage, resets store
   - `loadStoredAuth(): Promise<void>` — reads `auth_token` and `current_user` from AsyncStorage; if token exists, calls `GET /api/auth/me` to verify; sets `currentUser` and `token` or clears if 401; sets `isLoadingAuth = false`
2. Install `@react-native-async-storage/async-storage` (check Expo SDK 54 compatibility first).
3. `apiClient` is updated to call `AsyncStorage.getItem('auth_token')` for the Bearer token.

**What not to change:** `gameStore.ts`, screen files, game engine files.

---

### Task 130 — LoginScreen

**Goal:** Build the Login screen UI (username + password, link to Register).

**Files to read first:**
- `src/store/authStore.ts` (Task 129)
- `src/screens/HomeScreen.tsx` (for colour palette reference)
- `docs/development/coding-standards.md`

**Files to create/modify:**
- `src/screens/LoginScreen.tsx` (new)
- `App.tsx` (add LoginScreen to navigation stack)

**Requirements:**
1. Warm off-white background (`#f5f0eb`) matching HomeScreen.
2. Centered card layout: app title "Gaza Galaxy" at top, username `TextInput`, password `TextInput` (secureTextEntry), "Sign In" button.
3. "New here? Create an account" link that navigates to RegisterScreen.
4. "Sign In" button calls `authStore.login(username, password)`.
5. Show inline error message below the form on failure (e.g. "Invalid username or password").
6. Loading state on the button while the request is in flight.
7. On success: navigation handled by App.tsx auth gate (Task 132) — LoginScreen does NOT navigate directly.
8. Add LoginScreen and RegisterScreen to `RootStackParamList` in `App.tsx`.

**What not to change:** GameScreen, HomeScreen content, gameStore, game engine files.

---

### Task 131 — RegisterScreen

**Goal:** Build the Register screen UI (username + password + confirm password).

**Files to read first:**
- `src/screens/LoginScreen.tsx` (Task 130 — for style consistency)
- `src/store/authStore.ts`

**Files to create/modify:**
- `src/screens/RegisterScreen.tsx` (new)

**Requirements:**
1. Same colour palette and card layout as LoginScreen.
2. Fields: username (hint: "3–30 characters, letters/numbers/underscores"), password, confirm password.
3. "Create Account" button calls `authStore.register(username, password, passwordConfirmation)`.
4. Show field-level validation errors from the API (e.g. "Username is already taken").
5. "Already have an account? Sign In" link that navigates back to LoginScreen.
6. Loading state on button.

**What not to change:** Same exclusions as Task 130.

---

### Task 132 — App startup auth gate

**Goal:** On app launch, check for a stored auth token and route the user to either HomeScreen (logged in) or LoginScreen (not logged in). No re-login needed if token is valid.

**Files to read first:**
- `App.tsx`
- `src/store/authStore.ts` (Task 129)
- `src/screens/LoginScreen.tsx` (Task 130)

**Files to modify:**
- `App.tsx`

**Requirements:**
1. On mount, `App.tsx` calls `authStore.loadStoredAuth()`.
2. While `isLoadingAuth = true`: show a full-screen loading indicator (simple centered spinner on `#f5f0eb` background — no navigation stack yet).
3. When `isLoadingAuth = false`:
   - If `currentUser` is set: show the main stack (HomeScreen is the initial route)
   - If `currentUser` is null: show the auth stack (LoginScreen is the initial route)
4. The navigation stacks are rendered conditionally based on auth state — this is the standard React Navigation auth-flow pattern.
5. On login success (store updates `currentUser`): the conditional rendering automatically switches to the main stack.
6. On logout: switches back to auth stack.
7. Register `apiClient.onUnauthorized` callback here to call `authStore.logout()` and switch to auth stack on 401.

**What not to change:** Game engine files, gameStore, screen content.

---

## Phase 13 — Friends System (Client)

---

### ~~Task 133 — Friends service layer~~ ✅ Completed 2026-05-29

**Goal:** Create `src/services/friendsService.ts` with all friend-related API calls.

**Files to read first:**
- `docs/systems/backend-api.md` (Friends section)
- `src/services/apiClient.ts` (Task 128)

**Files to create:**
- `src/services/friendsService.ts`

**Requirements:**
Export the following async functions (all call the API, all throw `ApiError` on failure):
1. `getFriends(): Promise<Friend[]>` — `GET /api/friends`
2. `getFriendRequests(): Promise<FriendRequest[]>` — `GET /api/friends/requests`
3. `sendFriendRequest(username: string): Promise<void>` — `POST /api/friends/request`
4. `acceptFriendRequest(friendshipId: number): Promise<void>` — `POST /api/friends/requests/{id}/accept`
5. `declineFriendRequest(friendshipId: number): Promise<void>` — `POST /api/friends/requests/{id}/decline`
6. `removeFriend(friendshipId: number): Promise<void>` — `DELETE /api/friends/{id}`
7. `searchUsers(query: string): Promise<UserSearchResult[]>` — `GET /api/users/search?q={query}`

Export types:
- `Friend { friendshipId: number; user: { id: number; username: string } }`
- `FriendRequest { friendshipId: number; fromUser: { id: number; username: string }; createdAt: string }`
- `UserSearchResult { id: number; username: string; friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' }`

**What not to change:** Store files, screen files, game engine files.

---

### ~~Task 134 — FriendsScreen (friend list + pending requests)~~ ✅ Completed 2026-05-29

**Goal:** Build a FriendsScreen accessible from HomeScreen showing accepted friends and incoming pending requests.

**Files to read first:**
- `src/services/friendsService.ts` (Task 133)
- `src/screens/HomeScreen.tsx` (style reference)
- `App.tsx` (navigation setup)

**Files to create/modify:**
- `src/screens/FriendsScreen.tsx` (new)
- `App.tsx` (add FriendsScreen to stack)

**Requirements:**
1. Warm off-white background, same `COLORS` palette as HomeScreen.
2. Screen has two sections: "Friends" (accepted) and "Pending Requests" (incoming only).
3. Each friend row shows username + "Remove" button (calls `removeFriend`; confirmation Alert first).
4. Each pending request row shows username + "Accept" / "Decline" buttons.
5. At the top: a search bar (text input) to search users. Show results below; each result has a "Add Friend" button (disabled if already friends or request pending, showing appropriate label).
6. On "Add Friend": calls `sendFriendRequest`; show success feedback inline.
7. Pull-to-refresh reloads both friends and requests.
8. Loading states and error handling inline.
9. Screen is navigated to from HomeScreen (Task 137 adds the nav button).

**What not to change:** Game engine files, gameStore, auth store.

---

### ~~Task 135 — Send/accept/decline friend requests (wiring)~~ ✅ Completed 2026-05-29

**Note:** The friend request actions are built into FriendsScreen (Task 134). This task is about ensuring the data flow is correct and adding optimistic UI updates.

**Goal:** After sending a request, accepting, or declining, the screen immediately reflects the new state without a full reload.

**Files to modify:**
- `src/screens/FriendsScreen.tsx` (Task 134)

**Requirements:**
1. After `sendFriendRequest`: the searched user's "Add Friend" button changes to "Request Sent" immediately (optimistic).
2. After `acceptFriendRequest`: move the row from Pending Requests to Friends section immediately.
3. After `declineFriendRequest`: remove the row from Pending Requests immediately.
4. After `removeFriend`: remove the row from Friends section immediately.
5. All errors show a brief `Alert` with the error message.

**What not to change:** No non-FriendsScreen files.

---

### ~~Task 136 — Pending friend request badge in HomeScreen~~ ✅ Completed 2026-05-29

**Goal:** Show a badge or indicator in HomeScreen when the user has pending incoming friend requests.

**Files to read first:**
- `src/screens/HomeScreen.tsx`
- `src/services/friendsService.ts` (Task 133)

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. On HomeScreen mount/focus: call `getFriendRequests()` to get the pending request count.
2. Show a "Friends" nav button in the HomeScreen header (top-right area, or as a labeled row at top of screen).
3. If pending request count > 0: show a numeric badge on the Friends button.
4. Tapping the Friends button navigates to FriendsScreen.
5. The request count refreshes each time HomeScreen gains focus.

**What not to change:** GameScreen, game engine files, gameStore.

---

## Phase 14 — Async Game Setup (Client)

---

### ~~Task 137 — Games service layer~~ ✅ Completed 2026-05-29

**Goal:** Create `src/services/gamesService.ts` with all game and invite-related API calls.

**Files to read first:**
- `docs/systems/backend-api.md` (Games and Turns sections)
- `src/services/apiClient.ts` (Task 128)
- `src/store/gameStore.ts` (for `GameConfig`, `PlayerSlot` types — to understand what to send)

**Files to create:**
- `src/services/gamesService.ts`

**Requirements:**
Export the following async functions:
1. `listGames(): Promise<ApiGame[]>` — `GET /api/games`
2. `getGame(id: number): Promise<ApiGameDetail>` — `GET /api/games/{id}`
3. `createGame(payload: CreateGamePayload): Promise<ApiGame>` — `POST /api/games`
4. `deleteGame(id: number): Promise<void>` — `DELETE /api/games/{id}`
5. `saveTurnProgress(gameId: number, payload: InProgressTurnPayload): Promise<void>` — `POST /api/games/{id}/turn/save`
6. `submitTurn(gameId: number, payload: SubmitTurnPayload): Promise<void>` — `POST /api/games/{id}/turn/submit`
7. `listInvites(): Promise<ApiInvite[]>` — `GET /api/invites`
8. `acceptInvite(inviteId: number): Promise<{ gameStarted: boolean }>` — `POST /api/invites/{id}/accept`
9. `declineInvite(inviteId: number): Promise<void>` — `POST /api/invites/{id}/decline`

Export types to match the backend API response shapes (see `docs/systems/backend-api.md`):
- `ApiGame`, `ApiGameDetail`, `CreateGamePayload`, `InProgressTurnPayload`, `SubmitTurnPayload`, `ApiInvite`

**What not to change:** Store files, screen files, game engine files.

---

### ~~Task 138 — Username default in game setup~~ ✅ Completed 2026-05-29

**Goal:** In the new-game setup form, slot 0 (local player) defaults to the current user's username from the auth store.

**Files to read first:**
- `src/screens/HomeScreen.tsx`
- `src/store/authStore.ts` (Task 129)

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. In the new-game setup form, read `useAuthStore().currentUser?.username` and use it as the default value for slot 0's name input.
2. The name remains editable (same as today).
3. If `currentUser` is null (shouldn't happen in normal flow): fall back to current "Commander" default.
4. This applies to both pass-and-play and async multiplayer game creation.

**What not to change:** Game engine files, gameStore, GameScreen.

---

### ~~Task 139 — Friend picker for human slots in async game creation~~ ✅ Completed 2026-05-29

**Goal:** When creating an async multiplayer game, human player slots (other than slot 0) show a friend picker instead of a free-text name input.

**Files to read first:**
- `src/screens/HomeScreen.tsx`
- `src/services/friendsService.ts` (Task 133)
- `src/store/authStore.ts` (Task 129)
- `docs/systems/multiplayer.md` (Async Game Creation section)

**Files to modify:**
- `src/screens/HomeScreen.tsx`
- `src/store/gameStore.ts` (extend `PlayerSlot` with optional `userId?: number`)

**Requirements:**
1. When `playMode = 'asyncMultiplayer'` and a slot is set to `type: 'human'` (non-slot-0), show a friend-picker control instead of a text input.
2. Friend-picker: tapping it opens a modal or bottom sheet listing the user's friends (from `getFriends()`).
3. Selecting a friend assigns their username to `slot.name` and their `userId` to `slot.userId`.
4. The selected friend's username appears in the slot row (editable label the creator can override).
5. Clearing the selection returns the slot to an unassigned state (show placeholder "Select a friend").
6. If the user has no friends yet: show "No friends yet — add friends first" with a link to FriendsScreen.
7. The `PlayerSlot` interface in `gameStore.ts` gains an optional `userId?: number` field (used only for async games; null/undefined for AI, pass-and-play human, or unassigned async human slots).

**What not to change:** Game engine files, GameScreen, auth store internals.

---

### ~~Task 140 — Game invites modal/screen (accept/decline pending invites)~~ ✅ Completed 2026-05-29

**Goal:** Show pending game invites to the user with accept/decline actions.

**Files to read first:**
- `src/screens/HomeScreen.tsx`
- `src/services/gamesService.ts` (Task 137)

**Files to modify:**
- `src/screens/HomeScreen.tsx` (add invite list section and/or badge)

**Requirements:**
1. On HomeScreen mount/focus: call `listInvites()` to fetch pending invites.
2. If pending invites exist: show an "Invites" section above the games list (or a banner) with a count badge.
3. Each invite row shows: game name, creator username, player count, map size.
4. "Accept" button calls `acceptInvite(id)`:
   - On success: remove invite from list; if `gameStarted: true` also refresh the games list.
5. "Decline" button calls `declineInvite(id)`: remove invite from list immediately.
6. If all invites are hidden/actioned: section disappears.

**What not to change:** Game engine files, gameStore, GameScreen.

---

### ~~Task 141 — Async games list in HomeScreen from API~~ ✅ Completed 2026-05-29

**Goal:** HomeScreen shows the user's async multiplayer games fetched from the API, in addition to local pass-and-play games.

**Files to read first:**
- `src/screens/HomeScreen.tsx`
- `src/services/gamesService.ts` (Task 137)
- `docs/systems/save-system.md` (HomeScreen Game List section)

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. On HomeScreen mount and focus: call `listGames()` and store the result in local component state (not gameStore).
2. Render async games in a separate labeled section "Async Multiplayer" above or below local pass-and-play games.
3. Async game cards show: game name, player list (names), round number, current player name.
4. Tapping an async game card: calls `getGame(id)` to fetch the full state, then loads it into the Zustand `gameStore` as the active game record (using a new `loadAsyncGame` action), then navigates to GameScreen.
5. Async games that are `status: 'waiting_for_players'` are shown but not tappable (show "Waiting for players..." subtitle).
6. Async games that are `status: 'finished'` are shown with "VICTORY" / "DEFEAT" label (no tap action needed, but could show final state — defer to future).
7. Pull-to-refresh reloads the async games list.

**What not to change:** Game engine files, pass-and-play game flow, GameScreen internals.

---

### ~~Task 142 — Turn alert badges on async game cards~~ ✅ Completed 2026-05-29

**Goal:** Show visual alert indicators on async game cards based on `alert_state` returned by the API.

**Files to read first:**
- `src/screens/HomeScreen.tsx` (Task 141, for the async game card component)
- `docs/systems/multiplayer.md` (Turn Alert States section)

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. Each async game card reads `alert_state` from the `ApiGame` object.
2. `your_turn`: show a bold "YOUR TURN" badge (indigo/accent color, high contrast).
3. `in_progress`: show an orange "IN PROGRESS" badge — turn started but not submitted.
4. `waiting`: no badge; card rendered in normal/muted style.
5. `waiting_for_players`: show muted "Waiting..." label.
6. `finished`: show "VICTORY" (green) or "DEFEAT" (red) based on whether the current user won.
7. Cards with `your_turn` or `in_progress` badges should appear at the top of the async games list (sort by alert priority: in_progress > your_turn > waiting > finished > waiting_for_players).

**What not to change:** Pass-and-play game cards, game engine files, GameScreen.

---

## Phase 15 — In-Game Async Integration (Client)

---

~~### Task 143 — Exit Game in ⋮ menu + mid-turn save to API~~ *(completed 2026-05-29 — see `docs/tasks/completed.md`)*

**Goal:** Add an "Exit Game" option to the ⋮ dropdown menu in GameScreen. Tapping it saves the current mid-turn state to the API and navigates back to HomeScreen.

**Files to read first:**
- `src/screens/GameScreen.tsx` (⋮ dropdown implementation)
- `src/store/gameStore.ts` (to understand `queuedOrders`, active record structure)
- `src/services/gamesService.ts` (Task 137 — `saveTurnProgress`)
- `docs/systems/save-system.md` (Mid-Turn Save section)

**Files to modify:**
- `src/screens/GameScreen.tsx`
- `src/store/gameStore.ts` (add `isAsyncGame()` helper)

**Requirements:**
1. Add "Exit Game" as a menu item in the ⋮ dropdown, below "Report".
2. Only show "Exit Game" when the active game is an async multiplayer game AND it is the local user's turn.
3. For pass-and-play games: show "Exit to Home" (no API save — just navigate back; game is preserved in Zustand).
4. When "Exit Game" is tapped on an async game:
   a. Serialize the current `GameState` from the active Zustand record as `partial_state_json`.
   b. Serialize `queuedOrders` as `queued_orders`.
   c. Call `saveTurnProgress(gameId, { in_progress_actions: { partial_state_json, queued_orders } })`.
   d. Show a brief loading state on the menu item (disable interaction).
   e. On success: call `resetGame()` and `navigation.navigate('Home')`.
   f. On failure: show `Alert.alert('Failed to save', 'Could not save your progress. Please try again.')` and stay in-game.
5. `gameStore.ts`: add a helper `isAsyncGame(): boolean` that returns true when the active record's `config.playMode === 'asyncMultiplayer'`.
6. `gameStore.ts`: add `asyncGameId: number | null` to `GameRecord` (set when an async game is loaded from the API via Task 141's `loadAsyncGame`).

**What not to change:** Game engine files, pass-and-play endTurn flow, other ⋮ menu items.

---

~~### Task 144 — Mid-turn state restoration on async game open~~ *(completed 2026-05-29 — see `docs/tasks/completed.md`)*

**Goal:** When opening an async game that has saved mid-turn progress, restore the player to exactly where they left off.

**Files to read first:**
- `src/screens/HomeScreen.tsx` (Task 141 — where `getGame()` is called on tap)
- `src/store/gameStore.ts`
- `docs/systems/save-system.md` (Mid-Turn Resume section)

**Files to modify:**
- `src/screens/HomeScreen.tsx` (or wherever `loadAsyncGame` is called)
- `src/store/gameStore.ts` (update `loadAsyncGame` action)

**Requirements:**
1. When `getGame(id)` response includes `in_progress_actions` with a non-null `partial_state_json`:
   a. Parse `partial_state_json` as the `GameState`.
   b. Parse `queued_orders` and set them as `queuedOrders` in the store.
   c. Load this partial state as the active game record (NOT the base `state_json`).
2. When no `in_progress_actions`: load `state_json` as normal (fresh turn start).
3. After loading: navigate to GameScreen as usual.
4. The player sees their game in exactly the same state as when they exited: correct troop counts, builds, sliders, and queued orders.
5. Ensure `HOME_PLANET_SNAP_SCALE` snap still fires after load (it currently triggers on game load — verify it still works with restored state).

**What not to change:** Game engine files, pass-and-play flow, GameScreen gesture/render logic.

---

~~### Task 145 — Async endTurn: submit via API and navigate home~~ *(completed 2026-05-29 — see `docs/tasks/completed.md`)*

**Goal:** When a player completes their turn in an async multiplayer game, submit the result to the API and return them to HomeScreen.

**Files to read first:**
- `src/store/gameStore.ts` (current `endTurn` implementation)
- `src/services/gamesService.ts` (Task 137 — `submitTurn`)
- `docs/systems/multiplayer.md` (Turn Flow section)
- `docs/systems/save-system.md` (Turn Submission Flow section)

**Files to modify:**
- `src/store/gameStore.ts`
- `src/screens/GameScreen.tsx` (handle post-submit navigation)

**Requirements:**
1. After the existing `endTurn` logic runs (local turn resolution including AI turns), check `isAsyncGame()`.
2. If async:
   a. Capture the `PlayerAction[]` list for the human's turn (the actions already resolved — extract from `queuedOrders` before they are cleared, or collect during resolution).
   b. Capture the resulting `GameState` after full resolution.
   c. Call `submitTurn(asyncGameId, { actions, resulting_state: newState, turn_number, round_number })`.
   d. Add a `isSubmittingTurn: boolean` field to the store for loading state.
   e. On success: call `resetGame()` to clear the active game, then emit a navigation signal to GameScreen (use a store field `shouldReturnHome: boolean` or pass a callback).
   f. On failure: show `Alert.alert('Submit Failed', 'Could not submit your turn. Please try again.')` and reset `isSubmittingTurn`.
3. `GameScreen` displays a full-screen loading overlay ("Submitting turn...") while `isSubmittingTurn = true`.
4. On `shouldReturnHome = true`: `GameScreen` calls `navigation.navigate('Home')` and resets the flag.
5. For pass-and-play games: `endTurn` is completely unchanged — no API call.

**Critical:** The `endTurn` logic itself (turn resolution, AI turns, battle reports) must NOT change. The API call happens after all local resolution is complete.

**What not to change:** Game engine files, any turn resolution logic, pass-and-play endTurn behaviour.

---

~~### Task 146 — Async game state fetch on open~~ *(completed 2026-05-29 — see `docs/tasks/completed.md`)*

**Goal:** When an async game is opened, always fetch the latest state from the API before loading into the game store (prevents stale state from a previous session).

**Files to read first:**
- `src/screens/HomeScreen.tsx` (Task 141 — loadAsyncGame flow)
- `src/services/gamesService.ts` (Task 137)
- `src/store/gameStore.ts`

**Files to modify:**
- `src/screens/HomeScreen.tsx` (or wherever the async game tap handler lives)

**Requirements:**
1. When a user taps an async game card: show a brief loading indicator on the card while `getGame(id)` is in flight.
2. On success: load the game state (with mid-turn restore if applicable — Task 144) and navigate to GameScreen.
3. On failure: show `Alert.alert('Load Failed', 'Could not load game. Check your connection.')`.
4. Do not navigate to GameScreen until the API response has been processed.
5. If `alert_state` is `waiting` (not this user's turn): load the game in read-only/spectator mode (player can view the map but all interaction controls are hidden — End Turn, drag-to-dispatch, ⋮ actions). Show a banner: "It's {current_player_name}'s turn".

**What not to change:** Game engine files, pass-and-play flow, GameScreen gesture/render logic (just gate the controls).

---

## Phase 16 — Push Notifications (Client)

---

~~### Task 147 — Expo push token registration + API upload on startup~~ *(completed 2026-05-29 — see `docs/tasks/completed.md`)*

---

~~### Task 148 — Notification deep-link handler (tap notification → open game)~~ *(completed 2026-05-29 — see `docs/tasks/completed.md`)*

---

## Phase 17 — Multiplayer Bug Fixes

Critical bugs discovered during live multiplayer testing. Both must be fixed before the multiplayer experience is usable.

---

### ~~Task 149 — Bug Fix: Created game not visible in active campaigns after exit~~ *(complete 2026-05-31)*

**Problem:** After a player creates a game and then exits (via the ⋮ menu "Exit Game" or "Exit to Home"), the game does not appear in their active campaigns list on HomeScreen. There is no way to resume the game.

**Root causes to investigate:**
1. **Pass-and-play path:** `resetGame()` may be called when tapping "Exit to Home", which wipes the game from Zustand entirely. Pass-and-play games have no backend — if they are cleared from the store they are gone. The correct behavior is to navigate home without calling `resetGame()`, leaving the game in the `games[]` array.
2. **Async path:** After exit (mid-turn save + navigate home), the HomeScreen `useFocusEffect` re-fetches `listGames()`. If the game is returned with `alert_state: 'in_progress'` or `'waiting'` but the card is visually de-emphasised or hidden, the user may not find it. Verify the list always includes all games the user belongs to regardless of `alert_state`.
3. **HomeScreen local games section:** Confirm the pass-and-play games section actually renders for each `GameRecord` where `asyncGameId == null` and the game is not in a terminal state.

**Files to read first:**
- `src/screens/HomeScreen.tsx` — the lobby, local games list, async games list, and the game-creation flow
- `src/store/gameStore.ts` — `resetGame`, `isAsyncGame`, `games[]`, `activeGameId`
- `src/screens/GameScreen.tsx` — the ⋮ menu exit handler (Task 143)

**Files to modify:**
- `src/store/gameStore.ts` (if `resetGame` logic is wrong for pass-and-play exit)
- `src/screens/GameScreen.tsx` (if "Exit to Home" incorrectly calls `resetGame`)
- `src/screens/HomeScreen.tsx` (if the local games list is missing or not rendering correctly)

**Requirements:**
1. **Pass-and-play exit fix:** "Exit to Home" must call `navigation.navigate('Home')` only. It must NOT call `resetGame()` or remove the game from `games[]`. After navigating home, the game card must be visible in the local campaigns section and tappable to resume.
2. **Async exit fix:** After a mid-turn save and navigation home, `listGames()` runs on focus. The game must appear in the "Play with Friends" section. If `alert_state` is `'in_progress'`, the card should clearly show the "In Progress" badge and be tappable to resume.
3. **Async first-turn create:** When a game is first created and navigates to GameScreen without having submitted a turn yet, returning home (either by submitting the turn or by mid-turn exit) must show the game in the list. Verify the `POST /games` response triggers a list refresh on the next HomeScreen focus.
4. **Never hide games:** Games the current user belongs to must always appear in the appropriate section of HomeScreen regardless of `alert_state`. `'waiting'` and `'finished'` cards may be non-tappable but must still be visible.
5. If any campaign is missing from the HomeScreen list, add logging to identify exactly where the game record is lost (store wipe, missing API response, or rendering filter).

**What not to change:** Game engine files, the async `endTurn` → `submitTurn` flow, AI turn logic.

---

### ~~Task 150 — Bug Fix: Async multiplayer end turn opens next player's turn instead of returning to HomeScreen~~ *(completed 2026-05-31)*

**Problem:** In an async multiplayer game, when a human player taps "End Turn", the game advances locally and opens the next player's turn — including showing their map state and allowing interaction. This violates turn privacy and is the wrong flow for async multiplayer (each player plays from their own device; the game should return to HomeScreen after submission so the next player can take their turn on their own device).

**Root causes to investigate:**
1. **Wrong `playMode` on restored `GameState`:** When an async game is loaded from the API via `loadAsyncGame`, the `state_json` or `partial_state_json` decoded from the backend may have `playMode: 'passAndPlay'` (if the game was originally started locally before async was wired, or if the field is not being serialised/restored correctly). This would cause `isAsyncGame()` to return `false`, triggering pass-and-play behavior (lock screen → next human's turn).
2. **`isAsyncGame()` reading from wrong source:** The helper reads from the active `GameRecord`. Verify it is checking the `GameRecord.config.playMode` or `GameRecord.asyncGameId` and not the `GameState.playMode` which may differ.
3. **`shouldReturnHome` not triggering navigation:** The `GameScreen` effect that watches `shouldReturnHome` may not be firing, or may be racing with another state update that keeps the game screen open.
4. **Local multi-human turn cycle:** If there are multiple human player slots in the async game, the local `endTurn` loop may advance through them before `submitTurn` has a chance to navigate home.

**Files to read first:**
- `src/store/gameStore.ts` — `endTurn`, `isAsyncGame`, `shouldReturnHome`, `clearReturnHome`, `loadAsyncGame`
- `src/screens/GameScreen.tsx` — End Turn button handler, `shouldReturnHome` `useEffect`, pass-and-play lock screen logic
- `src/services/gamesService.ts` — `submitTurn`
- `docs/systems/multiplayer.md` — Turn Flow (Async Multiplayer) section

**Files to modify:**
- `src/store/gameStore.ts`
- `src/screens/GameScreen.tsx`

**Requirements:**
1. **Identify `playMode` source of truth:** When an async game is loaded from the API, `GameRecord.config.playMode` must be `'asyncMultiplayer'`. If the decoded `state_json.playMode` is `'passAndPlay'`, override it during `loadAsyncGame` using `GameRecord.asyncGameId` as the authoritative signal: if `asyncGameId` is non-null, the game is always async regardless of what `state_json` says.
2. **`isAsyncGame()` must be reliable:** It should return `true` whenever `activeRecord.asyncGameId != null`. Do not rely solely on `state.playMode` for this check.
3. **Async end turn must never advance to another player's local UI:** After `endTurn` resolves (AI turns included), if `isAsyncGame()` is true, the game must call `submitTurn`, set `isSubmittingTurn = true`, and on success: call `resetGame()` then `shouldReturnHome = true`. The GameScreen must then navigate to Home. No lock screen, no next-player UI, no pass-and-play flow.
4. **Pass-and-play lock screen must never appear in an async game:** Gate the lock screen display with `!isAsyncGame()` in `GameScreen`. If the lock screen is currently shown in async games, this is the immediate cause of the bug.
5. **`shouldReturnHome` effect must fire reliably:** Ensure the `useEffect` in `GameScreen` that watches `shouldReturnHome` has the correct dependency array and is not blocked by other state (e.g. `isSubmittingTurn` overlay being mounted when navigation fires).
6. After the fix: tapping End Turn in an async game must show the "Submitting turn…" overlay, call `submitTurn`, and then navigate to HomeScreen. The next player must open the game from their own device.

**Privacy note:** The backend already enforces that only the current player receives `in_progress_actions` and that only the current player can submit a turn. These server-side guards are already in place. This task is purely about the client-side flow returning home correctly so no player is ever presented with another player's in-game state on their device.

**What not to change:** Game engine files, local turn resolution logic, AI turn flow, the pass-and-play lock screen behavior for pass-and-play games.

---

## Phase 18 — Play with Friends: Creator-First Start

**Context:** When a user creates a "Play with Friends" (async multiplayer) game, they are currently redirected to the HomeScreen lobby and the game shows as "waiting" or "waiting for players". This is wrong. The creator should enter the game immediately and play their first turn. When they finish, the game advances to the next player — who can play once they accept their invite.

This requires changes on both the backend (3 tasks) and the frontend (1 task). The backend tasks must be completed first, then the frontend task.

---

### Task 151 — Backend: Create all GamePlayer rows at game creation

**Problem:** `GameController::store()` currently only creates `game_players` rows for the creator and AI slots. Invited human players do not get a `game_players` row until they accept their invite (`InviteController::accept()` creates it). This means the backend cannot know the full turn order until all invites are accepted, blocking immediate game start.

The database schema was designed so that **all `game_players` rows are created at game creation time** (the `game_invites` schema notes: *"The `game_players` row is created at game creation time; accepting an invite does not create a new row"*). The current implementation contradicts this design. This task fixes it.

**Files to read first:**
- `app/Http/Controllers/GameController.php` — `store()` method
- `app/Http/Controllers/InviteController.php` — `accept()` method (currently creates the `game_players` row)
- `app/Models/GamePlayer.php`
- `app/Models/GameInvite.php`
- `docs/backend/database-schema.md` — `game_players` and `game_invites` tables

**Files to modify:**
- `app/Http/Controllers/GameController.php`
- `app/Http/Controllers/InviteController.php`

**Requirements:**
1. In `GameController::store()`: create a `game_players` row for EVERY slot at creation time — creator (slot 0), all AI slots, AND all invited human slots. Human invitee rows use the invited user's `user_id` so the turn order is fully populated from day one.
2. GameInvite records continue to be created for all non-creator human slots (unchanged). The invite tracks whether the user has accepted — the `game_players` row already exists regardless.
3. In `InviteController::accept()`: remove the code that creates a `game_players` row. The row already exists. The accept action should only update the `game_invites.status` to `'accepted'` (plus the subsequent turn-unblocking logic added in Task 153).
4. Verify there are no duplicate-row errors: the `(game_id, turn_order)` unique constraint on `game_players` should be satisfied since each slot gets exactly one row.
5. No schema migration is required — `game_players` already has `user_id` nullable and all needed columns.

**What not to change:** The invite creation logic (`GameInvite::create`), turn submit logic, notification logic.

---

### Task 152 — Backend: Start game immediately on creation; handle advancing to a pending invitee

**Problem (part 1):** `GameController::store()` currently only starts the game immediately (sets `status = in_progress`, `current_user_id = creator`) when there are NO pending invites. When human invites exist, the game is left in `waiting_for_players` and the creator is sent to the lobby. The creator should start playing immediately regardless.

**Problem (part 2):** When the creator submits their turn and the next player in the turn order hasn't accepted their invite yet, `TurnController::submit()` must handle this gracefully — set the game to `waiting_for_players` and hold until that player accepts, rather than crashing or advancing incorrectly.

**Files to read first:**
- `app/Http/Controllers/GameController.php` — `store()` and the `startGame()` shortcut logic
- `app/Http/Controllers/TurnController.php` — `submit()` turn-advancement block
- `app/Services/GameService.php` — `startGame()`
- `app/Models/Game.php`, `app/Models/GamePlayer.php`, `app/Models/GameInvite.php`
- `docs/backend/database-schema.md` — `games.status` ENUM values

**Files to modify:**
- `app/Http/Controllers/GameController.php`
- `app/Http/Controllers/TurnController.php`

**Requirements:**

**Part 1 — Immediate start on creation:**
1. In `GameController::store()`: remove the conditional that only starts the game when there are no pending invites. Always call `startGame()` (or the inline equivalent) immediately after creation.
2. `GameService::startGame()` already handles the `state_json`-already-populated path (sets `status = in_progress`, `current_user_id = currentPlayerId` parsed from state). This path will fire correctly for all games since the frontend always sends `state_json` at creation.
3. Call `$game->refresh()` after `startGame()` so the response reflects the updated status and `current_user_id`.
4. Update the `POST /api/games` response to include `state_json` alongside the existing `ApiGameRaw` fields. The frontend needs `state_json` to load directly into the game without a second API call. Full required response shape:
   ```json
   {
     "game": {
       "id": 1, "name": "...", "status": "in_progress", "play_mode": "async_multiplayer",
       "alert_state": "your_turn", "is_my_turn": true, "has_in_progress_actions": false,
       "winner_user_id": null, "players": [...], "current_player_name": "...",
       "round_number": 1, "turn_number": 0, "created_at": "..."
     },
     "state_json": "{...full GameState JSON string...}",
     "invites_sent": [5]
   }
   ```
5. Update `docs/backend/api-contract.md` — `POST /api/games` response — to reflect the new shape with `state_json` included.

**Part 2 — Turn advancement to a pending invitee:**
1. In `TurnController::submit()`, after computing the next `current_user_id` (next non-eliminated human in turn order), add a check: does the next human player have a `pending` `game_invites` record for this game?
2. Query: `GameInvite::where('game_id', $game->id)->where('invitee_id', $nextUserId)->where('status', 'pending')->exists()`
3. If a pending invite exists for the next player:
   - Set `$game->status = 'waiting_for_players'`
   - Set `$game->current_user_id = $nextUserId` (so when they accept, `InviteController::accept()` can detect it's their turn)
   - Do NOT send a "your turn" push notification (they haven't accepted the invite yet)
   - Save the game
4. If no pending invite (they've accepted, or they're the creator with no invite): normal path — stay `in_progress`, send "your turn" notification as before.
5. Update `DELETE /api/games/{id}` guard: currently requires `status = 'waiting_for_players'`. Broaden to also allow deletion when `status = 'in_progress' AND turn_number = 0` (creator has not yet submitted a turn). This lets a creator back out of a game before they've played.

**What not to change:** AI turn handling, elimination logic, round/turn counter advancement, notification service code.

---

### Task 153 — Backend: Invite accept unblocks the game when it's the accepter's turn

**Problem:** Once Tasks 151 and 152 are in place, the game can be in `waiting_for_players` with `current_user_id` pointing to an invited player who hasn't accepted yet. When that player accepts their invite, the game must automatically unblock and transition back to `in_progress` so they can play their turn.

**Files to read first:**
- `app/Http/Controllers/InviteController.php` — `accept()` method (post Task 151 changes)
- `app/Models/Game.php`, `app/Models/GameInvite.php`
- `app/Services/NotificationService.php`
- `docs/backend/api-contract.md` — `POST /api/invites/{id}/accept` response

**Files to modify:**
- `app/Http/Controllers/InviteController.php`

**Requirements:**
1. After updating `game_invite.status = 'accepted'` in the `accept()` transaction, add a check:
   - `$game->current_user_id == $invitee->id AND $game->status == 'waiting_for_players'`
2. If the condition is true:
   - Set `$game->status = 'in_progress'`
   - Save the game
   - Send the invitee a "it's your turn" push notification (same notification that `TurnController::submit()` sends)
3. Set `game_started` in the response: `true` if the game just became `in_progress` for this player (so the frontend can navigate them directly into the game if they're on the invite list screen).
4. The existing "all invites accepted → start game" check (which called `startGame()`) must be removed — the game is already running. The only remaining check is the turn-unblocking logic above.
5. Update `docs/backend/api-contract.md` — `POST /api/invites/{id}/accept` — to document that `game_started: true` now means "the game was waiting for you and is now ready for your turn" rather than "the game just started for the first time".

**What not to change:** Invite decline logic, game cancellation flow, friendship checks, notification service.

---

### Task 154 — Frontend: Navigate directly into game after async game creation

**Problem:** After creating an async multiplayer game, `handleLaunch` in `HomeScreen.tsx` currently returns to the lobby (via `navigation.navigate('Home')` or by doing nothing since we're already on HomeScreen). The user then sees the game in "waiting for players" state. After Tasks 151–153, the backend will start the game immediately and return `state_json` + `is_my_turn: true` in the `POST /api/games` response. The frontend must now use this data to navigate the creator directly into their first turn.

**Files to read first:**
- `src/screens/HomeScreen.tsx` — `handleLaunch` function, the async game creation path
- `src/store/gameStore.ts` — `loadAsyncGame` action
- `src/services/gamesService.ts` — `createGame()`, `CreateGamePayload`, `CreateGameResponse`
- `docs/systems/multiplayer.md` — Turn Flow (Async Multiplayer)
- `docs/systems/save-system.md` — Mid-Turn Resume section (for how `loadAsyncGame` is called)

**Files to modify:**
- `src/services/gamesService.ts`
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. In `gamesService.ts`: update `CreateGameResponse` to include `state_json: string` (the full initial `GameState` JSON string returned by the backend).
2. In `HomeScreen.tsx` `handleLaunch`, async path: after `createGame()` succeeds:
   a. Call `loadAsyncGame()` from the game store, passing the returned game data (id, name, players, etc.) and the `state_json` string — exactly as if the user had tapped an existing "your turn" game card on the lobby.
   b. Navigate to `GameScreen` instead of staying on HomeScreen.
   c. Do NOT call `navigation.navigate('Home')` or reset to lobby.
3. The `useFocusEffect` list refresh on HomeScreen still runs when the player returns from GameScreen (after submitting their first turn) — no change needed there.
4. If `createGame()` fails (network error, 422, etc.): existing error handling (alert + stay on setup screen) is unchanged.
5. The ActivityIndicator on the launch button while the API call is in-flight is unchanged.
6. Update `docs/systems/multiplayer.md` — Async Game Creation section — step 7 from "Creator sees the game in their HomeScreen with `alert_state: 'waiting_for_players'`" to "Creator is taken directly into the game on their first turn."

**What not to change:** Pass-and-play launch path, GameScreen game logic, `loadAsyncGame` internals (no change needed if it already handles the `your_turn` state correctly), any other HomeScreen sections.

---

## Phase 20 — Bug Fix: Multiplayer End Turn Always Fails + Exposes Opponent's Turn

These tasks fix the most critical active bug: in a real multiplayer game between two human users, tapping End Turn shows "Submit Failed — Could not submit your turn." When the user taps OK, they are left viewing and interacting with the other player's turn state. This is both a UX failure and a security breach.

**Root cause (two parts):**

1. **Backend — stale check mismatch when AI players are present:** `TurnController::submit()` checks `$request->turn_number != $game->turn_number`. The backend increments `games.turn_number` by `+1` on each human submit (line 169 in `TurnController.php`). But the frontend's `GameState.turnNumber` increments by `+1` per `resolveTurn` call — once for the human, then once per AI player during `runAiTurnsUntilHuman`. The resulting state stored as `state_json` after a submit therefore has `turnNumber = previous + 1 + N_ai`. When the next human loads that `state_json`, their `preTurnNumber` equals that inflated value. Their submit sends `turn_number = previous + 1 + N_ai` while the backend stores `previous + 1` → 409 Stale turn data on every turn.

2. **Frontend — game state advances before API call succeeds:** `endTurn()` in `gameStore.ts` runs `resolveTurn` + `runAiTurnsUntilHuman` to produce `finalState`, then commits it as the new active state, and THEN calls `submitTurn`. If `submitTurn` fails, `shouldReturnHome` is never set, so the user stays in `GameScreen` — but the game is now showing the next human player's state with full interaction enabled.

---

### Task 159 — Frontend: On submitTurn failure, navigate home instead of leaving user on opponent's turn

**Problem:** After `submitTurn` throws in `endTurn()`, `shouldReturnHome` is never set. The `GameScreen` remains active. Because `endTurn` already resolved the full turn cycle locally before the API call (human turn + all AI turns), the active game state is now the next human player's state. The current user can see that player's planets, resources, and perform all actions on their behalf. This must be fixed immediately.

**Files to read first:**
- `src/store/gameStore.ts` — `endTurn()` function, `shouldReturnHome` flag, the `submitTurn` try/catch block
- `src/screens/GameScreen.tsx` — the `useEffect` watching `shouldReturnHome`, the "Submit Failed" alert logic

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**
1. In `endTurn()`, inside the `catch` block that currently sets `isSubmittingTurn: false` and shows the "Submit Failed" alert: also set `shouldReturnHome: true` in the same `set()` call (or immediately after).
2. The `GameScreen` `useEffect` that already watches `shouldReturnHome` will then trigger navigation home automatically after the alert is dismissed (or at the same time — whichever the existing flow handles).
3. The "Submit Failed" alert copy should be updated to: **"Submit Failed — Could not submit your turn. You have been returned to the lobby."** so the user understands what will happen on OK.
4. `npx tsc --noEmit` must pass clean.

**What not to change:** The success path, pass-and-play `endTurn`, the alert itself (keep the Alert.alert call — just update copy and add `shouldReturnHome`).

---

### Task 160 — Frontend: Surface actual HTTP error code and message in Submit Failed alert

**Problem:** The current "Submit Failed" alert body is always the static string "Could not submit your turn." regardless of the actual HTTP status or backend message. This makes diagnosis impossible — a 403 (not your turn), 409 (stale data), 422 (validation), and 500 (crash) all look identical.

**Files to read first:**
- `src/store/gameStore.ts` — `endTurn()`, the `submitTurn` catch block
- `src/services/apiClient.ts` — `ApiError` class, `status` field, `message` field

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**
1. In the `endTurn()` catch block, check if the caught error is an `ApiError` (instanceof check).
2. If it is, append the HTTP status and backend message to the alert body. Example: **"Submit Failed — Server returned 409: Stale turn data."** or **"Submit Failed — Server returned 403: It is not your turn."**
3. If it is not an `ApiError` (network failure etc.), keep the existing static copy.
4. `npx tsc --noEmit` must pass clean.

**What not to change:** Everything else in `endTurn()`. This task is purely diagnostic — it surfaces the real error code so Task 161 can be targeted at the correct fix.

---

### Task 161 — Backend: Fix `games.turn_number` stale check — counter out of sync when AI players are present

**Problem:** `TurnController::submit()` advances `games.turn_number` by exactly `+1` (line 169) regardless of how many AI players resolved during the same turn cycle. The frontend's `GameState.turnNumber` increments by `+1` per `resolveTurn` call — one for the submitting human, then one per AI player during `runAiTurnsUntilHuman`. The resulting state's `turnNumber` is therefore `game.turn_number + 1 + N_ai`. When this is stored as `state_json` and the next human loads it, their `preTurnNumber` equals this inflated value. Their submit sends `turn_number = game.turn_number + 1 + N_ai` while the backend has `game.turn_number + 1` → always 409.

**Files to read first:**
- `app/Http/Controllers/TurnController.php` — `submit()` method, the stale check (line 103) and turn-number advancement (lines 165–170)
- `docs/backend/database-schema.md` — `games` table: `turn_number`, `round_number`, `state_json`

**Files to modify:**
- `app/Http/Controllers/TurnController.php`

**Requirements:**
1. After the stale check passes, the backend must advance `games.turn_number` to match the `turnNumber` embedded in the submitted `resulting_state` — NOT just `$game->turn_number + 1`.
2. Change the turn-number advancement block (lines 165–170) to:
   ```php
   $newTurnNumber  = (int) ($state['turnNumber']  ?? ($game->turn_number + 1));
   $newRoundNumber = (int) ($state['roundNumber'] ?? $game->round_number);
   ```
   Use `$newTurnNumber` and `$newRoundNumber` in the `$game->update([...])` call.
3. The round-number update logic (`if $state['roundNumber'] > $game->round_number`) is preserved — if the round advanced, reset `turn_number` to the value from the state rather than to 1.
4. The stale check itself (`$request->turn_number != $game->turn_number`) is unchanged — the frontend already sends the pre-resolution value which matches the stored value correctly.
5. After this fix, `games.turn_number` will always equal the `turnNumber` in the current `state_json`, keeping the stale check accurate for subsequent turns.
6. Update `docs/backend/development/known-issues.md` to record this bug and its fix.

**What not to change:** The stale check guard, round-number comparison logic intent, elimination logic, notification logic.

---

## Phase 21 — Feature: Solo Games (Single-Human + AI Only)

These tasks add first-class support for games where the user plays alone against AI opponents. Currently there is no distinction between a "pass and play" game (multiple humans share one device) and a solo game (one human vs AI). The Command Center should make this distinction clear, and the game creation flow should handle it transparently.

---

### Task 162 — Frontend: Silently convert solo-AI "Play with Friends" setup to a local pass-and-play game

**Problem:** When a user selects "Play with Friends" mode but fills all non-slot-0 slots with AI players (no human friends), the app currently calls the backend API to create an async game. This is unnecessary — there is no other human to coordinate with, and the game should behave identically to a local pass-and-play game. The mode switch should be transparent; do not show the user any message or modal about it.

**Files to read first:**
- `src/screens/HomeScreen.tsx` — `handleLaunch()`, the `playMode` fork (`asyncMultiplayer` vs `passAndPlay`)
- `src/store/gameStore.ts` — `startNewGame()`, `GameRecord`, `GameConfig.playMode`
- `src/game/types.ts` — `PlayerSlot`, `PlayMode`

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. In `handleLaunch()`, before the `playMode === 'asyncMultiplayer'` branch executes, check whether ALL non-slot-0 `PlayerSlot` entries have `type === 'ai'` (i.e., no `userId` and no human type).
2. If ALL non-creator slots are AI: silently call `startNewGame(config)` as if it were a pass-and-play game (the same local path used today). No API call, no `ActivityIndicator` waiting, no "Play with Friends" flow.
3. Additionally, tag the resulting `GameRecord` as a solo game. The cleanest way: set `isSolo: true` on the `GameRecord` (add the optional field). Alternatively, `isSolo` can be derived from the `GameConfig` at render time if `playerSlots` are stored: a game is solo if it has exactly 1 human slot (slot 0) and 1+ AI slots AND no `asyncGameId`. Choose whichever approach avoids adding new store actions.
4. If at least one non-creator slot has a human friend selected: proceed with the existing async API creation path unchanged.
5. `npx tsc --noEmit` must pass clean.

**What not to change:** The async game creation path when real human friends are present, all pass-and-play setup, the friend picker modal.

---

### Task 163 — Frontend: Add "Solos" section to the Command Center for single-human games

**Problem:** The Command Center currently has two sections for local games: "Pass & Play" (all local games, regardless of player composition). With Task 162 in place, solo games (1 human + AI only) are local `GameRecord`s but conceptually different from multi-human pass-and-play sessions. They should be surfaced separately so the user can distinguish "my solo campaigns" from "games I'm passing with someone else."

**Files to read first:**
- `src/screens/HomeScreen.tsx` — the lobby render, the **Pass & Play** section (filtered by `asyncGameId == null`), `GameRecord` type
- `src/store/gameStore.ts` — `GameRecord`, `games[]` state
- `src/game/types.ts` — `PlayerSlot`, `GameConfig`

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. Define a helper `isSoloGame(record: GameRecord): boolean` that returns `true` when:
   - `record.asyncGameId` is null/undefined (it's a local game), AND
   - The game has exactly 1 human player slot (slot 0 — the user) with all other slots being AI. Use the stored `GameConfig.playerSlots` (already in `GameRecord.config`) to check — a solo game has no `playerSlot` with `type !== 'ai'` except slot index 0.
2. Split the existing **Pass & Play** section into two:
   - **Solos** — `GameRecord`s where `isSoloGame(record)` is `true`. Listed first (above Pass & Play).
   - **Pass & Play** — `GameRecord`s where `asyncGameId == null` AND `!isSoloGame(record)` (multi-human local games). Listed second.
3. Both sections follow the existing card tap-to-resume behavior. Both sections are hidden when empty (same as the current Pass & Play behavior).
4. The section header copy: `"Solos"` and `"Pass & Play"`. Styling should match the existing async game section headers.
5. `npx tsc --noEmit` must pass clean.

**What not to change:** The "Play with Friends" async games section, invite section, any game logic or store. No new store actions needed.

---

## Phase 22 — Feature: Delete Any Created Game

---

### Task 164 — Frontend: Add delete button to Pass & Play and Solo game cards

**Problem:** The Command Center currently only shows a **Delete** button on "Play with Friends" (async) game cards, and only for the creator. There is no way to delete a local pass-and-play or solo game from the lobby — the user is stuck with finished or abandoned games accumulating in their list.

**Files to read first:**
- `src/screens/HomeScreen.tsx` — the **Pass & Play** section render, the `AsyncGameCard` component for reference on how delete is wired there, `deleteGame` usage in the async section
- `src/store/gameStore.ts` — `deleteGame(id: string)` action (removes `GameRecord` from `games[]` by id)

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. Each card in both the **Solos** and **Pass & Play** sections should show a **Delete** button (or trash icon) in the same style as the async card delete.
2. Tapping delete shows a confirmation `Alert.alert`: **"Delete Game"** / **"Are you sure you want to delete this game? This cannot be undone."** with Cancel and Delete actions.
3. On confirmation, call `deleteGame(record.id)` from the game store. This removes the record from Zustand immediately — no API call needed (local games are client-side only).
4. The card disappears from the list immediately after deletion (Zustand reactivity handles this automatically).
5. `npx tsc --noEmit` must pass clean.

**What not to change:** The async game delete flow (API call + Zustand removal), game logic, any other HomeScreen sections.

---

## Phase 23 — Feature: Persist Local Games (Pass & Play / Solo) to AsyncStorage

Pass & Play and Solo games currently live only in Zustand (in-memory). They survive "Exit to Home" within a session (Task 149) but are wiped on every app restart. Users lose all local campaigns when they close the app.

**Chosen approach: AsyncStorage (local device storage)**

`@react-native-async-storage/async-storage` is already installed. Zustand's `persist` middleware supports it natively. No backend changes are required — local games are device-bound by design (Pass & Play is a shared-device experience; Solo has no other players to sync). This is a frontend-only change: two tasks.

---

### Task 165 — Frontend: Persist local GameRecords to AsyncStorage via Zustand persist middleware

**Problem:** `gameStore.games[]` is in-memory only. Every app restart wipes all Pass & Play and Solo campaigns from the lobby.

**Files to read first:**
- `src/store/gameStore.ts` — full store shape, `games[]`, `GameRecord`, `deleteGame`, `startNewGame`, `loadAsyncGame`
- `src/game/types.ts` — `GameRecord`, `GameConfig`, `GameState`
- `docs/systems/save-system.md` — current save architecture (async games use backend; local games are in-memory only)

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**
1. Import `persist` and `createJSONStorage` from `zustand/middleware` and `AsyncStorage` from `@react-native-async-storage/async-storage`.
2. Wrap the `create(...)` call with `persist(...)`. Use the storage key `'gaza-galaxy-local-games'` and `version: 1`.
3. Use `partialize` to persist only the `games` array, filtered to local games (`asyncGameId == null`). All other state (`activeGameId`, `turnReport`, `isSubmittingTurn`, `shouldReturnHome`, etc.) must NOT be persisted — they are volatile session state.
   ```ts
   partialize: (state) => ({
     games: state.games.filter((g) => !g.asyncGameId),
   }),
   ```
4. Set `storage: createJSONStorage(() => AsyncStorage)`.
5. Expose `_hasHydrated: boolean` on the store, initialised to `false`. Set it to `true` in the `onRehydrateStorage` callback so components can gate rendering until local games have loaded:
   ```ts
   onRehydrateStorage: () => () => {
     useGameStore.setState({ _hasHydrated: true });
   },
   ```
6. The `deleteGame` action already removes records from `games[]`; Zustand persist will automatically sync the deletion to AsyncStorage — no extra code needed.
7. `npx tsc --noEmit` must pass clean.

**What not to change:** Async game loading/fetching (those records are not persisted), all game logic, all other store actions. The `asyncGameId != null` guard in `partialize` ensures async games are never written to AsyncStorage.

---

### Task 166 — Frontend: Guard HomeScreen local-game sections against hydration flash

**Problem:** Zustand's persist middleware rehydrates from AsyncStorage asynchronously. During the brief window before hydration completes, `games[]` is `[]`, which causes the Solos and Pass & Play sections to flash an empty state (or "No games yet") before the saved games appear.

**Files to read first:**
- `src/screens/HomeScreen.tsx` — the Solos and Pass & Play section render, any existing loading states
- `src/store/gameStore.ts` — `_hasHydrated` flag added in Task 165

**Files to modify:**
- `src/screens/HomeScreen.tsx`

**Requirements:**
1. Read `_hasHydrated` from the game store in `HomeScreen`.
2. While `!_hasHydrated`, suppress rendering of the **Solos** and **Pass & Play** sections entirely (render `null` for those sections). Do NOT show a spinner — the async games list and invite sections should render normally during hydration (they have their own loading state). The local sections simply appear once the store is ready.
3. Once `_hasHydrated` is `true`, render both sections as normal (existing behavior).
4. `npx tsc --noEmit` must pass clean.

**What not to change:** The "Play with Friends" section, invite section, friends badge, any game logic or store actions. This is a display-only guard.

---

## Phase 24 — Bug Fix: Solo Game "Start Turn" Screen

Three issues with the pass-and-play lock screen (the "Start Turn" interstitial shown between human turns) that affect solo games and all pass-and-play games.

---

### Task 167 — Frontend: Show "Start Turn" lock screen in solo games between turns

**Problem:** When a solo game is created via the "Play with Friends" setup flow (silently converted to a local game by Task 162 when all non-creator slots are AI), ending a turn skips the "Start Turn" lock screen entirely. The game immediately begins the human player's next turn without any interstitial. This is unexpected — the screen should appear so the player can review the previous round's outcome before resuming.

**Root cause to investigate:** Solo games produced by Task 162 go through `startNewGame()` with a `passAndPlay` play mode. When `endTurn()` runs after AI turns complete, the lock screen logic in `GameScreen` may be gating on player count (e.g., requiring more than one human player) or on `playMode` in a way that skips the interstitial for 1-human games. Trace `showLockScreen` / `lockScreen` state and the condition under which it is set to `true` after `runAiTurnsUntilHuman` resolves.

**Files to read first:**
- `src/screens/GameScreen.tsx` — lock screen render logic, `showLockScreen` state, `endTurn` flow
- `src/store/gameStore.ts` — `endTurn()`, `runAiTurnsUntilHuman()`, `GameRecord`, `isSolo` field
- `src/game/types.ts` — `PlayMode`, `GameConfig`, `PlayerSlot`

**Files to modify:**
- `src/screens/GameScreen.tsx` (and possibly `src/store/gameStore.ts`)

**Requirements:**
1. After every `endTurn()` in a local pass-and-play or solo game, once all AI turns have resolved and the game state has advanced to the next human turn, the "Start Turn" lock screen MUST be shown — regardless of how many human players the game has.
2. The current guard (if any) that suppresses the lock screen when only one human player exists must be removed or corrected.
3. The lock screen must display the name of the player whose turn is starting (already the existing behavior for multi-human pass-and-play games).
4. `npx tsc --noEmit` must pass clean.

**What not to change:** Async multiplayer games (they navigate home on `endTurn`, not to the lock screen), the Victory / Game Over modal, the knockout acknowledgement flow.

---

### Task 168 — Frontend: Remove auto-dismiss from the "Start Turn" lock screen

**Problem:** The "Start Turn" lock screen currently auto-dismisses after 1.5 seconds, advancing to the next turn automatically without any user interaction. This was added as a convenience feature but creates a bad UX: the player may miss the screen entirely if they look away for a moment, and in longer games the constant auto-advance feels jarring. The screen should remain visible until the player taps **"Start Turn"**.

**Root cause:** A `setTimeout` (or equivalent Animated delay) in `GameScreen` triggers `acknowledgeLockScreen()` / sets `showLockScreen: false` after ~1500 ms. This must be removed.

**Files to read first:**
- `src/screens/GameScreen.tsx` — lock screen render, any `setTimeout` or auto-advance timer referencing the lock screen
- `src/store/gameStore.ts` — any store-side timer that advances past the lock screen

**Files to modify:**
- `src/screens/GameScreen.tsx` (and `src/store/gameStore.ts` if the timer lives there)

**Requirements:**
1. Remove the auto-dismiss timer entirely. The lock screen must not dismiss on its own under any circumstances.
2. The only way to advance past the lock screen is for the user to tap the **"Start Turn"** button.
3. The **"Start Turn"** button's existing `onPress` handler is unchanged in behaviour — it just must now be the exclusive way the screen closes.
4. `npx tsc --noEmit` must pass clean.

**What not to change:** The lock screen layout, the player name display, the "Start Turn" button itself, async game flow, Victory/Game Over modals.

---

### Task 169 — Frontend: Add "Exit to Home" button on the "Start Turn" lock screen

**Problem:** Once the "Start Turn" lock screen appears there is no way for the player to leave the game — they are forced to start the next turn or kill the app. The screen needs an exit button so the player can return to the Command Center (home screen) from this interstitial.

**Files to read first:**
- `src/screens/GameScreen.tsx` — lock screen render, how the ⋮ menu "Exit Game" / "Exit to Home" action is handled, navigation pattern used by other exit flows (`shouldReturnHome`, `navigation.navigate('Home')`, etc.)
- `src/store/gameStore.ts` — `resetGame()`, `shouldReturnHome`, any relevant navigation actions

**Files to modify:**
- `src/screens/GameScreen.tsx`

**Requirements:**
1. Add an **"Exit"** (or **"Home"**) button to the lock screen. Style it consistently with the rest of the lock screen UI — a secondary/ghost button or a small icon button in the corner is acceptable. It must be clearly tappable.
2. Tapping the button navigates the player back to the Home screen using the same pattern as the existing "Exit to Home" menu action (e.g., `navigation.navigate('Home')` or setting `shouldReturnHome: true`). The current game record must NOT be deleted — the game should still appear in the lobby so the player can resume it later.
3. The exit button must be visually distinct from the **"Start Turn"** primary action so players do not accidentally tap it.
4. `npx tsc --noEmit` must pass clean.

**What not to change:** The "Start Turn" button, lock screen layout beyond adding the exit button, async game flow, game deletion logic, Victory/Game Over modals.

---

## Phase 25 — UX Tweak: Reduce Home Planet Snap Zoom on Turn Start

One task to reduce how far the camera zooms in when snapping to the human player's home planet at the start of their turn.

---

### Task 170 — Frontend: Halve the default home-planet snap zoom level

**Problem:** When a player's turn begins the camera snaps to their home planet at `HOME_PLANET_SNAP_SCALE = 2.0`. This is too zoomed in — the player cannot see enough of the surrounding map context at a glance. The snap zoom should be reduced to `1.0` (half the current value) so the home planet is still centered on screen but the visible map area is doubled.

**Files to read first:**
- `src/screens/GameScreen.tsx` — `HOME_PLANET_SNAP_SCALE` constant (line ~448), `snapToHomePlanet()` function (line ~618), `animateMapToSnap` callback, and the two `useEffect` hooks that call `snapToLocalHumanHomePlanet()` (initial game load snap and post-lock-screen snap)

**Files to modify:**
- `src/screens/GameScreen.tsx`

**Requirements:**
1. Change the constant `HOME_PLANET_SNAP_SCALE` from `2.0` to `1.0`.
2. No other logic, layout, animation, or behaviour should change — only the numeric value of the constant.
3. `npx tsc --noEmit` must pass clean.

**What not to change:** The snap animation itself, the clamping logic in `snapToHomePlanet`, any other zoom constants (`MIN_SCALE`, `MAX_SCALE`, pinch-zoom behaviour), lock screen logic, pass-and-play flow.

---

## Phase 26 — Map Tuning: Tighter Planet Spacing

One task to bring planets closer together on average without changing map generation algorithms, galaxy shapes, connectivity pass, or spawn placement.

---

### ~~Task 171 — Frontend: Reduce average inter-planet distance by ~1.5 clicks~~ *(complete 2026-05-31)*

**Problem:** Planets feel slightly too spread out. The product owner wants the same maps the generator would produce today — same seeds, shapes, planet counts, and placement flow — but with pairwise distances roughly 1.5 clicks shorter on average so the galaxy feels a bit denser and early expansion is snappier.

**Goal:** Tune distance constants only. Do **not** change placement algorithms, galaxy shape logic, bounding-box normalization, connectivity/bridge pass, spawn placement, or planet class distribution.

**Files to read first:**
- `src/game/mapGenerator.ts` — `MIN_PLANET_DISTANCE`, `growthPosition()` distance sample (`4 + rng() * 7`), and `isFarEnough()` usage across all four galaxy shapes (`scattered`, `arms`, `dense_core`, `ring`)
- `docs/systems/map-generation.md` — current documented distance values

**Files to modify:**
- `src/game/mapGenerator.ts`

**Requirements:**
1. **`scattered` shape (primary lever):** In `growthPosition()`, reduce the parent-offset distance sample from `4 + rng() * 7` (uniform [4, 11], mean ~7.5) to `2.5 + rng() * 7` (uniform [2.5, 9.5], mean ~6.0) — a 1.5-click reduction in the sampled offset before rounding.
2. **All shapes (minimum spacing):** Reduce `MIN_PLANET_DISTANCE` from `4` to `2.5` so the tighter growth offsets are not capped back to 4 clicks by the rejection pass. This is a constant tune, not an algorithm change — the same `isFarEnough` check runs unchanged.
3. **Do not change:** `ensureConnectivity()` threshold (11 clicks), bridge placement logic, virtual canvas sizing, bounding-box normalization, `PLANET_EDGE_PADDING`, galaxy shape selection, planet count / grid sizing formulas, or anything in `spawnPlacer.ts`.
4. **Sanity check:** Generate several maps (multiple seeds, all four galaxy shapes, small/medium/large). Confirm planets are visibly closer but maps still place successfully without placement-failure throws. Spot-check that home-planet fairness in `spawnPlacer.ts` is unaffected (spawn logic reads final positions only).
5. `npx tsc --noEmit` must pass clean.

**Docs to update:** `docs/systems/map-generation.md`, `docs/development/current-state.md`, `docs/tasks/backlog.md`, `docs/tasks/completed.md`

**What not to change:** Map creation process, galaxy shape algorithms, connectivity pass, spawn placement, planet class weights, grid sizing formulas, backend API.

---

## Phase 27 — Bug Fix: Map Scrolls Slightly When Starting a Fleet Drag

The map shifts a small but noticeable amount the moment a player begins dragging from an owned planet to dispatch troops. This happens because the `pan` (map-scroll) gesture and `fleetDrag` gesture run simultaneously, and the `pan` processes the first ~10 pixels of movement before `fleetDrag` activates and sets `isFleetDragging = true` to block it.

---

### Task 172 — Frontend: Block map pan immediately when a drag begins on an owned planet

**Problem:** When the player touches an owned planet and starts dragging (to dispatch a fleet), the map scrolls slightly (~10 px) before the fleet drag "wins" the gesture race. The UX feels clunky because the map drifts before locking in.

**Root cause:** The gesture composition in `GameScreen` is:

```
const composed     = Gesture.Simultaneous(pinch, pan);
const planetFleet  = Gesture.Exclusive(fleetDrag, planetTap);
const mapGesture   = Gesture.Simultaneous(composed, planetFleet, measureDrag);
```

`fleetDrag` uses `.minDistance(10)`, so for the first 10 pixels of movement the fleet drag handler has not yet fired, `isFleetDragging` is still `false`, and the `pan` gesture's `onUpdate` — which checks `isFleetDragging.value` before scrolling — is free to move the map. Once movement exceeds 10 px, `fleetDrag.onUpdate` calls `handleDragStart`, which detects the owned planet and finally sets `isFleetDragging = true`, blocking further pan updates. But those first 10 px of scroll have already happened.

**Fix:** Set `isFleetDragging.value = true` in `fleetDrag.onBegin` (or `fleetDrag.onStart`) — before any `onUpdate` fires — by checking whether the initial touch position lands on an owned planet. If it does, block the pan immediately. If it does not (non-owned planet or empty map), leave `isFleetDragging` false so the pan runs normally.

Concretely:
1. Add a `fleetDrag.onBegin(e => { ... })` handler (runs on the UI thread / worklet).
2. Inside that handler, convert the touch screen coordinates to map coordinates using the same `screenToMapCoords` helper already used in `handleFleetPanUpdate` / `handleDragStart`.
3. Call `findPlanetAtMapCoords` with those coordinates and the current scale.
4. If a planet is found AND it is owned by the local human player, set `isFleetDragging.value = true` immediately.
5. Reset `isFleetDragging.value = false` in `fleetDrag.onFinalize` as it is today (no change needed there).

This means the pan is blocked from the very first movement event rather than after 10 px of scroll.

**Files to read first:**
- `src/screens/GameScreen.tsx` — `fleetDrag` gesture definition (around line 1971), `handleFleetPanUpdate` / `handleDragStart`, `screenToMapCoords`, `findPlanetAtMapCoords`, `isFleetDragging` shared value, and the existing `pan.onUpdate` guard (`if (isFleetDragging.value || isPinching.value) return`)
- `docs/development/current-state.md` — Tasks 61, 64, 73 entries for gesture-composition history

**Files to modify:**
- `src/screens/GameScreen.tsx`

**Requirements:**
1. Add an `onBegin` handler to `fleetDrag` that sets `isFleetDragging.value = true` when the touch-down point maps to an owned planet.
2. The handler must run as a worklet (annotate with `'worklet'` or use `runOnUI` as appropriate for RNGH v2 / Reanimated 3).
3. `fleetDrag.onFinalize` already resets `isFleetDragging.value = false` — do not change that.
4. Existing `fleetDrag.onUpdate` / `handleDragStart` logic is unchanged — `handleDragStart` still performs the authoritative ownership check and sets `fleetDragOriginPlanetRef`.
5. The fix must not affect pinch-zoom, measure-drag (non-owned planet distance measurement), or the `Exclusive(fleetDrag, planetTap)` tap priority.
6. `npx tsc --noEmit` must pass clean.

**What not to change:** `minDistance(10)` on `fleetDrag` (still needed so a stationary tap on an owned planet resolves as a tap rather than a drag), `measureDrag` gesture, pan/pinch behaviour on empty map areas, fleet dispatch modal logic, store actions.

---

## Phase 28 — Feature: AI Observer Mode

Six tasks to enable a debug/observation mode for solo and pass-and-play games. When "Watch AI Turns" is enabled, each AI player's planned turn is staged — displayed but not yet resolved — so the human can see the AI's fleet-dispatch arrows on the map and review all their orders in a read-only panel before tapping "End Turn" to advance. This repeats for every consecutive AI player in sequence.

**Background — current AI turn flow:**
`endTurn()` in `gameStore.ts` resolves the human's actions, then immediately calls `runAiTurnsUntilHuman()`, which loops synchronously through every consecutive AI player's `computeAiTurn()` + `resolveTurn()` with no yield or pause. All AI turns are invisible to the player. The goal of Phase 28 is to make that loop pausable so each AI turn can be inspected.

**Key data structures:**
- `computeAiTurn(state, playerId): TurnInput` — returns the AI's planned actions without modifying state
- `TurnInput.actions: PlayerAction[]` — one of `SEND_FLEET | BUILD | SET_PRODUCTION_SLIDER | END_TURN`
- `PendingFleet = { fromPlanetId, toPlanetId, shipCount }` — same shape as `SEND_FLEET` action (minus the `type` field)
- The `FleetLayer` component already renders `queuedOrders: PendingFleet[]` as dashed arrows; this layer will be extended to also render the AI's pending fleet orders

---

### ~~Task 173 — Frontend: Add `aiObserverMode` store flag and "Watch AI Turns" toggle to new-game setup~~ *(complete 2026-05-31)*

**Goal:** Introduce an `aiObserverMode: boolean` session preference into the Zustand store and expose a toggle in the new-game setup screen so the player can turn on observation before starting a solo or pass-and-play game.

**Files to read first:**
- `src/store/gameStore.ts` — top-level store state interface and `startNewGame` action to understand where session-level preferences live; look for any existing local-prefs or UI flags (e.g., `showingLockScreen`, `aiObserverMode` — if it already exists, do not re-add it)
- `src/screens/` — find the new-game setup screen (likely `NewGameSetupScreen.tsx`, `NewGameScreen.tsx`, or similar); read it fully to understand the current toggle/picker layout and where to insert the new control

**Files to modify:**
- `src/store/gameStore.ts`
- The new-game setup screen file identified above

**Requirements:**
1. Add `aiObserverMode: boolean` to the Zustand store's top-level state, defaulting to `false`. This is a **session preference** — it is not stored per `GameRecord`, not persisted to AsyncStorage, and resets to `false` on app reload.
2. Add a `setAiObserverMode(value: boolean): void` action.
3. In the new-game setup screen, add a labelled toggle row:
   - **Primary label:** "Watch AI Turns"
   - **Subtitle/description:** "Pause after each AI turn to review its moves"
   - Position: ~~below the AI difficulty selector~~ *(obsolete as of 2026-05-31 Task 172)* or below the last AI-related setting, above the "Start Game" / "Launch" button
4. Wire the toggle's `value` to `aiObserverMode` and `onValueChange` to `setAiObserverMode`.
5. The toggle should only be visible when at least one AI player is included in the game setup. If the screen does not have a per-slot AI check readily available, always show it (acceptable fallback).
6. `npx tsc --noEmit` must pass clean.

**What not to change:** Any existing game-start logic, `startNewGame` action, async multiplayer flow, backend API calls, `GameRecord` schema.

---

### ~~Task 174 — Frontend: Add staged-AI-turn fields to the store and `clearAiObserver()` action~~ *(complete 2026-05-31)*

**Goal:** Extend the Zustand store with the three fields needed to hold a single AI player's planned-but-unresolved turn, plus a reset action. No behaviour changes yet — this task is infrastructure only.

**Files to read first:**
- `src/store/gameStore.ts` — full store state interface (top ~120 lines) and the `GameStoreState` / `GameStoreActions` type definitions to understand how to add new fields cleanly; `aiObserverMode` added in Task 173 will be present
- `src/game/types.ts` — `TurnInput` and `PlayerAction` interfaces

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**
1. Add three new fields to the store state:
   - `showingAiObserver: boolean` — `true` while the game is paused on an AI player's staged turn; default `false`
   - `pendingAiTurnInput: TurnInput | null` — the `TurnInput` computed by `computeAiTurn()` for the staged AI player, not yet passed to `resolveTurn()`; default `null`
   - `pendingAiPlayerId: string | null` — the `Player.id` of the AI whose turn is staged; default `null`
2. Add a `clearAiObserver(): void` action that resets all three to their defaults in a single `set()` call.
3. Do NOT modify `endTurn()`, `runAiTurnsUntilHuman()`, or any other action yet — behaviour is unchanged by this task.
4. `npx tsc --noEmit` must pass clean.

**What not to change:** Existing store fields, `GameRecord`, any game logic, any screen code.

---

### ~~Task 175 — Frontend: Modify `endTurn()` to stage AI turns and add `advanceStagedAiTurn()`~~ *(complete 2026-05-31)*

**Goal:** When `aiObserverMode` is `true`, `endTurn()` must pause after the human's turn resolves — computing the first AI player's `TurnInput` but not resolving it. A new `advanceStagedAiTurn()` action resolves the staged turn and either stages the next consecutive AI (if any) or resumes normal play.

**Files to read first:**
- `src/store/gameStore.ts` — `endTurn()` (line ~723) in full; `runAiTurnsUntilHuman()` (line ~232) in full; the `showLock` calculation at the end of `endTurn()` (line ~783); the new fields from Tasks 173–174 (`aiObserverMode`, `showingAiObserver`, `pendingAiTurnInput`, `pendingAiPlayerId`, `clearAiObserver`)
- `src/game/aiEngine.ts` — `computeAiTurn(state: GameState, playerId: string): TurnInput` signature (line ~981)
- `src/game/turnEngine.ts` — `resolveTurn(state: GameState, input: TurnInput): ResolveTurnResult` signature and `stripTurnEvents()` helper

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**

**Part A — Modify `endTurn()`:**
1. After `resolveTurn` resolves the **human player's** actions (producing a `ResolveTurnResult`), check `get().aiObserverMode`.
2. If `aiObserverMode` is `true`:
   a. Inspect the resulting `currentPlayerId` on the resolved state. If that player is an AI (i.e., `Player.isAI === true`) and not eliminated, call `computeAiTurn(resolvedState, resolvedState.currentPlayerId)` to obtain their `TurnInput` — **do not** call `resolveTurn` with it.
   b. Call `set({ gameState: resolvedState, showingAiObserver: true, pendingAiTurnInput: aiInput, pendingAiPlayerId: resolvedState.currentPlayerId, showingLockScreen: false })`.
   c. Return early — do not call `runAiTurnsUntilHuman`.
   d. If the next player after the human is NOT an AI (e.g., pass-and-play with the next slot also human), fall through to the existing `runAiTurnsUntilHuman` + lock-screen path unchanged.
3. If `aiObserverMode` is `false`, the existing `runAiTurnsUntilHuman` path is **completely unchanged**.

**Part B — Add `advanceStagedAiTurn()`:**
1. Read `pendingAiTurnInput` and the current `gameState` from the store.
2. Call `resolveTurn(gameState, pendingAiTurnInput)` to produce `aiResult`.
3. After resolution:
   - Check `aiResult.currentPlayerId`. If that player is an AI, not eliminated, **and** `get().aiObserverMode` is still `true`: compute the next AI's `TurnInput`, set `gameState = stripTurnEvents(aiResult)`, update `pendingAiTurnInput` / `pendingAiPlayerId` — stay in observer mode.
   - Otherwise: call `clearAiObserver()`, set `gameState = stripTurnEvents(aiResult)`, and apply the normal lock-screen logic (`showLock = playMode === 'passAndPlay' && status === 'active'`).
4. Accumulate `TurnEvent[]` from all steps (append `aiResult.events` to a local `allEvents` array) and store them the same way `runAiTurnsUntilHuman` currently does (check how events are used post-resolution — e.g., knockout detection — and replicate that logic here).

**What not to change:** `runAiTurnsUntilHuman` itself (still used when observer mode is off), async multiplayer submit flow, `acknowledgeKnockout` (it calls `runAiTurnsUntilHuman` directly — leave it calling the same function; observer mode only applies to the main `endTurn` path for now).

---

### ~~Task 176 — Frontend: GameScreen observer overlay — banner, disabled interactions, AI fleet arrows~~ *(complete 2026-05-31)*

**Goal:** When `showingAiObserver` is `true`, overlay the GameScreen with a banner identifying whose AI turn is being watched, disable all human map interactions, and render the AI's planned `SEND_FLEET` actions as dashed arrows on the galaxy map in the AI player's color.

**Files to read first:**
- `src/screens/GameScreen.tsx` — full file; pay particular attention to:
  - Lock screen overlay block (line ~2922) — structural reference for a full-screen overlay
  - `isHumanTurn` derivation (line ~2148) and every place it gates interactivity (gesture enable flags, button visibility)
  - `FleetLayer` component (lines ~873–919) — how `queuedOrders: PendingFleet[]` are rendered as dashed arrows, the color used, and the `PendingFleet` type shape
  - Top status-bar block (line ~2188) showing "Your turn" / "AI's turn" text
  - How `players` array and `Player.color` are accessed
- `src/store/gameStore.ts` — `showingAiObserver`, `pendingAiPlayerId`, `pendingAiTurnInput` added in Tasks 174–175
- `src/game/types.ts` — `Player` interface, `PendingFleet` type (if defined in types or in the store)

**Files to modify:**
- `src/screens/GameScreen.tsx`

**Requirements:**

1. **Derive observer values** near the top of the component (alongside `isHumanTurn` etc.):
   ```ts
   const showingAiObserver = useGameStore(s => s.showingAiObserver);
   const pendingAiPlayerId = useGameStore(s => s.pendingAiPlayerId);
   const pendingAiTurnInput = useGameStore(s => s.pendingAiTurnInput);
   const pendingAiPlayer = players.find(p => p.id === pendingAiPlayerId) ?? null;
   ```

2. **Disable interactions:** When `showingAiObserver` is `true`, treat the screen as non-interactive for the human. The simplest approach: add `|| showingAiObserver` to every existing `!isHumanTurn` guard that disables planet taps, fleet drag, and the build panel. Do not restructure any gesture logic — just extend the existing guards.

3. **Banner:** Render a non-full-screen banner strip at the top of the screen (below `insets.top`) when `showingAiObserver` is true:
   - Text: `"Watching: {pendingAiPlayer?.name ?? 'AI'}'s Turn"`
   - A small color swatch or pill in `pendingAiPlayer?.color`
   - Style it distinctly from the normal status bar (e.g., semi-transparent dark background, slightly larger font, centered)
   - Must not obscure the galaxy map significantly — keep it to ~44–56 pt tall

4. **AI fleet arrows:** Add a prop `aiObserverOrders: PendingFleet[]` to `FleetLayer`. Inside `FleetLayer`, render these arrows using the same dashed-arrow logic as `queuedOrders` but using the AI player's color (pass `pendingAiPlayer?.color` as a second new prop `aiObserverColor: string | undefined`). When `showingAiObserver` is false, pass `aiObserverOrders={[]}`.

   Derive the fleet list in the parent:
   ```ts
   const aiObserverFleets: PendingFleet[] = showingAiObserver && pendingAiTurnInput
     ? pendingAiTurnInput.actions
         .filter(a => a.type === 'SEND_FLEET')
         .map(a => ({ fromPlanetId: (a as any).fromPlanetId, toPlanetId: (a as any).toPlanetId, shipCount: (a as any).shipCount }))
     : [];
   ```
   (Use proper type narrowing if `PlayerAction` is a discriminated union — cast or use `a.type === 'SEND_FLEET'` guard.)

5. **Status bar text:** When `showingAiObserver` is true, update the `"Your turn"` / `"AI's turn"` status text to `"Watching: {pendingAiPlayer?.name}'s Turn"` (the banner from requirement 3 may make this redundant, but update it for consistency).

6. `npx tsc --noEmit` must pass clean.

**What not to change:** Fog-of-war logic (`getLocalHumanPlayerId`, `useVisibleGameState`) — the map remains from the human's perspective; `FleetLayer` rendering of actual in-transit fleets or the human's own `queuedOrders`; lock screen; async multiplayer code path; knockout overlay.

---

### ~~Task 177 — Frontend: Read-only AI actions panel (observer-mode queued orders modal)~~ *(complete 2026-05-31)*

**Goal:** When `showingAiObserver` is true, show a badge button (parallel to the human's queued-orders button) that opens a read-only modal listing all of the AI's planned actions — fleet dispatches, build orders, and slider changes.

**Files to read first:**
- `src/screens/GameScreen.tsx` — the human's queued-orders badge button (search for `queuedOrderCount` / `showQueuedModal` around line 1350); the queued orders modal (lines ~2668–2744); how planet names are looked up from `gameState.map.planets`; `BuildingType` label rendering (if any exists already)
- `src/game/types.ts` — `PlayerAction`, `BuildingType` enum/union values
- `src/store/gameStore.ts` — `pendingAiTurnInput` (actions array) and `pendingAiPlayerId`

**Files to modify:**
- `src/screens/GameScreen.tsx`

**Requirements:**

1. **Badge button:** When `showingAiObserver` is `true`, show a badge button in a consistent position near the top or bottom controls. Badge count = number of non-`END_TURN` actions in `pendingAiTurnInput?.actions`. Label the button "Orders" (or an icon matching the human's queue button). Tapping it sets local state `showAiActionsModal = true`.

2. **Modal state:** Add `const [showAiActionsModal, setShowAiActionsModal] = useState(false)` local state. Close it when `showingAiObserver` becomes `false` (via `useEffect`).

3. **Modal content — read-only list:** Group and render the AI's actions:
   - **Fleet dispatches** (`SEND_FLEET`): `"[OriginPlanetName] → [DestPlanetName] · [shipCount] ships"` — look up planet names via `gameState.map.planets.find(p => p.id === a.fromPlanetId)?.name`.
   - **Build orders** (`BUILD`): `"Build [label] on [PlanetName]"` — map `buildingType` to human-readable label: `'factory'` → `"Factory"`, `'researchLab'` → `"Research Lab"` (add other types if they exist).
   - **Slider changes** (`SET_PRODUCTION_SLIDER`): `"[PlanetName]: [Math.round(value * 100)]% troops"`.
   - No cancel buttons — fully read-only.
   - If `pendingAiTurnInput` has zero non-`END_TURN` actions: show `"No orders this turn."` as the sole list item.

4. **Dismiss:** Modal closes when the user taps a "Close" button at the bottom, or when `showingAiObserver` becomes `false`.

5. The human's existing queued-orders modal (`showQueuedModal`) and all its cancel logic must be completely unaffected.

6. `npx tsc --noEmit` must pass clean.

**What not to change:** Human queued-orders modal, `queuedOrders` in store, `showQueuedModal` state, async multiplayer paths.

---

### ~~Task 178 — Frontend: "End Turn" button in observer mode wired to `advanceStagedAiTurn()`~~ *(complete 2026-05-31)*

---

### ~~Task 179 — Frontend: Revamp AI observer to use the AI player's full turn perspective~~ *(complete 2026-05-31)*

**Problem:** The current observer UI (Tasks 176–177) adds a separate overlay, a separate Orders modal, and disables all planet interactions. What the player actually needs is to see the AI's turn exactly as if they were sitting in the AI's seat: their fog of war, their owned planets tappable with the normal planet detail panel, their queued fleet orders in the standard arrows/modal — with only the edit controls (slider, build, fleet drag) blocked.

**Approach:** Switch `useVisibleGameState()` to render from the AI player's perspective when observer mode is active. This automatically gives correct fog of war and makes `localHumanPlayerId` resolve to the AI's ID, which in turn makes `isHumanTurn = true`, unlocking planet taps and the queued orders display with zero extra wiring. Set `queuedOrders` to the AI's fleet actions so existing arrow rendering and the existing modal handle them for free. Remove the now-redundant separate overlay UI from Tasks 176–177.

**Files to read first:**
- `src/store/gameStore.ts` — `useVisibleGameState()` (export), `visibleStateForRecord()`, `buildVisibleState()`, `getLocalHumanPlayerId()`, the `endTurn()` observer branch (where `queuedOrders: []` is set), `advanceStagedAiTurn()`, and `clearAiObserver()`
- `src/screens/GameScreen.tsx` — `localHumanPlayerId` useMemo (line ~1131), `humanPlayer` useMemo (line ~1161), `isHumanTurn` derivation, planet tap callback guard (line ~1810: `if (showingAiObserver || ...)`), fleet drag guard (line ~1753: `showingAiObserver ||`), FleetLayer call site (with `aiObserverOrders`/`aiObserverColor`), the "Orders" badge button (line ~2437), the `showAiActionsModal` modal (line ~2917), the planet detail panel edit controls (build buttons, slider, fleet dispatch button in panel), and the queued orders modal cancel buttons

**Files to modify:**
- `src/store/gameStore.ts`
- `src/screens/GameScreen.tsx`

**Requirements:**

**Part A — `gameStore.ts`:**

1. **Switch perspective in `useVisibleGameState()`:** Change the selector so that when `showingAiObserver` is `true` and `pendingAiPlayerId` is set, `buildVisibleState` is called with `pendingAiPlayerId` as the `viewingPlayerId` instead of the result of `getLocalHumanPlayerId()`. Cleanest approach: update `visibleStateForRecord` to accept an optional `overrideViewerId?: string | null` parameter and use it when provided; then pass it from `useVisibleGameState` via `s.showingAiObserver ? s.pendingAiPlayerId : null`.

2. **Populate `queuedOrders` with AI fleet actions:** In the `endTurn()` observer branch (where the current code sets `queuedOrders: []`), instead set `queuedOrders` to the AI's `SEND_FLEET` actions mapped to `PendingFleet[]`:
   ```ts
   queuedOrders: aiInput.actions
     .filter((a): a is Extract<PlayerAction, { type: 'SEND_FLEET' }> => a.type === 'SEND_FLEET')
     .map((a) => ({ fromPlanetId: a.fromPlanetId, toPlanetId: a.toPlanetId, shipCount: a.shipCount })),
   ```

3. **Clear `queuedOrders` on advance/clear:** In `advanceStagedAiTurn()`, add `queuedOrders: []` to the `set()` call in both the "next is AI" branch (replacing old values with the next AI's fleet actions — same derivation as above using `nextInput`) and the "resume human" branch (set to `[]`). Also add `queuedOrders: []` to the `clearAiObserver()` action.

**Part B — `GameScreen.tsx`:**

1. **Remove planet tap block:** On the planet tap callback guard (around line 1810: `if (showingAiObserver || gameState === null || ...)`), remove `showingAiObserver ||`. Planet taps will work naturally because `isHumanTurn` becomes `true` when `localHumanPlayerId` resolves to the AI's ID.

2. **Keep fleet drag blocked:** Leave `showingAiObserver ||` in the fleet drag guard untouched.

3. **Remove the "Orders" badge button and `showAiActionsModal` modal entirely:** Delete the `showAiActionsModal` state, the badge button block around line 2437, and the AI actions modal block around line 2917. Also delete the `useEffect` that closes it on observer end. Also delete the `aiActionCount` and `aiActions` derived values, and the `formatAiActionLabel` and `aiBuildingTypeLabel` helper functions (they will be unused).

4. **Remove `aiObserverOrders` / `aiObserverColor` from `FleetLayer`:** Remove those two props from the `FleetLayer` component props interface and its internal rendering of `aiObserverOrders`. Remove the `aiObserverFleets` derived value in the parent and the props passed to `<FleetLayer>`. The existing `queuedOrders` prop will now carry the AI's fleet orders automatically.

5. **Make planet detail panel read-only during observer:** Find the planet detail panel section (around line 2640+). Gate the following behind `!showingAiObserver`: the fleet dispatch "Send" button (if any), the production slider, and the build-chip buttons. The read-only planet info (name, class, ship count, buildings display) should remain visible.

6. **Hide cancel buttons in queued orders modal:** In the queued orders modal row, each fleet row has a cancel (✕) `Pressable`. Wrap those in `{!showingAiObserver && ( ... )}` so they only render when not in observer mode.

7. `npx tsc --noEmit` must pass with no new errors.

**What not to change:** The banner from Task 176 (the `aiObserverBanner` overlay — keep it; it provides useful context), the "End Turn" button and debounce from Task 178, the fleet drag `showingAiObserver` guard, the build panel `!showingAiObserver` guard (already present from Task 176), `runAiTurnsUntilHuman`, async multiplayer paths.

**Goal:** When `showingAiObserver` is true, show an "End Turn" button in the bottom bar. Pressing it calls `advanceStagedAiTurn()`, advancing through AI turns or returning control to the human player.

**Files to read first:**
- `src/screens/GameScreen.tsx` — the existing "End Turn" button: find its `Pressable`/`TouchableOpacity`, its style (`endTurnButton` or similar), its `onPress` handler (`handleEndTurn`), and the `isHumanTurn` conditional that currently controls its visibility (search for "End Turn" text in the JSX)
- `src/store/gameStore.ts` — `advanceStagedAiTurn()` (added in Task 175) and `showingAiObserver` flag

**Files to modify:**
- `src/screens/GameScreen.tsx`

**Requirements:**

1. When `showingAiObserver` is `true`, render an "End Turn" button in the bottom bar using the **same style** as the existing human End Turn button.
2. Its `onPress` handler calls `advanceStagedAiTurn()` from the store (not `handleEndTurn`).
3. The **human's** End Turn button must NOT render when `showingAiObserver` is `true` — add `&& !showingAiObserver` to its existing visibility condition so only one End Turn button is ever visible at a time.
4. Debounce: add local state `const [canAdvanceAi, setCanAdvanceAi] = useState(false)`. When `showingAiObserver` transitions from `false` to `true` (via `useEffect` on `showingAiObserver`), start a 300 ms timeout before setting `canAdvanceAi = true`. Reset to `false` whenever `showingAiObserver` becomes `false`. Disable the observer End Turn button while `!canAdvanceAi`.
5. `npx tsc --noEmit` must pass clean.

**What not to change:** `handleEndTurn` (the human's own End Turn handler), `endTurn()` in the store, async multiplayer submit path, knockout overlay button behaviour, `showingLockScreen` logic.

---

## Phase 29 — Bug Fix: AI Spawn Too Close to Human Players

**Status:** Not started.

AI home planets can appear immediately adjacent to the human player — sometimes the very next planet over. The root cause is in `spawnPlacer.ts`: `assignAis()` uses a **batch-retry** enforcement model. It places all AIs in random zones, then checks whether any AI landing is within `AI_MIN_SEPARATION_FROM_HUMAN[mapSize]` of any human planet. If the check fails it reshuffles and retries — but after 50 failed attempts it silently falls back to the last result, which may violate the constraint. With Phase 26's tighter planet spacing (planets ~2.5 grid units apart vs the previous 4), finding a valid arrangement within 50 tries is much harder on crowded maps, so the fallback fires more often than it ever did before.

---

### Task 182 — Frontend: Fix AI spawn min-distance from humans enforced at planet-selection time

**Goal:** Make it structurally impossible for `assignAis()` to select a home planet that is within `AI_MIN_SEPARATION_FROM_HUMAN[mapSize]` grid units of any human home planet, regardless of map density or player count.

**Files to read first:**
- `src/game/spawnPlacer.ts` — read the entire file. Key functions: `assignAis()` (lines ~235–310), `pickRandomPlanetInZone()` (lines ~144–156), `neutralPlanetsInZone()` (lines ~122–138), and the `AI_MIN_SEPARATION_FROM_HUMAN` constant (line ~8). Understand that the batch-retry loop (lines ~250–303) does the separation check after all AIs are placed, and falls back on line 306 after 50 failures.
- `docs/systems/spawn-placement.md` — read the full doc; the Phase 2 AI section currently says "No minimum-separation check", which is wrong (check was added but the doc was never updated).

**Files to modify:**
- `src/game/spawnPlacer.ts`
- `frontend/docs/systems/spawn-placement.md`

**Requirements:**

1. **Filter at selection time.** Modify `neutralPlanetsInZone()` (or add a new thin wrapper used only by the AI path) to accept an optional `humanPositions: Position[]` and `minDistanceFromHuman: number`. When those are provided, exclude any planet whose Euclidean distance to any human position is less than `minDistanceFromHuman`. Use `computeClickDistance()` (already defined in the file) for the distance check.

2. **Pass human positions into the AI planet picker.** In `assignAis()`, derive `humanPositions` from `humanAssignments` once before the retry loop (same derivation as the current post-assignment check on line ~244). Pass `humanPositions` and `AI_MIN_SEPARATION_FROM_HUMAN[mapSize]` into every call to `pickRandomPlanetInZone()` (or the new wrapper) inside the AI assignment loop.

3. **Keep the retry loop as a safety net.** Leave the 50-attempt retry loop in place — it still handles the edge case where all planets on the map are within min-distance of a human (tiny/crowded maps). The `console.warn` fallback on line ~306 can stay, but with per-planet filtering it should now almost never fire.

4. **Remove the post-assignment batch check.** The `separationMet` block (lines ~287–303) and the `if (humanPositions.length === 0 || separationMet)` early-return are now redundant — delete them. The retry loop can simply check `if (!failed)` to return the assignment.

5. **Update `docs/systems/spawn-placement.md`.** In the "Phase 2 — AIs" section, replace the "No minimum-separation check" note with an accurate description: AI planets are filtered at selection time to exclude any planet within `AI_MIN_SEPARATION_FROM_HUMAN[mapSize]` of any human home planet, using the same `computeClickDistance` formula as human separation. Also update the "Minimum Human Separation" table to add a matching row for AI-to-human separation (same values: 30/40/50 clicks by map size).

6. `npx tsc --noEmit` must pass clean after the change.

---

## Phase 30 — Bug Fix: Production Runs Before Combat on Round Wrap

**Status:** Not started.

When a round wraps, the turn engine currently executes fleet arrivals (combat) **before** `runProduction`. This means a defending player never receives the troops, gold, or research their factories and labs would have generated on that turn before the battle is resolved. A planet with three factories pumping out troops per turn should reinforce its garrison before the attacker's fleet lands — but under the current order it does not.

The fix is a one-step reorder inside `resolveTurn`'s round-wrap tick in `turnEngine.ts`: run `runProduction` first (so the original owner collects all output), then resolve fleet arrivals. Because production runs against the current ownership map (before any conquest), the defending garrison is reinforced before combat and a capturing player never receives production on the turn they take the planet.

---

### Task 183 — Frontend: Run production before fleet arrivals on round wrap

**Goal:** Reorder the round-wrap tick in `resolveTurn` so that `runProduction` executes before fleet arrivals are resolved, ensuring defending garrisons are reinforced by their planet's output before any battle takes place, and that a player who captures a planet does not receive that planet's production on the turn of capture.

**Files to read first:**
- `src/game/turnEngine.ts` — read the full `resolveTurn` function. Locate the round-wrap block (step 8 in the doc): `advanceFleets` call, the `arrived` loop that calls `resolveArrival`, and the `runProduction` call. Understand the local variables that carry `map` and `players` through each step (they are reassigned with each immutable update) so the reorder can thread the updated `map`/`players` from `runProduction` into the `resolveArrival` calls correctly.
- `src/game/productionEngine.ts` — confirm the signature `runProduction(map, players, currentRound, events?)` and that it returns `{ map, players }`.
- `src/game/combatEngine.ts` — confirm `resolveArrival(rng, fleet, map, events?, players?, fleets?)` accepts the updated `map` and `players` from the preceding `runProduction` call.
- `docs/systems/turn-engine.md` — read the current step 8 description so you know exactly what to update in that doc.

**Files to modify:**
- `src/game/turnEngine.ts`
- `docs/systems/turn-engine.md`

**Requirements:**

1. **Reorder the round-wrap tick.** Inside the round-wrap block of `resolveTurn`, change the execution order from:
   ```
   advanceFleets → resolveArrival loop → runProduction
   ```
   to:
   ```
   advanceFleets → runProduction → resolveArrival loop
   ```
   The `map` and `players` returned by `runProduction` must be passed into every subsequent `resolveArrival` call so the reinforced garrison counts (and any tech level changes from research level-ups) are in effect during combat.

2. **Thread state correctly.** After `runProduction` returns `{ map: updatedMap, players: updatedPlayers }`, use those as the `map`/`players` arguments for all `resolveArrival` calls in the arrivals loop. The `ResolveArrivalResult` from each call still updates `map` and `players` as before (for home-planet eliminations etc.). No other logic changes.

3. **No other behaviour changes.** The `advanceFleets` call, the arrivals loop structure, elimination detection, `roundNumber` increment, and all event emission must remain exactly as they are today — only the relative ordering of `runProduction` vs the arrivals loop changes.

4. **Update `docs/systems/turn-engine.md`.** In the "Turn Resolution Order" section, update step 8 (round tick) to reflect the new order:
   - `productionEngine.runProduction` runs first
   - Then `movementEngine.advanceFleets` decrements fleet `turnsRemaining`
   - Then fleet arrivals are resolved via `resolveArrival`

   Also add a note explaining the rule: the defending planet's owner receives production before any combat resolves; a player who captures a planet does not receive its production on the turn of capture.

5. `npx tsc --noEmit` must pass clean after the change.

---

## Phase 31 — Improvement: Combat RNG Seed Hashing

**Status:** Not started.

The combat model is a sequential 1v1 duel loop: one troop from each side fights at a time, each duel is 50/50 at equal tech (modified by tech level), and the side that runs out of troops first loses. This is intentional — more troops means you can absorb more losses, giving a proportional probability advantage. The `pAttackerWins` formula carries no structural bonus for being the attacker or the defender; the only probability modifier is tech level. At equal tech, 10 vs 5 gives the attacker a ~67% win chance; 18 vs 6 gives ~75%.

The only improvement here is to the RNG seeding. The current seed formula `state.seed + roundNumber * 10000 + combatRngCounter * 100` produces seeds that differ by exactly 100 between consecutive combats in the same round. Mulberry32 adds the constant `0x6D2B79F5` to the seed before hashing, so seeds that are only 100 apart have nearly identical initial state values. The avalanche effect kicks in quickly enough that this is unlikely to produce noticeable patterns in practice, but applying a cheap integer hash (Wang hash) to the composite seed before passing it to `mulberry32` eliminates any residual correlation and is a one-line fix.

---

### Task 184 — Frontend: Hash combat RNG seeds to eliminate seed-locality correlation

**Goal:** Apply a Wang-hash mixing step to the composite combat seed before passing it to `mulberry32`, ensuring all combats in the same round produce fully independent RNG sequences regardless of their numerical seed proximity. No changes to the combat loop or probability formulas.

**Files to read first:**
- `src/game/mapGenerator.ts` — read `mulberry32` (lines ~55–64). Note that `state = seed >>> 0` and the first output is derived from `state + 0x6D2B79F5`. Seeds 100 apart share structure in that first state value.
- `src/game/turnEngine.ts` — find both `mulberry32(state.seed + ...)` calls (early-arrivals block ~line 225, round-wrap block ~line 318).

**Files to modify:**
- `src/game/turnEngine.ts`
- `docs/systems/combat.md`

**Requirements:**

1. **Add a `hashSeed` helper in `turnEngine.ts`** (private, not exported):
   ```ts
   function hashSeed(n: number): number {
     let h = n >>> 0;
     h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
     h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
     return (h ^ (h >>> 16)) >>> 0;
   }
   ```

2. **Apply `hashSeed` at both RNG construction sites.** Change both occurrences of:
   ```ts
   mulberry32(state.seed + state.roundNumber * 10000 + combatRngCounter * 100)
   ```
   to:
   ```ts
   mulberry32(hashSeed(state.seed + state.roundNumber * 10000 + combatRngCounter * 100))
   ```

3. **Update `docs/systems/combat.md`.** In the "RNG Seeding" section, update the seed formula to include the hash step. Also add a paragraph documenting the intended model and expected win probabilities:
   > The combat model is a sequential 1v1 duel loop — one troop from each side fights at a time, each duel is 50/50 at equal tech. More troops means more duels before elimination, giving the larger army a proportional advantage with no structural bonus for either the attacking or defending role. At equal tech: 10 vs 5 → ~67% attacker win rate; 18 vs 6 → ~75% attacker win rate; equal forces → 50%. Tech level is the only factor that shifts the per-duel probability.

4. `npx tsc --noEmit` must pass clean after the change.

**What not to change:** The combat loop in `combatEngine.ts`, the `pAttackerWins` formula, the `combatRngCounter` pattern, or anything in `GameScreen.tsx`.

---

## Phase 32 — Bug Fix: Fleet Arrival Grouping — Merge Same-Owner Fleets and Prioritize Defender Reinforcements

**Status:** Not started.

Two related bugs stem from the same root cause: fleets arriving at the same destination in the same round are processed one by one in the order they appear in the `fleets[]` array, with no grouping or ordering.

**Bug A — Split battle reports for multiple friendly fleets:** If a player sends two fleets to the same destination and they both arrive in the same round, the second fleet is processed after the first already resolved. If the first fleet wins, the second fleet becomes a friendly reinforcement (a separate `fleet_arrived` event rather than one combined battle). If both are attacking the same enemy planet, the first fleet might lose, then the second smaller fleet finishes the job — producing two separate combat cards in the Battle Report instead of one combined engagement showing the full attacking force.

**Bug B — Zero-garrison owner appears as attacker:** If a player owns a planet with 0 troops and dispatches a reinforcing fleet that arrives the same round as an enemy attack fleet, and the enemy fleet happens to appear earlier in the `fleets[]` array, the enemy resolves first. With `defenderShips = 0`, the attacker wins instantly and takes the planet. The owner's fleet then arrives at an enemy-owned planet and appears in the Battle Report as the **attacker** on their own (now former) planet — the roles are reversed from the player's expectation.

**Fix:** Before resolving any arrivals, group all arriving fleets by destination planet. Within each destination:
1. Merge all fleets with the same `ownerId` into one combined fleet (sum of `shipCount`s). Use the ID of the first fleet in each group as the representative ID.
2. Sort the merged fleet groups so the current planet owner's fleet is always processed first (friendly reinforcement before any enemy attack). When there is no planet owner fleet arriving, all groups are attackers and order among them is by fleet ID (consistent tie-break).

This ensures: (a) one combined battle event per attacker-owner pair per planet, (b) the defending owner's reinforcements always land before any attacker resolves combat, so the planet owner is always the defender in the Battle Report.

---

### Task 185 — Frontend: Group, merge, and sort fleet arrivals by destination before resolving combat

**Goal:** Rewrite the arrivals loop in `resolveTurn` (both the early-arrivals section and the round-wrap section) to group arriving fleets by destination, merge same-owner fleets into a single combined force, and process each destination's arrivals with the current planet owner's fleet first — eliminating split battle reports and the zero-garrison defender-role reversal bug.

**Files to read first:**
- `src/game/turnEngine.ts` — read the full `resolveTurn` function carefully. There are two arrivals-processing blocks:
  - **Early arrivals** (around lines 216–242): `eligibleArrivals` is the input list; it loops, calls `resolveArrival`, and chains `map`/`players`/`fleets` updates.
  - **Round-wrap arrivals** (around lines 315–335): `justArrived` comes from `advanceFleets`; same loop structure.
  Both blocks must be updated with the same grouping/merging/sorting logic.
- `src/game/combatEngine.ts` — read `resolveArrival` to confirm it accepts a single `Fleet` and the current `map` state. The function is called once per merged fleet (not per original fleet).
- `src/game/types.ts` — confirm the `Fleet` type fields: `id`, `ownerId`, `shipCount`, `destinationPlanetId`, `fromPlanetId`, `turnsRemaining`, `dispatchedInRound`. Understand that the merged fleet needs a valid `id` and `fromPlanetId` (use the first original fleet's values for both).

**Files to modify:**
- `src/game/turnEngine.ts`
- `docs/systems/turn-engine.md`
- `docs/systems/combat.md`

**Requirements:**

1. **Extract a `groupAndSortArrivals` helper** (private, not exported) in `turnEngine.ts`:
   ```ts
   function groupAndSortArrivals(arrivals: Fleet[], map: GameMap): Fleet[] {
     // Group by destinationPlanetId, then by ownerId within each destination.
     // For each (destination, owner) group, merge all fleets into one:
     //   - id and fromPlanetId from the first fleet in the group
     //   - shipCount = sum of all fleets in the group
     //   - all other fields from the first fleet (turnsRemaining, dispatchedInRound, ownerId, destinationPlanetId)
     // Sort the merged fleets for a given destination so the fleet whose
     // ownerId === planet.owner (the current planet owner) comes first.
     // Planets with no arriving owner fleet: sort remaining attackers by fleet id (stable).
     // Return the flat ordered list across all destinations.
   }
   ```

2. **Apply `groupAndSortArrivals` at both arrival sites.** Before the arrivals `for` loop in each block, wrap the input list:
   - Early arrivals: `const orderedArrivals = groupAndSortArrivals(eligibleArrivals, map);` then iterate over `orderedArrivals`.
   - Round-wrap arrivals: `const orderedArrived = groupAndSortArrivals(justArrived, map);` then iterate over `orderedArrived`.
   
   The existing per-fleet `resolveArrival` call, `map`/`players`/`fleets` chaining, and `combatRngCounter` incrementing remain exactly as they are — only the input list changes.

3. **No changes to `combatEngine.ts` or `GameScreen.tsx`.** The `combat` event emitted by `resolveArrival` already records `attackerShipsBefore` and `defenderShipsBefore` from the merged fleet's `shipCount` and the planet's current `shipCount` at the time of resolution, so the Battle Report automatically displays the correct merged troop counts without any UI changes.

4. **Update `docs/systems/turn-engine.md`.** In the "Turn Resolution Order" section, update steps 2 and 8 to note that arriving fleets are grouped by destination and merged by owner before `resolveArrival` is called. Add a bullet:
   > Before resolving arrivals, all fleets are grouped by destination and merged by owner (combined `shipCount`). Within each destination the current planet owner's arriving fleet is processed first (as a reinforcement), followed by attackers. This ensures split-fleet attacks show as one combined battle and the defending player always appears as the defender regardless of garrison size.

5. **Update `docs/systems/combat.md`.** After the "Arrival Scenarios" table, add a note under "Fleet Grouping" (new subsection):
   > Multiple fleets from the same owner arriving at the same destination in the same round are merged into a single combined fleet before `resolveArrival` is called. The current planet owner's merged fleet is always processed first (as a friendly reinforcement). Subsequent fleets from other owners resolve as attacks against the post-reinforcement garrison in fleet-ID order.

6. `npx tsc --noEmit` must pass clean after the change.

---

## ~~Phase 34 — Bug Fix: Battle Report Lost After App Exit (Solo/Pass-and-Play)~~ *(completed 2026-06-01 — Task 187)*

~~**Status:** Not started.~~

~~`turnReport` and `playerTurnReportByPlayerId` are excluded from the Zustand `partialize` config — only `games: state.games.filter(g => !g.asyncGameId)` is persisted to AsyncStorage. When a player exits the app after ending their turn (before dismissing the battle report, or while the lock screen is showing between turns), all battle events are lost. On app resume, `turnReport: []` means the battle report modal never opens and the player sees changed planet ownership / garrison values with no explanation.~~

---

### ~~Task 187 — Frontend: Persist pending turn report across app exit for local games~~ *(completed 2026-06-01 — see docs/tasks/completed.md)*

**Goal:** Ensure the battle report events from the most recently completed turn survive an app exit for solo and pass-and-play games.

**Files to read first:**
- `src/store/gameStore.ts` — read the `persist(...)` config near the bottom of the file. Note the `partialize` function (only persists `games`) and where `turnReport` / `playerTurnReportByPlayerId` are set (primarily in `endTurn`). Read the `GameRecord` type definition and the `startExistingGame` action.
- `src/game/types.ts` — confirm the `TurnEvent` type.

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**

1. **Store pending turn report inside `GameRecord`.** Add optional field `pendingTurnReport?: TurnEvent[]` to the `GameRecord` type. In `endTurn()`, in the same `set({...})` call that sets `turnReport: events`, also update the active game record: `{ ...record, pendingTurnReport: events }`. Since `GameRecord` is already persisted via `partialize`, the events survive an app exit without widening `partialize`.

2. **Restore the turn report when returning to a game.** In `startExistingGame` (the action that transitions from the home screen to GameScreen for a local game), check `record.pendingTurnReport`. If non-empty, set `turnReport: record.pendingTurnReport` so the battle report modal auto-opens on the next render.

3. **Clear `pendingTurnReport` when the report is dismissed.** When the battle report modal is closed, clear `pendingTurnReport` from the active `GameRecord` so it does not re-open next session.

4. `npx tsc --noEmit` must pass clean after the change.

---

## ~~Phase 35 — Bug Fix: Async Battle Events Never Reach the Waiting Player~~ (complete 2026-06-01)

In async multiplayer, `endTurn()` computes `events: TurnEvent[]` capturing all combat, fleet arrivals, production completions, and eliminations. Events are persisted via `submitTurn`, returned in `GET /api/games/{id}` as `latest_events`, and restored into `turnReport` in `loadAsyncGame`.

Four tasks fix this end-to-end:

- ~~**Task 188** — Backend: Add `events_json` to `turns` table; store events in `TurnController::submit()`~~ (complete 2026-06-01)
- ~~**Task 189** — Backend: Return latest submitted-turn events in `GET /api/games/{id}` response~~ (complete 2026-06-01)
- ~~**Task 190** — Frontend: Include `events` in `submitTurn` payload~~ (complete 2026-06-01)
- ~~**Task 191** — Frontend: Restore `turnReport` from loaded events in `loadAsyncGame`~~ (complete 2026-06-01)

---

### ~~Task 189 — Backend: Return latest turn events in `GET /api/games/{id}` response~~ (complete 2026-06-01)

**Goal:** Include the events from the most recently submitted turn in the game detail response so the frontend can restore the battle report.

**Files to read first:**
- `backend/app/Http/Controllers/GameController.php` — read `show()` fully.
- `backend/docs/backend/api-contract.md` — read the `GET /api/games/{id}` response shape.
- `backend/docs/backend/turn-engine.md` — understand how the `turns` table is queried in `show`.

**Files to modify:**
- `backend/app/Http/Controllers/GameController.php`
- `backend/docs/backend/api-contract.md`

**Requirements:**

1. **Query latest submitted turn events** in `GameController::show()`:
   ```php
   $latestTurn = \App\Models\Turn::where('game_id', $game->id)
       ->whereNotNull('submitted_at')
       ->latest('submitted_at')
       ->first();
   $latestEvents = $latestTurn?->events_json
       ? json_decode($latestTurn->events_json, true)
       : null;
   ```

2. **Include in response.** Add `'latest_events' => $latestEvents` to the response JSON alongside `state_json` and `is_my_turn`. Value is `null` when no events exist (first turn of a new game).

3. **Update `api-contract.md`:** Add `latest_events: TurnEvent[] | null` to the `GET /api/games/{id}` response shape.

---

### ~~Task 190 — Frontend: Include `events` in `submitTurn` payload~~ (complete 2026-06-01)

**Goal:** Pass the turn events array from `endTurn()` to the `submitTurn` API call so Task 188 can persist them.

**Files to read first:**
- `src/store/gameStore.ts` — read `endTurn()` from where `runAiTurnsUntilHuman` returns `{ state: nextState, events }` through the `submitTurn(...)` call.
- `src/services/gamesService.ts` — read `submitTurn` and its `SubmitTurnPayload` type.

**Files to modify:**
- `src/services/gamesService.ts`
- `src/store/gameStore.ts`

**Requirements:**

1. **Update `SubmitTurnPayload`** in `gamesService.ts`: add `events?: TurnEvent[]`.

2. **Pass events in `endTurn()`** in `gameStore.ts`: in the `submitTurn(...)` call, add `events` to the payload (the aggregated `events` variable from `runAiTurnsUntilHuman`).

3. **No changes to error handling or navigation logic.**

4. `npx tsc --noEmit` must pass clean after the change.

---

### ~~Task 191 — Frontend: Restore `turnReport` from loaded events in `loadAsyncGame`~~ (complete 2026-06-01)

**Goal:** When loading an async game that has stored events from the last submitted turn, populate `turnReport` so the battle report modal auto-opens showing what happened during the opponent's turn.

**Files to read first:**
- `src/store/gameStore.ts` — read `loadAsyncGame` fully. Note `turnReport: []` and where `detail.stateJson` / `detail.inProgressActions` are consumed. Read `endTurn()` for the per-player fan-out logic that populates `playerTurnReportByPlayerId`.
- `src/services/gamesService.ts` — read `loadGameDetail` / the function constructing `ApiGameDetail`. Note all mapped fields.

**Files to modify:**
- `src/services/gamesService.ts`
- `src/store/gameStore.ts`

**Requirements:**

1. **Update `ApiGameDetail` type** in `gamesService.ts`: add `latestEvents?: TurnEvent[] | null`.

2. **Map `latest_events`** in `gamesService.ts`: assign `latestEvents: data.latest_events ?? null` when constructing `ApiGameDetail`.

3. **Restore `turnReport`** in `loadAsyncGame`: replace `turnReport: []` with `turnReport: detail.latestEvents ?? []`. Only restore when `detail.isMyTurn === true` — do not show a stale report on the waiting screen.

4. **Restore `playerTurnReportByPlayerId`**: fan out the restored events into per-player reports using the same logic from `endTurn()`. Extract this logic into a shared helper (e.g. `buildPlayerTurnReports(events, players)`) used in both `endTurn()` and `loadAsyncGame`.

5. `npx tsc --noEmit` must pass clean after the change.

---

## Phase 36 — Bug Investigation: Production Troops on Captured Planet

**Status:** Complete (2026-06-01).

Player reported finding only 1 troop on an enemy-owned planet they expected to defend with 3+ troops, based on the planet having multiple factories and the production slider set to max. Phase 30 (Task 183) correctly reorders production before combat at round wrap, so defenders DO receive production before any fleet arrives. Two related issues may explain the discrepancy or make garrison changes invisible:

**Issue A — `troopAccumulator` is not reset on ownership change:** `resolveArrival` does not reset `planet.troopAccumulator` when a planet changes hands. The new owner inherits whatever fractional troop progress the previous owner had accumulated. This is invisible in all UI displays and could cause an unexpected extra whole troop to appear on the first production cycle for the new owner.

**Issue B — No garrison-production event in battle report:** `runProduction` emits `build_complete` and `research_levelup` events but no troop-production event. Players cannot see from the battle report how many troops were added to any planet during the round — especially enemy-owned planets that produced troops before the player's attacking fleet arrived.

---

### ~~Task 192~~ — Frontend: Reset `troopAccumulator` on ownership change and add troop-production events *(complete 2026-06-01)*

**Goal:** (A) Reset `troopAccumulator` to 0 when a planet changes owner in `resolveArrival`. (B) Emit `troop_produced` events from `runProduction` so the battle report shows garrison changes per planet each round.

**Files to read first:**
- `src/game/combatEngine.ts` — read `resolveArrival` fully. Find the neutral-capture branch and the enemy-combat-victory branch. Confirm `troopAccumulator` is not currently reset on ownership change.
- `src/game/productionEngine.ts` — read `runProduction` fully. Find where `troopAccumulator` is updated and `wholeTroops` is computed. Review existing event emissions.
- `src/game/types.ts` — read the full `TurnEvent` union type to understand where to add the new variant.
- `src/screens/GameScreen.tsx` — find the battle report modal event renderer (which `TurnEvent` kinds are currently rendered and how).

**Files to modify:**
- `src/game/types.ts`
- `src/game/combatEngine.ts`
- `src/game/productionEngine.ts`
- `src/screens/GameScreen.tsx`
- `docs/systems/production.md`
- `docs/systems/combat.md`

**Requirements:**

1. **Add `troop_produced` to `TurnEvent` union in `types.ts`:**
   ```ts
   | { kind: 'troop_produced'; planetName: string; ownerName: string; troopsAdded: number }
   ```

2. **Reset `troopAccumulator` on ownership change in `combatEngine.ts`.** In both the neutral-capture branch and the enemy-combat-victory branch of `resolveArrival`, add `troopAccumulator: 0` to the planet update.

3. **Emit `troop_produced` in `runProduction`.** After computing `wholeTroops` for each planet, if `wholeTroops >= 1` and `events` is provided:
   ```ts
   events.push({
     kind: 'troop_produced',
     planetName: planet.name,
     ownerName: /* owner player name or 'Neutral' */,
     troopsAdded: wholeTroops,
   });
   ```
   Only emit when `wholeTroops >= 1` (no noise for fractional-only rounds).

4. **Render `troop_produced` events in the battle report.** In `GameScreen`, add a case for `troop_produced` in the battle-report modal renderer. Show a compact line card: "**[Planet name]** produced [N] troop(s)" with the owner's faction colour accent. Render these below combat cards for the same round.

5. **Update `docs/systems/production.md`** with the new event type (only fires when `wholeTroops >= 1`) and note the reset-on-capture rule for `troopAccumulator`.

6. **Update `docs/systems/combat.md`** noting that `troopAccumulator` is reset to 0 on both neutral-capture and enemy-victory ownership changes.

7. `npx tsc --noEmit` must pass clean after the change.

---

## ~~Phase 37 — Bug Investigation: Two Combat Events for the Same Planet~~ *(complete 2026-06-01, Task 193)*

~~Player reported seeing two separate combat entries for the same planet in the same battle report.~~

~~**Fix (Task 193):** Optional `roundNumber` on `combat` and `fleet_arrived` events (emitted from `resolveArrival` with `state.roundNumber`); muted **Round N** label on battle-report cards; `drainStaleFleets` on `loadGame` / `loadAsyncGame` removes persisted `turnsRemaining <= 0` fleets.~~

---

## Phase 38 — Bug Fix: Battle Report and Turn Data Not Preserved for the Full Turn Duration (All Modes)

**Status:** Not started.

**Bug report:** When a player returns to their active turn — whether by re-entering a solo/pass-and-play game from the home screen, closing and reopening the app entirely during a solo game, or loading an async multiplayer game when it is their turn — all battle report cards, map combat indicators (sword icons on planets), fleet-arrival entries, and production data are gone. The player cannot tell where battles occurred or where their own fleets landed because the report is empty. This should never happen: all battle and report data must remain visible from the moment a turn starts until the moment the player ends the turn, surviving any number of exits, app restarts, and re-entries in between.

**Root cause (three parts):**

**Part 1 — `playerBattleArchiveByPlayerId` not restored in `loadGame()`:** `loadGame()` resets both `playerBattleArchiveByPlayerId` and `playerTurnReportByPlayerId` to `{}`. `humanCombatEvents` (the computed list that drives map sword icons and battle-report modal content) is derived from `playerBattleArchiveByPlayerId[localHumanPlayerId]`, not from the raw `turnReport`. So even though `turnReport` is correctly restored from `pendingTurnReport` in AsyncStorage, `humanCombatEvents` is always empty after re-entry. No sword icons appear on battle planets, and the battle report modal is empty even if opened manually.

**Part 2 — Lock-screen transition never fires in `loadGame()`:** `setShowBattleReportModal(true)` is triggered by a `useEffect` that watches `showingLockScreen` for a `true → false` transition (lines ~1185–1194 in `GameScreen.tsx`). `loadGame()` sets `showingLockScreen: false` directly — there is no transition — so the auto-open never runs and the player arrives on a map with no visual indication that a battle report is waiting.

**Part 3 — `playerBattleArchiveByPlayerId` not rebuilt in `loadAsyncGame()`:** `loadAsyncGame()` restores `turnReport` from `detail.latestEvents` (Task 191) and fans it out into `playerTurnReportByPlayerId`, but does not also rebuild `playerBattleArchiveByPlayerId`. Map sword icons are therefore never shown when an async player loads their turn — even though all the event data is available via `detail.latestEvents`.

---

### Task 194 — Frontend: Restore battle report and map indicators on solo/pass-and-play game re-entry

**Goal:** When a solo or pass-and-play player re-enters a game that has a `pendingTurnReport` (stored in AsyncStorage), the "Start Turn" lock screen should reappear, the map should show combat indicators, and tapping "Start Turn" should auto-open the battle report — matching the experience of an uninterrupted turn. This fix also extracts a shared `buildPlayerReports` helper that Task 201 depends on.

**Files to read first:**
- `src/store/gameStore.ts` — read `loadGame` (lines ~425–448) and `endTurn` fan-out loop (lines ~864–939) in full. Note how `newArchive` and `newTurnReport` are built from events and how `pendingTurnReport` is written.
- `src/screens/GameScreen.tsx` — read the `humanCombatEvents` memo (lines ~1109–1114), the `useEffect` that calls `setShowBattleReportModal(true)` (lines ~1185–1194), and the lock-screen section to understand which player label is shown.

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**

1. **Extract a shared `buildPlayerReports` helper** inside `gameStore.ts` (above the store definition, so it is pure and easily testable). This helper is also used by Task 201, so its signature must accept a `planets` array for `build_complete` owner lookups:
   ```ts
   function buildPlayerReports(
     events: TurnEvent[],
     players: Player[],
     planets?: Planet[],
   ): {
     archive: Record<string, TurnEvent[]>;
     turnReport: Record<string, TurnEvent[]>;
   } {
     const archive: Record<string, TurnEvent[]> = {};
     const report: Record<string, TurnEvent[]> = {};
     for (const event of events) {
       if (event.kind === 'combat' || event.kind === 'multiway_combat') {
         for (const player of players) {
           if (player.isAI) continue;
           const involved =
             event.kind === 'combat'
               ? event.attackerName === player.name || event.defenderName === player.name
               : event.participants.some((p) => p.name === player.name);
           if (involved) {
             (archive[player.id] ??= []).push(event);
             (report[player.id] ??= []).push(event);
           }
         }
         continue;
       }
       if (event.kind === 'fleet_arrived') {
         const owner = players.find((p) => !p.isAI && p.name === event.attackerName);
         if (owner) (report[owner.id] ??= []).push(event);
         continue;
       }
       if (event.kind === 'research_levelup') {
         const owner = players.find((p) => !p.isAI && p.name === event.playerName);
         if (owner) (report[owner.id] ??= []).push(event);
         continue;
       }
       if (event.kind === 'build_complete') {
         const planet = planets?.find((pl) =>
           event.planetId !== undefined ? pl.id === event.planetId : pl.name === event.planetName
         );
         if (planet) {
           const owner = players.find((p) => !p.isAI && p.id === planet.owner);
           if (owner) (report[owner.id] ??= []).push(event);
         }
         continue;
       }
       if (event.kind === 'troop_produced') {
         // troop_produced is informational only — no archive entry
       }
     }
     return { archive, turnReport: report };
   }
   ```

2. **Replace the fan-out loop in `endTurn()`** with a call to `buildPlayerReports(events, finalState.players, finalState.map.planets)`. Keep all other `endTurn` logic unchanged.

3. **Update `loadGame()`:** When `record.pendingTurnReport` is non-empty:
   - Call `buildPlayerReports(record.pendingTurnReport, record.state.players, record.state.map.planets)` to rebuild the per-player maps.
   - Set `showingLockScreen: true` (not `false`) so the lock screen re-appears on re-entry.
   - Set `playerBattleArchiveByPlayerId` and `playerTurnReportByPlayerId` from the helper's return values.

   When `record.pendingTurnReport` is absent or empty, keep the existing behaviour (`showingLockScreen: false`, empty maps).

4. **`npx tsc --noEmit` must pass clean after the change.**

5. **No backend changes required.**

---

### Task 201 — Frontend: Restore `playerBattleArchiveByPlayerId` in `loadAsyncGame` when it's the player's turn

**Goal:** When loading an async multiplayer game on the player's turn, rebuild `playerBattleArchiveByPlayerId` from `detail.latestEvents` so map sword icons and the battle-report modal correctly show what happened during the opponent's last turn. Without this, the player sees an empty map (no sword icons) even though the event data is present.

**Depends on:** Task 194 (the `buildPlayerReports` helper must exist).

**Files to read first:**
- `src/store/gameStore.ts` — read `loadAsyncGame` fully. Find where `turnReport` is set from `detail.latestEvents` and where `playerTurnReportByPlayerId` is populated. Confirm how `players` and `map.planets` are obtained from the loaded state.
- `src/store/gameStore.ts` — read the `buildPlayerReports` helper added in Task 194.

**Files to modify:**
- `src/store/gameStore.ts`

**Requirements:**

1. In `loadAsyncGame()`, when `detail.isMyTurn === true` and `detail.latestEvents` is non-empty:
   - After the state is parsed and `players` / `map.planets` are available, call:
     ```ts
     const { archive, turnReport: reportByPlayer } = buildPlayerReports(
       detail.latestEvents,
       players,
       map.planets,
     );
     ```
   - Set `playerBattleArchiveByPlayerId: archive` and `playerTurnReportByPlayerId: reportByPlayer` in the store state update (alongside the existing `turnReport: detail.latestEvents` assignment).

2. When `detail.isMyTurn === false` or `detail.latestEvents` is empty/null, leave both maps as `{}` — no report is shown on the waiting screen.

3. `npx tsc --noEmit` must pass clean after the change.

4. No backend changes required — events are already available in `detail.latestEvents` via Task 189.

---

## Phase 39 — Bug Fix: Duplicate Planet Names + Planet Name Used as Identifier

**Status:** Not started.

**Bug report:** Two planets on the same map can be generated with the same name (e.g. "Red Shard" and "Red Shard"). Because battle-report events and map indicators use planet name as a key rather than planet ID, events from one planet bleed into the other — the wrong planet lights up on the map, and combat entries from one planet appear under the other in the report.

**Root cause (two parts):**

**Part 1 — No uniqueness guarantee on names:** `generatePlanetName` picks randomly from 16 adjectives × 16 nouns = 256 combinations. There is no deduplication check. `ensureConnectivity` can insert extra bridge planets that also draw from this pool, raising collision probability further on large maps.

**Part 2 — Planet name used as identifier in the event and report system:**
- All `TurnEvent` variants that reference a planet (`fleet_arrived`, `combat`, `build_complete`, `troop_produced`) carry only `planetName: string` — no `planetId` field.
- `humanCombatByPlanetName` in `GameScreen.tsx` is a `Map<string, CombatTurnEvent>` keyed by `event.planetName`. Duplicate names silently overwrite each other.
- `battlePlanetNames` is a `Set<string>` of names driving both the sword-icon indicator (`hadBattleThisTurn`) and the per-planet tap-to-open report. A name collision causes the wrong planet to light up.
- `buildPlayerReports` in `gameStore.ts` uses `planets.find((p) => p.name === event.planetName)` for `build_complete` owner lookup — resolves to the wrong planet when names collide.

---

### Task 195 — Frontend: Guarantee unique planet names in `generateMap`

**Goal:** After assigning names to all planets in `generateMap`, ensure no two planets share the same name by appending a numeric suffix to duplicates.

**Files to read first:**
- `src/game/mapGenerator.ts` — read `generatePlanetName` and the `planets` array construction block at the end of `generateMap` (lines ~487–499).

**Files to modify:**
- `src/game/mapGenerator.ts`

**Requirements:**

1. After the `positions.map(...)` block that produces the `planets` array, add a deduplication pass:
   - Build a `Map<string, number>` counting how many times each name has appeared so far.
   - For each planet in order, if its name has already been seen, append ` II`, ` III`, ` IV`, ` V`, ... (or simply ` 2`, ` 3`, ` 4`, ...) to make it unique; then record the new name in the count map.
   - The suffix scheme just needs to be deterministic and human-readable — Roman numerals or plain integers both acceptable.

2. No other logic in `generateMap` changes.

3. `npx tsc --noEmit` must pass clean after the change.

---

### Task 196 — Frontend: Add `planetId` to all planet-referencing `TurnEvent` types and emit from engines

**Goal:** Add an optional `planetId?: string` field to every `TurnEvent` variant that references a planet, and populate it at every emit site so new events always carry the planet's stable `id`.

**Files to read first:**
- `src/game/types.ts` — read the full `TurnEvent` union.
- `src/game/combatEngine.ts` — read `resolveArrival`; find every `events.push(...)` call.
- `src/game/productionEngine.ts` — read `runProduction`; find every `events.push(...)` call.

**Files to modify:**
- `src/game/types.ts`
- `src/game/combatEngine.ts`
- `src/game/productionEngine.ts`

**Requirements:**

1. **`types.ts`:** Add `planetId?: string` to `fleet_arrived`, `combat`, `build_complete`, and `troop_produced`. Field is optional so existing persisted events (which lack it) remain valid.

2. **`combatEngine.ts`:** At every `events.push(...)` call that produces a `fleet_arrived` or `combat` event, add `planetId: destination.id`.

3. **`productionEngine.ts`:** At every `events.push(...)` call that produces a `build_complete` or `troop_produced` event, add `planetId: planet.id`.

4. No logic changes — only the new field is added to the pushed objects.

5. `npx tsc --noEmit` must pass clean after the change.

---

### Task 197 — Frontend: Use `planetId` in all event-keyed lookups in `gameStore.ts` and `GameScreen.tsx`

**Goal:** Replace every lookup that currently uses `event.planetName` as a key (or `planet.name` to match against an event) with `event.planetId` (falling back to `event.planetName` for old persisted events that predate Task 196).

**Files to read first:**
- `src/store/gameStore.ts` — read `buildPlayerReports`; find the `build_complete` owner-lookup line.
- `src/screens/GameScreen.tsx` — read `humanCombatByPlanetName`, `battlePlanetNames`, the `hadBattleThisTurn` prop pass, and the `humanCombatByPlanetName.get(planet.name)` tap handler (around lines 1127–1148, 2084–2095, 2531).

**Files to modify:**
- `src/store/gameStore.ts`
- `src/screens/GameScreen.tsx`

**Requirements:**

1. **`buildPlayerReports` in `gameStore.ts`:** Change the `build_complete` planet lookup from:
   ```ts
   const planet = planets.find((p) => p.name === event.planetName);
   ```
   to:
   ```ts
   const planet = planets.find((p) =>
     event.planetId !== undefined ? p.id === event.planetId : p.name === event.planetName
   );
   ```

2. **`GameScreen.tsx` — `humanCombatByPlanetName`:** Rename to `humanCombatByPlanetKey`. Key each event by `event.planetId ?? event.planetName`. Update every call site that does `.get(planet.name)` to `.get(planet.id)` with a fallback `.get(planet.name)` for old events.

3. **`GameScreen.tsx` — `battlePlanetNames`:** Rename to `battlePlanetKeys`. Build the set using `event.planetId ?? event.planetName`. Update the `hadBattleThisTurn` prop to `battlePlanetKeys.has(planet.id) || battlePlanetKeys.has(planet.name)` for backward compat.

4. **`planetBattleReportName` state** (used for per-planet drill-down) may remain name-based — it is a display/UI key and already works correctly after Task 195 guarantees unique names. No change required there.

5. `npx tsc --noEmit` must pass clean after the change.

---

## ~~Phase 40 — Feature: True Multi-way Combat (3+ Players at the Same Planet)~~ *(complete 2026-06-01)*

**Status:** Complete.

When three or more distinct combatants arrive at the same planet in the same round, the current sequential 1v1 model produces an unfair "first attacker softens the defender for the second attacker" outcome. This phase replaces that with a true simultaneous melee: all combatants fight concurrently using randomised 1-vs-1 duels drawn from the survivor pool each flip, until only one fleet remains. The core algorithm is almost identical to the existing coin-flip loop — the only difference is that pairs are chosen at random from all survivors each iteration rather than being a fixed attacker-vs-defender pairing.

### Melee algorithm

```
troops = all combatants (each with an ownerId and a ships count)
snapshot = record shipsBefore for each combatant (for the event)

while survivors (troops with ships > 0).length > 1:
  survivors = troops.filter(t => t.ships > 0)
  n = survivors.length

  // Unbiased selection of 2 distinct survivors:
  aIdx    = floor(rng() * n)
  bIdxRaw = floor(rng() * (n - 1))
  bIdx    = bIdxRaw < aIdx ? bIdxRaw : bIdxRaw + 1

  a = survivors[aIdx];  b = survivors[bIdx]

  techDiff = techLevel(a.ownerId) - techLevel(b.ownerId)
  pAWins   = (7 + max(0, techDiff)) / (14 + |techDiff|)

  if rng() < pAWins: b.ships -= 1
  else:              a.ships -= 1

winner = troops.find(t => t.ships > 0)
```

Three RNG calls per iteration (aIdx, bIdx, coin flip). This is still fully deterministic given the same seed and game state. For 2 combatants this degenerates to the existing 50/50 duel (exactly the same maths), so existing 2-combatant fights are unaffected.

### When multi-way activates

Multi-way activates when, after merging same-owner arriving fleets by destination (existing Task 185 logic), the **total distinct combatants** at a destination is ≥ 3. Total distinct combatants = number of unique arriving fleet owners + (1 if the planet has a non-neutral owner who is **not** arriving with a fleet of their own). The planet-owner's arriving reinforcement (if any) is silently absorbed into their garrison before the count and before building the combatants list.

Examples:
- Planet owned by A (50 ships), B arrives (30), C arrives (25) → 3 combatants: A garrison (50), B (30), C (25) → **multi-way**
- Planet owned by A (50 ships), A arrives (20) reinforcement, B arrives (30) → 2 combatants: A garrison+reinforcement (70), B (30) → **existing 1v1**
- Neutral planet, A arrives (40), B arrives (35), C arrives (20) → 3 combatants: A (40), B (35), C (20) → **multi-way**
- Neutral planet, A arrives (40), B arrives (35) → 2 combatants → **existing 1v1** (no change)
- Any 2-player game → never more than 2 combatants → always existing 1v1 path

---

### Task 198 — Frontend: Add `multiway_combat` TurnEvent type + `resolveMultiwayCombat` in `combatEngine.ts`

**Goal:** Define the `multiway_combat` event variant in `types.ts` and add a `resolveMultiwayCombat` function to `combatEngine.ts` that runs the melee algorithm and applies the result to the map (including home-planet elimination when applicable).

**Files to read first:**
- `src/game/types.ts` — read the full `TurnEvent` union and the `OwnerId` / `Player` / `Fleet` / `GameMap` types. Understand the existing `combat` event shape: `attackerName`, `defenderName`, `attackerWon`, `attackerLost`, `defenderLost`, `attackerShipsBefore`, `defenderShipsBefore`, `remainingShips`, optional `isHomePlanetConquest`, optional `roundNumber`.
- `src/game/combatEngine.ts` — read in full. Understand `resolveArrival`, the `applyHomePlanetElimination` helper, `getOwnerName`, `updatePlanet`, and the `ResolveArrivalResult` return type.

**Files to modify:**
- `src/game/types.ts`
- `src/game/combatEngine.ts`
- `docs/systems/combat.md`

**Requirements:**

1. **Add `multiway_combat` to the `TurnEvent` union in `types.ts`:**

   ```typescript
   | {
       kind: 'multiway_combat';
       planetName: string;
       planetId?: string;
       participants: Array<{
         name: string;
         ownerId: OwnerId;
         shipsBefore: number;
         survived: boolean;  // true only for the winner
       }>;
       winnerName: string;
       winnerId: OwnerId;
       remainingShips: number;
       roundNumber?: number;
       isHomePlanetConquest?: true;
     }
   ```

2. **Add `MultiwayCombatant` interface in `combatEngine.ts`:**

   ```typescript
   export interface MultiwayCombatant {
     ownerId: OwnerId;
     ships: number;
   }
   ```

3. **Add `resolveMultiwayCombat` function in `combatEngine.ts`:**

   ```typescript
   export function resolveMultiwayCombat(
     rng: () => number,
     combatants: MultiwayCombatant[],   // ≥ 2 entries; garrison owner first if present
     map: GameMap,
     destinationPlanetId: string,
     roundNumber: number,
     events?: TurnEvent[],
     players?: Player[],
     fleets?: Fleet[],
   ): ResolveArrivalResult
   ```

   **Implementation steps inside the function:**

   a. Find `destination = map.planets.find(p => p.id === destinationPlanetId)`. Throw if not found.

   b. Record `previousOwner = destination.owner`.

   c. Build a `participantSnapshots` array (one entry per combatant in the same order as `combatants`):
      ```typescript
      const participantSnapshots = combatants.map(c => ({
        name: getOwnerName(c.ownerId, players),
        ownerId: c.ownerId,
        shipsBefore: c.ships,
        survived: false,
      }));
      ```

   d. Build a mutable `troops` array:
      ```typescript
      const troops = combatants.map(c => ({ ownerId: c.ownerId, ships: c.ships }));
      ```

   e. **Run the melee loop:**
      ```typescript
      while (troops.filter(t => t.ships > 0).length > 1) {
        const survivors = troops.filter(t => t.ships > 0);
        const n = survivors.length;

        const aIdx    = Math.floor(rng() * n);
        const bIdxRaw = Math.floor(rng() * (n - 1));
        const bIdx    = bIdxRaw < aIdx ? bIdxRaw : bIdxRaw + 1;

        const a = survivors[aIdx];
        const b = survivors[bIdx];

        const aTech = players?.find(p => p.id === a.ownerId)?.techLevel ?? 0;
        const bTech = players?.find(p => p.id === b.ownerId)?.techLevel ?? 0;
        const techDiff = aTech - bTech;
        const pAWins = (7 + Math.max(0, techDiff)) / (14 + Math.abs(techDiff));

        if (rng() < pAWins) {
          b.ships -= 1;
        } else {
          a.ships -= 1;
        }
      }
      ```

   f. `const winner = troops.find(t => t.ships > 0)!;` — always exists by loop termination.

   g. Mark the winner's snapshot: `participantSnapshots.find(p => p.ownerId === winner.ownerId)!.survived = true;`

   h. Determine `isHomePlanetConquest`:
      ```typescript
      const previousOwnerPlayer = players?.find(p => p.id === previousOwner);
      const isHomePlanetConquest =
        winner.ownerId !== previousOwner &&
        previousOwnerPlayer !== undefined &&
        destination.id === previousOwnerPlayer.homePlanetId;
      ```

   i. **Emit `multiway_combat` event:**
      ```typescript
      events?.push({
        kind: 'multiway_combat',
        planetName: destination.name,
        planetId: destination.id,
        participants: participantSnapshots,
        winnerName: getOwnerName(winner.ownerId, players),
        winnerId: winner.ownerId,
        remainingShips: winner.ships,
        roundNumber,
        ...(isHomePlanetConquest ? { isHomePlanetConquest: true } : {}),
      });
      ```

   j. **Apply winner's ownership to the planet:**
      ```typescript
      const updatedMap = updatePlanet(map, destination.id, planet => {
        if (winner.ownerId === previousOwner) {
          // Garrison held — only update ship count
          return { ...planet, shipCount: winner.ships };
        }
        return { ...planet, owner: winner.ownerId, shipCount: winner.ships, troopAccumulator: 0 };
      });
      ```

   k. **Handle home planet elimination:**
      ```typescript
      if (isHomePlanetConquest && previousOwnerPlayer !== undefined && players !== undefined && fleets !== undefined) {
        return applyHomePlanetElimination(updatedMap, players, fleets, previousOwnerPlayer);
      }
      return { map: updatedMap };
      ```

4. **Update `docs/systems/combat.md`:** Add a new "Multi-way Combat" section (after the existing "Fleet Grouping" section) documenting:
   - When multi-way activates (3+ distinct combatants after reinforcement absorption)
   - The melee algorithm (random pair selection, one flip per pair, repeat until 1 survivor)
   - The `multiway_combat` event and its fields
   - Home planet conquest behaviour (same `applyHomePlanetElimination` logic, fires when winner takes previous owner's home planet)
   - Changelog entry: `2026-06-01: Task 198 — multi-way combat algorithm and event type added`

5. `npx tsc --noEmit` must pass clean after the change.

---

### Task 199 — Frontend: Wire multi-way combat into `turnEngine.ts` arrival loops

**Goal:** Modify the two arrival-processing loops in `resolveTurn` (early-arrivals block and round-wrap block) to detect destinations with 3+ combatants and call `resolveMultiwayCombat` instead of the sequential `resolveArrival` loop.

**Files to read first:**
- `src/game/turnEngine.ts` — read in full. Pay close attention to:
  - `groupAndSortArrivals` (lines 48–100): groups fleets by destination, merges by owner, sorts so planet owner comes first. This function's internal `byDestination` map and `destinationOrder` array will be factored out into a new helper.
  - The early-arrivals loop (around lines 285–314): iterates the flat `groupAndSortArrivals` result, uses `isSilentReinforcement` check, calls `resolveArrival`.
  - The round-wrap arrivals loop (around lines 398–424): same structure.
  - The `combatRngCounter` + `mulberry32(hashSeed(...))` pattern — multi-way combat consumes **one** counter slot per destination (same as a 1v1 fight does per fleet).
- `src/game/combatEngine.ts` — confirm `resolveMultiwayCombat` and `MultiwayCombatant` signatures from Task 198.

**Files to modify:**
- `src/game/turnEngine.ts`
- `docs/systems/turn-engine.md`

**Requirements:**

1. **Refactor `groupAndSortArrivals` into two functions:**

   a. **New `groupArrivalsByDestination(arrivals: Fleet[], map: GameMap): Map<string, Fleet[]>`** — contains the existing logic: group by `destinationPlanetId`, merge same-owner fleets within each destination (sum `shipCount`, use first fleet's `id` + `fromPlanetId`/`originPlanetId`), sort so the planet owner's fleet comes first (existing sort). Returns a `Map` keyed by `destinationPlanetId` in first-seen order (use insertion order, which `Map` preserves).

   b. **`groupAndSortArrivals` becomes a thin wrapper** that flattens the map:
      ```typescript
      function groupAndSortArrivals(arrivals: Fleet[], map: GameMap): Fleet[] {
        const grouped = groupArrivalsByDestination(arrivals, map);
        return [...grouped.values()].flat();
      }
      ```
   Keep `groupAndSortArrivals` unchanged in signature so nothing outside `resolveTurn` breaks.

2. **Add two private helpers for multi-way detection:**

   ```typescript
   function countTotalCombatants(destFleets: Fleet[], planet: Planet | undefined): number {
     const arrivalOwners = new Set(destFleets.map(f => f.ownerId));
     if (
       planet !== undefined &&
       planet.owner !== 'neutral' &&
       !arrivalOwners.has(planet.owner)
     ) {
       return arrivalOwners.size + 1;  // garrison owner is a combatant but not arriving
     }
     return arrivalOwners.size;
   }

   function buildCombatantList(destFleets: Fleet[], planet: Planet | undefined): MultiwayCombatant[] {
     const combatants: MultiwayCombatant[] = [];
     if (planet !== undefined && planet.owner !== 'neutral') {
       let garrisonShips = planet.shipCount;
       const ownerArriving = destFleets.find(f => f.ownerId === planet.owner);
       if (ownerArriving !== undefined) {
         garrisonShips += ownerArriving.shipCount;  // silently absorb reinforcement
       }
       combatants.push({ ownerId: planet.owner, ships: garrisonShips });
     }
     for (const fleet of destFleets) {
       if (planet === undefined || fleet.ownerId !== planet.owner) {
         combatants.push({ ownerId: fleet.ownerId, ships: fleet.shipCount });
       }
     }
     return combatants;
   }
   ```

   Import `MultiwayCombatant` from `combatEngine`.

3. **Rewrite both arrival loops** to use `groupArrivalsByDestination` and decide per destination:

   Replace the early-arrivals block (currently lines ~285–314) with:
   ```typescript
   const arrivalsByDest = groupArrivalsByDestination(eligibleArrivals, map);
   for (const [destPlanetId, destFleets] of arrivalsByDest) {
     const destPlanet = findPlanet(map, destPlanetId);
     const totalCombatants = countTotalCombatants(destFleets, destPlanet);

     if (totalCombatants >= 3) {
       const combatants = buildCombatantList(destFleets, destPlanet);
       const combatRng = mulberry32(hashSeed(state.seed + state.roundNumber * 10000 + combatRngCounter * 100));
       combatRngCounter += 1;
       const result = resolveMultiwayCombat(combatRng, combatants, map, destPlanetId, state.roundNumber, events, players, stillInTransit);
       map = result.map;
       if (result.players !== undefined) players = result.players;
       if (result.fleets !== undefined) stillInTransit = result.fleets;
     } else {
       for (let i = 0; i < destFleets.length; i++) {
         const fleet = destFleets[i];
         const destP = findPlanet(map, fleet.destinationPlanetId);
         const nextFleet = destFleets[i + 1];
         const isSilentReinforcement =
           destP !== undefined &&
           fleet.ownerId === destP.owner &&
           nextFleet !== undefined &&
           nextFleet.destinationPlanetId === fleet.destinationPlanetId;
         const combatRng = mulberry32(hashSeed(state.seed + state.roundNumber * 10000 + combatRngCounter * 100));
         combatRngCounter += 1;
         const arrivalResult = resolveArrival(combatRng, fleet, map, state.roundNumber, isSilentReinforcement ? undefined : events, players, stillInTransit);
         map = arrivalResult.map;
         if (arrivalResult.players !== undefined) players = arrivalResult.players;
         if (arrivalResult.fleets !== undefined) stillInTransit = arrivalResult.fleets;
       }
     }
   }
   ```

   Apply the **identical pattern** to the round-wrap arrivals block (currently lines ~398–424), replacing `eligibleArrivals` with `arrived` and `stillInTransit` with `fleets` (the in-transit reference used in that block).

4. **Import** `resolveMultiwayCombat` and `MultiwayCombatant` from `combatEngine`.

5. **Update `docs/systems/turn-engine.md`:** In the "Turn Resolution Order" section, update steps 2 and 8 to add a paragraph:
   > After grouping and merging, each destination is checked for total combatants (arriving fleet owners + garrison owner if not arriving). If ≥ 3 combatants, `resolveMultiwayCombat` is called once for that destination (consuming one `combatRngCounter` slot). If ≤ 2 combatants the existing `resolveArrival` sequential path is used unchanged.

   Add changelog entry: `2026-06-01: Task 199 — multi-way combat wired into both arrival loops in resolveTurn`.

6. `npx tsc --noEmit` must pass clean after the change.

---

### Task 200 — Frontend: `MultiwayBattleReportCard` component + battle report integration

**Goal:** Render `multiway_combat` events in the Battle Report modal and the per-planet drill-down using a new `MultiwayBattleReportCard` component that fits the existing card visual language. Update the planet red-dot indicator logic to include `multiway_combat` events.

**Files to read first:**
- `src/screens/GameScreen.tsx` — read from the top through approximately line 450:
  - `BattleReportRoundLabel`, `FleetArrivedReportCard`, `BattleReportCard`, `getBattleReportDetails`, `getBattleReportSides`, `getVictorRemainingShips`, `isHumanInvolvedInCombat`, `isHumanHomePlanetConquestVictory` — understand the existing card layout, style names, and W/L badge logic.
  - `CombatTurnEvent` type alias (line 102).
  - `humanCombatByPlanetKey` (or `humanCombatByPlanetName` if Task 197 is not yet done) — the `Map` used to look up per-planet combat for the drill-down (around lines 1125–1148).
  - `battlePlanetKeys` (or `battlePlanetNames`) — the `Set` used to drive the `hadBattleThisTurn` prop on planets (around lines 1125–1148).
  - All three places where `BattleReportCard` is rendered (search for `<BattleReportCard`).
- `src/game/types.ts` — confirm the `multiway_combat` event shape added in Task 198.

**Files to modify:**
- `src/screens/GameScreen.tsx`

**Requirements:**

1. **Add a `MultiwayCombatTurnEvent` type alias** near `CombatTurnEvent` (line ~102):
   ```typescript
   type MultiwayCombatTurnEvent = Extract<TurnEvent, { kind: 'multiway_combat' }>;
   ```

2. **Add `MultiwayBattleReportCard` component** (place it immediately after the existing `BattleReportCard` component). The card must match the existing card's visual language:

   **Visual structure:**
   ```
   ┌──────────────────────────────────────┐
   │ Round N  (BattleReportRoundLabel)     │
   │ [C]  Planet Name            [W] / [L] │  ← same header row as BattleReportCard
   │      ⚔ Free-for-all                   │  ← subtitle, muted text, small font
   ├──────────────────────────────────────┤
   │  • You           50 ships   ✓ Victor  │  ← winner row: bolded, suffix "→ N remaining"
   │  • Kira          30 ships   ✗         │  ← eliminated row: dimmed opacity
   │  • Vex           25 ships   ✗         │
   └──────────────────────────────────────┘
   ```

   Component props:
   ```typescript
   function MultiwayBattleReportCard({
     event,
     localHumanPlayerId,
     players,
     planetClass,
   }: {
     event: MultiwayCombatTurnEvent;
     localHumanPlayerId: string | undefined;
     players: Player[];
     planetClass: string;
   })
   ```

   **W/L badge and card tint logic:**
   - Find `humanPlayer = players.find(p => p.id === localHumanPlayerId)`.
   - `humanParticipant = event.participants.find(p => p.name === humanPlayer?.name)`.
   - `humanWon = humanParticipant?.survived === true`.
   - `humanInvolved = humanParticipant !== undefined`.
   - Badge: show "W" (`battleReportOutcomeWin` style) if `humanWon`, "L" (`battleReportOutcomeLoss` style) if `humanInvolved && !humanWon`, nothing if not involved.
   - Card tint: apply `battleReportCardVictory` if `humanWon`, `battleReportCardDefeat` if `humanInvolved && !humanWon`, neither otherwise — same logic as `BattleReportCard`.

   **Home planet conquest banner:** If `event.isHomePlanetConquest === true && humanWon`, render the blue conquest banner `"You took their home planet!"` above the card using the same `homePlanetConquestBanner` + `battleReportCardHomeConquest` styles as `BattleReportCard`.

   **Participant rows:** Iterate `event.participants`. For each participant:
   - Display name: if `participant.name === humanPlayer?.name` render `"You"`, else `participant.name`.
   - Ships before: `participant.shipsBefore`.
   - If `participant.survived === true`: suffix `"→ ${event.remainingShips} remaining"` in the same accent colour as existing victory text; do not dim.
   - If `participant.survived === false`: dim the row (`opacity: 0.45`); show a `"✗"` suffix or cross icon to the right.

   **Planet class circle + planet name:** Reuse the exact same `battleReportHeader`, `battleReportPlanetCircle`, `battleReportPlanetCircleText`, `battleReportPlanetName`, `battleReportHeaderCenter`, and `battleReportHeaderEnd` styles as the existing `BattleReportCard` — copy that header `<View>` block verbatim.

   **Subtitle row:** Between the header and the participant list, add a single centered `<Text>` with a small muted label (e.g. `"⚔ Free-for-all"`) using a new inline style `{ fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 6 }`.

3. **Extend `humanCombatByPlanetKey`** (or `humanCombatByPlanetName`) to include `multiway_combat` events. Find where the Map is built (around line 1125) and add:
   ```typescript
   .filter((e): e is CombatTurnEvent | MultiwayCombatTurnEvent =>
     e.kind === 'combat' || e.kind === 'multiway_combat'
   )
   ```
   Key `multiway_combat` events by `event.planetId ?? event.planetName` (same as `combat`). The value stored per key can be a union `CombatTurnEvent | MultiwayCombatTurnEvent`; the tap handler will need to handle both variants (see item 5).

4. **Extend `battlePlanetKeys`** (or `battlePlanetNames`) Set to include `multiway_combat` events:
   ```typescript
   .filter(e => e.kind === 'combat' || e.kind === 'multiway_combat')
   ```

5. **Render `MultiwayBattleReportCard` at all three battle report render sites** (search for `<BattleReportCard`). At each site, after the existing `BattleReportCard` entries (or in the same map), add handling for `multiway_combat` events:
   ```typescript
   {event.kind === 'multiway_combat' && (
     <MultiwayBattleReportCard
       key={`multiway-${event.planetName}-${index}`}
       event={event}
       localHumanPlayerId={localHumanPlayerId}
       players={players}
       planetClass={...}
     />
   )}
   ```
   Follow the same sorting logic already applied to `combat` events (home planet conquests float to the top).

6. **Update `formatTurnEvent`** (around line 142) to handle `multiway_combat`:
   ```typescript
   case 'multiway_combat': {
     const winner = event.participants.find(p => p.survived);
     const humanPlayer = localHumanPlayerId !== undefined
       ? players?.find(p => p.id === localHumanPlayerId)
       : undefined;
     const humanWon = winner?.name === humanPlayer?.name;
     const outcome = humanWon ? `You Won (${event.remainingShips} remaining)` : `${event.winnerName} Won (${event.remainingShips} remaining)`;
     return `${event.planetName}: Free-for-all — ${outcome}`;
   }
   ```

7. `npx tsc --noEmit` must pass clean after the change.

---

## Phase 42 — PWA Launch

Converting the app to a Progressive Web App (PWA). Work in order: Task 204 and 205 first (can be done together), then 206–208 (can be parallelised), Task 209 last.

> **Push notification note:** `expo-notifications` has no support for background push on the web platform. Background push in a PWA requires the browser's native **Web Push API** (VAPID). This phase replaces the `expo-notifications` token flow with `PushManager.subscribe()` on web and requires coordinated backend changes (see `backend/docs/project/current-state.md` Phase 9). Without the backend changes, in-app foreground alerts still function — only background push will be absent.

---

### Task 204 — Frontend: Add PWA configuration to `app.json`

**Goal:** Configure the `web` section of `app.json` so that `expo export --platform web` produces a proper PWA manifest with standalone display mode, a dark space theme, and the correct metadata for "Add to Home Screen" on iOS Safari and Android Chrome.

**File:** `app.json`

**Requirements:**

Replace the existing minimal `web` block with:
```json
"web": {
  "output": "static",
  "bundler": "metro",
  "favicon": "./assets/favicon.png",
  "name": "Gaza Galaxy",
  "shortName": "Gaza Galaxy",
  "description": "Async turn-based space strategy",
  "themeColor": "#0a0a1a",
  "backgroundColor": "#0a0a1a",
  "display": "standalone",
  "orientation": "portrait",
  "startUrl": "/",
  "scope": "/"
}
```

Key fields:
- `output: 'static'` — required for `expo export --platform web` to produce a deployable static bundle.
- `display: 'standalone'` — hides the browser address bar when installed to home screen; required for a native app feel.
- `themeColor` / `backgroundColor: '#0a0a1a'` — sets OS-level chrome color to match the game's dark theme.

After editing, run `expo start --web` and open DevTools → Application → Manifest; confirm all fields are populated and no manifest errors are shown.

---

### Task 205 — Frontend: Audit and fix web compatibility for all packages

**Goal:** Identify every dependency that either lacks web support or requires extra configuration on web, and patch each one so that `expo start --web` runs without runtime errors or visually broken UI.

**Packages to check and known issues:**

1. **`@react-native-community/slider`** — the native module has no web renderer and will throw. Fix by creating a platform-aware wrapper:
   - Create `src/components/PlatformSlider.tsx`:
     ```typescript
     import { Platform } from 'react-native';
     import SliderNative from '@react-native-community/slider';

     // Web fallback — inline input[type=range] styled to match
     function SliderWeb(props: { value: number; minimumValue: number; maximumValue: number; onValueChange: (v: number) => void; style?: object }) {
       return (
         <input
           type="range"
           min={props.minimumValue}
           max={props.maximumValue}
           value={props.value}
           step={0.01}
           onChange={e => props.onValueChange(Number(e.target.value))}
           style={{ width: '100%', accentColor: '#4a90e2', ...(props.style as object) }}
         />
       );
     }

     export const PlatformSlider = Platform.OS === 'web' ? SliderWeb : SliderNative;
     ```
   - Replace all imports of `Slider` from `@react-native-community/slider` in `GameScreen.tsx` with `PlatformSlider` from `src/components/PlatformSlider`.

2. **`expo-notifications` on web** — `Notifications.requestPermissionsAsync()` and `getExpoPushTokenAsync()` throw on web. Gate the existing `setupPushNotifications()` call and `registerNotificationHandler()` call in `App.tsx` with `Platform.OS !== 'web'`. The web push path is handled separately in Task 207.

3. **`react-native-gesture-handler`** — confirm `<GestureHandlerRootView style={{ flex: 1 }}>` wraps the root in `App.tsx` with no `Platform` guard (it must run on web too).

4. **`react-native-svg`** — generally compatible on web. If SVG components fail to render, add a Metro alias in `metro.config.js`:
   ```js
   config.resolver.alias = {
     'react-native-svg': require.resolve('react-native-svg/src/ReactNativeSVG.web.js'),
   };
   ```

5. **`react-native-reanimated` v4** — has web support. Confirm `useAnimatedStyle` gestures and scale/translate animations work in the browser; follow the Reanimated web setup notes for v4 if the console shows initialization warnings.

6. **`react-native-safe-area-context`** — works on web. Confirm `SafeAreaProvider` is present in `App.tsx` without a native-only platform gate.

**Acceptance criteria:** Run `expo start --web`, navigate through HomeScreen → new game setup (confirm slider renders) → launch a Solo game → confirm the map renders with SVG fleet lines and gestures work. `npx tsc --noEmit` passes clean.

---

### Task 206 — Frontend: Create PWA service worker (`public/sw.js`)

**Goal:** Add a service worker that (a) handles background `push` events from the backend's web push delivery and shows a system notification, (b) handles `notificationclick` to route the user into the correct game, and (c) claims the page on activation for immediate control.

**File:** `public/sw.js` (the `public/` directory is served verbatim by Expo's static web export; create it if it does not exist)

**Depends on:** Task 204 (PWA config) must be done so the service worker is served from the correct scope.

**Requirements:**

```js
// public/sw.js

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(clients.claim()); });

// Background push → show system notification
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = {}; }
  const title = payload.title || 'Gaza Galaxy';
  const options = {
    body: payload.body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: payload.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification tap → focus open window or open new window, pass game_id
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const gameId = event.notification.data?.game_id;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', game_id: gameId });
          return client.focus();
        }
      }
      return clients.openWindow(gameId ? `/?game_id=${gameId}` : '/');
    })
  );
});
```

**Notes:**
- The push payload JSON shape mirrors the existing Expo push `data` field: `{ title, body, data: { game_id: number, event: "your_turn" | "game_started" | "game_finished" | "invite_received" | "game_cancelled" } }`. The backend (Task 9.5) must send this shape.
- `client.postMessage` is consumed in Task 208 to trigger in-app navigation when the app is already open.
- `icon: '/icon.png'` — Expo's static export places the app icon at `/icon.png`; confirm the exact path in the `dist/` output after `npm run build:web` and adjust if needed.

---

### Task 207 — Frontend: Web Push subscription registration in `pushNotificationService.ts`

**Goal:** Add a web-platform code path to `src/services/pushNotificationService.ts` that requests Notification permission, registers the service worker, subscribes to push via `PushManager` with the VAPID public key, and uploads the `PushSubscription` JSON to `POST /api/push-subscription`.

**Files:**
- `src/services/pushNotificationService.ts` — add `setupWebPushNotifications()`
- `App.tsx` — call `setupWebPushNotifications()` on the web platform post-login

**Depends on:** Backend Phase 9 (Tasks 9.1, 9.4) must be deployed — specifically `EXPO_PUBLIC_VAPID_PUBLIC_KEY` must be set in `.env` and the `/api/push-subscription` endpoint must exist.

**Requirements:**

1. **Add VAPID key conversion helper** at the top of `pushNotificationService.ts`:
   ```typescript
   function urlBase64ToUint8Array(base64String: string): Uint8Array {
     const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
     const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
     const rawData = atob(base64);
     return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
   }
   ```

2. **Add `setupWebPushNotifications()`** exported async function:
   ```typescript
   export async function setupWebPushNotifications(): Promise<void> {
     if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

     const permission = await Notification.requestPermission();
     if (permission !== 'granted') return;

     const registration = await navigator.serviceWorker.register('/sw.js');
     await navigator.serviceWorker.ready;

     const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
     if (!vapidKey) { console.warn('[Push] VAPID public key not configured'); return; }

     let subscription = await registration.pushManager.getSubscription();
     if (!subscription) {
       subscription = await registration.pushManager.subscribe({
         userVisibleOnly: true,
         applicationServerKey: urlBase64ToUint8Array(vapidKey),
       });
     }

     // Skip upload if subscription is unchanged
     const subscriptionJson = JSON.stringify(subscription.toJSON());
     const stored = await AsyncStorage.getItem('web_push_subscription');
     if (stored === subscriptionJson) return;

     await apiClient.post('/push-subscription', { subscription: subscription.toJSON() });
     await AsyncStorage.setItem('web_push_subscription', subscriptionJson);
   }
   ```

3. **Update `App.tsx`** — in the `useEffect` that calls `setupPushNotifications()`, branch on platform:
   ```typescript
   import { Platform } from 'react-native';
   // ...
   if (Platform.OS === 'web') {
     setupWebPushNotifications().catch(() => {});
   } else {
     setupPushNotifications().catch(() => {});
   }
   ```
   Also gate the existing `registerNotificationHandler()` call with `Platform.OS !== 'web'`.

4. `npx tsc --noEmit` must pass clean.

---

### Task 208 — Frontend: Handle `NOTIFICATION_CLICK` postMessage deep link in `App.tsx` for web

**Goal:** When the PWA is already open and the user taps a push notification, the service worker calls `client.postMessage({ type: 'NOTIFICATION_CLICK', game_id })`. `App.tsx` must listen for this and navigate to the game — mirroring the native deep-link handler from Task 148.

**File:** `App.tsx`

**Depends on:** Tasks 206 and 207.

**Requirements:**

1. **Warm-start (app open):** Add a `useEffect` in `App.tsx` gated on `Platform.OS === 'web'` that registers a `message` listener on `navigator.serviceWorker`:
   ```typescript
   useEffect(() => {
     if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;
     const handler = (event: MessageEvent) => {
       if (event.data?.type !== 'NOTIFICATION_CLICK') return;
       const gameId = event.data.game_id;
       if (!gameId) return;
       pendingGameId.current = gameId;
       consumePendingGameId();
     };
     navigator.serviceWorker.addEventListener('message', handler);
     return () => navigator.serviceWorker.removeEventListener('message', handler);
   }, [currentUser, isLoadingAuth]);
   ```

2. **Cold-start (app launched by service worker `openWindow('/?game_id=42')`):** Read `game_id` from `window.location.search` on mount:
   ```typescript
   useEffect(() => {
     if (Platform.OS !== 'web') return;
     const params = new URLSearchParams(window.location.search);
     const rawId = params.get('game_id');
     if (rawId) pendingGameId.current = Number(rawId);
   }, []);
   ```

3. `consumePendingGameId()` is already implemented (Task 148) — no changes needed. The existing cold-start `useEffect` on `currentUser` that calls `consumePendingGameId()` after auth resolves will handle the web cold-start case automatically.

4. `npx tsc --noEmit` must pass clean.

---

### Task 209 — Frontend: Add `build:web` script, `.env.example`, and deployment notes

**Goal:** Make the PWA buildable and deployable by any dev with a single command. Document the required environment variables and hosting steps.

**Files:**
- `package.json` — add scripts
- `.env.example` — create in `frontend/` root
- `docs/development/setup.md` — add "PWA Build & Deploy" section

**Requirements:**

1. **`package.json` scripts:**
   ```json
   "build:web": "expo export --platform web",
   "serve:web": "npx serve dist"
   ```

2. **`.env.example`** (create at `frontend/.env.example`):
   ```
   # Backend API base URL (no trailing slash)
   EXPO_PUBLIC_API_URL=https://your-api-domain.com

   # VAPID public key from the backend (run: php artisan vapid:generate)
   EXPO_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key_here
   ```

3. **`docs/development/setup.md`** — add a section:
   ```markdown
   ## PWA Build & Deploy

   1. Copy `.env.example` → `.env` and fill in both values.
   2. `npm run build:web` — outputs static bundle to `dist/`.
   3. Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, etc.).
   4. The backend must be live at `EXPO_PUBLIC_API_URL`.

   **Installing on iOS:** Open in Safari → Share → "Add to Home Screen" → runs in standalone mode.
   **Installing on Android:** Chrome will auto-prompt after a couple of visits, or use the browser menu.

   **Push notification requirement:** iOS 16.4+ and Android Chrome support Web Push for installed PWAs.
   Push notifications will be silent (no background delivery) until Backend Phase 9 tasks are deployed.
   ```

---

## Phase 44 — Bug Fix: Multiplayer — Factory Planet Attacked with 0 Troops Despite Active Production

**Status:** Not started.

**Symptom:** In multiplayer, a player sends all troops from a planet that has active factories set to full troop output (e.g. A-class, 15 factories, slider at 100%). On the next turn, an enemy attacks that planet with 1 troop and takes it. The battle report shows `0` defending troops, meaning the planet's production output was never added to the garrison before combat resolved.

**Root cause:**

`turnEngine.resolveTurn` has two paths where combat is resolved:

1. **Step 2 — Early arrivals** (lines 303–371): resolves fleets with `turnsRemaining <= 0 && dispatchedInRound < state.roundNumber` at the *start* of any player's turn — **before `runProduction` is ever called**.
2. **Step 8 — Round-wrap arrivals** (lines 443–511): resolves fleets that hit `turnsRemaining = 0` during `advanceFleets` — **after `runProduction` runs** (Phase 30 fix, Task 183).

Phase 30 only fixed the round-wrap path. The early-arrivals block (step 2) has no production guard. Under normal play, step 2 should be empty (arrived fleets are immediately resolved and removed from `state.fleets` during the round-wrap block, and `drainStaleFleets` removes any `turnsRemaining <= 0` remnants on game load). However, in async multiplayer there are edge cases — mid-turn saves restored from `partialStateJson`, state transitions involving AI turns, or any future code path that bypasses `drainStaleFleets` — where step 2 can process enemy attacks before production runs. A defender with 0 garrison and 15 active factories shows 0 `defenderShipsBefore` in the battle report and the attacker wins instantly.

**Fix overview:**

Pre-compute a `willRoundWrap` flag at the very top of `resolveTurn`, before any fleet resolution or player actions are processed. Use it to run `runProduction` **once**, **before** the early-arrivals block. Remove (or guard with `!productionAlreadyRan`) the duplicate `runProduction` call inside the `isRoundWrap` block so production never runs twice in the same `resolveTurn` call.

Pre-computing `willRoundWrap` uses `state.players` (unmodified at that point) to find the next non-eliminated player:

```typescript
// At the TOP of resolveTurn, before step 2
const preCurrentIndex = state.players.findIndex((p) => p.id === state.currentPlayerId);
const preNextId = nextNonEliminatedPlayerId(state.players, state.currentPlayerId);
const preNextIndex = state.players.findIndex((p) => p.id === preNextId);
const willRoundWrap = state.status === 'active' && preNextIndex <= preCurrentIndex;
let productionAlreadyRan = false;

// Run production BEFORE step 2 early arrivals when this turn is a round-wrap
if (willRoundWrap) {
  const { map: productionMap, players: productionPlayers } = runProduction(
    map, players, state.roundNumber, events,
  );
  map = productionMap;
  players = productionPlayers;
  productionAlreadyRan = true;
}
```

Then in the `isRoundWrap` block (step 8), skip the `runProduction` call if `productionAlreadyRan`:

```typescript
if (isRoundWrap) {
  if (!productionAlreadyRan) {
    const { map: productionMap, players: productionPlayers } = runProduction(
      map, players, state.roundNumber, events,
    );
    map = productionMap;
    players = productionPlayers;
  }
  // advanceFleets + combat unchanged …
}
```

**Why pre-computing `willRoundWrap` from `state.players` is safe:**

The pre-computation uses the player array before any this-turn eliminations. In the rare case where a player is eliminated during step 2 or step 3 of this same turn (changing who "next" is), production may run one extra time — but:
- Production adds troops and gold; running it never corrupts state.
- Forfeited (newly neutral) planets are skipped by `runProduction`, so eliminated players don't benefit.
- The final `isRoundWrap` at step 7 still uses the post-action `players` array for correctness; the `productionAlreadyRan` guard prevents a double-run.

**Edge cases preserved:**
- Non-wrap turns: `willRoundWrap = false`, production never runs early, behavior unchanged.
- Round-wrap turns with no early arrivals: production runs before step 2 (no arrivals), then step 8 skips the production call. Net result: identical to pre-fix behavior.
- Round-wrap turns WITH early arrivals (the bug): production now runs first, defenders have their garrison topped up before any combat.

---

### Task 211 — Frontend: Guarantee production runs before combat in all `resolveTurn` code paths

**File:** `frontend/src/game/turnEngine.ts`

**Requirements:**

1. At the very top of `resolveTurn` (after the guard clauses, before any fleet or action processing), compute `willRoundWrap` using `state.players` and `state.currentPlayerId` via the existing `nextNonEliminatedPlayerId` helper. Declare a `productionAlreadyRan` boolean (initially `false`).

2. Immediately after that computation, if `willRoundWrap === true`, call `runProduction(map, players, state.roundNumber, events)` and set `productionAlreadyRan = true`. This covers all combat in step 2 (early arrivals).

3. In the `isRoundWrap` block (current step 8), wrap the existing `runProduction` call in `if (!productionAlreadyRan)`. All other logic in step 8 (`advanceFleets`, arrival grouping, combat) is unchanged.

4. Update `docs/systems/turn-engine.md` — revise the **Turn Resolution Order** to show that production now runs before step 2 on round-wrap turns:
   - Before step 2: "Run production (round-wrap turns only, before any fleet arrival) — prevents 0-troop combat when owner sent all garrison same round."
   - Step 8 note: "Production call skipped if already ran before step 2."

5. `npx tsc --noEmit` must pass clean.

**Verification:**

- Pass-and-play 2-player test: Player A sends all troops from a 15-factory A-class planet (100% troops slider). Player B sends 1 troop to that planet (adjacent, turnsRemaining = 1). Player A ends turn; Player B ends turn (triggers round wrap). Confirm battle report shows `defenderShipsBefore = 15` (not 0) and Player A holds the planet.
- Confirm no double production: check gold and troop totals are not doubled on round-wrap turns. `runProduction` emits `troop_produced` events — confirm each planet emits at most one per round.
- Multiplayer async regression: end turns normally in a 2-player async game for several rounds; confirm garrison counts grow as expected.

---

## Phase 43 — Bug Fix: Battle Report Flashes Briefly After Ending Async Multiplayer Turn

**Status:** Not started.

When an async multiplayer player taps **End Turn**, they briefly see a battle report modal for the combat events that just resolved during *their own* turn — before the submit completes and navigation home occurs. This is wrong: the battle report should only appear at the **start** of a player's *next* turn, showing what happened on the **opponent's** turn.

**Second observed variant:** A player may see the battle report flicker at the end of their turn even though they saw no battles during their turn — this happens when the round resolution (e.g. AI turns driven by `runAiTurnsUntilHuman`) produces combat events involving the outgoing player that resolve as part of the submit-time `endTurn` call.

---

### Task 210 — Frontend: Do not populate the outgoing async player's battle archive during `endTurn`

**File:** `frontend/src/store/gameStore.ts`

**Root cause:**

`endTurn()` calls `buildPlayerReports(events, finalState.players, finalState.map.planets)` on all events from the just-resolved round. This builds a per-player archive that correctly includes the **outgoing** player's own combat events (e.g. Player A attacked Planet X). The archive is then merged into `newArchive` and committed via `set()`.

Because the `set()` call happens *before* `isSubmittingTurn: true` is set and *before* the async `submitTurn` POST completes, `GameScreen`'s "async auto-open" effect fires immediately:

```ts
// GameScreen.tsx ~line 1402
if (prev === 0 && humanCombatEvents.length > 0 && !showingLockScreen) {
  setShowBattleReportModal(true);  // ← fires here, wrong timing
}
```

The player sees the modal flash. A moment later `submitTurn` resolves → `resetGame()` + `shouldReturnHome: true` → navigate home.

**Why the outgoing player's archive entry should be absent in async mode:**

- In pass-and-play, building the outgoing player's archive is correct — those events will be shown to them when play cycles back around on the same device.
- In async multiplayer, the outgoing player is about to navigate home. `loadAsyncGame` will overwrite `playerBattleArchiveByPlayerId` when they return for their next turn, using `latest_events` from the *opponent's* submitted turn. Temporarily writing the outgoing player's own events into the archive serves no purpose and triggers the spurious modal.

**Fix:**

After the archive merge loop in `endTurn()`, and before the main `set()` call, delete the outgoing player's entries from `newArchive` and `newTurnReport` when the game is async:

```ts
// After: for (const [playerId, playerEvents] of Object.entries(builtTurnReport)) { ... }
// Before: set({ ... })

if (isAsync) {
  delete newArchive[humanPlayer.id];
  delete newTurnReport[humanPlayer.id];
}
```

This ensures:
1. `playerBattleArchiveByPlayerId[humanPlayer.id]` is empty (or unchanged from pre-turn) when the `set()` fires.
2. `humanCombatEvents.length` does not jump from 0 → N during the submit window.
3. The "async auto-open" effect never fires on End Turn.
4. The full `events` array (including Player A's combat events) is still sent to the backend as part of `submitTurn` — so Player B sees the correct battle report when they load the game.

**Verification:**

- End an async multiplayer turn that involves combat (send a fleet that resolves via AI turns). Confirm no battle report modal appears after tapping End Turn.
- Start a fresh async turn where the opponent had combat events → confirm the battle report still opens correctly when loading the game (`loadAsyncGame` path — unaffected by this change).
- Pass-and-play: confirm no change in battle report behaviour (the `isAsync` guard leaves that path untouched).

**Estimated complexity:** Trivial — two `delete` lines guarded by `if (isAsync)`.

---
