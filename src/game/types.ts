import type { AiDifficulty } from './aiEngine';

/**
 * Letter grade for a planet's economic quality (A = best, P = weakest).
 * Higher classes yield more factory troop and gold output per factory.
 */
export type PlanetClass =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P';

/**
 * Kind of structure that can be built on a planet within building slots.
 */
export type BuildingType = 'factory' | 'researchLab';

/**
 * How a match is played: shared device (pass-and-play) or async across devices.
 */
export type PlayMode = 'passAndPlay' | 'asyncMultiplayer';

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
 * A single built structure on a planet.
 */
export interface Building {
  type: BuildingType;
  builtOnRound: number;
}

/**
 * A capturable world on the map with ownership, garrison, economy buildings, and optional home-planet status.
 */
export interface Planet {
  id: string;
  name: string;
  position: Position;
  class: PlanetClass;
  owner: OwnerId;
  shipCount: number;
  troopAccumulator: number;
  buildings: Building[];
  buildingSlots: number;
  productionSlider: number;
  isHomePlanet: boolean;
}

/**
 * Planet information as seen by a specific player (fog of war).
 * Non-own planets expose position, class, and name only; economy and garrison are hidden.
 */
export interface VisiblePlanet {
  id: string;
  position: Position;
  class: PlanetClass;
  name: string;
  isOwn: boolean;
  isHomePlanet: boolean;
  owner: OwnerId;
  shipCount: number | null;
  buildingSlots: number | null;
  buildings: Building[] | null;
  productionSlider: number | null;
  troopAccumulator: number | null;
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
  /** Total turns from dispatch to arrival (same value as turnsRemaining at creation). */
  totalTurns: number;
  dispatchedInRound: number;
}

/**
 * A participant in a match (human or AI) with economy, tech progress, and elimination state.
 */
export interface Player {
  id: string;
  name: string;
  homePlanetId: string;
  techLevel: number;
  gold: number;
  researchPoints: number;
  isEliminated: boolean;
  isAI: boolean;
  /** Only set for AI players. */
  difficulty?: AiDifficulty;
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
  roundNumber: number;
  currentPlayerId: string;
  seed: number;
  playMode: PlayMode;
  status: 'active' | 'finished';
  winnerId: string | null;
}
