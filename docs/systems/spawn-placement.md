# Spawn Placement System

## Status
**Implemented** in `src/game/spawnPlacer.ts`.

## Overview
Given an already-generated `GameMap` and a list of player ids, selects one home planet per player using fairness scoring over random candidate assignments, then returns a new map with home planets configured. Does not mutate the input map.

## Public API

### `placeSpawns(map: GameMap, playerIds: string[], rng: () => number): GameMap`

- **Input:** Neutral map from `generateMap()`, ordered `playerIds`, and the caller’s seeded PRNG (`() => number` in `[0, 1)`).
- **Output:** New `GameMap` with the same dimensions and planet ids; chosen planets have `isHomePlanet: true`, `owner` set to the matching player id, and `shipCount: 5`.
- **Determinism:** Same map, player list, and RNG sequence produce the same spawn placement.
- **Errors:** Throws if `playerIds.length > map.planets.length`.

## Algorithm

1. Build the full planet list as candidates (indices `0 .. planets.length - 1`).
2. Generate **N = 200** random assignments: shuffle indices with Fisher–Yates, take one planet per player (no repeats).
3. Score each assignment (metrics normalized across all 200 candidates, then weighted).
4. Select the highest-scoring assignment.
5. Return a shallow-copied map with updated planet objects for homes only.

## Fairness Metrics

| Metric | Goal | Weight |
|--------|------|--------|
| Minimum pairwise distance between home planets | Higher is better | **0.5** |
| Variance of nearby planet counts | Lower variance is better (more equal expansion) | **0.3** |
| Center bias penalty (average per home) | Lower penalty is better (prefer edges/corners) | **0.2** |

### Nearby planet count
- Radius: `R = min(map.width, map.height) * 0.25`
- For each home planet, count other planets whose Euclidean distance from the home is `<= R`.
- Compute population variance of those counts across homes in the assignment.

### Center bias penalty
- Map center: `((width - 1) / 2, (height - 1) / 2)`
- Per home: `penalty = 1 - (distanceToCenter / maxCornerDistance)` (0 at far corners, 1 at center).
- Assignment penalty: average of per-home penalties.

### Normalization
Within the batch of 200 candidates, each metric is min–max normalized to `[0, 1]` (higher is better). Equal min/max yields `1` for that metric. Combined score is the weighted sum of the three normalized components.

## Integration

- Called after `generateMap()` from `mapGenerator.ts`.
- Map generation does not set owners or `isHomePlanet`; this module owns starting positions.

## Changelog
- 2026-05-27: Implemented `placeSpawns` with 200-candidate random search and weighted fairness scoring.
