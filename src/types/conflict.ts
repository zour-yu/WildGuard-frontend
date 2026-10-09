export type ConflictSource = 'SMS' | 'App';
export type ConflictPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ConflictStatus = 'UNREAD' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED';

export interface ConflictReport {
  _id: string;
  source: ConflictSource;
  priority: ConflictPriority;
  status: ConflictStatus;
  description: string;
  reporter: string;
  location: string;
  latitude: number;
  longitude: number;
  reportedAt: string;
  resolvedAt?: string;
  handlerId?: string;
  notes?: string;
  imageUrl?: string;
}
