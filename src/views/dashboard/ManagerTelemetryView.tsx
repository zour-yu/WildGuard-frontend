import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Play,
  Square,
  FastForward,
  ShieldAlert,
  MapPin,
  Camera,
  UserCheck,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  ChevronRight,
  Activity,
  Compass,
} from 'lucide-react';
import {
  CollarTelemetryData,
  AlertDispatchData,
  GeofenceZoneData,
  RangerData,
} from '../../types/telemetry';
import { Incident } from '../../types/incident';
import { telemetryService } from '../../services/telemetryService';
import { incidentApiClient } from '../../services/api.client';
import { getSocket } from '../../services/socket';
import { WildlifeReserveMap } from '../../components/map/WildlifeReserveMap';
import { rankRangersByProximity } from '../../utils/geoUtils';

interface ManagerTelemetryViewProps {
  onOpenRangerTerminal?: () => void;
  onNavigateToDispatchLog?: () => void;
}

export const ManagerTelemetryView: React.FC<ManagerTelemetryViewProps> = ({
  onOpenRangerTerminal,
  onNavigateToDispatchLog,
}) => {
  // State
  const [telemetryList, setTelemetryList] = useState<CollarTelemetryData[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertDispatchData[]>([]);
  const [geofenceZones, setGeofenceZones] = useState<GeofenceZoneData[]>([]);
  const [rangers, setRangers] = useState<RangerData[]>([]);
  const [recordedIncidents, setRecordedIncidents] = useState<Incident[]>([]);
  const [selectedAlertForDispatch, setSelectedAlertForDispatch] =
    useState<AlertDispatchData | null>(null);
  const [selectedIncidentForDispatch, setSelectedIncidentForDispatch] =
    useState<Incident | null>(null);
  const [selectedRangerId, setSelectedRangerId] = useState<string>('RNG-001');
  const [dispatchNotes, setDispatchNotes] = useState<string>(
    'Deploy acoustic deterrents and guide herd back toward sanctuary core.'
  );
  const [incidentDispatchNotes, setIncidentDispatchNotes] = useState<string>(
    'Deploy field ranger to assess incident coordinates and secure buffer zone.'
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [simulatorRunning, setSimulatorRunning] = useState<boolean>(true);
  const [bannerToast, setBannerToast] = useState<string | null>(null);

  // Compute rangers sorted by nearest distance to the selected alert
  const sortedRangersWithDistance = useMemo(() => {
    if (!selectedAlertForDispatch || !selectedAlertForDispatch.location) {
      return rangers;
    }
    const [alertLat, alertLng] = selectedAlertForDispatch.location;
    const calculateDistance = (p1: [number, number], p2: [number, number]) => {
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(p2[0] - p1[0]);
      const dLon = toRad(p2[1] - p1[1]);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.sin(dLon / 2) ** 2;
      return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
    };

    const list = rangers.map((r) => {
      const dist = r.distanceKm ?? calculateDistance([alertLat, alertLng], r.location);
      const eta = r.etaMinutes ?? Math.max(2, Math.ceil((dist / 30) * 60));
      return {
        ...r,
        distanceKm: dist,
        etaMinutes: eta,
      };
    });

    list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    return list;
  }, [rangers, selectedAlertForDispatch]);

  // When opening dispatch modal, default to nearest ranger
  useEffect(() => {
    if (selectedAlertForDispatch && sortedRangersWithDistance.length > 0) {
      setSelectedRangerId(sortedRangersWithDistance[0].rangerId);
    }
  }, [selectedAlertForDispatch, sortedRangersWithDistance]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [collars, alerts, zones, availableRangers, incidents] = await Promise.all([
        telemetryService.getLatestCollars().catch(() => []),
        telemetryService.getActiveAlerts().catch(() => []),
        telemetryService.getGeofenceZones().catch(() => []),
        telemetryService.getAvailableRangers().catch(() => []),
        incidentApiClient.fetchIncidents().catch(() => []),
      ]);

      if (collars.length > 0) setTelemetryList(collars);
      setActiveAlerts(alerts);
      setGeofenceZones(zones);
      setRangers(availableRangers);
      setRecordedIncidents(incidents);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();

    socket.on('telemetry:ping', (data: CollarTelemetryData) => {
      setTelemetryList((prev) => {
        const index = prev.findIndex((c) => c.collarId === data.collarId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [data, ...prev];
      });
    });

    socket.on('animal:breach', (newBreach: AlertDispatchData) => {
      setActiveAlerts((prev) => {
        const exists = prev.find((a) => a._id === newBreach._id);
        if (exists) return prev;
        return [newBreach, ...prev];
      });
      setBannerToast(
        `Boundary Advisory: ${newBreach.animalName} approached ${newBreach.zoneName}`
      );
      setTimeout(() => setBannerToast(null), 8000);
    });

    socket.on('incident:updated', (updatedInc: Incident) => {
      setRecordedIncidents((prev) => {
        const index = prev.findIndex((i) => i.id === updatedInc.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updatedInc;
          return next;
        }
        return [updatedInc, ...prev];
      });
    });

    socket.on('dispatch:updated', (payload: any) => {
      setActiveAlerts((prev) =>
        prev.map((alert) =>
          alert._id === payload.dispatchId
            ? {
                ...alert,
                status: payload.status,
                assignedRangerId: payload.assignedRangerId || alert.assignedRangerId,
                assignedRangerName: payload.assignedRangerName || alert.assignedRangerName,
                rejectionReason: payload.rejectionReason,
                notes: payload.notes || alert.notes,
              }
            : alert
        )
      );
    });

    return () => {
      socket.off('telemetry:ping');
      socket.off('animal:breach');
      socket.off('incident:updated');
      socket.off('dispatch:updated');
    };
  }, []);

  // Manager assigns ranger
  const handleAssignRanger = async () => {
    if (!selectedAlertForDispatch) return;

    try {
      setIsDispatching(true);
      const chosenRanger = rangers.find((r) => r.rangerId === selectedRangerId);
      const updated = await telemetryService.dispatchRanger(
        selectedAlertForDispatch._id,
        {
          rangerId: selectedRangerId,
          rangerName: chosenRanger?.name,
          notes: dispatchNotes,
        }
      );

      setActiveAlerts((prev) =>
        prev.map((a) => (a._id === updated._id ? updated : a))
      );

      setSelectedAlertForDispatch(null);
      setBannerToast(`Field Ranger ${updated.assignedRangerName} assigned to patrol.`);
      setTimeout(() => setBannerToast(null), 5000);
    } catch (err) {
      console.error('Error assigning ranger:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Assign ranger to UC-01 threat incident
  const handleAssignRangerToIncident = async () => {
    if (!selectedIncidentForDispatch) return;

    const chosenRanger = rangers.find((r) => r.rangerId === selectedRangerId);
    try {
      setIsDispatching(true);
      const updated = await incidentApiClient.dispatchIncident(
        selectedIncidentForDispatch.id,
        {
          rangerId: selectedRangerId,
          rangerName: chosenRanger?.name,
          notes: incidentDispatchNotes,
        }
      );

      setRecordedIncidents((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
      setSelectedIncidentForDispatch(null);
      setBannerToast(
        `Field Ranger ${chosenRanger?.name || selectedRangerId} assigned to incident.`
      );
      setTimeout(() => setBannerToast(null), 5000);
    } catch (err) {
      console.warn('Incident dispatch optimistic update fallback:', err);
      const optimisticUpdated: Incident = {
        ...selectedIncidentForDispatch,
        status: 'DISPATCHED',
        assignedRangerId: selectedRangerId,
        assignedRangerName: chosenRanger?.name || `Ranger ${selectedRangerId}`,
        dispatchNotes: incidentDispatchNotes,
        dispatchedAt: new Date().toISOString(),
      };
      setRecordedIncidents((prev) =>
        prev.map((i) => (i.id === optimisticUpdated.id ? optimisticUpdated : i))
      );
      setSelectedIncidentForDispatch(null);
      setBannerToast(
        `Field Ranger ${chosenRanger?.name || selectedRangerId} assigned (Local).`
      );
      setTimeout(() => setBannerToast(null), 5000);
    } finally {
      setIsDispatching(false);
    }
  };

  // Step simulator
  const handleStepPing = async () => {
    try {
      await telemetryService.triggerSimulatorStep();
    } catch (err) {
      console.error('Error triggering step:', err);
    }
  };

  // Toggle simulator
  const handleToggleSimulator = async () => {
    try {
      const res = await telemetryService.toggleSimulator();
      setSimulatorRunning(res.isRunning);
    } catch (err) {
      console.error('Error toggling simulator:', err);
    }
  };

  const primaryBreachAlert =
    activeAlerts.find((a) => a.status === 'ACTIVE' || a.status === 'ACCEPTED') ||
    activeAlerts[0] ||
    null;

  const currentTelemetry = telemetryList[0] || {
    collarId: 'COL-EL-904',
    animalName: 'Raja (Alpha Tusker)',
    species: 'Asian Elephant (Elephas maximus)',
    location: [8.3114, 80.4037],
    batteryLevel: 88,
    speedKmh: 4.8,
    heading: 142,
    timestamp: new Date().toISOString(),
    isBreaching: true,
    breachZoneName: 'Sector: Galwala Boundary (Grid 8A)',
  };

  return (
    <div className="flex-1 bg-[#f8fafc] text-slate-800 p-4 lg:p-8 space-y-6">
      {/* TOP HEADER SECTION (Matches Screenshot Theme) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Human-Wildlife Conflict Hotspots
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verified community incident tracking and field response management.
          </p>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleToggleSimulator}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              simulatorRunning
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title="Toggle background collar telemetry simulator"
          >
            {simulatorRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {simulatorRunning ? 'Simulator Active' : 'Simulator Paused'}
            </span>
          </button>

          <button
            onClick={handleStepPing}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            title="Step next simulated GPS ping"
          >
            <FastForward className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Step GPS</span>
          </button>

          {/* Notification Bell with Red Badge Dot */}
          <div className="relative p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-sm text-slate-600 hover:text-slate-900 cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </div>
        </div>
      </div>

      {/* BOUNDARY ADVISORY BANNER (Active when elephant is near buffer) */}
      {primaryBreachAlert && (
        <div className="bg-amber-50/90 border border-amber-200 text-slate-900 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
                  BOUNDARY ADVISORY
                </span>
                <span className="text-xs font-mono text-amber-800 font-semibold">
                  Collar: {primaryBreachAlert.collarId}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {primaryBreachAlert.animalName} approached {primaryBreachAlert.zoneName}
              </p>
              <p className="text-xs text-slate-500">
                Collar telemetry indicates herd movement near agricultural buffer. Recommended action: assign patrol unit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedAlertForDispatch(primaryBreachAlert)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Assign Ranger Patrol
            </button>
            {onOpenRangerTerminal && (
              <button
                onClick={onOpenRangerTerminal}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Ranger View</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT / CENTER CARD: REAL HIGH-FIDELITY SATELLITE & RESERVE SPATIAL MAP */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <WildlifeReserveMap
            telemetryList={telemetryList}
            geofenceZones={geofenceZones}
            rangers={rangers}
            incidents={recordedIncidents}
            onDispatchIncident={(inc) => {
              setSelectedIncidentForDispatch(inc);
            }}
            height="500px"
          />
        </div>

        {/* RIGHT COLUMN: 3 STACKED CARDS MATCHING EXACT SCREENSHOT */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          
          {/* CARD 1: MONTHLY INCIDENT VOLUME */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              MONTHLY INCIDENT VOLUME
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 mb-4">
              42 Total Reports
            </div>

            {/* Bar Chart Matching the Screenshot */}
            <div className="flex items-end justify-between gap-2 h-28 pt-2 px-1">
              {/* May */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-200 rounded-t h-8"></div>
                <span className="text-[11px] text-slate-400">May</span>
              </div>
              {/* Jun */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-200 rounded-t h-14"></div>
                <span className="text-[11px] text-slate-400">Jun</span>
              </div>
              {/* Jul */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-200 rounded-t h-12"></div>
                <span className="text-[11px] text-slate-400">Jul</span>
              </div>
              {/* Aug */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-[#f59e0b] rounded-t h-20"></div>
                <span className="text-[11px] text-slate-400">Aug</span>
              </div>
              {/* Sep */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-[#f97316] rounded-t h-24"></div>
                <span className="text-[11px] text-slate-400">Sep</span>
              </div>
              {/* Oct */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-[#dc2626] rounded-t h-28"></div>
                <span className="text-[11px] text-slate-400 font-bold text-slate-700">Oct</span>
              </div>
            </div>
          </div>

          {/* CARD 2: PRIMARY HOTSPOT */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                PRIMARY HOTSPOT
              </span>
              <span className="bg-red-50 text-red-600 border border-red-200/80 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                High Alert
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Galwala – Handapanagala
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                14 active reports logged this week
              </p>
            </div>

            {/* Red progress risk bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#dc2626] h-full w-[78%] rounded-full"></div>
            </div>

            {/* Embedded Optical Trap Snapshot */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 mt-2 bg-slate-900">
              <img
                src={
                  primaryBreachAlert?.cameraTrapImageUrl ||
                  'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80'
                }
                alt="Camera trap elephant"
                className="w-full h-28 object-cover opacity-90"
              />
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-emerald-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Camera className="w-3 h-3" />
                VERIFIED: 98.4% ELEPHANT
              </div>
            </div>
          </div>

          {/* CARD 3: LATEST INCIDENT */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                LATEST INCIDENT
              </span>
              <span className="bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                Pending Dispatch
              </span>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Crop Damage – Paddy Field
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reported by W. Fernando • 12 mins ago
              </p>
            </div>

            {/* Action button */}
            {primaryBreachAlert ? (
              <button
                onClick={() => setSelectedAlertForDispatch(primaryBreachAlert)}
                className="w-full mt-2 py-2.5 bg-[#0c1427] hover:bg-[#18233c] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Field Ranger</span>
              </button>
            ) : (
              <button
                disabled
                className="w-full mt-2 py-2.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl"
              >
                No Active Dispatch Required
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LOWER SECTION: INCIDENT & DISPATCH AUDIT LOG TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              UC-04 Animal Risk Alerts & Field Dispatch Registry
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of real-time geofence breaches, ranger assignments, and UC-01 incident handoffs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              {activeAlerts.length} Active Records
            </span>
            {onNavigateToDispatchLog && (
              <button
                onClick={onNavigateToDispatchLog}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <span>View Full History Log</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Collar / Target</th>
                <th className="py-2.5 px-3">Zone Breached</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Coordinates</th>
                <th className="py-2.5 px-3">Assigned Ranger</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {activeAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No breach alerts recorded. The simulator is monitoring boundaries...
                  </td>
                </tr>
              ) : (
                activeAlerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{alert.animalName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{alert.collarId}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                      {alert.zoneName}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alert.riskLevel === 'CRITICAL'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {alert.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {alert.location[0].toFixed(3)}, {alert.location[1].toFixed(3)}
                    </td>
                    <td className="py-3 px-3">
                      {alert.assignedRangerName ? (
                        <span className="text-slate-800 font-medium">
                          {alert.assignedRangerName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          alert.status === 'ACCEPTED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : alert.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : alert.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedAlertForDispatch(alert)}
                        className="px-2.5 py-1 bg-[#0c1427] hover:bg-[#18233c] text-white rounded-lg font-semibold text-[11px] shadow-sm"
                      >
                        Dispatch
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH MODAL (Light theme styled) */}
      {selectedAlertForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Dispatch Field Ranger Unit</h3>
              </div>
              <button
                onClick={() => setSelectedAlertForDispatch(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target Alert details */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                Target: {selectedAlertForDispatch.animalName} ({selectedAlertForDispatch.species})
              </p>
              <p className="text-slate-600">
                Breach Area: <span className="text-red-600 font-semibold">{selectedAlertForDispatch.zoneName}</span>
              </p>
              <p className="text-slate-500 font-mono">
                Coordinates: {selectedAlertForDispatch.location[0].toFixed(4)}° N,{' '}
                {selectedAlertForDispatch.location[1].toFixed(4)}° E
              </p>
            </div>

            {/* Select Ranger with Nearest Recommendation */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  Select Field Ranger Unit:
                </label>
                <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Sorted by GPS Proximity
                </span>
              </div>

              {/* Nearest Ranger Highlight Card */}
              {sortedRangersWithDistance.length > 0 && (
                <div className="bg-emerald-50/70 border-2 border-emerald-500 rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      ★
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {sortedRangersWithDistance[0].name}
                        </span>
                        <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          NEAREST
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        {sortedRangersWithDistance[0].callsign} •{' '}
                        <span className="font-bold">{sortedRangersWithDistance[0].distanceKm} km away</span> • ETA ~{sortedRangersWithDistance[0].etaMinutes} mins
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRangerId(sortedRangersWithDistance[0].rangerId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedRangerId === sortedRangersWithDistance[0].rangerId
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {selectedRangerId === sortedRangersWithDistance[0].rangerId ? 'Selected' : 'Select'}
                  </button>
                </div>
              )}

              {/* All Rangers Selector Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {sortedRangersWithDistance.map((r: any, index: number) => {
                  const isSelected = selectedRangerId === r.rangerId;
                  const isNearest = index === 0;

                  return (
                    <div
                      key={r.rangerId}
                      onClick={() => setSelectedRangerId(r.rangerId)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {r.name}
                        </span>
                        {isNearest && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                            Fastest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{r.callsign}</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {r.distanceKm} km ({r.etaMinutes}m ETA)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dispatch Instructions */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">Operational Mission Directives:</label>
              <textarea
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                placeholder="Specify tactical directives, acoustic deterrents, or route instructions..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAssignRanger}
                disabled={isDispatching}
                className="flex-1 py-3 bg-[#0c1427] hover:bg-[#18233c] text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Dispatch Ranger Unit
              </button>
              <button
                onClick={() => setSelectedAlertForDispatch(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT PATROL DISPATCH MODAL (Triggered from Map Pins) */}
      {selectedIncidentForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Assign Ranger Patrol to {selectedIncidentForDispatch.type}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncidentForDispatch(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target Incident details */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm uppercase">
                  {selectedIncidentForDispatch.type}
                </span>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                  {selectedIncidentForDispatch.id}
                </span>
              </div>
              <p className="text-slate-700 font-medium">
                {selectedIncidentForDispatch.description}
              </p>
              <p className="text-slate-500 font-mono">
                Coordinates: {selectedIncidentForDispatch.coordinates[0].toFixed(5)}° N,{' '}
                {selectedIncidentForDispatch.coordinates[1].toFixed(5)}° E
              </p>
            </div>

            {/* Select Ranger (Ranked by Proximity) */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Select Available Field Ranger:</label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Proximity Auto-Ranked
                </span>
              </div>
              <select
                value={selectedRangerId}
                onChange={(e) => setSelectedRangerId(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {rankRangersByProximity(selectedIncidentForDispatch.coordinates, rangers).map(({ ranger, distanceMeters, etaMinutes }, idx) => (
                  <option key={ranger.rangerId} value={ranger.rangerId}>
                    {idx === 0 ? '⭐ Nearest: ' : ''}{ranger.name} ({ranger.callsign}) — {distanceMeters}m away (ETA ~{etaMinutes} min) [{ranger.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Field Directives */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">Field Patrol Directives:</label>
              <textarea
                value={incidentDispatchNotes}
                onChange={(e) => setIncidentDispatchNotes(e.target.value)}
                rows={3}
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                placeholder="Directives for evidence collection, incident verification, or perimeter sweep..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAssignRangerToIncident}
                disabled={isDispatching}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Confirm & Assign Ranger
              </button>
              <button
                onClick={() => setSelectedIncidentForDispatch(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
