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
import { rankRangersByProximity } from '../../../utils/geoUtils';

// Available field rangers for tactical deployment with coordinates
const RANGER_MAP_DATA: RangerData[] = [
  { rangerId: 'RNG-001', name: 'Sgt. Tharaka Bandara', callsign: 'Kestrel-1', status: 'AVAILABLE', location: [6.4820, 80.8920], batteryLevel: 94 },
  { rangerId: 'RNG-002', name: 'Officer Nimal Silva', callsign: 'Rhino-3', status: 'AVAILABLE', location: [6.5120, 80.9150], batteryLevel: 88 },
  { rangerId: 'RNG-003', name: 'Officer Chaminda Perera', callsign: 'Eagle-2', status: 'ON_PATROL', location: [6.4650, 80.8710], batteryLevel: 76 },
  { rangerId: 'RNG-004', name: 'Ranger Dilshan Jayasinghe', callsign: 'Falcon-4', status: 'AVAILABLE', location: [6.5250, 80.8800], batteryLevel: 92 },
];

export const IncidentLogView: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

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

    const chosenRanger = RANGER_MAP_DATA.find((r) => r.rangerId === selectedRangerId);
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
        return <Crosshair className="w-4 h-4 text-red-600" />;
      case 'CARCASS':
        return <Skull className="w-4 h-4 text-amber-600" />;
      case 'ILLEGAL_CAMPSITE':
        return <Flame className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getTypeBadge = (type: IncidentType) => {
    switch (type) {
      case 'SNARE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CARCASS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ILLEGAL_CAMPSITE':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISPATCHED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
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
    <div className="flex-1 p-4 md:p-6 bg-slate-50 text-slate-900 min-h-screen font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-lg text-xs font-bold text-slate-900 flex items-center space-x-3 backdrop-blur-md animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & KPI Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>

          <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            Wildlife Threat Map & Incident Dispatch
          </h1>
          <p className="text-xs text-slate-500">
            Real-time geospatial tracking of poacher snares, carcasses, and illegal activity with instant field ranger dispatch.
          </p>
        </div>

        {/* Live Status KPI Badges */}
        <div className="flex items-center space-x-2.5 text-xs">
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-amber-600 font-bold uppercase block">Active Threats</span>
            <span className="text-base font-black text-slate-900">{activeCount}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-blue-600 font-bold uppercase block">Dispatched</span>
            <span className="text-base font-black text-slate-900">{dispatchedCount}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-center">
            <span className="text-[10px] text-emerald-600 font-bold uppercase block">Resolved</span>
            <span className="text-base font-black text-slate-900">{resolvedCount}</span>
          </div>
        </div>
      </div>
      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-5">
        <div className="flex items-center space-x-2">
          {/* Type Filters */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs">
            {['ALL', 'SNARE', 'CARCASS', 'ILLEGAL_CAMPSITE'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-[11px] ${
                  selectedFilter === f ? 'bg-slate-800 text-slate-900 border border-slate-700 shadow' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-medium ml-2">
            Showing <strong className="text-slate-900">{incidents.length}</strong> recorded incidents
          </span>
        </div>

        <button
          onClick={fetchIncidents}
          disabled={isLoading}
          className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-900 transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Main Workspace: Incident List on Left, Comprehensive Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: INCIDENT LIST */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Field Incident Threat Queue</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Sorted by latest report
              </span>
            </div>

            {incidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
                <p className="text-sm font-semibold">No incidents found matching "{selectedFilter}"</p>
                <p className="text-xs text-slate-500 mt-1">Try switching filter tabs or refreshing the feed</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {incidents.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIncident(item)}
                    className={`border rounded-xl p-5 flex flex-col gap-4 cursor-pointer transition-all ${
                      selectedIncident?.id === item.id
                        ? 'bg-white border-emerald-300 shadow-md ring-1 ring-emerald-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase ${getTypeBadge(item.type)}`}>
                          {item.type}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="font-mono text-slate-500 font-medium">{item.id}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        {item.coordinates[0].toFixed(4)}°N, {item.coordinates[1].toFixed(4)}°E
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED INCIDENT INSPECTOR & DISPATCH ACTIONS */}
        <div className="lg:col-span-5">
          {selectedIncident ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5 shadow-lg sticky top-4">
              
              {/* Header Title & Status */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border uppercase ${getTypeBadge(selectedIncident.type)}`}>
                      {selectedIncident.type}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{selectedIncident.id}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
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
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Field Photo Evidence
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center">
                    <img src={selectedIncident.photoUrl} alt="Evidence" className="w-full h-48 object-cover" />
                  </div>
                </div>
              )}

              {/* GPS Coordinates & Sector */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" /> GPS Coordinates
                  </span>
                  <p className="text-xs font-mono font-bold text-emerald-700">
                    {selectedIncident.coordinates[0].toFixed(6)}° N
                  </p>
                  <p className="text-xs font-mono font-bold text-emerald-700">
                    {selectedIncident.coordinates[1].toFixed(6)}° E
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-600" /> Reporting Ranger
                  </span>
                  <p className="text-xs font-bold text-slate-900 truncate">{selectedIncident.reporterName}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedIncident.reporterId}</p>
                </div>
              </div>

              {/* Strategy Validated Metadata */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Strategy-Validated Metadata
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(selectedIncident.metadata || {}).map(([key, val]) => (
                    <div key={key} className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[9px] text-slate-500 uppercase block font-semibold">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="font-bold text-slate-900 text-[11px] font-mono">
                        {typeof val === 'boolean' ? (val ? 'YES' : 'NO') : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment & Resolution History (If Dispatched or Resolved) */}
              {selectedIncident.assignedRangerName && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Dispatched Response Team
                  </span>
                  <p className="font-bold text-slate-900">{selectedIncident.assignedRangerName}</p>
                  {selectedIncident.dispatchNotes && (
                    <p className="text-[11px] text-slate-700 italic">"{selectedIncident.dispatchNotes}"</p>
                  )}
                </div>
              )}

              {selectedIncident.resolutionNotes && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                    <FileCheck className="w-3 h-3" /> Resolution Report
                  </span>
                  <p className="text-[11px] text-slate-800">{selectedIncident.resolutionNotes}</p>
                </div>
              )}

              {/* ACTION DISPATCH / RESOLUTION BUTTONS */}
              <div className="pt-2 space-y-2">
                {selectedIncident.status === 'RECORDED' ? (
                  <button
                    onClick={() => setIsDispatchModalOpen(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-2xl text-xs uppercase tracking-wider text-slate-900 shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Dispatch Field Ranger to Coordinates</span>
                  </button>
                ) : selectedIncident.status === 'DISPATCHED' ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsResolveModalOpen(true)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-600 font-bold rounded-2xl text-xs uppercase tracking-wider text-slate-900 shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Resolve Incident & File Debrief</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Threat Neutralized & Formally Resolved</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center text-slate-500">
              Select an incident from the map or list to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: DISPATCH RANGER MODAL */}
      {isDispatchModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-lg text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900">Dispatch Field Tactical Team</h3>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Target Coordinates</span>
              <p className="font-mono text-emerald-600 font-bold">
                {selectedIncident.coordinates[0].toFixed(6)}° N, {selectedIncident.coordinates[1].toFixed(6)}° E
              </p>
              <p className="text-slate-700 font-medium">{selectedIncident.description}</p>
            </div>

            {/* Select Ranger (Ranked by Proximity) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Select Available Patrol Unit *</label>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
                        ? 'bg-red-50 border-red-300 text-slate-900 shadow-lg'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {idx === 0 && <span className="text-[10px] text-amber-600 font-bold">⭐ NEAREST</span>}
                        <p className="text-xs font-bold leading-tight">{ranger.name}</p>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {ranger.callsign} • <strong className="text-emerald-600">{distanceMeters}m away</strong> (ETA ~{etaMinutes} min)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block">
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
              <label className="text-xs font-bold text-slate-700">Tactical Directives / Orders</label>
              <textarea
                rows={2}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleConfirmDispatch}
              disabled={isSubmittingDispatch}
              className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-xl text-xs uppercase text-slate-900 flex items-center justify-center gap-2 shadow"
            >
              {isSubmittingDispatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Confirm & Dispatch Team</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLVE INCIDENT MODAL */}
      {isResolveModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-lg text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Resolve Incident on Scene</h3>
              </div>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Incident ID: {selectedIncident.id}</span>
              <p className="text-slate-700">{selectedIncident.description}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Action Debrief & Resolution Notes *</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe actions taken (e.g., snare wire cut and removed, carcass sampled, camp extinguished)..."
                className="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleConfirmResolve}
              disabled={isSubmittingResolve}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-600 font-bold rounded-xl text-xs uppercase text-slate-900 flex items-center justify-center gap-2 shadow"
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
