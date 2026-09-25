/**
 * Simulate 10 large 6-player games (2 human + 4 AI) and score spawn fairness.
 * Run from frontend/: npx tsx scripts/spawn-fairness-sim.ts
 */
import { generateMap, mulberry32 } from '../src/game/mapGenerator';
import { placeSpawns } from '../src/game/spawnPlacer';
import { GALAXY_SHAPES, type GameMap, type Planet, type Position } from '../src/game/types';

const PLAYER_COUNT = 6;
const PLANET_COUNT = 35 + (PLAYER_COUNT - 2) * 25; // 135
const GRID_SIDE = Math.ceil(Math.sqrt(PLANET_COUNT * 90)); // 111
const MAP_SIZE = 'large' as const;
const HUMAN_IDS = ['player-0', 'player-1'];
const AI_IDS = ['player-2', 'player-3', 'player-4', 'player-5'];
const HUMAN_MIN = 50;
const AI_HUMAN_MIN = 50;
const CLUSTER_RADIUS = 40;
const EDGE_INNER_MARGIN = 3;
const EDGE_BAND_DEPTH_FRACTION = 0.28;

const SEEDS = [
  1758196801, 1758197917, 1758198833, 1758199749, 1758200665, 1758201581, 1758202497, 1758203413,
  1758204329, 1758205245,
];

type Zone = { minX: number; maxX: number; minY: number; maxY: number; name: string };

function dist(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function intendedShape(seed: number): string {
  const rng = mulberry32(seed);
  return GALAXY_SHAPES[Math.floor(rng() * GALAXY_SHAPES.length)];
}

function edgeBandDepth(map: GameMap): number {
  return Math.round(Math.min(map.width, map.height) * EDGE_BAND_DEPTH_FRACTION);
}

function namedZones(map: GameMap): Zone[] {
  const depth = edgeBandDepth(map);
  const { width, height } = map;
  const interiorMinX = EDGE_INNER_MARGIN + depth;
  const interiorMaxX = width - EDGE_INNER_MARGIN - depth - 1;
  const interiorMinY = EDGE_INNER_MARGIN + depth;
  const interiorMaxY = height - EDGE_INNER_MARGIN - depth - 1;
  const midX = Math.floor((interiorMinX + interiorMaxX) / 2);
  const midY = Math.floor((interiorMinY + interiorMaxY) / 2);
  return [
    { name: 'edge-top', minX: 0, maxX: width - 1, minY: EDGE_INNER_MARGIN, maxY: EDGE_INNER_MARGIN + depth - 1 },
    {
      name: 'edge-bottom',
      minX: 0,
      maxX: width - 1,
      minY: height - EDGE_INNER_MARGIN - depth,
      maxY: height - EDGE_INNER_MARGIN - 1,
    },
    { name: 'edge-left', minX: EDGE_INNER_MARGIN, maxX: EDGE_INNER_MARGIN + depth - 1, minY: 0, maxY: height - 1 },
    {
      name: 'edge-right',
      minX: width - EDGE_INNER_MARGIN - depth,
      maxX: width - EDGE_INNER_MARGIN - 1,
      minY: 0,
      maxY: height - 1,
    },
    { name: 'int-NW', minX: interiorMinX, maxX: midX, minY: interiorMinY, maxY: midY },
    { name: 'int-NE', minX: midX + 1, maxX: interiorMaxX, minY: interiorMinY, maxY: midY },
    { name: 'int-SW', minX: interiorMinX, maxX: midX, minY: midY + 1, maxY: interiorMaxY },
    { name: 'int-SE', minX: midX + 1, maxX: interiorMaxX, minY: midY + 1, maxY: interiorMaxY },
  ];
}

function zoneOf(p: Position, zones: Zone[]): string {
  const hits = zones.filter((z) => z.minX <= p.x && p.x <= z.maxX && z.minY <= p.y && p.y <= z.maxY);
  if (hits.length === 0) return 'outside-zones';
  // Prefer interior when overlapping isn't an issue; for edges prefer first named match.
  const interior = hits.find((z) => z.name.startsWith('int-'));
  return interior?.name ?? hits[0].name;
}

function compass(p: Position, w: number, h: number): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'C' {
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < Math.min(w, h) * 0.18) return 'C';
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = east, 90 = south
  const a = (ang + 360) % 360;
  if (a >= 337.5 || a < 22.5) return 'E';
  if (a < 67.5) return 'SE';
  if (a < 112.5) return 'S';
  if (a < 157.5) return 'SW';
  if (a < 202.5) return 'W';
  if (a < 247.5) return 'NW';
  if (a < 292.5) return 'N';
  return 'NE';
}

function quadrant(p: Position, w: number, h: number): 'NW' | 'NE' | 'SW' | 'SE' {
  const mx = (w - 1) / 2;
  const my = (h - 1) / 2;
  const east = p.x >= mx;
  const south = p.y >= my;
  if (!east && !south) return 'NW';
  if (east && !south) return 'NE';
  if (!east && south) return 'SW';
  return 'SE';
}

type Home = {
  id: string;
  name: string;
  owner: string;
  role: 'human' | 'ai';
  x: number;
  y: number;
  zone: string;
  compass: string;
  quadrant: string;
  distFromCenter: number;
};

function clusterGroups(homes: Home[], radius: number): string[][] {
  const n = homes.length;
  const parent = homes.map((_, i) => i);
  function find(i: number): number {
    return parent[i] === i ? i : (parent[i] = find(parent[i]));
  }
  function union(a: number, b: number) {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pa] = pb;
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist(homes[i], homes[j]) < radius) union(i, j);
    }
  }
  const groups = new Map<number, string[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const list = groups.get(r) ?? [];
    list.push(homes[i].owner);
    groups.set(r, list);
  }
  return [...groups.values()].filter((g) => g.length >= 2);
}

function main() {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
    origWarn.apply(console, args as []);
  };

  const games = [];

  for (let g = 0; g < SEEDS.length; g++) {
    const seed = SEEDS[g];
    warnings.length = 0;
    const map = generateMap({
      seed,
      width: GRID_SIDE,
      height: GRID_SIDE,
      planetCount: PLANET_COUNT,
      playerCount: PLAYER_COUNT,
    });
    const { map: spawned } = placeSpawns({
      map,
      humanPlayerIds: HUMAN_IDS,
      aiPlayerIds: AI_IDS,
      mapSize: MAP_SIZE,
      rng: mulberry32(seed + 1),
    });

    const zones = namedZones(spawned);
    const cx = (spawned.width - 1) / 2;
    const cy = (spawned.height - 1) / 2;
    const homes: Home[] = spawned.planets
      .filter((p: Planet) => p.isHomePlanet)
      .map((p: Planet) => ({
        id: p.id,
        name: p.name,
        owner: p.owner,
        role: HUMAN_IDS.includes(p.owner) ? ('human' as const) : ('ai' as const),
        x: p.position.x,
        y: p.position.y,
        zone: zoneOf(p.position, zones),
        compass: compass(p.position, spawned.width, spawned.height),
        quadrant: quadrant(p.position, spawned.width, spawned.height),
        distFromCenter: dist(p.position, { x: cx, y: cy }),
      }))
      .sort((a, b) => a.owner.localeCompare(b.owner, undefined, { numeric: true }));

    const byOwner = Object.fromEntries(homes.map((h) => [h.owner, h]));
    const h0 = byOwner['player-0'];
    const h1 = byOwner['player-1'];
    const humanDist = dist(h0, h1);

    const ais = homes.filter((h) => h.role === 'ai');
    const humans = homes.filter((h) => h.role === 'human');

    const aiToHuman = ais.map((ai) => ({
      owner: ai.owner,
      min: Math.min(...humans.map((h) => dist(ai, h))),
    }));
    const aiToAiPairs: number[] = [];
    for (let i = 0; i < ais.length; i++) {
      for (let j = i + 1; j < ais.length; j++) {
        aiToAiPairs.push(dist(ais[i], ais[j]));
      }
    }
    const allPairs: { a: string; b: string; d: number; kinds: string }[] = [];
    for (let i = 0; i < homes.length; i++) {
      for (let j = i + 1; j < homes.length; j++) {
        const kinds = [homes[i].role, homes[j].role].sort().join('-');
        allPairs.push({ a: homes[i].owner, b: homes[j].owner, d: dist(homes[i], homes[j]), kinds });
      }
    }

    const qCounts: Record<string, number> = { NW: 0, NE: 0, SW: 0, SE: 0 };
    for (const h of homes) qCounts[h.quadrant]++;
    const occupiedQuadrants = Object.values(qCounts).filter((n) => n > 0).length;
    const maxQuad = Math.max(...Object.values(qCounts));
    const emptyQuads = Object.entries(qCounts)
      .filter(([, n]) => n === 0)
      .map(([k]) => k);

    const halfNS = {
      north: homes.filter((h) => h.y < cy).length,
      south: homes.filter((h) => h.y >= cy).length,
    };
    const halfEW = {
      west: homes.filter((h) => h.x < cx).length,
      east: homes.filter((h) => h.x >= cx).length,
    };

    const cellSize = GRID_SIDE / 3;
    const cells = Array.from({ length: 9 }, () => 0);
    for (const h of homes) {
      const col = Math.min(2, Math.floor(h.x / cellSize));
      const row = Math.min(2, Math.floor(h.y / cellSize));
      cells[row * 3 + col]++;
    }
    const occupiedCells = cells.filter((n) => n > 0).length;

    const clusters = clusterGroups(homes, CLUSTER_RADIUS);
    const largestCluster = clusters.reduce((m, c) => Math.max(m, c.length), 1);
    const aiOnlyCluster = clusters.filter(
      (c) => c.length >= 2 && c.every((id) => AI_IDS.includes(id)),
    );

    const usedFallback = warnings.some((w) => /fallback/i.test(w));
    const humanSepFailed = warnings.some((w) => /human min-separation/i.test(w));

    const minAll = Math.min(...allPairs.map((p) => p.d));
    const meanAll = allPairs.reduce((s, p) => s + p.d, 0) / allPairs.length;
    const minAiAi = Math.min(...aiToAiPairs);
    const minAiHuman = Math.min(...aiToHuman.map((x) => x.min));

    const issues: string[] = [];
    if (humanDist < HUMAN_MIN) issues.push(`humans only ${humanDist.toFixed(1)} apart (need ${HUMAN_MIN})`);
    if (minAiHuman < AI_HUMAN_MIN)
      issues.push(`closest AI-human ${minAiHuman.toFixed(1)} (need ${AI_HUMAN_MIN})`);
    if (usedFallback) issues.push('AI fallback fired (zone/separation dropped)');
    if (humanSepFailed) issues.push('human min-sep retry exhausted');
    if (maxQuad >= 4) issues.push(`${maxQuad} of 6 homes in one quadrant`);
    else if (maxQuad >= 3) issues.push(`${maxQuad} homes share one quadrant`);
    if (occupiedQuadrants <= 2) issues.push(`only ${occupiedQuadrants} quadrants occupied`);
    if (Math.min(halfNS.north, halfNS.south) === 0) issues.push('one N/S half empty');
    if (Math.min(halfEW.west, halfEW.east) === 0) issues.push('one E/W half empty');
    if (largestCluster >= 3) issues.push(`cluster of ${largestCluster} within ${CLUSTER_RADIUS} clicks`);
    if (aiOnlyCluster.some((c) => c.length >= 3))
      issues.push('3+ AIs bunched within 40 clicks of each other');
    if (minAiAi < 20) issues.push(`two AIs only ${minAiAi.toFixed(1)} clicks apart`);

    let verdict: 'fair' | 'uneven' | 'failed';
    if (
      humanDist < HUMAN_MIN ||
      minAiHuman < AI_HUMAN_MIN ||
      usedFallback ||
      humanSepFailed
    ) {
      verdict = 'failed';
    } else if (issues.length > 0) {
      verdict = 'uneven';
    } else {
      verdict = 'fair';
    }

    games.push({
      index: g + 1,
      seed,
      intendedShape: intendedShape(seed),
      width: spawned.width,
      height: spawned.height,
      planetCount: spawned.planets.length,
      warnings: [...warnings],
      usedFallback,
      humanSepFailed,
      homes: homes.map((h) => ({
        ...h,
        x: Math.round(h.x * 10) / 10,
        y: Math.round(h.y * 10) / 10,
        distFromCenter: Math.round(h.distFromCenter * 10) / 10,
      })),
      planets: spawned.planets.map((p) => ({
        x: p.position.x,
        y: p.position.y,
        home: p.isHomePlanet,
        owner: p.isHomePlanet ? p.owner : null,
      })),
      humanDist: Math.round(humanDist * 10) / 10,
      minAiHuman: Math.round(minAiHuman * 10) / 10,
      minAiAi: Math.round(minAiAi * 10) / 10,
      minAll: Math.round(minAll * 10) / 10,
      meanAll: Math.round(meanAll * 10) / 10,
      aiToHuman: aiToHuman.map((x) => ({ owner: x.owner, min: Math.round(x.min * 10) / 10 })),
      qCounts,
      occupiedQuadrants,
      maxQuad,
      emptyQuads,
      halfNS,
      halfEW,
      cells,
      occupiedCells,
      clusters,
      largestCluster,
      issues,
      verdict,
    });
  }

  console.warn = origWarn;
  process.stdout.write(JSON.stringify({ gridSide: GRID_SIDE, planetCount: PLANET_COUNT, games }, null, 2));
}

main();
