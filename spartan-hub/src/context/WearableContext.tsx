import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { WearableState, HeartRateData, WearableStatus } from '../types/wearable';
import { bluetoothService } from '../services/bluetoothService';

interface WearableContextType extends WearableState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WearableContext = createContext<WearableContextType | undefined>(undefined);

export const WearableProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WearableState>({
    status: 'disconnected',
    device: null,
    lastHeartRate: null
  });

  const handleData = useCallback((data: HeartRateData) => {
    setState(prev => ({
      ...prev,
      lastHeartRate: data
    }));
  }, []);

  const handleDisconnect = useCallback(() => {
    setState({
      status: 'disconnected',
      device: null,
      lastHeartRate: null
    });
  }, []);

  const connect = async () => {
    setState(prev => ({ ...prev, status: 'connecting', error: undefined }));
    try {
      const device = await bluetoothService.requestDevice();
      setState(prev => ({ 
        ...prev, 
        device: {
          id: device.id,
          name: device.name || 'Unknown Device',
          connected: true
        } 
      }));

      await bluetoothService.connect(device, handleData, handleDisconnect);
      setState(prev => ({ ...prev, status: 'connected' }));
    } catch (error: any) {
      console.error('Wearable connection failed:', error);
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error.message || 'Connection failed' 
      }));
    }
  };

  const disconnect = async () => {
    try {
      await bluetoothService.disconnect();
      handleDisconnect();
    } catch (error: any) {
      console.error('Wearable disconnection failed:', error);
    }
  };

  const value: WearableContextType = {
    ...state,
    connect,
    disconnect
  };

  return (
    <WearableContext.Provider value={value}>
      {children}
    </WearableContext.Provider>
  );
};

export const useWearable = () => {
  const context = useContext(WearableContext);
  if (context === undefined) {
    throw new Error('useWearable must be used within a WearableProvider');
  }
  return context;
};
