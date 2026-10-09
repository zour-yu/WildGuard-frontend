import React, { useState, useEffect, useMemo } from 'react';
import { Send } from 'lucide-react';
import { AlertDispatchData, RangerData } from '../../types/telemetry';
import { telemetryService } from '../../services/telemetryService';
import { conflictService } from '../../services/conflictService';

export const ManagerDispatchModal = ({ 
  alert, 
  isOpen, 
  onClose,
  onStatusUpdated,
  onViewDispatchLog
}: { 
  alert: AlertDispatchData | null, 
  isOpen: boolean, 
  onClose: () => void,
  onStatusUpdated?: (alert: any) => void,
  onViewDispatchLog?: () => void
}) => {
  const [rangers, setRangers] = useState<RangerData[]>([]);
  const [selectedRangerId, setSelectedRangerId] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('Deploy field patrol to resolve incident.');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      telemetryService.getAvailableRangers().then(res => setRangers(res)).catch(console.error);
    }
  }, [isOpen]);

  const sortedRangersWithDistance = useMemo(() => {
    if (!alert || !alert.location || !rangers.length) return rangers;
    const [alertLat, alertLng] = alert.location;
    const calculateDistance = (p1: [number, number], p2: [number, number]) => {
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(p2[0] - p1[0]);
      const dLon = toRad(p2[1] - p1[1]);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.sin(dLon / 2) ** 2;
      return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
    };

    const list = rangers.map((r) => {
      const dist = r.distanceKm ?? calculateDistance([alertLat, alertLng], r.location);
      const eta = r.etaMinutes ?? Math.max(2, Math.ceil((dist / 30) * 60));
      return { ...r, distanceKm: dist, etaMinutes: eta };
    });

    list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    return list;
  }, [rangers, alert]);

  useEffect(() => {
    if (isOpen && sortedRangersWithDistance.length > 0 && !selectedRangerId) {
      setSelectedRangerId(sortedRangersWithDistance[0].rangerId);
    }
  }, [isOpen, sortedRangersWithDistance, selectedRangerId]);

  const handleAssignRanger = async () => {
    if (!alert || !selectedRangerId) return;
    try {
      setIsDispatching(true);
      const chosenRanger = rangers.find((r) => r.rangerId === selectedRangerId);
      const updated = await telemetryService.dispatchRanger(alert._id, {
        rangerId: selectedRangerId,
        rangerName: chosenRanger?.name,
        notes: dispatchNotes,
        alertData: alert
      });
      
      // Update conflict status too
      if (alert._id.startsWith('conf-') || true) {
        await conflictService.updateStatus(alert._id, 'DISPATCHED', dispatchNotes).catch(() => {});
      }
      
      onStatusUpdated?.(updated);
      onClose();
      if (onViewDispatchLog) onViewDispatchLog();
    } catch (err) {
      console.error('Error assigning ranger:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  if (!isOpen || !alert) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Dispatch Field Ranger Unit</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
          <p className="font-bold text-slate-900 text-sm">Target: {alert.animalName} ({alert.species})</p>
          <p className="text-slate-600">Incident Area: <span className="text-red-600 font-semibold">{alert.zoneName}</span></p>
          <p className="text-slate-500 font-mono">
            Coordinates: {alert.location[0].toFixed(4)}° N, {alert.location[1].toFixed(4)}° E
          </p>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">Select Field Ranger Unit:</label>
            <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Sorted by GPS Proximity</span>
          </div>

          <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
            {sortedRangersWithDistance.map((r: any, index: number) => {
              const isSelected = selectedRangerId === r.rangerId;
              const isNearest = index === 0;

              return (
                <div key={r.rangerId} onClick={() => setSelectedRangerId(r.rangerId)} className={`p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs truncate">{r.name}</span>
                    {isNearest && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">Fastest</span>}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{r.callsign}</span>
                    <span className="font-mono font-semibold text-slate-700">{r.distanceKm} km ({r.etaMinutes}m ETA)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="font-semibold text-slate-700">Operational Mission Directives:</label>
          <textarea value={dispatchNotes} onChange={(e) => setDispatchNotes(e.target.value)} rows={2} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-blue-500" placeholder="Specify tactical directives..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleAssignRanger} disabled={isDispatching} className="flex-1 py-3 bg-[#0c1427] hover:bg-[#18233c] text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2">
            {isDispatching ? 'Dispatching...' : <><Send className="w-4 h-4" /> Dispatch Ranger Unit</>}
          </button>
          <button onClick={onClose} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
};
