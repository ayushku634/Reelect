/**
 * Promise-based IndexedDB wrapper for Reel Finder
 * Handles all database operations with clean async API
 */

const DB_NAME = "reel-finder-db";
const DB_VERSION = 1;

class ReelDatabase {
  constructor() {
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('reel_documents')) {
          db.createObjectStore('reel_documents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('reel_tombstones')) {
          db.createObjectStore('reel_tombstones', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('embeddings')) {
          db.createObjectStore('embeddings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async getDB() {
    return this.dbPromise;
  }

  // Reel Documents operations
  async getDocument(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_documents'], 'readonly');
      const store = transaction.objectStore('reel_documents');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async putDocument(doc) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_documents'], 'readwrite');
      const store = transaction.objectStore('reel_documents');
      const request = store.put(doc);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDocuments() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_documents'], 'readonly');
      const store = transaction.objectStore('reel_documents');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_documents'], 'readwrite');
      const store = transaction.objectStore('reel_documents');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Tombstones operations
  async putTombstone(tombstone) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_tombstones'], 'readwrite');
      const store = transaction.objectStore('reel_tombstones');
      const request = store.put(tombstone);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getTombstone(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_tombstones'], 'readonly');
      const store = transaction.objectStore('reel_tombstones');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Embeddings operations
  async getEmbedding(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['embeddings'], 'readonly');
      const store = transaction.objectStore('embeddings');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async putEmbedding(embedding) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['embeddings'], 'readwrite');
      const store = transaction.objectStore('embeddings');
      const request = store.put(embedding);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteEmbedding(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['embeddings'], 'readwrite');
      const store = transaction.objectStore('embeddings');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Settings operations
  async getSetting(key) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  }

  async putSetting(key, value) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async getDocumentCount() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_documents'], 'readonly');
      const store = transaction.objectStore('reel_documents');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reel_documents', 'reel_tombstones', 'embeddings', 'settings'], 'readwrite');

      const promises = [];
      ['reel_documents', 'reel_tombstones', 'embeddings', 'settings'].forEach(storeName => {
        const store = transaction.objectStore(storeName);
        promises.push(new Promise((res, rej) => {
          const request = store.clear();
          request.onsuccess = () => res();
          request.onerror = () => rej(request.error);
        }));
      });

      Promise.all(promises).then(() => resolve()).catch(reject);
    });
  }
}

export const db = new ReelDatabase();