import React, { createContext, useContext, ReactNode } from 'react';
import { useDeviceContext, getDeviceContext } from '../utils/deviceContext';
import { DeviceType } from '../types';

// --- CONTEXT TYPE DEFINITION ---
interface DeviceContextType {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  densityFactor: number;
  getDeviceContext: () => DeviceType;
}

// --- DENSITY FACTOR CONFIGURATION ---
// Based on device type, we adjust the density of information
// Desktop/Wide: Full density (1.0)
// Tablet/SmallLaptop: Medium density (0.8)
// Mobile: Low density (0.6)
const getDensityFactor = (deviceType: DeviceType): number => {
  switch (deviceType) {
    case 'Mobile':
      return 0.6;
    case 'Tablet/SmallLaptop':
      return 0.8;
    default: // Desktop/Wide
      return 1.0;
  }
};

// --- CONTEXT CREATION ---
export const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export const DeviceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const deviceType = useDeviceContext();
  const densityFactor = getDensityFactor(deviceType);
  
  // Convenience booleans for easier consumption
  const isMobile = deviceType === 'Mobile';
  const isTablet = deviceType === 'Tablet/SmallLaptop';
  const isDesktop = deviceType === 'Desktop/Wide';

  const contextValue: DeviceContextType = {
    deviceType,
    isMobile,
    isTablet,
    isDesktop,
    densityFactor,
    getDeviceContext
  };

  return (
    <DeviceContext.Provider value={contextValue}>
      {children}
    </DeviceContext.Provider>
  );
};

// --- HOOK FOR CONSUMING CONTEXT ---
export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
