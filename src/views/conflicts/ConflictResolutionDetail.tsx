import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  Inbox, 
  Truck, 
  Users, 
  LogOut, 
  ArrowLeft,
  Circle,
  Image as ImageIcon,
  Radio,
  Layers,
  Clock,
  AlertTriangle,
  Smartphone
} from 'lucide-react';
import { AppSidebar } from '../../components/common/AppSidebar';
import { auth } from '../../firebase';

export default function ConflictResolutionDetail({ onNavigate, userProfile }: { onNavigate?: (view: any) => void, userProfile?: any }) {
  const [conflict, setConflict] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('http://localhost:5000/api/conflicts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Pick the first resolved one for the demo, or just the first one
          const target = data.find((c: any) => c.status === 'RESOLVED') || data[0];
          setConflict(target);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-spin h-8 w-8 border-b-2 border-emerald-600 rounded-full"></div></div>;
  if (!conflict) return <div className="flex h-screen items-center justify-center bg-slate-50">No conflict found.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
        {/* UNIFIED SIDEBAR (Matching Telemetry & Breaches) */}
        <AppSidebar
          activeNav="resolution"
          onNavigate={onNavigate as any}
          onSignOut={() => auth.signOut()}
          userProfile={userProfile}
        />

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
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm mb-4 ${
                conflict.status === 'RESOLVED' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : conflict.status === 'UNREAD' 
                    ? 'bg-red-50 text-red-700 border-red-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <Circle className="w-2.5 h-2.5 fill-current" />
                {conflict.status}
              </div>
              
              <h1 className="text-2xl font-bold text-slate-900 mt-4">
                {conflict.description.substring(0, 40)}{conflict.description.length > 40 ? '...' : ''} &middot; {conflict.location}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Reported by {conflict.reporter} &middot; {new Date(conflict.reportedAt).toLocaleString()}
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {/* Card 1 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> TIME ELAPSED
                </h3>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {(() => {
                    const end = conflict.resolvedAt ? new Date(conflict.resolvedAt) : new Date();
                    const diffMs = end.getTime() - new Date(conflict.reportedAt).getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    return `${hours}h ${mins}m`;
                  })()}
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> PRIORITY LEVEL
                </h3>
                <p className={`text-xl font-bold mt-1 ${conflict.priority === 'HIGH' ? 'text-red-600' : 'text-amber-600'}`}>
                  {conflict.priority}
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> REPORT SOURCE
                </h3>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {conflict.source === 'SMS' ? 'SMS Hotline' : 'Mobile App'}
                </p>
              </div>
            </div>

            {/* Outcome Notes Section */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                RESOLUTION / VERIFICATION NOTES
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                  {conflict.notes || conflict.description}
                </p>
              </div>
            </div>

            {/* Field Images Section */}
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                EVIDENCE IMAGES {conflict.imageUrl ? '(1)' : '(0)'}
              </h3>
              {conflict.imageUrl ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a href={conflict.imageUrl} target="_blank" rel="noreferrer" className="block bg-slate-200 rounded-xl aspect-video border border-slate-300 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <img src={conflict.imageUrl} alt="Conflict Evidence" className="w-full h-full object-cover" />
                  </a>
                </div>
              ) : (
                <div className="bg-slate-100 rounded-xl border border-slate-200 border-dashed p-8 text-center text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No images attached to this report.</p>
                </div>
              )}
            </div>

            {/* Bottom padding for scroll */}
            <div className="h-12"></div>
          </div>
        </main>
    </div>
  );
}
