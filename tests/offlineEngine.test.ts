/**
 * Unit Test Suite: OfflineEngine & IndexedDB Queue (UC-01)
 * 
 * Tests:
 * 1. Positive: Correctly saves incident payload to offline queue with 'QUEUED' status.
 * 2. Edge Case: When offline, intercepts payload and stores without network errors.
 * 3. Synchronization: Updates status from 'QUEUED' to 'SYNCED' upon batch sync completion.
 * 4. Cleanup: Clears synced records while retaining pending items.
 */

import { OfflineEngine } from '../src/services/OfflineEngine';
import { CreateIncidentPayload } from '../src/types/incident';

describe('OfflineEngine (IndexedDB Persistence)', () => {
  // Mock IndexedDB in test environment
  let mockStore: Map<string, any>;

  beforeEach(() => {
    mockStore = new Map();

    const mockIDBStore = {
      put: jest.fn((item) => {
        mockStore.set(item.id, item);
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: item.id } }), 0);
        return req;
      }),
      getAll: jest.fn(() => {
        const req: any = { onsuccess: null, onerror: null, result: Array.from(mockStore.values()) };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: Array.from(mockStore.values()) } }), 0);
        return req;
      }),
      get: jest.fn((id) => {
        const item = mockStore.get(id);
        const req: any = { onsuccess: null, onerror: null, result: item };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: item } }), 0);
        return req;
      }),
      delete: jest.fn((id) => {
        mockStore.delete(id);
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess && req.onsuccess({ target: { result: undefined } }), 0);
        return req;
      }),
    };

    const mockTransaction = {
      objectStore: jest.fn(() => mockIDBStore),
    };

    const mockDB = {
      transaction: jest.fn(() => mockTransaction),
    };

    // Inject mock DB into OfflineEngine
    (OfflineEngine as any).dbPromise = Promise.resolve(mockDB);
  });

  afterEach(() => {
    mockStore.clear();
    (OfflineEngine as any).dbPromise = null;
  });

  it('Positive: successfully saves incident to offline queue with QUEUED status and ID', async () => {
    const payload: CreateIncidentPayload = {
      type: 'SNARE',
      coordinates: [6.834, 80.988],
      description: 'Active wire snare in sector 4',
      metadata: { riskLevel: 'HIGH', snareCount: 1 },
      reporterId: 'RNG-001',
      reporterName: 'Sgt. Tharaka Bandara',
    };

    const queued = await OfflineEngine.saveOfflineIncident(payload);

    expect(queued).toBeDefined();
    expect(queued.id).toMatch(/^OFF-/);
    expect(queued.status).toBe('QUEUED');
    expect(queued.type).toBe('SNARE');
    expect(queued.coordinates).toEqual([6.834, 80.988]);
    expect(mockStore.has(queued.id)).toBe(true);
  });

  it('Edge Case: handles multiple queued incidents and retrieves all QUEUED items', async () => {
    await OfflineEngine.saveOfflineIncident({
      type: 'SNARE',
      coordinates: [6.834, 80.988],
      description: 'Snare 1',
      metadata: { riskLevel: 'LOW' },
    });

    await OfflineEngine.saveOfflineIncident({
      type: 'CARCASS',
      coordinates: [6.842, 80.975],
      description: 'Carcass 2',
      metadata: { decompositionState: 'FRESH' },
    });

    const queuedList = await OfflineEngine.getQueuedIncidents();
    expect(queuedList.length).toBe(2);

    const count = await OfflineEngine.getQueueCount();
    expect(count).toBe(2);
  });

  it('Synchronization: marks incident as SYNCED with timestamp', async () => {
    const item = await OfflineEngine.saveOfflineIncident({
      type: 'ILLEGAL_CAMPSITE',
      coordinates: [6.82, 80.97],
      description: 'Campfire',
      metadata: { campfireDetected: true },
    });

    expect(item.status).toBe('QUEUED');

    await OfflineEngine.markIncidentSynced(item.id);

    const all = await OfflineEngine.getAllIncidents();
    const updated = all.find((i) => i.id === item.id);
    expect(updated?.status).toBe('SYNCED');
    expect(updated?.syncedAt).toBeDefined();

    // Queued list should now be empty
    const queuedOnly = await OfflineEngine.getQueuedIncidents();
    expect(queuedOnly.length).toBe(0);
  });

  it('Cleanup: clearSyncedIncidents removes synced items while keeping queued ones', async () => {
    const item1 = await OfflineEngine.saveOfflineIncident({
      type: 'SNARE',
      coordinates: [6.83, 80.98],
      description: 'Snare to sync',
      metadata: { riskLevel: 'HIGH' },
    });

    const item2 = await OfflineEngine.saveOfflineIncident({
      type: 'CARCASS',
      coordinates: [6.84, 80.97],
      description: 'Pending carcass',
      metadata: { decompositionState: 'SKELETAL' },
    });

    // Mark item1 as synced
    await OfflineEngine.markIncidentSynced(item1.id);

    // Clear synced
    await OfflineEngine.clearSyncedIncidents();

    const all = await OfflineEngine.getAllIncidents();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(item2.id);
  });
});
