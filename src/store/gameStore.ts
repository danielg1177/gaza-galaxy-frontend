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
import { resolveTurn, advanceToNextNonEliminatedPlayer, type ResolveTurnResult } from '../game/turnEngine';
import type {
  AiPlayerState,
  BuildingType,
  GameMap,
  GameState,
  MapSize,
  PlayMode,
  Player,
  TurnEvent,
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
  turnReport: TurnEvent[];
  /** Per-player archive of combat events not yet shown to that player. Populated at endTurn; cleared when the player starts their next turn (at their own endTurn call). */
  playerBattleArchiveByPlayerId: Record<string, TurnEvent[]>;
  /** Per-player turn report (research, landings, builds) for the ⋮ Report modal. Cleared for the outgoing player at each endTurn. */
  playerTurnReportByPlayerId: Record<string, TurnEvent[]>;
  /** Pass-and-play: eliminated human must see knockout battle report before turn advances. */
  eliminatedPlayerPendingKnockout: boolean;
  /** Human players knocked out on their own round-wrap endTurn; farewell shown at next natural turn slot. */
  pendingFarewellPlayerIds: string[];
  startNewGame: (config: GameConfig) => void;
  loadGame: (id: string) => void;
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
  acknowledgeKnockout: () => void;
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

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
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
    // Build initial AI fog-of-war state: each AI player starts with memory of their
    // home planet and any planets within sensor range of it.
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
    const state: GameState = { ...baseState, aiStates: initialAiStates };
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
      turnReport: [],
      playerBattleArchiveByPlayerId: {},
      playerTurnReportByPlayerId: {},
      eliminatedPlayerPendingKnockout: false,
      pendingFarewellPlayerIds: [],
    });
  },

  loadGame: (id) =>
    set({
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
    const humanPlayer = gameState.players.find(
      (p) => p.id === gameState.currentPlayerId && !p.isAI,
    );
    if (humanPlayer === undefined) {
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
    const { state: nextState, events } = runAiTurnsUntilHuman(resolveTurn(gameState, input));

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
    for (const event of events) {
      if (event.kind === 'combat') {
        for (const player of finalState.players) {
          if (player.isAI) {
            continue;
          }
          if (
            event.attackerName === player.name ||
            event.defenderName === player.name
          ) {
            const existing = newArchive[player.id];
            if (existing === undefined) {
              newArchive[player.id] = [event];
            } else {
              existing.push(event);
            }
            const reportExisting = newTurnReport[player.id];
            if (reportExisting === undefined) {
              newTurnReport[player.id] = [event];
            } else {
              reportExisting.push(event);
            }
          }
        }
        continue;
      }
      if (event.kind === 'fleet_arrived') {
        const owner = finalState.players.find(
          (p) => !p.isAI && p.name === event.attackerName,
        );
        if (owner !== undefined) {
          const existing = newTurnReport[owner.id];
          if (existing === undefined) {
            newTurnReport[owner.id] = [event];
          } else {
            existing.push(event);
          }
        }
        continue;
      }
      if (event.kind === 'research_levelup') {
        const owner = finalState.players.find(
          (p) => !p.isAI && p.name === event.playerName,
        );
        if (owner !== undefined) {
          const existing = newTurnReport[owner.id];
          if (existing === undefined) {
            newTurnReport[owner.id] = [event];
          } else {
            existing.push(event);
          }
        }
        continue;
      }
      if (event.kind === 'build_complete') {
        const planet = finalState.map.planets.find(
          (p) => p.name === event.planetName,
        );
        const owner = finalState.players.find(
          (p) => !p.isAI && p.id === planet?.owner,
        );
        if (owner !== undefined) {
          const existing = newTurnReport[owner.id];
          if (existing === undefined) {
            newTurnReport[owner.id] = [event];
          } else {
            existing.push(event);
          }
        }
      }
    }
    set({
      games: get().games.map((g) =>
        g.id === record.id ? { ...g, state: finalState } : g,
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
      turnReport: [],
      playerBattleArchiveByPlayerId: {},
      playerTurnReportByPlayerId: {},
      eliminatedPlayerPendingKnockout: false,
      pendingFarewellPlayerIds: [],
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
