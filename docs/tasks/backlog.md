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

~~### Task 22 — Support up to 8 players (human + AI) with configurable AI difficulty~~ *(completed 2026-05-27 — see `docs/tasks/completed.md`)*

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
- 2026-05-29: AI Brain overhaul (no prior backlog task) — `AiDifficulty` expanded to `'easy' | 'normal' | 'hard'`; `AiPlayerState` fog-of-war memory in `GameState.aiStates`; `updateAiObservation` called by `turnEngine` at end of each AI turn; `computeAiTurn` dispatches per difficulty tier; Normal/Hard: multi-fleet (3/5 per turn), `BUILD`/`SET_PRODUCTION_SLIDER` `PlayerAction` variants, building strategy, slider management, strategic phases (expand/build/strike/defend); Hard: scout probes; Easy: original heuristic preserved; HomeScreen adds Hard difficulty chip; all AI state lives in `GameState` for backend-portable serialisation; `npx tsc --noEmit` passes clean.
