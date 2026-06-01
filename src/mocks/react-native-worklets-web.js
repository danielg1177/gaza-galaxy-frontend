/**
 * Web stub for react-native-worklets.
 *
 * react-native-worklets calls init() at import time which crashes on web in
 * both dev and prod: with the babel plugin enabled it tries to serialize
 * worklet descriptors via JSWorklets which throws; without the plugin the
 * dev-mode runtime check fails because isWorkletFunction returns false.
 *
 * For a web-only PWA there is no UI thread — all "worklet" execution is just
 * regular JS.  This stub is loaded in place of the real package (via Metro
 * resolveRequest) and provides every export that react-native-reanimated
 * imports, implemented as synchronous JS pass-throughs.
 */

// ─── RuntimeKind ─────────────────────────────────────────────────────────────

export const RuntimeKind = {
  ReactNative: 0,
  Worklet: 1,
  Node: 2,
};

export function getRuntimeKind() {
  return RuntimeKind.ReactNative;
}

// ─── Thread scheduling ────────────────────────────────────────────────────────

// On web the "UI thread" is the same JS thread. Call the function directly.
export function runOnUI(fn) {
  return (...args) => fn(...args);
}

export function runOnUIAsync(fn) {
  return (...args) =>
    new Promise((resolve) => {
      resolve(fn(...args));
    });
}

export function runOnUISync(fn) {
  return (...args) => fn(...args);
}

export function runOnJS(fn) {
  return fn;
}

export function executeOnUIRuntimeSync(fn) {
  return fn();
}

export function scheduleOnUI(fn) {
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(fn);
  } else {
    fn();
  }
}

export function scheduleOnRN(fn) {
  fn();
}

export function callMicrotasks() {}

export function unstable_eventLoopTask(fn) {
  return fn;
}

// ─── Worklet identity ─────────────────────────────────────────────────────────

// No babel transformation on web — no function is a "worklet descriptor".
export function isWorkletFunction() {
  return false;
}

// ─── Shareable / serializable ─────────────────────────────────────────────────

export function makeShareable(value) {
  return value;
}

export function isShareableRef() {
  return false;
}

export function makeShareableCloneOnUIRecursive(value) {
  return value;
}

export function makeShareableCloneRecursive(value) {
  return value;

}

export function createSerializable(value) {
  return value;
}

export function isSerializableRef() {
  return false;
}

// No-op cache — mirrors the real web implementation in serializableMappingCache.js
export const serializableMappingCache = {
  set() {},
  get() {
    return null;
  },
};

export const shareableMappingCache = serializableMappingCache;

// ─── Synchronizable ───────────────────────────────────────────────────────────

export function createSynchronizable(value) {
  return value;
}

export function isSynchronizable() {
  return false;
}

// ─── Worklet runtimes ─────────────────────────────────────────────────────────

export function createWorkletRuntime() {
  return null;
}

export function runOnRuntime(_runtime, fn) {
  return fn;
}

// ─── WorkletsModule ───────────────────────────────────────────────────────────
// Mirrors JSWorklets — every serialization method is a no-op; scheduleOnUI uses RAF.

export const WorkletsModule = {
  scheduleOnUI(fn) {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(fn);
    } else {
      fn();
    }
  },
  executeOnUIRuntimeSync() {},
  createWorkletRuntime() {},
  scheduleOnRuntime() {},
  createSerializable() {},
  createSerializableString() {},
  createSerializableNumber() {},
  createSerializableBoolean() {},
  createSerializableBigInt() {},
  createSerializableUndefined() {},
  createSerializableNull() {},
  createSerializableTurboModuleLike() {},
  createSerializableObject() {},
  createSerializableMap() {},
  createSerializableSet() {},
  createSerializableImport() {},
  createSerializableHostObject() {},
  createSerializableArray() {},
  createSerializableInitializer() {},
  createSerializableFunction() {},
  createSerializableWorklet() {},
  createSynchronizable() {},
  synchronizableGetDirty() {},
  synchronizableGetBlocking() {},
  synchronizableSetBlocking() {},
  synchronizableLock() {},
  synchronizableUnlock() {},
  reportFatalErrorOnJS() {},
  getStaticFeatureFlag() {
    return false;
  },
  setDynamicFeatureFlag() {},
};

// ─── Feature flags ────────────────────────────────────────────────────────────

export function getStaticFeatureFlag() {
  return false;
}

export function setDynamicFeatureFlag() {}
