# Development Setup

## Prerequisites
- Node.js (LTS)
- npm
- Expo CLI (`npm install -g expo-cli` or use `npx expo`)
- iOS Simulator (Xcode) or physical iPhone with Expo Go

## Installation
```bash
git clone <repo>
cd strategic-commander
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
- 2026-05-27: File created.
