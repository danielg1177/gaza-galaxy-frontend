type HomeRefreshListener = () => void;

const listeners = new Set<HomeRefreshListener>();

const HOME_REFRESH_NOTIFICATION_EVENTS = new Set([
  'your_turn',
  'game_started',
  'game_finished',
  'invite_received',
  'invite_accepted',
  'game_cancelled',
]);

export function shouldRefreshHomeFromNotification(data: unknown): boolean {
  if (data == null || typeof data !== 'object') {
    return true;
  }

  const record = data as Record<string, unknown>;
  if (record.game_id != null) {
    return true;
  }

  if (typeof record.event === 'string') {
    return (
      HOME_REFRESH_NOTIFICATION_EVENTS.has(record.event) || record.event.length > 0
    );
  }

  return Object.keys(record).length === 0;
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

const PUSH_BROADCAST_CHANNEL = 'home-push';

export function setupPushHomeRefreshBridge(): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {};
  }

  const channel = new BroadcastChannel(PUSH_BROADCAST_CHANNEL);
  channel.onmessage = () => {
    requestHomeRefresh();
  };

  return () => {
    channel.close();
  };
}

export { PUSH_BROADCAST_CHANNEL };
