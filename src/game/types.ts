/**
 * Letter grade for a planet's economic quality (A = best, E = weakest).
 * Higher classes produce ships and resources faster; class does not affect research speed.
 */
export type PlanetClass = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Kind of structure that can be built on a planet.
 * Manufacturing facilities drive ship/resource production; research facilities advance tech level.
 */
export type BuildingType = 'manufacturingFacility' | 'researchFacility';

/**
 * Identity of who controls a planet or fleet: a player id string, or `'neutral'` for unowned territory.
 */
export type OwnerId = string | 'neutral';

/**
 * Coordinates of a planet on the 2D galaxy map grid.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * A single built structure on a planet, identified by its kind and upgrade level.
 */
export interface Building {
  type: BuildingType;
  level: number;
}

/**
 * A capturable world on the map with ownership, garrison, economy buildings, and optional home-planet status.
 */
export interface Planet {
  id: string;
  position: Position;
  class: PlanetClass;
  owner: OwnerId;
  shipCount: number;
  buildings: Building[];
  isHomePlanet: boolean;
}

/**
 * A group of ships in transit from one planet toward another, owned by a single player.
 */
export interface Fleet {
  id: string;
  ownerId: OwnerId;
  shipCount: number;
  originPlanetId: string;
  destinationPlanetId: string;
  turnsRemaining: number;
}

/**
 * A participant in a match (human or AI) with economy, tech progress, and elimination state.
 */
export interface Player {
  id: string;
  name: string;
  homePlanetId: string;
  techLevel: number;
  resources: number;
  isEliminated: boolean;
  isAI: boolean;
}

/**
 * The spatial layout of a match: grid dimensions and all planets placed on it.
 */
export interface GameMap {
  width: number;
  height: number;
  planets: Planet[];
}

/**
 * Full authoritative snapshot of an in-progress or finished match.
 */
export interface GameState {
  map: GameMap;
  players: Player[];
  fleets: Fleet[];
  turnNumber: number;
  currentPlayerId: string;
  seed: number;
  status: 'active' | 'finished';
  winnerId: string | null;
}
