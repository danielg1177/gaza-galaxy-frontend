import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LEGACY_LOCAL_GAMES_STORAGE_KEY,
  LOCAL_GAMES_STORAGE_KEY,
} from '../constants/app';

let migrationPromise: Promise<void> | null = null;

/** Ensures legacy storage key is copied before any persist read (idempotent). */
export function ensureStorageMigrated(): Promise<void> {
  migrationPromise ??= migrateLocalGamesStorageKey();
  return migrationPromise;
}

/** One-time migration so local saves survive the app rename. */
export async function migrateLocalGamesStorageKey(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(LOCAL_GAMES_STORAGE_KEY);
    if (existing !== null) {
      return;
    }
    const legacy = await AsyncStorage.getItem(LEGACY_LOCAL_GAMES_STORAGE_KEY);
    if (legacy !== null) {
      await AsyncStorage.setItem(LOCAL_GAMES_STORAGE_KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_LOCAL_GAMES_STORAGE_KEY);
    }
  } catch {
    // Non-fatal — persist will start with an empty games list.
  }
}
