import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutGrid,
  Inbox,
  Truck,
  Users,
  LogOut,
  Smartphone,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { ManagerTelemetryView } from './views/dashboard/ManagerTelemetryView';
import { RangerDispatchModal } from './views/ranger-terminal/RangerDispatchModal';
import { telemetryService } from './services/telemetryService';
import { getSocket } from './services/socket';
import { AlertDispatchData } from './types/telemetry';

export default function App() {
  const [activeNav, setActiveNav] = useState<'dashboard' | 'inbox' | 'dispatch' | 'contacts' | 'terminal'>('dashboard');
  const [activeAlertCount, setActiveAlertCount] = useState<number>(3);
  const [latestBreachAlert, setLatestBreachAlert] = useState<AlertDispatchData | null>(null);
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Initial fetch of active alerts
    telemetryService
      .getActiveAlerts()
      .then((alerts) => {
        if (alerts && alerts.length > 0) {
          setActiveAlertCount(alerts.length);
          setLatestBreachAlert(alerts[0]);
        }
      })
      .catch((err) => console.error('Error fetching alerts:', err));

    // Real-time socket updates
    const socket = getSocket();

    socket.on('animal:breach', (breach: AlertDispatchData) => {
      setLatestBreachAlert(breach);
      setActiveAlertCount((prev) => prev + 1);
    });

    socket.on('dispatch:updated', (payload: any) => {
      setLatestBreachAlert((prev) =>
        prev && prev._id === payload.dispatchId
          ? { ...prev, status: payload.status, notes: payload.notes || prev.notes }
          : prev
      );
    });

    return () => {
      socket.off('animal:breach');
      socket.off('dispatch:updated');
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8fafc] text-slate-800 antialiased font-sans">
      {/* LEFT SIDEBAR (Dark Navy Theme from Screenshot) */}
      <aside className="w-full md:w-64 bg-[#0c1427] text-slate-300 flex flex-col justify-between p-5 border-r border-slate-800/80 shrink-0">
        <div className="space-y-8">
          {/* Brand Header */}
          <div className="flex items-center space-x-3 px-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white">
              <Shield className="w-7 h-7 stroke-[1.75]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                WildGuard
              </h1>
              <span className="text-base font-bold text-white tracking-tight leading-none">
                Command
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {/* Dashboard / Telemetry Hotspots */}
            <button
              onClick={() => setActiveNav('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'dashboard'
                  ? 'bg-[#18233c] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <LayoutGrid className="w-4 h-4" />
                <span>Dashboard</span>
              </div>
            </button>

            {/* Incident Inbox */}
            <button
              onClick={() => setActiveNav('inbox')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'inbox'
                  ? 'bg-[#18233c] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Inbox className="w-4 h-4" />
                <span>Incident Inbox</span>
              </div>
              <span className="bg-[#1e293b] text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {activeAlertCount}
              </span>
            </button>

            {/* Dispatch Log */}
            <button
              onClick={() => setActiveNav('dispatch')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'dispatch'
                  ? 'bg-[#18233c] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Truck className="w-4 h-4" />
                <span>Dispatch Log</span>
              </div>
            </button>

            {/* Community Contacts */}
            <button
              onClick={() => setActiveNav('contacts')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'contacts'
                  ? 'bg-[#18233c] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4" />
                <span>Community Contacts</span>
              </div>
            </button>

            {/* Divider for Ranger Terminal Preview */}
            <div className="pt-4 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
                Field Operations
              </span>
            </div>

            <button
              onClick={() => setActiveNav('terminal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'terminal'
                  ? 'bg-[#18233c] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Ranger Mobile Terminal</span>
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          </nav>
        </div>

        {/* User Profile Card at Bottom */}
        <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-[#1e293b] flex items-center justify-center text-xs font-bold text-white shrink-0">
              RJ
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">R. Jayawardena</p>
              <p className="text-[10px] text-slate-400 truncate">Community Liaison Offi...</p>
            </div>
          </div>
          <button
            title="Sign Out"
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {activeNav === 'dashboard' || activeNav === 'inbox' || activeNav === 'dispatch' || activeNav === 'contacts' ? (
          <ManagerTelemetryView
            onOpenRangerTerminal={() => {
              setIsTerminalModalOpen(true);
            }}
          />
        ) : (
          /* Dedicated Ranger Mobile Terminal Tab */
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f1f5f9]">
            <div className="text-center mb-6">
              <span className="bg-red-50 text-red-600 border border-red-200 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                UC-04 Ranger Terminal Device
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Field Officer Intercept Unit
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Field handheld terminal receiving emergency push notifications upon Geofence polygon breach.
              </p>
            </div>

            {/* Smartphone device frame */}
            <div className="w-full max-w-sm rounded-[40px] p-4 bg-[#0c1427] border-4 border-slate-700 shadow-2xl relative">
              <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-3"></div>
              {latestBreachAlert ? (
                <RangerDispatchModal
                  alert={latestBreachAlert}
                  isOpen={true}
                  onClose={() => setActiveNav('dashboard')}
                  onStatusUpdated={(updated) => setLatestBreachAlert(updated)}
                />
              ) : (
                <div className="bg-white rounded-2xl p-6 text-center text-slate-600 space-y-3 min-h-[380px] flex flex-col items-center justify-center">
                  <Shield className="w-12 h-12 text-emerald-500 stroke-[1.5]" />
                  <p className="text-sm font-bold text-slate-800">Terminal Standby</p>
                  <p className="text-xs text-slate-500">
                    All buffer sectors normal. Waiting for collar telemetry breach detection...
                  </p>
                  <button
                    onClick={() => setActiveNav('dashboard')}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    Return to Hotspot Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Terminal Modal if opened from Dashboard button */}
        <RangerDispatchModal
          alert={latestBreachAlert}
          isOpen={isTerminalModalOpen}
          onClose={() => setIsTerminalModalOpen(false)}
          onStatusUpdated={(updated) => setLatestBreachAlert(updated)}
        />
      </div>
    </div>
  );
}
