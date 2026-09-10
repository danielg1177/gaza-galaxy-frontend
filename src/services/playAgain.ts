import { DEFAULT_PLAYER_NAME } from '../constants/app';
import type { MapSize } from '../game/types';
import type { PlayerSlot } from '../store/gameStore';
import type { ApiGame, ApiGamePlayer } from './gamesService';

export function resolveMapSize(value: string | undefined): MapSize {
  if (value === 'small' || value === 'medium' || value === 'large') {
    return value;
  }
  return 'medium';
}

function findHumanSlotIndex(
  slots: PlayerSlot[],
  userId: number | undefined,
): number {
  if (userId == null) {
    return -1;
  }
  return slots.findIndex(
    (slot) => slot.type === 'human' && slot.userId === userId,
  );
}

function swapSlots(slots: PlayerSlot[], a: number, b: number): void {
  if (a === b || a < 0 || b < 0) {
    return;
  }
  const tmp = slots[a];
  slots[a] = slots[b];
  slots[b] = tmp;
}

/**
 * Rebuild Create Game slots from an existing match. Copies roster settings
 * only (human vs AI, user ids, campaign names). Does not copy map/state.
 *
 * If the current user did not create the original game, they swap seats with
 * the original creator so they become slot 0 (the new owner).
 */
export function buildPlayAgainSlots(
  game: ApiGame,
  currentUser: { id: number; username: string },
): { slots: PlayerSlot[] } | { error: string } {
  const slots: PlayerSlot[] = game.players.map((player) =>
    player.isAi
      ? { type: 'ai', difficulty: 'hard' }
      : {
          type: 'human',
          name: player.inGameName.trim() || DEFAULT_PLAYER_NAME,
          userId: player.userId,
        },
  );

  const myIndex = findHumanSlotIndex(slots, currentUser.id);
  if (myIndex < 0) {
    return { error: 'You are not a player in this game.' };
  }

  const creatorId =
    game.createdByUserId ??
    (slots[0]?.type === 'human' ? slots[0].userId : undefined);

  if (creatorId != null && creatorId !== currentUser.id) {
    const creatorIndex = findHumanSlotIndex(slots, creatorId);
    swapSlots(slots, creatorIndex, myIndex);
  }

  const newMyIndex = findHumanSlotIndex(slots, currentUser.id);
  if (newMyIndex > 0) {
    swapSlots(slots, 0, newMyIndex);
  }

  slots[0] = {
    type: 'human',
    name: currentUser.username.trim() || DEFAULT_PLAYER_NAME,
    userId: currentUser.id,
  };

  for (let i = 1; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.type !== 'human') {
      continue;
    }
    if (slot.userId == null) {
      return {
        error: 'A player from this game no longer has an account.',
      };
    }
  }

  return { slots };
}

export function findLocalApiPlayer(
  game: ApiGame,
  userId: number | undefined,
  username: string | undefined,
): ApiGamePlayer | undefined {
  if (userId != null) {
    const byId = game.players.find(
      (player) => !player.isAi && player.userId === userId,
    );
    if (byId != null) {
      return byId;
    }
  }
  if (username != null && username !== '') {
    return game.players.find(
      (player) => !player.isAi && player.inGameName === username,
    );
  }
  return undefined;
}

export function canForfeitAsyncGame(
  game: ApiGame,
  userId: number | undefined,
  username: string | undefined,
): boolean {
  if (game.status !== 'in_progress') {
    return false;
  }
  const player = findLocalApiPlayer(game, userId, username);
  if (player == null || player.isEliminated || player.isForfeited === true) {
    return false;
  }
  return true;
}
