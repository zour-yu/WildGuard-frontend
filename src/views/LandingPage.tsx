import React, { useEffect, useState } from 'react';
import { Shield, ArrowRight, LogIn, LogOut, MapPin } from 'lucide-react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthAction = () => {
    if (user) {
      auth.signOut().then(() => {
        localStorage.removeItem('userType');
        window.location.reload();
      });
    } else {
      window.location.href = '/citizen-auth';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <Shield className="w-6 h-6 text-[#003823] stroke-[2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none text-slate-900">
              WildGuard
            </h1>
            <span className="text-sm font-semibold tracking-wide text-emerald-600 uppercase">
              Community
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleAuthAction}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#003823] transition-colors"
        >
          {user ? (
            <><LogOut className="w-4 h-4" /> Sign Out</>
          ) : (
            <><LogIn className="w-4 h-4" /> Sign In</>
          )}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl mx-auto w-full">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 border-4 border-white shadow-xl shadow-emerald-900/5">
          <Shield className="w-12 h-12 text-[#003823]" />
        </div>
        
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
          Protecting Lives.<br/>
          <span className="text-emerald-600">Preserving Wildlife.</span>
        </h2>
        
        <p className="text-base md:text-lg text-slate-500 mb-10 max-w-lg">
          The official community network for reporting human-wildlife conflicts. Help field rangers respond faster by reporting sightings in your area.
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={() => window.location.href = '/report'}
            className="w-full bg-[#003823] hover:bg-[#002819] text-white font-bold py-5 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-[#003823]/20 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-lg">Report a Conflict</div>
                <div className="text-xs font-normal text-emerald-100">No login required for emergencies</div>
              </div>
            </div>
            <ArrowRight className="w-6 h-6" />
          </button>

          {!user && (
            <button 
              onClick={() => window.location.href = '/citizen-auth'}
              className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold py-5 px-6 rounded-2xl flex items-center justify-between shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-xl">
                  <LogIn className="w-6 h-6 text-slate-500" />
                </div>
                <div className="text-left">
                  <div className="text-lg">Join the Network</div>
                  <div className="text-xs font-normal text-slate-400">Register to receive SMS alerts</div>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400" />
            </button>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs font-medium text-slate-400">
        &copy; {new Date().getFullYear()} WildGuard Initiative. All rights reserved.
      </footer>
    </div>
  );
}
