/**
 * Database.js - Abstração IndexedDB
 * 
 * Gerencia persistência de dados com:
 * - Transações seguras
 * - Versionamento automático
 * - Migração de dados
 * - Fallback para localStorage
 */

class Database {
  constructor(dbName = 'CalculadoraTattoo', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.isSupported = 'indexedDB' in window;
    this.initialized = false;
    this.stores = new Map();
  }

  /**
   * Inicializa a conexão com banco de dados
   */
  async initialize() {
    if (this.initialized) {
      return this.db;
    }

    if (!this.isSupported) {
      console.warn('[Database] IndexedDB não suportado, usando localStorage como fallback');
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[Database] Erro ao abrir:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('[Database] Conectado com sucesso');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[Database] Upgrade iniciado para versão', this.version);

        // Criar object stores padrão
        this.createDefaultStores(db);

        // Executar migrations customizadas
        this.onUpgrade?.(db, event.oldVersion, this.version);
      };
    });
  }

  /**
   * Define callback para upgrade/migration
   */
  onUpgrade(callback) {
    this.upgradeCallback = callback;
    return this;
  }

  /**
   * Cria object stores padrão
   */
  createDefaultStores(db) {
    const storeNames = ['inventory', 'budgets', 'settings', 'appState'];

    storeNames.forEach((storeName) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        console.log('[Database] Object store criado:', storeName);
      }
    });
  }

  /**
   * Persiste dados em um store
   */
  async save(storeName, data) {
    if (!this.isSupported) {
      return this.saveFallback(storeName, data);
    }

    const db = await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Adiciona timestamps
      const dataWithMeta = {
        ...data,
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString()
      };

      const request = store.put(dataWithMeta);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[Database] Dados salvos em ${storeName}`);
        resolve(dataWithMeta);
      };
    });
  }

  /**
   * Recupera um item por ID
   */
  async get(storeName, id) {
    if (!this.isSupported) {
      return this.getFallback(storeName, id);
    }

    const db = await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Lista todos os itens de um store
   */
  async getAll(storeName, query = null) {
    if (!this.isSupported) {
      return this.getAllFallback(storeName);
    }

    const db = await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = query ? store.getAll(query) : store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Busca usando índice
   */
  async query(storeName, indexName, value) {
    if (!this.isSupported) {
      return [];
    }

    const db = await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  /**
   * Deleta um item
   */
  async delete(storeName, id) {
    if (!this.isSupported) {
      return this.deleteFallback(storeName, id);
    }

    const db = await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[Database] Item deletado de ${storeName}: ${id}`);
        resolve();
      };
    });
  }

  /**
   * Limpa todos os dados de um store
   */
  async clear(storeName) {
    if (!this.isSupported) {
      return this.clearFallback(storeName);
    }

    const db = await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[Database] Store limpo: ${storeName}`);
        resolve();
      };
    });
  }

  /**
   * Exporta todos os dados
   */
  async export() {
    const stores = ['inventory', 'budgets', 'settings', 'appState'];
    const exportData = {};

    for (const storeName of stores) {
      try {
        exportData[storeName] = await this.getAll(storeName);
      } catch (error) {
        console.warn(`[Database] Erro ao exportar ${storeName}:`, error);
        exportData[storeName] = [];
      }
    }

    return {
      version: this.version,
      exportedAt: new Date().toISOString(),
      data: exportData
    };
  }

  /**
   * Importa dados
   */
  async import(importData) {
    if (!importData.data) {
      throw new Error('Formato de backup inválido');
    }

    for (const [storeName, items] of Object.entries(importData.data)) {
      try {
        // Limpa store atual
        await this.clear(storeName);

        // Importa dados
        for (const item of items) {
          await this.save(storeName, item);
        }

        console.log(`[Database] ${items.length} itens importados para ${storeName}`);
      } catch (error) {
        console.error(`[Database] Erro ao importar ${storeName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Fallback para localStorage quando IndexedDB não está disponível
   */
  saveFallback(storeName, data) {
    const key = `${this.dbName}:${storeName}`;
    const items = this.getAllFallback(storeName);
    const index = items.findIndex((item) => item.id === data.id);

    if (index !== -1) {
      items[index] = { ...items[index], ...data };
    } else {
      items.push(data);
    }

    try {
      localStorage.setItem(key, JSON.stringify(items));
      return Promise.resolve(data);
    } catch (error) {
      console.error('[Database] localStorage quota exceeded:', error);
      return Promise.reject(error);
    }
  }

  getFallback(storeName, id) {
    const key = `${this.dbName}:${storeName}`;
    const items = this.getAllFallback(storeName);
    return Promise.resolve(items.find((item) => item.id === id) || null);
  }

  getAllFallback(storeName) {
    const key = `${this.dbName}:${storeName}`;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Database] localStorage parse error:', error);
      return [];
    }
  }

  deleteFallback(storeName, id) {
    const key = `${this.dbName}:${storeName}`;
    const items = this.getAllFallback(storeName);
    const filtered = items.filter((item) => item.id !== id);

    try {
      localStorage.setItem(key, JSON.stringify(filtered));
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  clearFallback(storeName) {
    const key = `${this.dbName}:${storeName}`;
    try {
      localStorage.removeItem(key);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Fecha conexão com banco de dados
   */
  close() {
    if (this.db) {
      this.db.close();
      this.initialized = false;
      console.log('[Database] Conexão fechada');
    }
  }
}

// Singleton instance
let dbInstance = null;

/**
 * Obtém instância única do banco de dados
 */
export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database('CalculadoraTattoo', 1);
  }
  return dbInstance;
}

export { Database };
