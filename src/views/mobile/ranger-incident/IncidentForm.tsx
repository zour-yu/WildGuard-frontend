/**
 * UC-01: Record Wildlife Incident - Mobile Ranger Field Interface
 * 
 * Mobile-First Field Interface for Park Rangers operating in remote forest sectors.
 * Features:
 * - High-accuracy GPS with automatic fallback to manual coordinate entry
 * - Offline-First persistence in IndexedDB with auto-sync on network reconnection
 * - Dynamic form strategy rendering per incident type (Snare, Carcass, Illegal Campsite)
 * - Photo evidence capture with base64 serialization
 * - Top-bar network status banner with queue indicator & manual flush trigger
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Wifi,
  WifiOff,
  MapPin,
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Skull,
  Crosshair,
  Tent,
  FileText,
  Upload,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  Trash2,
  Send,
  X,
  Radio,
  Eye,
} from 'lucide-react';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { OfflineEngine } from '../../../services/OfflineEngine';
import { incidentApiClient } from '../../../services/api.client';
import {
  IncidentType,
  SnareRiskLevel,
  DecompositionState,
  QueuedIncident,
  CreateIncidentPayload,
} from '../../../types/incident';

interface IncidentFormProps {
  onIncidentSubmitted?: () => void;
  onNavigateBack?: () => void;
}

export const IncidentForm: React.FC<IncidentFormProps> = ({
  onIncidentSubmitted,
  onNavigateBack,
}) => {
  // 1. Network Status & Offline Queue State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showQueueDrawer, setShowQueueDrawer] = useState<boolean>(false);
  const [storedIncidents, setStoredIncidents] = useState<QueuedIncident[]>([]);

  // 2. Geolocation Hook
  const {
    coordinates,
    accuracy,
    isLoading: isGpsLoading,
    error: gpsError,
    isManual: isManualCoords,
    refresh: refreshGps,
    setManualCoordinates,
    toggleManualMode,
  } = useGeolocation();

  // Manual Coordinates inputs
  const [manualLat, setManualLat] = useState<string>('6.834000');
  const [manualLng, setManualLng] = useState<string>('80.988000');

  // 3. Form State
  const [type, setType] = useState<IncidentType>('SNARE');
  const [description, setDescription] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // 4. Strategy-specific Metadata States
  // Snare Strategy
  const [snareRiskLevel, setSnareRiskLevel] = useState<SnareRiskLevel>('HIGH');
  const [snareCount, setSnareCount] = useState<number>(1);
  const [wireType, setWireType] = useState<string>('STEEL_CABLE');
  const [isArmed, setIsArmed] = useState<boolean>(true);

  // Carcass Strategy
  const [decompState, setDecompState] = useState<DecompositionState>('FRESH');
  const [carcassSpecies, setCarcassSpecies] = useState<string>('Sambar Deer (Rusa unicolor)');
  const [causeOfDeath, setCauseOfDeath] = useState<string>('POACHING');
  const [ivoryRemoved, setIvoryRemoved] = useState<boolean>(false);

  // Illegal Campsite Strategy
  const [campfireDetected, setCampfireDetected] = useState<boolean>(true);
  const [estimatedPeople, setEstimatedPeople] = useState<number>(2);
  const [campsiteActive, setCampsiteActive] = useState<boolean>(false);
  const [structureType, setStructureType] = useState<string>('MAKESHIFT_SHELTER');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update offline queue count
  const refreshQueueState = useCallback(async () => {
    try {
      const count = await OfflineEngine.getQueueCount();
      setQueueCount(count);
      const all = await OfflineEngine.getAllIncidents();
      setStoredIncidents(all);
    } catch (e) {
      console.warn('Could not read offline queue count:', e);
    }
  }, []);

  // Flush and synchronize offline queue
  const syncOfflineIncidents = useCallback(async () => {
    if (!navigator.onLine) {
      setToastMessage({
        type: 'warning',
        text: 'Cannot sync: No internet connection detected.',
      });
      return;
    }

    try {
      setIsSyncing(true);
      const queuedItems = await OfflineEngine.getQueuedIncidents();

      if (queuedItems.length === 0) {
        setSyncStatusMsg('No offline incidents pending sync.');
        setIsSyncing(false);
        return;
      }

      setSyncStatusMsg(`Syncing ${queuedItems.length} offline records...`);

      // Prepare DTO batch
      const batchPayload: CreateIncidentPayload[] = queuedItems.map((item) => ({
        id: item.id,
        type: item.type,
        coordinates: item.coordinates,
        description: item.description,
        photoUrl: item.photoUrl,
        metadata: item.metadata,
        reporterId: item.reporterId,
        reporterName: item.reporterName,
        timestamp: item.timestamp,
      }));

      const syncResult = await incidentApiClient.syncIncidentsBatch(batchPayload);

      // Mark synchronized items in IndexedDB
      for (const item of queuedItems) {
        await OfflineEngine.markIncidentSynced(item.id);
      }

      await refreshQueueState();

      setToastMessage({
        type: 'success',
        text: `Batch synced! ${syncResult.createdCount} uploaded, ${syncResult.duplicatesCount} deduplicated.`,
      });
      setSyncStatusMsg(null);
    } catch (err: any) {
      console.error('Error during batch sync:', err);
      setToastMessage({
        type: 'error',
        text: `Sync failed: ${err.message || 'Server connection error'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  }, [refreshQueueState]);

  // Network Event Listeners & Auto-Sync
  useEffect(() => {
    refreshQueueState();

    const handleOnline = () => {
      setIsOnline(true);
      setToastMessage({
        type: 'success',
        text: 'Network reconnected! Synchronizing offline queue...',
      });
      syncOfflineIncidents();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToastMessage({
        type: 'warning',
        text: 'Operating in Offline Mode. Incidents will be saved to IndexedDB.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshQueueState, syncOfflineIncidents]);

  // Sync manual input fields with coordinates
  useEffect(() => {
    if (coordinates) {
      setManualLat(coordinates.lat.toFixed(6));
      setManualLng(coordinates.lng.toFixed(6));
    }
  }, [coordinates]);

  // Convert uploaded image to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setToastMessage({
        type: 'error',
        text: 'Photo is too large. Please select an image under 8MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Build Strategy-specific metadata object
  const buildMetadata = (): any => {
    switch (type) {
      case 'SNARE':
        return {
          riskLevel: snareRiskLevel,
          snareCount: Number(snareCount),
          wireType,
          isArmed,
        };
      case 'CARCASS':
        return {
          decompositionState: decompState,
          species: carcassSpecies,
          causeOfDeath,
          ivoryRemoved,
        };
      case 'ILLEGAL_CAMPSITE':
        return {
          campfireDetected,
          estimatedPeople: Number(estimatedPeople),
          campsiteActive,
          structureType,
        };
      case 'POACHING_SIGNS':
        return {
          freshTracks: true,
          estimatedTrackAgeHours: 2,
        };
      case 'FENCE_DAMAGE':
        return {
          voltageDropped: true,
          cutWiresCount: 3,
        };
      default:
        return {};
    }
  };

  // Form Submission Handler (Online / Offline Branching)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setToastMessage({
        type: 'error',
        text: 'Please enter a description for the incident.',
      });
      return;
    }

    let lat = coordinates ? coordinates.lat : parseFloat(manualLat);
    let lng = coordinates ? coordinates.lng : parseFloat(manualLng);

    if (isManualCoords) {
      lat = parseFloat(manualLat);
      lng = parseFloat(manualLng);
    }

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setToastMessage({
        type: 'error',
        text: 'Invalid GPS coordinates. Please check latitude and longitude.',
      });
      return;
    }

    const payload: CreateIncidentPayload = {
      type,
      coordinates: [lat, lng],
      description: description.trim(),
      photoUrl: photoBase64 || undefined,
      metadata: buildMetadata(),
      reporterId: 'RNG-001',
      reporterName: 'Sgt. Tharaka Bandara',
      timestamp: new Date().toISOString(),
    };

    setIsSubmitting(true);

    try {
      if (!isOnline || !navigator.onLine) {
        // OFFLINE PATH: Persist to IndexedDB
        const queued = await OfflineEngine.saveOfflineIncident(payload);
        await refreshQueueState();
        setToastMessage({
          type: 'warning',
          text: `Saved offline (ID: ${queued.id.slice(-6)}). Will auto-sync when online.`,
        });
        resetForm();
      } else {
        // ONLINE PATH: Post to Backend API
        await incidentApiClient.createIncident(payload);
        setToastMessage({
          type: 'success',
          text: 'Incident reported and saved to central dispatch.',
        });
        resetForm();
        if (onIncidentSubmitted) {
          onIncidentSubmitted();
        }
      }
    } catch (err: any) {
      console.warn('Online submission failed, falling back to offline IndexedDB save:', err);
      // Fallback on network failure
      const queued = await OfflineEngine.saveOfflineIncident(payload);
      await refreshQueueState();
      setToastMessage({
        type: 'warning',
        text: `Network unreachable. Stored offline (ID: ${queued.id.slice(-6)}).`,
      });
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setPhotoBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full bg-white text-slate-900 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col font-sans">
      {/* 1. TOP-BAR NETWORK & SYNC BANNER */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between transition-colors ${
          isOnline ? 'bg-emerald-50 border-b border-emerald-200' : 'bg-red-50 border-b border-red-200'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <>

              <span className="text-xs font-bold text-[#003823] flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" /> Online (Field Terminal)
              </span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5" /> Offline Mode (No Signal)
              </span>
            </>
          )}
        </div>

        {/* Offline Queue Badge & Sync Action */}
        <div className="flex items-center space-x-2">
          {queueCount > 0 && (
            <button
              type="button"
              onClick={() => setShowQueueDrawer(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition"
            >
              <Clock className="w-3 h-3" />
              <span>{queueCount} Queued</span>
            </button>
          )}

          {isOnline && queueCount > 0 && (
            <button
              type="button"
              onClick={syncOfflineIncidents}
              disabled={isSyncing}
              className="bg-[#003823] hover:bg-[#002819] disabled:opacity-50 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 transition shadow-sm"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. HEADER & ROLE IDENTIFIER */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="WildGuard Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Record Wildlife Incident
            </h2>
            <p className="text-[11px] text-slate-500">Ranger Handheld Terminal</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowQueueDrawer(!showQueueDrawer)}
          className="text-xs text-slate-500 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 shadow-sm"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Queue ({queueCount})</span>
        </button>
      </div>

      {/* 3. TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : toastMessage.type === 'warning'
              ? 'bg-amber-50 border border-amber-300 text-amber-800'
              : 'bg-red-50 border border-red-300 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#003823]" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {toastMessage.type === 'error' && <X className="w-4 h-4 text-red-400" />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. MAIN FORM CONTAINER */}
      <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-6">
        {/* A. INCIDENT TYPE SELECTOR */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Incident Classification
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('SNARE')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                type === 'SNARE'
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>Snare Line</span>
            </button>

            <button
              type="button"
              onClick={() => setType('CARCASS')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                type === 'CARCASS'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Skull className="w-4 h-4" />
              <span>Carcass</span>
            </button>

            <button
              type="button"
              onClick={() => setType('ILLEGAL_CAMPSITE')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                type === 'ILLEGAL_CAMPSITE'
                  ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-900/30'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Campsite</span>
            </button>
          </div>
        </div>

        {/* B. STRATEGY-SPECIFIC METADATA PANEL */}
        <div className="p-3.5 bg-slate-100/50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Validation Strategy: {type}</span>
            <span className="text-[10px] text-[#003823] font-mono">Strategy Pattern</span>
          </div>

          {/* Strategy 1: SNARE */}
          {type === 'SNARE' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Threat Risk Level *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SnareRiskLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSnareRiskLevel(level)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                        snareRiskLevel === level
                          ? level === 'CRITICAL'
                            ? 'bg-red-600 text-white border-red-400'
                            : level === 'HIGH'
                            ? 'bg-orange-600 text-white border-orange-400'
                            : level === 'MEDIUM'
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-[#003823] text-white border-emerald-400'
                          : 'bg-white/60 text-slate-400 border-slate-200 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Snare Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={snareCount}
                    onChange={(e) => setSnareCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Wire Material
                  </label>
                  <select
                    value={wireType}
                    onChange={(e) => setWireType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="STEEL_CABLE">Steel Cable</option>
                    <option value="NYLON">Heavy Nylon</option>
                    <option value="BRAIDED_WIRE">Braided Wire</option>
                    <option value="OTHER">Other Cordage</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="armedCheck"
                  checked={isArmed}
                  onChange={(e) => setIsArmed(e.target.checked)}
                  className="rounded bg-white border-slate-200 text-red-600 focus:ring-0 w-4 h-4"
                />
                <label htmlFor="armedCheck" className="text-xs text-slate-700 font-medium">
                  Snare is actively tensioned/armed
                </label>
              </div>
            </div>
          )}

          {/* Strategy 2: CARCASS */}
          {type === 'CARCASS' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Decomposition State *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: 'FRESH', label: 'Fresh (< 24h)' },
                      { key: 'EARLY_DECOMP', label: 'Early Decomp' },
                      { key: 'ADVANCED', label: 'Advanced' },
                      { key: 'SKELETAL', label: 'Skeletal Remains' },
                    ] as { key: DecompositionState; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setDecompState(item.key)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border text-left transition-all ${
                        decompState === item.key
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-white/60 text-slate-400 border-slate-200 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Suspected Species
                  </label>
                  <input
                    type="text"
                    value={carcassSpecies}
                    onChange={(e) => setCarcassSpecies(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Suspected Cause
                  </label>
                  <select
                    value={causeOfDeath}
                    onChange={(e) => setCauseOfDeath(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="POACHING">Poaching (Gunshot / Snare)</option>
                    <option value="NATURAL">Natural / Old Age</option>
                    <option value="PREDATION">Carnivore Predation</option>
                    <option value="POISONING">Suspected Poisoning</option>
                    <option value="UNKNOWN">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="ivoryCheck"
                  checked={ivoryRemoved}
                  onChange={(e) => setIvoryRemoved(e.target.checked)}
                  className="rounded bg-white border-slate-200 text-amber-600 focus:ring-0 w-4 h-4"
                />
                <label htmlFor="ivoryCheck" className="text-xs text-slate-700 font-medium">
                  Tusks / Horns / Claws harvested by poachers
                </label>
              </div>
            </div>
          )}

          {/* Strategy 3: ILLEGAL CAMPSITE */}
          {type === 'ILLEGAL_CAMPSITE' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" /> Active Campfire Detected
                </span>
                <input
                  type="checkbox"
                  checked={campfireDetected}
                  onChange={(e) => setCampfireDetected(e.target.checked)}
                  className="rounded bg-slate-100 border-slate-600 text-orange-500 focus:ring-0 w-4 h-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Est. Occupants
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedPeople}
                    onChange={(e) => setEstimatedPeople(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Shelter Structure
                  </label>
                  <select
                    value={structureType}
                    onChange={(e) => setStructureType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="MAKESHIFT_SHELTER">Makeshift Tarpaulin</option>
                    <option value="TENT">Commercial Tent</option>
                    <option value="LEAN_TO">Natural Lean-To</option>
                    <option value="NONE">No Cover / Open Bivouac</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* C. GEOLOCATION POSITION CARD */}
        <div className="p-3.5 bg-slate-100/50 rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#003823]" />
              <span className="text-xs font-bold text-slate-700">
                GPS Position (Park Sector 4)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={refreshGps}
                disabled={isGpsLoading}
                title="Refresh GPS"
                className="p-1 rounded-lg bg-white text-slate-700 hover:text-white border border-slate-200"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin text-[#003823]' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => toggleManualMode()}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${
                  isManualCoords
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                {isManualCoords ? 'Manual Mode' : 'GPS Auto'}
              </button>
            </div>
          </div>

          {/* GPS Coordinates readout or manual inputs */}
          {!isManualCoords && coordinates ? (
            <div className="flex items-center justify-between bg-white/90 p-2.5 rounded-xl border border-slate-200/70">
              <div>
                <p className="text-xs font-mono font-bold text-[#003823]">
                  {coordinates.lat.toFixed(6)}° N, {coordinates.lng.toFixed(6)}° E
                </p>
                <p className="text-[10px] text-slate-400">
                  Accuracy: {accuracy ? `± ${accuracy}m` : 'Calibrated'} • High-Precision Lock
                </p>
              </div>
              <span className="text-[10px] font-bold text-[#003823] bg-emerald-50 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                Locked
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {gpsError && (
                <p className="text-[10px] text-amber-400 font-medium">
                  {gpsError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Latitude (°N)</label>
                  <input
                    type="text"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="6.834000"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#003823]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Longitude (°E)</label>
                  <input
                    type="text"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    placeholder="80.988000"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#003823]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* D. PHOTO EVIDENCE CAPTURE */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Photo Evidence</span>
            <span className="text-[10px] text-slate-400 font-normal">Base64 serialized</span>
          </label>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {photoBase64 ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 group">
              <img
                src={photoBase64}
                alt="Incident Evidence"
                className="w-full h-36 object-cover"
              />
              <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-100 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoBase64(null)}
                  className="bg-red-600 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-emerald-500/70 rounded-2xl bg-slate-100/30 flex flex-col items-center justify-center text-slate-400 hover:text-[#003823] transition group"
            >
              <Camera className="w-6 h-6 mb-1 text-slate-400 group-hover:text-[#003823]" />
              <span className="text-xs font-bold">Capture Photo Evidence</span>
              <span className="text-[10px] text-slate-500">Camera or local gallery upload</span>
            </button>
          )}
        </div>

        {/* E. INCIDENT DESCRIPTION & NOTES */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Incident Description & Observations *
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Document wire gauge, animal condition, tracks, or surroundings..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#003823]"
          />

          {/* Quick Preset Observation Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              'Steel wire anchored to tree trunk',
              'Sambar deer carcass located',
              'Smoldering campfire remains',
              'Fresh boot prints heading north',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() =>
                  setDescription((prev) => (prev ? `${prev} ${chip}.` : `${chip}.`))
                }
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

      </form>

      {/* F. SUBMISSION ACTION BUTTON (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-slate-100 p-4 pb-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-4xl mx-auto w-full px-4 md:px-8">
          <button
            type="submit"
            onClick={(e) => {
              // We simulate submit since the button is outside the form flow if we want it sticky across the screen
              // Wait, if it's inside the form, we can just keep it inside the form but use fixed positioning.
            }}
            disabled={isSubmitting}
            className={`w-full text-white font-bold py-4 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
              isSubmitting ? 'bg-[#003823]/70 cursor-wait' : isOnline ? 'bg-[#003823] hover:bg-[#002819] hover:shadow-xl hover:shadow-[#003823]/20' : 'bg-amber-600 hover:bg-amber-700 hover:shadow-xl hover:shadow-amber-900/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-base tracking-wide">Processing...</span>
              </>
            ) : isOnline ? (
              <>
                <Send className="w-5 h-5" />
                <span className="text-base tracking-wide">Submit Incident (Cloud Sync)</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5" />
                <span className="text-base tracking-wide">Save to Offline Queue (No Signal)</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* 5. OFFLINE QUEUE DRAWER (MODAL / SLIDE-UP) */}
      {showQueueDrawer && (
        <div className="p-4 bg-slate-950 border-t border-slate-200 space-y-3 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Offline Queue History ({storedIncidents.length})</span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={async () => {
                  await OfflineEngine.clearSyncedIncidents();
                  await refreshQueueState();
                }}
                className="text-[10px] text-slate-400 hover:text-red-400"
              >
                Clear Synced
              </button>
              <button
                type="button"
                onClick={() => setShowQueueDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {storedIncidents.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4">
              Offline queue is empty.
            </p>
          ) : (
            <div className="space-y-2">
              {storedIncidents.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 overflow-hidden pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white uppercase text-[10px]">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.id.slice(-6)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                      {item.description}
                    </p>
                  </div>

                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      item.status === 'SYNCED'
                        ? 'bg-emerald-950 text-[#003823] border border-emerald-800'
                        : item.status === 'QUEUED'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
