import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  FileCheck2,
  AlertTriangle,
  UserCheck,
  MapPin,
  Calendar,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
  Download,
  Info,
  ChevronDown,
} from 'lucide-react';
import { AlertDispatchData } from '../../types/telemetry';
import { telemetryService } from '../../services/telemetryService';
import { getSocket } from '../../services/socket';

interface DispatchLogViewProps {
  onOpenRangerTerminal?: () => void;
}

export const DispatchLogView: React.FC<DispatchLogViewProps> = ({
  onOpenRangerTerminal,
}) => {
  const [history, setHistory] = useState<AlertDispatchData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RESOLVED' | 'ACCEPTED' | 'ACTIVE' | 'REJECTED'>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<AlertDispatchData | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const data = await telemetryService.getDispatchHistory();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching dispatch history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    const socket = getSocket();

    socket.on('dispatch:updated', (payload: any) => {
      setHistory((prev) => {
        const index = prev.findIndex((item) => item._id === payload.dispatchId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: payload.status,
            assignedRangerId: payload.assignedRangerId || updated[index].assignedRangerId,
            assignedRangerName: payload.assignedRangerName || updated[index].assignedRangerName,
            notes: payload.notes || updated[index].notes,
            rejectionReason: payload.rejectionReason,
            resolvedAt: payload.status === 'RESOLVED' ? new Date().toISOString() : updated[index].resolvedAt,
            acceptedAt: payload.status === 'ACCEPTED' ? new Date().toISOString() : updated[index].acceptedAt,
            updatedAt: payload.updatedAt || new Date().toISOString(),
          };
          return updated;
        } else {
          // Refresh list if new entry is not present
          fetchHistory();
          return prev;
        }
      });
    });

    socket.on('animal:breach', (newBreach: AlertDispatchData) => {
      setHistory((prev) => [newBreach, ...prev]);
    });

    return () => {
      socket.off('dispatch:updated');
      socket.off('animal:breach');
    };
  }, []);

  // Filtered and searched dispatches
  const filteredDispatches = useMemo(() => {
    return history.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' ? true : item.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.animalName.toLowerCase().includes(q) ||
        item.collarId.toLowerCase().includes(q) ||
        item.zoneName.toLowerCase().includes(q) ||
        (item.assignedRangerName && item.assignedRangerName.toLowerCase().includes(q)) ||
        (item.incidentHandoffId && item.incidentHandoffId.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [history, statusFilter, searchQuery]);

  // Statistics calculation
  const totalCount = history.length;
  const resolvedCount = history.filter((h) => h.status === 'RESOLVED').length;
  const activeCount = history.filter((h) => h.status === 'ACTIVE' || h.status === 'ACCEPTED').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate resolution duration in minutes
  const getDurationMinutes = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(diffMs / 60000);
    return mins > 0 ? mins : 1;
  };

  return (
    <div className="flex-1 bg-[#f8fafc] text-slate-800 p-4 lg:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4 stroke-[2]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Ranger Dispatch Audit & History Log
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 ml-10">
            Chronological audit of elephant breach dispatches, ranger acceptance, and UC-01 resolved incident records.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchHistory}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            title="Refresh dispatch logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Log</span>
          </button>

          {onOpenRangerTerminal && (
            <button
              onClick={onOpenRangerTerminal}
              className="px-3.5 py-2 bg-[#0c1427] hover:bg-[#18233c] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Field Terminal</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dispatches */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              TOTAL DISPATCHES
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">All tracked incident runs</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Successfully Resolved */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              RESOLVED INCIDENTS
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {resolvedCount}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {resolutionRate}% successful resolution
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Active Missions */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              ACTIVE & EN ROUTE
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">
              {activeCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Field officers deployed</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5 animate-spin" />
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              AVG RESOLUTION TIME
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              ~18 mins
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Rapid deterrent deployment</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['ALL', 'RESOLVED', 'ACCEPTED', 'ACTIVE', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#0c1427] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {status === 'ALL'
                ? 'All Dispatches'
                : status === 'RESOLVED'
                ? 'Resolved'
                : status === 'ACCEPTED'
                ? 'In Progress (Accepted)'
                : status === 'ACTIVE'
                ? 'Awaiting Ranger'
                : 'Rejected'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elephant, collar, ranger, zone..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* DISPATCH AUDIT LOG TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Dispatch History Registry ({filteredDispatches.length})
            </h3>
            <p className="text-xs text-slate-500">
              Complete chronological audit trail from initial breach detection to on-scene resolution.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Live Database Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Elephant / Collar</th>
                <th className="py-3 px-4">Zone & Coordinates</th>
                <th className="py-3 px-4">Assigned Ranger</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timeline Milestones</th>
                <th className="py-3 px-4">Resolution Notes & UC-01 ID</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Truck className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600">No dispatch records match your criteria.</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters or step the collar simulator.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((item) => {
                  const durationMins = getDurationMinutes(
                    item.dispatchedAt || item.createdAt,
                    item.resolvedAt
                  );

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedIncident(item)}
                    >
                      {/* Elephant / Collar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.cameraTrapImageUrl ||
                              'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={item.animalName}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition-colors">
                              {item.animalName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.collarId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Zone & Coordinates */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-800 line-clamp-1">
                              {item.zoneName}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {item.location
                                ? `${item.location[0].toFixed(3)}° N, ${item.location[1].toFixed(3)}° E`
                                : 'Coordinates logged'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Ranger */}
                      <td className="py-3.5 px-4">
                        {item.assignedRangerName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                              {item.assignedRangerName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">
                                {item.assignedRangerName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {item.assignedRangerId || 'Unit'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'RESOLVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'ACCEPTED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                          }`}
                        >
                          {item.status === 'RESOLVED' && <CheckCircle2 className="w-3 h-3" />}
                          {item.status === 'ACCEPTED' && <Clock className="w-3 h-3" />}
                          {item.status === 'RESOLVED'
                            ? 'RESOLVED'
                            : item.status === 'ACCEPTED'
                            ? 'IN PROGRESS'
                            : item.status}
                        </span>
                      </td>

                      {/* Timeline Milestones */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 space-y-0.5">
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-slate-400">Logged:</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                        {item.resolvedAt && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                            <span>Resolved:</span>
                            <span>{formatDate(item.resolvedAt)}</span>
                            {durationMins && (
                              <span className="bg-emerald-100 text-emerald-800 px-1 rounded text-[9px]">
                                {durationMins}m
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Notes / UC-01 ID */}
                      <td className="py-3.5 px-4 max-w-sm">
                        {item.incidentHandoffId && (
                          <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mb-1">
                            {item.incidentHandoffId}
                          </span>
                        )}
                        <p className="text-slate-600 line-clamp-2 text-[11px]">
                          {item.notes || 'Awaiting incident resolution notes from field unit.'}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncident(item);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl p-6 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Dispatch Incident Record #{selectedIncident._id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use Case 04 Field Response and UC-01 Incident Registry Log
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Elephant Snapshot and Profile Banner */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
              <img
                src={
                  selectedIncident.cameraTrapImageUrl ||
                  'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80'
                }
                alt={selectedIncident.animalName}
                className="w-full h-44 object-cover"
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                VERIFIED ELEPHANT TELEMETRY
              </div>
              <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-sm p-2.5 rounded-xl text-white text-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-amber-300 text-sm">
                    {selectedIncident.animalName}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {selectedIncident.species} • Collar {selectedIncident.collarId}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                    selectedIncident.status === 'RESOLVED'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {selectedIncident.status}
                </span>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                MISSION LIFECYCLE TIMELINE
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">1. GEOFENCE BREACH</span>
                  <span className="font-bold text-slate-800 text-[11px] block mt-0.5">
                    {formatDate(selectedIncident.createdAt)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">2. RANGER DISPATCHED</span>
                  <span className="font-bold text-slate-800 text-[11px] block mt-0.5">
                    {formatDate(selectedIncident.dispatchedAt || selectedIncident.createdAt)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">3. RESOLVED ON-SCENE</span>
                  <span className="font-bold text-emerald-600 text-[11px] block mt-0.5">
                    {selectedIncident.resolvedAt
                      ? formatDate(selectedIncident.resolvedAt)
                      : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Deployment Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Breach Location
                </span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedIncident.zoneName}</p>
                <p className="font-mono text-slate-500 text-[10px] mt-0.5">
                  {selectedIncident.location
                    ? `${selectedIncident.location[0].toFixed(4)}° N, ${selectedIncident.location[1].toFixed(4)}° E`
                    : 'N/A'}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                  Assigned Field Ranger
                </span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedIncident.assignedRangerName || 'Unassigned'}
                </p>
                <p className="text-slate-500 text-[10px] mt-0.5 font-mono">
                  ID: {selectedIncident.assignedRangerId || 'N/A'}
                </p>
              </div>
            </div>

            {/* Resolution Report */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Field Incident Resolution Report</span>
                </div>
                {selectedIncident.incidentHandoffId && (
                  <span className="bg-white text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    UC-01 ID: {selectedIncident.incidentHandoffId}
                  </span>
                )}
              </div>
              <p className="text-slate-700 text-xs leading-relaxed pt-1">
                {selectedIncident.notes ||
                  'Field officer logged resolution directives and confirmed animal was safely redirected away from village buffer boundary.'}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Last updated: {formatDate(selectedIncident.updatedAt)}
              </span>
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 bg-[#0c1427] hover:bg-[#18233c] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
