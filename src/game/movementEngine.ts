import type { Fleet, Position } from './types';

function euclideanDistance(a: Position, b: Position): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function computeTurnsInTransit(origin: Position, destination: Position): number {
  return Math.max(1, Math.ceil(euclideanDistance(origin, destination)));
}

export function createFleet(
  ownerId: string,
  shipCount: number,
  originPlanetId: string,
  destinationPlanetId: string,
  turnsRemaining: number,
  turnNumber: number,
  fleetIndex: number,
): Fleet {
  return {
    id: `fleet-${turnNumber}-${fleetIndex}`,
    ownerId,
    shipCount,
    originPlanetId,
    destinationPlanetId,
    turnsRemaining,
  };
}

export function advanceFleets(fleets: Fleet[]): { inTransit: Fleet[]; arrived: Fleet[] } {
  const inTransit: Fleet[] = [];
  const arrived: Fleet[] = [];

  for (const fleet of fleets) {
    const turnsRemaining = fleet.turnsRemaining - 1;
    if (turnsRemaining <= 0) {
      arrived.push({ ...fleet, turnsRemaining: 0 });
    } else {
      inTransit.push({ ...fleet, turnsRemaining });
    }
  }

  return { inTransit, arrived };
}
