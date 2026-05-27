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
1. For each planet `0 .. planetCount - 1`, sample a random integer grid position `(x, y)` with `x ∈ [0, width-1]`, `y ∈ [0, height-1]`
2. Reject candidates that violate minimum Euclidean distance from all already-placed planets
3. Retry up to 1000 times per planet; throw if placement fails
4. Assign id `planet-0`, `planet-1`, …

### Minimum Distance Formula
```
minDistance = max(2, min(width, height) / (planetCount * 0.5))
```
The floor of `2` prevents degenerate spacing on small maps.

## Planet Class Distribution
Weighted roll per planet (must sum to 100%):

| Class | Weight |
|-------|--------|
| E     | 35%    |
| D     | 30%    |
| C     | 20%    |
| B     | 10%    |
| A     | 5%     |

## Production Modifier Reference
| Class | Rarity   | Production Modifier |
|-------|----------|---------------------|
| A     | Rare     | High                |
| B     | Uncommon | Medium-high         |
| C     | Common   | Medium              |
| D     | Common   | Low-medium          |
| E     | Common   | Low                 |

## Spawn Placement
Handled by `spawnPlacer.ts` (not yet implemented). `generateMap` does not set `isHomePlanet` or assign player owners.

## Fairness Scoring (future)
The generator may later:
1. Generate full map
2. Score candidate home planet placements
3. Reject maps below fairness threshold
4. Retry until a valid map is produced

## Open Questions
- What are the exact map width/height defaults?
- What is the target planet count range per player count?

## Changelog
- 2026-05-27: Implemented `generateMap`, mulberry32 RNG, `MapConfig`, placement, and class weights.
- 2026-05-27: File created. System not yet implemented.
