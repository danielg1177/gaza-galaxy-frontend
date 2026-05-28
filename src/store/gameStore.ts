import {
  computeAiTurn,
  generateAiName,
  type AiDifficulty,
} from '../game/aiEngine';
import {
  FACTORY_GOLD_COST,
  RESEARCH_LAB_GOLD_COST,
  STARTING_GOLD,
} from '../game/productionEngine';
import { generateMap } from '../game/mapGenerator';
import { HOME_PLANET_CLASS_CONFIG, placeSpawns } from '../game/spawnPlacer';
import { resolveTurn } from '../game/turnEngine';
import type {
  BuildingType,
  GameMap,
  GameState,
  PlayMode,
  Player,
} from '../game/types';
import { useMemo } from 'react';
import { create } from 'zustand';

export interface PlayerSlot {
  type: 'human' | 'ai';
  /** Optional display name for human slots. */
  name?: string;
  /** Only relevant when type === 'ai'. */
  difficulty?: AiDifficulty;
}

export interface GameConfig {
  playerName: string;
  /** Length 2–8; slot 0 is always the local human player. */
  playerSlots: PlayerSlot[];
  mapWidth: number;
  mapHeight: number;
  planetCount: number;
  playMode: PlayMode;
}

export interface GameRecord {
  id: string;
  name: string;
  state: GameState;
  config: GameConfig;
}

export interface PendingFleet {
  fromPlanetId: string;
  toPlanetId: string;
  shipCount: number;
}

export type QueueBuildOrderResult =
  | 'ok'
  | 'insufficient_gold'
  | 'no_slots'
  | 'not_owner';

export interface GameStore {
  games: GameRecord[];
  activeGameId: string | null;
  selectedPlanetId: string | null;
  pendingFleet: PendingFleet | null;
  queuedOrders: PendingFleet[];
  showingLockScreen: boolean;
  startNewGame: (config: GameConfig) => void;
  loadGame: (id: string) => void;
  deleteGame: (id: string) => void;
  getActiveRecord: () => GameRecord | null;
  selectPlanet: (planetId: string | null) => void;
  setPendingFleet: (fleet: PendingFleet | null) => void;
  confirmPendingFleet: () => void;
  queueOrder: (order: PendingFleet) => void;
  cancelQueuedOrder: (index: number) => void;
  queueBuildOrder: (planetId: string, buildingType: BuildingType) => QueueBuildOrderResult;
  cancelBuildOrder: (planetId: string, buildingIndex: number) => void;
  demolishBuilding: (planetId: string, buildingIndex: number) => void;
  setProductionSlider: (planetId: string, value: number) => void;
  endTurn: () => void;
  dismissLockScreen: () => void;
  resetGame: () => void;
  getVisibleGameState: () => GameState | null;
}

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function createPlayerIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `player-${i}`);
}

function buildPlayers(
  map: GameMap,
  playerIds: string[],
  homePlanetClassByPlayerId: Record<string, string>,
  config: GameConfig,
  aiNameRng: () => number,
): Player[] {
  let humanCount = 0;
  const usedNames = new Set<string>();
  return playerIds.map((id, index) => {
    const homePlanet = map.planets.find((p) => p.owner === id && p.isHomePlanet);
    if (homePlanet === undefined) {
      throw new Error(`No home planet found for player ${id}`);
    }
    const slot = config.playerSlots[index];
    if (slot === undefined) {
      throw new Error(`Missing player slot for index ${index}`);
    }
    const isAI = slot.type === 'ai';
    const homePlanetClass = homePlanetClassByPlayerId[id];
    const homePlanetClassConfig = HOME_PLANET_CLASS_CONFIG[homePlanetClass];
    let name: string;
    if (isAI) {
      name = generateAiName(aiNameRng, usedNames);
    } else {
      humanCount += 1;
      name = slot.name?.trim() || `Player ${humanCount}`;
    }
    usedNames.add(name);
    const player: Player = {
      id,
      name,
      homePlanetId: homePlanet.id,
      techLevel: 0,
      gold: homePlanetClassConfig?.startingGold ?? STARTING_GOLD,
      researchPoints: 0,
      isEliminated: false,
      isAI,
    };
    if (isAI) {
      player.difficulty = slot.difficulty ?? 'normal';
    }
    return player;
  });
}

/** Fog/UI ownership: current human on their turn, otherwise the first human (e.g. during AI turns). */
export function getLocalHumanPlayerId(state: GameState): string | undefined {
  const current = state.players.find((p) => p.id === state.currentPlayerId);
  if (current !== undefined && !current.isAI) {
    return current.id;
  }
  return state.players.find((p) => !p.isAI)?.id;
}

function buildVisibleState(state: GameState, viewingPlayerId: string): GameState {
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
  };
}

function visibleStateForRecord(record: GameRecord | null): GameState | null {
  if (record === null) {
    return null;
  }
  const gameState = record.state;
  const viewingPlayerId = getLocalHumanPlayerId(gameState);
  if (viewingPlayerId === undefined) {
    return gameState;
  }
  return buildVisibleState(gameState, viewingPlayerId);
}

function runAiTurnsUntilHuman(state: GameState): GameState {
  let current = state;
  while (current.status === 'active') {
    const currentPlayer = current.players.find((p) => p.id === current.currentPlayerId);
    if (currentPlayer === undefined || !currentPlayer.isAI) {
      break;
    }
    current = resolveTurn(current, computeAiTurn(current, current.currentPlayerId));
  }
  return current;
}

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
  activeGameId: null,
  selectedPlanetId: null,
  pendingFleet: null,
  queuedOrders: [],
  showingLockScreen: false,

  startNewGame: (config) => {
    const seed = Date.now();
    const playerCount = config.playerSlots.length;
    const playerIds = createPlayerIds(playerCount);
    const map = generateMap({
      seed,
      width: config.mapWidth,
      height: config.mapHeight,
      planetCount: config.planetCount,
      playerCount,
    });
    const { map: mapWithSpawns, homePlanetClassByPlayerId } = placeSpawns(
      map,
      playerIds,
      mulberry32(seed + 1),
    );
    const aiNameRng = mulberry32(seed + 2);
    const players = buildPlayers(
      mapWithSpawns,
      playerIds,
      homePlanetClassByPlayerId,
      config,
      aiNameRng,
    );
    const state: GameState = {
      map: mapWithSpawns,
      players,
      fleets: [],
      turnNumber: 1,
      roundNumber: 1,
      currentPlayerId: players[0].id,
      seed,
      playMode: config.playMode,
      status: 'active',
      winnerId: null,
    };
    const id = Date.now().toString();
    const name = `Game ${get().games.length + 1}`;
    const record: GameRecord = { id, name, state, config };
    set({
      games: [...get().games, record],
      activeGameId: id,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders: [],
      showingLockScreen: false,
    });
  },

  loadGame: (id) =>
    set({
      activeGameId: id,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders: [],
      showingLockScreen: false,
    }),

  deleteGame: (id) => {
    const { games, activeGameId } = get();
    set({
      games: games.filter((g) => g.id !== id),
      activeGameId: activeGameId === id ? null : activeGameId,
    });
  },

  getActiveRecord: () => {
    const { games, activeGameId } = get();
    return games.find((g) => g.id === activeGameId) ?? null;
  },

  selectPlanet: (planetId) => set({ selectedPlanetId: planetId }),

  setPendingFleet: (fleet) => set({ pendingFleet: fleet }),

  confirmPendingFleet: () => {
    const { pendingFleet } = get();
    if (pendingFleet === null) {
      return;
    }
    get().queueOrder(pendingFleet);
    set({ pendingFleet: null });
  },

  queueOrder: (order) => {
    set({ queuedOrders: [...get().queuedOrders, order] });
  },

  cancelQueuedOrder: (index) => {
    const { queuedOrders } = get();
    if (index < 0 || index >= queuedOrders.length) {
      return;
    }
    set({ queuedOrders: queuedOrders.filter((_, i) => i !== index) });
  },

  queueBuildOrder: (planetId, buildingType) => {
    const record = get().getActiveRecord();
    if (record === null) {
      return 'not_owner';
    }
    const gameState = record.state;
    const currentPlayerId = gameState.currentPlayerId;
    const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
    const planet = gameState.map.planets.find((p) => p.id === planetId);
    if (currentPlayer === undefined || planet === undefined) {
      return 'not_owner';
    }
    if (planet.owner !== currentPlayerId) {
      return 'not_owner';
    }

    const cost =
      buildingType === 'factory' ? FACTORY_GOLD_COST : RESEARCH_LAB_GOLD_COST;
    const committedBuildings = planet.buildings.filter(
      (building) => building.builtOnRound < gameState.roundNumber,
    ).length;
    const queuedBuildsThisRound = planet.buildings.filter(
      (building) => building.builtOnRound === gameState.roundNumber,
    ).length;
    const usedSlots = committedBuildings + queuedBuildsThisRound;
    if (usedSlots >= planet.buildingSlots) {
      return 'no_slots';
    }
    if (currentPlayer.gold < cost) {
      return 'insufficient_gold';
    }

    const nextPlanets = gameState.map.planets.map((p) =>
      p.id === planetId
        ? {
            ...p,
            buildings: [
              ...p.buildings,
              { type: buildingType, builtOnRound: gameState.roundNumber },
            ],
          }
        : p,
    );
    const nextPlayers = gameState.players.map((player) =>
      player.id === currentPlayerId ? { ...player, gold: player.gold - cost } : player,
    );

    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: {
                ...g.state,
                players: nextPlayers,
                map: {
                  ...g.state.map,
                  planets: nextPlanets,
                },
              },
            }
          : g,
      ),
    });
    return 'ok';
  },

  cancelBuildOrder: (planetId, buildingIndex) => {
    const record = get().getActiveRecord();
    if (record === null) {
      return;
    }
    const gameState = record.state;
    const currentPlayerId = gameState.currentPlayerId;
    const planet = gameState.map.planets.find((p) => p.id === planetId);
    if (planet === undefined || planet.owner !== currentPlayerId) {
      return;
    }
    const building = planet.buildings[buildingIndex];
    if (building === undefined || building.builtOnRound !== gameState.roundNumber) {
      return;
    }

    const refund =
      building.type === 'factory' ? FACTORY_GOLD_COST : RESEARCH_LAB_GOLD_COST;
    const nextBuildings = planet.buildings.filter((_, i) => i !== buildingIndex);
    const nextPlanets = gameState.map.planets.map((p) =>
      p.id === planetId ? { ...p, buildings: nextBuildings } : p,
    );
    const nextPlayers = gameState.players.map((player) =>
      player.id === currentPlayerId ? { ...player, gold: player.gold + refund } : player,
    );
    const nextQueuedOrders = get().queuedOrders.filter((order) => {
      const queued = order as PendingFleet & {
        type?: string;
        planetId?: string;
        buildingType?: BuildingType;
      };
      return !(
        queued.type === 'BUILD' &&
        queued.planetId === planetId &&
        queued.buildingType === building.type
      );
    });

    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: {
                ...g.state,
                players: nextPlayers,
                map: {
                  ...g.state.map,
                  planets: nextPlanets,
                },
              },
            }
          : g,
      ),
      queuedOrders: nextQueuedOrders,
    });
  },

  demolishBuilding: (planetId, buildingIndex) => {
    const record = get().getActiveRecord();
    if (record === null) {
      return;
    }
    const gameState = record.state;
    const currentPlayerId = gameState.currentPlayerId;
    const planet = gameState.map.planets.find((p) => p.id === planetId);
    if (planet === undefined || planet.owner !== currentPlayerId) {
      return;
    }
    const building = planet.buildings[buildingIndex];
    if (building === undefined || building.builtOnRound >= gameState.roundNumber) {
      return;
    }

    const nextBuildings = planet.buildings.filter((_, i) => i !== buildingIndex);
    const nextPlanets = gameState.map.planets.map((p) =>
      p.id === planetId ? { ...p, buildings: nextBuildings } : p,
    );

    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: {
                ...g.state,
                map: {
                  ...g.state.map,
                  planets: nextPlanets,
                },
              },
            }
          : g,
      ),
    });
  },

  setProductionSlider: (planetId, value) => {
    const record = get().getActiveRecord();
    if (record === null) {
      return;
    }

    const gameState = record.state;
    const currentPlayerId = gameState.currentPlayerId;
    const planet = gameState.map.planets.find((p) => p.id === planetId);
    if (planet === undefined || planet.owner !== currentPlayerId) {
      return;
    }

    const clampedValue = Math.min(1, Math.max(0, value));
    const nextPlanets = gameState.map.planets.map((planet) =>
      planet.id === planetId
        ? {
            ...planet,
            productionSlider: clampedValue,
          }
        : planet,
    );

    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: {
                ...g.state,
                map: {
                  ...g.state.map,
                  planets: nextPlanets,
                },
              },
            }
          : g,
      ),
    });
  },

  endTurn: () => {
    const record = get().getActiveRecord();
    if (record === null || record.state.status !== 'active') {
      return;
    }
    const gameState = record.state;
    const humanPlayer = gameState.players.find((p) => !p.isAI);
    if (humanPlayer === undefined || gameState.currentPlayerId !== humanPlayer.id) {
      return;
    }
    const { queuedOrders } = get();
    const input = {
      actions: [
        ...queuedOrders.map((o) => ({
          type: 'SEND_FLEET' as const,
          fromPlanetId: o.fromPlanetId,
          toPlanetId: o.toPlanetId,
          shipCount: o.shipCount,
        })),
        { type: 'END_TURN' as const },
      ],
      playerId: humanPlayer.id,
    };
    const nextState = runAiTurnsUntilHuman(resolveTurn(gameState, input));
    const showLock =
      nextState.playMode === 'passAndPlay' && nextState.status === 'active';
    set({
      games: get().games.map((g) =>
        g.id === record.id ? { ...g, state: nextState } : g,
      ),
      queuedOrders: [],
      selectedPlanetId: null,
      ...(showLock ? { showingLockScreen: true } : {}),
    });
  },

  dismissLockScreen: () => set({ showingLockScreen: false }),

  resetGame: () => {
    const { activeGameId } = get();
    if (activeGameId !== null) {
      get().deleteGame(activeGameId);
    }
    set({
      activeGameId: null,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders: [],
      showingLockScreen: false,
    });
  },

  getVisibleGameState: () => visibleStateForRecord(get().getActiveRecord()),
}));

/** Fog-of-war view for the active game; safe to use in React (stable snapshot). */
export function useVisibleGameState(): GameState | null {
  const activeRecord = useGameStore((s) => {
    const id = s.activeGameId;
    if (id === null) {
      return null;
    }
    return s.games.find((g) => g.id === id) ?? null;
  });
  return useMemo(() => visibleStateForRecord(activeRecord), [activeRecord]);
}
