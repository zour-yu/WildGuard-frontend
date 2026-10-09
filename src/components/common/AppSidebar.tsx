import React from 'react';
import {
  Shield,
  Radio,
  Layers,
  Inbox,
  Truck,
  Users,
  PlusCircle,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { User } from 'firebase/auth';

export type NavTab =
  | 'telemetry'
  | 'dashboard'
  | 'incident-box'
  | 'inbox'
  | 'dispatch'
  | 'contacts'
  | 'terminal'
  | 'resolution'
  | 'record-incident';

export interface AppSidebarProps {
  activeNav: string;
  onNavigate: (tab: any) => void;
  activeAlertCount?: number;
  recordedIncidentCount?: number;
  unreadConflictCount?: number;
  user?: User | null;
  userProfile?: any;
  onSignOut?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeNav,
  onNavigate,
  activeAlertCount = 3,
  recordedIncidentCount = 0,
  unreadConflictCount,
  user,
  userProfile,
  onSignOut,
}) => {
  const isTelemetryActive =
    activeNav === 'telemetry' || activeNav === 'dashboard';

  return (
    <aside className="w-full md:w-64 bg-[#090f1d] text-slate-300 flex flex-col justify-between p-5 border-r border-slate-800/80 shrink-0 font-sans">
      <div className="space-y-7">
        {/* Brand Header */}
        <div
          className="flex items-center space-x-3 px-1 cursor-pointer"
          onClick={() => onNavigate('telemetry')}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              WildGuard
            </h1>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider">
              Command & Field OS
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <div className="pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
              Operations Center
            </span>
          </div>

          {/* 1. Telemetry & Breaches */}
          <button
            onClick={() => onNavigate('telemetry')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isTelemetryActive
                ? 'bg-[#18233c] text-white shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Telemetry & Breaches</span>
            </div>
          </button>

          {/* 2. Incident Box */}
          <button
            onClick={() => onNavigate('incident-box')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'incident-box'
                ? 'bg-[#18233c] text-white shadow-sm border border-slate-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Incident Box</span>
            </div>
          </button>

          {/* 3. Conflict Inbox */}
          <button
            onClick={() => onNavigate('inbox')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'inbox' || activeNav === 'resolution'
                ? 'bg-[#18233c] text-white border border-slate-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Inbox className="w-4 h-4 text-blue-400" />
              <span>Conflict Inbox</span>
            </div>
            {unreadConflictCount !== undefined && unreadConflictCount > 0 && (
              <span className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {unreadConflictCount}
              </span>
            )}
          </button>

          {/* 4. Dispatch Log */}
          <button
            onClick={() => onNavigate('dispatch')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'dispatch'
                ? 'bg-[#18233c] text-white border border-slate-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Dispatch Log</span>
            </div>
          </button>

          {/* 5. Community Contacts */}
          <button
            onClick={() => onNavigate('contacts')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'contacts'
                ? 'bg-[#18233c] text-white border border-slate-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Community Contacts</span>
            </div>
          </button>

          {/* Field Operations Section */}
          <div className="pt-4 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
              Ranger Field Units
            </span>
          </div>

          {/* UC-01: Record Wildlife Incident */}
          <button
            onClick={() => onNavigate('record-incident')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'record-incident'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-950/40 border border-emerald-800/40'
            }`}
          >
            <div className="flex items-center space-x-3">
              <PlusCircle className="w-4 h-4" />
              <span>Record Incident (UC-01)</span>
            </div>
            <span className="bg-emerald-900/60 text-emerald-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
              Mobile
            </span>
          </button>

          {/* UC-04: Ranger Terminal */}
          <button
            onClick={() => onNavigate('terminal')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'terminal'
                ? 'bg-[#18233c] text-white border border-slate-700/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Ranger Terminal (UC-04)</span>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </nav>
      </div>

      {/* User Profile Card at Bottom */}
      <div className="pt-5 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-md bg-[#1e293b] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {userProfile?.name?.substring(0, 2).toUpperCase() || 'WG'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">
              {userProfile?.name || (user?.email ? user.email.split('@')[0] : 'WildGuard User')}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{userProfile?.role || 'Wildlife Officer'}</p>
          </div>
        </div>
        <button
          title="Sign Out"
          onClick={onSignOut}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/60 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
