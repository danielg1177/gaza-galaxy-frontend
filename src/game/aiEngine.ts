import { DEFENSE_BONUS } from './combatEngine';
import { computeTurnsInTransit } from './movementEngine';
import type { TurnInput } from './turnEngine';
import type { Fleet, GameMap, GameState, Planet, Player, Position } from './types';

export type AiDifficulty = 'easy' | 'normal';

function findPlanet(map: GameMap, planetId: string): Planet | undefined {
  return map.planets.find((p) => p.id === planetId);
}

function transitDistance(from: Position, to: Position): number {
  return computeTurnsInTransit(from, to);
}

function getOwnedPlanets(map: GameMap, ownerId: string): Planet[] {
  return map.planets.filter((p) => p.owner === ownerId);
}

function incomingEnemyFleets(state: GameState, playerId: string, planetId: string): Fleet[] {
  return state.fleets.filter(
    (f) => f.destinationPlanetId === planetId && f.ownerId !== playerId,
  );
}

function nearestOwnedPlanet(
  map: GameMap,
  ownerId: string,
  target: Position,
  options: { minShipCount: number; excludeIds: Set<string> },
): Planet | undefined {
  let best: Planet | undefined;
  let bestDistance = Infinity;

  for (const planet of getOwnedPlanets(map, ownerId)) {
    if (options.excludeIds.has(planet.id)) {
      continue;
    }
    if (planet.shipCount <= options.minShipCount) {
      continue;
    }

    const distance = transitDistance(planet.position, target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = planet;
    }
  }

  return best;
}

function clampSendCount(sourceShipCount: number, desired: number): number {
  const maxSend = sourceShipCount - 1;
  return Math.min(Math.max(1, desired), maxSend);
}

function endTurn(playerId: string): TurnInput {
  return { actions: [{ type: 'END_TURN' }], playerId };
}

function sendFleetTurn(
  playerId: string,
  fromPlanetId: string,
  toPlanetId: string,
  shipCount: number,
): TurnInput {
  return {
    actions: [
      { type: 'SEND_FLEET', fromPlanetId, toPlanetId, shipCount },
      { type: 'END_TURN' },
    ],
    playerId,
  };
}

function tryReinforceHome(
  state: GameState,
  player: Player,
  usedSources: Set<string>,
): TurnInput | null {
  const home = findPlanet(state.map, player.homePlanetId);
  if (home === undefined || home.owner !== player.id) {
    return null;
  }

  const threats = incomingEnemyFleets(state, player.id, home.id);
  if (threats.length === 0) {
    return null;
  }

  const maxIncomingShips = Math.max(...threats.map((f) => f.shipCount));
  if (home.shipCount >= maxIncomingShips) {
    return null;
  }

  const source = nearestOwnedPlanet(state.map, player.id, home.position, {
    minShipCount: 5,
    excludeIds: usedSources,
  });
  if (source === undefined) {
    return null;
  }

  const shipsNeeded = maxIncomingShips - home.shipCount;
  const shipCount = clampSendCount(source.shipCount, shipsNeeded);
  if (shipCount < 1) {
    return null;
  }

  return sendFleetTurn(player.id, source.id, home.id, shipCount);
}

function distanceToNearestOwnedPlanet(map: GameMap, ownerId: string, target: Planet): number {
  const owned = getOwnedPlanets(map, ownerId);
  if (owned.length === 0) {
    return Infinity;
  }

  return Math.min(
    ...owned.map((p) => transitDistance(p.position, target.position)),
  );
}

function tryAttackWeakestEnemy(
  state: GameState,
  playerId: string,
  usedSources: Set<string>,
): TurnInput | null {
  const enemies = state.map.planets.filter(
    (p) => p.owner !== 'neutral' && p.owner !== playerId,
  );
  if (enemies.length === 0) {
    return null;
  }

  const scored = enemies
    .map((planet) => {
      const distance = distanceToNearestOwnedPlanet(state.map, playerId, planet);
      const score = planet.shipCount / distance;
      return { planet, score, distance };
    })
    .sort((a, b) => a.score - b.score || a.planet.id.localeCompare(b.planet.id));

  for (const { planet: target } of scored) {
    const source = nearestOwnedPlanet(state.map, playerId, target.position, {
      minShipCount: 6,
      excludeIds: usedSources,
    });
    if (source === undefined) {
      continue;
    }

    const shipCount = clampSendCount(
      source.shipCount,
      Math.floor(source.shipCount * 0.6),
    );
    const attackerStrength = shipCount;
    const defenderStrength = target.shipCount * DEFENSE_BONUS;
    if (attackerStrength <= defenderStrength) {
      continue;
    }

    return sendFleetTurn(playerId, source.id, target.id, shipCount);
  }

  return null;
}

function tryExpandToNeutral(
  state: GameState,
  playerId: string,
  usedSources: Set<string>,
): TurnInput | null {
  const neutrals = state.map.planets.filter((p) => p.owner === 'neutral');
  if (neutrals.length === 0) {
    return null;
  }

  const owned = getOwnedPlanets(state.map, playerId);
  if (owned.length === 0) {
    return null;
  }

  let bestTarget: Planet | undefined;
  let bestSource: Planet | undefined;
  let bestDistance = Infinity;

  for (const target of neutrals) {
    for (const source of owned) {
      if (usedSources.has(source.id) || source.shipCount <= 4) {
        continue;
      }

      const distance = transitDistance(source.position, target.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestTarget = target;
        bestSource = source;
      } else if (
        distance === bestDistance &&
        bestTarget !== undefined &&
        target.id.localeCompare(bestTarget.id) < 0
      ) {
        bestTarget = target;
        bestSource = source;
      }
    }
  }

  if (bestTarget === undefined || bestSource === undefined) {
    return null;
  }

  const shipCount = clampSendCount(
    bestSource.shipCount,
    Math.floor(bestSource.shipCount * 0.5),
  );
  if (shipCount < 1) {
    return null;
  }

  return sendFleetTurn(playerId, bestSource.id, bestTarget.id, shipCount);
}

/**
 * Deterministic heuristic AI. Produces a single fleet dispatch (if any) plus END_TURN.
 * `AiDifficulty` is scaffolding; easy and normal use the same logic today.
 */
export function computeAiTurn(state: GameState, playerId: string): TurnInput {
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined || player.isEliminated || state.status !== 'active') {
    return endTurn(playerId);
  }

  const usedSources = new Set<string>();

  const reinforce = tryReinforceHome(state, player, usedSources);
  if (reinforce !== null) {
    return reinforce;
  }

  const attack = tryAttackWeakestEnemy(state, playerId, usedSources);
  if (attack !== null) {
    return attack;
  }

  const expand = tryExpandToNeutral(state, playerId, usedSources);
  if (expand !== null) {
    return expand;
  }

  return endTurn(playerId);
}
