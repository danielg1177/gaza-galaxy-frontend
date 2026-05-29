import type { Fleet, GameMap, OwnerId, Planet, Player, TurnEvent } from './types';

export interface ResolveArrivalResult {
  map: GameMap;
  players?: Player[];
  fleets?: Fleet[];
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

function applyHomePlanetElimination(
  map: GameMap,
  players: Player[],
  fleets: Fleet[],
  defenderPlayer: Player,
): ResolveArrivalResult {
  const updatedPlayers = players.map((player) =>
    player.id === defenderPlayer.id ? { ...player, isEliminated: true } : player,
  );
  const forfeitedMap: GameMap = {
    ...map,
    planets: map.planets.map((planet) => {
      if (planet.owner === defenderPlayer.id) {
        return { ...planet, owner: 'neutral', shipCount: 0 };
      }
      return planet;
    }),
  };
  const updatedFleets = fleets.filter((fleet) => fleet.ownerId !== defenderPlayer.id);
  return { map: forfeitedMap, players: updatedPlayers, fleets: updatedFleets };
}

export function resolveArrival(
  rng: () => number,
  fleet: Fleet,
  map: GameMap,
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
      attackerName,
      shipCount: fleet.shipCount,
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
      attackerName,
      shipCount: fleet.shipCount,
    });
    return {
      map: updatePlanet(map, destination.id, (planet) => ({
        ...planet,
        owner: fleet.ownerId,
        shipCount: fleet.shipCount,
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
    attackerName,
    defenderName,
    attackerWon,
    attackerLost: attackerWon ? attackerShipsBefore - remainingShips : attackerShipsBefore,
    defenderLost: attackerWon ? defenderShipsBefore : defenderShipsBefore - remainingShips,
    attackerShipsBefore,
    defenderShipsBefore,
    remainingShips,
    ...(isHomePlanetConquest ? { isHomePlanetConquest: true } : {}),
  });

  if (attackerWon) {
    let capturedMap = updatePlanet(map, destination.id, (planet) => ({
      ...planet,
      owner: fleet.ownerId,
      shipCount: remainingShips,
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
