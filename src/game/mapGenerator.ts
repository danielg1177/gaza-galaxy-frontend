import type { GameMap, Planet, PlanetClass, Position } from './types';

export interface MapConfig {
  seed: number;
  width: number;
  height: number;
  planetCount: number;
  playerCount: number;
}

const PLANET_CLASS_WEIGHTS: readonly { class: PlanetClass; weight: number }[] = [
  { class: 'E', weight: 0.35 },
  { class: 'D', weight: 0.3 },
  { class: 'C', weight: 0.2 },
  { class: 'B', weight: 0.1 },
  { class: 'A', weight: 0.05 },
];

const MIN_DISTANCE_FLOOR = 2;
const MAX_PLACEMENT_ATTEMPTS_PER_PLANET = 1000;

/**
 * Mulberry32 — compact seeded PRNG. Same seed yields the same sequence every run.
 */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function euclideanDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function minPlanetDistance(width: number, height: number, planetCount: number): number {
  const suggested = Math.min(width, height) / (planetCount * 0.5);
  return Math.max(MIN_DISTANCE_FLOOR, suggested);
}

function rollPlanetClass(rng: () => number): PlanetClass {
  const roll = rng();
  let cumulative = 0;
  for (const entry of PLANET_CLASS_WEIGHTS) {
    cumulative += entry.weight;
    if (roll < cumulative) {
      return entry.class;
    }
  }
  return 'A';
}

function isFarEnough(candidate: Position, placed: Position[], minDistance: number): boolean {
  for (const p of placed) {
    if (euclideanDistance(candidate, p) < minDistance) {
      return false;
    }
  }
  return true;
}

function randomPosition(rng: () => number, width: number, height: number): Position {
  const x = Math.floor(rng() * width);
  const y = Math.floor(rng() * height);
  return { x, y };
}

export function generateMap(config: MapConfig): GameMap {
  const { seed, width, height, planetCount } = config;
  const rng = createRng(seed);
  const minDistance = minPlanetDistance(width, height, planetCount);
  const positions: Position[] = [];
  const planets: Planet[] = [];

  for (let i = 0; i < planetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      const candidate = randomPosition(rng, width, height);
      if (isFarEnough(candidate, positions, minDistance)) {
        positions.push(candidate);
        planets.push({
          id: `planet-${i}`,
          position: candidate,
          class: rollPlanetClass(rng),
          owner: 'neutral',
          shipCount: 0,
          buildings: [],
          isHomePlanet: false,
        });
        placed = true;
        break;
      }
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (minDistance=${minDistance})`,
      );
    }
  }

  return { width, height, planets };
}
