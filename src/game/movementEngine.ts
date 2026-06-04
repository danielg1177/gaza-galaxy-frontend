import type { Fleet, Position } from './types';

export const BASE_FLEET_RANGE_CLICKS = 11;
export const BASE_FLEET_SPEED_CLICKS_PER_TURN = 5;
export const RANGE_CLICKS_PER_TECH_LEVEL = 1;
export const SPEED_CLICKS_PER_TECH_LEVEL = 1;

export function effectiveRange(techLevel: number): number {
  return BASE_FLEET_RANGE_CLICKS + techLevel * RANGE_CLICKS_PER_TECH_LEVEL;
}

export function effectiveSpeed(techLevel: number): number {
  return BASE_FLEET_SPEED_CLICKS_PER_TURN + techLevel * SPEED_CLICKS_PER_TECH_LEVEL;
}

export function computeClickDistance(origin: Position, destination: Position): number {
  const dx = origin.x - destination.x;
  const dy = origin.y - destination.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function computeTurnsInTransit(
  origin: Position,
  destination: Position,
  speedClicksPerTurn: number = BASE_FLEET_SPEED_CLICKS_PER_TURN,
): number {
  return Math.max(1, Math.ceil(computeClickDistance(origin, destination) / speedClicksPerTurn));
}

export function isInRange(
  origin: Position,
  destination: Position,
  rangeClicks: number = BASE_FLEET_RANGE_CLICKS,
): boolean {
  return computeClickDistance(origin, destination) <= rangeClicks;
}

export function createFleet(
  ownerId: string,
  shipCount: number,
  originPlanetId: string,
  destinationPlanetId: string,
  turnsRemaining: number,
  turnNumber: number,
  fleetIndex: number,
  dispatchedInRound: number,
): Fleet {
  return {
    id: `fleet-${turnNumber}-${fleetIndex}`,
    ownerId,
    shipCount,
    originPlanetId,
    destinationPlanetId,
    turnsRemaining,
    totalTurns: turnsRemaining,
    dispatchedInRound,
  };
}

export function advanceFleets(fleets: Fleet[]): { inTransit: Fleet[]; arrived: Fleet[] } {
  const inTransit: Fleet[] = [];
  const arrived: Fleet[] = [];

  for (const fleet of fleets) {
    // Transit advances in round-sized ticks (triggered by turnEngine on round wrap).
    // Arrived fleets are resolved immediately by turnEngine after this call.
    const turnsRemaining = fleet.turnsRemaining - 1;
    if (turnsRemaining <= 0) {
      arrived.push({ ...fleet, turnsRemaining: 0 });
    } else {
      inTransit.push({ ...fleet, turnsRemaining });
    }
  }

  return { inTransit, arrived };
}
