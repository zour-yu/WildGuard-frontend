/**
 * UC-01: Incident API Client
 * 
 * SOLID Principles Applied:
 * - Single Responsibility Principle (SRP): Dedicated strictly to network communication
 *   with the backend /api/incidents endpoints.
 */

import axios from 'axios';
import { CreateIncidentPayload, Incident, SyncResponse } from '../types/incident';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const incidentApiClient = {
  /**
   * Submits a single incident to the cloud backend.
   */
  async createIncident(payload: CreateIncidentPayload): Promise<Incident> {
    const response = await apiClient.post<{ success: boolean; data: Incident }>(
      '/incidents',
      payload
    );
    return response.data.data;
  },

  /**
   * Batch synchronizes offline queued incidents.
   */
  async syncIncidentsBatch(
    incidents: CreateIncidentPayload[]
  ): Promise<SyncResponse['data']> {
    const response = await apiClient.post<SyncResponse>('/incidents/sync', {
      incidents,
    });
    return response.data.data;
  },

  /**
   * Retrieves all recorded incidents.
   */
  async fetchIncidents(params?: {
    type?: string;
    status?: string;
  }): Promise<Incident[]> {
    const response = await apiClient.get<{
      success: boolean;
      count: number;
      data: Incident[];
    }>('/incidents', { params });
    return response.data.data;
  },

  /**
   * Retrieves a single incident by ID.
   */
  async fetchIncidentById(id: string): Promise<Incident> {
    const response = await apiClient.get<{ success: boolean; data: Incident }>(
      `/incidents/${id}`
    );
    return response.data.data;
  },

  /**
   * Dispatches a field ranger to the incident location.
   */
  async dispatchIncident(
    id: string,
    payload: { rangerId: string; rangerName?: string; notes?: string }
  ): Promise<Incident> {
    const response = await apiClient.patch<{ success: boolean; data: Incident }>(
      `/incidents/${id}/dispatch`,
      payload
    );
    return response.data.data;
  },

  /**
   * Resolves an incident on-scene.
   */
  async resolveIncident(
    id: string,
    payload: { resolutionNotes: string }
  ): Promise<Incident> {
    const response = await apiClient.patch<{ success: boolean; data: Incident }>(
      `/incidents/${id}/resolve`,
      payload
    );
    return response.data.data;
  },
};
