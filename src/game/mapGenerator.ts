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

/**
 * Crescent shape: an open horseshoe band. Empty bay on one side, rim on the other.
 * Rotation is seeded so the opening faces a different direction each game.
 */
function placePlanetsCrescent(
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
  const innerRadius = maxRadius * 0.36;
  const ringWidth = maxRadius * 0.48;
  const arcSpan = Math.PI * (1.2 + rng() * 0.4); // 216°–288° of planets
  const rotation = rng() * 2 * Math.PI;
  const positions: Position[] = [];

  const outerRadius = innerRadius + ringWidth;
  const inCrescent = (p: Position): boolean => {
    const r = Math.hypot(p.x - virtualCx, p.y - virtualCy);
    if (r < innerRadius || r > outerRadius) return false;
    let a = Math.atan2(p.y - virtualCy, p.x - virtualCx) - rotation;
    while (a < 0) a += 2 * Math.PI;
    while (a >= 2 * Math.PI) a -= 2 * Math.PI;
    return a <= arcSpan;
  };

  for (let i = 0; i < planetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      const angle = rotation + rng() * arcSpan;
      const radius = innerRadius + rng() * ringWidth;
      const x = Math.round(virtualCx + Math.cos(angle) * radius);
      const y = Math.round(virtualCy + Math.sin(angle) * radius);

      if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) continue;
      if (!isFarEnough({ x, y }, positions, virtualMinDistance)) continue;

      positions.push({ x, y });
      placed = true;
      break;
    }
    if (!placed && positions.length > 0) {
      const candidate = growConstrainedOrFallback(
        rng,
        positions,
        positions,
        virtualWidth,
        virtualHeight,
        virtualMinDistance,
        inCrescent,
      );
      if (candidate !== null) {
        positions.push(candidate);
        placed = true;
      }
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (crescent shape)`,
      );
    }
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

function growFromParents(
  rng: () => number,
  parents: Position[],
  placed: Position[],
  virtualWidth: number,
  virtualHeight: number,
  virtualMinDistance: number,
  accept: (candidate: Position) => boolean,
): Position | null {
  const parent = parents[Math.floor(rng() * parents.length)];
  const dist = 2.5 + rng() * 7;
  const angle = rng() * 2 * Math.PI;
  const x = Math.round(parent.x + Math.cos(angle) * dist);
  const y = Math.round(parent.y + Math.sin(angle) * dist);
  if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) return null;
  const candidate = { x, y };
  if (!accept(candidate)) return null;
  if (!isFarEnough(candidate, placed, virtualMinDistance)) return null;
  return candidate;
}

/**
 * Try region-constrained growth, then unconstrained organic growth so a tight
 * shape cannot abort map generation.
 */
function growConstrainedOrFallback(
  rng: () => number,
  parents: Position[],
  placed: Position[],
  virtualWidth: number,
  virtualHeight: number,
  virtualMinDistance: number,
  accept: (candidate: Position) => boolean,
): Position | null {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
    const candidate = growFromParents(
      rng,
      parents,
      placed,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      accept,
    );
    if (candidate !== null) return candidate;
  }
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
    const candidate = growFromParents(
      rng,
      placed,
      placed,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      () => true,
    );
    if (candidate !== null) return candidate;
  }
  return null;
}

function distanceToPolyline(point: Position, waypoints: Position[]): number {
  let min = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const ax = waypoints[i].x;
    const ay = waypoints[i].y;
    const bx = waypoints[i + 1].x;
    const by = waypoints[i + 1].y;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((point.x - ax) * dx + (point.y - ay) * dy) / lenSq));
    const px = ax + dx * t;
    const py = ay + dy * t;
    min = Math.min(min, Math.hypot(point.x - px, point.y - py));
  }
  return min;
}

/**
 * Binary shape: two organic-growth cores on opposite sides of the map.
 * Connectivity bridges form the corridor chokepoint when the cores stay apart.
 */
function placePlanetsBinary(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const axis = rng() * Math.PI;
  const sep = extent * 0.28;
  const seeds: Position[] = [
    { x: Math.round(virtualCx + Math.cos(axis) * sep), y: Math.round(virtualCy + Math.sin(axis) * sep) },
    { x: Math.round(virtualCx - Math.cos(axis) * sep), y: Math.round(virtualCy - Math.sin(axis) * sep) },
  ];
  const coreN = Math.ceil(planetCount / 2);
  const maxClusterR = Math.max(extent * 0.3, virtualMinDistance * Math.sqrt(coreN / Math.PI) * 2.6);
  const clusters: Position[][] = [[seeds[0]], [seeds[1]]];
  const positions: Position[] = [seeds[0], seeds[1]];

  for (let i = 2; i < planetCount; i++) {
    const ci = i % 2;
    const candidate = growConstrainedOrFallback(
      rng,
      clusters[ci],
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      (p) => euclideanDistance(p, seeds[ci]) <= maxClusterR,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (binary shape)`,
      );
    }
    positions.push(candidate);
    clusters[ci].push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Ribbon shape: a winding S-curve of planets grown along a polyline spine.
 * Long theater, meet-in-the-middle fights.
 */
function placePlanetsRibbon(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const heading = rng() * Math.PI;
  const phase = rng() * 2 * Math.PI;
  const waves = 1.25 + rng() * 0.7;
  const length = extent * 0.88;
  const amplitude = extent * (0.22 + rng() * 0.08);
  const waypointCount = 8;
  const waypoints: Position[] = [];
  for (let i = 0; i < waypointCount; i++) {
    const t = i / (waypointCount - 1);
    const along = (t - 0.5) * length;
    const across = Math.sin(t * waves * Math.PI + phase) * amplitude;
    waypoints.push({
      x: Math.round(virtualCx + along * Math.cos(heading) - across * Math.sin(heading)),
      y: Math.round(virtualCy + along * Math.sin(heading) + across * Math.cos(heading)),
    });
  }

  let spineLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    spineLen += euclideanDistance(waypoints[i], waypoints[i + 1]);
  }
  const packedHalfW = (planetCount * virtualMinDistance * virtualMinDistance * 1.6) / (2 * Math.max(spineLen, 1));
  const halfWidth = Math.max(extent * 0.11, packedHalfW);
  const positions: Position[] = [waypoints[0]];

  for (let i = 1; i < planetCount; i++) {
    const candidate = growConstrainedOrFallback(
      rng,
      positions,
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      (p) => distanceToPolyline(p, waypoints) <= halfWidth,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (ribbon shape)`,
      );
    }
    positions.push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Halo shape: two concentric rings — a small inner prize ring and a
 * thicker outer band, with a void between them.
 */
function placePlanetsHalo(
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
  const innerR0 = maxRadius * 0.1;
  const innerR1 = maxRadius * 0.32;
  const outerR0 = maxRadius * 0.58;
  const outerR1 = maxRadius * 0.96;
  const innerMid = (innerR0 + innerR1) / 2;
  const innerCap = Math.max(
    4,
    Math.floor(((2 * Math.PI * innerMid) / virtualMinDistance) * 0.7),
  );
  const innerCount = Math.min(Math.max(4, Math.round(planetCount * 0.26)), innerCap);
  const innerSeed: Position = {
    x: Math.round(virtualCx + innerMid),
    y: Math.round(virtualCy),
  };
  const outerSeed: Position = {
    x: Math.round(virtualCx + (outerR0 + outerR1) / 2),
    y: Math.round(virtualCy),
  };
  const innerPlanets: Position[] = [innerSeed];
  const outerPlanets: Position[] = [outerSeed];
  const positions: Position[] = [innerSeed, outerSeed];

  for (let i = 2; i < planetCount; i++) {
    const inner = innerPlanets.length < innerCount;
    const parents = inner ? innerPlanets : outerPlanets;
    const r0 = inner ? innerR0 : outerR0;
    const r1 = inner ? innerR1 : outerR1;
    const candidate = growConstrainedOrFallback(
      rng,
      parents,
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      (p) => {
        const r = Math.hypot(p.x - virtualCx, p.y - virtualCy);
        return r >= r0 && r <= r1;
      },
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (halo shape)`,
      );
    }
    positions.push(candidate);
    if (inner) innerPlanets.push(candidate);
    else outerPlanets.push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Broken ring: an annular band with 2–3 seeded gaps (gates).
 * Connectivity fills those gaps with 3-lane bridges.
 */
function placePlanetsBrokenRing(
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
  const ringWidth = maxRadius * 0.48;
  const outerRadius = innerRadius + ringWidth;
  const gateCount = 2 + Math.floor(rng() * 2); // 2–3
  const gateWidth = 0.38 + rng() * 0.18; // ~22°–32°
  const rotation = rng() * 2 * Math.PI;

  const inArc = (p: Position): boolean => {
    const r = Math.hypot(p.x - virtualCx, p.y - virtualCy);
    if (r < innerRadius || r > outerRadius) return false;
    let a = Math.atan2(p.y - virtualCy, p.x - virtualCx) - rotation;
    while (a < 0) a += 2 * Math.PI;
    while (a >= 2 * Math.PI) a -= 2 * Math.PI;
    const step = (2 * Math.PI) / gateCount;
    for (let g = 0; g < gateCount; g++) {
      const start = g * step;
      let rel = a - start;
      if (rel < 0) rel += 2 * Math.PI;
      if (rel < gateWidth) return false;
    }
    return true;
  };

  const positions: Position[] = [];
  for (let i = 0; i < planetCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS_PER_PLANET; attempt++) {
      const angle = rng() * 2 * Math.PI;
      const radius = innerRadius + rng() * ringWidth;
      const x = Math.round(virtualCx + Math.cos(angle) * radius);
      const y = Math.round(virtualCy + Math.sin(angle) * radius);
      const cand = { x, y };
      if (x < 0 || x > virtualWidth - 1 || y < 0 || y > virtualHeight - 1) continue;
      if (!inArc(cand)) continue;
      if (!isFarEnough(cand, positions, virtualMinDistance)) continue;
      positions.push(cand);
      placed = true;
      break;
    }
    if (!placed && positions.length > 0) {
      const candidate = growConstrainedOrFallback(
        rng,
        positions,
        positions,
        virtualWidth,
        virtualHeight,
        virtualMinDistance,
        inArc,
      );
      if (candidate !== null) {
        positions.push(candidate);
        placed = true;
      }
    }
    if (!placed) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (broken_ring shape)`,
      );
    }
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Crossroads: two crossing diameters (X) or three rays from the centre (Y).
 * The junction is the contested prize; each arm is a starting theater.
 */
function placePlanetsCrossroads(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const heading = rng() * Math.PI;
  const threeWay = rng() < 0.45;
  const armLen = extent * 0.42;
  const polylines: Position[][] = [];

  if (threeWay) {
    for (let i = 0; i < 3; i++) {
      const angle = heading + (i * 2 * Math.PI) / 3;
      polylines.push([
        { x: Math.round(virtualCx), y: Math.round(virtualCy) },
        {
          x: Math.round(virtualCx + Math.cos(angle) * armLen),
          y: Math.round(virtualCy + Math.sin(angle) * armLen),
        },
      ]);
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const angle = heading + (i * Math.PI) / 2;
      polylines.push([
        {
          x: Math.round(virtualCx - Math.cos(angle) * armLen),
          y: Math.round(virtualCy - Math.sin(angle) * armLen),
        },
        {
          x: Math.round(virtualCx + Math.cos(angle) * armLen),
          y: Math.round(virtualCy + Math.sin(angle) * armLen),
        },
      ]);
    }
  }

  let spineLen = 0;
  for (const line of polylines) {
    spineLen += euclideanDistance(line[0], line[1]);
  }
  const packedHalfW = (planetCount * virtualMinDistance * virtualMinDistance * 1.6) / (2 * Math.max(spineLen, 1));
  const halfWidth = Math.max(extent * 0.1, packedHalfW);
  const nearAnyArm = (p: Position): boolean =>
    polylines.some((line) => distanceToPolyline(p, line) <= halfWidth);

  const positions: Position[] = [{ x: Math.round(virtualCx), y: Math.round(virtualCy) }];
  for (let i = 1; i < planetCount; i++) {
    const candidate = growConstrainedOrFallback(
      rng,
      positions,
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      nearAnyArm,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (crossroads shape)`,
      );
    }
    positions.push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Clover: three organic lobes equally spaced around a small hub.
 * More regular than cluster; each leaf is its own theater.
 */
function placePlanetsClover(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const rotation = rng() * 2 * Math.PI;
  const sep = extent * 0.26;
  const lobeN = Math.ceil(planetCount / 3);
  const maxLobeR = Math.max(extent * 0.22, virtualMinDistance * Math.sqrt(lobeN / Math.PI) * 2.4);
  const hub: Position = { x: Math.round(virtualCx), y: Math.round(virtualCy) };
  const seeds: Position[] = [];
  for (let i = 0; i < 3; i++) {
    const angle = rotation + (i * 2 * Math.PI) / 3;
    seeds.push({
      x: Math.round(virtualCx + Math.cos(angle) * sep),
      y: Math.round(virtualCy + Math.sin(angle) * sep),
    });
  }

  const clusters: Position[][] = seeds.map((s) => [s]);
  const positions: Position[] = [hub, ...seeds];

  for (let i = positions.length; i < planetCount; i++) {
    const ci = i % 3;
    const candidate = growConstrainedOrFallback(
      rng,
      clusters[ci],
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      (p) => euclideanDistance(p, seeds[ci]) <= maxLobeR,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (clover shape)`,
      );
    }
    positions.push(candidate);
    clusters[ci].push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Coil: a single logarithmic arm winding out from the centre (nautilus).
 * Distinct from two-arm `spiral` and the S-curve `ribbon`.
 */
function placePlanetsCoil(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const maxRadius = extent * 0.44;
  const heading = rng() * 2 * Math.PI;
  const curveFactor = 0.07 + rng() * 0.03;
  const waypointCount = 14;
  const waypoints: Position[] = [];
  for (let i = 0; i < waypointCount; i++) {
    const t = i / (waypointCount - 1);
    const radius = maxRadius * (0.06 + t * 0.9);
    const angle = heading + radius * curveFactor;
    waypoints.push({
      x: Math.round(virtualCx + Math.cos(angle) * radius),
      y: Math.round(virtualCy + Math.sin(angle) * radius),
    });
  }

  let spineLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    spineLen += euclideanDistance(waypoints[i], waypoints[i + 1]);
  }
  const packedHalfW = (planetCount * virtualMinDistance * virtualMinDistance * 1.6) / (2 * Math.max(spineLen, 1));
  const halfWidth = Math.max(extent * 0.1, packedHalfW);
  const positions: Position[] = [waypoints[0]];

  for (let i = 1; i < planetCount; i++) {
    const candidate = growConstrainedOrFallback(
      rng,
      positions,
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      (p) => distanceToPolyline(p, waypoints) <= halfWidth,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (coil shape)`,
      );
    }
    positions.push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Barred: a thick central bar with two short arms off the ends
 * (barred-spiral galaxy). Distinct from `spiral` and `crossroads`.
 */
function placePlanetsBarred(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const heading = rng() * Math.PI;
  const barLen = extent * 0.34;
  const armLen = extent * 0.3;
  const armSweep = 0.65 + rng() * 0.35;
  const end1: Position = {
    x: Math.round(virtualCx + Math.cos(heading) * barLen),
    y: Math.round(virtualCy + Math.sin(heading) * barLen),
  };
  const end2: Position = {
    x: Math.round(virtualCx - Math.cos(heading) * barLen),
    y: Math.round(virtualCy - Math.sin(heading) * barLen),
  };
  const a1 = heading + Math.PI / 2 + armSweep * 0.15;
  const a2 = heading - Math.PI / 2 + armSweep * 0.15;
  const polylines: Position[][] = [
    [end2, { x: Math.round(virtualCx), y: Math.round(virtualCy) }, end1],
    [
      end1,
      {
        x: Math.round(end1.x + Math.cos(a1) * armLen),
        y: Math.round(end1.y + Math.sin(a1) * armLen),
      },
    ],
    [
      end2,
      {
        x: Math.round(end2.x + Math.cos(a2) * armLen),
        y: Math.round(end2.y + Math.sin(a2) * armLen),
      },
    ],
  ];

  let spineLen = 0;
  for (const line of polylines) {
    for (let i = 0; i < line.length - 1; i++) {
      spineLen += euclideanDistance(line[i], line[i + 1]);
    }
  }
  const packedHalfW = (planetCount * virtualMinDistance * virtualMinDistance * 1.5) / (2 * Math.max(spineLen, 1));
  const halfWidth = Math.max(extent * 0.1, packedHalfW);
  const nearFrame = (p: Position): boolean =>
    polylines.some((line) => distanceToPolyline(p, line) <= halfWidth);

  const positions: Position[] = [{ x: Math.round(virtualCx), y: Math.round(virtualCy) }];
  for (let i = 1; i < planetCount; i++) {
    const candidate = growConstrainedOrFallback(
      rng,
      positions,
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      nearFrame,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (barred shape)`,
      );
    }
    positions.push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Hourglass: two overlapping lobes with a narrow waist (figure-8).
 * Distinct from `binary` (separated cores) and `clover` (three leaves).
 */
function placePlanetsHourglass(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const axis = rng() * Math.PI;
  const lobeR = extent * 0.24;
  const sep = lobeR * 1.15;
  const seeds: Position[] = [
    {
      x: Math.round(virtualCx + Math.cos(axis) * sep),
      y: Math.round(virtualCy + Math.sin(axis) * sep),
    },
    {
      x: Math.round(virtualCx - Math.cos(axis) * sep),
      y: Math.round(virtualCy - Math.sin(axis) * sep),
    },
  ];
  const inHourglass = (p: Position): boolean =>
    euclideanDistance(p, seeds[0]) <= lobeR || euclideanDistance(p, seeds[1]) <= lobeR;

  const clusters: Position[][] = [[seeds[0]], [seeds[1]]];
  const positions: Position[] = [seeds[0], seeds[1]];

  for (let i = 2; i < planetCount; i++) {
    const ci = i % 2;
    const candidate = growConstrainedOrFallback(
      rng,
      clusters[ci],
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      inHourglass,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (hourglass shape)`,
      );
    }
    positions.push(candidate);
    clusters[ci].push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Lanes: two or three parallel rivers of planets.
 * Distinct from the single `ribbon`.
 */
function placePlanetsLanes(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const heading = rng() * Math.PI;
  const laneCount = 2 + Math.floor(rng() * 2); // 2–3
  const length = extent * 0.86;
  const laneGap = extent * (laneCount === 2 ? 0.26 : 0.2);
  const perpX = -Math.sin(heading);
  const perpY = Math.cos(heading);
  const polylines: Position[][] = [];
  for (let i = 0; i < laneCount; i++) {
    const offset = (i - (laneCount - 1) / 2) * laneGap;
    const ox = perpX * offset;
    const oy = perpY * offset;
    polylines.push([
      {
        x: Math.round(virtualCx - Math.cos(heading) * length * 0.5 + ox),
        y: Math.round(virtualCy - Math.sin(heading) * length * 0.5 + oy),
      },
      {
        x: Math.round(virtualCx + Math.cos(heading) * length * 0.5 + ox),
        y: Math.round(virtualCy + Math.sin(heading) * length * 0.5 + oy),
      },
    ]);
  }

  let spineLen = 0;
  for (const line of polylines) {
    spineLen += euclideanDistance(line[0], line[1]);
  }
  const packedHalfW = (planetCount * virtualMinDistance * virtualMinDistance * 1.5) / (2 * Math.max(spineLen, 1));
  const halfWidth = Math.max(extent * 0.08, packedHalfW);
  const nearLane = (p: Position): boolean =>
    polylines.some((line) => distanceToPolyline(p, line) <= halfWidth);

  const positions: Position[] = [polylines[0][0]];
  for (let i = 1; i < planetCount; i++) {
    const candidate = growConstrainedOrFallback(
      rng,
      positions,
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      nearLane,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (lanes shape)`,
      );
    }
    positions.push(candidate);
  }

  normalizePositionsToGrid(positions, width, height);
  return positions;
}

/**
 * Asterisk: four or five rays from a small hub.
 * Distinct from `crossroads` (X or Y, 2–3 arms).
 */
function placePlanetsAsterisk(
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
  const extent = Math.min(virtualWidth, virtualHeight);
  const heading = rng() * Math.PI;
  const rayCount = 4 + Math.floor(rng() * 2); // 4–5
  const armLen = extent * 0.42;
  const hubR = extent * 0.1;
  const polylines: Position[][] = [];
  for (let i = 0; i < rayCount; i++) {
    const angle = heading + (i * 2 * Math.PI) / rayCount;
    polylines.push([
      { x: Math.round(virtualCx), y: Math.round(virtualCy) },
      {
        x: Math.round(virtualCx + Math.cos(angle) * armLen),
        y: Math.round(virtualCy + Math.sin(angle) * armLen),
      },
    ]);
  }

  let spineLen = 0;
  for (const line of polylines) {
    spineLen += euclideanDistance(line[0], line[1]);
  }
  const packedHalfW = (planetCount * virtualMinDistance * virtualMinDistance * 1.5) / (2 * Math.max(spineLen, 1));
  const halfWidth = Math.max(extent * 0.08, packedHalfW);
  const nearStar = (p: Position): boolean => {
    if (Math.hypot(p.x - virtualCx, p.y - virtualCy) <= hubR) return true;
    return polylines.some((line) => distanceToPolyline(p, line) <= halfWidth);
  };

  const positions: Position[] = [{ x: Math.round(virtualCx), y: Math.round(virtualCy) }];
  for (let i = 1; i < planetCount; i++) {
    const candidate = growConstrainedOrFallback(
      rng,
      positions,
      positions,
      virtualWidth,
      virtualHeight,
      virtualMinDistance,
      nearStar,
    );
    if (candidate === null) {
      throw new Error(
        `Failed to place planet ${i} after ${MAX_PLACEMENT_ATTEMPTS_PER_PLANET} attempts (asterisk shape)`,
      );
    }
    positions.push(candidate);
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
const BRIDGE_LANE_COUNT = 3;
const BRIDGE_LANE_SPACING = 3; // clicks between parallel planets on a bridge

function tryInsertBridgePlanet(positions: Position[], parent: number[], x: number, y: number): boolean {
  for (let r = 0; r <= 3; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const cand = { x: x + dx, y: y + dy };
        if (isFarEnough(cand, positions, MIN_PLANET_DISTANCE)) {
          positions.push(cand);
          parent.push(positions.length - 1);
          return true;
        }
      }
    }
  }
  return false;
}

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
  const laneHalf = (BRIDGE_LANE_COUNT - 1) / 2;
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
    const gapX = positions[bestB].x - positions[bestA].x;
    const gapY = positions[bestB].y - positions[bestA].y;
    const gapLen = Math.hypot(gapX, gapY) || 1;
    const perpX = -gapY / gapLen;
    const perpY = gapX / gapLen;
    const steps = Math.ceil(minDist / CONNECTIVITY_RANGE);
    const bridges = steps - 1;
    for (let k = 1; k <= bridges; k++) {
      const t = k / steps;
      const bx = positions[bestA].x + t * gapX;
      const by = positions[bestA].y + t * gapY;
      for (let lane = -laneHalf; lane <= laneHalf; lane++) {
        const lx = Math.round(bx + perpX * lane * BRIDGE_LANE_SPACING);
        const ly = Math.round(by + perpY * lane * BRIDGE_LANE_SPACING);
        tryInsertBridgePlanet(positions, parent, lx, ly);
      }
    }
    rebuildUnion();
  }
}

function placeByShape(
  shape: GalaxyShape,
  rng: () => number,
  planetCount: number,
  width: number,
  height: number,
  virtualMinDistance: number,
): Position[] {
  if (shape === 'dense_core') {
    return placePlanetsDenseCore(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'ring') {
    return placePlanetsRing(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'cluster') {
    return placePlanetsCluster(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'spiral') {
    return placePlanetsSpiral(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'crescent') {
    return placePlanetsCrescent(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'binary') {
    return placePlanetsBinary(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'ribbon') {
    return placePlanetsRibbon(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'halo') {
    return placePlanetsHalo(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'broken_ring') {
    return placePlanetsBrokenRing(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'crossroads') {
    return placePlanetsCrossroads(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'clover') {
    return placePlanetsClover(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'coil') {
    return placePlanetsCoil(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'barred') {
    return placePlanetsBarred(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'hourglass') {
    return placePlanetsHourglass(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'lanes') {
    return placePlanetsLanes(rng, planetCount, width, height, virtualMinDistance);
  }
  if (shape === 'asterisk') {
    return placePlanetsAsterisk(rng, planetCount, width, height, virtualMinDistance);
  }
  return placePlanetsScattered(rng, planetCount, width, height, virtualMinDistance);
}

function tryLayout(
  shape: GalaxyShape,
  seed: number,
  consumeShapeRoll: boolean,
  width: number,
  height: number,
  planetCount: number,
  seedOffset: number,
): { positions: Position[]; rng: () => number } | null {
  const virtualMinDistance = MIN_PLANET_DISTANCE * 2;
  for (let attempt = 0; attempt < MAX_SPACING_ATTEMPTS; attempt++) {
    const rng = mulberry32(seed + seedOffset + attempt);
    if (consumeShapeRoll) {
      rng();
    }
    try {
      const positions = placeByShape(shape, rng, planetCount, width, height, virtualMinDistance);
      enforceMinimumSpacing(positions, width, height);
      ensureConnectivity(positions);
      enforceMinimumSpacing(positions, width, height);
      if (minPairwiseDistance(positions) >= MIN_PLANET_DISTANCE) {
        return { positions, rng };
      }
    } catch {
      // Tight shapes can fail a single attempt; retry with a new sub-seed.
    }
  }
  return null;
}

export function generateMap(config: MapConfig): GameMap {
  const { seed, width, height, planetCount } = config;

  const shapeRng = mulberry32(seed);
  const shapes: GalaxyShape[] = [
    'scattered',
    'dense_core',
    'ring',
    'cluster',
    'spiral',
    'crescent',
    'binary',
    'ribbon',
    'halo',
    'broken_ring',
    'crossroads',
    'clover',
    'coil',
    'barred',
    'hourglass',
    'lanes',
    'asterisk',
  ];
  const shape: GalaxyShape = config.galaxyShape ?? shapes[Math.floor(shapeRng() * shapes.length)];
  const consumeShapeRoll = !config.galaxyShape;

  let layout = tryLayout(shape, seed, consumeShapeRoll, width, height, planetCount, 0);
  // Constrained shapes can fail spacing after normalize; never abort a new game.
  if (layout === null && shape !== 'scattered') {
    layout = tryLayout('scattered', seed, false, width, height, planetCount, 10_000);
  }

  if (layout === null) {
    throw new Error(
      `Failed to generate map with minimum planet spacing of ${MIN_PLANET_DISTANCE} clicks after ${MAX_SPACING_ATTEMPTS} attempts`,
    );
  }

  const { positions, rng } = layout;

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
