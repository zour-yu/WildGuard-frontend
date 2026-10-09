/**
 * UC-01: Wildlife Incident Management Hub & Interactive Sector Map
 * 
 * Features:
 * - Real-world Galwala Park spatial map plotting real-time and offline-synced incidents
 * - Interactive GPS threat markers with radar pulses & coordinate mapping
 * - Dispatch quick response rangers directly to coordinates (UC-04 integration)
 * - On-scene incident resolution with tactical debrief reports
 * - Type filtering (SNARE, CARCASS, ILLEGAL_CAMPSITE) and status tracking
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Crosshair,
  Skull,
  Flame,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  Layers,
  Send,
  Truck,
  Check,
  X,
  Compass,
  Radio,
  FileCheck,
  ChevronRight,
  Maximize2,
  Navigation,
} from 'lucide-react';
import { incidentApiClient } from '../../../services/api.client';
import { getSocket } from '../../../services/socket';
import { Incident, IncidentType } from '../../../types/incident';
import { RangerData } from '../../../types/telemetry';
import { WildlifeReserveMap } from '../../../components/map/WildlifeReserveMap';
import { rankRangersByProximity } from '../../../utils/geoUtils';

// Available field rangers for tactical deployment
const AVAILABLE_RANGERS = [
  { id: 'RNG-001', name: 'Sgt. Tharaka Bandara', callsign: 'Kestrel-1', sector: 'Sector 1 (North Ridge)', status: 'AVAILABLE', battery: 94 },
  { id: 'RNG-002', name: 'Officer Nimal Silva', callsign: 'Rhino-3', sector: 'Sector 2 (Reservoir)', status: 'AVAILABLE', battery: 88 },
  { id: 'RNG-003', name: 'Officer Chaminda Perera', callsign: 'Eagle-2', sector: 'Sector 4 (Farmland 8A)', status: 'ON_PATROL', battery: 76 },
  { id: 'RNG-004', name: 'Ranger Dilshan Jayasinghe', callsign: 'Falcon-4', sector: 'Sector 5 (West Buffer)', status: 'AVAILABLE', battery: 92 },
];

const RANGER_MAP_DATA: RangerData[] = [
  { rangerId: 'RNG-001', name: 'Sgt. Tharaka Bandara', callsign: 'Kestrel-1', status: 'AVAILABLE', location: [6.854, 80.974], batteryLevel: 94 }, // Sector 1
  { rangerId: 'RNG-002', name: 'Officer Nimal Silva', callsign: 'Rhino-3', status: 'AVAILABLE', location: [6.850, 81.004], batteryLevel: 88 }, // Sector 2
  { rangerId: 'RNG-003', name: 'Officer Chaminda Perera', callsign: 'Eagle-2', status: 'ON_PATROL', location: [6.818, 80.975], batteryLevel: 76 }, // Sector 4
  { rangerId: 'RNG-004', name: 'Ranger Dilshan Jayasinghe', callsign: 'Falcon-4', status: 'AVAILABLE', location: [6.836, 80.966], batteryLevel: 92 }, // Sector 5
];

export const IncidentLogView: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Dispatch Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [selectedRangerId, setSelectedRangerId] = useState<string>('RNG-001');
  const [dispatchNotes, setDispatchNotes] = useState<string>(
    'Deploy quick response team to dismantle wire snare and sweep 200m perimeter for secondary traps.'
  );
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);

  // Resolve Modal State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState<boolean>(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>(
    'Threat neutralized on-scene. Physical evidence collected, logged, and secure buffer zone established.'
  );
  const [isSubmittingResolve, setIsSubmittingResolve] = useState<boolean>(false);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const fetchIncidents = async () => {
    try {
      setIsLoading(true);
      const data = await incidentApiClient.fetchIncidents(
        selectedFilter !== 'ALL' ? { type: selectedFilter } : undefined
      );
      setIncidents(data);
      if (data.length > 0) {
        setSelectedIncident((prev) => (prev ? data.find((i) => i.id === prev.id) || data[0] : data[0]));
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    const socket = getSocket();
    const handleIncidentUpdate = (updatedInc: Incident) => {
      setIncidents((prev) => {
        const index = prev.findIndex((i) => i.id === updatedInc.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedInc;
          return next;
        }
        return [updatedInc, ...prev];
      });

      setSelectedIncident((prev) => (prev && prev.id === updatedInc.id ? updatedInc : prev));
    };

    socket.on('incident:updated', handleIncidentUpdate);
    return () => {
      socket.off('incident:updated', handleIncidentUpdate);
    };
  }, [selectedFilter]);

  // Dispatch ranger handler
  const handleConfirmDispatch = async () => {
    if (!selectedIncident) return;

    const chosenRanger = AVAILABLE_RANGERS.find((r) => r.id === selectedRangerId);
    try {
      setIsSubmittingDispatch(true);
      const updated = await incidentApiClient.dispatchIncident(selectedIncident.id, {
        rangerId: selectedRangerId,
        rangerName: chosenRanger?.name,
        notes: dispatchNotes,
      });

      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIncident(updated);
      setIsDispatchModalOpen(false);
      setToastMsg({
        type: 'success',
        text: `Tactical Unit ${chosenRanger?.callsign} (${chosenRanger?.name}) dispatched to coordinates!`,
      });
      setTimeout(() => setToastMsg(null), 6000);
    } catch (err: any) {
      console.warn('Dispatch API call failed, applying optimistic update:', err);
      // Optimistic update fallback
      const optimisticUpdated: Incident = {
        ...selectedIncident,
        status: 'DISPATCHED',
        assignedRangerId: selectedRangerId,
        assignedRangerName: chosenRanger?.name || `Ranger ${selectedRangerId}`,
        dispatchNotes,
        dispatchedAt: new Date().toISOString(),
      };
      setIncidents((prev) => prev.map((i) => (i.id === optimisticUpdated.id ? optimisticUpdated : i)));
      setSelectedIncident(optimisticUpdated);
      setIsDispatchModalOpen(false);
      setToastMsg({
        type: 'success',
        text: `Field Ranger ${chosenRanger?.name} dispatched (Local Sync).`,
      });
      setTimeout(() => setToastMsg(null), 6000);
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  // Resolve incident handler
  const handleConfirmResolve = async () => {
    if (!selectedIncident) return;

    try {
      setIsSubmittingResolve(true);
      const updated = await incidentApiClient.resolveIncident(selectedIncident.id, {
        resolutionNotes,
      });

      setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedIncident(updated);
      setIsResolveModalOpen(false);
      setToastMsg({
        type: 'success',
        text: `Incident ${updated.id} successfully resolved and archived.`,
      });
      setTimeout(() => setToastMsg(null), 6000);
    } catch (err: any) {
      console.warn('Resolve API call failed, applying optimistic update:', err);
      const optimisticResolved: Incident = {
        ...selectedIncident,
        status: 'RESOLVED',
        resolutionNotes,
        resolvedAt: new Date().toISOString(),
      };
      setIncidents((prev) => prev.map((i) => (i.id === optimisticResolved.id ? optimisticResolved : i)));
      setSelectedIncident(optimisticResolved);
      setIsResolveModalOpen(false);
      setToastMsg({
        type: 'success',
        text: `Incident ${selectedIncident.id} marked as resolved (Local Sync).`,
      });
      setTimeout(() => setToastMsg(null), 6000);
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const getTypeIcon = (type: IncidentType) => {
    switch (type) {
      case 'SNARE':
        return <Crosshair className="w-4 h-4 text-red-400" />;
      case 'CARCASS':
        return <Skull className="w-4 h-4 text-amber-400" />;
      case 'ILLEGAL_CAMPSITE':
        return <Flame className="w-4 h-4 text-orange-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getTypeBadge = (type: IncidentType) => {
    switch (type) {
      case 'SNARE':
        return 'bg-red-950/80 text-red-300 border-red-800';
      case 'CARCASS':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'ILLEGAL_CAMPSITE':
        return 'bg-orange-950/80 text-orange-300 border-orange-800';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'DISPATCHED':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      default:
        return 'bg-amber-950 text-amber-300 border-amber-800';
    }
  };

  // Convert GPS coordinates to pixel coordinates on the 2D sector map projection
  const getMapPosition = (coords: [number, number]) => {
    // Galwala reserve bounds: Lat ~ 6.81 to 6.86, Lng ~ 80.96 to 81.01
    const minLat = 6.815;
    const maxLat = 6.855;
    const minLng = 80.965;
    const maxLng = 81.005;

    const latPercent = Math.max(10, Math.min(90, ((coords[0] - minLat) / (maxLat - minLat)) * 100));
    const lngPercent = Math.max(10, Math.min(90, ((coords[1] - minLng) / (maxLng - minLng)) * 100));

    return {
      top: `${100 - latPercent}%`,
      left: `${lngPercent}%`,
    };
  };

  const activeCount = incidents.filter((i) => i.status === 'RECORDED').length;
  const dispatchedCount = incidents.filter((i) => i.status === 'DISPATCHED').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div className="flex-1 p-4 md:p-6 bg-[#070b14] text-slate-100 min-h-screen font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-900/90 border border-emerald-500/60 shadow-2xl text-xs font-bold text-white flex items-center space-x-3 backdrop-blur-md animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & KPI Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Operational Command Hub
            </span>
            <span className="text-xs text-slate-400">• Galwala Wildlife Sanctuary</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-1">
            Wildlife Threat Map & Incident Dispatch
          </h1>
          <p className="text-xs text-slate-400">
            Real-time geospatial tracking of poacher snares, carcasses, and illegal activity with instant field ranger dispatch.
          </p>
        </div>

        {/* Live Status KPI Badges */}
        <div className="flex items-center space-x-2.5 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-amber-400 font-bold uppercase block">Active Threats</span>
            <span className="text-base font-black text-white">{activeCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-blue-400 font-bold uppercase block">Dispatched</span>
            <span className="text-base font-black text-white">{dispatchedCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-emerald-400 font-bold uppercase block">Resolved</span>
            <span className="text-base font-black text-white">{resolvedCount}</span>
          </div>
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-5">
        <div className="flex items-center space-x-2">
          {/* Map vs List View Toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center text-xs">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Interactive Map</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Incident List</span>
            </button>
          </div>

          {/* Type Filters */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {['ALL', 'SNARE', 'CARCASS', 'ILLEGAL_CAMPSITE'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition text-[11px] ${
                  selectedFilter === f ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchIncidents}
          disabled={isLoading}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Main Workspace: Spatial Map / List on Left, Comprehensive Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INTERACTIVE MAP OR LIST */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {viewMode === 'map' ? (
            /* REAL INTERACTIVE SATELLITE & RESERVE SPATIAL MAP */
            <WildlifeReserveMap
              incidents={incidents}
              selectedIncidentId={selectedIncident?.id}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onDispatchIncident={(inc) => {
                setSelectedIncident(inc);
                setIsDispatchModalOpen(true);
              }}
              rangers={RANGER_MAP_DATA}
              height="540px"
            />
          ) : (
            /* INCIDENT LIST VIEW */
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {incidents.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedIncident(item)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedIncident?.id === item.id
                      ? 'bg-slate-800/90 border-emerald-500/70 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                        {getTypeIcon(item.type)}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase ${getTypeBadge(item.type)}`}>
                        {item.type}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-200 line-clamp-2 mb-2">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1 font-mono text-emerald-400">
                      <MapPin className="w-3 h-3" />
                      {item.coordinates[0].toFixed(4)}°N, {item.coordinates[1].toFixed(4)}°E
                    </span>
                    <span className="font-mono text-slate-500">{item.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED INCIDENT INSPECTOR & DISPATCH ACTIONS */}
        <div className="lg:col-span-5">
          {selectedIncident ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-2xl sticky top-4">
              
              {/* Header Title & Status */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border uppercase ${getTypeBadge(selectedIncident.type)}`}>
                      {selectedIncident.type}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedIncident.id}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                    {selectedIncident.description}
                  </h3>
                </div>

                <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${getStatusBadge(selectedIncident.status)}`}>
                  {selectedIncident.status}
                </span>
              </div>

              {/* Photo Evidence if present */}
              {selectedIncident.photoUrl && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Field Photo Evidence
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black max-h-48 flex items-center justify-center">
                    <img src={selectedIncident.photoUrl} alt="Evidence" className="w-full h-48 object-cover" />
                  </div>
                </div>
              )}

              {/* GPS Coordinates & Sector */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" /> GPS Coordinates
                  </span>
                  <p className="text-xs font-mono font-bold text-emerald-300">
                    {selectedIncident.coordinates[0].toFixed(6)}° N
                  </p>
                  <p className="text-xs font-mono font-bold text-emerald-300">
                    {selectedIncident.coordinates[1].toFixed(6)}° E
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400" /> Reporting Ranger
                  </span>
                  <p className="text-xs font-bold text-white truncate">{selectedIncident.reporterName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedIncident.reporterId}</p>
                </div>
              </div>

              {/* Strategy Validated Metadata */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Strategy-Validated Metadata
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(selectedIncident.metadata || {}).map(([key, val]) => (
                    <div key={key} className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 uppercase block font-semibold">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="font-bold text-white text-[11px] font-mono">
                        {typeof val === 'boolean' ? (val ? 'YES' : 'NO') : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment & Resolution History (If Dispatched or Resolved) */}
              {selectedIncident.assignedRangerName && (
                <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/60 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-blue-400 uppercase flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Dispatched Response Team
                  </span>
                  <p className="font-bold text-white">{selectedIncident.assignedRangerName}</p>
                  {selectedIncident.dispatchNotes && (
                    <p className="text-[11px] text-slate-300 italic">"{selectedIncident.dispatchNotes}"</p>
                  )}
                </div>
              )}

              {selectedIncident.resolutionNotes && (
                <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800/60 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                    <FileCheck className="w-3 h-3" /> Resolution Report
                  </span>
                  <p className="text-[11px] text-slate-200">{selectedIncident.resolutionNotes}</p>
                </div>
              )}

              {/* ACTION DISPATCH / RESOLUTION BUTTONS */}
              <div className="pt-2 space-y-2">
                {selectedIncident.status === 'RECORDED' ? (
                  <button
                    onClick={() => setIsDispatchModalOpen(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-2xl text-xs uppercase tracking-wider text-white shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Dispatch Field Ranger to Coordinates</span>
                  </button>
                ) : selectedIncident.status === 'DISPATCHED' ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsResolveModalOpen(true)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-2xl text-xs uppercase tracking-wider text-white shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Resolve Incident & File Debrief</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Threat Neutralized & Formally Resolved</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 text-center text-slate-500">
              Select an incident from the map or list to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: DISPATCH RANGER MODAL */}
      {isDispatchModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white">Dispatch Field Tactical Team</h3>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Target Coordinates</span>
              <p className="font-mono text-emerald-400 font-bold">
                {selectedIncident.coordinates[0].toFixed(6)}° N, {selectedIncident.coordinates[1].toFixed(6)}° E
              </p>
              <p className="text-slate-300 font-medium">{selectedIncident.description}</p>
            </div>

            {/* Select Ranger (Ranked by Proximity) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Select Available Patrol Unit *</label>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Proximity Auto-Ranked
                </span>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {rankRangersByProximity(selectedIncident.coordinates, RANGER_MAP_DATA).map(({ ranger, distanceMeters, etaMinutes }, idx) => (
                  <div
                    key={ranger.rangerId}
                    onClick={() => setSelectedRangerId(ranger.rangerId)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      selectedRangerId === ranger.rangerId
                        ? 'bg-red-950/60 border-red-500 text-white shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {idx === 0 && <span className="text-[10px] text-amber-400 font-bold">⭐ NEAREST</span>}
                        <p className="text-xs font-bold leading-tight">{ranger.name}</p>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {ranger.callsign} • <strong className="text-emerald-400">{distanceMeters}m away</strong> (ETA ~{etaMinutes} min)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 block">
                        {ranger.batteryLevel}% Batt
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase">{ranger.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Directive Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Tactical Directives / Orders</label>
              <textarea
                rows={2}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleConfirmDispatch}
              disabled={isSubmittingDispatch}
              className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-xl text-xs uppercase text-white flex items-center justify-center gap-2 shadow"
            >
              {isSubmittingDispatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Confirm & Dispatch Team</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLVE INCIDENT MODAL */}
      {isResolveModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Resolve Incident on Scene</h3>
              </div>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Incident ID: {selectedIncident.id}</span>
              <p className="text-slate-300">{selectedIncident.description}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Action Debrief & Resolution Notes *</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe actions taken (e.g., snare wire cut and removed, carcass sampled, camp extinguished)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleConfirmResolve}
              disabled={isSubmittingResolve}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-xs uppercase text-white flex items-center justify-center gap-2 shadow"
            >
              {isSubmittingResolve ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Mark Incident as Resolved</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
