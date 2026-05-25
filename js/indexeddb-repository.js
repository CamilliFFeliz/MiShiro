export class IndexedDbApplicationRepository {
  constructor({
    databaseName,
    storeName,
    stateKey,
    fallbackFactory
  }) {
    this.databaseName = databaseName;
    this.storeName = storeName;
    this.stateKey = stateKey;
    this.fallbackFactory = fallbackFactory;
    this.databasePromise = null;
  }

  async getState() {
    const record = await this.readRecord(this.stateKey);
    return record ? record.value : this.fallbackFactory();
  }

  async saveState(applicationState) {
    await this.writeRecord({
      id: this.stateKey,
      value: applicationState,
      updatedAt: new Date().toISOString()
    });
  }

  async resetState() {
    const initialState = this.fallbackFactory();
    await this.saveState(initialState);
    return initialState;
  }

  async readRecord(recordId) {
    const database = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(recordId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async writeRecord(record) {
    const database = await this.openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  openDatabase() {
    if (this.databasePromise) {
      return this.databasePromise;
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.databasePromise;
  }
}
