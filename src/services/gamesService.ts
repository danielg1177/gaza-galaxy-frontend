import type { TurnEvent } from '../game/types';
import { apiClient } from './apiClient';

export interface ApiGamePlayer {
  inGameName: string;
  isAi: boolean;
  isEliminated: boolean;
  userId?: number;
}

export interface ApiGame {
  id: number;
  name: string;
  createdByUserId?: number;
  /** Set when the list/detail payload includes an explicit creator flag. */
  isCreator?: boolean;
  status: 'waiting_for_players' | 'in_progress' | 'finished';
  playMode: 'pass_and_play' | 'async_multiplayer';
  alertState:
    | 'your_turn'
    | 'in_progress'
    | 'waiting'
    | 'waiting_for_players'
    | 'finished';
  isMyTurn: boolean;
  hasInProgressActions: boolean;
  players: ApiGamePlayer[];
  currentPlayerName: string;
  roundNumber: number;
  turnNumber: number;
  createdAt: string;
}

export interface InProgressTurnPayload {
  partialStateJson: string;
  queuedOrders: Array<{
    fromPlanetId: string;
    toPlanetId: string;
    shipCount: number;
  }>;
}

export interface ApiGameDetail extends ApiGame {
  stateJson: string;
  inProgressActions: InProgressTurnPayload | null;
  latestEvents: TurnEvent[];
}

export interface SubmitTurnPayload {
  actions: unknown[];
  resultingState: unknown;
  turnNumber: number;
  roundNumber: number;
  events?: TurnEvent[];
}

export interface CreateGamePayload {
  name: string;
  playMode: 'async_multiplayer';
  mapConfig: {
    mapSize: string;
    mapWidth: number;
    mapHeight: number;
    planetCount: number;
    seed: number;
  };
  playerSlots: Array<{
    type: 'human' | 'ai';
    userId: number | null;
    name: string;
    difficulty?: string;
  }>;
  /** Fully-generated initial GameState serialised as JSON. When provided the
   *  backend stores it directly and skips running the engine init script. */
  stateJson?: string;
}

export interface ApiInvite {
  id: number;
  game: { id: number; name: string };
  inviter: { id: number; username: string };
  createdAt: string;
}

interface ApiGamePlayerRaw {
  in_game_name: string;
  is_ai: boolean;
  is_eliminated: boolean;
  user_id?: number;
}

interface ApiCreatedByRaw {
  id?: number;
}

interface ApiGameRaw {
  id: number;
  name: string;
  created_by_user_id?: number | string;
  creator_id?: number | string;
  created_by?: ApiCreatedByRaw;
  is_creator?: boolean;
  you_created_this?: boolean;
  status: 'waiting_for_players' | 'in_progress' | 'finished';
  play_mode: 'pass_and_play' | 'async_multiplayer';
  alert_state: ApiGame['alertState'];
  is_my_turn: boolean;
  has_in_progress_actions: boolean;
  players: ApiGamePlayerRaw[];
  current_player_name: string;
  round_number: number;
  turn_number: number;
  created_at: string;
}

interface InProgressActionsRaw {
  partial_state_json: string;
  queued_orders: InProgressTurnPayload['queuedOrders'];
}

interface GamesListResponse {
  games: ApiGameRaw[];
}

interface GameDetailResponse {
  game: {
    id: number;
    name: string;
    status: ApiGameRaw['status'];
    play_mode: ApiGameRaw['play_mode'];
    round_number: number;
    turn_number: number;
    players?: ApiGamePlayerRaw[];
    current_player_name?: string;
    has_in_progress_actions?: boolean;
    created_at?: string;
  };
  state_json: string;
  is_my_turn: boolean;
  alert_state: ApiGameRaw['alert_state'];
  in_progress_actions: InProgressActionsRaw | null;
  latest_events?: TurnEvent[];
}

interface CreateGameResponseRaw {
  game: ApiGameRaw;
  state_json: string;
}

export interface CreateGameResponse {
  game: ApiGame;
  stateJson: string;
}

interface InvitesListResponse {
  invites: ApiInviteRaw[];
}

interface ApiInviteRaw {
  id: number;
  game: { id: number; name: string };
  inviter: { id: number; username: string };
  created_at: string;
}

interface AcceptInviteResponse {
  accepted: boolean;
  game_started: boolean;
}

function toOptionalUserId(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const id = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(id) ? id : undefined;
}

/** True when the authenticated user created this game (for delete UI). */
export function isCurrentUserGameCreator(
  game: ApiGame,
  userId: number | undefined,
  username?: string,
): boolean {
  if (game.isCreator === true) {
    return true;
  }

  if (userId != null) {
    const myId = Number(userId);
    const creatorId = toOptionalUserId(game.createdByUserId);
    if (creatorId != null && creatorId === myId) {
      return true;
    }

    // Backend places the creator in turn-order slot 0 with their user_id.
    const slot0 = game.players[0];
    if (
      slot0 != null &&
      !slot0.isAi &&
      slot0.userId != null &&
      Number(slot0.userId) === myId
    ) {
      return true;
    }
  }

  // Fallback when list payload omits creator ids: slot 0 is the creator's in-game name.
  if (username != null && username.trim() !== '') {
    const slot0 = game.players[0];
    if (
      slot0 != null &&
      !slot0.isAi &&
      slot0.inGameName.trim().toLowerCase() === username.trim().toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}

function mapGamePlayer(api: ApiGamePlayerRaw): ApiGamePlayer {
  return {
    inGameName: api.in_game_name,
    isAi: api.is_ai,
    isEliminated: api.is_eliminated,
    userId: toOptionalUserId(api.user_id),
  };
}

function mapGame(api: ApiGameRaw): ApiGame {
  const createdByUserId =
    toOptionalUserId(api.created_by_user_id) ??
    toOptionalUserId(api.creator_id) ??
    toOptionalUserId(api.created_by?.id);

  return {
    id: api.id,
    name: api.name,
    createdByUserId,
    isCreator: api.is_creator === true || api.you_created_this === true ? true : undefined,
    status: api.status,
    playMode: api.play_mode,
    alertState: api.alert_state,
    isMyTurn: api.is_my_turn,
    hasInProgressActions: api.has_in_progress_actions,
    players: api.players.map(mapGamePlayer),
    currentPlayerName: api.current_player_name,
    roundNumber: api.round_number,
    turnNumber: api.turn_number,
    createdAt: api.created_at,
  };
}

function mapInProgressActions(api: InProgressActionsRaw): InProgressTurnPayload {
  return {
    partialStateJson: api.partial_state_json,
    queuedOrders: api.queued_orders,
  };
}

function mapGameDetail(data: GameDetailResponse): ApiGameDetail {
  const { game } = data;
  const base = mapGame({
    id: game.id,
    name: game.name,
    status: game.status,
    play_mode: game.play_mode,
    alert_state: data.alert_state,
    is_my_turn: data.is_my_turn,
    has_in_progress_actions:
      game.has_in_progress_actions ?? data.in_progress_actions != null,
    players: game.players ?? [],
    current_player_name: game.current_player_name ?? '',
    round_number: game.round_number,
    turn_number: game.turn_number,
    created_at: game.created_at ?? '',
  });

  return {
    ...base,
    stateJson: data.state_json,
    inProgressActions: data.in_progress_actions
      ? mapInProgressActions(data.in_progress_actions)
      : null,
    latestEvents: data.latest_events ?? [],
  };
}

function mapInvite(api: ApiInviteRaw): ApiInvite {
  return {
    id: api.id,
    game: api.game,
    inviter: api.inviter,
    createdAt: api.created_at,
  };
}

export async function listGames(): Promise<ApiGame[]> {
  const data = await apiClient.get<GamesListResponse>('/games');
  return data.games.map(mapGame);
}

export async function getGame(id: number): Promise<ApiGameDetail> {
  const data = await apiClient.get<GameDetailResponse>(`/games/${id}`);
  return mapGameDetail(data);
}

export async function createGame(payload: CreateGamePayload): Promise<CreateGameResponse> {
  const body: Record<string, unknown> = {
    name: payload.name,
    play_mode: payload.playMode,
    map_config: payload.mapConfig,
    player_slots: payload.playerSlots.map((slot) => ({
      type: slot.type,
      user_id: slot.userId,
      name: slot.name,
      ...(slot.difficulty != null ? { difficulty: slot.difficulty } : {}),
    })),
  };
  if (payload.stateJson != null) {
    body.state_json = payload.stateJson;
  }
  const data = await apiClient.post<CreateGameResponseRaw>('/games', body);
  return {
    game: mapGame(data.game),
    stateJson: data.state_json,
  };
}

export async function deleteGame(id: number): Promise<void> {
  await apiClient.delete(`/games/${id}`);
}

export async function saveTurnProgress(
  gameId: number,
  payload: InProgressTurnPayload,
): Promise<void> {
  await apiClient.post(`/games/${gameId}/turn/save`, {
    in_progress_actions: {
      partial_state_json: payload.partialStateJson,
      queued_orders: payload.queuedOrders ?? [],
    },
  });
}

export async function submitTurn(
  gameId: number,
  payload: SubmitTurnPayload,
): Promise<void> {
  await apiClient.post(`/games/${gameId}/turn/submit`, {
    actions: payload.actions,
    resulting_state: payload.resultingState,
    turn_number: payload.turnNumber,
    round_number: payload.roundNumber,
    events: payload.events ?? [],
  });
}

export async function listInvites(): Promise<ApiInvite[]> {
  const data = await apiClient.get<InvitesListResponse>('/invites');
  return data.invites.map(mapInvite);
}

export async function acceptInvite(
  inviteId: number,
): Promise<{ gameStarted: boolean }> {
  const data = await apiClient.post<AcceptInviteResponse>(
    `/invites/${inviteId}/accept`,
  );
  return { gameStarted: data.game_started };
}

export async function declineInvite(inviteId: number): Promise<void> {
  await apiClient.post(`/invites/${inviteId}/decline`);
}
