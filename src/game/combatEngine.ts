import type { Fleet, GameMap, OwnerId, Planet, Player, TurnEvent } from './types';

export interface ResolveArrivalResult {
  map: GameMap;
  players?: Player[];
  fleets?: Fleet[];
}

export interface MultiwayCombatant {
  ownerId: OwnerId;
  ships: number;
}

function updatePlanet(
  map: GameMap,
  planetId: string,
  updater: (planet: Planet) => Planet,
): GameMap {
  return {
    ...map,
    planets: map.planets.map((planet) =>
      planet.id === planetId
        ? updater({ ...planet, buildings: [...planet.buildings] })
        : planet,
    ),
  };
}

function getOwnerName(ownerId: OwnerId, players: Player[] | undefined): string {
  if (ownerId === 'neutral') {
    return 'Neutral';
  }
  return players?.find((player) => player.id === ownerId)?.name ?? ownerId;
}

/** Clears ownership on all planets still held by an eliminated player (buildings intact). */
export function forfeitEliminatedPlayerPlanets(
  map: GameMap,
  eliminatedPlayerId: string,
): GameMap {
  return {
    ...map,
    planets: map.planets.map((planet) => {
      if (planet.owner === eliminatedPlayerId) {
        return { ...planet, owner: 'neutral', shipCount: 0 };
      }
      return planet;
    }),
  };
}

function applyHomePlanetElimination(
  map: GameMap,
  players: Player[],
  fleets: Fleet[],
  defenderPlayer: Player,
): ResolveArrivalResult {
  const updatedPlayers = players.map((player) =>
    player.id === defenderPlayer.id ? { ...player, isEliminated: true } : player,
  );
  const updatedFleets = fleets.filter((fleet) => fleet.ownerId !== defenderPlayer.id);
  const resultMap = defenderPlayer.isAI
    ? forfeitEliminatedPlayerPlanets(map, defenderPlayer.id)
    : map;
  return { map: resultMap, players: updatedPlayers, fleets: updatedFleets };
}

export function resolveArrival(
  rng: () => number,
  fleet: Fleet,
  map: GameMap,
  roundNumber: number,
  events?: TurnEvent[],
  players?: Player[],
  fleets?: Fleet[],
): ResolveArrivalResult {
  const destination = map.planets.find((p) => p.id === fleet.destinationPlanetId);
  if (destination === undefined) {
    throw new Error(`Destination planet not found: ${fleet.destinationPlanetId}`);
  }

  const planetName = destination.name;
  const attackerName = getOwnerName(fleet.ownerId, players);

  if (fleet.ownerId === destination.owner) {
    events?.push({
      kind: 'fleet_arrived',
      planetName,
      planetId: destination.id,
      attackerName,
      shipCount: fleet.shipCount,
      roundNumber,
    });
    return {
      map: updatePlanet(map, destination.id, (planet) => ({
        ...planet,
        shipCount: planet.shipCount + fleet.shipCount,
      })),
    };
  }

  if (destination.owner === 'neutral') {
    events?.push({
      kind: 'fleet_arrived',
      planetName,
      planetId: destination.id,
      attackerName,
      shipCount: fleet.shipCount,
      roundNumber,
    });
    return {
      map: updatePlanet(map, destination.id, (planet) => ({
        ...planet,
        owner: fleet.ownerId,
        shipCount: fleet.shipCount,
        troopAccumulator: 0,
      })),
    };
  }

  const attackerShipsBefore = fleet.shipCount;
  const defenderShipsBefore = destination.shipCount;
  const defenderName = getOwnerName(destination.owner, players);

  const attackerTechLevel = players?.find((p) => p.id === fleet.ownerId)?.techLevel ?? 0;
  const defenderTechLevel = players?.find((p) => p.id === destination.owner)?.techLevel ?? 0;

  const techDiff = attackerTechLevel - defenderTechLevel;
  const pAttackerWins = (7 + Math.max(0, techDiff)) / (14 + Math.abs(techDiff));
  let attackerShips = fleet.shipCount;
  let defenderShips = destination.shipCount;
  while (attackerShips > 0 && defenderShips > 0) {
    if (rng() < pAttackerWins) {
      defenderShips -= 1;
    } else {
      attackerShips -= 1;
    }
  }
  const attackerWon = attackerShips > 0;
  const remainingShips = attackerWon ? attackerShips : defenderShips;

  const defenderPlayer = players?.find((player) => player.id === destination.owner);
  const isHomePlanetConquest =
    attackerWon &&
    defenderPlayer !== undefined &&
    destination.id === defenderPlayer.homePlanetId;

  events?.push({
    kind: 'combat',
    planetName,
    planetId: destination.id,
    attackerName,
    defenderName,
    attackerWon,
    attackerLost: attackerWon ? attackerShipsBefore - remainingShips : attackerShipsBefore,
    defenderLost: attackerWon ? defenderShipsBefore : defenderShipsBefore - remainingShips,
    attackerShipsBefore,
    defenderShipsBefore,
    remainingShips,
    roundNumber,
    ...(isHomePlanetConquest ? { isHomePlanetConquest: true } : {}),
  });

  if (attackerWon) {
    let capturedMap = updatePlanet(map, destination.id, (planet) => ({
      ...planet,
      owner: fleet.ownerId,
      shipCount: remainingShips,
      troopAccumulator: 0,
    }));

    if (
      isHomePlanetConquest &&
      defenderPlayer !== undefined &&
      players !== undefined &&
      fleets !== undefined
    ) {
      return applyHomePlanetElimination(capturedMap, players, fleets, defenderPlayer);
    }

    return { map: capturedMap };
  }

  return {
    map: updatePlanet(map, destination.id, (planet) => ({
      ...planet,
      shipCount: remainingShips,
    })),
  };
}

export function resolveMultiwayCombat(
  rng: () => number,
  combatants: MultiwayCombatant[],
  map: GameMap,
  destinationPlanetId: string,
  roundNumber: number,
  events?: TurnEvent[],
  players?: Player[],
  fleets?: Fleet[],
): ResolveArrivalResult {
  const destination = map.planets.find((p) => p.id === destinationPlanetId);
  if (destination === undefined) {
    throw new Error(`Destination planet not found: ${destinationPlanetId}`);
  }

  const previousOwner = destination.owner;

  const participantSnapshots = combatants.map((c) => ({
    name: getOwnerName(c.ownerId, players),
    ownerId: c.ownerId,
    shipsBefore: c.ships,
    survived: false,
  }));

  const troops = combatants.map((c) => ({ ownerId: c.ownerId, ships: c.ships }));

  while (troops.filter((t) => t.ships > 0).length > 1) {
    const survivors = troops.filter((t) => t.ships > 0);
    const n = survivors.length;

    const aIdx = Math.floor(rng() * n);
    const bIdxRaw = Math.floor(rng() * (n - 1));
    const bIdx = bIdxRaw < aIdx ? bIdxRaw : bIdxRaw + 1;

    const a = survivors[aIdx];
    const b = survivors[bIdx];

    const aTech = players?.find((p) => p.id === a.ownerId)?.techLevel ?? 0;
    const bTech = players?.find((p) => p.id === b.ownerId)?.techLevel ?? 0;
    const techDiff = aTech - bTech;
    const pAWins = (7 + Math.max(0, techDiff)) / (14 + Math.abs(techDiff));

    if (rng() < pAWins) {
      b.ships -= 1;
    } else {
      a.ships -= 1;
    }
  }

  const winner = troops.find((t) => t.ships > 0)!;
  participantSnapshots.find((p) => p.ownerId === winner.ownerId)!.survived = true;

  const previousOwnerPlayer = players?.find((p) => p.id === previousOwner);
  const isHomePlanetConquest =
    winner.ownerId !== previousOwner &&
    previousOwnerPlayer !== undefined &&
    destination.id === previousOwnerPlayer.homePlanetId;

  events?.push({
    kind: 'multiway_combat',
    planetName: destination.name,
    planetId: destination.id,
    participants: participantSnapshots,
    winnerName: getOwnerName(winner.ownerId, players),
    winnerId: winner.ownerId,
    remainingShips: winner.ships,
    roundNumber,
    ...(isHomePlanetConquest ? { isHomePlanetConquest: true } : {}),
  });

  const updatedMap = updatePlanet(map, destination.id, (planet) => {
    if (winner.ownerId === previousOwner) {
      return { ...planet, shipCount: winner.ships };
    }
    return { ...planet, owner: winner.ownerId, shipCount: winner.ships, troopAccumulator: 0 };
  });

  if (
    isHomePlanetConquest &&
    previousOwnerPlayer !== undefined &&
    players !== undefined &&
    fleets !== undefined
  ) {
    return applyHomePlanetElimination(updatedMap, players, fleets, previousOwnerPlayer);
  }
  return { map: updatedMap };
}
