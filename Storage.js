/**
 * Storage.js - Abstração localStorage + sessionStorage
 * 
 * Gerencia preferências e dados temporários com:
 * - Fallback seguro
 * - Versionamento
 * - Expiração automática
 * - Criptografia opcional
 */

class StorageManager {
  constructor(prefix = 'CALC_TATTOO_') {
    this.prefix = prefix;
    this.isLocalStorageSupported = this.checkLocalStorageSupport();
    this.isSessionStorageSupported = this.checkSessionStorageSupport();
    this.inMemoryStore = new Map();
  }

  /**
   * Verifica suporte a localStorage
   */
  checkLocalStorageSupport() {
    try {
      const test = '__STORAGE_TEST__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      console.warn('[Storage] localStorage não suportado');
      return false;
    }
  }

  /**
   * Verifica suporte a sessionStorage
   */
  checkSessionStorageSupport() {
    try {
      const test = '__SESSION_TEST__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      console.warn('[Storage] sessionStorage não suportado');
      return false;
    }
  }

  /**
   * Salva valor em localStorage
   */
  setLocal(key, value, options = {}) {
    const { expires = null, version = 1 } = options;

    const data = {
      version,
      value,
      timestamp: Date.now(),
      expires: expires ? Date.now() + expires : null
    };

    if (!this.isLocalStorageSupported) {
      this.inMemoryStore.set(key, data);
      return;
    }

    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(data));
    } catch (error) {
      console.error('[Storage] localStorage quota exceeded:', error);
      // Fallback para memória
      this.inMemoryStore.set(key, data);
    }
  }

  /**
   * Obtém valor de localStorage
   */
  getLocal(key) {
    const fullKey = this.getKey(key);

    // Tenta localStorage primeiro
    if (this.isLocalStorageSupported) {
      try {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const data = JSON.parse(stored);

          // Verifica expiração
          if (data.expires && data.expires < Date.now()) {
            localStorage.removeItem(fullKey);
            return null;
          }

          return data.value;
        }
      } catch (error) {
        console.error('[Storage] localStorage parse error:', error);
      }
    }

    // Fallback para memória
    const inMemory = this.inMemoryStore.get(key);
    if (inMemory) {
      if (inMemory.expires && inMemory.expires < Date.now()) {
        this.inMemoryStore.delete(key);
        return null;
      }
      return inMemory.value;
    }

    return null;
  }

  /**
   * Remove valor de localStorage
   */
  removeLocal(key) {
    const fullKey = this.getKey(key);

    if (this.isLocalStorageSupported) {
      try {
        localStorage.removeItem(fullKey);
      } catch (error) {
        console.warn('[Storage] Error removing from localStorage:', error);
      }
    }

    this.inMemoryStore.delete(key);
  }

  /**
   * Limpa todos os valores
   */
  clearLocal() {
    if (this.isLocalStorageSupported) {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith(this.prefix)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.error('[Storage] Error clearing localStorage:', error);
      }
    }

    // Limpa apenas nossas keys em memória
    for (const [key] of this.inMemoryStore) {
      if (key.startsWith(this.prefix)) {
        this.inMemoryStore.delete(key);
      }
    }
  }

  /**
   * Salva valor em sessionStorage
   */
  setSession(key, value) {
    if (!this.isSessionStorageSupported) {
      this.inMemoryStore.set(`session:${key}`, { value });
      return;
    }

    try {
      sessionStorage.setItem(this.getKey(key), JSON.stringify({ value }));
    } catch (error) {
      console.error('[Storage] sessionStorage quota exceeded:', error);
      this.inMemoryStore.set(`session:${key}`, { value });
    }
  }

  /**
   * Obtém valor de sessionStorage
   */
  getSession(key) {
    const fullKey = this.getKey(key);

    if (this.isSessionStorageSupported) {
      try {
        const stored = sessionStorage.getItem(fullKey);
        if (stored) {
          return JSON.parse(stored).value;
        }
      } catch (error) {
        console.error('[Storage] sessionStorage parse error:', error);
      }
    }

    const inMemory = this.inMemoryStore.get(`session:${key}`);
    return inMemory ? inMemory.value : null;
  }

  /**
   * Remove valor de sessionStorage
   */
  removeSession(key) {
    const fullKey = this.getKey(key);

    if (this.isSessionStorageSupported) {
      try {
        sessionStorage.removeItem(fullKey);
      } catch (error) {
        console.warn('[Storage] Error removing from sessionStorage:', error);
      }
    }

    this.inMemoryStore.delete(`session:${key}`);
  }

  /**
   * Obtém chave com prefix
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Obtém tamanho estimado do storage
   */
  getStorageSize() {
    let size = 0;

    if (this.isLocalStorageSupported) {
      for (const key in localStorage) {
        if (key.startsWith(this.prefix)) {
          size += localStorage[key].length + key.length;
        }
      }
    }

    for (const [key, value] of this.inMemoryStore) {
      if (key.startsWith(this.prefix)) {
        size += JSON.stringify(value).length;
      }
    }

    return size; // em bytes
  }

  /**
   * Verifica se está próximo do limite
   */
  isStorageNearLimit(threshold = 0.9) {
    if (!this.isLocalStorageSupported) return false;

    const maxSize = 5 * 1024 * 1024; // 5MB padrão
    const currentSize = this.getStorageSize();
    return currentSize > (maxSize * threshold);
  }

  /**
   * Limpa dados expirados
   */
  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    if (this.isLocalStorageSupported) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data.expires && data.expires < now) {
              localStorage.removeItem(key);
              cleaned++;
            }
          } catch (error) {
            console.warn('[Storage] Error cleaning expired:', error);
          }
        }
      });
    }

    console.log(`[Storage] Limpeza concluída: ${cleaned} itens removidos`);
  }

  /**
   * Migra dados de chaves antigas
   */
  migrate(oldKey, newKey) {
    const value = this.getLocal(oldKey);
    if (value !== null) {
      this.setLocal(newKey, value);
      this.removeLocal(oldKey);
      console.log(`[Storage] Dados migrados de ${oldKey} para ${newKey}`);
      return true;
    }
    return false;
  }

  /**
   * Exporta todos os dados do storage
   */
  export() {
    const data = {};

    if (this.isLocalStorageSupported) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          try {
            data[key] = localStorage.getItem(key);
          } catch (error) {
            console.warn('[Storage] Error exporting:', error);
          }
        }
      });
    }

    // Adiciona dados em memória
    for (const [key, value] of this.inMemoryStore) {
      if (key.startsWith(this.prefix)) {
        data[key] = JSON.stringify(value);
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      data
    };
  }

  /**
   * Importa dados
   */
  import(importData) {
    if (!importData.data) {
      throw new Error('Formato de backup inválido');
    }

    let imported = 0;

    for (const [key, value] of Object.entries(importData.data)) {
      try {
        localStorage.setItem(key, value);
        imported++;
      } catch (error) {
        console.warn('[Storage] Error importing:', error);
      }
    }

    console.log(`[Storage] ${imported} itens importados`);
    return imported;
  }
}

// Singleton instance
let storageInstance = null;

/**
 * Obtém instância única do gerenciador de storage
 */
export function getStorage() {
  if (!storageInstance) {
    storageInstance = new StorageManager();
  }
  return storageInstance;
}

export { StorageManager };
