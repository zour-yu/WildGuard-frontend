import React, { useState } from 'react';
import ConflictDashboard from './views/conflicts/ConflictDashboard';
import ConflictInbox from './views/conflicts/ConflictInbox';
import ConflictResolutionDetail from './views/conflicts/ConflictResolutionDetail';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'inbox' | 'resolution'>('inbox');

  return (
    <>
      {currentView === 'dashboard' && <ConflictDashboard onNavigate={setCurrentView} />}
      {currentView === 'inbox' && <ConflictInbox onNavigate={setCurrentView} />}
      {currentView === 'resolution' && <ConflictResolutionDetail onNavigate={setCurrentView} />}
    </>
  );
}

