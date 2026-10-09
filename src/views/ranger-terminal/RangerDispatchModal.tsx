import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Radio,
  Clock,
  Compass,
  FileCheck2,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { AlertDispatchData } from '../../types/telemetry';
import { telemetryService } from '../../services/telemetryService';

interface RangerDispatchModalProps {
  alert: AlertDispatchData | null;
  currentRangerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: AlertDispatchData) => void;
  onViewDispatchLog?: () => void;
}

export const RangerDispatchModal: React.FC<RangerDispatchModalProps> = ({
  alert,
  currentRangerId = 'RNG-002',
  isOpen,
  onClose,
  onStatusUpdated,
  onViewDispatchLog,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('Obstacle / River crossing blocked');
  const [resolveMode, setResolveMode] = useState(false);
  const [resolutionSuccess, setResolutionSuccess] = useState(false);
  const [resolveNotes, setResolveNotes] = useState(
    'Flares and acoustic sirens deployed. Alpha elephant herd safely redirected back past electric perimeter fence. Zero casualties or village crop damage.'
  );

  if (!isOpen || !alert) return null;

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      const res = await telemetryService.respondToDispatch(alert._id, {
        rangerId: currentRangerId,
        action: 'ACCEPT',
        notes: 'En route to coordinate intercept point.',
      });
      if (onStatusUpdated) onStatusUpdated(res);
    } catch (err: any) {
      console.error('Failed to accept dispatch:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsSubmitting(true);
      const res = await telemetryService.respondToDispatch(alert._id, {
        rangerId: currentRangerId,
        action: 'REJECT',
        reason: rejectReason,
      });
      if (onStatusUpdated) onStatusUpdated(res);
      setRejectMode(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to reject dispatch:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    try {
      setIsSubmitting(true);
      const res = await telemetryService.resolveDispatch(alert._id, {
        notes: resolveNotes,
        incidentHandoffId: `INC-${Date.now().toString().slice(-6)}`,
      });
      if (onStatusUpdated) onStatusUpdated(res);
      setResolveMode(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to resolve dispatch:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Container adhering to assignment spec: w-full max-w-md mx-auto p-4 bg-white rounded-2xl shadow-2xl */}
      <div className="w-full max-w-md mx-auto p-5 bg-white rounded-2xl shadow-2xl border border-red-100 flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Ranger Tactical Intercept
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 rounded bg-slate-100"
          >
            Dismiss
          </button>
        </div>

        {/* Priority Banner */}
        <div className="bg-red-500 text-white rounded-xl p-3 flex items-center justify-between shadow-md shadow-red-500/20">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase opacity-90">
                Priority 1 Emergency Dispatch
              </p>
              <p className="text-sm font-black tracking-tight">
                {alert.riskLevel} RISK GEOFENCE BREACH
              </p>
            </div>
          </div>
          <span className="bg-white/20 text-xs px-2 py-1 rounded font-mono font-bold">
            {alert.collarId}
          </span>
        </div>

        {/* Camera Trap Verification Snapshot */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
          <img
            src={alert.cameraTrapImageUrl}
            alt={alert.animalName}
            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            CAM-TRAP: ELEPHANT CONFIRMED (98.6%)
          </div>
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm p-2 rounded-lg text-white text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-300 font-medium">{alert.species}</span>
              <p className="font-bold text-sm text-amber-300">{alert.animalName}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">EST. DISTANCE</span>
              <span className="text-xs font-bold text-red-300">~0.45 km to village</span>
            </div>
          </div>
        </div>

        {/* Breach Zone & Coordinate Telemetry */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Breached Zone</span>
              <p className="font-bold text-slate-900 text-sm">{alert.zoneName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 font-mono">
            <div>
              <span className="text-[10px] text-slate-400">COORDINATES</span>
              <p className="text-slate-700 font-semibold text-[11px]">
                {alert.location[0].toFixed(4)}° N, {alert.location[1].toFixed(4)}° E
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">ASSIGNED RANGER</span>
              <p className="text-emerald-700 font-semibold text-[11px]">
                {alert.assignedRangerName || currentRangerId}
              </p>
            </div>
          </div>
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-slate-500">Mission Status:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-[11px] ${
              alert.status === 'ACCEPTED'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : alert.status === 'REJECTED'
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : alert.status === 'RESOLVED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
            }`}
          >
            {alert.status === 'ACCEPTED' ? 'IN PROGRESS (EN ROUTE)' : alert.status}
          </span>
        </div>

        {/* REJECT MODE FORM */}
        {rejectMode && (
          <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-xs space-y-2">
            <p className="font-semibold text-red-800">Select Rejection / Escalation Reason:</p>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2 rounded border border-red-300 bg-white text-slate-800 font-medium"
            >
              <option value="Obstacle / River crossing blocked">Obstacle / River crossing blocked</option>
              <option value="Engaged in another critical incident">Engaged in another critical incident</option>
              <option value="Vehicle malfunction / out of range">Vehicle malfunction / out of range</option>
              <option value="Low communication / battery failure">Low communication / battery failure</option>
            </select>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                Confirm Rejection & Escalate
              </button>
              <button
                onClick={() => setRejectMode(false)}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* RESOLVE MODE FORM (Handoff to UC-01) */}
        {resolveMode && (
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-2.5">
            <div className="flex items-center justify-between text-emerald-800 font-bold">
              <div className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>UC-01 Wildlife Incident Resolution Log</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                AUTO-ARCHIVE
              </span>
            </div>

            <p className="text-slate-600 text-[11px]">
              Document on-scene field deterrents and containment actions. This report will automatically store in the permanent Dispatch History registry.
            </p>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                Quick Action Directives:
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setResolveNotes(
                      'Flares and acoustic sirens deployed. Alpha elephant herd safely redirected back past electric boundary fence into reserve. Zero casualties or village crop damage.'
                    )
                  }
                  className="text-left text-[11px] p-1.5 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-lg text-slate-700 transition-colors"
                >
                  ⚡ Acoustic Sirens & Guided Herd Back past Fence
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResolveNotes(
                      'Solar flashers activated and community alerted. Escorted solitary bull back towards Handapanagala sanctuary. Electric fence line verified intact.'
                    )
                  }
                  className="text-left text-[11px] p-1.5 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-lg text-slate-700 transition-colors"
                >
                  🛡️ Escorted Bull to Sanctuary • Fence Line Intact
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                Incident Resolution Details & Field Notes:
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Detail on-scene deterrent used, herd status, damage check..."
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleResolve}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Confirm Resolution & Store in Log</span>
              </button>
              <button
                onClick={() => setResolveMode(false)}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* POST-RESOLUTION SUCCESS BANNER */}
        {alert.status === 'RESOLVED' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-center text-xs">
            <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Incident Successfully Resolved & Logged</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              This dispatch has been marked resolved and permanently archived into the Dispatch History log with ID:{' '}
              <span className="font-mono font-bold text-emerald-700">
                {alert.incidentHandoffId || 'INC-ARCHIVED'}
              </span>
            </p>
            {onViewDispatchLog && (
              <button
                onClick={() => {
                  onClose();
                  onViewDispatchLog();
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View Incident in Dispatch Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* PRIMARY ACTIONS */}
        {!rejectMode && !resolveMode && (
          <div className="space-y-2 pt-1">
            {alert.status === 'ACTIVE' && (
              <div className="grid grid-cols-2 gap-3">
                {/* High-visibility ACCEPT button (Green) */}
                <button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm tracking-wide rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  ACCEPT MISSION
                </button>

                {/* High-visibility REJECT / ESCALATE button (Red) */}
                <button
                  onClick={() => setRejectMode(true)}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-sm tracking-wide rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <XCircle className="w-5 h-5" />
                  REJECT / ESCALATE
                </button>
              </div>
            )}

            {alert.status === 'ACCEPTED' && (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900 text-xs">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="font-bold">Interception In Progress</span>
                  </div>
                  <span className="text-[11px] font-mono text-blue-700">GPS Active</span>
                </div>
                <button
                  onClick={() => setResolveMode(true)}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <FileCheck2 className="w-5 h-5" />
                  RESOLVE ON-SCENE (HANDOFF TO UC-01)
                </button>
              </div>
            )}

            {alert.status === 'RESOLVED' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 text-xs font-semibold">
                This breach has been resolved. Incident ID: {alert.incidentHandoffId || 'INC-CLOSED'}.
              </div>
            )}

            {alert.status === 'REJECTED' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 text-xs font-semibold">
                Dispatch rejected. Reason: {alert.rejectionReason}. Re-escalated to Park Manager.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
