self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(clients.claim()); });

const pushChannel = new BroadcastChannel('home-push');

self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = {}; }
  const title = payload.title || 'Gaza Galaxy';
  const notificationData = payload.data || {};
  const options = {
    body: payload.body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: notificationData,
  };
  const refreshMessage = {
    type: 'NOTIFICATION_RECEIVED',
    event: notificationData.event,
    game_id: notificationData.game_id,
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        pushChannel.postMessage(refreshMessage);
        for (const client of clientList) {
          client.postMessage(refreshMessage);
        }
      }),
    ]),
  );
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const gameId = event.notification.data?.game_id;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', game_id: gameId });
          return client.focus();
        }
      }
      return clients.openWindow(gameId ? `/?game_id=${gameId}` : '/');
    })
  );
});
