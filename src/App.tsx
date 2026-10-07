import React from 'react';
import { ShieldAlert, Compass } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="flex items-center space-x-3 mb-4">
        <ShieldAlert className="w-10 h-10 text-emerald-400" />
        <h1 className="text-3xl font-bold tracking-tight">WildGuard</h1>
      </div>
      <p className="text-slate-400 max-w-md text-center mb-6">
        Wildlife Conflict Prevention & Ranger Telemetry Monitoring Platform
      </p>
      <div className="flex gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
          <Compass className="w-6 h-6 text-emerald-400" />
          <span className="text-sm font-medium">Ready for Components & Views</span>
        </div>
      </div>
    </div>
  );
}
