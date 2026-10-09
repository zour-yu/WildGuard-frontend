/**
 * UC-01: Record Wildlife Incident - TypeScript Type Definitions
 */

export type IncidentType =
  | 'SNARE'
  | 'CARCASS'
  | 'ILLEGAL_CAMPSITE'
  | 'POACHING_SIGNS'
  | 'FENCE_DAMAGE';

export type SnareRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DecompositionState =
  | 'FRESH'
  | 'EARLY_DECOMP'
  | 'ADVANCED'
  | 'SKELETAL';

export type OfflineQueueStatus = 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SnareMetadata {
  riskLevel: SnareRiskLevel;
  snareCount: number;
  wireType?: 'STEEL_CABLE' | 'NYLON' | 'BRAIDED_WIRE' | 'OTHER';
  isArmed?: boolean;
  targetSpecies?: string;
}

export interface CarcassMetadata {
  decompositionState: DecompositionState;
  species?: string;
  estimatedAgeDays?: number;
  causeOfDeath?: 'POACHING' | 'NATURAL' | 'PREDATION' | 'POISONING' | 'UNKNOWN';
  ivoryRemoved?: boolean;
  hornsRemoved?: boolean;
}

export interface IllegalCampsiteMetadata {
  campfireDetected: boolean;
  estimatedPeople?: number;
  campsiteActive?: boolean;
  litterPresent?: boolean;
  structureType?: 'TENT' | 'MAKESHIFT_SHELTER' | 'LEAN_TO' | 'NONE';
}

export type IncidentMetadata =
  | SnareMetadata
  | CarcassMetadata
  | IllegalCampsiteMetadata
  | Record<string, any>;

export interface Incident {
  id: string;
  type: IncidentType;
  coordinates: [number, number]; // [Latitude, Longitude]
  description: string;
  photoUrl?: string;
  metadata: IncidentMetadata;
  reporterId: string;
  reporterName: string;
  status: string;
  timestamp: string | Date;
  syncedFromOffline?: boolean;
  assignedRangerId?: string;
  assignedRangerName?: string;
  dispatchNotes?: string;
  dispatchedAt?: string | Date;
  resolutionNotes?: string;
  resolvedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface QueuedIncident {
  id: string; // Unique client-generated UUID
  type: IncidentType;
  coordinates: [number, number];
  description: string;
  photoUrl?: string;
  metadata: IncidentMetadata;
  reporterId: string;
  reporterName: string;
  status: OfflineQueueStatus;
  timestamp: string;
  syncAttempts?: number;
  lastError?: string;
  syncedAt?: string;
}

export interface CreateIncidentPayload {
  id?: string;
  type: IncidentType;
  coordinates: [number, number];
  description: string;
  photoUrl?: string;
  metadata: IncidentMetadata;
  reporterId?: string;
  reporterName?: string;
  timestamp?: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    processedCount: number;
    createdCount: number;
    duplicatesCount: number;
    created: Incident[];
    skippedDuplicates: string[];
    timestamp: string;
  };
}
