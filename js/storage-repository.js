export class LocalStorageRepository {
  constructor(storageKey, fallbackFactory, storage = window.localStorage) {
    this.storageKey = storageKey;
    this.fallbackFactory = fallbackFactory;
    this.storage = storage;
  }

  getState() {
    const serializedState = this.storage.getItem(this.storageKey);

    if (!serializedState) {
      return this.fallbackFactory();
    }

    try {
      return JSON.parse(serializedState);
    } catch (error) {
      return this.fallbackFactory();
    }
  }

  saveState(applicationState) {
    this.storage.setItem(this.storageKey, JSON.stringify(applicationState));
  }

  resetState() {
    const initialState = this.fallbackFactory();
    this.saveState(initialState);
    return initialState;
  }
}
