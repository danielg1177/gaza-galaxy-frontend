import { updateAiObservation } from './aiEngine';
import { resolveArrival, resolveMultiwayCombat, type MultiwayCombatant } from './combatEngine';
import { mulberry32 } from './mapGenerator';
import {
  advanceFleets,
  computeTurnsInTransit,
  createFleet,
  effectiveRange,
  effectiveSpeed,
  isInRange,
} from './movementEngine';
import { FACTORY_GOLD_COST, RESEARCH_LAB_GOLD_COST } from './productionEngine';
import { runProduction } from './productionEngine';
import type { BuildingType, Fleet, GameMap, GameState, Planet, Player, TurnEvent } from './types';

export type ResolveTurnResult = GameState & { events: TurnEvent[] };

export type PlayerAction =
  | { type: 'SEND_FLEET'; fromPlanetId: string; toPlanetId: string; shipCount: number }
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

  const cost = action.buildingType === 'factory' ? FACTORY_GOLD_COST : RESEARCH_LAB_GOLD_COST;
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
    if (fleet.turnsRemaining <= 0 && fleet.dispatchedInRound < state.roundNumber) {
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
  }

  let roundNumber = state.roundNumber;
  if (isRoundWrap) {
    roundNumber += 1;
  }

  // Update AI fog-of-war memory for the player who just took their turn.
  // This runs after all fleet dispatches and production so the AI sees the
  // results of its own actions before the next decision cycle.
  const currentPlayer = players.find((p) => p.id === input.playerId);
  let aiStates = state.aiStates ?? {};
  if (currentPlayer?.isAI === true) {
    const partialState: GameState = {
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
      aiStates,
    };
    aiStates = {
      ...aiStates,
      [input.playerId]: updateAiObservation(partialState, input.playerId, aiStates[input.playerId]),
    };
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
    aiStates,
    events,
  };
}
