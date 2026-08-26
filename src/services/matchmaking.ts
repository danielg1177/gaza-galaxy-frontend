import { DEFAULT_PLAYER_NAME } from '../constants/app';
import type { MapSize } from '../game/types';
import {
  generateInitialGameState,
  type GameConfig,
  type PlayerSlot,
} from '../store/gameStore';
import {
  startOpenGame,
  type ApiGame,
  type ApiGamePlayer,
  type ApiMapConfig,
  type ApiOpenGame,
} from './gamesService';

function resolveMapSize(value: string | undefined): MapSize {
  if (value === 'small' || value === 'medium' || value === 'large') {
    return value;
  }
  return 'medium';
}

export function playersToSlots(players: ApiGamePlayer[]): PlayerSlot[] {
  return players.map((player) =>
    player.isAi
      ? { type: 'ai', difficulty: 'hard', name: player.inGameName }
      : { type: 'human', name: player.inGameName, userId: player.userId },
  );
}

export function apiGameToOpenLobby(game: ApiGame): ApiOpenGame {
  const humans = game.players.filter((player) => !player.isAi);
  return {
    id: game.id,
    name: game.name,
    status: game.status,
    host: null,
    mapConfig: game.mapConfig ?? {},
    humanFilled: humans.filter((player) => player.userId != null).length,
    humanTotal: humans.length,
    aiCount: game.players.filter((player) => player.isAi).length,
    isOpenLobby: game.isOpenLobby === true,
    players: game.players,
    createdAt: game.createdAt,
  };
}

export async function startMatchmakingFromLobby(
  lobby: Pick<ApiOpenGame, 'id' | 'mapConfig' | 'players'>,
): Promise<{ game: ApiGame; stateJson: string }> {
  const map: ApiMapConfig = lobby.mapConfig ?? {};
  const playerSlots = playersToSlots(lobby.players);
  const config: GameConfig = {
    playerName: playerSlots[0]?.name ?? DEFAULT_PLAYER_NAME,
    playerSlots,
    mapSize: resolveMapSize(map.mapSize),
    mapWidth: map.mapWidth ?? 286,
    mapHeight: map.mapHeight ?? 286,
    planetCount: map.planetCount ?? 30,
    playMode: 'asyncMultiplayer',
  };
  const seed = typeof map.seed === 'number' ? map.seed : Date.now();
  const initialState = generateInitialGameState(config, seed);
  return startOpenGame(lobby.id, JSON.stringify(initialState));
}
