import React, { useState, useEffect } from 'react';
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
  PhoneCall,
  Smartphone,
  CheckCircle2,
  Send,
  UserPlus,
  Terminal,
  Radio,
  Layers,
} from 'lucide-react';
import { auth } from '../../firebase';
import { getSocket } from '../../services/socket';
import { AppSidebar } from '../../components/common/AppSidebar';

export default function ConflictInbox({ onNavigate, userProfile, onDispatchPatrol }: { onNavigate?: (view: 'dashboard' | 'inbox' | 'resolution') => void, userProfile?: any, onDispatchPatrol?: (conflict: any) => void }) {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [customSms, setCustomSms] = useState('');
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    // 1. Fetch initial data from Backend
    const fetchConflicts = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('http://localhost:5000/api/conflicts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch from protected route');
        
        const data = await response.json();
        setConflicts(data);
      } catch (error) {
        console.error("Failed to fetch conflicts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConflicts();

    // 2. Listen for Real-Time Socket Events
    const socket = getSocket();
    
    // When a new SMS or App report comes in, add it to the top of the list
    socket.on('conflict:new', (newConflict: any) => {
      setConflicts((prev) => [newConflict, ...prev]);
    });

    return () => {
      socket.off('conflict:new');
    };
  }, []);

  // Auto-Simulation Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoSimulating) {
      interval = setInterval(() => {
        const msgs = [
          "Leopard sighted near the northern water pump.",
          "Elephants breaking fences at Sector 2.",
          "Wild boar destroyed crops last night.",
          "Herd of elephants blocking the main road.",
          "SOS: Elephant charging near the village school!",
          "Large snake found near the community well.",
          "Crocodile spotted dangerously close to fishing boats.",
          "Monkey troop stealing food from houses in Sector 7.",
          "Leopard tracks found near the livestock pens this morning."
        ];
        const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
        fetch('http://localhost:5000/api/conflicts/mock-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: randomMsg, from: "+9477000" + Math.floor(1000 + Math.random() * 9000) })
        }).catch(console.error);
      }, 10000); // Fire every 10 seconds for the demo
    }
    return () => clearInterval(interval);
  }, [isAutoSimulating]);

  const unreadCount = conflicts.filter(c => c.status === 'UNREAD').length;

  const handleMarkAllRead = async () => {
    const unreadConflicts = conflicts.filter(c => c.status === 'UNREAD');
    if (unreadConflicts.length === 0) return;

    // Optimistic UI update
    setConflicts(prev => prev.map(c => c.status === 'UNREAD' ? { ...c, status: 'ACTION_REQUIRED' } : c));

    try {
      const token = await auth.currentUser?.getIdToken();
      await Promise.all(unreadConflicts.map(c =>
        fetch(`http://localhost:5000/api/conflicts/${c._id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'ACKNOWLEDGED', verificationNotes: 'Marked as read from inbox.' })
        })
      ));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleAcknowledge = async (conflictId: string) => {
    // Optimistic UI update
    setConflicts(prev => prev.map(c => c._id === conflictId ? { ...c, status: 'ACKNOWLEDGED' } : c));
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`http://localhost:5000/api/conflicts/${conflictId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'ACKNOWLEDGED' })
      });
    } catch (err) {
      console.error('Failed to acknowledge conflict:', err);
    }
  };

  const displayedConflicts = conflicts.filter(c => {
    if (filterTab === 'UNREAD' && c.status !== 'UNREAD') return false;
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      if (!c.description.toLowerCase().includes(term) && !c.source.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* UNIFIED SIDEBAR (Matching Telemetry & Breaches) */}
      <AppSidebar
        activeNav="inbox"
        onNavigate={onNavigate as any}
        unreadConflictCount={unreadCount}
        onSignOut={() => auth.signOut()}
        userProfile={userProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Conflict Inbox</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  {unreadCount} Action Required
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Real-time community dispatches, SMS alerts, and verified field conflicts awaiting review.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts, sectors..." 
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-64 bg-slate-50"
              />
            </div>
            <button 
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
            <button className="p-2 rounded-md hover:bg-slate-100 transition-colors relative border border-slate-200 text-slate-700 bg-white">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Main Layout */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto w-full">

            {/* Community SMS Testing Console */}
            <div className="mb-6 p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-md">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Community SMS Dispatch Console</span>
                <button 
                  onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                  className={`ml-2 text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wide border transition ${isAutoSimulating ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                >
                  {isAutoSimulating ? 'Auto Sim: ON' : 'Auto Sim: OFF'}
                </button>
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input 
                  type="text" 
                  placeholder="Type mock emergency SMS..." 
                  value={customSms}
                  onChange={(e) => setCustomSms(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <button 
                  onClick={async () => {
                    try {
                      await fetch('http://localhost:5000/api/conflicts/mock-sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          body: customSms.trim() || "URGENT: Elephant herd spotted near Galwala village border!",
                          from: "+94770001111"
                        })
                      });
                      setCustomSms('');
                    } catch (err) {
                      console.error("Failed to mock SMS", err);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition shadow"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Send Mock SMS</span>
                </button>
              </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3">
                <div className="mt-0.5 text-indigo-500">
                  <Inbox className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Reports Today</h3>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {(() => {
                      const today = new Date().toDateString();
                      return conflicts.filter(c => new Date(c.reportedAt).toDateString() === today).length;
                    })()}
                    <span className="text-sm font-normal text-slate-500 ml-1">Received</span>
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3">
                <div className="mt-0.5 text-amber-500">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Critical Priority</h3>
                  <p className="text-2xl font-bold text-slate-900">
                    {conflicts.filter(c => c.priority === 'HIGH' && c.status !== 'RESOLVED').length} 
                    <span className="text-sm font-normal text-slate-500 ml-1">Active</span>
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3">
                <div className="mt-0.5 text-slate-400">
                  <Map className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Most Affected Zone</h3>
                  <p className="text-2xl font-bold text-slate-900 truncate" title={
                    (() => {
                      if (conflicts.length === 0) return 'N/A';
                      const locs = conflicts.map(c => c.location).filter(loc => loc && !loc.includes('Unknown'));
                      if (locs.length === 0) return 'N/A';
                      const counts = locs.reduce((acc, curr) => {
                        acc[curr as string] = (acc[curr as string] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                    })()
                  }>
                    {(() => {
                      if (conflicts.length === 0) return 'N/A';
                      const locs = conflicts.map(c => c.location).filter(loc => loc && !loc.includes('Unknown'));
                      if (locs.length === 0) return 'N/A';
                      const counts = locs.reduce((acc, curr) => {
                        acc[curr as string] = (acc[curr as string] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <button 
                  onClick={() => setFilterTab('ALL')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium shadow-sm transition-colors ${filterTab === 'ALL' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  All Conflicts ({conflicts.length})
                </button>
                <button 
                  onClick={() => setFilterTab('UNREAD')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${filterTab === 'UNREAD' ? 'bg-emerald-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  Unread <span className={`${filterTab === 'UNREAD' ? 'bg-emerald-600 text-white' : 'bg-red-100 text-red-600'} px-1.5 py-0.5 rounded text-xs`}>{unreadCount}</span>
                </button>
              </div>
            </div>

            {/* Conflict Alert Cards (The Feed) */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-10 text-slate-500">Loading live conflicts...</div>
              ) : displayedConflicts.length === 0 ? (
                <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                  <p className="font-semibold">{searchQuery || filterTab === 'UNREAD' ? 'No matching conflicts found' : 'All Clear'}</p>
                  <p className="text-sm">{searchQuery || filterTab === 'UNREAD' ? 'Try adjusting your filters.' : 'No conflicts reported yet.'}</p>
                </div>
              ) : (
                displayedConflicts.map((conflict, idx) => (
                  <div key={conflict._id || idx} className={`border rounded-xl p-5 flex flex-col gap-4 ${conflict.status === 'UNREAD' ? 'bg-white border-red-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-semibold uppercase tracking-wide ${conflict.priority === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`}>
                          {conflict.priority} Priority
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                          {conflict.source === 'SMS' ? <PhoneCall className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                          {conflict.source === 'SMS' ? 'SMS Hotline' : 'Mobile App Report'}
                        </span>
                        {conflict.status === 'UNREAD' && (
                          <>
                            <span className="text-slate-300">&bull;</span>
                            <span className="flex items-center gap-1.5 font-medium text-red-600">
                              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
                              Unread Alert
                            </span>
                          </>
                        )}
                        {conflict.status === 'RESOLVED' && (
                          <>
                            <span className="text-slate-300">&bull;</span>
                            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 mb-2">
                        {(() => {
                          const match = conflict.description.match(/^\[(.*?)\]/);
                          return match ? match[1] : (conflict.source === 'SMS' ? 'SMS Hotline Report' : 'Citizen App Report');
                        })()}
                      </h2>
                      <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                        {(() => {
                          const match = conflict.description.match(/^\[.*?\]\s*(.*)/);
                          return match ? match[1] : conflict.description;
                        })()}
                      </p>
                      {conflict.imageUrl && (
                        <div className="mt-4">
                          <a href={conflict.imageUrl} target="_blank" rel="noreferrer" className="inline-block relative rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                            <img src={conflict.imageUrl} alt="Incident Evidence" className="w-32 h-32 object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Search className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                            </div>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-700">Reported by:</span> {conflict.reporter}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-700">Location:</span> {conflict.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-700">Time:</span> {new Date(conflict.reportedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {conflict.status !== 'RESOLVED' && (
                        <div className="flex items-center gap-2">
                          {conflict.status === 'UNREAD' && (
                            <button 
                              onClick={() => handleAcknowledge(conflict._id)}
                              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm font-medium transition-colors"
                            >
                              Acknowledge
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if (conflict.status === 'UNREAD') {
                                handleAcknowledge(conflict._id);
                              }
                              onNavigate?.('resolution');
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md text-sm font-medium transition-colors"
                          >
                            View Details
                          </button>
                          {conflict.status === 'DISPATCHED' ? (
                            <button 
                              disabled
                              className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-md text-sm font-medium border border-slate-200 cursor-not-allowed flex items-center gap-2"
                            >
                              <Clock className="w-4 h-4" />
                              Unit Dispatched
                            </button>
                          ) : conflict.status === 'RESOLVED' ? (
                            <button 
                              disabled
                              className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-md text-sm font-medium border border-emerald-200 cursor-not-allowed flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Resolved
                            </button>
                          ) : (
                            <button 
                              onClick={() => onDispatchPatrol?.(conflict)}
                              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                            >
                              <Send className="w-4 h-4" />
                              Dispatch Patrol
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="h-12"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
