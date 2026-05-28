import type { GameMap, Planet, PlanetClass, Position } from './types';

export interface MapConfig {
  seed: number;
  width: number;
  height: number;
  planetCount: number;
  playerCount: number;
}

const PLANET_CLASS_WEIGHTS: readonly { class: PlanetClass; weight: number }[] = [
  { class: 'A', weight: 0.08 },
  { class: 'B', weight: 0.15 },
  { class: 'C', weight: 0.25 },
  { class: 'D', weight: 0.27 },
  { class: 'E', weight: 0.25 },
];

const MIN_PLANET_DISTANCE = 4;
const MAX_PLACEMENT_ATTEMPTS_PER_PLANET = 1000;
const PLANET_EDGE_PADDING = 3;

const PLANET_ADJECTIVES = [
  'Red', 'Far', 'Grim', 'New', 'Old', 'Dark', 'Iron', 'Cold',
  'Deep', 'Bright', 'High', 'Low', 'Stone', 'Storm', 'Swift', 'Grand',
];
const PLANET_NOUNS = [
  'Shard', 'Keep', 'Hold', 'Dawn', 'Rift', 'Mere', 'Gate', 'Peak',
  'Vale', 'Ford', 'Spire', 'Watch', 'Glen', 'Crown', 'Crag', 'Reach',
];

function generatePlanetName(rng: () => number): string {
  const adj = PLANET_ADJECTIVES[Math.floor(rng() * PLANET_ADJECTIVES.length)];
  const noun = PLANET_NOUNS[Math.floor(rng() * PLANET_NOUNS.length)];
  return `${adj} ${noun}`;
}

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

function minPlanetDistance(): number {
  return MIN_PLANET_DISTANCE;
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
  const minX = PLANET_EDGE_PADDING;
  const maxX = width - 1 - PLANET_EDGE_PADDING;
  const minY = PLANET_EDGE_PADDING;
  const maxY = height - 1 - PLANET_EDGE_PADDING;
  const x = minX + Math.floor(rng() * (maxX - minX + 1));
  const y = minY + Math.floor(rng() * (maxY - minY + 1));
  return { x, y };
}

export function generateMap(config: MapConfig): GameMap {
  const { seed, width, height, planetCount } = config;
  const rng = createRng(seed);
  const minDistance = minPlanetDistance();
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
          name: generatePlanetName(rng),
          position: candidate,
          class: rollPlanetClass(rng),
          owner: 'neutral',
          shipCount: 0,
          troopAccumulator: 0,
          buildings: [],
          buildingSlots: Math.floor(rng() * 20) + 1,
          productionSlider: 0.5,
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
