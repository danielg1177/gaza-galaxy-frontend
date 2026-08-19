import type {
  CommanderStatusNotice,
  CommanderStatusNoticeKind,
  GameState,
  PlayMode,
  Player,
} from './types';

/**
 * True when the engine/store should compute this player's turn with `computeAiTurn`.
 * Created AI slots are always controlled this way. Forfeited humans are only
 * auto-played in async multiplayer, or in pass-and-play after they opt out of
 * the per-turn rejoin prompt (`autoAiUntilEnd`).
 */
export function isAiControlled(player: Player, playMode: PlayMode): boolean {
  if (player.isAI) {
    return true;
  }
  if (player.isForfeited !== true || player.isEliminated) {
    return false;
  }
  if (playMode === 'asyncMultiplayer') {
    return true;
  }
  return player.autoAiUntilEnd === true;
}

/**
 * Pass-and-play: this human is sitting out but has not opted out of the prompt,
 * so the UI must ask Rejoin vs let-AI when their slot arrives.
 */
export function needsForfeitPrompt(player: Player, playMode: PlayMode): boolean {
  return (
    playMode === 'passAndPlay' &&
    player.isForfeited === true &&
    player.autoAiUntilEnd !== true &&
    !player.isAI &&
    !player.isEliminated
  );
}

function noticeAudienceIds(state: GameState, subjectId: string): string[] {
  return state.players
    .filter(
      (player) =>
        !player.isAI &&
        !player.isEliminated &&
        player.id !== subjectId &&
        !isAiControlled(player, state.playMode),
    )
    .map((player) => player.id);
}

export function enqueueCommanderStatusNotice(
  state: GameState,
  kind: CommanderStatusNoticeKind,
  player: Player,
): GameState {
  if (player.isAI) {
    return state;
  }
  const audience = noticeAudienceIds(state, player.id);
  if (audience.length === 0) {
    return state;
  }
  const existing = state.commanderStatusNotices ?? [];
  const id = `${kind}-${player.id}-r${state.roundNumber}-t${state.turnNumber}`;
  if (existing.some((notice) => notice.id === id)) {
    return state;
  }
  const notice: CommanderStatusNotice = {
    id,
    kind,
    playerId: player.id,
    playerName: player.name,
    acknowledgedByPlayerIds: [],
  };
  return { ...state, commanderStatusNotices: [...existing, notice] };
}

export function nextCommanderStatusNoticeFor(
  state: GameState,
  viewerId: string | undefined,
): CommanderStatusNotice | null {
  if (viewerId === undefined) {
    return null;
  }
  const viewer = state.players.find((player) => player.id === viewerId);
  if (viewer === undefined || viewer.isAI || viewer.isEliminated) {
    return null;
  }
  const notices = state.commanderStatusNotices ?? [];
  return (
    notices.find(
      (notice) =>
        notice.playerId !== viewerId &&
        !notice.acknowledgedByPlayerIds.includes(viewerId),
    ) ?? null
  );
}

export function acknowledgeCommanderStatusNotice(
  state: GameState,
  viewerId: string,
  noticeId: string,
): GameState {
  const notices = state.commanderStatusNotices ?? [];
  const nextNotices = notices
    .map((notice) => {
      if (notice.id !== noticeId || notice.acknowledgedByPlayerIds.includes(viewerId)) {
        return notice;
      }
      return {
        ...notice,
        acknowledgedByPlayerIds: [...notice.acknowledgedByPlayerIds, viewerId],
      };
    })
    .filter((notice) => {
      const audience = noticeAudienceIds(state, notice.playerId);
      return audience.some((id) => !notice.acknowledgedByPlayerIds.includes(id));
    });
  return { ...state, commanderStatusNotices: nextNotices };
}
