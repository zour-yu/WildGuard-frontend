import React, { useState, useEffect } from 'react';
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
import { telemetryService } from '../../services/telemetryService';
import { getSocket } from '../../services/socket';

interface ManagerTelemetryViewProps {
  onOpenRangerTerminal?: () => void;
}

export const ManagerTelemetryView: React.FC<ManagerTelemetryViewProps> = ({
  onOpenRangerTerminal,
}) => {
  // State
  const [telemetryList, setTelemetryList] = useState<CollarTelemetryData[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertDispatchData[]>([]);
  const [geofenceZones, setGeofenceZones] = useState<GeofenceZoneData[]>([]);
  const [rangers, setRangers] = useState<RangerData[]>([]);
  const [selectedAlertForDispatch, setSelectedAlertForDispatch] =
    useState<AlertDispatchData | null>(null);
  const [selectedRangerId, setSelectedRangerId] = useState<string>('RNG-001');
  const [dispatchNotes, setDispatchNotes] = useState<string>(
    'Deploy acoustic sirens and redirect herd back across electric boundary.'
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [simulatorRunning, setSimulatorRunning] = useState<boolean>(true);
  const [bannerToast, setBannerToast] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [collars, alerts, zones, availableRangers] = await Promise.all([
        telemetryService.getLatestCollars().catch(() => []),
        telemetryService.getActiveAlerts().catch(() => []),
        telemetryService.getGeofenceZones().catch(() => []),
        telemetryService.getAvailableRangers().catch(() => []),
      ]);

      if (collars.length > 0) setTelemetryList(collars);
      setActiveAlerts(alerts);
      setGeofenceZones(zones);
      setRangers(availableRangers);
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
        `CRITICAL GEOFENCE BREACH: ${newBreach.animalName} crossed into ${newBreach.zoneName}`
      );
      setTimeout(() => setBannerToast(null), 8000);
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
      setBannerToast(`Field Ranger ${updated.assignedRangerName} dispatched.`);
      setTimeout(() => setBannerToast(null), 5000);
    } catch (err) {
      console.error('Error assigning ranger:', err);
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

          {/* Notification Bell with Red Badge Dot from screenshot */}
          <div className="relative p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-sm text-slate-600 hover:text-slate-900 cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </div>
        </div>
      </div>

      {/* BREACH ALERT BANNER (Active when geofence is violated) */}
      {primaryBreachAlert && (
        <div className="bg-red-50/90 border border-red-200 text-slate-900 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                  GEOFENCE BREACH
                </span>
                <span className="text-xs font-mono text-red-700 font-semibold">
                  Collar: {primaryBreachAlert.collarId}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {primaryBreachAlert.animalName} entered {primaryBreachAlert.zoneName}
              </p>
              <p className="text-xs text-slate-500">
                Ray-Casting algorithm confirmed boundary breach. Immediate response required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedAlertForDispatch(primaryBreachAlert)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Ranger
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
        
        {/* LEFT / CENTER CARD: INTERACTIVE GEOFENCE MAP & SPATIAL HOTSPOT GRID */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 flex flex-col justify-between min-h-[460px]">
          {/* Subtle Grid Canvas */}
          <div className="bg-grid-pattern-dense border border-slate-100 rounded-xl flex-1 p-4 relative min-h-[400px] flex flex-col justify-between overflow-hidden">
            
            {/* Top Info Tags */}
            <div className="flex items-center justify-between z-10">
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-lg px-3 py-1.5 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Sector: Galwala Boundary (Grid 8A)</span>
              </div>

              <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-lg px-3 py-1.5 shadow-sm text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Sensor Network: Operational</span>
              </div>
            </div>

            {/* Central Cluster Markers Matching the Screenshot */}
            <div className="relative w-full h-56 flex items-center justify-center my-auto">
              {/* Simulated Geofence Danger Boundary Line */}
              <div className="absolute inset-x-12 inset-y-6 border-2 border-dashed border-red-300 rounded-3xl pointer-events-none opacity-40 bg-red-50/20"></div>

              {/* Marker 3 (Amber - Top) */}
              <div
                className="absolute top-6 left-[46%] transform -translate-x-1/2 group cursor-pointer"
                title="Cluster 3: Corridor Transit Path"
              >
                <div className="w-7 h-7 rounded-full bg-[#f59e0b] text-white flex items-center justify-center font-bold text-xs shadow-md">
                  3
                </div>
              </div>

              {/* Marker 6 (Orange - Left) */}
              <div
                className="absolute top-28 left-[32%] transform -translate-x-1/2 group cursor-pointer"
                title="Cluster 6: Farmland Perimeter Boundary"
              >
                <div className="w-8 h-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs shadow-md">
                  6
                </div>
              </div>

              {/* Marker 14 (Critical Hotspot - Center Left from Screenshot) */}
              <div
                className="absolute top-36 left-[45%] transform -translate-x-1/2 group cursor-pointer z-20"
                title="Primary Hotspot: Active Elephant Geofence Breach"
                onClick={() => primaryBreachAlert && setSelectedAlertForDispatch(primaryBreachAlert)}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#b91c1c] text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-red-500/30 ring-4 ring-red-100 animate-pulse">
                    14
                  </div>
                  {/* Tooltip Card overlay on the primary hotspot */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-md shadow-md whitespace-nowrap flex items-center gap-1.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                    <span>Tusker 04 • Breach Active</span>
                  </div>
                </div>
              </div>

              {/* Marker 7 (Red - Right) */}
              <div
                className="absolute top-32 left-[68%] transform -translate-x-1/2 group cursor-pointer"
                title="Cluster 7: Water Reservoir Edge"
              >
                <div className="w-7 h-7 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-bold text-xs shadow-md">
                  7
                </div>
              </div>
            </div>

            {/* Bottom Info Tags */}
            <div className="flex items-center justify-between z-10 pt-2">
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-lg px-3 py-1.5 shadow-sm text-xs font-mono font-medium text-slate-600">
                Coordinates: {currentTelemetry.location[0].toFixed(4)}° N,{' '}
                {currentTelemetry.location[1].toFixed(4)}° E
              </div>

              <div className="bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-lg px-3 py-1.5 shadow-sm text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-slate-700">Battery:</span>{' '}
                  <span className="text-emerald-600 font-bold">{currentTelemetry.batteryLevel}%</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-slate-700">Speed:</span>{' '}
                  <span>{currentTelemetry.speedKmh || 4.2} km/h</span>
                </span>
              </div>
            </div>
          </div>
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
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              UC-04 Animal Risk Alerts & Field Dispatch Registry
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of real-time geofence breaches, ranger assignments, and UC-01 incident handoffs.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {activeAlerts.length} Recorded Alerts
          </span>
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

            {/* Select Ranger */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">Select Available Field Ranger:</label>
              <select
                value={selectedRangerId}
                onChange={(e) => setSelectedRangerId(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                {rangers.map((r) => (
                  <option key={r.rangerId} value={r.rangerId}>
                    {r.name} ({r.callsign}) - Status: {r.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Dispatch Instructions */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">Operational Mission Directives:</label>
              <textarea
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                rows={3}
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
                Confirm & Transmit Dispatch
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
    </div>
  );
};
