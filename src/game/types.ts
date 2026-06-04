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
 * A notable event emitted during turn resolution for the turn report UI.
 */
export type TurnEvent =
  | {
      kind: 'fleet_arrived';
      planetName: string;
      planetId?: string;
      attackerName: string;
      shipCount: number;
      roundNumber?: number;
    }
  | {
      kind: 'combat';
      planetName: string;
      planetId?: string;
      attackerName: string;
      defenderName: string;
      attackerWon: boolean;
      attackerLost: number;
      defenderLost: number;
      attackerShipsBefore: number;
      defenderShipsBefore: number;
      remainingShips: number;
      isHomePlanetConquest?: boolean;
      roundNumber?: number;
    }
  | {
      kind: 'multiway_combat';
      planetName: string;
      planetId?: string;
      participants: Array<{
        name: string;
        ownerId: OwnerId;
        shipsBefore: number;
        survived: boolean;
      }>;
      winnerName: string;
      winnerId: OwnerId;
      remainingShips: number;
      roundNumber?: number;
      isHomePlanetConquest?: true;
    }
  | { kind: 'research_levelup'; playerName: string; newLevel: number }
  | {
      kind: 'build_complete';
      planetName: string;
      planetId?: string;
      buildingType: 'factory' | 'researchLab';
    }
  | {
      kind: 'troop_produced';
      planetName: string;
      planetId?: string;
      ownerName: string;
      troopsAdded: number;
    };

/**
 * How a match is played: shared device (pass-and-play) or async across devices.
 */
export type PlayMode = 'passAndPlay' | 'asyncMultiplayer';

export type GalaxyShape = 'scattered' | 'dense_core' | 'ring' | 'cluster' | 'spiral';

export type MapSize = 'small' | 'medium' | 'large';

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
 * What an AI player last observed about a specific planet.
 * Stale when lastSeenRound < currentRound and the planet is outside observation range.
 */
export interface AiPlanetMemory {
  lastSeenRound: number;
  lastSeenOwner: OwnerId;
  lastSeenShipCount: number;
  /** True once the AI has ever observed this planet. False = unexplored (position known, details unknown). */
  isExplored: boolean;
}

/**
 * Persistent brain state for a single AI player.
 * Stored inside GameState so it serialises with state_json when the backend is added.
 */
export interface AiPlayerState {
  /** Keyed by planet id. Entries for unexplored planets may be absent. */
  planetMemory: Record<string, AiPlanetMemory>;
  /** Planet ids of enemy home planets that have been confirmed through observation. */
  knownEnemyHomePlanetIds: string[];
  /** Current strategic focus — transitions happen inside computeAiTurn. */
  strategicPhase: 'expand' | 'build' | 'strike' | 'defend';
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
  /** Persistent fog-of-war brain state for each AI player. Keyed by player id. */
  aiStates?: Record<string, AiPlayerState>;
}
