# Map Generation System

## Status
**Implemented** in `src/game/mapGenerator.ts`.

## Overview
Generates the galaxy map for a new game. The map is a 2D field of planets scattered across a fixed-dimension grid. Spawn/home placement is handled separately by `spawnPlacer.ts`.

## Public API

### `MapConfig`
```typescript
interface MapConfig {
  seed: number;
  width: number;
  height: number;
  planetCount: number;
  playerCount: number; // reserved for spawn placement; not used by generateMap
}
```

### `generateMap(config: MapConfig): GameMap`
Returns a `GameMap` with `width`, `height`, and `planets[]`. Each planet is neutral, has `shipCount: 0`, `buildings: []`, and `isHomePlanet: false`.

## Seeded RNG
Uses **mulberry32**, a self-contained 32-bit seeded PRNG. No `Math.random()` anywhere in this module.

- Input: numeric `seed` from `MapConfig`
- Same seed always produces the same planet positions and class assignments
- Internal helper `createRng(seed)` returns `() => number` yielding values in `[0, 1)`

## Planet Placement
1. Growth runs on a **virtual canvas** of `2 × width` by `2 × height` (soft bounds — no padded-edge rejection during growth).
2. For each planet `0 .. planetCount - 1`, sample a candidate via `growthPosition` (up to 2000 attempts per planet):
   - **First planet:** placed at the virtual canvas centre (`round(virtualWidth/2)`, `round(virtualHeight/2)`) so growth expands outward symmetrically
   - **Later planets:** pick a uniform-random parent from already-placed planets; sample distance `2.5 + rng() * 7` (uniform [2.5, 9.5] clicks); sample angle `0–2π`; candidate = `round(parent + dist × [cos θ, sin θ])`
   - Candidates outside the virtual canvas (`x < 0`, `x > virtualWidth − 1`, etc.) return `null` and the retry loop tries again (new parent/direction on next attempt)
3. Reject candidates that violate minimum Euclidean distance from all already-placed planets — checks use virtual-space coordinates with a higher floor (`MIN_PLANET_DISTANCE × 2`) because normalization compresses the 2× virtual canvas into the final grid.
4. Throw if placement fails after all attempts
5. **Normalization pass:** uniform scale (preserves distance ratios; independent X/Y stretch was shrinking pairs) maps the virtual bounding box into the configured grid with `PLANET_EDGE_PADDING = 2`.
6. **Spacing enforcement pass:** `enforceMinimumSpacing` nudges any post-normalize/integer-rounding pairs closer than `MIN_PLANET_DISTANCE` apart in final grid coordinates (what `computeClickDistance` reports).
7. Assign id `planet-0`, `planet-1`, …

This produces varied irregular galaxy shapes (chains, arms, clusters) per seed (Task 92), replacing the symmetric central Gaussian blob (Tasks 89–91) and earlier multi-cluster layout (Task 86). The **`scattered`** galaxy shape uses this algorithm; see Galaxy Shapes below.

## Post-Placement Connectivity Pass
After shape placement and bounding-box normalization, `ensureConnectivity(positions)` runs **before** planet objects are built.

- Treats planets as nodes in an undirected graph: an edge exists when Euclidean distance ≤ **11 clicks** (matches `BASE_FLEET_RANGE_CLICKS` in `movementEngine.ts`).
- If Union-Find finds more than one component, repeatedly connects the two closest planets in different components by inserting **bridge planets** along the line between them.
- Bridge count for a gap of distance `d`: `ceil(d / 11) - 1` intermediate positions at equal parametric steps; each bridge is placed at the rounded midpoint, with a small shell search (radius 0–3) for `MIN_PLANET_DISTANCE` clearance; if none found, that bridge slot is skipped (connectivity no longer overrides spacing).
- Bridge planets receive normal RNG-driven name, class, and attributes when `positions.map(...)` builds `Planet` objects (they append to the positions array).
- Safety cap: 50 bridge iterations per map.
- `spawnPlacer` is unaffected (reads final `planets[].position` only).

## Galaxy Shapes
Each game is assigned a galaxy shape via the seeded RNG (or an explicit `MapConfig.galaxyShape`).
The shape controls the planet placement algorithm used.

| Shape | Description |
|-------|-------------|
| `scattered` | Organic parent-linked growth from a central seed (current algorithm) |
| `arms` | 2–4 arms radiating from centre; planets distributed round-robin per arm at random spine distance with Gaussian lateral spread σ ≈ 3 |
| `dense_core` | Radial density — planets biased toward the centre using inverse-square-root distribution; sparse edges |
| `ring` | Annular band — planets in a ring (inner void ~40% of radius, ring thickness ~45%); empty centre and outer fringe |

### Minimum Distance Rule
```
MIN_PLANET_DISTANCE = 2.5
minDistance = MIN_PLANET_DISTANCE
```
Minimum spacing is **2.5 clicks in final grid coordinates** (the same units `computeClickDistance` uses in the fleet dispatch UI). Placement checks a higher virtual-space floor before normalization; `enforceMinimumSpacing` corrects any pairs that slip below 2.5 after normalize/round (Task 171 fix).

### Preset Capacity Notes
Planet count and grid dimensions are now computed dynamically from map size and player count. `planetCount = BASE[size] + (playerCount − 2) × PER_EXTRA[size]`. Grid: `gridSide = Math.ceil(Math.sqrt(planetCount × 90))` (square maps).

| Size   | 2-player base | Per extra player |
|--------|---------------|------------------|
| Small  | 20            | +10              |
| Medium | 30            | +15              |
| Large  | 35            | +25              |

Example planet counts and grid sizes: Small 2P = 20 → 43×43; Small 4P = 40 → 60×60; Medium 2P = 30 → 52×52; Medium 4P = 60 → 74×74; Large 2P = 35 → 56×56; Large 4P = 85 → 88×88; Large 8P = 185 → 129×129.

## Planet Class Distribution
Weighted roll per planet (must sum to 100%):

| Class | Weight |
|-------|--------|
| D     | 27%    |
| C     | 25%    |
| E     | 25%    |
| B     | 15%    |
| A     | 8%     |

## Production Modifier Reference
| Class | Rarity   | Production Modifier |
|-------|----------|---------------------|
| A     | Rare     | High                |
| B     | Uncommon | Medium-high         |
| C     | Common   | Medium              |
| D     | Common   | Low-medium          |
| E     | Common   | Low                 |

## Planet Names

- Names are generated at map creation using the seeded RNG.
- Format: **[Adjective] [Noun]** from fixed word lists (`PLANET_ADJECTIVES`, `PLANET_NOUNS` in `mapGenerator.ts`).
- Names are stable for the life of the game; the same seed always produces the same names.
- **Name + class** is the minimal info visible to all players (per fog of war rules).

## Spawn Placement
Handled by `spawnPlacer.ts`. `generateMap` does not set `isHomePlanet` or assign player owners.

### Home Planet Classes (Task 53)
After fair spawn assignment selects one home planet per player, each home planet is assigned a random class from **A-G** (equal probability, seeded RNG). This assignment only affects home planets.

| Class | Starting Gold | Building Slots |
|-------|---------------|----------------|
| A     | 1000          | 5              |
| B     | 1100          | 6              |
| C     | 1200          | 6              |
| D     | 1300          | 7              |
| E     | 1400          | 7              |
| F     | 1500          | 8              |
| G     | 1600          | 8              |

- Home planet `class` is overridden to the assigned tier (A-G).
- Home planet `buildingSlots` is overridden using the table above.
- Player starting gold is derived from the same home-planet class table.
- Non-home planets remain exactly as generated by `mapGenerator.ts` (class/slots unchanged).

## Fairness Scoring (future)
The generator may later:
1. Generate full map
2. Score candidate home planet placements
3. Reject maps below fairness threshold
4. Retry until a valid map is produced

## Fog of War

Information visible to each player when rendering the map (see `buildVisibleState` in `src/store/gameStore.ts`):

- **Own planets:** full info visible — troop count, buildings, production slider, troop accumulator, owner, class, position, and name.
- **Other planets (neutral or enemy):** only **position**, **class**, and **name** are meaningful to the viewer; troop count, buildings, building slots, production slider, and troop accumulator are hidden (zeroed in the filtered view).
- **Fleets:** only the viewing player's own fleets are included in the visible game state; enemy fleets are excluded.

Current `GameScreen` rendering applies a visibility-aware tint palette on top of that filtered state:

- **Own planets (`planet.owner === humanPlayerId`):** `#27ae60` (green).
- **Neutral planets (`planet.owner === 'neutral'`):** `#2a2a4a` (very dim neutral).
- **Enemy/non-owned planets:** `#333355` (dark gray-blue fog blob).
- Selection feedback is ownership-gated: the animated white/blue pulse border renders only for owned planets, and tapping a non-owned planet clears selection instead of setting `selectedPlanetId`.

Fleet dots/lines intentionally still use per-player colors in `FleetLayer` for readability of the local player's in-transit ships.

Opponent **gold** and **researchPoints** remain visible in the player list for now (leaderboard-style info).

## Open Questions
- What are the exact map width/height defaults?
- What is the target planet count range per player count?

## Changelog
- 2026-05-31: Task 171 fix — `MIN_PLANET_DISTANCE` now enforced in **final grid coordinates** after uniform normalize + `enforceMinimumSpacing`; connectivity bridge forced-placement removed; fixes sub-2.5 pairs (e.g. 1.4 clicks) caused by normalize compression and integer rounding.
- 2026-05-31: Task 171 — `MIN_PLANET_DISTANCE` 4→2.5; `growthPosition` parent offset `4 + rng() * 7` → `2.5 + rng() * 7` ([2.5, 9.5] clicks, mean ~6.0); ~1.5 clicks closer on average; algorithms unchanged.
- 2026-05-29: Bug fix — `ensureConnectivity` post-placement pass guarantees a single connected graph at base fleet range (11 clicks); inserts bridge planets along shortest inter-component gaps when normalization leaves disconnected clusters.
- 2026-05-29: Task 119 — planet count and grid dimensions now computed dynamically from map size + player count; hardcoded presets removed; `MAP_SIZE_CONFIG` + `computeMapDimensions` helper in HomeScreen.
- 2026-05-28: Task 93 — `growthPosition` parent distance uniform `4 + rng() * 7` ([4, 11] clicks); replaces triangular `4 + (rng() + rng()) * 4.5`.
- 2026-05-28: Task 92 — `growthPosition` replaces `gaussianPosition`; organic growth from random seed + parent-linked placement; Phase A/B `connectivityCeiling` removed.
- 2026-05-28: Task 91 — HomeScreen presets `24×24/16`, `40×40/32`, `52×52/54`; `MAX_PLACEMENT_ATTEMPTS_PER_PLANET` 2000; Phase A ceiling `Math.round(width * 0.55)`.
- 2026-05-28: Task 90 — `MIN_PLANET_DISTANCE` 2→4; `gaussianPosition` σ 0.28→0.38; `nearestDistance` helper; two-phase placement (Phase A nearest ≤ 11 clicks, Phase B min-distance only).
- 2026-05-28: Task 89 — replaced multi-cluster placement with single central Gaussian blob (`gaussianPosition`, σ = width × 0.28); out-of-bounds candidates rejected via `null` + retry (no edge clamp).
- 2026-05-28: Task 84 — halved map preset grid dimensions (`20×20/16`, `30×30/32`, `40×40/54`); `MIN_PLANET_DISTANCE` 4→2; `PLANET_EDGE_PADDING` 3→2; visual `CELL_SIZE` unchanged.
- 2026-05-28: Task 56 — replaced dynamic min-distance formula with fixed `MIN_PLANET_DISTANCE = 4` clicks; documented resized map presets (`40×40/16`, `60×60/32`, `80×80/54`) to keep placement feasible with edge padding.
- 2026-05-28: Task 53 — spawn placement now assigns each home planet a seeded-random class A-G (1/7 each), applies class-specific home `buildingSlots`, and drives per-player starting gold from the same class table.
- 2026-05-28: Task 52 — updated class distribution weights to A=8%, B=15%, C=25%, D=27%, E=25% and removed F-P from weighted generation.
- 2026-05-28: Task 48 — added `PLANET_EDGE_PADDING = 3` to keep generated planet centers away from map edges so planet circles stay fully visible/tappable.
- 2026-05-27: Task 42 — documented ownership-gated selection feedback to prevent enemy ownership leakage via pulse borders.
- 2026-05-27: Tasks 34-35 — documented visibility-aware planet tint palette (own green, neutral dim, enemy gray) and fleet-color exception.
- 2026-05-27: Task 17 — random planet name generation added.
- 2026-05-27: Task 14 — fog of war rules added.
- 2026-05-27: Implemented `generateMap`, mulberry32 RNG, `MapConfig`, placement, and class weights.
- 2026-05-27: File created. System not yet implemented.
