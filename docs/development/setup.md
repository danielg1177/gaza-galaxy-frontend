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

## TypeScript Check
```bash
npx tsc --noEmit
```
Must pass with zero errors before any commit.

## Expo Version
Currently using Expo SDK **54**. Always reference versioned docs at https://docs.expo.dev/versions/v54.0.0/ before using any Expo API.

## Changelog
- 2026-05-27: File created.
