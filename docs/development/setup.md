# Development Setup

## Prerequisites
- Node.js (LTS)
- npm
- Expo CLI (`npm install -g expo-cli` or use `npx expo`)
- iOS Simulator (Xcode) or physical iPhone with Expo Go

## Installation
```bash
git clone <repo>
cd gaza-galaxy
npm install
```

## Running the App
```bash
npx expo start
```
Then press `i` to open in iOS Simulator, or scan the QR code with Expo Go on iPhone.

After changing `metro.config.js` or adding Reanimated/Worklets, clear the Metro cache once:
```bash
npx expo start --clear
```

## Metro / Reanimated
`metro.config.js` sets `inlineRequires: true`. Expo’s default (`false`) breaks Reanimated 4 / Worklets init and causes `[runtime not ready]: Exception in HostFunction` on launch. `react-native-worklets` is a direct dependency (Expo SDK 54 peer of `react-native-reanimated`).

## TypeScript Check
```bash
npx tsc --noEmit
```
Must pass with zero errors before any commit.

## Expo Version
Currently using Expo SDK **54**. Always reference versioned docs at https://docs.expo.dev/versions/v54.0.0/ before using any Expo API.

## Changelog
- 2026-06-01: App package/slug renamed to `gaza-galaxy`; setup `cd` path updated.
- 2026-05-27: File created.

## PWA Build & Deploy
1. Copy `.env.example` → `.env` and fill in both values.
2. `npm run build:web` — outputs static bundle to `dist/`.
3. Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, etc.).
4. The backend must be live at `EXPO_PUBLIC_API_URL`.
**Installing on iOS:** Open in Safari → Share → "Add to Home Screen" → runs in standalone mode (requires iOS 16.4+ for push notifications).  
**Installing on Android:** Chrome will auto-prompt after a couple of visits, or use the browser menu.
**Push notifications:** Background push requires Backend Phase 9 tasks to be deployed (VAPID keys + `POST /api/push-subscription` endpoint). Without them the app works fully — push notifications just won't be delivered in the background.
