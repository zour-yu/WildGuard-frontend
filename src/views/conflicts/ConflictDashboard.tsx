import React, { useState } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Inbox, 
  Truck, 
  Users, 
  LogOut, 
  Bell 
} from 'lucide-react';

export default function ConflictDashboard({ onNavigate }: { onNavigate?: (view: 'dashboard' | 'inbox') => void }) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3 text-white">
          <Shield className="w-7 h-7 text-slate-200" />
          <span className="text-lg font-semibold tracking-normal">WildGuard Command</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2">
          <button onClick={() => onNavigate?.('dashboard')} className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-800 text-white rounded-md font-medium text-sm">
            <LayoutDashboard className="w-4 h-4 text-slate-300" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => onNavigate?.('inbox')} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/60 hover:text-white rounded-md transition-colors text-sm">
            <div className="flex items-center gap-3">
              <Inbox className="w-4 h-4" />
              <span>Conflict Inbox</span>
            </div>
            <span className="bg-slate-700 text-slate-200 text-xs font-medium px-2 py-0.5 rounded">3</span>
          </button>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 hover:text-white rounded-md transition-colors text-sm">
            <Truck className="w-4 h-4" />
            <span>Dispatch Log</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 hover:text-white rounded-md transition-colors text-sm">
            <Users className="w-4 h-4" />
            <span>Community Contacts</span>
          </a>
        </nav>

        <div className="flex items-center gap-3 p-4 border-t border-slate-800">
          <div className="w-9 h-9 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-medium text-sm">
            RJ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">R. Jayawardena</p>
            <p className="text-xs text-slate-400 truncate">Park Manager</p>
          </div>
          <button className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Human-Wildlife Conflict Hotspots</h1>
            <p className="text-sm text-slate-500 mt-0.5">Verified community conflict tracking and field response management.</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-md hover:bg-slate-100 transition-colors relative border border-slate-200 text-slate-700"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full"></span>
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider">Recent Alerts</h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  <li className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-xs text-slate-700">
                    <span className="font-medium text-slate-900">SMS Report:</span> Elephant herd near Galwala (2m ago)
                  </li>
                  <li className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-xs text-slate-700">
                    <span className="font-medium text-slate-900">App Report:</span> Crop damage logged in Sector 4 (15m ago)
                  </li>
                </ul>
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
                  <button className="text-xs text-slate-600 font-medium hover:text-slate-900">Mark all as read</button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
            
            {/* Left: Map Container */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden min-h-[500px]">
              {/* Subtle grid background */}
              <div className="absolute inset-0 bg-slate-50/50" style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
              
              {/* Map Info Badges */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded border border-slate-200 text-xs font-medium text-slate-700">
                Sector: Galwala Boundary (Grid 8A)
              </div>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded border border-slate-200 text-xs font-medium text-slate-600">
                Sensor Network: Operational
              </div>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded border border-slate-200 text-xs font-mono text-slate-600">
                Coordinates: 8.3114° N, 80.4037° E
              </div>

              {/* Map Markers */}
              <div className="absolute top-[30%] left-[45%]">
                <div className="w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow">3</div>
              </div>
              <div className="absolute top-[45%] left-[25%]">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow">6</div>
              </div>
              <div className="absolute top-[50%] left-[40%]">
                <div className="w-10 h-10 bg-red-700 text-white rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-md">14</div>
              </div>
              <div className="absolute top-[48%] left-[65%]">
                <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow">7</div>
              </div>
            </div>

            {/* Right: Data Cards */}
            <div className="space-y-6">
              
              {/* Card 1 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Monthly Conflict Volume</h3>
                <p className="text-2xl font-bold text-slate-900 mb-6">42 Total Reports</p>
                
                {/* CSS Bar Chart */}
                <div className="flex items-end justify-between h-28 gap-2 pt-2 border-b border-slate-100 pb-1">
                  <div className="w-1/6 bg-slate-200 rounded-t h-1/4"></div>
                  <div className="w-1/6 bg-slate-200 rounded-t h-2/5"></div>
                  <div className="w-1/6 bg-slate-200 rounded-t h-1/3"></div>
                  <div className="w-1/6 bg-amber-500 rounded-t h-3/5"></div>
                  <div className="w-1/6 bg-orange-500 rounded-t h-4/5"></div>
                  <div className="w-1/6 bg-red-600 rounded-t h-full"></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Hotspot</h3>
                  <span className="text-xs font-medium text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded">High Alert</span>
                </div>
                <p className="text-base font-bold text-slate-900">Galwala – Handapanagala</p>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">14 active reports logged this week</p>
                
                <div className="w-full bg-slate-100 rounded h-2">
                  <div className="bg-red-600 h-2 rounded" style={{ width: '80%' }}></div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Conflict</h3>
                  <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Pending Dispatch</span>
                </div>
                <p className="text-base font-bold text-slate-900">Crop Damage – Paddy Field</p>
                <p className="text-xs text-slate-500 mt-1">Reported by W. Fernando &middot; 12 mins ago</p>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
