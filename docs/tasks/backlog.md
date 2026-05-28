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
