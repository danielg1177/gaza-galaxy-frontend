import { resolveArrival } from './combatEngine';
import {
  advanceFleets,
  computeTurnsInTransit,
  createFleet,
  effectiveRange,
  effectiveSpeed,
  isInRange,
} from './movementEngine';
import { runProduction } from './productionEngine';
import type { Fleet, GameMap, GameState, Planet, Player } from './types';

export type PlayerAction =
  | { type: 'SEND_FLEET'; fromPlanetId: string; toPlanetId: string; shipCount: number }
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

function processSendFleet(
  map: GameMap,
  fleets: Fleet[],
  action: Extract<PlayerAction, { type: 'SEND_FLEET' }>,
  playerId: string,
  players: Player[],
  turnNumber: number,
  roundNumber: number,
  fleetIndex: number,
): { map: GameMap; fleets: Fleet[] } {
  const origin = findPlanet(map, action.fromPlanetId);
  if (origin === undefined) {
    throw new Error(`Origin planet not found: ${action.fromPlanetId}`);
  }
  if (origin.owner !== playerId) {
    throw new Error(`Origin planet ${action.fromPlanetId} is not owned by player ${playerId}`);
  }
  if (action.shipCount < 1) {
    throw new Error('shipCount must be at least 1');
  }
  if (action.shipCount > origin.shipCount) {
    throw new Error(
      `Cannot send ${action.shipCount} ships from ${action.fromPlanetId}; planet only has ${origin.shipCount} ships`,
    );
  }

  const destination = findPlanet(map, action.toPlanetId);
  if (destination === undefined) {
    throw new Error(`Destination planet not found: ${action.toPlanetId}`);
  }
  if (action.fromPlanetId === action.toPlanetId) {
    throw new Error('Origin and destination planets must be different');
  }

  const player = players.find((p) => p.id === playerId);
  const range = effectiveRange(player?.techLevel ?? 0);
  const speed = effectiveSpeed(player?.techLevel ?? 0);

  if (!isInRange(origin.position, destination.position, range)) {
    throw new Error(
      `Destination planet ${action.toPlanetId} is out of range (max ${range} clicks)`,
    );
  }

  const turnsRemaining = computeTurnsInTransit(origin.position, destination.position, speed);

  const updatedMap: GameMap = {
    ...map,
    planets: map.planets.map((planet) =>
      planet.id === action.fromPlanetId
        ? { ...planet, shipCount: planet.shipCount - action.shipCount }
        : planet,
    ),
  };

  const fleet = createFleet(
    playerId,
    action.shipCount,
    action.fromPlanetId,
    action.toPlanetId,
    turnsRemaining,
    turnNumber,
    fleetIndex,
    roundNumber,
  );

  return { map: updatedMap, fleets: [...fleets, fleet] };
}

export function resolveTurn(state: GameState, input: TurnInput): GameState {
  if (input.playerId !== state.currentPlayerId) {
    throw new Error(
      `Turn player ${input.playerId} does not match current player ${state.currentPlayerId}`,
    );
  }
  if (state.status !== 'active') {
    throw new Error(`Cannot resolve turn when game status is ${state.status}`);
  }

  let map = cloneMap(state.map);
  let fleets: Fleet[] = state.fleets.map((f) => ({ ...f }));
  let players: Player[] = state.players.map((p) => ({ ...p }));

  const eligibleArrivals: Fleet[] = [];
  const stillInTransit: Fleet[] = [];

  for (const fleet of fleets) {
    if (fleet.turnsRemaining <= 0 && fleet.dispatchedInRound < state.roundNumber) {
      eligibleArrivals.push(fleet);
    } else {
      stillInTransit.push(fleet);
    }
  }

  for (const fleet of eligibleArrivals) {
    map = resolveArrival(fleet, map);
  }

  fleets = stillInTransit;

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
    );
    map = result.map;
    fleets = result.fleets;
  });

  players = players.map((player) => {
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
    const { inTransit, arrived: justArrived } = advanceFleets(fleets);
    fleets = inTransit;
    for (const fleet of justArrived) {
      map = resolveArrival(fleet, map);
    }

    const { map: newMap, players: newPlayers } = runProduction(
      map,
      players,
      state.roundNumber,
    );
    map = newMap;
    players = newPlayers;
  }

  let roundNumber = state.roundNumber;
  if (isRoundWrap) {
    roundNumber += 1;
  }

  return {
    map,
    players,
    fleets,
    turnNumber: state.turnNumber + 1,
    roundNumber,
    currentPlayerId,
    seed: state.seed,
    playMode: state.playMode,
    status,
    winnerId,
  };
}
