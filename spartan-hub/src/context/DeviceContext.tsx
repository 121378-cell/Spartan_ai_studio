import React, { createContext, useContext, ReactNode } from 'react';
import { useDevice as useDeviceUtil, useDeviceInfo, getDeviceContext, getDeviceInfo, DeviceInfo, PerformanceLevel } from '../utils/deviceContext';
import { DeviceType } from '../types';

// --- CONTEXT TYPE DEFINITION ---
interface DeviceContextType {
  deviceType: DeviceType;
  deviceInfo: DeviceInfo;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  densityFactor: number;
  performanceLevel: PerformanceLevel;
  getDeviceContext: () => DeviceType;
  getDeviceInfo: () => DeviceInfo;
}

// --- CONTEXT CREATION ---
export const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

// --- PROVIDER COMPONENT ---
export const DeviceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const deviceInfo = useDeviceInfo();

  const contextValue: DeviceContextType = {
    deviceType: deviceInfo.deviceType,
    deviceInfo,
    isMobile: deviceInfo.isMobile,
    isTablet: deviceInfo.isTablet,
    isDesktop: deviceInfo.isDesktop,
    densityFactor: deviceInfo.densityFactor,
    performanceLevel: deviceInfo.performanceLevel,
    getDeviceContext,
    getDeviceInfo,
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
