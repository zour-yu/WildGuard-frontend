/**
 * UC-01: Offline Engine - IndexedDB Local Persistence Layer
 * 
 * SOLID Principles Applied:
 * - Single Responsibility Principle (SRP): Dedicated strictly to browser IndexedDB
 *   lifecycle, offline item persistence, queuing, and status synchronization state.
 * - Dependency Inversion: Provides clean async promise interface decoupling UI from
 *   underlying browser storage mechanisms.
 */

import { QueuedIncident, CreateIncidentPayload, OfflineQueueStatus } from '../types/incident';

const DB_NAME = 'WildGuard_Offline_DB';
const DB_VERSION = 1;
const STORE_NAME = 'incident_offline_queue';

export class OfflineEngine {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initializes and opens the IndexedDB database.
   */
  private static async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      // Guard against non-browser environments (SSR / test runner mock)
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not supported in this environment.'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * Persists a newly recorded incident into the offline IndexedDB queue.
   */
  public static async saveOfflineIncident(
    payload: CreateIncidentPayload
  ): Promise<QueuedIncident> {
    const db = await this.getDB();
    const id =
      payload.id ||
      `OFF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const queuedItem: QueuedIncident = {
      id,
      type: payload.type,
      coordinates: payload.coordinates,
      description: payload.description,
      photoUrl: payload.photoUrl,
      metadata: payload.metadata || {},
      reporterId: payload.reporterId || 'RNG-OFFLINE',
      reporterName: payload.reporterName || 'Ranger (Offline Mode)',
      status: 'QUEUED',
      timestamp: payload.timestamp || new Date().toISOString(),
      syncAttempts: 0,
    };

    return new Promise<QueuedIncident>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(queuedItem);

      request.onsuccess = () => resolve(queuedItem);
      request.onerror = () => reject(request.error || new Error('Failed to save to IndexedDB'));
    });
  }

  /**
   * Retrieves all incidents currently marked with status 'QUEUED'.
   */
  public static async getQueuedIncidents(): Promise<QueuedIncident[]> {
    const db = await this.getDB();
    return new Promise<QueuedIncident[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all: QueuedIncident[] = request.result || [];
        const queuedOnly = all.filter((item) => item.status === 'QUEUED');
        resolve(queuedOnly);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves all records stored in IndexedDB (both queued and synced).
   */
  public static async getAllIncidents(): Promise<QueuedIncident[]> {
    const db = await this.getDB();
    return new Promise<QueuedIncident[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all: QueuedIncident[] = request.result || [];
        // Sort newest first
        all.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(all);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Returns the count of pending queued items.
   */
  public static async getQueueCount(): Promise<number> {
    const queued = await this.getQueuedIncidents();
    return queued.length;
  }

  /**
   * Updates an incident status to 'SYNCED' after successful cloud synchronization.
   */
  public static async markIncidentSynced(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item: QueuedIncident = getReq.result;
        if (item) {
          item.status = 'SYNCED';
          item.syncedAt = new Date().toISOString();
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Marks an incident as 'FAILED' with reason if sync attempt fails.
   */
  public static async markIncidentFailed(id: string, error: string): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item: QueuedIncident = getReq.result;
        if (item) {
          item.status = 'FAILED';
          item.lastError = error;
          item.syncAttempts = (item.syncAttempts || 0) + 1;
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Clears all synced records to preserve browser storage.
   */
  public static async clearSyncedIncidents(): Promise<void> {
    const db = await this.getDB();
    const all = await this.getAllIncidents();
    const synced = all.filter((i) => i.status === 'SYNCED');

    for (const item of synced) {
      await this.deleteIncident(item.id);
    }
  }

  /**
   * Deletes a specific incident from local IndexedDB.
   */
  public static async deleteIncident(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
