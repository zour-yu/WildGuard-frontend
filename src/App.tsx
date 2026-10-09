import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutGrid,
  Inbox,
  Truck,
  Users,
  LogOut,
  Smartphone,
  PlusCircle,
  Radio,
  Layers,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { ManagerTelemetryView } from './views/dashboard/ManagerTelemetryView';
import { RangerDispatchModal } from './views/ranger-terminal/RangerDispatchModal';
import { ManagerDispatchModal } from './components/modals/ManagerDispatchModal';
import { DispatchLogView } from './views/dispatch/DispatchLogView';
import { IncidentLogView } from './views/mobile/ranger-incident/IncidentLogView';
import { IncidentForm } from './views/mobile/ranger-incident/IncidentForm';
import { incidentApiClient } from './services/api.client';
import { telemetryService } from './services/telemetryService';
import { getSocket } from './services/socket';
import { AlertDispatchData } from './types/telemetry';
import { AppSidebar } from './components/common/AppSidebar';

// Conflict & Auth components
import ConflictDashboard from './views/conflicts/ConflictDashboard';
import ConflictInbox from './views/conflicts/ConflictInbox';
import ConflictResolutionDetail from './views/conflicts/ConflictResolutionDetail';
import LoginScreen from './views/auth/LoginScreen';
import ReportConflict from './views/citizen/ReportConflict';
import CitizenAuth from './views/auth/CitizenAuth';
import LandingPage from './views/LandingPage';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

type NavTab =
  | 'dashboard'
  | 'inbox'
  | 'incident-box'
  | 'dispatch'
  | 'contacts'
  | 'terminal'
  | 'resolution'
  | 'telemetry'
  | 'record-incident';

export default function App() {
  // Determine active tab from initial URL pathname
  const getInitialTab = (): NavTab => {
    const rawPath = window.location.pathname.replace(/^\//, '').toLowerCase();
    const validTabs: NavTab[] = [
      'dashboard',
      'inbox',
      'incident-box',
      'dispatch',
      'contacts',
      'terminal',
      'resolution',
      'telemetry',
      'record-incident',
    ];
    if (rawPath === 'dashboard') {
      return 'telemetry';
    }
    if (validTabs.includes(rawPath as NavTab)) {
      return rawPath as NavTab;
    }
    return 'telemetry';
  };

  const [activeNav, setActiveNav] = useState<NavTab>(getInitialTab());
  const [activeAlertCount, setActiveAlertCount] = useState<number>(3);
  const [recordedIncidentCount, setRecordedIncidentCount] = useState<number>(0);
  const [latestBreachAlert, setLatestBreachAlert] = useState<AlertDispatchData | null>(null);
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState<boolean>(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [mongoUser, setMongoUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Helper to switch view and update browser address bar
  const navigate = (tab: NavTab) => {
    setActiveNav(tab);
    window.history.pushState(null, '', `/${tab}`);
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveNav(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          const response = await fetch('http://localhost:5000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (data.success && data.user) {
            setMongoUser(data.user);
            if (data.user.role === 'Park Manager') {
               setActiveNav((prev) => prev === 'inbox' ? 'telemetry' : prev);
            }
          }
        } catch (err) {
          console.error("Failed to fetch mongo user", err);
        }
      } else {
        setMongoUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Initial fetch of active alerts and recorded incidents
    incidentApiClient
      .fetchIncidents()
      .then((data) => setRecordedIncidentCount(data.length))
      .catch((err) => console.warn('Could not fetch incidents count:', err));

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

  // --- PUBLIC DIRECT ROUTES (No Auth Required) ---
  const currentPath = window.location.pathname.toLowerCase();

  if (currentPath === '/' || currentPath === '/landing') {
    const userType = localStorage.getItem('userType');
    // Let logged-in Officer fall through to Operations Dashboard, others see Landing Page
    if (!user || userType !== 'Officer') {
      return <LandingPage />;
    }
  }

  if (currentPath === '/report') {
    return <ReportConflict />;
  }

  if (currentPath === '/citizen-auth' || currentPath === '/citizen-login') {
    return <CitizenAuth />;
  }

  if (currentPath === '/staff' || currentPath === '/admin' || currentPath === '/login') {
    if (!authLoading && user) {
      window.location.href = '/dashboard';
      return null;
    }
    return <LoginScreen />;
  }

  // Global Auth Guard Loading
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // If unauthenticated and trying to access a protected route, show staff login
  if (!user) {
    return <LoginScreen />;
  }
  // Standalone Conflict Views
  if (activeNav === 'inbox') {
    return (
      <>
        <ConflictInbox 
          onNavigate={navigate as any} 
          userProfile={mongoUser} 
          onDispatchPatrol={(conflict) => {
            setLatestBreachAlert({
              _id: conflict._id,
              animalId: 'N/A',
              animalName: 'Unknown (Citizen Report)',
              species: 'Unknown',
              collarId: 'N/A',
              zoneName: conflict.location || 'Unknown Sector',
              riskLevel: conflict.priority === 'HIGH' ? 'CRITICAL' : conflict.priority === 'MEDIUM' ? 'HIGH' : 'MEDIUM',
              location: [6.82, 80.14], // Default center
              status: 'ACTIVE',
              cameraTrapImageUrl: conflict.imageUrl || 'https://images.unsplash.com/photo-1549480017-d76466a4b7e8?auto=format&fit=crop&q=80',
              notes: conflict.description,
              createdAt: conflict.reportedAt,
              updatedAt: conflict.reportedAt
            });
            setIsTerminalModalOpen(true);
          }}
        />
        <ManagerDispatchModal
          alert={latestBreachAlert}
          isOpen={isTerminalModalOpen}
          onClose={() => setIsTerminalModalOpen(false)}
          onStatusUpdated={(updated) => setLatestBreachAlert(updated)}
          onViewDispatchLog={() => {
            setIsTerminalModalOpen(false);
            navigate('dispatch');
          }}
        />
      </>
    );
  }

  if (activeNav === 'resolution') {
    return (
      <>
        <ConflictResolutionDetail onNavigate={navigate as any} userProfile={mongoUser} />
        <ManagerDispatchModal
          alert={latestBreachAlert}
          isOpen={isTerminalModalOpen}
          onClose={() => setIsTerminalModalOpen(false)}
          onStatusUpdated={(updated) => setLatestBreachAlert(updated)}
          onViewDispatchLog={() => {
            setIsTerminalModalOpen(false);
            navigate('dispatch');
          }}
        />
      </>
    );
  }

  // Main Command & Field Operations Layout (Telemetry, Incident Box, Dispatch Log, Ranger Terminal, Record Incident)
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0c1427] text-slate-100 antialiased font-sans">
      {/* UNIFIED SIDEBAR (Matching Telemetry & Breaches) */}
      <AppSidebar
        activeNav={activeNav}
        onNavigate={navigate}
        activeAlertCount={activeAlertCount}
        recordedIncidentCount={recordedIncidentCount}
        user={user}
        userProfile={mongoUser}
        onSignOut={async () => {
          await auth.signOut();
          localStorage.removeItem('userType');
          window.location.href = '/staff';
        }}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-[#0a0f1d]">
        {activeNav === 'incident-box' ? (
          /* Incident Box - Interactive Map & Threat Logs (UC-01) */
          <IncidentLogView />
        ) : activeNav === 'dispatch' ? (
          /* Dedicated Dispatch Log & History */
          <DispatchLogView
            onOpenRangerTerminal={() => {
              navigate('terminal');
            }}
          />
        ) : activeNav === 'contacts' ? (
          /* Community Contacts Directory */
          <div className="flex-1 p-6 md:p-8 space-y-6 bg-[#070b14] text-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Community Liaison Contacts
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Emergency contacts for village representatives, Grama Niladhari, agrarian committees, and DWC beat stations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {[
                {
                  name: 'K. Somapala',
                  role: 'Grama Niladhari • Medawachchiya South',
                  phone: '+94 77 123 4567',
                  location: 'Sector 1 - Farmland Boundary',
                  priority: 'Primary Liaison',
                },
                {
                  name: 'W. Fernando',
                  role: 'Agrarian Services Committee Leader',
                  phone: '+94 71 987 6543',
                  location: 'Sector 2 - Handapanagala Reservoir',
                  priority: 'Crop Protection',
                },
                {
                  name: 'Officer Chaminda Perera',
                  role: 'Forest Beat Station Officer',
                  phone: '+94 76 555 0192',
                  location: 'Station 4 - Railway Reserve',
                  priority: 'DWC Field Unit',
                },
                {
                  name: 'P. Jinadasa',
                  role: 'Village Electric Fence Maintenance Lead',
                  phone: '+94 70 444 8821',
                  location: 'Buffer Zone Perimeter A',
                  priority: 'Fence Repair',
                },
                {
                  name: 'Wildlife Rapid Response Dispatch',
                  role: '24/7 DWC Regional Emergency Operations',
                  phone: '1992 (Hotline) / +94 11 288 8555',
                  location: 'Galwala Command Center',
                  priority: 'Emergency Core',
                },
              ].map((contact, i) => (
                <div
                  key={i}
                  className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm">{contact.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{contact.role}</p>
                    </div>
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      {contact.priority}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-slate-800/80 font-mono">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{contact.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeNav === 'record-incident' ? (
          /* UC-01: Dedicated Mobile Field View */
          <div className="flex-1 p-6 md:p-8 pb-32 space-y-6 bg-slate-50 text-slate-900">
            <div>
              <div className="flex items-center gap-2">
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                Ranger Field Incident Logger
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Offline-First Mobile Interface with GPS Geolocation, Photo Capture, and Strategy-Pattern Validation.
              </p>
            </div>

            {/* Responsive Form Container */}
            <IncidentForm
              onIncidentSubmitted={() => {
                console.log('Incident recorded successfully.');
              }}
            />
          </div>
        ) : activeNav === 'terminal' ? (
          /* Dedicated Ranger Mobile Terminal Tab (UC-04) */
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#070b14]">
            <div className="text-center mb-6">
              <span className="bg-red-950/80 text-red-400 border border-red-700/60 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                UC-04 Ranger Terminal Device
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                Field Officer Intercept Unit
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
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
                  onClose={() => navigate('telemetry')}
                  onStatusUpdated={(updated) => setLatestBreachAlert(updated)}
                  onViewDispatchLog={() => navigate('dispatch')}
                />
              ) : (
                <div className="bg-slate-900 rounded-2xl p-6 text-center text-slate-400 space-y-3 min-h-[380px] flex flex-col items-center justify-center border border-slate-800">
                  <Shield className="w-12 h-12 text-emerald-500 stroke-[1.5]" />
                  <p className="text-sm font-bold text-white">Terminal Standby</p>
                  <p className="text-xs text-slate-400">
                    All buffer sectors normal. Waiting for collar telemetry breach detection...
                  </p>
                  <button
                    onClick={() => navigate('telemetry')}
                    className="text-xs text-emerald-400 font-bold hover:underline"
                  >
                    Return to Telemetry Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Operations Telemetry Dashboard */
          <ManagerTelemetryView
            onOpenRangerTerminal={() => {
              setIsTerminalModalOpen(true);
            }}
            onNavigateToDispatchLog={() => {
              navigate('dispatch');
            }}
          />
        )}

        {/* Global Terminal Modal if opened from Dashboard button */}
        <RangerDispatchModal
          alert={latestBreachAlert}
          isOpen={isTerminalModalOpen}
          onClose={() => setIsTerminalModalOpen(false)}
          onStatusUpdated={(updated) => setLatestBreachAlert(updated)}
          onViewDispatchLog={() => {
            setIsTerminalModalOpen(false);
            navigate('dispatch');
          }}
        />
      </div>
    </div>
  );
}
