export type AlertStatus = 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CollarTelemetryData {
  _id?: string;
  collarId: string;
  animalName: string;
  species: string;
  location: [number, number]; // [lat, lng]
  batteryLevel: number;
  speedKmh?: number;
  heading?: number;
  timestamp: string;
  isBreaching?: boolean;
  breachZoneName?: string;
}

export interface AlertDispatchData {
  _id: string;
  animalId: string;
  animalName: string;
  species: string;
  collarId: string;
  geofenceId?: string;
  zoneName: string;
  riskLevel: RiskLevel;
  location: [number, number];
  assignedRangerId?: string;
  assignedRangerName?: string;
  status: AlertStatus;
  cameraTrapImageUrl: string;
  notes?: string;
  rejectionReason?: string;
  distanceToSettlementKm?: number;
  dispatchedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  resolvedAt?: string;
  incidentHandoffId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceZoneData {
  _id: string;
  zoneName: string;
  description?: string;
  riskLevel: RiskLevel;
  coordinates: [number, number][];
  bufferZoneKm: number;
  isActive: boolean;
}

export interface RangerData {
  rangerId: string;
  name: string;
  callsign: string;
  status: 'AVAILABLE' | 'ON_PATROL' | 'BUSY';
  location: [number, number];
  batteryLevel: number;
}
