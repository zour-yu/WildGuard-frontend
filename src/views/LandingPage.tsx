import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, MapPin } from 'lucide-react';
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
    <div className="min-h-screen font-sans flex flex-col relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1549366021-9f761d450615?q=80&w=2014&auto=format&fit=crop")' }}
      >
        <div className="absolute inset-0 bg-slate-900/80"></div>
      </div>

      <header className="relative z-10 px-6 py-4 flex items-center justify-between sticky top-0">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="WildGuard Logo" className="w-10 h-10 object-contain drop-shadow-md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none text-white">
              WildGuard
            </h1>
            <span className="text-sm font-semibold tracking-wide text-emerald-400 uppercase">
              Community
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleAuthAction}
          className="flex items-center gap-2 text-sm font-bold text-white hover:text-emerald-400 transition-colors"
        >
          {user ? (
            <><LogOut className="w-4 h-4" /> Sign Out</>
          ) : (
            <><LogIn className="w-4 h-4" /> Sign In</>
          )}
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl mx-auto w-full">
        <img src="/logo.png" alt="WildGuard Logo" className="w-32 h-32 object-contain mb-8 drop-shadow-xl" />
        
        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
          Protecting Lives.<br/>
          <span className="text-emerald-400">Preserving Wildlife.</span>
        </h2>
        
        <p className="text-base md:text-lg text-slate-300 mb-10 max-w-lg">
          The official community network for reporting human-wildlife conflicts. Help field rangers respond faster by reporting sightings in your area.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button 
            onClick={() => window.location.href = '/report'}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
          >
            <MapPin className="w-5 h-5" />
            Report a Conflict
          </button>

          {!user && (
            <button 
              onClick={() => window.location.href = '/citizen-auth'}
              className="flex-1 bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              Join the Network
            </button>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs font-medium text-slate-400">
        &copy; {new Date().getFullYear()} WildGuard Initiative. All rights reserved.
      </footer>
    </div>
  );
}
