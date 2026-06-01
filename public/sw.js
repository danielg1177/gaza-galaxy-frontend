self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(clients.claim()); });
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = {}; }
  const title = payload.title || 'Gaza Galaxy';
  const options = {
    body: payload.body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    data: payload.data || {},
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (const client of clientList) {
          client.postMessage({
            type: 'NOTIFICATION_RECEIVED',
            event: payload.data?.event,
            game_id: payload.data?.game_id,
          });
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
