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

const MIN_PLANET_DISTANCE = 2.5; // minimum in final grid coordinates (matches computeClickDistance)
const MAX_PLACEMENT_ATTEMPTS_PER_PLANET = 2000;
const MAX_SPACING_ATTEMPTS = 25;
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

function minPairwiseDistance(positions: Position[]): number {
  let min = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      min = Math.min(min, euclideanDistance(positions[i], positions[j]));
    }
  }
  return min;
}

function normalizePositionsToGrid(positions: Position[], width: number, height: number): void {
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
  // Uniform scale preserves inter-planet distances (non-uniform X/Y stretch was shrinking pairs).
  const scale = Math.min(innerW / rangeX, innerH / rangeY);
  const padX = PLANET_EDGE_PADDING + Math.floor((innerW - rangeX * scale) / 2);
  const padY = PLANET_EDGE_PADDING + Math.floor((innerH - rangeY * scale) / 2);
  for (let i = 0; i < positions.length; i++) {
    positions[i] = {
      x: padX + Math.round((positions[i].x - minX) * scale),
      y: padY + Math.round((positions[i].y - minY) * scale),
    };
  }
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
  // Uniform distance distribution: range [2.5, 9.5] clicks, mean ~6.0
  const dist = 2.5 + rng() * 7;
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
  virtualMinDistance: number,
): Position[] {
  const positions: Position[] = [];

  for (let i = 0; i < planetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      const candidate = growthPosition(rng, positions, width * 2, height * 2);
      if (candidate === null) continue;
      if (!isFarEnough(candidate, positions, virtualMinDistance)) continue;
      positions.push(candidate);
      placed = true;
      break;
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (virtualMinDistance=${virtualMinDistance})`,
      );
    }
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Cluster shape: 3–5 independent blobs of planets scattered across the map.
 * Creates natural chokepoints between groups.
 */
function placePlanetsCluster(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
  virtualMinDistance: number,
): Position[] {
  const virtualWidth = width * 2;
  const virtualHeight = height * 2;
  const clusterCount = 3 + Math.floor(rng() * 3); // 3–5 clusters
  const spread = Math.min(virtualWidth, virtualHeight) * 0.18;

  // Place cluster centres with some minimum separation from each other
  const centres: Position[] = [];
  const minCentreSep = Math.min(virtualWidth, virtualHeight) * 0.3;
  for (let c = 0; c < clusterCount; c++) {
    for (let attempt = 0; attempt < 500; attempt++) {
      const cx = virtualWidth * 0.12 + rng() * virtualWidth * 0.76;
      const cy = virtualHeight * 0.12 + rng() * virtualHeight * 0.76;
      const cand = { x: Math.round(cx), y: Math.round(cy) };
      if (isFarEnough(cand, centres, minCentreSep)) {
        centres.push(cand);
        break;
      }
    }
  }
  // Fallback: if not enough centres placed, relax separation
  while (centres.length < clusterCount) {
    centres.push({
      x: Math.round(virtualWidth * 0.12 + rng() * virtualWidth * 0.76),
      y: Math.round(virtualHeight * 0.12 + rng() * virtualHeight * 0.76),
    });
  }

  const positions: Position[] = [];

  for (let i = 0; i < planetCount; i++) {
    const centre = centres[i % centres.length];
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      // Box-Muller for Gaussian lateral spread around the cluster centre
      const u1 = rng() || 1e-10;
      const u2 = rng();
      const mag = spread * Math.sqrt(-2 * Math.log(u1));
      const x = Math.round(centre.x + mag * Math.cos(2 * Math.PI * u2));
      const y = Math.round(centre.y + mag * Math.sin(2 * Math.PI * u2));

      if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) continue;
      if (!isFarEnough({ x, y }, positions, virtualMinDistance)) continue;

      positions.push({ x, y });
      placed = true;
      break;
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (cluster shape)`,
      );
    }
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Spiral shape: 2 curved logarithmic arms winding outward from the centre.
 * Each arm's angle increases with distance, producing a natural galaxy spiral.
 */
function placePlanetsSpiral(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
  virtualMinDistance: number,
): Position[] {
  const virtualWidth = width * 2;
  const virtualHeight = height * 2;
  const virtualCx = virtualWidth / 2;
  const virtualCy = virtualHeight / 2;
  const maxRadius = Math.min(virtualWidth, virtualHeight) * 0.44;
  // How many radians of twist per unit of radius (tighter = more wound)
  const curveFactor = 0.045;
  const armCount = 2;
  // Gaussian lateral σ in virtual units
  const lateralSigma = maxRadius * 0.1;

  const positions: Position[] = [];

  for (let i = 0; i < planetCount; i++) {
    const armIndex = i % armCount;
    const armBaseAngle = ((2 * Math.PI) / armCount) * armIndex;

    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      // Bias toward middle of the arm (avoid empty core and fringe)
      const spineRadius = maxRadius * (0.08 + rng() * 0.88);
      // Spiral twist: angle grows linearly with radius
      const angle = armBaseAngle + spineRadius * curveFactor;
      // Gaussian lateral scatter perpendicular to arm direction
      const u1 = rng() || 1e-10;
      const u2 = rng();
      const lateral = lateralSigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

      const x = Math.round(
        virtualCx + Math.cos(angle) * spineRadius - Math.sin(angle) * lateral,
      );
      const y = Math.round(
        virtualCy + Math.sin(angle) * spineRadius + Math.cos(angle) * lateral,
      );

      if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) continue;
      if (!isFarEnough({ x, y }, positions, virtualMinDistance)) continue;

      positions.push({ x, y });
      placed = true;
      break;
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (spiral shape)`,
      );
    }
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

function placePlanetsDenseCore(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
  virtualMinDistance: number,
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
      if (!isFarEnough({ x, y }, positions, virtualMinDistance)) continue;

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

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

function placePlanetsRing(
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
  virtualMinDistance: number,
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
      if (!isFarEnough({ x, y }, positions, virtualMinDistance)) continue;

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

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

function enforceMinimumSpacing(positions: Position[], width: number, height: number): void {
  const minX = PLANET_EDGE_PADDING;
  const maxX = width - 1 - PLANET_EDGE_PADDING;
  const minY = PLANET_EDGE_PADDING;
  const maxY = height - 1 - PLANET_EDGE_PADDING;
  // Cap at 500 to avoid O(n^4) freeze on large maps (e.g. 135 planets × n²×4 = 659M ops).
  // This function only corrects rounding violations; convergence is fast in practice.
  const maxIter = 500;

  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const d = euclideanDistance(positions[i], positions[j]);
        if (d >= MIN_PLANET_DISTANCE || d === 0) continue;
        moved = true;
        const push = (MIN_PLANET_DISTANCE - d) / 2 + 0.01;
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const len = d || 1;
        let jx = Math.round(positions[j].x + (dx / len) * push);
        let jy = Math.round(positions[j].y + (dy / len) * push);
        jx = Math.max(minX, Math.min(maxX, jx));
        jy = Math.max(minY, Math.min(maxY, jy));
        positions[j] = { x: jx, y: jy };
      }
    }
    if (!moved) break;
  }
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
        // Skip this bridge slot rather than forcing a planet inside MIN_PLANET_DISTANCE.
        continue;
      }
    }
    rebuildUnion();
  }
}

export function generateMap(config: MapConfig): GameMap {
  const { seed, width, height, planetCount } = config;

  const shapeRng = mulberry32(seed);
  const shapes: GalaxyShape[] = ['scattered', 'dense_core', 'ring', 'cluster', 'spiral'];
  const shape: GalaxyShape = config.galaxyShape ?? shapes[Math.floor(shapeRng() * shapes.length)];

  let positions: Position[] | null = null;
  let rng = mulberry32(seed);

  for (let attempt = 0; attempt < MAX_SPACING_ATTEMPTS; attempt++) {
    rng = mulberry32(seed + attempt);
    if (!config.galaxyShape) {
      rng(); // consume shape-roll draw (shape fixed from seed above)
    }

    // Pre-normalize canvas is 2× the final grid — use a higher virtual floor during placement.
    const virtualMinDistance = MIN_PLANET_DISTANCE * 2;

    try {
      if (shape === 'dense_core') {
        positions = placePlanetsDenseCore(rng, planetCount, width, height, virtualMinDistance);
      } else if (shape === 'ring') {
        positions = placePlanetsRing(rng, planetCount, width, height, virtualMinDistance);
      } else if (shape === 'cluster') {
        positions = placePlanetsCluster(rng, planetCount, width, height, virtualMinDistance);
      } else if (shape === 'spiral') {
        positions = placePlanetsSpiral(rng, planetCount, width, height, virtualMinDistance);
      } else {
        positions = placePlanetsScattered(rng, planetCount, width, height, virtualMinDistance);
      }

      enforceMinimumSpacing(positions, width, height);
      ensureConnectivity(positions);
      enforceMinimumSpacing(positions, width, height);

      if (minPairwiseDistance(positions) >= MIN_PLANET_DISTANCE) {
        break;
      }
      positions = null;
    } catch {
      positions = null;
    }
  }

  if (positions === null || minPairwiseDistance(positions) < MIN_PLANET_DISTANCE) {
    throw new Error(
      `Failed to generate map with minimum planet spacing of ${MIN_PLANET_DISTANCE} clicks after ${MAX_SPACING_ATTEMPTS} attempts`,
    );
  }

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

  const nameCounts = new Map<string, number>();
  const romanSuffixes = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  for (const planet of planets) {
    const baseName = planet.name;
    const seen = nameCounts.get(baseName) ?? 0;
    const occurrence = seen + 1;
    nameCounts.set(baseName, occurrence);
    if (occurrence > 1) {
      const suffix =
        occurrence <= romanSuffixes.length + 1
          ? romanSuffixes[occurrence - 2]
          : String(occurrence);
      planet.name = `${baseName} ${suffix}`;
    }
  }

  return { width, height, planets };
}
