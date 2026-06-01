type HomeRefreshListener = () => void;

const listeners = new Set<HomeRefreshListener>();

const HOME_REFRESH_NOTIFICATION_EVENTS = new Set([
  'your_turn',
  'game_started',
  'game_finished',
]);

export function shouldRefreshHomeFromNotification(event: unknown): boolean {
  return typeof event === 'string' && HOME_REFRESH_NOTIFICATION_EVENTS.has(event);
}

export function subscribeHomeRefresh(listener: HomeRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestHomeRefresh(): void {
  for (const listener of listeners) {
    listener();
  }
}
