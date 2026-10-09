import React from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Inbox, 
  Truck, 
  Users, 
  LogOut, 
  ArrowLeft,
  Circle,
  Image as ImageIcon
} from 'lucide-react';

export default function ConflictResolutionDetail({ onNavigate }: { onNavigate?: (view: 'dashboard' | 'inbox' | 'resolution') => void }) {
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
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
            <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 hover:text-white rounded-md transition-colors text-sm">
              <Truck className="w-4 h-4" />
              <span>Dispatch Log</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/60 hover:text-white rounded-md transition-colors text-sm">
              <Users className="w-4 h-4" />
              <span>Community Contacts</span>
            </button>
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

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-auto p-8 relative">
          <div className="max-w-4xl mx-auto w-full">
            
            {/* Breadcrumb / Back Button */}
            <button 
              onClick={() => onNavigate?.('inbox')}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Inbox
            </button>

            {/* Header Section */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-green-200 shadow-sm mb-4">
                <Circle className="w-2.5 h-2.5 fill-current" />
                Case closed
              </div>
              
              <h1 className="text-2xl font-bold text-slate-900 mt-4">
                Case #1042 &middot; Crop Damage &middot; Galwala
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Reported by W. Fernando &middot; Handled by Liaison R. Jayawardena
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {/* Card 1 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  RESPONSE TIME
                </h3>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  2h 10m
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  DAMAGE EST.
                </h3>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  0.5 acre
                </p>
              </div>

              {/* Card 3 (Warning Card) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  REPEAT SITE
                </h3>
                <p className="text-xl font-bold text-red-700 mt-1">
                  Yes &middot; 3rd time
                </p>
              </div>
            </div>

            {/* Outcome Notes Section */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                OUTCOME NOTES (FEEDS FUNDING REPORT)
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <p className="text-slate-700 leading-relaxed text-sm">
                  Site visited, damage confirmed and logged. Boundary fencing flagged to Park Manager for repair &mdash; third conflict at this stretch in 90 days.
                </p>
              </div>
            </div>

            {/* Field Images Section */}
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                FIELD IMAGES (2)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-200 rounded-xl aspect-video border border-slate-300 flex items-center justify-center text-slate-500 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="absolute inset-0 bg-black/5 hover:bg-transparent transition-colors"></div>
                  <span className="text-sm font-medium">Fence Damage.jpg</span>
                </div>
                <div className="bg-slate-200 rounded-xl aspect-video border border-slate-300 flex items-center justify-center text-slate-500 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="absolute inset-0 bg-black/5 hover:bg-transparent transition-colors"></div>
                  <span className="text-sm font-medium">Footprints.jpg</span>
                </div>
              </div>
            </div>

            {/* Bottom padding for scroll */}
            <div className="h-12"></div>
          </div>
        </main>
    </div>
  );
}
