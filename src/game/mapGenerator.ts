import type { GalaxyShape, GameMap, Planet, PlanetClass, Position } from './types';

export interface MapConfig {
  seed: number;
  width: number;
  height: number;
  planetCount: number;
  playerCount: number;
  galaxyShape?: GalaxyShape; // optional — if absent, picked randomly from seed
}

// A–E weight 8, F–P weight 7; total = 117; values normalised to sum to 1.
const PLANET_CLASS_WEIGHTS: readonly { class: PlanetClass; weight: number }[] = [
  { class: 'A', weight: 8 / 117 },
  { class: 'B', weight: 8 / 117 },
  { class: 'C', weight: 8 / 117 },
  { class: 'D', weight: 8 / 117 },
  { class: 'E', weight: 8 / 117 },
  { class: 'F', weight: 7 / 117 },
  { class: 'G', weight: 7 / 117 },
  { class: 'H', weight: 7 / 117 },
  { class: 'I', weight: 7 / 117 },
  { class: 'J', weight: 7 / 117 },
  { class: 'K', weight: 7 / 117 },
  { class: 'L', weight: 7 / 117 },
  { class: 'M', weight: 7 / 117 },
  { class: 'N', weight: 7 / 117 },
  { class: 'O', weight: 7 / 117 },
  { class: 'P', weight: 7 / 117 },
];

const MIN_PLANET_DISTANCE = 4;
const MAX_PLACEMENT_ATTEMPTS_PER_PLANET = 2000;
const PLANET_EDGE_PADDING = 2;

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
export function mulberry32(seed: number): () => number {
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

function nearestDistance(candidate: Position, placed: Position[]): number {
  if (placed.length === 0) return Infinity;
  let min = Infinity;
  for (const p of placed) {
    const d = euclideanDistance(candidate, p);
    if (d < min) min = d;
  }
  return min;
}

function paddedBounds(width: number, height: number): { minX: number; maxX: number; minY: number; maxY: number } {
  return {
    minX: PLANET_EDGE_PADDING,
    maxX: width - 1 - PLANET_EDGE_PADDING,
    minY: PLANET_EDGE_PADDING,
    maxY: height - 1 - PLANET_EDGE_PADDING,
  };
}

function randomPosition(rng: () => number, width: number, height: number): Position {
  const { minX, maxX, minY, maxY } = paddedBounds(width, height);
  const x = minX + Math.floor(rng() * (maxX - minX + 1));
  const y = minY + Math.floor(rng() * (maxY - minY + 1));
  return { x, y };
}

function growthPosition(
  rng: () => number,
  placed: Position[],
  virtualWidth: number,
  virtualHeight: number,
): Position | null {
  // First planet: start at virtual centre
  if (placed.length === 0) {
    return { x: Math.round(virtualWidth / 2), y: Math.round(virtualHeight / 2) };
  }
  // Pick a random parent from all placed planets
  const parent = placed[Math.floor(rng() * placed.length)];
  // Triangular distance distribution: range ~4–13, peak ~8–9
  const dist = 4 + rng() * 7;
  // Random direction
  const angle = rng() * 2 * Math.PI;
  const x = Math.round(parent.x + Math.cos(angle) * dist);
  const y = Math.round(parent.y + Math.sin(angle) * dist);
  // Out-of-bounds: let the retry loop try again
  if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) return null;
  return { x, y };
}

function placePlanetsScattered(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
): Position[] {
  const minDistance = minPlanetDistance();
  const positions: Position[] = [];

  for (let i = 0; i < planetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      const candidate = growthPosition(rng, positions, width * 2, height * 2);
      if (candidate === null) continue;
      if (!isFarEnough(candidate, positions, minDistance)) continue;
      positions.push(candidate);
      placed = true;
      break;
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (minDistance=${minDistance})`,
      );
    }
  }

  // Normalize bounding box of placed positions into the configured grid with padding
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const innerW = width - 1 - 2 * PLANET_EDGE_PADDING;
  const innerH = height - 1 - 2 * PLANET_EDGE_PADDING;
  for (let i = 0; i < positions.length; i++) {
    const nx = PLANET_EDGE_PADDING + Math.round(((positions[i].x - minX) / rangeX) * innerW);
    const ny = PLANET_EDGE_PADDING + Math.round(((positions[i].y - minY) / rangeY) * innerH);
    positions[i] = { x: nx, y: ny };
  }

  return positions;
}

function placePlanetsArms(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
): Position[] {
  const virtualWidth = width * 2;
  const virtualHeight = height * 2;
  const virtualCx = virtualWidth / 2;
  const virtualCy = virtualHeight / 2;
  const maxSpine = Math.min(virtualWidth, virtualHeight) * 0.45;

  const armCount = 2 + Math.floor(rng() * 3);
  const positions: Position[] = [];

  for (let i = 0; i < planetCount; i++) {
    const armIndex = i % armCount;
    const armAngle = ((2 * Math.PI) / armCount) * armIndex;

    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      const spineDist = rng() * maxSpine;
      const lateral = (rng() + rng() + rng() - 1.5) * 5;
      const x = Math.round(
        virtualCx + Math.cos(armAngle) * spineDist - Math.sin(armAngle) * lateral,
      );
      const y = Math.round(
        virtualCy + Math.sin(armAngle) * spineDist + Math.cos(armAngle) * lateral,
      );

      if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) continue;
      if (!isFarEnough({ x, y }, positions, MIN_PLANET_DISTANCE)) continue;

      positions.push({ x, y });
      placed = true;
      break;
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (arms shape)`,
      );
    }
  }

  // Normalize bounding box of placed positions into the configured grid with padding
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const innerW = width - 1 - 2 * PLANET_EDGE_PADDING;
  const innerH = height - 1 - 2 * PLANET_EDGE_PADDING;
  for (let i = 0; i < positions.length; i++) {
    const nx = PLANET_EDGE_PADDING + Math.round(((positions[i].x - minX) / rangeX) * innerW);
    const ny = PLANET_EDGE_PADDING + Math.round(((positions[i].y - minY) / rangeY) * innerH);
    positions[i] = { x: nx, y: ny };
  }

  return positions;
}

function placePlanetsDenseCore(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
): Position[] {
  const virtualWidth = width * 2;
  const virtualHeight = height * 2;
  const virtualCx = virtualWidth / 2;
  const virtualCy = virtualHeight / 2;
  const maxRadius = Math.min(virtualWidth, virtualHeight) * 0.45;
  const positions: Position[] = [];

  for (let i = 0; i < planetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      // rng() without sqrt biases toward centre (inverse square-root density)
      const radius = rng() * maxRadius;
      const angle = rng() * 2 * Math.PI;
      const x = Math.round(virtualCx + Math.cos(angle) * radius);
      const y = Math.round(virtualCy + Math.sin(angle) * radius);

      if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) continue;
      if (!isFarEnough({ x, y }, positions, MIN_PLANET_DISTANCE)) continue;

      positions.push({ x, y });
      placed = true;
      break;
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (dense_core shape)`,
      );
    }
  }

  // Normalize bounding box of placed positions into the configured grid with padding
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const innerW = width - 1 - 2 * PLANET_EDGE_PADDING;
  const innerH = height - 1 - 2 * PLANET_EDGE_PADDING;
  for (let i = 0; i < positions.length; i++) {
    const nx = PLANET_EDGE_PADDING + Math.round(((positions[i].x - minX) / rangeX) * innerW);
    const ny = PLANET_EDGE_PADDING + Math.round(((positions[i].y - minY) / rangeY) * innerH);
    positions[i] = { x: nx, y: ny };
  }

  return positions;
}

function placePlanetsRing(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
): Position[] {
  const virtualWidth = width * 2;
  const virtualHeight = height * 2;
  const virtualCx = virtualWidth / 2;
  const virtualCy = virtualHeight / 2;
  const maxRadius = Math.min(virtualWidth, virtualHeight) * 0.45;
  const innerRadius = maxRadius * 0.4;
  const ringWidth = maxRadius * 0.45;
  const positions: Position[] = [];

  for (let i = 0; i < planetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      const radius = innerRadius + rng() * ringWidth;
      const angle = rng() * 2 * Math.PI;
      const x = Math.round(virtualCx + Math.cos(angle) * radius);
      const y = Math.round(virtualCy + Math.sin(angle) * radius);

      if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) continue;
      if (!isFarEnough({ x, y }, positions, MIN_PLANET_DISTANCE)) continue;

      positions.push({ x, y });
      placed = true;
      break;
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (ring shape)`,
      );
    }
  }

  // Normalize bounding box of placed positions into the configured grid with padding
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const innerW = width - 1 - 2 * PLANET_EDGE_PADDING;
  const innerH = height - 1 - 2 * PLANET_EDGE_PADDING;
  for (let i = 0; i < positions.length; i++) {
    const nx = PLANET_EDGE_PADDING + Math.round(((positions[i].x - minX) / rangeX) * innerW);
    const ny = PLANET_EDGE_PADDING + Math.round(((positions[i].y - minY) / rangeY) * innerH);
    positions[i] = { x: nx, y: ny };
  }

  return positions;
}

const CONNECTIVITY_RANGE = 11; // must match BASE_FLEET_RANGE_CLICKS in movementEngine.ts

function ensureConnectivity(positions: Position[]): void {
  const parent = positions.map((_, i) => i);
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a: number, b: number): void {
    parent[find(a)] = find(b);
  }
  function rebuildUnion(): void {
    for (let i = 0; i < positions.length; i++) parent[i] = i;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (euclideanDistance(positions[i], positions[j]) <= CONNECTIVITY_RANGE) {
          union(i, j);
        }
      }
    }
  }
  rebuildUnion();
  const MAX_BRIDGE_ITERATIONS = 50;
  for (let iter = 0; iter < MAX_BRIDGE_ITERATIONS; iter++) {
    const roots = new Set(positions.map((_, i) => find(i)));
    if (roots.size <= 1) break;
    let minDist = Infinity;
    let bestA = -1;
    let bestB = -1;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (find(i) === find(j)) continue;
        const d = euclideanDistance(positions[i], positions[j]);
        if (d < minDist) {
          minDist = d;
          bestA = i;
          bestB = j;
        }
      }
    }
    if (bestA === -1) break;
    const steps = Math.ceil(minDist / CONNECTIVITY_RANGE);
    const bridges = steps - 1;
    for (let k = 1; k <= bridges; k++) {
      const t = k / steps;
      const bx = Math.round(positions[bestA].x + t * (positions[bestB].x - positions[bestA].x));
      const by = Math.round(positions[bestA].y + t * (positions[bestB].y - positions[bestA].y));
      let placed = false;
      outer: for (let r = 0; r <= 3; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            const cand = { x: bx + dx, y: by + dy };
            if (isFarEnough(cand, positions, MIN_PLANET_DISTANCE)) {
              positions.push(cand);
              parent.push(positions.length - 1);
              placed = true;
              break outer;
            }
          }
        }
      }
      if (!placed) {
        positions.push({ x: bx, y: by });
        parent.push(positions.length - 1);
      }
    }
    rebuildUnion();
  }
}

export function generateMap(config: MapConfig): GameMap {
  const { seed, width, height, planetCount } = config;
  const rng = mulberry32(seed);

  // Pick galaxy shape — use provided shape or pick randomly
  const shapes: GalaxyShape[] = ['scattered', 'arms', 'dense_core', 'ring'];
  const shape: GalaxyShape = config.galaxyShape ?? shapes[Math.floor(rng() * shapes.length)];

  // Get planet positions for chosen shape
  let positions: Position[];
  if (shape === 'arms') {
    positions = placePlanetsArms(rng, planetCount, width, height);
  } else if (shape === 'dense_core') {
    positions = placePlanetsDenseCore(rng, planetCount, width, height);
  } else if (shape === 'ring') {
    positions = placePlanetsRing(rng, planetCount, width, height);
  } else {
    positions = placePlanetsScattered(rng, planetCount, width, height);
  }

  ensureConnectivity(positions);

  // Build planet objects from positions (name, class, buildings all drawn from rng here)
  const planets: Planet[] = positions.map((pos, i) => ({
    id: `planet-${i}`,
    name: generatePlanetName(rng),
    position: pos,
    class: rollPlanetClass(rng),
    owner: 'neutral',
    shipCount: 0,
    troopAccumulator: 0,
    buildings: [],
    buildingSlots: Math.floor(rng() * 20) + 1,
    productionSlider: 0.5,
    isHomePlanet: false,
  }));

  return { width, height, planets };
}
