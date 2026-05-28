import type { GameMap, Planet, PlanetClass, Player } from './types';

export const FACTORY_GOLD_COST = 200;
export const RESEARCH_LAB_GOLD_COST = 250;
export const STARTING_GOLD = 500;
export const RESEARCH_LAB_POINTS_PER_TURN = 1;
export const MAX_TECH_LEVEL = 15;

/**
 * Research points required to advance from `level` to `level + 1`.
 * level 0→1: 10, level 1→2: 15, level 2→3: 22, level 3→4: 34, …
 * Formula: Math.round(10 * Math.pow(1.5, level))
 */
export function researchThreshold(level: number): number {
  return Math.round(10 * Math.pow(1.5, level));
}

export const FACTORY_TROOP_OUTPUT: Record<PlanetClass, number> = {
  A: 1.0,
  B: 0.9375,
  C: 0.875,
  D: 0.8125,
  E: 0.75,
  F: 0.6875,
  G: 0.625,
  H: 0.5625,
  I: 0.5,
  J: 0.4375,
  K: 0.375,
  L: 0.3125,
  M: 0.25,
  N: 0.1875,
  O: 0.125,
  P: 0.0625,
};

export const FACTORY_GOLD_OUTPUT: Record<PlanetClass, number> = {
  A: 50.0,
  B: 46.875,
  C: 43.75,
  D: 40.625,
  E: 37.5,
  F: 34.375,
  G: 31.25,
  H: 28.125,
  I: 25.0,
  J: 21.875,
  K: 18.75,
  L: 15.625,
  M: 12.5,
  N: 9.375,
  O: 6.25,
  P: 3.125,
};

function countActiveBuildings(
  planet: Planet,
  type: Planet['buildings'][number]['type'],
  currentRound: number,
): number {
  return planet.buildings.filter(
    (building) => building.type === type && building.builtOnRound < currentRound,
  ).length;
}

export function runProduction(
  map: GameMap,
  players: Player[],
  currentRound: number,
): { map: GameMap; players: Player[] } {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const goldTotals = new Map(players.map((player) => [player.id, player.gold]));
  const researchTotals = new Map(players.map((player) => [player.id, player.researchPoints]));

  const planets = map.planets.map((planet) => {
    if (planet.owner === 'neutral') {
      return planet;
    }

    const owner = playerById.get(planet.owner);
    if (owner === undefined) {
      return planet;
    }

    const factories = countActiveBuildings(planet, 'factory', currentRound);
    const labs = countActiveBuildings(planet, 'researchLab', currentRound);

    const rawTroopOutput =
      factories * FACTORY_TROOP_OUTPUT[planet.class] * planet.productionSlider;
    const rawGoldOutput =
      factories * FACTORY_GOLD_OUTPUT[planet.class] * (1 - planet.productionSlider);

    let troopAccumulator = planet.troopAccumulator + rawTroopOutput;
    const wholeTroops = Math.floor(troopAccumulator);
    troopAccumulator -= wholeTroops;

    goldTotals.set(planet.owner, (goldTotals.get(planet.owner) ?? 0) + Math.floor(rawGoldOutput));
    researchTotals.set(
      planet.owner,
      (researchTotals.get(planet.owner) ?? 0) + labs * RESEARCH_LAB_POINTS_PER_TURN,
    );

    return {
      ...planet,
      troopAccumulator,
      shipCount: planet.shipCount + wholeTroops,
    };
  });

  const updatedPlayers = players.map((player) => {
    const updatedPlayer = {
      ...player,
      gold: goldTotals.get(player.id) ?? player.gold,
      researchPoints: researchTotals.get(player.id) ?? player.researchPoints,
    };

    while (
      updatedPlayer.researchPoints >= researchThreshold(updatedPlayer.techLevel) &&
      updatedPlayer.techLevel < MAX_TECH_LEVEL
    ) {
      updatedPlayer.researchPoints -= researchThreshold(updatedPlayer.techLevel);
      updatedPlayer.techLevel += 1;
    }

    return updatedPlayer;
  });

  return {
    map: { ...map, planets },
    players: updatedPlayers,
  };
}
