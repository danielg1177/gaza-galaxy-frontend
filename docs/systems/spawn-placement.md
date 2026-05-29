# Spawn Placement System

## Status
**Implemented** in `src/game/spawnPlacer.ts`.

## Overview
Given an already-generated `GameMap`, assigns one **starting planet** per player using zone-based seeded-random placement. Humans draw from edge-adjacent zones first; AIs draw from the full zone pool (interior + edge) afterward. Returns a new map with home planets configured. Does not mutate the input map.

## Public API

### `placeSpawns(options: PlaceSpawnsOptions): SpawnPlacementResult`

```typescript
export interface PlaceSpawnsOptions {
  map: GameMap;
  humanPlayerIds: string[];
  aiPlayerIds: string[];
  mapSize: MapSize;
  rng: () => number;
}

export interface SpawnPlacementResult {
  map: GameMap;
  homePlanetClassByPlayerId: Record<string, PlanetClass>;
}
```

- **Input:** Neutral map from `generateMap()`, human and AI player id lists (each in slot-index order within its group), `MapSize` tier for minimum human separation, and the caller’s seeded PRNG (`() => number` in `[0, 1)`).
- **Output:** `SpawnPlacementResult` — shallow-copied map with chosen planets marked `isHomePlanet: true`, `owner` set, `shipCount: 5`, class-specific `buildingSlots`, plus `homePlanetClassByPlayerId` for starting gold lookup in the store.
- **Determinism:** Same map, player lists, `mapSize`, and RNG sequence produce the same placement.
- **Errors:** Throws if total player count exceeds planet count, or if an AI spawn cannot be placed.

`MapSize` (`'small' | 'medium' | 'large'`) is exported from `src/game/types.ts` and stored on `GameConfig.mapSize`.

## Zone Geometry

A zone is a rectangular region `{ minX, maxX, minY, maxY }`. A planet belongs to a zone when `zone.minX <= x <= zone.maxX` and `zone.minY <= y <= zone.maxY` (inclusive).

| Constant | Value |
|----------|-------|
| Inner margin from grid edge | **3** cells (avoids absolute corners/boundary) |
| Edge band depth | `Math.round(Math.min(width, height) * 0.28)` cells |

### Edge zones (4, human-eligible)
One band per side — top, bottom, left, right — each running the full length of that side. Corner overlaps between adjacent bands are acceptable.

- **Top:** `y ∈ [3, 3 + depth − 1]`, full width
- **Bottom:** `y ∈ [height − 3 − depth, height − 4]`, full width
- **Left:** `x ∈ [3, 3 + depth − 1]`, full height
- **Right:** `x ∈ [width − 3 − depth, width − 4]`, full height

### Interior zones (4, AI-eligible before edge merge)
The central area not covered by edge bands, split into a 2×2 quadrant grid. Interior bounds start at `3 + depth` inward from each padded edge.

Only zones containing at least one neutral planet are included in the usable list at generation time.

## Placement Algorithm

### Phase 1 — Humans
1. Build edge zones; filter to those with ≥1 neutral planet.
2. Fisher–Yates shuffle the usable edge zone list with the seeded RNG.
3. For each human player in order: take the next unused zone, pick a uniformly random neutral planet inside it.
4. After all humans are assigned, verify every pair of human starting planets has Euclidean grid distance ≥ the map-size minimum (same formula as `computeClickDistance` in `movementEngine.ts`).
5. If the check fails, re-shuffle and retry the entire human assignment — up to **50 attempts**. If all fail, emit `console.warn('Task 127: human min-separation not met after 50 attempts, using last assignment')` and proceed with the last result.

### Phase 2 — AIs
1. Eligible pool = all 4 interior zones + all 4 edge zones (including zones already used by humans).
2. Shuffle the pool.
3. For each AI player in order: take the next unused zone with an available neutral planet, pick a random planet inside it. No minimum-separation check.

### Apply assignment
Mark each chosen planet with seeded class A–G, `isHomePlanet: true`, owner, `shipCount: 5`, and class-specific `buildingSlots` / starting gold via `HOME_PLANET_CLASS_CONFIG` — unchanged from prior implementation.

## Minimum Human Separation

| Map size | Min click distance between any two human starting planets |
|----------|----------------------------------------------------------|
| Small    | 30 clicks                                               |
| Medium   | 40 clicks                                               |
| Large    | 50 clicks                                               |

Distance is Euclidean in grid coordinates: `sqrt((x₁−x₂)² + (y₁−y₂)²)`.

## Integration

- Called after `generateMap()` from `gameStore.startNewGame`.
- `gameStore` derives `humanPlayerIds` and `aiPlayerIds` from `GameConfig.playerSlots` (by `slot.type`, in slot-index order) and passes `config.mapSize`.
- Map generation does not set owners or `isHomePlanet`; this module owns starting positions.

## Changelog
- 2026-05-29: Task 127 — replaced 200-candidate scored-random search with zone-based placement (human edge zones, AI full pool, map-size min separation, options-object API, `MapSize` on `GameConfig`).
- 2026-05-27: Implemented `placeSpawns` with 200-candidate random search and weighted fairness scoring. ~~*(superseded by Task 127)*~~
