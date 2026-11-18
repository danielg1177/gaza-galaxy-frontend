import { computeClickDistance, effectiveSpeed } from './movementEngine';
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

function visibleSchedules(state: GameState, viewingPlayerId: string) {
  return (state.scheduledMovements ?? []).filter((movement) => {
    if (movement.ownerId !== viewingPlayerId) {
      return false;
    }
    const origin = state.map.planets.find((planet) => planet.id === movement.fromPlanetId);
    return origin !== undefined && origin.owner === viewingPlayerId;
  });
}

function concealEconomy(planet: Planet): Planet {
  return {
    ...planet,
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
            ...planet,
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

  const viewer = state.players.find((player) => player.id === viewingPlayerId);
  const reach = oneTurnReachClicks(viewer?.techLevel ?? 0);
  const owned = state.map.planets.filter((planet) => planet.owner === viewingPlayerId);
  const inSight = (position: Position) =>
    owned.some((ownedPlanet) => isWithinOneTurn(ownedPlanet.position, position, reach));

  return {
    ...state,
    map: {
      ...state.map,
      planets: state.map.planets.map((planet) => {
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
    fleets: state.fleets.filter((fleet) => {
      if (fleet.ownerId === viewingPlayerId) {
        return true;
      }
      const position = fleetClickPosition(fleet, state.map.planets);
      return position !== null && inSight(position);
    }),
    scheduledMovements,
  };
}
