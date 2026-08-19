import type { PlayMode, Player } from './types';

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
