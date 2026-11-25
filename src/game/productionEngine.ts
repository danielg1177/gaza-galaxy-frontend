import { planetOutputMultiplier } from './planetMultipliers';
import type { GameMap, Planet, PlanetClass, Player, TurnEvent } from './types';

export const FACTORY_GOLD_COST = 200;
export const RESEARCH_LAB_GOLD_COST = 250;
export const STARTING_GOLD = 500;
export const RESEARCH_LAB_POINTS_PER_TURN = 1;
export const MAX_TECH_LEVEL = 15;

export const RESEARCH_THRESHOLDS: readonly number[] = [
  10, 23, 38, 58, 82, 113, 151, 198, 258, 333, 426, 542, 688, 869, 1097,
];

/**
 * Research points required to advance from `level` to `level + 1`.
 */
export function researchThreshold(level: number): number {
  return RESEARCH_THRESHOLDS[level] ?? Infinity;
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

/** Round to one decimal so slider labels and production credit the same value. */
export function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundToHundredth(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Factory and lab price on this planet. A ×1.25 lab is 313 gold (250 × 1.25).
 * Planets with no multiplier keep the base price.
 */
export function scaledBuildingCost(
  buildingType: 'factory' | 'researchLab',
  planet: { outputMultiplier?: number },
): number {
  const base = buildingType === 'factory' ? FACTORY_GOLD_COST : RESEARCH_LAB_GOLD_COST;
  return Math.round(base * planetOutputMultiplier(planet));
}

export function computeFactoryOutputs(
  factories: number,
  planetClass: PlanetClass,
  productionSlider: number,
  outputMultiplier = 1,
): { troops: number; gold: number } {
  // Round after the multiplier so the slider label and credit stay on tenths
  // (e.g. 1 × A × 1 × 1.25 → 1.3), not hundredths of a pre-boosted product.
  return {
    troops: roundToTenth(
      factories * FACTORY_TROOP_OUTPUT[planetClass] * productionSlider * outputMultiplier,
    ),
    gold: roundToTenth(
      factories * FACTORY_GOLD_OUTPUT[planetClass] * (1 - productionSlider) * outputMultiplier,
    ),
  };
}

function countActiveBuildings(
  planet: Planet,
  type: Planet['buildings'][number]['type'],
  currentRound: number,
): number {
  return planet.buildings.filter(
    (building) => building.type === type && building.builtOnRound < currentRound,
  ).length;
}

/** Projected income for one player on the next production tick (same math as `runProduction`). */
export function previewPlayerProduction(
  map: GameMap,
  playerId: string,
  currentRound: number,
): { troops: number; gold: number; research: number } {
  let troops = 0;
  let gold = 0;
  let research = 0;

  for (const planet of map.planets) {
    if (planet.owner !== playerId) {
      continue;
    }
    const factories = countActiveBuildings(planet, 'factory', currentRound);
    const labs = countActiveBuildings(planet, 'researchLab', currentRound);
    const outputMultiplier = planetOutputMultiplier(planet);
    const { troops: rawTroopOutput, gold: rawGoldOutput } = computeFactoryOutputs(
      factories,
      planet.class,
      planet.productionSlider,
      outputMultiplier,
    );

    const troopAccumulator = planet.troopAccumulator + rawTroopOutput;
    troops += Math.floor(troopAccumulator);
    gold += Math.floor(rawGoldOutput);
    research = roundToHundredth(
      research + labs * RESEARCH_LAB_POINTS_PER_TURN * outputMultiplier,
    );
  }

  return { troops, gold, research };
}

export function runProduction(
  map: GameMap,
  players: Player[],
  currentRound: number,
  events?: TurnEvent[],
): { map: GameMap; players: Player[] } {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const goldTotals = new Map(players.map((player) => [player.id, player.gold]));
  const researchTotals = new Map(players.map((player) => [player.id, player.researchPoints]));

  if (events !== undefined) {
    for (const planet of map.planets) {
      for (const building of planet.buildings) {
        if (building.builtOnRound === currentRound) {
          events.push({
            kind: 'build_complete',
            planetName: planet.name,
            planetId: planet.id,
            buildingType: building.type,
          });
        }
      }
    }
  }

  const planets = map.planets.map((planet) => {
    if (planet.owner === 'neutral') {
      return planet;
    }

    const owner = playerById.get(planet.owner);
    // Defensive guard: skip production for planets whose owner is no longer in
    // the player list or has already been eliminated. Normally, eliminated
    // players' planets are forfeited (set to neutral) by applyHomePlanetElimination
    // before production runs, so this branch should never fire in practice —
    // but it prevents any stale state from silently accumulating troops.
    if (owner === undefined || owner.isEliminated) {
      return planet;
    }

    const factories = countActiveBuildings(planet, 'factory', currentRound);
    const labs = countActiveBuildings(planet, 'researchLab', currentRound);

    const outputMultiplier = planetOutputMultiplier(planet);
    const { troops: rawTroopOutput, gold: rawGoldOutput } = computeFactoryOutputs(
      factories,
      planet.class,
      planet.productionSlider,
      outputMultiplier,
    );

    let troopAccumulator = planet.troopAccumulator + rawTroopOutput;
    const wholeTroops = Math.floor(troopAccumulator);
    troopAccumulator -= wholeTroops;

    if (wholeTroops >= 1 && events !== undefined) {
      events.push({
        kind: 'troop_produced',
        planetName: planet.name,
        planetId: planet.id,
        ownerName: owner.name,
        troopsAdded: wholeTroops,
      });
    }

    goldTotals.set(planet.owner, (goldTotals.get(planet.owner) ?? 0) + Math.floor(rawGoldOutput));
    const researchGained = roundToHundredth(
      labs * RESEARCH_LAB_POINTS_PER_TURN * outputMultiplier,
    );
    researchTotals.set(
      planet.owner,
      roundToHundredth((researchTotals.get(planet.owner) ?? 0) + researchGained),
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
      updatedPlayer.techLevel += 1;
      events?.push({
        kind: 'research_levelup',
        playerName: player.name,
        newLevel: updatedPlayer.techLevel,
      });
    }

    return updatedPlayer;
  });

  return {
    map: { ...map, planets },
    players: updatedPlayers,
  };
}
