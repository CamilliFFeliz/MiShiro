import { readStorageItem, removeStorageItem, writeStorageItem, toPlainData } from "./utils.js";

const DATABASE_NAME = "CalculadoraTattooDB";
const DATABASE_VERSION = 1;
const APP_STATE_STORE = "appState";
const APP_STATE_ID = "current";
const SAVE_DEBOUNCE_MS = 180;

let databasePromise = null;
let fallbackStorageKey = "CALCULADORA_TATTOO_STATE_V5";
let pendingSaveTimeoutId = 0;

export async function loadAppState({ storageKey, legacyStorageKeys, createInitialState, normalizeAppState }) {
  fallbackStorageKey = storageKey || fallbackStorageKey;

  const indexedState = await readIndexedAppState().catch(() => null);

  if (indexedState) {
    return normalizeAppState(indexedState);
  }

  const legacyState = readLegacyAppState(storageKey, legacyStorageKeys);

  if (legacyState) {
    const normalizedLegacyState = normalizeAppState(legacyState);
    const hasMigrated = await saveAppStateNow(normalizedLegacyState).catch(() => false);

    if (hasMigrated) {
      clearLegacyAppState(legacyStorageKeys);
    }

    return normalizedLegacyState;
  }

  const initialState = createInitialState();
  await saveAppStateNow(initialState).catch(() => {});
  return initialState;
}

export function createReactiveState(initialState, onChange) {
  const proxyCache = new WeakMap();

  const wrapValue = (targetValue, path = []) => {
    if (!targetValue || typeof targetValue !== "object") {
      return targetValue;
    }

    if (proxyCache.has(targetValue)) {
      return proxyCache.get(targetValue);
    }

    const proxy = new Proxy(targetValue, {
      get(target, property, receiver) {
        return wrapValue(Reflect.get(target, property, receiver), [...path, property]);
      },
      set(target, property, value, receiver) {
        const previousValue = target[property];
        const success = Reflect.set(target, property, value, receiver);

        if (success && previousValue !== value) {
          onChange([...path, property].map(String));
        }

        return success;
      },
      deleteProperty(target, property) {
        const success = Reflect.deleteProperty(target, property);

        if (success) {
          onChange([...path, property].map(String));
        }

        return success;
      }
    });

    proxyCache.set(targetValue, proxy);
    return proxy;
  };

  return wrapValue(initialState);
}

export function scheduleSaveAppState(appState) {
  window.clearTimeout(pendingSaveTimeoutId);
  pendingSaveTimeoutId = window.setTimeout(() => {
    saveAppStateNow(appState).catch(() => {});
  }, SAVE_DEBOUNCE_MS);
}

export async function saveAppStateNow(appState) {
  const plainState = toPlainData(appState);

  if (!("indexedDB" in window)) {
    return writeFallbackAppState(plainState);
  }

  try {
    const database = await openDatabase();

    await new Promise((resolve, reject) => {
      const transaction = database.transaction(APP_STATE_STORE, "readwrite");
      transaction.objectStore(APP_STATE_STORE).put({
        id: APP_STATE_ID,
        updatedAt: new Date().toISOString(),
        value: plainState
      });
      transaction.addEventListener("complete", () => resolve(true));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });

    writeFallbackAppState(plainState);
    return true;
  } catch {
    return writeFallbackAppState(plainState);
  }
}

async function readIndexedAppState() {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(APP_STATE_STORE, "readonly");
    const request = transaction.objectStore(APP_STATE_STORE).get(APP_STATE_ID);
    request.addEventListener("success", () => resolve(request.result?.value || null));
    request.addEventListener("error", () => reject(request.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

function openDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB indisponível."));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.addEventListener("upgradeneeded", () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(APP_STATE_STORE)) {
          database.createObjectStore(APP_STATE_STORE, { keyPath: "id" });
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("blocked", () => reject(request.error || new Error("A abertura do banco local foi bloqueada.")));
    });
  }

  return databasePromise;
}

function readLegacyAppState(storageKey, legacyStorageKeys) {
  const storageKeys = [storageKey, ...legacyStorageKeys];
  const legacyState = storageKeys.map(readStorageItem).find(Boolean);

  if (!legacyState) {
    return null;
  }

  try {
    return JSON.parse(legacyState);
  } catch {
    return null;
  }
}

function clearLegacyAppState(legacyStorageKeys) {
  legacyStorageKeys.forEach(removeStorageItem);
}

function writeFallbackAppState(appState) {
  try {
    return writeStorageItem(fallbackStorageKey, JSON.stringify(toPlainData(appState)));
  } catch {
    return false;
  }
}
