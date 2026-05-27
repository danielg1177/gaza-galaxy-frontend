import { computeAiTurn } from '../game/aiEngine';
import { generateMap } from '../game/mapGenerator';
import { placeSpawns } from '../game/spawnPlacer';
import { resolveTurn } from '../game/turnEngine';
import type { GameMap, GameState, Player } from '../game/types';
import { create } from 'zustand';

export interface GameConfig {
  playerName: string;
  aiCount: number;
  seed: number;
  mapWidth: number;
  mapHeight: number;
  planetCount: number;
}

export interface GameStore {
  gameState: GameState | null;
  config: GameConfig | null;
  selectedPlanetId: string | null;
  startNewGame: (config: GameConfig) => void;
  selectPlanet: (planetId: string | null) => void;
  sendFleet: (fromPlanetId: string, toPlanetId: string, shipCount: number) => void;
  resetGame: () => void;
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

function buildPlayers(map: GameMap, playerIds: string[], config: GameConfig): Player[] {
  return playerIds.map((id, index) => {
    const homePlanet = map.planets.find((p) => p.owner === id && p.isHomePlanet);
    if (homePlanet === undefined) {
      throw new Error(`No home planet found for player ${id}`);
    }
    return {
      id,
      name: index === 0 ? config.playerName : `AI ${index}`,
      homePlanetId: homePlanet.id,
      techLevel: 0,
      resources: 0,
      isEliminated: false,
      isAI: index > 0,
    };
  });
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
  gameState: null,
  config: null,
  selectedPlanetId: null,

  startNewGame: (config) => {
    const playerCount = 1 + config.aiCount;
    const playerIds = createPlayerIds(playerCount);
    const map = generateMap({
      seed: config.seed,
      width: config.mapWidth,
      height: config.mapHeight,
      planetCount: config.planetCount,
      playerCount,
    });
    const mapWithSpawns = placeSpawns(map, playerIds, mulberry32(config.seed + 1));
    const players = buildPlayers(mapWithSpawns, playerIds, config);
    const gameState: GameState = {
      map: mapWithSpawns,
      players,
      fleets: [],
      turnNumber: 1,
      currentPlayerId: players[0].id,
      seed: config.seed,
      status: 'active',
      winnerId: null,
    };
    set({ gameState, config, selectedPlanetId: null });
  },

  selectPlanet: (planetId) => set({ selectedPlanetId: planetId }),

  sendFleet: (fromPlanetId, toPlanetId, shipCount) => {
    const { gameState } = get();
    if (gameState === null || gameState.status !== 'active') {
      return;
    }
    const humanPlayer = gameState.players.find((p) => !p.isAI);
    if (humanPlayer === undefined || gameState.currentPlayerId !== humanPlayer.id) {
      return;
    }
    const nextState = runAiTurnsUntilHuman(
      resolveTurn(gameState, {
        actions: [{ type: 'SEND_FLEET', fromPlanetId, toPlanetId, shipCount }],
        playerId: humanPlayer.id,
      }),
    );
    set({ gameState: nextState });
  },

  resetGame: () => set({ gameState: null, config: null, selectedPlanetId: null }),
}));
