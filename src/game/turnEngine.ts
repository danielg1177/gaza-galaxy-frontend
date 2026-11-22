import { updateAiObservation } from './aiEngine';
import { resolveArrival, resolveMultiwayCombat, type MultiwayCombatant } from './combatEngine';
import { mulberry32 } from './mapGenerator';
import {
  advanceFleets,
  computeClickDistance,
  computeTurnsInTransit,
  createFleet,
  effectiveRange,
  effectiveSpeed,
  fleetMapPosition,
  isInRange,
  routeLength,
} from './movementEngine';
import { scaledBuildingCost } from './productionEngine';
import { runProduction } from './productionEngine';
import { isAiControlled } from './playerControl';
import type {
  BuildingType,
  Fleet,
  GameMap,
  GameState,
  Planet,
  Player,
  RouteVertex,
  ScheduledMovement,
  TurnEvent,
} from './types';
import { flexibleMovementEnabled } from './types';

export type ResolveTurnResult = GameState & { events: TurnEvent[] };

export type PlayerAction =
  | {
      type: 'SEND_FLEET';
      fromPlanetId: string;
      toPlanetId: string;
      shipCount: number;
      /** Path after the origin. Absent for a straight flight. */
      stops?: RouteVertex[];
    }
  | { type: 'HOLD_FLEET'; fleetId: string }
  | { type: 'REDIRECT_FLEET'; fleetId: string; stops: RouteVertex[] }
  | { type: 'BUILD'; planetId: string; buildingType: BuildingType }
  | { type: 'SET_PRODUCTION_SLIDER'; planetId: string; value: number }
  | { type: 'END_TURN' };

export interface TurnInput {
  actions: PlayerAction[];
  playerId: string;
}

function findPlanet(map: GameMap, planetId: string): Planet | undefined {
  return map.planets.find((p) => p.id === planetId);
}

function cloneMap(map: GameMap): GameMap {
  return {
    width: map.width,
    height: map.height,
    planets: map.planets.map((p) => ({ ...p, buildings: [...p.buildings] })),
  };
}

function hashSeed(n: number): number {
  let h = n >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function groupArrivalsByDestination(arrivals: Fleet[], map: GameMap): Map<string, Fleet[]> {
  const destinationOrder: string[] = [];
  const byDestination = new Map<string, Fleet[]>();

  for (const fleet of arrivals) {
    const dest = fleet.destinationPlanetId;
    if (!byDestination.has(dest)) {
      byDestination.set(dest, []);
      destinationOrder.push(dest);
    }
    byDestination.get(dest)!.push(fleet);
  }

  const grouped = new Map<string, Fleet[]>();

  for (const destinationPlanetId of destinationOrder) {
    const destFleets = byDestination.get(destinationPlanetId)!;
    const byOwner = new Map<string, Fleet[]>();

    for (const fleet of destFleets) {
      if (!byOwner.has(fleet.ownerId)) {
        byOwner.set(fleet.ownerId, []);
      }
      byOwner.get(fleet.ownerId)!.push(fleet);
    }

    const merged: Fleet[] = [];
    for (const ownerFleets of byOwner.values()) {
      const first = ownerFleets[0];
      const shipCount = ownerFleets.reduce((sum, f) => sum + f.shipCount, 0);
      merged.push({ ...first, shipCount });
    }

    const planet = findPlanet(map, destinationPlanetId);
    const planetOwner = planet?.owner;

    merged.sort((a, b) => {
      const aIsOwner = a.ownerId === planetOwner;
      const bIsOwner = b.ownerId === planetOwner;
      if (aIsOwner && !bIsOwner) {
        return -1;
      }
      if (!aIsOwner && bIsOwner) {
        return 1;
      }
      return a.id.localeCompare(b.id);
    });

    grouped.set(destinationPlanetId, merged);
  }

  return grouped;
}

function groupAndSortArrivals(arrivals: Fleet[], map: GameMap): Fleet[] {
  return [...groupArrivalsByDestination(arrivals, map).values()].flat();
}

function countTotalCombatants(destFleets: Fleet[], planet: Planet | undefined): number {
  const arrivalOwners = new Set(destFleets.map((f) => f.ownerId));
  if (planet !== undefined && planet.owner !== 'neutral' && !arrivalOwners.has(planet.owner)) {
    return arrivalOwners.size + 1;
  }
  return arrivalOwners.size;
}

function buildCombatantList(destFleets: Fleet[], planet: Planet | undefined): MultiwayCombatant[] {
  const combatants: MultiwayCombatant[] = [];
  if (planet !== undefined && planet.owner !== 'neutral') {
    let garrisonShips = planet.shipCount;
    const ownerArriving = destFleets.find((f) => f.ownerId === planet.owner);
    if (ownerArriving !== undefined) {
      garrisonShips += ownerArriving.shipCount;
    }
    combatants.push({ ownerId: planet.owner, ships: garrisonShips });
  }
  for (const fleet of destFleets) {
    if (planet === undefined || fleet.ownerId !== planet.owner) {
      combatants.push({ ownerId: fleet.ownerId, ships: fleet.shipCount });
    }
  }
  return combatants;
}

export function advanceToNextNonEliminatedPlayer(state: GameState): GameState {
  return {
    ...state,
    currentPlayerId: nextNonEliminatedPlayerId(state.players, state.currentPlayerId),
  };
}

function nextNonEliminatedPlayerId(players: Player[], currentPlayerId: string): string {
  const currentIndex = players.findIndex((p) => p.id === currentPlayerId);
  if (currentIndex === -1) {
    throw new Error(`Current player ${currentPlayerId} not found in players list`);
  }

  for (let offset = 1; offset <= players.length; offset++) {
    const candidate = players[(currentIndex + offset) % players.length];
    if (!candidate.isEliminated) {
      return candidate.id;
    }
  }

  return currentPlayerId;
}

function clampVertex(vertex: RouteVertex, map: GameMap): RouteVertex {
  return {
    ...vertex,
    x: Math.min(map.width, Math.max(0, vertex.x)),
    y: Math.min(map.height, Math.max(0, vertex.y)),
  };
}

function launchVertices(
  origin: Planet,
  stops: RouteVertex[] | undefined,
  map: GameMap,
): RouteVertex[] {
  const start: RouteVertex = {
    x: origin.position.x,
    y: origin.position.y,
    planetId: origin.id,
  };
  const path = [start];
  for (const stop of stops ?? []) {
    const clamped = clampVertex(stop, map);
    const previous = path[path.length - 1];
    if (computeClickDistance(previous, clamped) < 0.05) {
      continue;
    }
    path.push(clamped);
  }
  return path;
}

function attachFlexibleCourse(
  fleet: Fleet,
  vertices: RouteVertex[],
  fuelFraction: number,
  orderRange: number,
  orderSpeed: number,
): Fleet {
  const length = routeLength(vertices);
  const turns = Math.max(1, Math.ceil(length / orderSpeed));
  const end = vertices[vertices.length - 1];
  return {
    ...fleet,
    destinationPlanetId: end?.planetId ?? '',
    turnsRemaining: turns,
    totalTurns: turns,
    course: { vertices, distanceTraveled: 0 },
    fuelFraction,
    orderRange,
    orderSpeed,
    holding: false,
  };
}

function assertFuelPath(vertices: RouteVertex[], fuelClicks: number): void {
  const length = routeLength(vertices);
  if (length < 0.05) {
    throw new Error('Path is too short');
  }
  if (length > fuelClicks + 1e-6) {
    throw new Error(
      `Path is ${length.toFixed(1)} clicks and fuel covers ${fuelClicks.toFixed(1)} clicks`,
    );
  }
  const end = vertices[vertices.length - 1];
  if (end?.planetId !== undefined && end.planetId === vertices[0]?.planetId && vertices.length === 2) {
    throw new Error('Origin and destination planets must be different');
  }
}

function processSendFleet(
  map: GameMap,
  fleets: Fleet[],
  action: Extract<PlayerAction, { type: 'SEND_FLEET' }>,
  playerId: string,
  players: Player[],
  turnNumber: number,
  roundNumber: number,
  fleetIndex: number,
  flexible: boolean,
): { map: GameMap; fleets: Fleet[] } {
  const origin = findPlanet(map, action.fromPlanetId);
  if (origin === undefined) {
    throw new Error(`Origin planet not found: ${action.fromPlanetId}`);
  }
  if (origin.owner !== playerId) {
    throw new Error(`Origin planet ${action.fromPlanetId} is not owned by player ${playerId}`);
  }
  
  const destination =
    action.toPlanetId.length > 0 ? findPlanet(map, action.toPlanetId) : undefined;
  const usingPath = flexible && action.stops !== undefined && action.stops.length > 0;
  if (!usingPath) {
    if (destination === undefined) {
      throw new Error(`Destination planet not found: ${action.toPlanetId}`);
    }
    if (action.fromPlanetId === action.toPlanetId) {
      throw new Error('Origin and destination planets must be different');
    }
  }
  
  if (action.shipCount < 1) {
    throw new Error('shipCount must be at least 1');
  }
  if (action.shipCount > origin.shipCount) {
    throw new Error(
      `Cannot send ${action.shipCount} ships from ${origin.name}; ${origin.name} only has ${origin.shipCount} ships`,
    );
  }

  const player = players.find((p) => p.id === playerId);
  const range = effectiveRange(player?.techLevel ?? 0);
  const speed = effectiveSpeed(player?.techLevel ?? 0);
  const vertices = flexible
    ? launchVertices(
        origin,
        usingPath
          ? action.stops
          : destination === undefined
            ? undefined
            : [{ x: destination.position.x, y: destination.position.y, planetId: destination.id }],
        map,
      )
    : [];

  if (flexible) {
    assertFuelPath(vertices, range);
  } else if (destination !== undefined && !isInRange(origin.position, destination.position, range)) {
    throw new Error(
      `Destination planet ${action.toPlanetId} is out of range (max ${range} clicks)`,
    );
  }

  const turnsRemaining = flexible
    ? Math.max(1, Math.ceil(routeLength(vertices) / speed))
    : computeTurnsInTransit(origin.position, destination!.position, speed);

  const updatedMap: GameMap = {
    ...map,
    planets: map.planets.map((planet) =>
      planet.id === action.fromPlanetId
        ? { ...planet, shipCount: planet.shipCount - action.shipCount }
        : planet,
    ),
  };

  let fleet = createFleet(
    playerId,
    action.shipCount,
    action.fromPlanetId,
    destination?.id ?? action.toPlanetId,
    turnsRemaining,
    turnNumber,
    fleetIndex,
    roundNumber,
  );
  if (flexible) {
    fleet = attachFlexibleCourse(fleet, vertices, 1, range, speed);
  }

  return { map: updatedMap, fleets: [...fleets, fleet] };
}

function processHoldFleet(
  map: GameMap,
  fleets: Fleet[],
  action: Extract<PlayerAction, { type: 'HOLD_FLEET' }>,
  playerId: string,
): { map: GameMap; fleets: Fleet[] } {
  const fleet = fleets.find((candidate) => candidate.id === action.fleetId);
  if (fleet === undefined || fleet.ownerId !== playerId || fleet.course === undefined) {
    return { map, fleets };
  }
  const unmoved =
    fleet.course.distanceTraveled <= 1e-6 &&
    fleet.course.vertices[0]?.planetId === fleet.originPlanetId;
  const origin = findPlanet(map, fleet.originPlanetId);
  if (unmoved && origin !== undefined && origin.owner === playerId) {
    return {
      map: {
        ...map,
        planets: map.planets.map((planet) =>
          planet.id === origin.id
            ? { ...planet, shipCount: planet.shipCount + fleet.shipCount }
            : planet,
        ),
      },
      fleets: fleets.filter((candidate) => candidate.id !== fleet.id),
    };
  }
  const position = fleetMapPosition(fleet, map.planets) ?? fleet.course.vertices[0];
  const held: Fleet = {
    ...fleet,
    holding: true,
    turnsRemaining: Math.max(1, fleet.turnsRemaining),
    destinationPlanetId: '',
    course: {
      vertices: [{ x: position.x, y: position.y }],
      distanceTraveled: 0,
    },
  };
  return {
    map,
    fleets: fleets.map((candidate) => (candidate.id === fleet.id ? held : candidate)),
  };
}

function processRedirectFleet(
  map: GameMap,
  fleets: Fleet[],
  action: Extract<PlayerAction, { type: 'REDIRECT_FLEET' }>,
  playerId: string,
  players: Player[],
): { map: GameMap; fleets: Fleet[] } {
  const fleet = fleets.find((candidate) => candidate.id === action.fleetId);
  if (fleet === undefined || fleet.ownerId !== playerId) {
    return { map, fleets };
  }
  const position = fleetMapPosition(fleet, map.planets);
  if (position === undefined || position === null) {
    return { map, fleets };
  }
  const player = players.find((candidate) => candidate.id === playerId);
  const range = effectiveRange(player?.techLevel ?? 0);
  const speed = effectiveSpeed(player?.techLevel ?? 0);
  const fuelClicks = (fleet.fuelFraction ?? 1) * range;
  const start: RouteVertex = { x: position.x, y: position.y };
  const vertices = [start];
  for (const stop of action.stops) {
    const clamped = clampVertex(stop, map);
    const previous = vertices[vertices.length - 1];
    if (computeClickDistance(previous, clamped) < 0.05) {
      continue;
    }
    vertices.push(clamped);
  }
  assertFuelPath(vertices, fuelClicks);
  const redirected = attachFlexibleCourse(
    fleet,
    vertices,
    fleet.fuelFraction ?? 1,
    range,
    speed,
  );
  return {
    map,
    fleets: fleets.map((candidate) => (candidate.id === fleet.id ? redirected : candidate)),
  };
}

export function scheduledMovementId(
  fromPlanetId: string,
  toPlanetId: string,
  stops?: RouteVertex[],
): string {
  if (stops !== undefined && stops.length > 0) {
    const body = stops
      .map((stop) => `${stop.x.toFixed(2)},${stop.y.toFixed(2)},${stop.planetId ?? ''}`)
      .join('|');
    return `${fromPlanetId}:path:${body}`;
  }
  return `${fromPlanetId}:${toPlanetId}`;
}

export function resolveScheduledShipCount(
  amount: number | 'all',
  available: number,
): number {
  if (available < 1) {
    return 0;
  }
  if (amount === 'all') {
    return available;
  }
  return Math.max(0, Math.min(Math.floor(amount), available));
}

/** Fixed counts dispatch before `'all'` so All sends whatever is left on the origin. */
function sortScheduledMovementsForDispatch(
  movements: ScheduledMovement[],
): ScheduledMovement[] {
  return [...movements].sort((a, b) => {
    const aAll = a.amount === 'all' ? 1 : 0;
    const bAll = b.amount === 'all' ? 1 : 0;
    return aAll - bAll;
  });
}

/**
 * Drops standing orders whose **origin** is no longer owned by the scheduler,
 * or whose planets no longer exist.
 * Capture of one origin must not cancel schedules on any other planet.
 * Recapture does not restore a dropped order.
 */
export function pruneScheduledMovements(
  movements: ScheduledMovement[],
  map: GameMap,
  _players?: Player[],
): ScheduledMovement[] {
  return movements.filter((movement) => {
    const origin = findPlanet(map, movement.fromPlanetId);
    if (origin === undefined) {
      return false;
    }
    // Exact origin ownership only. Do not wipe a player's other origins if they
    // are marked eliminated, and do not cancel because the destination changed hands.
    if (origin.owner !== movement.ownerId) {
      return false;
    }
    if (movement.stops !== undefined && movement.stops.length > 0) {
      const last = movement.stops[movement.stops.length - 1];
      if (last.planetId !== undefined) {
        const destination = findPlanet(map, last.planetId);
        if (destination === undefined || destination.id === origin.id) {
          return false;
        }
      }
      return true;
    }
    const destination = findPlanet(map, movement.toPlanetId);
    if (destination === undefined || destination.id === origin.id) {
      return false;
    }
    return true;
  });
}

export function collectScheduledQueueOrders(
  state: GameState,
  playerId: string,
  existingQueued: Array<{
    fromPlanetId: string;
    toPlanetId: string;
    shipCount: number;
    stops?: RouteVertex[];
    holdFleetId?: string;
    redirectFleetId?: string;
  }>,
): Array<{
  fromPlanetId: string;
  toPlanetId: string;
  shipCount: number;
  stops?: RouteVertex[];
}> {
  const player = state.players.find((p) => p.id === playerId);
  const range = effectiveRange(player?.techLevel ?? 0);
  const movements = sortScheduledMovementsForDispatch(
    pruneScheduledMovements(
      state.scheduledMovements ?? [],
      state.map,
      state.players,
    ).filter((movement) => movement.ownerId === playerId),
  );

  const occupied = new Set(
    existingQueued
      .filter((order) => order.holdFleetId === undefined && order.redirectFleetId === undefined)
      .map((order) => scheduledMovementId(order.fromPlanetId, order.toPlanetId, order.stops)),
  );
  const reservedByPlanet: Record<string, number> = {};
  for (const order of existingQueued) {
    reservedByPlanet[order.fromPlanetId] =
      (reservedByPlanet[order.fromPlanetId] ?? 0) + order.shipCount;
  }

  const orders: Array<{
    fromPlanetId: string;
    toPlanetId: string;
    shipCount: number;
    stops?: RouteVertex[];
  }> = [];
  const flexible = flexibleMovementEnabled(state.flexibleMovement);
  for (const movement of movements) {
    const pair = scheduledMovementId(movement.fromPlanetId, movement.toPlanetId, movement.stops);
    if (occupied.has(pair)) {
      continue;
    }
    const origin = findPlanet(state.map, movement.fromPlanetId);
    if (origin === undefined) {
      continue;
    }
    const stops = flexible ? movement.stops : undefined;
    const destination = findPlanet(state.map, movement.toPlanetId);
    if (stops !== undefined && stops.length > 0) {
      const vertices = launchVertices(origin, stops, state.map);
      if (routeLength(vertices) > range + 1e-6) {
        continue;
      }
    } else if (
      destination === undefined ||
      !isInRange(origin.position, destination.position, range)
    ) {
      continue;
    }
    const available = origin.shipCount - (reservedByPlanet[origin.id] ?? 0);
    const shipCount = resolveScheduledShipCount(movement.amount, available);
    if (shipCount < 1) {
      continue;
    }
    const last = stops?.[stops.length - 1];
    orders.push({
      fromPlanetId: movement.fromPlanetId,
      toPlanetId: last?.planetId ?? movement.toPlanetId,
      shipCount,
      ...(stops !== undefined && stops.length > 0 ? { stops } : {}),
    });
    occupied.add(pair);
    reservedByPlanet[origin.id] = (reservedByPlanet[origin.id] ?? 0) + shipCount;
  }
  return orders;
}

function dispatchScheduledFleet(
  map: GameMap,
  fleets: Fleet[],
  movement: ScheduledMovement,
  players: Player[],
  turnNumber: number,
  roundNumber: number,
  fleetIndex: number,
  flexible: boolean,
): { map: GameMap; fleets: Fleet[] } {
  const origin = findPlanet(map, movement.fromPlanetId);
  const destination = findPlanet(map, movement.toPlanetId);
  const stops = flexible ? movement.stops : undefined;
  if (origin === undefined || origin.owner !== movement.ownerId) {
    return { map, fleets };
  }
  if ((stops === undefined || stops.length === 0) && (destination === undefined || origin.id === destination.id)) {
    return { map, fleets };
  }

  const shipCount = resolveScheduledShipCount(movement.amount, origin.shipCount);
  if (shipCount < 1) {
    return { map, fleets };
  }

  const player = players.find((p) => p.id === movement.ownerId);
  const range = effectiveRange(player?.techLevel ?? 0);
  const speed = effectiveSpeed(player?.techLevel ?? 0);
  const vertices =
    stops !== undefined && stops.length > 0
      ? launchVertices(origin, stops, map)
      : destination === undefined
        ? []
        : launchVertices(
            origin,
            [{ x: destination.position.x, y: destination.position.y, planetId: destination.id }],
            map,
          );
  if (!flexible) {
    if (destination === undefined || !isInRange(origin.position, destination.position, range)) {
      return { map, fleets };
    }
  } else if (vertices.length < 2 || routeLength(vertices) > range + 1e-6) {
    return { map, fleets };
  }

  const turnsRemaining = flexible
    ? Math.max(1, Math.ceil(routeLength(vertices) / speed))
    : computeTurnsInTransit(origin.position, destination!.position, speed);
  const updatedMap: GameMap = {
    ...map,
    planets: map.planets.map((planet) =>
      planet.id === movement.fromPlanetId
        ? { ...planet, shipCount: planet.shipCount - shipCount }
        : planet,
    ),
  };
  let fleet = createFleet(
    movement.ownerId,
    shipCount,
    movement.fromPlanetId,
    vertices[vertices.length - 1]?.planetId ?? movement.toPlanetId,
    turnsRemaining,
    turnNumber,
    fleetIndex,
    roundNumber,
  );
  if (flexible) {
    fleet = attachFlexibleCourse(fleet, vertices, 1, range, speed);
  }
  return { map: updatedMap, fleets: [...fleets, fleet] };
}

function applyScheduledMovementsForPlayer(
  map: GameMap,
  fleets: Fleet[],
  movements: ScheduledMovement[],
  playerId: string,
  players: Player[],
  turnNumber: number,
  roundNumber: number,
  flexible: boolean,
): { map: GameMap; fleets: Fleet[] } {
  let nextMap = map;
  let nextFleets = fleets;
  const owned = sortScheduledMovementsForDispatch(
    movements.filter((movement) => movement.ownerId === playerId),
  );
  for (const movement of owned) {
    const result = dispatchScheduledFleet(
      nextMap,
      nextFleets,
      movement,
      players,
      turnNumber,
      roundNumber,
      nextFleets.length,
      flexible,
    );
    nextMap = result.map;
    nextFleets = result.fleets;
  }
  return { map: nextMap, fleets: nextFleets };
}

function processBuild(
  map: GameMap,
  players: Player[],
  action: Extract<PlayerAction, { type: 'BUILD' }>,
  playerId: string,
  roundNumber: number,
): { map: GameMap; players: Player[] } {
  const planet = map.planets.find((p) => p.id === action.planetId);
  if (planet === undefined) {
    throw new Error(`Planet not found: ${action.planetId}`);
  }
  if (planet.owner !== playerId) {
    throw new Error(`Planet ${action.planetId} is not owned by player ${playerId}`);
  }

  const activeAndPending = planet.buildings.length;
  if (activeAndPending >= planet.buildingSlots) {
    throw new Error(`No building slots available on planet ${action.planetId}`);
  }

  const cost = scaledBuildingCost(action.buildingType, planet);
  const player = players.find((p) => p.id === playerId);
  if (player === undefined || player.gold < cost) {
    throw new Error(`Insufficient gold to build on planet ${action.planetId}`);
  }

  const updatedPlayers = players.map((p) =>
    p.id === playerId ? { ...p, gold: p.gold - cost } : p,
  );

  const updatedMap: GameMap = {
    ...map,
    planets: map.planets.map((p) =>
      p.id === action.planetId
        ? { ...p, buildings: [...p.buildings, { type: action.buildingType, builtOnRound: roundNumber }] }
        : p,
    ),
  };

  return { map: updatedMap, players: updatedPlayers };
}

function processSetProductionSlider(
  map: GameMap,
  action: Extract<PlayerAction, { type: 'SET_PRODUCTION_SLIDER' }>,
  playerId: string,
): GameMap {
  const planet = map.planets.find((p) => p.id === action.planetId);
  if (planet === undefined) {
    throw new Error(`Planet not found: ${action.planetId}`);
  }
  if (planet.owner !== playerId) {
    throw new Error(`Planet ${action.planetId} is not owned by player ${playerId}`);
  }

  const value = Math.min(1, Math.max(0, action.value));
  return {
    ...map,
    planets: map.planets.map((p) =>
      p.id === action.planetId ? { ...p, productionSlider: value } : p,
    ),
  };
}

export function resolveTurn(state: GameState, input: TurnInput): ResolveTurnResult {
  if (input.playerId !== state.currentPlayerId) {
    throw new Error(
      `Turn player ${input.playerId} does not match current player ${state.currentPlayerId}`,
    );
  }
  if (state.status !== 'active') {
    throw new Error(`Cannot resolve turn when game status is ${state.status}`);
  }

  const events: TurnEvent[] = [];
  let map = cloneMap(state.map);
  let fleets: Fleet[] = state.fleets.map((f) => ({ ...f }));
  let players: Player[] = state.players.map((p) => ({ ...p }));

  // Pre-compute whether this turn is a round-wrap so production can run
  // before any step-2 early-arrival combat — guarding against the case where
  // an enemy fleet is resolved here before runProduction is ever called.
  const preCurrentIndex = state.players.findIndex((p) => p.id === state.currentPlayerId);
  const preNextId = nextNonEliminatedPlayerId(state.players, state.currentPlayerId);
  const preNextIndex = state.players.findIndex((p) => p.id === preNextId);
  const willRoundWrap = state.status === 'active' && preNextIndex <= preCurrentIndex;
  let productionAlreadyRan = false;
  if (willRoundWrap) {
    const { map: productionMap, players: productionPlayers } = runProduction(
      map,
      players,
      state.roundNumber,
      events,
    );
    map = productionMap;
    players = productionPlayers;
    productionAlreadyRan = true;
  }

  let eligibleArrivals: Fleet[] = [];
  let stillInTransit: Fleet[] = [];
  let combatRngCounter = 0;

  for (const fleet of fleets) {
    if (
      fleet.holding !== true &&
      fleet.turnsRemaining <= 0 &&
      fleet.dispatchedInRound < state.roundNumber
    ) {
      eligibleArrivals.push(fleet);
    } else {
      stillInTransit.push(fleet);
    }
  }

  const arrivalsByDest = groupArrivalsByDestination(eligibleArrivals, map);
  for (const [destPlanetId, destFleets] of arrivalsByDest) {
    const destPlanet = findPlanet(map, destPlanetId);
    const totalCombatants = countTotalCombatants(destFleets, destPlanet);

    if (totalCombatants >= 3) {
      const combatants = buildCombatantList(destFleets, destPlanet);
      const combatRng = mulberry32(hashSeed(state.seed + state.roundNumber * 10000 + combatRngCounter * 100));
      combatRngCounter += 1;
      const result = resolveMultiwayCombat(
        combatRng,
        combatants,
        map,
        destPlanetId,
        state.roundNumber,
        events,
        players,
        stillInTransit,
      );
      map = result.map;
      if (result.players !== undefined) {
        players = result.players;
      }
      if (result.fleets !== undefined) {
        stillInTransit = result.fleets;
      }
    } else {
      for (let i = 0; i < destFleets.length; i++) {
        const fleet = destFleets[i];
        const destP = findPlanet(map, fleet.destinationPlanetId);
        const nextFleet = destFleets[i + 1];
        const isSilentReinforcement =
          destP !== undefined &&
          fleet.ownerId === destP.owner &&
          nextFleet !== undefined &&
          nextFleet.destinationPlanetId === fleet.destinationPlanetId;
        const combatRng = mulberry32(hashSeed(state.seed + state.roundNumber * 10000 + combatRngCounter * 100));
        combatRngCounter += 1;
        const arrivalResult = resolveArrival(
          combatRng,
          fleet,
          map,
          state.roundNumber,
          isSilentReinforcement ? undefined : events,
          players,
          stillInTransit,
        );
        map = arrivalResult.map;
        if (arrivalResult.players !== undefined) {
          players = arrivalResult.players;
        }
        if (arrivalResult.fleets !== undefined) {
          stillInTransit = arrivalResult.fleets;
        }
      }
    }
  }

  fleets = stillInTransit;
  let scheduledMovements = pruneScheduledMovements(
    state.scheduledMovements ?? [],
    map,
    players,
  );

  // Process BUILD actions before fleet dispatch so gold deductions are applied first.
  const buildActions = input.actions.filter(
    (action): action is Extract<PlayerAction, { type: 'BUILD' }> => action.type === 'BUILD',
  );
  for (const action of buildActions) {
    const result = processBuild(map, players, action, input.playerId, state.roundNumber);
    map = result.map;
    players = result.players;
  }

  // Process production slider adjustments.
  const sliderActions = input.actions.filter(
    (action): action is Extract<PlayerAction, { type: 'SET_PRODUCTION_SLIDER' }> =>
      action.type === 'SET_PRODUCTION_SLIDER',
  );
  for (const action of sliderActions) {
    map = processSetProductionSlider(map, action, input.playerId);
  }

  const flexible = flexibleMovementEnabled(state.flexibleMovement);
  if (flexible) {
    for (const action of input.actions) {
      if (action.type === 'HOLD_FLEET') {
        const held = processHoldFleet(map, fleets, action, input.playerId);
        map = held.map;
        fleets = held.fleets;
      } else if (action.type === 'REDIRECT_FLEET') {
        const redirected = processRedirectFleet(map, fleets, action, input.playerId, players);
        map = redirected.map;
        fleets = redirected.fleets;
      }
    }
  }

  const sendFleetActions = input.actions.filter(
    (action): action is Extract<PlayerAction, { type: 'SEND_FLEET' }> => action.type === 'SEND_FLEET',
  );

  sendFleetActions.forEach((action, index) => {
    const result = processSendFleet(
      map,
      fleets,
      action,
      input.playerId,
      players,
      state.turnNumber,
      state.roundNumber,
      index,
      flexibleMovementEnabled(state.flexibleMovement),
    );
    map = result.map;
    fleets = result.fleets;
  });

  players = players.map((player) => {
    if (player.isEliminated) {
      return player;
    }
    const home = findPlanet(map, player.homePlanetId);
    const isEliminated = home === undefined || home.owner !== player.id;
    return { ...player, isEliminated };
  });

  let status: GameState['status'] = state.status;
  let winnerId: string | null = state.winnerId;

  const survivingPlayers = players.filter((p) => !p.isEliminated);
  if (survivingPlayers.length === 1) {
    status = 'finished';
    winnerId = survivingPlayers[0].id;
  }

  const currentPlayerId =
    status === 'active'
      ? nextNonEliminatedPlayerId(players, state.currentPlayerId)
      : state.currentPlayerId;

  const currentPlayerIndex = state.players.findIndex((p) => p.id === state.currentPlayerId);
  const nextPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);
  // One turn = one player's action batch. One round = one full cycle of all non-eliminated players.
  // Round-gated simulation (fleet transit + production) ticks only when player order wraps back
  // to the start of the cycle, never on every individual player turn.
  const isRoundWrap = status === 'active' && nextPlayerIndex <= currentPlayerIndex;

  if (isRoundWrap) {
    if (!productionAlreadyRan) {
      const { map: productionMap, players: productionPlayers } = runProduction(
        map,
        players,
        state.roundNumber,
        events,
      );
      map = productionMap;
      players = productionPlayers;
    }

    const { inTransit, arrived } = advanceFleets(fleets);
    fleets = inTransit;
    const arrivalsByDest = groupArrivalsByDestination(arrived, map);
    for (const [destPlanetId, destFleets] of arrivalsByDest) {
      const destPlanet = findPlanet(map, destPlanetId);
      const totalCombatants = countTotalCombatants(destFleets, destPlanet);

      if (totalCombatants >= 3) {
        const combatants = buildCombatantList(destFleets, destPlanet);
        const combatRng = mulberry32(hashSeed(state.seed + state.roundNumber * 10000 + combatRngCounter * 100));
        combatRngCounter += 1;
        const result = resolveMultiwayCombat(
          combatRng,
          combatants,
          map,
          destPlanetId,
          state.roundNumber,
          events,
          players,
          fleets,
        );
        map = result.map;
        if (result.players !== undefined) {
          players = result.players;
        }
        if (result.fleets !== undefined) {
          fleets = result.fleets;
        }
      } else {
        for (let i = 0; i < destFleets.length; i++) {
          const fleet = destFleets[i];
          const destP = findPlanet(map, fleet.destinationPlanetId);
          const nextFleet = destFleets[i + 1];
          const isSilentReinforcement =
            destP !== undefined &&
            fleet.ownerId === destP.owner &&
            nextFleet !== undefined &&
            nextFleet.destinationPlanetId === fleet.destinationPlanetId;
          const combatRng = mulberry32(hashSeed(state.seed + state.roundNumber * 10000 + combatRngCounter * 100));
          combatRngCounter += 1;
          const arrivalResult = resolveArrival(
            combatRng,
            fleet,
            map,
            state.roundNumber,
            isSilentReinforcement ? undefined : events,
            players,
            fleets,
          );
          map = arrivalResult.map;
          if (arrivalResult.players !== undefined) {
            players = arrivalResult.players;
          }
          if (arrivalResult.fleets !== undefined) {
            fleets = arrivalResult.fleets;
          }
        }
      }
    }
    scheduledMovements = pruneScheduledMovements(scheduledMovements, map, players);
  }

  let roundNumber = state.roundNumber;
  if (isRoundWrap) {
    roundNumber += 1;
  }

  scheduledMovements = pruneScheduledMovements(scheduledMovements, map, players);

  const nextTurnNumber = state.turnNumber + 1;
  // Humans see standing orders as queued departures on their own turn. AI and
  // sitting-out slots have no queue UI, so dispatch when they become current.
  if (status === 'active') {
    const nextPlayer = players.find((p) => p.id === currentPlayerId);
    if (nextPlayer !== undefined && isAiControlled(nextPlayer, state.playMode)) {
      const applied = applyScheduledMovementsForPlayer(
        map,
        fleets,
        scheduledMovements,
        currentPlayerId,
        players,
        nextTurnNumber,
        roundNumber,
        flexibleMovementEnabled(state.flexibleMovement),
      );
      map = applied.map;
      fleets = applied.fleets;
      scheduledMovements = pruneScheduledMovements(scheduledMovements, map, players);
    }
  }

  // Update AI fog-of-war memory for the player who just took their turn.
  // This runs after all fleet dispatches and production so the AI sees the
  // results of its own actions before the next decision cycle.
  const currentPlayer = players.find((p) => p.id === input.playerId);
  let aiStates = state.aiStates ?? {};
  if (currentPlayer !== undefined && isAiControlled(currentPlayer, state.playMode)) {
    const partialState: GameState = {
      ...state,
      map,
      players,
      fleets,
      turnNumber: nextTurnNumber,
      roundNumber,
      currentPlayerId,
      status,
      winnerId,
      aiStates,
      scheduledMovements,
    };
    aiStates = {
      ...aiStates,
      [input.playerId]: updateAiObservation(partialState, input.playerId, aiStates[input.playerId]),
    };
  }

  // Spread `state` first so fields this function does not compute (seed, playMode,
  // commanderStatusNotices, the knockout queue, anything added later) survive the
  // turn. The result is submitted wholesale as `state_json`, so a field missing
  // here is deleted for every player in the game.
  return {
    ...state,
    map,
    players,
    fleets,
    turnNumber: nextTurnNumber,
    roundNumber,
    currentPlayerId,
    status,
    winnerId,
    aiStates,
    scheduledMovements,
    events,
  };
}
