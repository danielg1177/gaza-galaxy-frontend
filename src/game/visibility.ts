import { computeClickDistance, effectiveSpeed, fleetMapPosition } from './movementEngine';
import type { Fleet, GameState, Planet, Position, VisibilityMode } from './types';

/** Missing or unknown values play as the original rules. */
export function normalizeVisibility(value: string | undefined | null): VisibilityMode {
  return value === 'fog' ? 'fog' : 'classic';
}

/** Fog never reveals farther than this, even when fleet speed is higher. */
export const MAX_VISIBILITY_CLICKS = 15;

/**
 * How far Fog can see from an owned planet.
 * Matches one turn of fleet speed (`5 + tech level` clicks) and stops at 15.
 */
export function oneTurnReachClicks(techLevel: number): number {
  return Math.min(MAX_VISIBILITY_CLICKS, effectiveSpeed(techLevel));
}

export function isWithinOneTurn(from: Position, to: Position, reachClicks: number): boolean {
  return computeClickDistance(from, to) <= reachClicks;
}

/** Current position of an in-flight fleet, in the same click coordinates as planets. */
export function fleetClickPosition(fleet: Fleet, planets: Planet[]): Position | null {
  return fleetMapPosition(fleet, planets);
}

function fleetStillAtLaunchOrigin(fleet: Fleet): boolean {
  if (fleet.holding === true) {
    return false;
  }
  if (fleet.course !== undefined) {
    return (
      fleet.course.distanceTraveled <= 1e-6 &&
      fleet.course.vertices[0]?.planetId === fleet.originPlanetId
    );
  }
  return fleet.turnsRemaining === fleet.totalTurns;
}

export type PlanetSight = 'classic' | 'owned' | 'scouted' | 'hidden';

/**
 * What the viewing player is allowed to know about this planet.
 * `classic` means the original fog rules (class is public; garrison is not).
 */
export function classifyPlanetSight(
  state: GameState,
  viewingPlayerId: string,
  planet: Planet,
): PlanetSight {
  if (normalizeVisibility(state.visibility) !== 'fog') {
    return 'classic';
  }
  if (planet.owner === viewingPlayerId) {
    return 'owned';
  }
  const viewer = state.players.find((player) => player.id === viewingPlayerId);
  const reach = oneTurnReachClicks(viewer?.techLevel ?? 0);
  const owned = state.map.planets.filter((candidate) => candidate.owner === viewingPlayerId);
  const scouted = owned.some((ownedPlanet) =>
    isWithinOneTurn(ownedPlanet.position, planet.position, reach),
  );
  return scouted ? 'scouted' : 'hidden';
}

/**
 * Ships another player sent during this round and that have not moved yet.
 * A launch sets `turnsRemaining === totalTurns`, so the fleet is still on the
 * origin. Transit only advances when the round number advances, so later seats
 * would otherwise see the garrison drop before earlier seats could.
 */
export function concealSameRoundDepartures(state: GameState, viewingPlayerId: string): GameState {
  const hidden = state.fleets.filter(
    (fleet) =>
      fleet.ownerId !== viewingPlayerId &&
      fleet.dispatchedInRound === state.roundNumber &&
      fleetStillAtLaunchOrigin(fleet),
  );
  if (hidden.length === 0) {
    return state;
  }

  const departedByOrigin = new Map<string, number>();
  for (const fleet of hidden) {
    departedByOrigin.set(
      fleet.originPlanetId,
      (departedByOrigin.get(fleet.originPlanetId) ?? 0) + fleet.shipCount,
    );
  }
  const hiddenIds = new Set(hidden.map((fleet) => fleet.id));

  return {
    ...state,
    map: {
      ...state.map,
      planets: state.map.planets.map((planet) => {
        const departed = departedByOrigin.get(planet.id);
        if (departed === undefined || planet.owner === viewingPlayerId) {
          return planet;
        }
        return { ...planet, shipCount: planet.shipCount + departed };
      }),
    },
    fleets: state.fleets.filter((fleet) => !hiddenIds.has(fleet.id)),
  };
}

function visibleSchedules(state: GameState, viewingPlayerId: string) {
  return (state.scheduledMovements ?? []).filter((movement) => {
    if (movement.ownerId !== viewingPlayerId) {
      return false;
    }
    const origin = state.map.planets.find((planet) => planet.id === movement.fromPlanetId);
    return origin !== undefined && origin.owner === viewingPlayerId;
  });
}

/** A multiplier is a secret until the viewer owns the planet. */
function withoutOutputMultiplier(planet: Planet): Planet {
  if (planet.outputMultiplier === undefined) return planet;
  const { outputMultiplier: _multiplier, ...rest } = planet;
  return rest;
}

function concealEconomy(planet: Planet): Planet {
  return {
    ...withoutOutputMultiplier(planet),
    buildings: [],
    buildingSlots: 0,
    troopAccumulator: 0,
    productionSlider: 0.5,
    isHomePlanet: false,
  };
}

/**
 * Client-side view of a match for one player.
 * Does not mutate `state`. Authoritative saves must keep using the unfiltered game.
 */
export function applyVisibility(state: GameState, viewingPlayerId: string): GameState {
  const scheduledMovements = visibleSchedules(state, viewingPlayerId);

  if (normalizeVisibility(state.visibility) !== 'fog') {
    return {
      ...state,
      map: {
        ...state.map,
        planets: state.map.planets.map((planet) => {
          if (planet.owner === viewingPlayerId) {
            return planet;
          }
          return {
            ...withoutOutputMultiplier(planet),
            shipCount: 0,
            buildings: [],
            troopAccumulator: 0,
            productionSlider: 0.5,
          };
        }),
      },
      fleets: state.fleets.filter((fleet) => fleet.ownerId === viewingPlayerId),
      scheduledMovements,
    };
  }

  const concealed = concealSameRoundDepartures(state, viewingPlayerId);
  const viewer = concealed.players.find((player) => player.id === viewingPlayerId);
  const reach = oneTurnReachClicks(viewer?.techLevel ?? 0);
  const owned = concealed.map.planets.filter((planet) => planet.owner === viewingPlayerId);
  const inSight = (position: Position) =>
    owned.some((ownedPlanet) => isWithinOneTurn(ownedPlanet.position, position, reach));

  return {
    ...concealed,
    map: {
      ...concealed.map,
      planets: concealed.map.planets.map((planet) => {
        if (planet.owner === viewingPlayerId) {
          return planet;
        }
        if (!inSight(planet.position)) {
          return {
            ...concealEconomy(planet),
            fogSight: 'hidden',
            owner: 'neutral',
            shipCount: 0,
          };
        }
        return {
          ...concealEconomy(planet),
          fogSight: 'scouted',
        };
      }),
    },
    fleets: concealed.fleets.filter((fleet) => {
      if (fleet.ownerId === viewingPlayerId) {
        return true;
      }
      const position = fleetClickPosition(fleet, concealed.map.planets);
      return position !== null && inSight(position);
    }),
    scheduledMovements,
  };
}
