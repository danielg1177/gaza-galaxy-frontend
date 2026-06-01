import {
  computeAiTurn,
  generateAiName,
  updateAiObservation,
  type AiDifficulty,
} from '../game/aiEngine';
import {
  FACTORY_GOLD_COST,
  RESEARCH_LAB_GOLD_COST,
  STARTING_GOLD,
} from '../game/productionEngine';
import { generateMap } from '../game/mapGenerator';
import { HOME_PLANET_CLASS_CONFIG, placeSpawns } from '../game/spawnPlacer';
import {
  resolveTurn,
  advanceToNextNonEliminatedPlayer,
  type PlayerAction,
  type ResolveTurnResult,
  type TurnInput,
} from '../game/turnEngine';
import type {
  AiPlayerState,
  BuildingType,
  GameMap,
  GameState,
  MapSize,
  Planet,
  PlayMode,
  Player,
  TurnEvent,
} from '../game/types';
import { useMemo } from 'react';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCAL_GAMES_STORAGE_KEY } from '../constants/app';
import { ensureStorageMigrated } from '../utils/migrateStorage';
import type { ApiGameDetail } from '../services/gamesService';
import { ApiError } from '../services/apiClient';
import { submitTurn } from '../services/gamesService';

export interface PlayerSlot {
  type: 'human' | 'ai';
  /** Optional display name for human slots. */
  name?: string;
  /** Async multiplayer human invite target; undefined for AI, pass-and-play, or unassigned slots. */
  userId?: number;
  /** Only relevant when type === 'ai'. */
  difficulty?: AiDifficulty;
}

export interface GameConfig {
  playerName: string;
  /** User-chosen campaign title shown on the Command Center. */
  gameName?: string;
  /** Length 2–8; slot 0 is always the local human player. */
  playerSlots: PlayerSlot[];
  mapSize: MapSize;
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
  /** Backend game id when loaded from the async multiplayer API. */
  asyncGameId?: number;
  /** Un-dismissed battle report events; persisted for local games until modal close. */
  pendingTurnReport?: TurnEvent[];
  pendingTurnReportAcknowledged?: boolean;
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
  _hasHydrated: boolean;
  activeGameId: string | null;
  selectedPlanetId: string | null;
  pendingFleet: PendingFleet | null;
  queuedOrders: PendingFleet[];
  showingLockScreen: boolean;
  turnReport: TurnEvent[];
  /** Per-player archive of combat events not yet shown to that player. Populated at endTurn; cleared when the player starts their next turn (at their own endTurn call). */
  playerBattleArchiveByPlayerId: Record<string, TurnEvent[]>;
  /** Per-player turn report (research, landings, builds) for the ⋮ Report modal. Cleared for the outgoing player at each endTurn. */
  playerTurnReportByPlayerId: Record<string, TurnEvent[]>;
  /** Pass-and-play: eliminated human must see knockout battle report before turn advances. */
  eliminatedPlayerPendingKnockout: boolean;
  /** Human players knocked out on their own round-wrap endTurn; farewell shown at next natural turn slot. */
  pendingFarewellPlayerIds: string[];
  /** True while async turn submission API call is in flight. */
  isSubmittingTurn: boolean;
  /** Set after successful async turn submit; GameScreen navigates home then clears. */
  shouldReturnHome: boolean;
  /** Session preference: pause after each AI turn to review moves before advancing. */
  aiObserverMode: boolean;
  showingAiObserver: boolean;
  pendingAiTurnInput: TurnInput | null;
  pendingAiPlayerId: string | null;
  startNewGame: (config: GameConfig) => void;
  loadGame: (id: string) => void;
  loadAsyncGame: (detail: ApiGameDetail) => void;
  deleteGame: (id: string) => void;
  getActiveRecord: () => GameRecord | null;
  selectPlanet: (planetId: string | null) => void;
  setPendingFleet: (fleet: PendingFleet | null) => void;
  confirmPendingFleet: () => void;
  queueOrder: (order: PendingFleet) => void;
  cancelQueuedOrder: (index: number) => void;
  updateQueuedOrder: (index: number, shipCount: number) => void;
  queueBuildOrder: (planetId: string, buildingType: BuildingType) => QueueBuildOrderResult;
  cancelBuildOrder: (planetId: string, buildingIndex: number) => void;
  demolishBuilding: (planetId: string, buildingIndex: number) => void;
  setProductionSlider: (planetId: string, value: number) => void;
  endTurn: () => void;
  advanceStagedAiTurn: () => void;
  acknowledgeKnockout: () => void;
  dismissLockScreen: () => void;
  resetGame: () => void;
  clearReturnHome: () => void;
  clearPendingTurnReport: () => void;
  setAiObserverMode: (value: boolean) => void;
  clearAiObserver: () => void;
  isAsyncGame: () => boolean;
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

function drainStaleFleets(state: GameState): GameState {
  if (!state.fleets.some((fleet) => fleet.turnsRemaining <= 0)) {
    return state;
  }
  return {
    ...state,
    // drain stale turnsRemaining=0 fleets that may have persisted before the fix
    fleets: state.fleets.filter((fleet) => fleet.turnsRemaining > 0),
  };
}

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
      player.difficulty = 'hard';
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

function visibleStateForRecord(
  record: GameRecord | null,
  overrideViewerId?: string | null,
): GameState | null {
  if (record === null) {
    return null;
  }
  const gameState = record.state;
  const viewingPlayerId =
    overrideViewerId != null ? overrideViewerId : getLocalHumanPlayerId(gameState);
  if (viewingPlayerId === undefined) {
    return gameState;
  }
  return buildVisibleState(gameState, viewingPlayerId);
}

function stripTurnEvents(result: ResolveTurnResult): GameState {
  const { events: _events, ...state } = result;
  return state;
}

function runAiTurnsUntilHuman(result: ResolveTurnResult): {
  state: GameState;
  events: TurnEvent[];
} {
  let allEvents = [...result.events];
  let current = stripTurnEvents(result);
  while (current.status === 'active') {
    const currentPlayer = current.players.find((p) => p.id === current.currentPlayerId);
    if (currentPlayer === undefined || !currentPlayer.isAI || currentPlayer.isEliminated) {
      break;
    }
    const aiResult = resolveTurn(current, computeAiTurn(current, current.currentPlayerId));
    allEvents = allEvents.concat(aiResult.events);
    current = stripTurnEvents(aiResult);
  }
  return { state: current, events: allEvents };
}

function findNewlyEliminatedHumanIds(
  events: TurnEvent[],
  players: Player[],
): string[] {
  const ids: string[] = [];
  for (const event of events) {
    if (event.kind !== 'combat' || event.isHomePlanetConquest !== true) {
      continue;
    }
    const defender = players.find(
      (player) => !player.isAI && player.name === event.defenderName && player.isEliminated,
    );
    if (defender !== undefined && !ids.includes(defender.id)) {
      ids.push(defender.id);
    }
  }
  return ids;
}

function findFarewellInPath(
  fromId: string,
  toId: string,
  players: Player[],
  farewellIds: string[],
): string | null {
  if (farewellIds.length === 0) return null;
  const fromIndex = players.findIndex((p) => p.id === fromId);
  if (fromIndex === -1) return null;
  for (let offset = 1; offset <= players.length; offset++) {
    const candidate = players[(fromIndex + offset) % players.length];
    if (candidate.id === toId) break;
    if (farewellIds.includes(candidate.id)) return candidate.id;
  }
  return null;
}

/**
 * Generates the initial GameState for a given config without touching the store.
 * Used both by startNewGame (local pass-and-play) and by the async game creation
 * flow to produce a state_json that is sent to the backend.
 */
export function generateInitialGameState(config: GameConfig, seed: number): GameState {
  const playerCount = config.playerSlots.length;
  const playerIds = createPlayerIds(playerCount);
  const map = generateMap({
    seed,
    width: config.mapWidth,
    height: config.mapHeight,
    planetCount: config.planetCount,
    playerCount,
  });
  const humanPlayerIds: string[] = [];
  const aiPlayerIds: string[] = [];
  config.playerSlots.forEach((slot, index) => {
    if (slot.type === 'human') {
      humanPlayerIds.push(playerIds[index]);
    } else {
      aiPlayerIds.push(playerIds[index]);
    }
  });
  const { map: mapWithSpawns, homePlanetClassByPlayerId } = placeSpawns({
    map,
    humanPlayerIds,
    aiPlayerIds,
    mapSize: config.mapSize,
    rng: mulberry32(seed + 1),
  });
  const aiNameRng = mulberry32(seed + 2);
  const players = buildPlayers(
    mapWithSpawns,
    playerIds,
    homePlanetClassByPlayerId,
    config,
    aiNameRng,
  );
  const initialAiStates: Record<string, AiPlayerState> = {};
  const baseState: GameState = {
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
  for (const player of players) {
    if (player.isAI) {
      initialAiStates[player.id] = updateAiObservation(baseState, player.id, undefined);
    }
  }
  return { ...baseState, aiStates: initialAiStates };
}

function buildPlayerReports(
  events: TurnEvent[],
  players: Player[],
  planets?: Planet[],
): {
  archive: Record<string, TurnEvent[]>;
  turnReport: Record<string, TurnEvent[]>;
} {
  const archive: Record<string, TurnEvent[]> = {};
  const report: Record<string, TurnEvent[]> = {};
  for (const event of events) {
    if (event.kind === 'combat' || event.kind === 'multiway_combat') {
      for (const player of players) {
        if (player.isAI) continue;
        const involved =
          event.kind === 'combat'
            ? event.attackerName === player.name || event.defenderName === player.name
            : event.participants.some((p) => p.name === player.name);
        if (involved) {
          (archive[player.id] ??= []).push(event);
          (report[player.id] ??= []).push(event);
        }
      }
      continue;
    }
    if (event.kind === 'fleet_arrived') {
      const owner = players.find((p) => !p.isAI && p.name === event.attackerName);
      if (owner) (report[owner.id] ??= []).push(event);
      continue;
    }
    if (event.kind === 'research_levelup') {
      const owner = players.find((p) => !p.isAI && p.name === event.playerName);
      if (owner) (report[owner.id] ??= []).push(event);
      continue;
    }
    if (event.kind === 'build_complete') {
      const planet = planets?.find((pl) =>
        event.planetId !== undefined ? pl.id === event.planetId : pl.name === event.planetName,
      );
      if (planet) {
        const owner = players.find((p) => !p.isAI && p.id === planet.owner);
        if (owner) (report[owner.id] ??= []).push(event);
      }
      continue;
    }
    // troop_produced: informational only, no archive or report entry
  }
  return { archive, turnReport: report };
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
  games: [],
  _hasHydrated: false,
  activeGameId: null,
  selectedPlanetId: null,
  pendingFleet: null,
  queuedOrders: [],
  showingLockScreen: false,
  turnReport: [],
  playerBattleArchiveByPlayerId: {},
  playerTurnReportByPlayerId: {},
  eliminatedPlayerPendingKnockout: false,
  pendingFarewellPlayerIds: [],
  isSubmittingTurn: false,
  shouldReturnHome: false,
  aiObserverMode: false,
  showingAiObserver: false,
  pendingAiTurnInput: null,
  pendingAiPlayerId: null,

  startNewGame: (config) => {
    const seed = Date.now();
    const state = generateInitialGameState(config, seed);
    const id = seed.toString();
    const name =
      config.gameName?.trim() ||
      `${config.playerName.trim() || 'Commander'}'s Campaign`;
    const record: GameRecord = { id, name, state, config };
    set({
      games: [...get().games, record],
      activeGameId: id,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders: [],
      showingLockScreen: false,
      turnReport: [],
      playerBattleArchiveByPlayerId: {},
      playerTurnReportByPlayerId: {},
      eliminatedPlayerPendingKnockout: false,
      pendingFarewellPlayerIds: [],
      isSubmittingTurn: false,
      shouldReturnHome: false,
    });
  },

  loadGame: (id) => {
    const record = get().games.find((g) => g.id === id);
    const pending = record?.pendingTurnReport;
    const hasPending = pending !== undefined && pending.length > 0;
    let restoredArchive: Record<string, TurnEvent[]> = {};
    let restoredTurnReport: Record<string, TurnEvent[]> = {};
    if (hasPending && record !== undefined) {
      const { archive, turnReport } = buildPlayerReports(
        pending,
        record.state.players,
        record.state.map.planets,
      );
      restoredArchive = archive;
      restoredTurnReport = turnReport;
    }
    set({
      activeGameId: id,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders: [],
      showingLockScreen: hasPending && !record?.pendingTurnReportAcknowledged,
      turnReport: pending ?? [],
      games: get().games.map((g) => {
        if (g.id !== id) return g;
        return { ...g, state: drainStaleFleets(g.state) };
      }),
      playerBattleArchiveByPlayerId: restoredArchive,
      playerTurnReportByPlayerId: restoredTurnReport,
      eliminatedPlayerPendingKnockout: false,
      pendingFarewellPlayerIds: [],
      isSubmittingTurn: false,
      shouldReturnHome: false,
    });
  },

  loadAsyncGame: (detail) => {
    const inProgress = detail.inProgressActions;
    const hasMidTurnSave =
      inProgress != null &&
      inProgress.partialStateJson != null &&
      inProgress.partialStateJson.length > 0;

    let state: GameState;
    let queuedOrders: PendingFleet[];

    if (hasMidTurnSave) {
      state = JSON.parse(inProgress.partialStateJson) as GameState;
      queuedOrders = inProgress.queuedOrders.map((order) => ({
        fromPlanetId: order.fromPlanetId,
        toPlanetId: order.toPlanetId,
        shipCount: order.shipCount,
      }));
    } else {
      state = JSON.parse(detail.stateJson) as GameState;
      queuedOrders = [];
    }
    state = drainStaleFleets({ ...state, playMode: 'asyncMultiplayer' });

    const recordId = String(detail.id);
    const record: GameRecord = {
      id: recordId,
      name: detail.name,
      asyncGameId: detail.id,
      state,
      config: {
        playMode: 'asyncMultiplayer',
        playerName: '',
        playerSlots: [],
        mapSize: 'medium',
        mapWidth: state.map.width,
        mapHeight: state.map.height,
        planetCount: state.map.planets.length,
      },
    };
    const { games } = get();
    const existingIndex = games.findIndex((g) => g.id === recordId);
    const nextGames =
      existingIndex >= 0
        ? games.map((g, i) => (i === existingIndex ? record : g))
        : [...games, record];

    const hasEvents = detail.isMyTurn && (detail.latestEvents?.length ?? 0) > 0;
    const asyncReports = hasEvents
      ? buildPlayerReports(detail.latestEvents!, state.players, state.map.planets)
      : null;

    set({
      games: nextGames,
      activeGameId: recordId,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders,
      showingLockScreen: false,
      turnReport: detail.isMyTurn ? (detail.latestEvents ?? []) : [],
      playerBattleArchiveByPlayerId: asyncReports?.archive ?? {},
      playerTurnReportByPlayerId: asyncReports?.turnReport ?? {},
      eliminatedPlayerPendingKnockout: false,
      pendingFarewellPlayerIds: [],
      isSubmittingTurn: false,
      shouldReturnHome: false,
    });
  },

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

  updateQueuedOrder: (index, shipCount) => {
    const { queuedOrders } = get();
    if (index < 0 || index >= queuedOrders.length) {
      return;
    }
    set({
      queuedOrders: queuedOrders.map((o, i) =>
        i === index ? { ...o, shipCount } : o,
      ),
    });
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
    const preTurnNumber = gameState.turnNumber;
    const preRoundNumber = gameState.roundNumber;
    const humanPlayer = gameState.players.find(
      (p) => p.id === gameState.currentPlayerId && !p.isAI,
    );
    if (humanPlayer === undefined) {
      return;
    }
    const { queuedOrders: queuedOrdersSnapshot } = get();
    const asyncGameId = record.asyncGameId;
    const isAsync = asyncGameId != null;
    const input = {
      actions: [
        ...queuedOrdersSnapshot.map((o) => ({
          type: 'SEND_FLEET' as const,
          fromPlanetId: o.fromPlanetId,
          toPlanetId: o.toPlanetId,
          shipCount: o.shipCount,
        })),
        { type: 'END_TURN' as const },
      ],
      playerId: humanPlayer.id,
    };
    const humanResult = resolveTurn(gameState, input);
    if (get().aiObserverMode) {
      const resolvedState = stripTurnEvents(humanResult);
      const nextPlayer = resolvedState.players.find(
        (p) => p.id === resolvedState.currentPlayerId,
      );
      if (
        nextPlayer !== undefined &&
        nextPlayer.isAI &&
        !nextPlayer.isEliminated
      ) {
        const aiInput = computeAiTurn(resolvedState, resolvedState.currentPlayerId);
        set({
          games: get().games.map((g) =>
            g.id === record.id ? { ...g, state: resolvedState } : g,
          ),
          showingAiObserver: true,
          pendingAiTurnInput: aiInput,
          pendingAiPlayerId: resolvedState.currentPlayerId,
          showingLockScreen: false,
          queuedOrders: aiInput.actions
            .filter(
              (a): a is Extract<PlayerAction, { type: 'SEND_FLEET' }> =>
                a.type === 'SEND_FLEET',
            )
            .map((a) => ({
              fromPlanetId: a.fromPlanetId,
              toPlanetId: a.toPlanetId,
              shipCount: a.shipCount,
            })),
        });
        return;
      }
    }
    const { state: nextState, events } = runAiTurnsUntilHuman(humanResult);

    const outgoingPlayerId = gameState.currentPlayerId;
    const knockoutHumanIds = findNewlyEliminatedHumanIds(events, nextState.players);
    // Players knocked out DURING their own endTurn (round wrap they triggered) need
    // a deferred farewell — showing it immediately would mean they see it right after
    // they end their own turn, before any other player goes.
    const deferredKnockouts = knockoutHumanIds.filter((id) => id === outgoingPlayerId);
    const immediateKnockouts = knockoutHumanIds.filter((id) => id !== outgoingPlayerId);
    let newPendingFarewellIds = [...get().pendingFarewellPlayerIds, ...deferredKnockouts];
    let finalState = nextState;
    let pendingKnockout = false;
    if (nextState.playMode === 'passAndPlay' && nextState.status === 'active') {
      // Check if any deferred farewell player's position falls between the outgoing
      // player and the next active player in the turn order
      const farewellInPath = findFarewellInPath(
        outgoingPlayerId,
        nextState.currentPlayerId,
        nextState.players,
        newPendingFarewellIds,
      );
      if (farewellInPath !== null) {
        finalState = { ...nextState, currentPlayerId: farewellInPath };
        pendingKnockout = true;
        newPendingFarewellIds = newPendingFarewellIds.filter((id) => id !== farewellInPath);
      } else if (immediateKnockouts.length > 0) {
        finalState = { ...nextState, currentPlayerId: immediateKnockouts[0] };
        pendingKnockout = true;
      }
    }

    const showLock =
      finalState.playMode === 'passAndPlay' && finalState.status === 'active';
    const newArchive = { ...get().playerBattleArchiveByPlayerId };
    delete newArchive[humanPlayer.id];
    const newTurnReport = { ...get().playerTurnReportByPlayerId };
    delete newTurnReport[humanPlayer.id];
    const { archive: builtArchive, turnReport: builtTurnReport } =
      buildPlayerReports(events, finalState.players, finalState.map.planets);
    for (const [playerId, playerEvents] of Object.entries(builtArchive)) {
      const existing = newArchive[playerId];
      if (existing === undefined) {
        newArchive[playerId] = playerEvents;
      } else {
        existing.push(...playerEvents);
      }
    }
    for (const [playerId, playerEvents] of Object.entries(builtTurnReport)) {
      const existing = newTurnReport[playerId];
      if (existing === undefined) {
        newTurnReport[playerId] = playerEvents;
      } else {
        existing.push(...playerEvents);
      }
    }
    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: finalState,
              pendingTurnReport: events,
              pendingTurnReportAcknowledged: false,
            }
          : g,
      ),
      queuedOrders: [],
      selectedPlanetId: null,
      turnReport: events,
      playerBattleArchiveByPlayerId: newArchive,
      playerTurnReportByPlayerId: newTurnReport,
      eliminatedPlayerPendingKnockout: pendingKnockout,
      pendingFarewellPlayerIds: newPendingFarewellIds,
      ...(showLock ? { showingLockScreen: true } : {}),
    });

    if (!isAsync || !asyncGameId) {
      return;
    }

    const submitActions = queuedOrdersSnapshot.map((o) => ({
      type: 'SEND_FLEET' as const,
      fromPlanetId: o.fromPlanetId,
      toPlanetId: o.toPlanetId,
      shipCount: o.shipCount,
    }));

    set({ isSubmittingTurn: true });

    void (async () => {
      try {
        await submitTurn(asyncGameId, {
          actions: submitActions,
          resultingState: finalState,
          turnNumber: preTurnNumber,
          roundNumber: preRoundNumber,
          events,
        });
        get().resetGame();
        set({ isSubmittingTurn: false, shouldReturnHome: true });
      } catch (err) {
        const alertBody =
          err instanceof ApiError
            ? `Server returned ${err.status}: ${err.message}`
            : 'Could not submit your turn. You have been returned to the lobby.';
        Alert.alert('Submit Failed', alertBody);
        set({ isSubmittingTurn: false, shouldReturnHome: true });
      }
    })();
  },

  advanceStagedAiTurn: () => {
    const { pendingAiTurnInput, pendingAiPlayerId } = get();
    if (pendingAiTurnInput === null) {
      return;
    }
    const record = get().getActiveRecord();
    if (record === null) {
      return;
    }
    const gameState = record.state;
    const aiResult = resolveTurn(gameState, pendingAiTurnInput);
    const nextState = stripTurnEvents(aiResult);
    const outgoingPlayerId = pendingAiPlayerId ?? gameState.currentPlayerId;

    const currentPlayer = nextState.players.find(
      (p) => p.id === nextState.currentPlayerId,
    );
    if (
      currentPlayer !== undefined &&
      currentPlayer.isAI &&
      !currentPlayer.isEliminated &&
      get().aiObserverMode
    ) {
      const nextInput = computeAiTurn(nextState, nextState.currentPlayerId);
      set({
        games: get().games.map((g) =>
          g.id === record.id ? { ...g, state: nextState } : g,
        ),
        pendingAiTurnInput: nextInput,
        pendingAiPlayerId: nextState.currentPlayerId,
        queuedOrders: nextInput.actions
          .filter(
            (a): a is Extract<PlayerAction, { type: 'SEND_FLEET' }> =>
              a.type === 'SEND_FLEET',
          )
          .map((a) => ({
            fromPlanetId: a.fromPlanetId,
            toPlanetId: a.toPlanetId,
            shipCount: a.shipCount,
          })),
      });
      return;
    }

    get().clearAiObserver();

    const knockoutHumanIds = findNewlyEliminatedHumanIds(
      aiResult.events,
      nextState.players,
    );
    const deferredKnockouts = knockoutHumanIds.filter(
      (id) => id === outgoingPlayerId,
    );
    const immediateKnockouts = knockoutHumanIds.filter(
      (id) => id !== outgoingPlayerId,
    );
    let newPendingFarewellIds = [
      ...get().pendingFarewellPlayerIds,
      ...deferredKnockouts,
    ];
    let finalState = nextState;
    let pendingKnockout = false;
    if (nextState.playMode === 'passAndPlay' && nextState.status === 'active') {
      const farewellInPath = findFarewellInPath(
        outgoingPlayerId,
        nextState.currentPlayerId,
        nextState.players,
        newPendingFarewellIds,
      );
      if (farewellInPath !== null) {
        finalState = { ...nextState, currentPlayerId: farewellInPath };
        pendingKnockout = true;
        newPendingFarewellIds = newPendingFarewellIds.filter(
          (id) => id !== farewellInPath,
        );
      } else if (immediateKnockouts.length > 0) {
        finalState = { ...nextState, currentPlayerId: immediateKnockouts[0] };
        pendingKnockout = true;
      }
    }

    const showLock =
      finalState.playMode === 'passAndPlay' && finalState.status === 'active';
    set({
      games: get().games.map((g) =>
        g.id === record.id ? { ...g, state: finalState } : g,
      ),
      showingLockScreen: showLock,
      eliminatedPlayerPendingKnockout: pendingKnockout,
      pendingFarewellPlayerIds: newPendingFarewellIds,
    });
  },

  acknowledgeKnockout: () => {
    const record = get().getActiveRecord();
    if (record === null || !get().eliminatedPlayerPendingKnockout) {
      return;
    }
    const farewellPlayerId = record.state.currentPlayerId;
    let nextState = advanceToNextNonEliminatedPlayer(record.state);
    const { state: afterAi } = runAiTurnsUntilHuman({
      ...nextState,
      events: [],
    });
    nextState = afterAi;
    let newPendingFarewellIds = [...get().pendingFarewellPlayerIds];
    const farewellInPath = findFarewellInPath(
      farewellPlayerId,
      nextState.currentPlayerId,
      nextState.players,
      newPendingFarewellIds,
    );
    let pendingKnockout = false;
    if (
      farewellInPath !== null &&
      nextState.playMode === 'passAndPlay' &&
      nextState.status === 'active'
    ) {
      nextState = { ...nextState, currentPlayerId: farewellInPath };
      pendingKnockout = true;
      newPendingFarewellIds = newPendingFarewellIds.filter((id) => id !== farewellInPath);
    }
    const showLock =
      nextState.playMode === 'passAndPlay' && nextState.status === 'active';

    set({
      games: get().games.map((g) =>
        g.id === record.id ? { ...g, state: nextState } : g,
      ),
      eliminatedPlayerPendingKnockout: pendingKnockout,
      pendingFarewellPlayerIds: newPendingFarewellIds,
      ...(showLock ? { showingLockScreen: true } : {}),
    });
  },

  dismissLockScreen: () =>
    set({
      games: get().games.map((g) =>
        g.id === get().activeGameId
          ? { ...g, pendingTurnReportAcknowledged: true }
          : g,
      ),
      showingLockScreen: false,
    }),

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
      turnReport: [],
      playerBattleArchiveByPlayerId: {},
      playerTurnReportByPlayerId: {},
      eliminatedPlayerPendingKnockout: false,
      pendingFarewellPlayerIds: [],
      isSubmittingTurn: false,
      shouldReturnHome: false,
    });
  },

  clearReturnHome: () => set({ shouldReturnHome: false }),

  clearPendingTurnReport: () => {
    set({ turnReport: [] });
  },

  setAiObserverMode: (value) => set({ aiObserverMode: value }),

  clearAiObserver: () =>
    set({
      showingAiObserver: false,
      pendingAiTurnInput: null,
      pendingAiPlayerId: null,
      queuedOrders: [],
    }),

  isAsyncGame: () => {
    const record = get().getActiveRecord();
    return record?.asyncGameId != null;
  },

  getVisibleGameState: () => visibleStateForRecord(get().getActiveRecord()),
    }),
    {
      name: LOCAL_GAMES_STORAGE_KEY,
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          await ensureStorageMigrated();
          return AsyncStorage.getItem(name);
        },
        setItem: (name, value) => AsyncStorage.setItem(name, value),
        removeItem: (name) => AsyncStorage.removeItem(name),
      })),
      version: 1,
      partialize: (state) => ({
        games: state.games.filter((g) => !g.asyncGameId),
      }),
      onRehydrateStorage: () => () => {
        useGameStore.setState({ _hasHydrated: true });
      },
    },
  ),
);

/** Fog-of-war view for the active game; safe to use in React (stable snapshot). */
export function useVisibleGameState(): GameState | null {
  const activeRecord = useGameStore((s) => {
    const id = s.activeGameId;
    if (id === null) {
      return null;
    }
    return s.games.find((g) => g.id === id) ?? null;
  });
  const showingAiObserver = useGameStore((s) => s.showingAiObserver);
  const pendingAiPlayerId = useGameStore((s) => s.pendingAiPlayerId);
  return useMemo(
    () =>
      visibleStateForRecord(
        activeRecord,
        showingAiObserver ? pendingAiPlayerId : null,
      ),
    [activeRecord, showingAiObserver, pendingAiPlayerId],
  );
}
