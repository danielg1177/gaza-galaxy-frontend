import type { GameMap, Planet, Position } from './types';

const CANDIDATE_ASSIGNMENT_COUNT = 200;
const INITIAL_HOME_SHIP_COUNT = 5;

const SCORE_WEIGHT_DISTANCE = 0.5;
const SCORE_WEIGHT_VARIANCE = 0.3;
const SCORE_WEIGHT_CENTER = 0.2;

interface AssignmentMetrics {
  minPairwiseDistance: number;
  nearbyCountVariance: number;
  centerPenalty: number;
}

interface ScoredAssignment {
  planetIndices: number[];
  metrics: AssignmentMetrics;
}

function euclideanDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function mapCenter(width: number, height: number): Position {
  return { x: (width - 1) / 2, y: (height - 1) / 2 };
}

function maxDistanceFromCenter(width: number, height: number): number {
  const center = mapCenter(width, height);
  const corners: Position[] = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 },
  ];
  let max = 0;
  for (const corner of corners) {
    max = Math.max(max, euclideanDistance(center, corner));
  }
  return max;
}

function minPairwiseDistance(positions: Position[]): number {
  let min = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      min = Math.min(min, euclideanDistance(positions[i], positions[j]));
    }
  }
  return min === Infinity ? 0 : min;
}

function countPlanetsWithinRadius(home: Planet, planets: Planet[], radius: number): number {
  let count = 0;
  for (const planet of planets) {
    if (planet.id === home.id) {
      continue;
    }
    if (euclideanDistance(home.position, planet.position) <= radius) {
      count++;
    }
  }
  return count;
}

function variance(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

function centerPenaltyForPlanet(planet: Planet, width: number, height: number, maxDist: number): number {
  const center = mapCenter(width, height);
  const dist = euclideanDistance(planet.position, center);
  if (maxDist === 0) {
    return 0;
  }
  return 1 - dist / maxDist;
}

function metricsForAssignment(
  planetIndices: number[],
  map: GameMap,
  nearbyRadius: number,
  maxCenterDist: number,
): AssignmentMetrics {
  const homes = planetIndices.map((i) => map.planets[i]);
  const positions = homes.map((p) => p.position);

  const nearbyCounts = homes.map((home) =>
    countPlanetsWithinRadius(home, map.planets, nearbyRadius),
  );
  const penalties = homes.map((home) =>
    centerPenaltyForPlanet(home, map.width, map.height, maxCenterDist),
  );

  return {
    minPairwiseDistance: minPairwiseDistance(positions),
    nearbyCountVariance: variance(nearbyCounts),
    centerPenalty: penalties.reduce((sum, p) => sum + p, 0) / penalties.length,
  };
}

function randomPlanetIndices(planetCount: number, pickCount: number, rng: () => number): number[] {
  const indices = Array.from({ length: planetCount }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, pickCount);
}

function normalizeHigherIsBetter(values: number[], value: number): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return 1;
  }
  return (value - min) / (max - min);
}

function normalizeLowerIsBetter(values: number[], value: number): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return 1;
  }
  return (max - value) / (max - min);
}

function scoreAssignment(
  metrics: AssignmentMetrics,
  allMetrics: AssignmentMetrics[],
): number {
  const distances = allMetrics.map((m) => m.minPairwiseDistance);
  const variances = allMetrics.map((m) => m.nearbyCountVariance);
  const penalties = allMetrics.map((m) => m.centerPenalty);

  const normDistance = normalizeHigherIsBetter(distances, metrics.minPairwiseDistance);
  const normVariance = normalizeLowerIsBetter(variances, metrics.nearbyCountVariance);
  const normCenter = normalizeLowerIsBetter(penalties, metrics.centerPenalty);

  return (
    SCORE_WEIGHT_DISTANCE * normDistance +
    SCORE_WEIGHT_VARIANCE * normVariance +
    SCORE_WEIGHT_CENTER * normCenter
  );
}

function pickBestAssignment(candidates: ScoredAssignment[]): ScoredAssignment {
  const allMetrics = candidates.map((c) => c.metrics);
  let best = candidates[0];
  let bestScore = scoreAssignment(best.metrics, allMetrics);

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const score = scoreAssignment(candidate.metrics, allMetrics);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function applyAssignment(
  map: GameMap,
  planetIndices: number[],
  playerIds: string[],
): GameMap {
  const homeByPlanetIndex = new Map<number, string>();
  for (let i = 0; i < planetIndices.length; i++) {
    homeByPlanetIndex.set(planetIndices[i], playerIds[i]);
  }

  const planets = map.planets.map((planet, index) => {
    const owner = homeByPlanetIndex.get(index);
    if (owner === undefined) {
      return { ...planet };
    }
    return {
      ...planet,
      isHomePlanet: true,
      owner,
      shipCount: INITIAL_HOME_SHIP_COUNT,
    };
  });

  return { width: map.width, height: map.height, planets };
}

/**
 * Assigns one fair home planet per player on an existing map using scored random search.
 * Returns a new map; the input is not mutated.
 */
export function placeSpawns(map: GameMap, playerIds: string[], rng: () => number): GameMap {
  if (playerIds.length > map.planets.length) {
    throw new Error(
      `Cannot place ${playerIds.length} spawns on a map with only ${map.planets.length} planets`,
    );
  }

  if (playerIds.length === 0) {
    return { width: map.width, height: map.height, planets: map.planets.map((p) => ({ ...p })) };
  }

  const nearbyRadius = Math.min(map.width, map.height) * 0.25;
  const maxCenterDist = maxDistanceFromCenter(map.width, map.height);
  const planetCount = map.planets.length;
  const pickCount = playerIds.length;

  const candidates: ScoredAssignment[] = [];
  for (let n = 0; n < CANDIDATE_ASSIGNMENT_COUNT; n++) {
    const planetIndices = randomPlanetIndices(planetCount, pickCount, rng);
    candidates.push({
      planetIndices,
      metrics: metricsForAssignment(planetIndices, map, nearbyRadius, maxCenterDist),
    });
  }

  const best = pickBestAssignment(candidates);
  return applyAssignment(map, best.planetIndices, playerIds);
}
