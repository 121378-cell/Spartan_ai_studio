import React, { useState, useEffect } from 'react';
import { useOfflinePersistence } from '../hooks/useOfflinePersistence';
import { useAppContext } from '../context/AppContext';

const OfflinePersistenceDemo: React.FC = () => {
  const { 
    lastLoadedRoutine, 
    loadLastRoutine, 
    saveLastRoutine,
    isOfflineMode,
    checkOfflineMode,
    storageInfo,
    updateStorageInfo
  } = useOfflinePersistence();
  
  const { routines } = useAppContext();
  const [status, setStatus] = useState<string>('');

  // Check offline mode on component mount
  useEffect(() => {
    checkOfflineMode();
    updateStorageInfo();
  }, [checkOfflineMode, updateStorageInfo]);

  const handleSaveLastRoutine = () => {
    if (routines.length > 0) {
      const success = saveLastRoutine(routines[routines.length - 1]);
      setStatus(success ? 'Last routine saved successfully!' : 'Failed to save last routine');
      setTimeout(() => setStatus(''), 3000);
    } else {
      setStatus('No routines available to save');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleLoadLastRoutine = () => {
    const routine = loadLastRoutine();
    setStatus(routine ? 'Last routine loaded!' : 'No last routine found');
    setTimeout(() => setStatus(''), 3000);
  };

  const handleCheckOfflineMode = async () => {
    const offline = await checkOfflineMode();
    setStatus(offline ? 'Currently offline' : 'Currently online');
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="p-4 bg-spartan-card rounded-lg">
      <h2 className="text-xl font-bold mb-4">Offline Persistence Demo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-spartan-surface p-3 rounded">
          <h3 className="font-bold mb-2">Status</h3>
          <p>Offline Mode: {isOfflineMode ? 'Yes' : 'No'}</p>
          <p>Last Loaded Routine: {lastLoadedRoutine ? lastLoadedRoutine.name : 'None'}</p>
          {storageInfo && (
            <p>Storage: {storageInfo.percentage}% used</p>
          )}
        </div>
        
        <div className="bg-spartan-surface p-3 rounded">
          <h3 className="font-bold mb-2">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleSaveLastRoutine}
              className="px-3 py-1 bg-spartan-gold text-spartan-bg rounded text-sm"
            >
              Save Last Routine
            </button>
            <button 
              onClick={handleLoadLastRoutine}
              className="px-3 py-1 bg-spartan-gold text-spartan-bg rounded text-sm"
            >
              Load Last Routine
            </button>
            <button 
              onClick={handleCheckOfflineMode}
              className="px-3 py-1 bg-spartan-gold text-spartan-bg rounded text-sm"
            >
              Check Connection
            </button>
          </div>
        </div>
      </div>
      
      {status && (
        <div className="p-2 bg-spartan-gold/20 rounded text-center">
          {status}
        </div>
      )}
      
      <div className="mt-4 text-sm text-spartan-text-secondary">
        <p>This demo shows how critical data like the last loaded routine is persisted for offline access.</p>
        <p>When the backend is unavailable, the app can still function using locally stored data.</p>
      </div>
    </div>
  );
};

export default OfflinePersistenceDemo;
