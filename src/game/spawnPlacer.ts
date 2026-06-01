import type { GameMap, MapSize, Planet, PlanetClass, Position } from './types';

const INITIAL_HOME_SHIP_COUNT = 5;
const EDGE_INNER_MARGIN = 3;
const EDGE_BAND_DEPTH_FRACTION = 0.28;
const HUMAN_SEPARATION_RETRY_LIMIT = 50;
const AI_MIN_SEPARATION_RETRY_LIMIT = 50;
const AI_MIN_SEPARATION_FROM_HUMAN: Record<MapSize, number> = {
  small: 30,
  medium: 40,
  large: 50,
};

const HUMAN_MIN_SEPARATION: Record<MapSize, number> = {
  small: 30,
  medium: 40,
  large: 50,
};

export const HOME_PLANET_CLASS_CONFIG: Record<
  string,
  { startingGold: number; buildingSlots: number }
> = {
  A: { startingGold: 1000, buildingSlots: 5 },
  B: { startingGold: 1100, buildingSlots: 6 },
  C: { startingGold: 1200, buildingSlots: 6 },
  D: { startingGold: 1300, buildingSlots: 7 },
  E: { startingGold: 1400, buildingSlots: 7 },
  F: { startingGold: 1500, buildingSlots: 8 },
  G: { startingGold: 1600, buildingSlots: 8 },
};
const HOME_PLANET_CLASSES = Object.keys(HOME_PLANET_CLASS_CONFIG) as PlanetClass[];

export interface SpawnPlacementResult {
  map: GameMap;
  homePlanetClassByPlayerId: Record<string, PlanetClass>;
}

export interface PlaceSpawnsOptions {
  map: GameMap;
  humanPlayerIds: string[];
  aiPlayerIds: string[];
  mapSize: MapSize;
  rng: () => number;
}

interface Zone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function computeClickDistance(origin: Position, destination: Position): number {
  const dx = origin.x - destination.x;
  const dy = origin.y - destination.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function fisherYatesShuffle<T>(items: T[], rng: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function planetInZone(planet: Planet, zone: Zone): boolean {
  const { x, y } = planet.position;
  return zone.minX <= x && x <= zone.maxX && zone.minY <= y && y <= zone.maxY;
}

function edgeBandDepth(map: GameMap): number {
  return Math.round(Math.min(map.width, map.height) * EDGE_BAND_DEPTH_FRACTION);
}

function generateEdgeZones(map: GameMap): Zone[] {
  const depth = edgeBandDepth(map);
  const { width, height } = map;

  return [
    { minX: 0, maxX: width - 1, minY: EDGE_INNER_MARGIN, maxY: EDGE_INNER_MARGIN + depth - 1 },
    {
      minX: 0,
      maxX: width - 1,
      minY: height - EDGE_INNER_MARGIN - depth,
      maxY: height - EDGE_INNER_MARGIN - 1,
    },
    { minX: EDGE_INNER_MARGIN, maxX: EDGE_INNER_MARGIN + depth - 1, minY: 0, maxY: height - 1 },
    {
      minX: width - EDGE_INNER_MARGIN - depth,
      maxX: width - EDGE_INNER_MARGIN - 1,
      minY: 0,
      maxY: height - 1,
    },
  ];
}

function generateInteriorZones(map: GameMap): Zone[] {
  const depth = edgeBandDepth(map);
  const interiorMinX = EDGE_INNER_MARGIN + depth;
  const interiorMaxX = map.width - EDGE_INNER_MARGIN - depth - 1;
  const interiorMinY = EDGE_INNER_MARGIN + depth;
  const interiorMaxY = map.height - EDGE_INNER_MARGIN - depth - 1;

  if (interiorMinX > interiorMaxX || interiorMinY > interiorMaxY) {
    return [];
  }

  const midX = Math.floor((interiorMinX + interiorMaxX) / 2);
  const midY = Math.floor((interiorMinY + interiorMaxY) / 2);

  return [
    { minX: interiorMinX, maxX: midX, minY: interiorMinY, maxY: midY },
    { minX: midX + 1, maxX: interiorMaxX, minY: interiorMinY, maxY: midY },
    { minX: interiorMinX, maxX: midX, minY: midY + 1, maxY: interiorMaxY },
    { minX: midX + 1, maxX: interiorMaxX, minY: midY + 1, maxY: interiorMaxY },
  ];
}

function neutralPlanetsInZone(
  map: GameMap,
  zone: Zone,
  excludedPlanetIndices: Set<number>,
  humanPositions: Position[] = [],
  minDistanceFromHuman: number = 0,
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < map.planets.length; i++) {
    const planet = map.planets[i];
    if (planet.owner !== 'neutral' || excludedPlanetIndices.has(i)) {
      continue;
    }
    if (!planetInZone(planet, zone)) {
      continue;
    }
    if (
      humanPositions.length > 0 &&
      humanPositions.some(
        (humanPosition) =>
          computeClickDistance(planet.position, humanPosition) < minDistanceFromHuman,
      )
    ) {
      continue;
    }
    indices.push(i);
  }
  return indices;
}

function zonesWithNeutralPlanets(map: GameMap, zones: Zone[]): Zone[] {
  return zones.filter((zone) => neutralPlanetsInZone(map, zone, new Set()).length > 0);
}

function pickRandomPlanetInZone(
  map: GameMap,
  zone: Zone,
  excludedPlanetIndices: Set<number>,
  rng: () => number,
  humanPositions: Position[] = [],
  minDistanceFromHuman: number = 0,
): number | undefined {
  const candidates = neutralPlanetsInZone(
    map,
    zone,
    excludedPlanetIndices,
    humanPositions,
    minDistanceFromHuman,
  );
  if (candidates.length === 0) {
    return undefined;
  }
  const index = Math.floor(rng() * candidates.length);
  return candidates[index];
}

function nextUnusedZone(shuffledZones: Zone[], usedZones: Set<Zone>): Zone | undefined {
  for (const zone of shuffledZones) {
    if (!usedZones.has(zone)) {
      return zone;
    }
  }
  return undefined;
}

function meetsHumanSeparation(
  assignments: Map<string, number>,
  map: GameMap,
  minDistance: number,
): boolean {
  const positions = [...assignments.values()].map((index) => map.planets[index].position);
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (computeClickDistance(positions[i], positions[j]) < minDistance) {
        return false;
      }
    }
  }
  return true;
}

function assignHumans(
  map: GameMap,
  humanPlayerIds: string[],
  edgeZones: Zone[],
  mapSize: MapSize,
  rng: () => number,
): Map<string, number> {
  const usableEdgeZones = zonesWithNeutralPlanets(map, edgeZones);
  const minDistance = HUMAN_MIN_SEPARATION[mapSize];
  let lastAssignment = new Map<string, number>();

  for (let attempt = 0; attempt < HUMAN_SEPARATION_RETRY_LIMIT; attempt++) {
    const shuffledZones = fisherYatesShuffle(usableEdgeZones, rng);
    const usedZones = new Set<Zone>();
    const assignedPlanetIndices = new Set<number>();
    const assignment = new Map<string, number>();
    let failed = false;

    for (const playerId of humanPlayerIds) {
      const zone = nextUnusedZone(shuffledZones, usedZones);
      if (zone === undefined) {
        failed = true;
        break;
      }
      const planetIndex = pickRandomPlanetInZone(map, zone, assignedPlanetIndices, rng);
      if (planetIndex === undefined) {
        failed = true;
        break;
      }
      usedZones.add(zone);
      assignedPlanetIndices.add(planetIndex);
      assignment.set(playerId, planetIndex);
    }

    if (failed) {
      lastAssignment = assignment;
      continue;
    }

    lastAssignment = assignment;

    if (humanPlayerIds.length <= 1 || meetsHumanSeparation(assignment, map, minDistance)) {
      return assignment;
    }
  }

  console.warn(
    'Task 127: human min-separation not met after 50 attempts, using last assignment',
  );
  return lastAssignment;
}

function assignAis(
  map: GameMap,
  aiPlayerIds: string[],
  edgeZones: Zone[],
  interiorZones: Zone[],
  humanAssignments: Map<string, number>,
  mapSize: MapSize,
  rng: () => number,
): Map<string, number> {
  const humanPositions = [...humanAssignments.values()].map(
    (index) => map.planets[index].position,
  );
  const minDistance = AI_MIN_SEPARATION_FROM_HUMAN[mapSize];
  let lastAssignment = new Map<string, number>();

  for (let attempt = 0; attempt < AI_MIN_SEPARATION_RETRY_LIMIT; attempt++) {
    const assignedPlanetIndices = new Set(humanAssignments.values());
    const allZones = [...interiorZones, ...edgeZones];
    const shuffledZones = fisherYatesShuffle(allZones, rng);
    const usedZones = new Set<Zone>();
    const assignment = new Map<string, number>();
    let failed = false;

    for (const playerId of aiPlayerIds) {
      let placed = false;
      for (const zone of shuffledZones) {
        if (usedZones.has(zone)) {
          continue;
        }
        const planetIndex = pickRandomPlanetInZone(
          map,
          zone,
          assignedPlanetIndices,
          rng,
          humanPositions,
          minDistance,
        );
        if (planetIndex === undefined) {
          continue;
        }
        usedZones.add(zone);
        assignedPlanetIndices.add(planetIndex);
        assignment.set(playerId, planetIndex);
        placed = true;
        break;
      }
      if (!placed) {
        failed = true;
        break;
      }
    }

    if (failed) {
      lastAssignment = assignment;
      continue;
    }

    lastAssignment = assignment;

    if (!failed) {
      return assignment;
    }
  }

  // Fallback: zone uniqueness and human-separation constraints are dropped.
  // This handles high player counts where strict constraints are geometrically impossible
  // (e.g. 4 AIs on a large map where both humans occupy opposite edge zones).
  const assignedPlanetIndices = new Set([
    ...humanAssignments.values(),
    ...lastAssignment.values(),
  ]);
  for (const playerId of aiPlayerIds) {
    if (lastAssignment.has(playerId)) continue;
    for (let i = 0; i < map.planets.length; i++) {
      if (map.planets[i].owner === 'neutral' && !assignedPlanetIndices.has(i)) {
        lastAssignment.set(playerId, i);
        assignedPlanetIndices.add(i);
        break;
      }
    }
  }
  console.warn('AI spawn fallback: zone/separation constraints unsatisfiable, remaining AIs placed on nearest available neutral planet');
  return lastAssignment;
}

function applyAssignment(
  map: GameMap,
  planetIndices: number[],
  playerIds: string[],
  rng: () => number,
): SpawnPlacementResult {
  const homeByPlanetIndex = new Map<number, string>();
  const homePlanetClassByPlayerId: Record<string, PlanetClass> = {};
  for (let i = 0; i < planetIndices.length; i++) {
    const playerId = playerIds[i];
    homeByPlanetIndex.set(planetIndices[i], playerId);
    const classIndex = Math.floor(rng() * HOME_PLANET_CLASSES.length);
    homePlanetClassByPlayerId[playerId] = HOME_PLANET_CLASSES[classIndex];
  }

  const planets = map.planets.map((planet, index) => {
    const owner = homeByPlanetIndex.get(index);
    if (owner === undefined) {
      return { ...planet };
    }
    const homePlanetClass = homePlanetClassByPlayerId[owner];
    const classConfig = HOME_PLANET_CLASS_CONFIG[homePlanetClass];
    return {
      ...planet,
      class: homePlanetClass,
      buildingSlots: classConfig.buildingSlots,
      isHomePlanet: true,
      owner,
      shipCount: INITIAL_HOME_SHIP_COUNT,
    };
  });

  return {
    map: { width: map.width, height: map.height, planets },
    homePlanetClassByPlayerId,
  };
}

/**
 * Assigns one starting planet per player on an existing map using zone-based placement.
 * Humans draw from edge zones; AIs draw from the full zone pool after humans are placed.
 * Returns a new map; the input is not mutated.
 */
export function placeSpawns(options: PlaceSpawnsOptions): SpawnPlacementResult {
  const { map, humanPlayerIds, aiPlayerIds, mapSize, rng } = options;
  const playerIds = [...humanPlayerIds, ...aiPlayerIds];

  if (playerIds.length > map.planets.length) {
    throw new Error(
      `Cannot place ${playerIds.length} spawns on a map with only ${map.planets.length} planets`,
    );
  }

  if (playerIds.length === 0) {
    return {
      map: { width: map.width, height: map.height, planets: map.planets.map((p) => ({ ...p })) },
      homePlanetClassByPlayerId: {},
    };
  }

  const edgeZones = generateEdgeZones(map);
  const interiorZones = generateInteriorZones(map);

  const humanAssignments = assignHumans(map, humanPlayerIds, edgeZones, mapSize, rng);
  const aiAssignments = assignAis(
    map,
    aiPlayerIds,
    edgeZones,
    interiorZones,
    humanAssignments,
    mapSize,
    rng,
  );

  const assignmentByPlayer = new Map([...humanAssignments, ...aiAssignments]);
  const usedIndices = new Set(assignmentByPlayer.values());
  const planetIndices = playerIds.map((id) => {
    let index = assignmentByPlayer.get(id);
    if (index === undefined) {
      // Last-resort fallback: pick any remaining neutral planet.
      for (let i = 0; i < map.planets.length; i++) {
        if (map.planets[i].owner === 'neutral' && !usedIndices.has(i)) {
          index = i;
          usedIndices.add(i);
          break;
        }
      }
      if (index === undefined) {
        throw new Error(`No starting planet assigned for player ${id} and no neutral planets remain`);
      }
      console.warn(`Spawn fallback triggered for ${id}: placed on first available neutral planet`);
    }
    return index;
  });

  return applyAssignment(map, planetIndices, playerIds, rng);
}
