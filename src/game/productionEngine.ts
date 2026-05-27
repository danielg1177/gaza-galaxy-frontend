import type { GameMap, Planet, PlanetClass, Player } from './types';

export const PLANET_CLASS_MULTIPLIERS: Record<PlanetClass, number> = {
  A: 2.0,
  B: 1.6,
  C: 1.2,
  D: 0.8,
  E: 0.5,
};

export const BASE_SHIP_PRODUCTION = 2;
export const BASE_RESOURCE_PRODUCTION = 1;
export const MANUFACTURING_BONUS_PER_LEVEL = 0.4;

function manufacturingBonus(buildings: Planet['buildings']): number {
  return buildings
    .filter((building) => building.type === 'manufacturingFacility')
    .reduce((sum, building) => sum + building.level * MANUFACTURING_BONUS_PER_LEVEL, 0);
}

function productionMultiplier(planet: Planet): number {
  return PLANET_CLASS_MULTIPLIERS[planet.class] + manufacturingBonus(planet.buildings);
}

export function runProduction(
  map: GameMap,
  players: Player[],
): { map: GameMap; players: Player[] } {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const resourceTotals = new Map(players.map((player) => [player.id, player.resources]));

  const planets = map.planets.map((planet) => {
    if (planet.owner === 'neutral') {
      return planet;
    }

    const owner = playerById.get(planet.owner);
    if (owner === undefined) {
      return planet;
    }

    const multiplier = productionMultiplier(planet);
    const shipsProduced = Math.floor(BASE_SHIP_PRODUCTION * multiplier);
    const resourcesProduced = Math.floor(BASE_RESOURCE_PRODUCTION * multiplier);

    resourceTotals.set(planet.owner, (resourceTotals.get(planet.owner) ?? 0) + resourcesProduced);

    return {
      ...planet,
      shipCount: planet.shipCount + shipsProduced,
    };
  });

  const updatedPlayers = players.map((player) => ({
    ...player,
    resources: resourceTotals.get(player.id) ?? player.resources,
  }));

  return {
    map: { ...map, planets },
    players: updatedPlayers,
  };
}
