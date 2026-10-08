import axios from 'axios';
import {
  CollarTelemetryData,
  AlertDispatchData,
  GeofenceZoneData,
  RangerData,
} from '../types/telemetry';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const telemetryService = {
  /**
   * Retrieves the latest GPS collar telemetry for tracked animals.
   */
  async getLatestCollars(): Promise<CollarTelemetryData[]> {
    const response = await api.get('/api/telemetry/collars');
    return response.data.data;
  },

  /**
   * Retrieves all active/unresolved geofence breach alerts.
   */
  async getActiveAlerts(): Promise<AlertDispatchData[]> {
    const response = await api.get('/api/alerts/active');
    return response.data.data;
  },

  /**
   * Park Manager dispatches a ranger to an active animal breach alert.
   */
  async dispatchRanger(
    alertId: string,
    payload: { rangerId: string; rangerName?: string; notes?: string }
  ): Promise<AlertDispatchData> {
    const response = await api.post(`/api/alerts/${alertId}/dispatch`, payload);
    return response.data.data;
  },

  /**
   * Ranger accepts or rejects an emergency alert assignment.
   */
  async respondToDispatch(
    dispatchId: string,
    payload: {
      rangerId: string;
      action: 'ACCEPT' | 'REJECT';
      reason?: string;
      notes?: string;
    }
  ): Promise<AlertDispatchData> {
    const response = await api.patch(
      `/api/dispatches/${dispatchId}/respond`,
      payload
    );
    return response.data.data;
  },

  /**
   * Ranger marks the incident as resolved on-scene and connects with UC-01 incident reporting.
   */
  async resolveDispatch(
    dispatchId: string,
    payload: { notes: string; incidentHandoffId?: string }
  ): Promise<AlertDispatchData> {
    const response = await api.patch(
      `/api/dispatches/${dispatchId}/resolve`,
      payload
    );
    return response.data.data;
  },

  /**
   * Fetches active geofence danger zones.
   */
  async getGeofenceZones(): Promise<GeofenceZoneData[]> {
    const response = await api.get('/api/geofences');
    return response.data.data;
  },

  /**
   * Fetches list of deployable field rangers.
   */
  async getAvailableRangers(): Promise<RangerData[]> {
    const response = await api.get('/api/rangers');
    return response.data.data;
  },

  /**
   * Manually steps the GPS collar simulator for instant evaluation.
   */
  async triggerSimulatorStep(): Promise<any> {
    const response = await api.post('/api/simulator/step');
    return response.data.data;
  },

  /**
   * Toggles the background collar simulator running state.
   */
  async toggleSimulator(): Promise<any> {
    const response = await api.post('/api/simulator/toggle');
    return response.data.data;
  },
};
