import type { Fleet, GameMap, Planet } from './types';

export const DEFENSE_BONUS = 1.2;
export const ATTACKER_TECH_MULTIPLIER = 1.0;
export const DEFENDER_TECH_MULTIPLIER = 1.0;

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

export function resolveArrival(fleet: Fleet, map: GameMap): GameMap {
  const destination = map.planets.find((p) => p.id === fleet.destinationPlanetId);
  if (destination === undefined) {
    throw new Error(`Destination planet not found: ${fleet.destinationPlanetId}`);
  }

  if (fleet.ownerId === destination.owner) {
    return updatePlanet(map, destination.id, (planet) => ({
      ...planet,
      shipCount: planet.shipCount + fleet.shipCount,
    }));
  }

  if (destination.owner === 'neutral') {
    return updatePlanet(map, destination.id, (planet) => ({
      ...planet,
      owner: fleet.ownerId,
      shipCount: fleet.shipCount,
    }));
  }

  const attackerStrength = fleet.shipCount * ATTACKER_TECH_MULTIPLIER;
  const defenderStrength =
    destination.shipCount * DEFENDER_TECH_MULTIPLIER * DEFENSE_BONUS;

  if (attackerStrength > defenderStrength) {
    const remainingShips = Math.floor(attackerStrength - defenderStrength);
    return updatePlanet(map, destination.id, (planet) => ({
      ...planet,
      owner: fleet.ownerId,
      shipCount: remainingShips,
    }));
  }

  const remainingShips = Math.floor(defenderStrength - attackerStrength);
  return updatePlanet(map, destination.id, (planet) => ({
    ...planet,
    shipCount: remainingShips,
  }));
}
