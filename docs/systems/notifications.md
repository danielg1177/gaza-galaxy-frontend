# Push Notifications System

## Status
**Phase 16 complete — Tasks 147–148 done (client token registration + deep-link handler). Depends on backend (Phase 12) for `POST /api/push-token` and push delivery.**

## Overview
Push notifications via Expo Notifications, triggered by the Laravel backend after game events.
Tapping a notification deep-links the user directly into the relevant game.

---

## Technology
- **Client:** `expo-notifications` (Expo SDK 54)
- **Backend:** Expo Push API (`https://exp.host/--/api/v2/push/send`) called from Laravel
- **Token storage:** `expo_push_token` column on `users` table
- **Token registration:** Client registers/updates token via `POST /api/push-token` on app startup

---

## Client Setup

### Permission Request
- Request notification permissions on first app launch after login
- Use `Notifications.requestPermissionsAsync()` from `expo-notifications`
- If granted: fetch the Expo push token and upload to API
- Permission request happens once; if denied, skip silently (user can enable later in Settings)

### Token Registration Flow
1. App launches (user is logged in)
2. `App.tsx` calls `setupPushNotifications()` when `currentUser` is non-null
3. `setupPushNotifications()` in `src/services/pushNotificationService.ts`:
   - Requests permissions via `Notifications.requestPermissionsAsync()`; returns early if not granted
   - Calls `Notifications.getExpoPushTokenAsync()` to get the device token
   - Compares with stored token in AsyncStorage (`push_token` key); if unchanged, skips upload
   - If changed or not stored: `POST /api/push-token` via `apiClient.post('/push-token', { token })`
   - On success, stores token in AsyncStorage
   - All errors swallowed silently

### Notification Handler
`registerNotificationHandler()` is called once at module level in `App.tsx`. It registers:
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```
For foreground notifications: display an in-app banner or silently update the HomeScreen game list.

### Deep-Link Handler
Implemented in `App.tsx` (Task 148):

1. `Notifications.addNotificationResponseReceivedListener` extracts `game_id` from `response.notification.request.content.data` and stores it in a `pendingGameId` ref.
2. **Cold start:** if auth is not yet resolved, the game ID waits in the ref; a `useEffect` on `currentUser` calls `consumePendingGameId()` once `currentUser` is non-null and `isLoadingAuth` is false.
3. **Warm start:** if the user is already authenticated when the notification is tapped, `consumePendingGameId()` is invoked directly from the listener.
4. `consumePendingGameId()` calls `getGame(gameId)`, `loadAsyncGame(detail)`, then navigates `Home` → `Game` with `{ isReadOnly: detail.alertState === 'waiting' }` via `useNavigationContainerRef`. All errors swallowed silently.

When a user taps a notification:
1. Extract `game_id` from the notification data payload
2. If the app is already open: navigate to that game directly
3. If the app is launching from a notification tap: after auth check resolves, navigate to the game

**Notification data payload format:**
```json
{ "game_id": 42, "event": "your_turn" | "game_started" | "game_finished" | "invite_received" }
```

---

## Backend: When to Send Notifications

### Turn notifications
Sent from `POST /api/games/{id}/turn/submit` after the turn is stored:
- Send to: the next human player (looked up via `game_players.user_id` for `resulting_state.currentPlayerId`)
- Title: `"Your Turn!"`
- Body: `"It's your turn in {game.name}"`
- Data: `{ game_id: {id}, event: "your_turn" }`

### Game started
Sent from the invite-accept flow when the last invite is accepted and the game starts:
- Send to: the first human player in turn order
- Title: `"Game Started!"`
- Body: `"Your game '{game.name}' has started — it's your first turn!"`
- Data: `{ game_id: {id}, event: "game_started" }`

### Game invite received
Sent from `POST /api/games` when the game is created:
- Send to: each invited user
- Title: `"Game Invite"`
- Body: `"{creator_username} invited you to play Gaza Galaxy"`
- Data: `{ game_id: {id}, event: "invite_received" }`

### Game finished
Sent from `POST /api/games/{id}/turn/submit` when `resulting_state.status = 'finished'`:
- Send to: all human players in the game
- Winner: Title: `"Victory!"`, Body: `"You won '{game.name}'!"`
- Others: Title: `"Game Over"`, Body: `"'{game.name}' has ended"`
- Data: `{ game_id: {id}, event: "game_finished" }`

### Invite declined (game cancelled)
Sent from `POST /api/invites/{id}/decline`:
- Send to: game creator
- Title: `"Invite Declined"`
- Body: `"{username} declined your invite — the game has been cancelled"`
- Data: `{ game_id: {id}, event: "game_cancelled" }`

---

## Client: In-App Turn Alerts
In addition to push notifications, the HomeScreen polls for updated game state:
- On HomeScreen focus (each time the user navigates to it): refresh the games list from `GET /api/games`
- This ensures turn alert badges are always current even if the push notification was missed

---

## Expo Push API Usage (Backend)
```php
Http::post('https://exp.host/--/api/v2/push/send', [
    'to'    => $user->expo_push_token,
    'title' => $title,
    'body'  => $body,
    'data'  => $data,
    'sound' => 'default',
]);
```
Batch multiple tokens by passing an array to `to` when notifying multiple players simultaneously.

---

## Changelog
- 2026-05-29: Task 148 complete — `App.tsx` deep-link handler: notification response listener, `pendingGameId` ref, imperative navigation via `useNavigationContainerRef`, `getGame` + `loadAsyncGame` flow matching HomeScreen async card tap.
- 2026-05-29: Task 147 complete — `src/services/pushNotificationService.ts` implements `registerNotificationHandler()` and `setupPushNotifications()`; `App.tsx` wires module-level handler and post-login token upload with AsyncStorage dedup (`push_token` key).
- 2026-05-29: Full spec written — Expo push setup, deep-link handler, all trigger events, backend call format. Phase 16 planning complete.
- 2026-05-27: File created. Not yet in scope.
