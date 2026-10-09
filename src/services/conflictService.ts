import axios from 'axios';
import { auth } from '../firebase';
import { ConflictReport, ConflictStatus } from '../types/conflict';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FALLBACK_CONFLICTS: ConflictReport[] = [
  {
    _id: 'conf-mock-001',
    source: 'SMS',
    priority: 'HIGH',
    status: 'UNREAD',
    description: 'Elephant herd spotted breaking perimeter fence near Galwala Farmland 8A.',
    reporter: '+94771234567',
    location: 'Sector 4: Farmland 8A Buffer',
    latitude: 6.8224,
    longitude: 80.9742,
    reportedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    _id: 'conf-mock-002',
    source: 'App',
    priority: 'HIGH',
    status: 'UNREAD',
    description: 'Crop damage reported in paddy fields along western canal border.',
    reporter: 'W. Fernando (+94719876543)',
    location: 'Sector 5: Western Settlement Buffer',
    latitude: 6.8378,
    longitude: 80.9658,
    reportedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'conf-mock-003',
    source: 'SMS',
    priority: 'MEDIUM',
    status: 'ACKNOWLEDGED',
    description: 'Lone bull elephant crossing highway near Handapanagala Reservoir.',
    reporter: '+94765551234',
    location: 'Sector 2: Reservoir Basin',
    latitude: 6.8512,
    longitude: 80.9984,
    reportedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    _id: 'conf-mock-004',
    source: 'SMS',
    priority: 'HIGH',
    status: 'UNREAD',
    description: 'Villagers reporting aggressive elephant near southern community water well.',
    reporter: '+94709887766',
    location: 'Sector 4: Farmland 8A Buffer',
    latitude: 6.8182,
    longitude: 80.9815,
    reportedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
];

export const conflictService = {
  /**
   * Retrieves all human-wildlife conflict reports (SMS hotline & Citizen App).
   */
  async getConflicts(): Promise<ConflictReport[]> {
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get<ConflictReport[]>(`${API_BASE_URL}/api/conflicts`, {
        headers,
        timeout: 6000,
      });

      if (response.data && response.data.length > 0) {
        return response.data;
      }
      return FALLBACK_CONFLICTS;
    } catch (error) {
      console.warn('Failed to fetch conflicts from server, using fallback records:', error);
      return FALLBACK_CONFLICTS;
    }
  },

  /**
   * Simulates an incoming SMS report from a community member.
   */
  async simulateMockSms(body?: string, from?: string): Promise<ConflictReport> {
    const response = await axios.post(`${API_BASE_URL}/api/conflicts/mock-sms`, {
      body,
      from,
    });
    return response.data.conflict;
  },

  /**
   * Updates status (UNREAD / ACKNOWLEDGED / DISPATCHED / RESOLVED) and notes on a conflict.
   */
  async updateStatus(
    id: string,
    status: ConflictStatus,
    notes?: string
  ): Promise<ConflictReport> {
    const response = await axios.patch(`${API_BASE_URL}/api/conflicts/${id}/status`, {
      status,
      notes,
    });
    return response.data.conflict;
  },
};
