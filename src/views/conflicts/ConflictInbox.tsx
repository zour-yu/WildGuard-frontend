import React from 'react';
import {
  Shield,
  LayoutDashboard,
  Inbox,
  Truck,
  Users,
  LogOut,
  Bell,
  Search,
  Check,
  Clock,
  AlertCircle,
  Map,
  MapPin,
  Send,
  UserPlus,
  Eye,
  FileText,
  PhoneCall,
  Smartphone,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function ConflictInbox({ onNavigate }: { onNavigate?: (view: 'dashboard' | 'inbox' | 'resolution') => void }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3 text-white">
          <Shield className="w-7 h-7 text-slate-200" />
          <span className="text-lg font-semibold tracking-normal">WildGuard Command</span>
        </div>

            <nav className="flex-1 px-4 space-y-1 mt-2">
          <button onClick={() => onNavigate?.('dashboard')} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 hover:text-white rounded-md transition-colors text-sm">
            <LayoutDashboard className="w-4 h-4 text-slate-300" />
            <span>Dashboard</span>
          </button>
          <button onClick={() => onNavigate?.('inbox')} className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800 text-white rounded-md font-medium text-sm">
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
            <p className="text-xs text-slate-400 truncate">Community Liaison Officer</p>
          </div>
          <button className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400 hover:text-white" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">Notifications & Conflict Alerts</h1>
              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs font-semibold border border-red-100">
                3 Action Required
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Real-time community dispatches, SMS alerts, and verified field conflicts awaiting review.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search alerts, sectors..." 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-64 bg-slate-50"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
              <Check className="w-4 h-4" />
              Mark all read
            </button>
            <button className="p-2 rounded-md hover:bg-slate-100 transition-colors relative border border-slate-200 text-slate-700 bg-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Main Layout */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto w-full">

              {/* Top KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Card 1 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3">
                  <div className="mt-0.5 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Unresolved Alerts</h3>
                      <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">Immediate Action</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">3 <span className="text-sm font-normal text-slate-500">Conflicts</span></p>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3">
                  <div className="mt-0.5 text-slate-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Avg Response Time</h3>
                    <p className="text-2xl font-bold text-slate-900">14 <span className="text-sm font-normal text-slate-500">mins</span></p>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3">
                  <div className="mt-0.5 text-slate-400">
                    <Map className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hotspot Sector</h3>
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">Active Zone</span>
                    </div>
                    <p className="text-xl font-bold text-slate-900 truncate">Galwala Sector</p>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <button className="bg-emerald-700 text-white px-3 py-1.5 rounded-md text-sm font-medium shadow-sm">
                    All Conflicts (9)
                  </button>
                  <button className="bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5">
                    Unread <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs">3</span>
                  </button>
                  <button className="bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                    SMS Hotline (4)
                  </button>
                  <button className="bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                    Mobile App (5)
                  </button>
                </div>
                <div className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">4</span> of 9 conflicts
                </div>
              </div>

              {/* Conflict Alert Cards (The Feed) */}
              <div className="space-y-4">
                
                {/* Card 1: High Priority */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-red-600 uppercase tracking-wide">High Priority</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <PhoneCall className="w-3 h-3" />
                        SMS Hotline
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="flex items-center gap-1.5 font-medium text-red-600">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                        Unread Alert
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">SMS: Elephant herd spotted near Galwala settlement</h2>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                      Herd of approximately 4-6 individuals reported moving toward the eastern perimeter fence near farmer households. Community elders requesting immediate field presence.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Reported by:</span> W. Fernando
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Location:</span> Galwala Boundary (Sector 4)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Time:</span> 2 mins ago
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm font-medium transition-colors">
                        Acknowledge
                      </button>
                      <button 
                        onClick={() => onNavigate?.('resolution')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                      <button className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                        <Send className="w-4 h-4" />
                        Dispatch Patrol
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 2: Medium Priority */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-amber-600 uppercase tracking-wide">Medium Priority</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Smartphone className="w-3 h-3" />
                        Mobile App Report
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2">App: Crop damage reported in paddy field sector B</h2>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                      Single bull broke secondary wooden barrier at roughly 05:30. Farmers drove elephant back into buffer zone; assessment needed for compensation claim verification.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Reported by:</span> K. Somapala
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Time:</span> 15 mins ago
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm font-medium transition-colors">
                        Dismiss
                      </button>
                      <button 
                        onClick={() => onNavigate?.('resolution')}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                      <button className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                        <UserPlus className="w-4 h-4" />
                        Assign Officer
                      </button>
                    </div>
                  </div>
                </div>


                {/* Card 4: Resolved */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 opacity-80 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-semibold text-slate-700">SMS: Elephant attempting to cross main road</h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolved by Team B
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Reported: 1h 45m ago</span>
                    <span>Resolver: Officer S. Perera</span>
                  </div>
                </div>

                {/* Card 5: Resolved */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 opacity-80 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-semibold text-slate-700">App: Lone bull elephant grazing near highway road A4</h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Monitored & Escorted
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Reported: 3h ago</span>
                    <span>Status: Closed with no conflicts</span>
                  </div>
                </div>

              </div>
              
              {/* Bottom padding for scroll */}
              <div className="h-12"></div>
            </div>
          </div>
      </main>
    </div>
  );
}
