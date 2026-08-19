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
import { forfeitEliminatedPlayerPlanets } from '../game/combatEngine';
import { HOME_PLANET_CLASS_CONFIG, placeSpawns } from '../game/spawnPlacer';
import {
  resolveTurn,
  advanceToNextNonEliminatedPlayer,
  type PlayerAction,
  type ResolveTurnResult,
  type TurnInput,
} from '../game/turnEngine';
import { isAiControlled, needsForfeitPrompt, enqueueCommanderStatusNotice, nextCommanderStatusNoticeFor, acknowledgeCommanderStatusNotice } from '../game/playerControl';
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
import { showAlert } from '../utils/webAlert';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOCAL_GAMES_STORAGE_KEY } from '../constants/app';
import { ensureStorageMigrated } from '../utils/migrateStorage';
import type { ApiGameDetail, ApiGamePlayer, GameMessage } from '../services/gamesService';
import { ApiError } from '../services/apiClient';
import {
  forfeitGame,
  getGame,
  getMessages as fetchMessagesApi,
  sendMessage as sendMessageApi,
  submitTurn,
} from '../services/gamesService';
import { requestHomeRefresh } from '../services/homeRefreshEvents';
import { useAuthStore } from './authStore';

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
  /** Server-authoritative counters from the last load (async). */
  serverTurnNumber?: number;
  serverRoundNumber?: number;
  /** Whether it was the local user's turn when the async game was loaded. */
  asyncIsMyTurn?: boolean;
  /** Un-dismissed battle report events; persisted for local games until modal close. */
  pendingTurnReport?: TurnEvent[];
  pendingTurnReportAcknowledged?: boolean;
  /**
   * The player-N id (e.g. "player-1") that corresponds to the authenticated user
   * in this async game. Set when the game is loaded from the API so that the
   * correct player is always shown regardless of whose turn it is or whether
   * the game is finished.
   */
  localPlayerId?: string;
  /**
   * Pass-and-play: the living player who should take the next real turn after a
   * knockout farewell. `resolveTurn` already advanced to this player; the store
   * temporarily overwrites `currentPlayerId` so the eliminated player can see
   * their battle report. Must be restored on `acknowledgeKnockout` — walking
   * forward from the eliminated player skips anyone whose slot is before theirs
   * (the first player, after a round-wrap elimination).
   */
  knockoutResumePlayerId?: string;
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
  /** True while a forfeited player's AI turn (or a chain of them) is resolving. */
  isResolvingAiTurns: boolean;
  /** True while async turn submission API call is in flight. */
  isSubmittingTurn: boolean;
  /** Set after successful async turn submit; GameScreen navigates home then clears. */
  shouldReturnHome: boolean;
  /** Session preference: pause after each AI turn to review moves before advancing. */
  aiObserverMode: boolean;
  showingAiObserver: boolean;
  pendingAiTurnInput: TurnInput | null;
  pendingAiPlayerId: string | null;
  /** True when the local player loaded a finished async game to view the final battle report. */
  isViewingFinishedGame: boolean;
  /** Finished async game IDs the local player has already viewed the final battle for. */
  finalBattleViewedByGameId: Record<string, boolean>;
  /** Per-game turn key for which the local human already dismissed the battle report this session. */
  acknowledgedBattleReportTurnKeyByGameId: Record<string, string>;
  activeGameMessages: GameMessage[];
  isFetchingMessages: boolean;
  isSendingMessage: boolean;
  notificationBadgeCount: number;
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
  forfeitCurrentPlayer: () => void;
  rejoinFromForfeit: () => void;
  letAiTakeForfeitTurn: (dontAskAgain: boolean) => void;
  dismissCommanderStatusNotice: () => void;
  acknowledgeKnockout: () => void;
  dismissLockScreen: () => void;
  resetGame: () => void;
  clearReturnHome: () => void;
  markFinalBattleViewed: (gameId: string) => void;
  clearPendingTurnReport: () => void;
  acknowledgeBattleReport: () => void;
  setAiObserverMode: (value: boolean) => void;
  clearAiObserver: () => void;
  fetchMessages: (gameId: number) => Promise<void>;
  sendMessage: (gameId: number, content: string) => Promise<void>;
  clearMessages: () => void;
  setNotificationBadgeCount: (count: number) => void;
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

/**
 * Server `is_forfeited` is source of truth on load. Rejoin clears the flag even
 * if `state_json` still has `isForfeited` from the last submit.
 */
function overlayForfeitFlagsFromApi(
  state: GameState,
  apiPlayers: ApiGamePlayer[],
): GameState {
  if (apiPlayers.length === 0) {
    return state;
  }
  const players = state.players.map((player, index) => {
    const api = apiPlayers[index];
    if (api === undefined || player.isAI) {
      return player;
    }
    const isForfeited = api.isForfeited === true;
    if (!isForfeited) {
      if (player.isForfeited !== true && player.autoAiUntilEnd !== true) {
        return player;
      }
      return { ...player, isForfeited: false, autoAiUntilEnd: false };
    }
    if (player.isForfeited === true && player.difficulty !== undefined) {
      return player;
    }
    return {
      ...player,
      isForfeited: true,
      difficulty: player.difficulty ?? 'hard',
    };
  });
  let next: GameState = { ...state, players };
  const aiStates = { ...(next.aiStates ?? {}) };
  let changedMemory = false;
  for (const player of players) {
    if (
      player.isForfeited === true &&
      !player.isAI &&
      aiStates[player.id] === undefined
    ) {
      aiStates[player.id] = updateAiObservation(next, player.id, undefined);
      changedMemory = true;
    }
  }
  if (changedMemory) {
    next = { ...next, aiStates };
  }
  for (let index = 0; index < players.length; index++) {
    const player = players[index];
    const previous = state.players[index];
    if (player.isAI || previous === undefined) {
      continue;
    }
    const wasForfeited = previous.isForfeited === true;
    const isForfeited = player.isForfeited === true;
    if (wasForfeited === isForfeited) {
      continue;
    }
    next = enqueueCommanderStatusNotice(
      next,
      isForfeited ? 'forfeit' : 'rejoin',
      player,
    );
  }
  return next;
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

/**
 * Stable key for one human sitting (their turn, a knockout farewell, or a
 * finished-game review). Uses roundNumber + turnNumber so it stays unique for a
 * farewell in the same round, but does not change while that human is acting.
 * skipActivePlayerCheck is only for finished-game viewing, when currentPlayerId
 * may be the winner rather than the local viewer.
 */
export function battleReportTurnKey(
  gameId: string | null,
  state: GameState | null | undefined,
  localHumanPlayerId: string | undefined,
  options?: { skipActivePlayerCheck?: boolean },
): string | null {
  if (gameId === null || state === undefined || state === null || localHumanPlayerId === undefined) {
    return null;
  }
  if (
    !options?.skipActivePlayerCheck &&
    state.currentPlayerId !== localHumanPlayerId
  ) {
    return null;
  }
  return `${gameId}-r${state.roundNumber}-t${state.turnNumber}-${localHumanPlayerId}`;
}

/** Fog/UI ownership: current human on their turn, otherwise the first human (e.g. during AI turns). */
export function getLocalHumanPlayerId(state: GameState): string | undefined {
  const current = state.players.find((p) => p.id === state.currentPlayerId);
  if (current !== undefined && !current.isAI) {
    return current.id;
  }
  return state.players.find((p) => !p.isAI)?.id;
}

/**
 * Determine the "player-N" id for the authenticated user in an async game.
 * Matches the authenticated user's numeric id against the players array returned
 * by the API (each entry has a userId for human slots). Falls back to
 * getLocalHumanPlayerId when the match cannot be made (e.g. unauthenticated).
 */
function resolveAsyncLocalPlayerId(
  apiPlayers: ApiGamePlayer[],
  gameState: GameState,
): string | undefined {
  const currentUser = useAuthStore.getState().currentUser;
  if (currentUser != null) {
    const idx = apiPlayers.findIndex(
      (p) => !p.isAi && p.userId != null && p.userId === currentUser.id,
    );
    if (idx >= 0) {
      return `player-${idx}`;
    }
  }
  return getLocalHumanPlayerId(gameState);
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
    if (
      currentPlayer === undefined ||
      currentPlayer.isEliminated ||
      !isAiControlled(currentPlayer, current.playMode)
    ) {
      break;
    }
    const aiResult = resolveTurn(current, computeAiTurn(current, current.currentPlayerId));
    allEvents = allEvents.concat(aiResult.events);
    current = stripTurnEvents(aiResult);
  }
  return { state: current, events: allEvents };
}

function uniquePlayerIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  return unique;
}

function findNewlyEliminatedHumanIds(
  events: TurnEvent[],
  players: Player[],
): string[] {
  const ids: string[] = [];
  const consider = (player: Player | undefined) => {
    if (
      player !== undefined &&
      !player.isAI &&
      player.isForfeited !== true &&
      player.isEliminated &&
      !ids.includes(player.id)
    ) {
      ids.push(player.id);
    }
  };
  for (const event of events) {
    if (event.kind === 'combat' && event.isHomePlanetConquest === true) {
      consider(
        players.find(
          (player) =>
            (event.planetId !== undefined &&
              player.homePlanetId === event.planetId) ||
            player.name === event.defenderName,
        ),
      );
    }
    if (event.kind === 'multiway_combat' && event.isHomePlanetConquest === true) {
      for (const participant of event.participants) {
        if (participant.survived) {
          continue;
        }
        consider(players.find((player) => player.id === participant.ownerId));
      }
    }
  }
  return ids;
}

function humansNeedingKnockoutFarewell(players: Player[]): string[] {
  return players
    .filter(
      (player) =>
        !player.isAI &&
        player.isEliminated &&
        player.isForfeited !== true &&
        player.knockoutFarewellComplete !== true,
    )
    .map((player) => player.id);
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
 * Async: point `currentPlayerId` at a knocked-out human so they get a farewell
 * turn. Pass-and-play defers a self-knockout until that player's next slot;
 * async must not — Zustand `pendingFarewellPlayerIds` is wiped on submit.
 */
function applyAsyncKnockoutFarewellHandoff(
  engineState: GameState,
  outgoingPlayerId: string,
  thisTurnKnockoutIds: string[],
): GameState {
  if (engineState.playMode === 'passAndPlay') {
    return engineState;
  }
  const engineNextId = engineState.currentPlayerId;
  const wrapBackRecovery =
    engineNextId === outgoingPlayerId
      ? humansNeedingKnockoutFarewell(engineState.players)
      : [];
  const pool = uniquePlayerIds([
    ...thisTurnKnockoutIds,
    ...(engineState.pendingFarewellPlayerIds ?? []),
    ...wrapBackRecovery,
  ]);
  if (pool.length === 0) {
    return engineState;
  }

  let farewellId: string | null = null;
  if (thisTurnKnockoutIds.includes(outgoingPlayerId)) {
    farewellId = outgoingPlayerId;
  } else {
    farewellId = findFarewellInPath(
      outgoingPlayerId,
      engineNextId,
      engineState.players,
      pool,
    );
    if (farewellId === null && thisTurnKnockoutIds.length > 0) {
      farewellId = thisTurnKnockoutIds[0];
    }
  }
  if (farewellId === null) {
    return engineState;
  }

  return {
    ...engineState,
    currentPlayerId: farewellId,
    pendingFarewellPlayerIds: pool.filter((id) => id !== farewellId),
    knockoutResumePlayerId: engineNextId,
    status: 'active',
  };
}

/**
 * Temporarily point `currentPlayerId` at a knockout farewell without losing the
 * living player `resolveTurn` already selected.
 */
function applyPassAndPlayKnockoutHandoff(
  engineState: GameState,
  outgoingPlayerId: string,
  pendingFarewellIds: string[],
  immediateKnockouts: string[],
): {
  state: GameState;
  pendingKnockout: boolean;
  pendingFarewellIds: string[];
  knockoutResumePlayerId?: string;
} {
  if (engineState.playMode !== 'passAndPlay' || engineState.status !== 'active') {
    return { state: engineState, pendingKnockout: false, pendingFarewellIds };
  }
  const resumePlayerId = engineState.currentPlayerId;
  const farewellInPath = findFarewellInPath(
    outgoingPlayerId,
    resumePlayerId,
    engineState.players,
    pendingFarewellIds,
  );
  if (farewellInPath !== null) {
    return {
      state: { ...engineState, currentPlayerId: farewellInPath },
      pendingKnockout: true,
      pendingFarewellIds: pendingFarewellIds.filter((id) => id !== farewellInPath),
      knockoutResumePlayerId: resumePlayerId,
    };
  }
  if (immediateKnockouts.length > 0) {
    return {
      state: { ...engineState, currentPlayerId: immediateKnockouts[0] },
      pendingKnockout: true,
      pendingFarewellIds,
      knockoutResumePlayerId: resumePlayerId,
    };
  }
  return { state: engineState, pendingKnockout: false, pendingFarewellIds };
}

function stateWithKnockoutResume(
  state: GameState,
  resumePlayerId: string | undefined,
): GameState {
  if (resumePlayerId !== undefined) {
    const resume = state.players.find((player) => player.id === resumePlayerId);
    if (resume !== undefined && !resume.isEliminated) {
      return { ...state, currentPlayerId: resumePlayerId };
    }
    return advanceToNextNonEliminatedPlayer({
      ...state,
      currentPlayerId: resume?.id ?? state.currentPlayerId,
    });
  }
  return advanceToNextNonEliminatedPlayer(state);
}

function markHumanSittingOut(state: GameState, playerId: string): GameState {
  const players = state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          isForfeited: true,
          difficulty: player.difficulty ?? 'hard',
        }
      : player,
  );
  const next: GameState = { ...state, players };
  const withMemory: GameState = {
    ...next,
    aiStates: {
      ...(next.aiStates ?? {}),
      [playerId]: updateAiObservation(next, playerId, next.aiStates?.[playerId]),
    },
  };
  const sittingPlayer = withMemory.players.find((player) => player.id === playerId);
  if (sittingPlayer === undefined) {
    return withMemory;
  }
  return enqueueCommanderStatusNotice(withMemory, 'forfeit', sittingPlayer);
}

function commitPassAndPlayResolvedTurn(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  record: GameRecord,
  outgoingPlayerId: string,
  nextState: GameState,
  events: TurnEvent[],
): void {
  const knockoutHumanIds = findNewlyEliminatedHumanIds(events, nextState.players);
  const deferredKnockouts = knockoutHumanIds.filter((id) => id === outgoingPlayerId);
  const immediateKnockouts = knockoutHumanIds.filter((id) => id !== outgoingPlayerId);
  const passAndPlayHandoff = applyPassAndPlayKnockoutHandoff(
    nextState,
    outgoingPlayerId,
    [...get().pendingFarewellPlayerIds, ...deferredKnockouts],
    immediateKnockouts,
  );
  const finalState = passAndPlayHandoff.state;
  const pendingKnockout = passAndPlayHandoff.pendingKnockout;
  const showLock =
    finalState.playMode === 'passAndPlay' && finalState.status === 'active';
  const newArchive = { ...get().playerBattleArchiveByPlayerId };
  delete newArchive[outgoingPlayerId];
  const newTurnReport = { ...get().playerTurnReportByPlayerId };
  delete newTurnReport[outgoingPlayerId];
  const { archive: builtArchive, turnReport: builtTurnReport } = buildPlayerReports(
    events,
    finalState.players,
    finalState.map.planets,
  );
  for (const [playerId, playerEvents] of Object.entries(builtArchive)) {
    const existing = newArchive[playerId];
    newArchive[playerId] =
      existing === undefined ? playerEvents : [...existing, ...playerEvents];
  }
  for (const [playerId, playerEvents] of Object.entries(builtTurnReport)) {
    const existing = newTurnReport[playerId];
    newTurnReport[playerId] =
      existing === undefined ? playerEvents : [...existing, ...playerEvents];
  }
  set({
    games: get().games.map((g) =>
      g.id === record.id
        ? {
            ...g,
            state: finalState,
            pendingTurnReport: events,
            pendingTurnReportAcknowledged: false,
            knockoutResumePlayerId: pendingKnockout
              ? passAndPlayHandoff.knockoutResumePlayerId
              : undefined,
          }
        : g,
    ),
    queuedOrders: [],
    selectedPlanetId: null,
    pendingFleet: null,
    turnReport: events,
    playerBattleArchiveByPlayerId: newArchive,
    playerTurnReportByPlayerId: newTurnReport,
    eliminatedPlayerPendingKnockout: pendingKnockout,
    pendingFarewellPlayerIds: passAndPlayHandoff.pendingFarewellIds,
    isResolvingAiTurns: false,
    ...(showLock ? { showingLockScreen: true } : { showingLockScreen: false }),
  });
}

function runSittingOutAiTurn(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  record: GameRecord,
  state: GameState,
  playerId: string,
): void {
  let nextState: GameState;
  let events: TurnEvent[];
  try {
    const aiResult = resolveTurn(state, computeAiTurn(state, playerId));
    const continued = runAiTurnsUntilHuman(aiResult);
    nextState = continued.state;
    events = continued.events;
  } catch (err) {
    console.error('[forfeit] AI turn failed:', err);
    set({ isResolvingAiTurns: false });
    showAlert(
      'Turn Failed',
      err instanceof Error
        ? err.message
        : 'Could not let the AI take this turn. Try again.',
    );
    return;
  }
  commitPassAndPlayResolvedTurn(get, set, record, playerId, nextState, events);
}

function isIgnorableForfeitApiError(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 422) {
    return false;
  }
  const message = err.message.toLowerCase();
  return (
    message.includes('already sitting out') ||
    message.includes('not in progress')
  );
}

/** After a successful submit, mark the caller sitting out. Retry once; never undo the submit. */
async function registerSitOutOnServer(
  gameId: number,
  gameFinished: boolean,
): Promise<void> {
  if (gameFinished) {
    return;
  }
  try {
    await forfeitGame(gameId);
  } catch (err) {
    if (isIgnorableForfeitApiError(err)) {
      return;
    }
    try {
      await forfeitGame(gameId);
    } catch (retryErr) {
      if (isIgnorableForfeitApiError(retryErr)) {
        return;
      }
      showAlert(
        'Sitting out not registered',
        retryErr instanceof ApiError
          ? retryErr.message
          : 'Your turn was submitted, but sit-out may not have been saved. If you get another turn, forfeit again.',
      );
    }
  }
}

function runAsyncForfeitTurn(
  get: () => GameStore,
  set: (partial: Partial<GameStore>) => void,
  record: GameRecord,
  playerId: string,
): void {
  const asyncGameId = record.asyncGameId;
  if (asyncGameId == null) {
    return;
  }

  const storeSnapshot = {
    games: get().games,
    queuedOrders: get().queuedOrders,
    selectedPlanetId: get().selectedPlanetId,
    pendingFleet: get().pendingFleet,
    turnReport: get().turnReport,
    playerBattleArchiveByPlayerId: get().playerBattleArchiveByPlayerId,
    playerTurnReportByPlayerId: get().playerTurnReportByPlayerId,
    eliminatedPlayerPendingKnockout: get().eliminatedPlayerPendingKnockout,
    pendingFarewellPlayerIds: get().pendingFarewellPlayerIds,
    showingLockScreen: get().showingLockScreen,
  };
  const preTurnNumber = record.serverTurnNumber ?? record.state.turnNumber;
  const preRoundNumber = record.serverRoundNumber ?? record.state.roundNumber;

  set({
    isResolvingAiTurns: true,
    queuedOrders: [],
    selectedPlanetId: null,
    pendingFleet: null,
    showingLockScreen: false,
    showingAiObserver: false,
    pendingAiTurnInput: null,
    pendingAiPlayerId: null,
  });

  const restorePreSubmitSnapshot = () => {
    set({
      games: storeSnapshot.games,
      queuedOrders: storeSnapshot.queuedOrders,
      selectedPlanetId: storeSnapshot.selectedPlanetId,
      pendingFleet: storeSnapshot.pendingFleet,
      turnReport: storeSnapshot.turnReport,
      playerBattleArchiveByPlayerId: storeSnapshot.playerBattleArchiveByPlayerId,
      playerTurnReportByPlayerId: storeSnapshot.playerTurnReportByPlayerId,
      eliminatedPlayerPendingKnockout: storeSnapshot.eliminatedPlayerPendingKnockout,
      pendingFarewellPlayerIds: storeSnapshot.pendingFarewellPlayerIds,
      showingLockScreen: storeSnapshot.showingLockScreen,
      isSubmittingTurn: false,
      isResolvingAiTurns: false,
    });
  };

  setTimeout(() => {
    const latest = get().getActiveRecord();
    if (latest === null || latest.id !== record.id || latest.asyncGameId == null) {
      set({ isResolvingAiTurns: false });
      return;
    }

    const sittingOut = markHumanSittingOut(latest.state, playerId);
    const aiInput = computeAiTurn(sittingOut, playerId);

    let nextState: GameState;
    let events: TurnEvent[];
    try {
      const aiResult = resolveTurn(sittingOut, aiInput);
      const continued = runAiTurnsUntilHuman(aiResult);
      nextState = continued.state;
      events = continued.events;
    } catch (err) {
      console.error('[forfeit] async AI turn failed:', err);
      restorePreSubmitSnapshot();
      showAlert(
        'Turn Failed',
        err instanceof Error
          ? err.message
          : 'Could not let the AI take this turn. Try again.',
      );
      return;
    }

    const knockoutHumanIds = findNewlyEliminatedHumanIds(
      events,
      nextState.players,
    );
    const immediateKnockouts = knockoutHumanIds.filter((id) => id !== playerId);
    let finalState = nextState;
    if (immediateKnockouts.length > 0 && nextState.status === 'active') {
      finalState = { ...nextState, currentPlayerId: immediateKnockouts[0] };
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
      pendingFleet: null,
      turnReport: events,
      isResolvingAiTurns: false,
      isSubmittingTurn: true,
    });

    void (async () => {
      try {
        await submitTurn(asyncGameId, {
          actions: aiInput.actions,
          resultingState: finalState,
          turnNumber: preTurnNumber,
          roundNumber: preRoundNumber,
          events,
        });
        await registerSitOutOnServer(
          asyncGameId,
          finalState.status === 'finished',
        );
        get().resetGame();
        set({ isSubmittingTurn: false, shouldReturnHome: true });
      } catch (err) {
        console.error('[forfeit] submitTurn failed:', err);
        restorePreSubmitSnapshot();

        const alertBody =
          err instanceof ApiError
            ? `Server returned ${err.status}: ${err.message}`
            : 'Could not submit your turn. Your moves were not saved — try again.';

        if (
          err instanceof ApiError &&
          (err.status === 409 || err.status === 403 || err.status === 422)
        ) {
          try {
            const fresh = await getGame(asyncGameId);
            get().loadAsyncGame(fresh);
            if (!fresh.isMyTurn) {
              set({ shouldReturnHome: true });
            }
          } catch (reloadErr) {
            console.error(
              '[forfeit] Failed to reload game after submit error:',
              reloadErr,
            );
          }
        }

        showAlert('Submit Failed', alertBody);
      }
    })();
  }, 0);
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
  games: [] as GameRecord[],
  _hasHydrated: false,
  activeGameId: null,
  selectedPlanetId: null,
  pendingFleet: null,
  queuedOrders: [] as PendingFleet[],
  showingLockScreen: false,
  turnReport: [],
  playerBattleArchiveByPlayerId: {},
  playerTurnReportByPlayerId: {},
  eliminatedPlayerPendingKnockout: false,
  pendingFarewellPlayerIds: [],
  isResolvingAiTurns: false,
  isSubmittingTurn: false,
  shouldReturnHome: false,
  aiObserverMode: false,
  showingAiObserver: false,
  pendingAiTurnInput: null,
  pendingAiPlayerId: null,
  isViewingFinishedGame: false,
  finalBattleViewedByGameId: {},
  acknowledgedBattleReportTurnKeyByGameId: {},
  activeGameMessages: [],
  isFetchingMessages: false,
  isSendingMessage: false,
  notificationBadgeCount: 0,

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
      isResolvingAiTurns: false,
      isSubmittingTurn: false,
      shouldReturnHome: false,
      isViewingFinishedGame: false,
      showingAiObserver: false,
      pendingAiTurnInput: null,
      pendingAiPlayerId: null,
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
    const currentPlayer = record?.state.players.find(
      (player) => player.id === record.state.currentPlayerId,
    );
    const restoreKnockout =
      record !== undefined &&
      record.state.status === 'active' &&
      currentPlayer !== undefined &&
      !currentPlayer.isAI &&
      currentPlayer.isForfeited !== true &&
      currentPlayer.isEliminated === true;
    set({
      activeGameId: id,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders: [],
      showingLockScreen:
        (hasPending && !record?.pendingTurnReportAcknowledged) || restoreKnockout,
      turnReport: pending ?? [],
      games: get().games.map((g) => {
        if (g.id !== id) return g;
        return { ...g, state: drainStaleFleets(g.state) };
      }),
      playerBattleArchiveByPlayerId: restoredArchive,
      playerTurnReportByPlayerId: restoredTurnReport,
      eliminatedPlayerPendingKnockout: restoreKnockout,
      pendingFarewellPlayerIds: [],
      isResolvingAiTurns: false,
      isSubmittingTurn: false,
      shouldReturnHome: false,
      // Always clear finished-game flag and AI observer state when loading a
      // local game so stale flags from a previous async finished-game session
      // never bleed in. skipActivePlayerCheck is only valid while viewing a
      // finished game; if left true during live play, battleReportTurnKey would
      // be non-null during AI turns.
      isViewingFinishedGame: false,
      showingAiObserver: false,
      pendingAiTurnInput: null,
      pendingAiPlayerId: null,
    });
  },

  loadAsyncGame: (detail) => {
    if (detail.status === 'finished') {
      // Use the winner's final state if the backend provided it; fall back to
      // the initial state_json only when final_state_json is absent (old games).
      const rawState = detail.finalStateJson ?? JSON.parse(detail.stateJson);
      const state = overlayForfeitFlagsFromApi(
        drainStaleFleets({
          ...(rawState as GameState),
          playMode: 'asyncMultiplayer',
          turnNumber: detail.turnNumber,
          roundNumber: detail.roundNumber,
        }),
        detail.players,
      );
      const recordId = String(detail.id);
      const localPlayerId = resolveAsyncLocalPlayerId(detail.players, state);
      const record: GameRecord = {
        id: recordId,
        name: detail.name,
        asyncGameId: detail.id,
        serverTurnNumber: detail.turnNumber,
        serverRoundNumber: detail.roundNumber,
        asyncIsMyTurn: detail.isMyTurn,
        state,
        localPlayerId,
        config: {
          playMode: 'asyncMultiplayer',
          playerName: '',
          playerSlots: [],
          mapSize: 'medium',
          mapWidth: state.map.width,
          mapHeight: state.map.height,
          planetCount: state.map.planets.length,
        },
        pendingTurnReport: detail.latestEvents?.length ? detail.latestEvents : undefined,
        pendingTurnReportAcknowledged: false,
      };
      const { games } = get();
      const existingIndex = games.findIndex((g) => g.id === recordId);
      const nextGames =
        existingIndex >= 0
          ? games.map((g, i) => (i === existingIndex ? record : g))
          : [...games, record];
      const hasEvents = (detail.latestEvents?.length ?? 0) > 0;
      const asyncReports = hasEvents
        ? buildPlayerReports(detail.latestEvents!, state.players, state.map.planets)
        : null;
      set({
        games: nextGames,
        activeGameId: recordId,
        selectedPlanetId: null,
        pendingFleet: null,
        queuedOrders: [],
        showingLockScreen: hasEvents,   // only show lock screen if there are events to review
        turnReport: detail.latestEvents ?? [],
        playerBattleArchiveByPlayerId: asyncReports?.archive ?? {},
        playerTurnReportByPlayerId: asyncReports?.turnReport ?? {},
        eliminatedPlayerPendingKnockout: false,
        pendingFarewellPlayerIds: [],
        isViewingFinishedGame: true,
        showingAiObserver: false,
        pendingAiTurnInput: null,
        pendingAiPlayerId: null,
      });
      return;
    }

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
    state = overlayForfeitFlagsFromApi(
      drainStaleFleets({
        ...state,
        playMode: 'asyncMultiplayer',
        turnNumber: detail.turnNumber,
        roundNumber: detail.roundNumber,
      }),
      detail.players,
    );

    const recordId = String(detail.id);
    const localPlayerId = resolveAsyncLocalPlayerId(detail.players, state);
    const record: GameRecord = {
      id: recordId,
      name: detail.name,
      asyncGameId: detail.id,
      serverTurnNumber: detail.turnNumber,
      serverRoundNumber: detail.roundNumber,
      asyncIsMyTurn: detail.isMyTurn,
      state,
      localPlayerId,
      knockoutResumePlayerId: state.knockoutResumePlayerId,
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

    const localPlayer =
      localPlayerId !== undefined
        ? state.players.find((p) => p.id === localPlayerId)
        : undefined;
    const isEliminatedFarewellTurn = detail.isMyTurn && localPlayer?.isEliminated === true;

    set({
      games: nextGames,
      activeGameId: recordId,
      selectedPlanetId: null,
      pendingFleet: null,
      queuedOrders,
      showingLockScreen: isEliminatedFarewellTurn,
      turnReport: detail.isMyTurn ? (detail.latestEvents ?? []) : [],
      playerBattleArchiveByPlayerId: asyncReports?.archive ?? {},
      playerTurnReportByPlayerId: asyncReports?.turnReport ?? {},
      eliminatedPlayerPendingKnockout: isEliminatedFarewellTurn,
      pendingFarewellPlayerIds: state.pendingFarewellPlayerIds ?? [],
      isSubmittingTurn: false,
      shouldReturnHome: false,
      isViewingFinishedGame: false,
      showingAiObserver: false,
      pendingAiTurnInput: null,
      pendingAiPlayerId: null,
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
    const preTurnNumber = record.serverTurnNumber ?? gameState.turnNumber;
    const preRoundNumber = record.serverRoundNumber ?? gameState.roundNumber;
    const humanPlayer = gameState.players.find(
      (p) =>
        p.id === gameState.currentPlayerId &&
        !isAiControlled(p, gameState.playMode),
    );
    if (humanPlayer === undefined) {
      console.error(
        '[endTurn] No active human for currentPlayerId',
        gameState.currentPlayerId,
      );
      showAlert(
        'Cannot End Turn',
        'The active player could not be resolved. Exit and reopen the game from the lobby.',
      );
      return;
    }
    if (needsForfeitPrompt(humanPlayer, gameState.playMode)) {
      return;
    }
    if (humanPlayer.isEliminated) {
      set({ shouldReturnHome: true });
      return;
    }
    const asyncGameId = record.asyncGameId;
    const isAsync = asyncGameId != null;
    if (isAsync && record.asyncIsMyTurn === false) {
      showAlert(
        'Not Your Turn',
        'It is no longer your turn. Return to the lobby and reopen the game when it is your turn.',
      );
      return;
    }

    const storeSnapshot = {
      games: get().games,
      queuedOrders: get().queuedOrders,
      selectedPlanetId: get().selectedPlanetId,
      turnReport: get().turnReport,
      playerBattleArchiveByPlayerId: get().playerBattleArchiveByPlayerId,
      playerTurnReportByPlayerId: get().playerTurnReportByPlayerId,
      eliminatedPlayerPendingKnockout: get().eliminatedPlayerPendingKnockout,
      pendingFarewellPlayerIds: get().pendingFarewellPlayerIds,
      showingLockScreen: get().showingLockScreen,
    };
    const { queuedOrders: queuedOrdersSnapshot } = get();
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

    let humanResult: ResolveTurnResult;
    try {
      humanResult = resolveTurn(gameState, input);
    } catch (err) {
      console.error('[endTurn] resolveTurn failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Could not resolve your turn. Try exiting and reopening the game.';
      
      // Extract planet ID from "Cannot send X ships from PlanetName (planetId)" error
      const planetIdMatch = errorMessage.match(/\(([^)]+)\)/);
      if (planetIdMatch) {
        const planetId = planetIdMatch[1];
        set({ selectedPlanetId: planetId });
      }
      
      showAlert(
        'Turn Failed',
        errorMessage,
      );
      return;
    }
    if (get().aiObserverMode) {
      const resolvedState = stripTurnEvents(humanResult);
      const nextPlayer = resolvedState.players.find(
        (p) => p.id === resolvedState.currentPlayerId,
      );
      if (
        nextPlayer !== undefined &&
        isAiControlled(nextPlayer, resolvedState.playMode) &&
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
    let nextState: GameState;
    let events: TurnEvent[];
    try {
      const aiResult = runAiTurnsUntilHuman(humanResult);
      nextState = aiResult.state;
      events = aiResult.events;
    } catch (err) {
      console.error('[endTurn] runAiTurnsUntilHuman failed:', err);
      showAlert(
        'Turn Failed',
        err instanceof Error
          ? err.message
          : 'Could not process AI turns. Try exiting and reopening the game.',
      );
      return;
    }

    const outgoingPlayerId = gameState.currentPlayerId;
    const knockoutHumanIds = findNewlyEliminatedHumanIds(events, nextState.players);
    // Players knocked out DURING their own endTurn (round wrap they triggered) need
    // a deferred farewell in pass-and-play — showing it immediately would mean they
    // see it right after they end their own turn, before any other player goes.
    // Async must not defer: Zustand pending farewells are wiped on submit.
    const deferredKnockouts = knockoutHumanIds.filter((id) => id === outgoingPlayerId);
    const immediateKnockouts = knockoutHumanIds.filter((id) => id !== outgoingPlayerId);
    const pendingFarewellWithDeferred = [
      ...get().pendingFarewellPlayerIds,
      ...deferredKnockouts,
    ];
    let newPendingFarewellIds = pendingFarewellWithDeferred;
    let finalState = nextState;
    let pendingKnockout = false;
    let passAndPlayResumeId: string | undefined;
    if (nextState.playMode === 'passAndPlay') {
      const passAndPlayHandoff = applyPassAndPlayKnockoutHandoff(
        nextState,
        outgoingPlayerId,
        pendingFarewellWithDeferred,
        immediateKnockouts,
      );
      newPendingFarewellIds = passAndPlayHandoff.pendingFarewellIds;
      finalState = passAndPlayHandoff.state;
      pendingKnockout = passAndPlayHandoff.pendingKnockout;
      passAndPlayResumeId = passAndPlayHandoff.knockoutResumePlayerId;
    } else if (isAsync) {
      finalState = applyAsyncKnockoutFarewellHandoff(
        nextState,
        outgoingPlayerId,
        [...immediateKnockouts, ...deferredKnockouts],
      );
      newPendingFarewellIds = finalState.pendingFarewellPlayerIds ?? [];
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
      newArchive[playerId] =
        existing === undefined ? playerEvents : [...existing, ...playerEvents];
    }
    for (const [playerId, playerEvents] of Object.entries(builtTurnReport)) {
      const existing = newTurnReport[playerId];
      newTurnReport[playerId] =
        existing === undefined ? playerEvents : [...existing, ...playerEvents];
    }
    if (isAsync) {
      delete newArchive[humanPlayer.id];
      delete newTurnReport[humanPlayer.id];
    }
    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: finalState,
              pendingTurnReport: events,
              pendingTurnReportAcknowledged: false,
              knockoutResumePlayerId: pendingKnockout
                ? passAndPlayResumeId
                : undefined,
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
      // For async games start the submission flag in the same atomic update so
      // that the battle-report modal closes before React can paint a stale frame.
      ...(isAsync ? { isSubmittingTurn: true } : {}),
    });

    if (!isAsync || !asyncGameId) {
      return;
    }

    const submitActions = [
      ...queuedOrdersSnapshot.map((o) => ({
        type: 'SEND_FLEET' as const,
        fromPlanetId: o.fromPlanetId,
        toPlanetId: o.toPlanetId,
        shipCount: o.shipCount,
      })),
      { type: 'END_TURN' as const },
    ];

    const restorePreSubmitSnapshot = () => {
      set({
        games: storeSnapshot.games,
        queuedOrders: storeSnapshot.queuedOrders,
        selectedPlanetId: storeSnapshot.selectedPlanetId,
        turnReport: storeSnapshot.turnReport,
        playerBattleArchiveByPlayerId: storeSnapshot.playerBattleArchiveByPlayerId,
        playerTurnReportByPlayerId: storeSnapshot.playerTurnReportByPlayerId,
        eliminatedPlayerPendingKnockout: storeSnapshot.eliminatedPlayerPendingKnockout,
        pendingFarewellPlayerIds: storeSnapshot.pendingFarewellPlayerIds,
        showingLockScreen: storeSnapshot.showingLockScreen,
        isSubmittingTurn: false,
      });
    };

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
        console.error('[endTurn] submitTurn failed:', err);
        restorePreSubmitSnapshot();

        const alertBody =
          err instanceof ApiError
            ? `Server returned ${err.status}: ${err.message}`
            : 'Could not submit your turn. Your moves were not saved — try again.';

        if (
          err instanceof ApiError &&
          (err.status === 409 || err.status === 403 || err.status === 422)
        ) {
          try {
            const fresh = await getGame(asyncGameId);
            get().loadAsyncGame(fresh);
            if (!fresh.isMyTurn) {
              set({ shouldReturnHome: true });
            }
          } catch (reloadErr) {
            console.error('[endTurn] Failed to reload game after submit error:', reloadErr);
          }
        }

        showAlert('Submit Failed', alertBody);
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
      isAiControlled(currentPlayer, nextState.playMode) &&
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
    const passAndPlayHandoff = applyPassAndPlayKnockoutHandoff(
      nextState,
      outgoingPlayerId,
      [...get().pendingFarewellPlayerIds, ...deferredKnockouts],
      immediateKnockouts,
    );
    const finalState = passAndPlayHandoff.state;
    const pendingKnockout = passAndPlayHandoff.pendingKnockout;
    const newPendingFarewellIds = passAndPlayHandoff.pendingFarewellIds;

    const showLock =
      finalState.playMode === 'passAndPlay' && finalState.status === 'active';
    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: finalState,
              knockoutResumePlayerId: pendingKnockout
                ? passAndPlayHandoff.knockoutResumePlayerId
                : undefined,
            }
          : g,
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
    // Clear synchronously to prevent double-invocation from concurrent UI events.
    // Pass-and-play must not set isSubmittingTurn — that flag drives the async
    // "Submitting turn…" overlay and a 45s server-timeout alert.
    set({
      eliminatedPlayerPendingKnockout: false,
      ...(record.asyncGameId != null ? { isSubmittingTurn: true } : {}),
    });

    const farewellPlayerId = record.state.currentPlayerId;
    const knockoutResumePlayerId = record.knockoutResumePlayerId;
    const stateAfterForfeit = {
      ...record.state,
      map: forfeitEliminatedPlayerPlanets(record.state.map, farewellPlayerId),
    };
    if (record.asyncGameId != null) {
      const asyncGameId = record.asyncGameId;
      const markedPlayers = stateAfterForfeit.players.map((player) =>
        player.id === farewellPlayerId
          ? { ...player, knockoutFarewellComplete: true }
          : player,
      );
      const remainingPending = uniquePlayerIds(
        (stateAfterForfeit.pendingFarewellPlayerIds ?? []).filter(
          (id) => id !== farewellPlayerId,
        ),
      );
      const survivingPlayers = markedPlayers.filter((player) => !player.isEliminated);
      const resumeId =
        stateAfterForfeit.knockoutResumePlayerId ?? knockoutResumePlayerId;
      let nextState: typeof stateAfterForfeit;
      if (remainingPending.length > 0) {
        nextState = {
          ...stateAfterForfeit,
          players: markedPlayers,
          currentPlayerId: remainingPending[0],
          pendingFarewellPlayerIds: remainingPending.slice(1),
          knockoutResumePlayerId: resumeId,
          status: 'active',
          turnNumber: record.state.turnNumber + 1,
        };
      } else if (survivingPlayers.length <= 1) {
        const winner = survivingPlayers[0];
        nextState = {
          ...stateAfterForfeit,
          players: markedPlayers,
          status: 'finished',
          currentPlayerId: winner?.id ?? stateAfterForfeit.currentPlayerId,
          winnerId: winner?.id ?? stateAfterForfeit.winnerId,
          pendingFarewellPlayerIds: [],
          knockoutResumePlayerId: undefined,
          turnNumber: record.state.turnNumber + 1,
        };
      } else {
        const resumePlayer = markedPlayers.find((player) => player.id === resumeId);
        const resumeIsPlayable =
          resumePlayer !== undefined &&
          !resumePlayer.isEliminated &&
          !isAiControlled(resumePlayer, stateAfterForfeit.playMode);
        let nextHumanPlayerId = resumeIsPlayable
          ? resumePlayer.id
          : farewellPlayerId;
        if (!resumeIsPlayable) {
          const farewellCurrentIdx = markedPlayers.findIndex(
            (player) => player.id === farewellPlayerId,
          );
          for (let offset = 1; offset <= markedPlayers.length; offset++) {
            const candidate =
              markedPlayers[(farewellCurrentIdx + offset) % markedPlayers.length];
            if (
              !candidate.isEliminated &&
              !isAiControlled(candidate, stateAfterForfeit.playMode)
            ) {
              nextHumanPlayerId = candidate.id;
              break;
            }
          }
        }
        nextState = {
          ...stateAfterForfeit,
          players: markedPlayers,
          currentPlayerId: nextHumanPlayerId,
          pendingFarewellPlayerIds: [],
          knockoutResumePlayerId: undefined,
          status: 'active',
          turnNumber: record.state.turnNumber + 1,
        };
      }

      void (async () => {
        try {
          await submitTurn(asyncGameId, {
            actions: [],
            resultingState: nextState,
            turnNumber: record.state.turnNumber,
            roundNumber: record.state.roundNumber,
            events: [],
          });
          get().resetGame();
          requestHomeRefresh();
          set({
            isSubmittingTurn: false,
            shouldReturnHome: true,
          });
        } catch (err) {
          console.error('[acknowledgeKnockout] submitTurn failed:', err);
          // Restore flag so the player can retry via End Turn.
          set({ eliminatedPlayerPendingKnockout: true, isSubmittingTurn: false });

          const alertBody =
            err instanceof ApiError
              ? `Server returned ${err.status}: ${err.message}`
              : 'Could not submit your turn. Your moves were not saved — try again.';

          showAlert('Submit Failed', alertBody);
        }
      })();
      return;
    }
    const resumedState = stateWithKnockoutResume(
      stateAfterForfeit,
      knockoutResumePlayerId,
    );
    const { state: afterAi } = runAiTurnsUntilHuman({
      ...resumedState,
      events: [],
    });
    const remainingFarewells = [...get().pendingFarewellPlayerIds];
    const passAndPlayHandoff = applyPassAndPlayKnockoutHandoff(
      afterAi,
      farewellPlayerId,
      remainingFarewells,
      [],
    );
    const nextState = passAndPlayHandoff.state;
    const pendingKnockout = passAndPlayHandoff.pendingKnockout;
    const newPendingFarewellIds = passAndPlayHandoff.pendingFarewellIds;
    const showLock =
      nextState.playMode === 'passAndPlay' && nextState.status === 'active';

    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: nextState,
              knockoutResumePlayerId: pendingKnockout
                ? (passAndPlayHandoff.knockoutResumePlayerId ?? knockoutResumePlayerId)
                : undefined,
            }
          : g,
      ),
      eliminatedPlayerPendingKnockout: pendingKnockout,
      pendingFarewellPlayerIds: newPendingFarewellIds,
      ...(showLock ? { showingLockScreen: true } : {}),
    });
  },

  forfeitCurrentPlayer: () => {
    const record = get().getActiveRecord();
    if (record === null || record.state.status !== 'active') {
      return;
    }
    if (get().isSubmittingTurn || get().isResolvingAiTurns) {
      return;
    }
    const gameState = record.state;
    const currentPlayer = gameState.players.find(
      (player) => player.id === gameState.currentPlayerId,
    );
    if (
      currentPlayer === undefined ||
      currentPlayer.isAI ||
      currentPlayer.isEliminated ||
      currentPlayer.isForfeited === true
    ) {
      return;
    }

    if (record.asyncGameId != null) {
      if (record.asyncIsMyTurn === false) {
        showAlert(
          'Not Your Turn',
          'It is no longer your turn. Return to the lobby and reopen the game when it is your turn.',
        );
        return;
      }
      runAsyncForfeitTurn(get, set, record, currentPlayer.id);
      return;
    }

    if (gameState.playMode !== 'passAndPlay') {
      return;
    }
    set({
      isResolvingAiTurns: true,
      queuedOrders: [],
      selectedPlanetId: null,
      pendingFleet: null,
      showingLockScreen: false,
    });
    setTimeout(() => {
      const latest = get().getActiveRecord();
      if (latest === null || latest.id !== record.id) {
        set({ isResolvingAiTurns: false });
        return;
      }
      const sittingOut = markHumanSittingOut(latest.state, currentPlayer.id);
      runSittingOutAiTurn(get, set, latest, sittingOut, currentPlayer.id);
    }, 0);
  },

  rejoinFromForfeit: () => {
    const record = get().getActiveRecord();
    if (record === null || record.state.status !== 'active') {
      return;
    }
    const currentPlayer = record.state.players.find(
      (player) => player.id === record.state.currentPlayerId,
    );
    if (
      currentPlayer === undefined ||
      !needsForfeitPrompt(currentPlayer, record.state.playMode)
    ) {
      return;
    }
    set({
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              state: (() => {
                const players = g.state.players.map((player) =>
                  player.id === currentPlayer.id
                    ? { ...player, isForfeited: false, autoAiUntilEnd: false }
                    : player,
                );
                const rejoined =
                  players.find((player) => player.id === currentPlayer.id) ?? currentPlayer;
                return enqueueCommanderStatusNotice(
                  { ...g.state, players },
                  'rejoin',
                  rejoined,
                );
              })(),
            }
          : g,
      ),
      showingLockScreen: false,
      queuedOrders: [],
      selectedPlanetId: null,
      pendingFleet: null,
    });
  },

  dismissCommanderStatusNotice: () => {
    const record = get().getActiveRecord();
    if (record === null || record.state.status !== 'active') {
      return;
    }
    const viewerId = record.localPlayerId ?? record.state.currentPlayerId;
    const notice = nextCommanderStatusNoticeFor(record.state, viewerId);
    if (notice === null) {
      return;
    }
    const nextState = acknowledgeCommanderStatusNotice(
      record.state,
      viewerId,
      notice.id,
    );
    set({
      games: get().games.map((g) =>
        g.id === record.id ? { ...g, state: nextState } : g,
      ),
    });
  },

  letAiTakeForfeitTurn: (dontAskAgain) => {
    const record = get().getActiveRecord();
    if (record === null || record.state.status !== 'active') {
      return;
    }
    const currentPlayer = record.state.players.find(
      (player) => player.id === record.state.currentPlayerId,
    );
    if (
      currentPlayer === undefined ||
      !needsForfeitPrompt(currentPlayer, record.state.playMode)
    ) {
      return;
    }
    set({
      isResolvingAiTurns: true,
      showingLockScreen: false,
      queuedOrders: [],
      selectedPlanetId: null,
      pendingFleet: null,
    });
    setTimeout(() => {
      const latest = get().getActiveRecord();
      if (latest === null || latest.id !== record.id) {
        set({ isResolvingAiTurns: false });
        return;
      }
      const stateForAi = dontAskAgain
        ? {
            ...latest.state,
            players: latest.state.players.map((player) =>
              player.id === currentPlayer.id
                ? { ...player, autoAiUntilEnd: true }
                : player,
            ),
          }
        : latest.state;
      runSittingOutAiTurn(get, set, latest, stateForAi, currentPlayer.id);
    }, 0);
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
    // Only remove the just-finished game's acknowledgement. Wiping all entries
    // was causing other games' battle reports to re-show after any turn
    // submission, because every game lost its persisted acknowledgement.
    const { [activeGameId ?? '']: _removed, ...remainingAcknowledged } =
      get().acknowledgedBattleReportTurnKeyByGameId;
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
      isResolvingAiTurns: false,
      isSubmittingTurn: false,
      shouldReturnHome: false,
      isViewingFinishedGame: false,
      acknowledgedBattleReportTurnKeyByGameId: remainingAcknowledged,
    });
  },

  clearReturnHome: () => set({ shouldReturnHome: false }),

  markFinalBattleViewed: (gameId) => {
    set({
      finalBattleViewedByGameId: {
        ...get().finalBattleViewedByGameId,
        [gameId]: true,
      },
      isViewingFinishedGame: false,
      shouldReturnHome: true,
    });
  },

  clearPendingTurnReport: () => {
    set({ turnReport: [] });
  },

  acknowledgeBattleReport: () => {
    const record = get().getActiveRecord();
    if (record === null) {
      set({ turnReport: [] });
      return;
    }
    const localPlayerId = record.localPlayerId ?? getLocalHumanPlayerId(record.state);
    const turnKey = battleReportTurnKey(record.id, record.state, localPlayerId, {
      skipActivePlayerCheck: get().isViewingFinishedGame,
    });
    set({
      turnReport: [],
      games: get().games.map((g) =>
        g.id === record.id
          ? {
              ...g,
              pendingTurnReport: undefined,
              pendingTurnReportAcknowledged: true,
            }
          : g,
      ),
      ...(turnKey !== null
        ? {
            acknowledgedBattleReportTurnKeyByGameId: {
              ...get().acknowledgedBattleReportTurnKeyByGameId,
              [record.id]: turnKey,
            },
          }
        : {}),
    });
  },

  setAiObserverMode: (value) => set({ aiObserverMode: value }),

  clearAiObserver: () =>
    set({
      showingAiObserver: false,
      pendingAiTurnInput: null,
      pendingAiPlayerId: null,
      queuedOrders: [],
    }),

  fetchMessages: async (gameId) => {
    set({ isFetchingMessages: true });
    try {
      const response = await fetchMessagesApi(gameId);
      set({ activeGameMessages: response.messages, isFetchingMessages: false });
    } catch {
      set({ isFetchingMessages: false });
    }
  },

  sendMessage: async (gameId, content) => {
    set({ isSendingMessage: true });
    try {
      const response = await sendMessageApi(gameId, content);
      set((state) => ({
        activeGameMessages: [...state.activeGameMessages, response.message],
        isSendingMessage: false,
      }));
    } catch (err) {
      set({ isSendingMessage: false });
      throw err;
    }
  },

  clearMessages: () => {
    set({ activeGameMessages: [] });
  },

  setNotificationBadgeCount: (count) => set({ notificationBadgeCount: count }),

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
      // Session-only fields (e.g. activeGameMessages, notificationBadgeCount) are omitted — not persisted.
      partialize: (state) => ({
        games: state.games.filter((g) => !g.asyncGameId),
        finalBattleViewedByGameId: state.finalBattleViewedByGameId,
        acknowledgedBattleReportTurnKeyByGameId: state.acknowledgedBattleReportTurnKeyByGameId,
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
