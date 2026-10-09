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
  Inbox,
  PhoneCall,
  Smartphone,
  Search,
  Filter,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  CollarTelemetryData,
  AlertDispatchData,
  GeofenceZoneData,
  RangerData,
} from '../../types/telemetry';
import { Incident } from '../../types/incident';
import { ConflictReport } from '../../types/conflict';
import { telemetryService } from '../../services/telemetryService';
import { incidentApiClient } from '../../services/api.client';
import { conflictService } from '../../services/conflictService';
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
  const [conflicts, setConflicts] = useState<ConflictReport[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictReport | null>(null);
  const [conflictFilter, setConflictFilter] = useState<'ALL' | 'UNREAD' | 'RESOLVED'>('ALL');
  const [conflictSearch, setConflictSearch] = useState<string>('');
  const [activeOperationsTab, setActiveOperationsTab] = useState<'CONFLICTS' | 'BREACHES' | 'UNIFIED'>('CONFLICTS');
  const [isSimulatingSms, setIsSimulatingSms] = useState<boolean>(false);
  const [isAutoSimulatingSms, setIsAutoSimulatingSms] = useState<boolean>(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState<boolean>(false);

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
      const [collars, alerts, zones, availableRangers, incidents, conflictList] = await Promise.all([
        telemetryService.getLatestCollars().catch(() => []),
        telemetryService.getActiveAlerts().catch(() => []),
        telemetryService.getGeofenceZones().catch(() => []),
        telemetryService.getAvailableRangers().catch(() => []),
        incidentApiClient.fetchIncidents().catch(() => []),
        conflictService.getConflicts().catch(() => []),
      ]);

      if (collars.length > 0) setTelemetryList(collars);
      setActiveAlerts(alerts);
      setGeofenceZones(zones);
      setRangers(availableRangers);
      setRecordedIncidents(incidents);
      setConflicts(conflictList);
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

    socket.on('conflict:new', (newConflict: ConflictReport) => {
      setConflicts((prev) => {
        const exists = prev.find((c) => c._id === newConflict._id);
        if (exists) return prev;
        return [newConflict, ...prev];
      });
      setBannerToast(
        `📢 Live ${newConflict.source} Conflict: ${newConflict.description.substring(0, 45)}...`
      );
      setTimeout(() => setBannerToast(null), 8000);
    });

    socket.on('conflict:updated', (updated: ConflictReport) => {
      setConflicts((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c))
      );
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
      socket.off('conflict:new');
      socket.off('conflict:updated');
      socket.off('incident:updated');
      socket.off('dispatch:updated');
    };
  }, []);

  // Auto-simulation interval for incoming SMS
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoSimulatingSms) {
      interval = setInterval(() => {
        handleSimulateSms();
      }, 12000);
    }
    return () => clearInterval(interval);
  }, [isAutoSimulatingSms]);

  // Simulate an incoming SMS conflict report
  const handleSimulateSms = async (customMsg?: string) => {
    try {
      setIsSimulatingSms(true);
      const msgs = [
        'Elephant herd spotted breaking perimeter fence near Sector 4 Farmland 8A.',
        'Lone bull elephant foraging near Handapanagala reservoir irrigation canal.',
        'SOS: Herd of 4 elephants approaching residential homes in Sector 5 buffer.',
        'Crop damage logged: Elephants entered paddy field along Western boundary.',
        'Elephant blocking rural transit road near Sector 2 Handapanagala basin.',
      ];
      const text = customMsg || msgs[Math.floor(Math.random() * msgs.length)];
      const res = await conflictService.simulateMockSms(text);
      if (res) {
        setConflicts((prev) => [res, ...prev.filter((c) => c._id !== res._id)]);
        setBannerToast(`📢 Simulated SMS Received: ${res.description.substring(0, 40)}...`);
        setTimeout(() => setBannerToast(null), 5000);
      }
    } catch (err) {
      console.error('Error simulating SMS:', err);
    } finally {
      setIsSimulatingSms(false);
    }
  };

  // Dispatch Ranger to a community conflict report
  const handleDispatchConflict = (conflict: ConflictReport) => {
    const lat = conflict.latitude || 6.8224;
    const lng = conflict.longitude || 80.9742;

    const conflictAlert: AlertDispatchData = {
      _id: conflict._id,
      animalId: 'CONFLICT-' + conflict._id,
      animalName: `${conflict.source} Conflict: ${conflict.location}`,
      species: 'Human-Wildlife Encounter',
      collarId: `${conflict.source}-HOTLINE`,
      zoneName: conflict.location,
      riskLevel: conflict.priority === 'HIGH' ? 'CRITICAL' : 'HIGH',
      location: [lat, lng],
      status: 'ACTIVE',
      cameraTrapImageUrl:
        conflict.imageUrl ||
        'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80',
      notes: `[Reporter: ${conflict.reporter}] ${conflict.description}`,
      createdAt: conflict.reportedAt,
      updatedAt: new Date().toISOString(),
    };

    setSelectedAlertForDispatch(conflictAlert);
    setDispatchNotes(
      `Deploy field patrol to resolve ${conflict.source} conflict at ${conflict.location}. Contact: ${conflict.reporter}. Note: ${conflict.description}`
    );
  };

  const handleAcknowledgeConflict = async (conflictId: string) => {
    try {
      await conflictService.updateStatus(conflictId, 'ACKNOWLEDGED');
      setConflicts((prev) =>
        prev.map((c) =>
          c._id === conflictId ? { ...c, status: 'ACKNOWLEDGED' } : c
        )
      );
      setBannerToast('Conflict report marked as acknowledged.');
      setTimeout(() => setBannerToast(null), 4000);
    } catch (err) {
      console.error('Error updating conflict status:', err);
    }
  };

  // Compute counts and latest conflict
  const unreadConflictCount = useMemo(
    () => conflicts.filter((c) => c.status === 'UNREAD').length,
    [conflicts]
  );
  const resolvedConflictCount = useMemo(
    () => conflicts.filter((c) => c.status === 'RESOLVED').length,
    [conflicts]
  );

  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (conflictFilter === 'UNREAD' && c.status !== 'UNREAD') return false;
      if (conflictFilter === 'RESOLVED' && c.status !== 'RESOLVED') return false;
      if (conflictSearch.trim()) {
        const q = conflictSearch.toLowerCase();
        return (
          c.description.toLowerCase().includes(q) ||
          c.reporter.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.source.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [conflicts, conflictFilter, conflictSearch]);

  const latestConflict = useMemo(() => {
    return conflicts.find((c) => c.status === 'UNREAD') || conflicts[0] || null;
  }, [conflicts]);

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

      // Also update conflict if this dispatch was initiated from a conflict
      if (
        selectedAlertForDispatch._id.startsWith('conf-') ||
        conflicts.some((c) => c._id === selectedAlertForDispatch._id)
      ) {
        await conflictService
          .updateStatus(selectedAlertForDispatch._id, 'DISPATCHED', dispatchNotes)
          .catch(() => {});
        setConflicts((prev) =>
          prev.map((c) =>
            c._id === selectedAlertForDispatch._id
              ? { ...c, status: 'DISPATCHED', notes: dispatchNotes }
              : c
          )
        );
      }

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
            conflicts={conflicts}
            selectedConflictId={selectedConflict?._id}
            onSelectConflict={(conf) => setSelectedConflict(conf)}
            onDispatchConflict={(conf) => handleDispatchConflict(conf)}
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

          {/* CARD 3: LATEST CONFLICT REPORT (Connected to live inbox) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                LATEST CONFLICT REPORT
              </span>
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                latestConflict?.status === 'UNREAD'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {latestConflict?.status === 'UNREAD' ? 'Pending Dispatch' : latestConflict?.status || 'Pending Dispatch'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">📢</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  {latestConflict?.source === 'SMS' ? 'SMS Hotline' : 'Citizen App'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {latestConflict ? new Date(latestConflict.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12 mins ago'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                {latestConflict ? latestConflict.location : 'Crop Damage – Paddy Field'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reported by {latestConflict ? latestConflict.reporter : 'W. Fernando • 12 mins ago'}
              </p>
              {latestConflict && (
                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                  "{latestConflict.description}"
                </p>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={() => {
                if (latestConflict) {
                  handleDispatchConflict(latestConflict);
                } else if (primaryBreachAlert) {
                  setSelectedAlertForDispatch(primaryBreachAlert);
                }
              }}
              className="w-full mt-2 py-2.5 bg-[#0c1427] hover:bg-[#18233c] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Field Ranger</span>
            </button>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: UNIFIED OPERATIONS HUB (CONFLICT INBOX + GEOFENCE BREACHES) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {/* Tab 1: Conflict Inbox */}
            <button
              onClick={() => setActiveOperationsTab('CONFLICTS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeOperationsTab === 'CONFLICTS'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Inbox className="w-4 h-4 text-rose-600" />
              <span>Conflict Inbox & Citizen Reports</span>
              {unreadConflictCount > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadConflictCount}
                </span>
              )}
            </button>

            {/* Tab 2: Geofence Breaches */}
            <button
              onClick={() => setActiveOperationsTab('BREACHES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeOperationsTab === 'BREACHES'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Radio className="w-4 h-4 text-amber-600" />
              <span>Collar Breaches & Alerts</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {activeAlerts.length}
              </span>
            </button>

            {/* Tab 3: Unified Stream */}
            <button
              onClick={() => setActiveOperationsTab('UNIFIED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeOperationsTab === 'UNIFIED'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>All Incidents Log</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick SMS simulation button */}
            <button
              onClick={() => handleSimulateSms()}
              disabled={isSimulatingSms}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Simulate an incoming SMS report from citizen"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>+ Simulate SMS</span>
            </button>

            {/* Auto SMS Simulation toggle */}
            <button
              onClick={() => setIsAutoSimulatingSms(!isAutoSimulatingSms)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                isAutoSimulatingSms
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle automatic incoming SMS simulator every 12 seconds"
            >
              {isAutoSimulatingSms ? 'Auto SMS: ON' : 'Auto SMS: OFF'}
            </button>

            {onNavigateToDispatchLog && (
              <button
                onClick={onNavigateToDispatchLog}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <span>Dispatch Log</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: CONFLICT INBOX VIEW */}
        {activeOperationsTab === 'CONFLICTS' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConflictFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    conflictFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Conflicts ({conflicts.length})
                </button>
                <button
                  onClick={() => setConflictFilter('UNREAD')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    conflictFilter === 'UNREAD'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>Unread ({unreadConflictCount})</span>
                </button>
                <button
                  onClick={() => setConflictFilter('RESOLVED')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    conflictFilter === 'RESOLVED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Resolved ({resolvedConflictCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by location, reporter..."
                  value={conflictSearch}
                  onChange={(e) => setConflictSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Conflicts Feed */}
            {filteredConflicts.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500 font-medium">No conflict reports matching current filter.</p>
                <button
                  onClick={() => handleSimulateSms()}
                  className="mt-2 text-xs text-rose-600 hover:text-rose-700 font-bold"
                >
                  + Simulate an incoming SMS report
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredConflicts.map((c) => {
                  const isUnread = c.status === 'UNREAD';
                  const isHigh = c.priority === 'HIGH';

                  return (
                    <div
                      key={c._id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isUnread
                          ? 'bg-white border-rose-200 shadow-sm ring-1 ring-rose-100'
                          : 'bg-slate-50/70 border-slate-200/80'
                      }`}
                    >
                      <div>
                        {/* Top Meta Line */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">📢</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              c.source === 'SMS'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {c.source === 'SMS' ? 'SMS Hotline' : 'Citizen App'}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              isHigh
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-amber-50 text-amber-600 border border-amber-200'
                            }`}>
                              {c.priority}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            c.status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.status === 'DISPATCHED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                          }`}>
                            {c.status}
                          </span>
                        </div>

                        {/* Location & Title */}
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{c.location}</span>
                        </h4>

                        {/* Description */}
                        <p className="text-xs text-slate-700 mt-1 font-normal leading-relaxed">
                          {c.description}
                        </p>

                        {/* Image Preview if present */}
                        {c.imageUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 max-h-24">
                            <img src={c.imageUrl} alt="Conflict Evidence" className="w-full h-24 object-cover" />
                          </div>
                        )}

                        {/* Reporter & Time details */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
                          <span>Reporter: <strong className="text-slate-700">{c.reporter}</strong></span>
                          <span className="font-mono">{new Date(c.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        {isUnread && (
                          <button
                            onClick={() => handleAcknowledgeConflict(c._id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                          >
                            Mark Read
                          </button>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => setSelectedConflict(c)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                          >
                            Locate
                          </button>
                          <button
                            onClick={() => handleDispatchConflict(c)}
                            className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch Ranger</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GEOFENCE BREACHES TABLE */}
        {activeOperationsTab === 'BREACHES' && (
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
                          className="px-2.5 py-1 bg-[#0c1427] hover:bg-[#18233c] text-white rounded-lg font-semibold text-[11px] shadow-sm cursor-pointer"
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
        )}

        {/* TAB 3: UNIFIED OPERATIONS STREAM */}
        {activeOperationsTab === 'UNIFIED' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Combined operational timeline of collar breaches, community conflicts, and ranger incidents.</span>
              <span className="font-bold">{activeAlerts.length + conflicts.length + recordedIncidents.length} Records Total</span>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Conflicts */}
              {conflicts.map((c) => (
                <div key={c._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs shrink-0">
                      📢
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">[{c.source} Conflict] {c.location}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({new Date(c.reportedAt).toLocaleTimeString()})</span>
                      </div>
                      <p className="text-slate-600 text-[11px] truncate max-w-md">{c.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {c.status}
                    </span>
                    <button
                      onClick={() => handleDispatchConflict(c)}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-bold"
                    >
                      Dispatch
                    </button>
                  </div>
                </div>
              ))}

              {/* Collar Alerts */}
              {activeAlerts.map((a) => (
                <div key={a._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0">
                      🐘
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">[Collar Breach] {a.animalName}</span>
                        <span className="text-[10px] text-amber-700 font-semibold">{a.zoneName}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] font-mono">Collar: {a.collarId} &bull; {a.riskLevel} Risk</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {a.status}
                    </span>
                    <button
                      onClick={() => setSelectedAlertForDispatch(a)}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-bold"
                    >
                      Dispatch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
