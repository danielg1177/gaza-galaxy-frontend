import type { Fleet, FleetCourse, Planet, Position, RouteVertex } from './types';

export const BASE_FLEET_RANGE_CLICKS = 11;
export const BASE_FLEET_SPEED_CLICKS_PER_TURN = 5;
export const RANGE_CLICKS_PER_TECH_LEVEL = 2;
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

export function routeLength(vertices: RouteVertex[]): number {
  let total = 0;
  for (let index = 1; index < vertices.length; index += 1) {
    total += computeClickDistance(vertices[index - 1], vertices[index]);
  }
  return total;
}

export function positionAlongRoute(vertices: RouteVertex[], distance: number): Position {
  const first = vertices[0];
  if (first === undefined) {
    return { x: 0, y: 0 };
  }
  if (vertices.length === 1 || distance <= 0) {
    return { x: first.x, y: first.y };
  }
  let remaining = distance;
  for (let index = 1; index < vertices.length; index += 1) {
    const previous = vertices[index - 1];
    const next = vertices[index];
    const segment = computeClickDistance(previous, next);
    if (remaining <= segment || index === vertices.length - 1) {
      const t = segment === 0 ? 1 : Math.min(1, remaining / segment);
      return {
        x: previous.x + (next.x - previous.x) * t,
        y: previous.y + (next.y - previous.y) * t,
      };
    }
    remaining -= segment;
  }
  const last = vertices[vertices.length - 1];
  return { x: last.x, y: last.y };
}

/** Where a fleet is right now, in click coordinates. */
export function fleetMapPosition(fleet: Fleet, planets: Planet[]): Position | null {
  if (fleet.course !== undefined && fleet.course.vertices.length > 0) {
    return positionAlongRoute(fleet.course.vertices, fleet.course.distanceTraveled);
  }
  const origin = planets.find((planet) => planet.id === fleet.originPlanetId);
  const destination = planets.find((planet) => planet.id === fleet.destinationPlanetId);
  if (origin === undefined || destination === undefined) {
    return null;
  }
  const progress = fleet.totalTurns > 0 ? 1 - fleet.turnsRemaining / fleet.totalTurns : 1;
  return {
    x: origin.position.x + (destination.position.x - origin.position.x) * progress,
    y: origin.position.y + (destination.position.y - origin.position.y) * progress,
  };
}

export function clampPointToDistance(from: Position, to: Position, maxDistance: number): Position {
  if (maxDistance <= 0) {
    return { x: from.x, y: from.y };
  }
  const distance = computeClickDistance(from, to);
  if (distance <= maxDistance || distance === 0) {
    return { x: to.x, y: to.y };
  }
  const scale = maxDistance / distance;
  return {
    x: from.x + (to.x - from.x) * scale,
    y: from.y + (to.y - from.y) * scale,
  };
}

export function nearestPlanetDistance(point: Position, planets: Planet[]): number {
  let nearest = Infinity;
  for (const planet of planets) {
    nearest = Math.min(nearest, computeClickDistance(point, planet.position));
  }
  return nearest;
}

/** True when the fuel left after stopping here cannot reach any planet. */
export function stopStrandsFleet(
  point: Position,
  fuelClicksAfterStop: number,
  planets: Planet[],
): boolean {
  return nearestPlanetDistance(point, planets) > fuelClicksAfterStop + 1e-6;
}

function courseFuelAfterStep(
  fleet: Fleet,
  step: number,
): number {
  const range = fleet.orderRange ?? BASE_FLEET_RANGE_CLICKS;
  const spent = range > 0 ? step / range : 0;
  return Math.max(0, (fleet.fuelFraction ?? 1) - spent);
}

function advanceCourseFleet(fleet: Fleet): { fleet: Fleet; arrived: boolean } {
  const course = fleet.course;
  if (course === undefined || fleet.holding === true) {
    return { fleet, arrived: false };
  }
  const speed = fleet.orderSpeed ?? BASE_FLEET_SPEED_CLICKS_PER_TURN;
  const total = routeLength(course.vertices);
  const remaining = Math.max(0, total - course.distanceTraveled);
  const step = Math.min(speed, remaining);
  const distanceTraveled = course.distanceTraveled + step;
  const nextCourse: FleetCourse = { ...course, distanceTraveled };
  const fuelFraction = courseFuelAfterStep(fleet, step);
  const left = total - distanceTraveled;
  if (left <= 1e-6) {
    const end = course.vertices[course.vertices.length - 1];
    const finished: Fleet = {
      ...fleet,
      course: { ...nextCourse, distanceTraveled: total },
      fuelFraction,
      destinationPlanetId: end?.planetId ?? '',
      turnsRemaining: 0,
    };
    if (end?.planetId !== undefined) {
      return { fleet: finished, arrived: true };
    }
    return {
      fleet: { ...finished, holding: true, turnsRemaining: 1 },
      arrived: false,
    };
  }
  return {
    fleet: {
      ...fleet,
      course: nextCourse,
      fuelFraction,
      turnsRemaining: Math.max(1, Math.ceil(left / speed)),
    },
    arrived: false,
  };
}

function mergeHoldingFleets(fleets: Fleet[]): Fleet[] {
  const merged: Fleet[] = [];
  for (const fleet of fleets) {
    if (fleet.holding !== true || fleet.course === undefined) {
      merged.push(fleet);
      continue;
    }
    const position = positionAlongRoute(fleet.course.vertices, fleet.course.distanceTraveled);
    const fuel = fleet.fuelFraction ?? 1;
    const matchIndex = merged.findIndex((other) => {
      if (other.holding !== true || other.ownerId !== fleet.ownerId || other.course === undefined) {
        return false;
      }
      const otherPosition = positionAlongRoute(other.course.vertices, other.course.distanceTraveled);
      return (
        Math.abs((other.fuelFraction ?? 1) - fuel) < 1e-4 &&
        computeClickDistance(position, otherPosition) < 0.05
      );
    });
    if (matchIndex === -1) {
      merged.push(fleet);
      continue;
    }
    const match = merged[matchIndex];
    merged[matchIndex] = { ...match, shipCount: match.shipCount + fleet.shipCount };
  }
  return merged;
}

export function advanceFleets(fleets: Fleet[]): { inTransit: Fleet[]; arrived: Fleet[] } {
  const inTransit: Fleet[] = [];
  const arrived: Fleet[] = [];

  for (const fleet of fleets) {
    if (fleet.course !== undefined) {
      // Routed fleets spend speed along the path. A space stop stays in transit.
      const moved = advanceCourseFleet(fleet);
      if (moved.arrived) {
        arrived.push(moved.fleet);
      } else {
        inTransit.push(moved.fleet);
      }
      continue;
    }
    // Transit advances in round-sized ticks (triggered by turnEngine on round wrap).
    // Arrived fleets are resolved immediately by turnEngine after this call.
    const turnsRemaining = fleet.turnsRemaining - 1;
    if (turnsRemaining <= 0) {
      arrived.push({ ...fleet, turnsRemaining: 0 });
    } else {
      inTransit.push({ ...fleet, turnsRemaining });
    }
  }

  return { inTransit: mergeHoldingFleets(inTransit), arrived };
}
