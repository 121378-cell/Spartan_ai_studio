import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { DeviceType } from '../types';

/**
 * Device performance level based on hardware capabilities
 */
export type PerformanceLevel = 'high' | 'medium' | 'low';

/**
 * Extended device information
 */
export interface DeviceInfo {
  deviceType: DeviceType;
  performanceLevel: PerformanceLevel;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  densityFactor: number;
  cores: number;
  memoryGB: number;
  isLowEnd: boolean;
  supportsWebWorkers: boolean;
  maxWorkers: number;
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  orientation: 'portrait' | 'landscape';
}

/**
 * Device classification breakpoints
 */
const BREAKPOINTS = {
  MOBILE_MAX: 768,
  TABLET_MAX: 1024,
};

/**
 * Performance level thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  HIGH_CORES: 6,
  HIGH_MEMORY: 8,
  MEDIUM_CORES: 4,
  MEDIUM_MEMORY: 4,
};

/**
 * Detects and classifies the user's device based on screen width and hardware capabilities
 *
 * Device Classification:
 * - Mobile: Screen width < 768px
 * - Tablet/SmallLaptop: Screen width between 768px and 1024px
 * - Desktop/Wide: Screen width > 1024px
 *
 * Performance Classification:
 * - High: 6+ cores AND 8+ GB RAM
 * - Medium: 4+ cores OR 4+ GB RAM
 * - Low: Everything else
 *
 * @returns {DeviceType} The detected device type
 */
export const getDeviceContext = (): DeviceType => {
  if (typeof window === 'undefined') {
    return 'Desktop/Wide';
  }
  
  const width = window.innerWidth;

  if (width < BREAKPOINTS.MOBILE_MAX) {
    return 'Mobile';
  } else if (width >= BREAKPOINTS.MOBILE_MAX && width <= BREAKPOINTS.TABLET_MAX) {
    return 'Tablet/SmallLaptop';
  } else {
    return 'Desktop/Wide';
  }
};

/**
 * Get detailed device information
 */
export const getDeviceInfo = (): DeviceInfo => {
  const deviceType = getDeviceContext();
  const cores = navigator.hardwareConcurrency || 2;
  const memoryGB = (navigator as any).deviceMemory || 4;
  const supportsWebWorkers = typeof Worker !== 'undefined';
  
  // Determine performance level
  let performanceLevel: PerformanceLevel = 'medium';
  if (cores >= PERFORMANCE_THRESHOLDS.HIGH_CORES && memoryGB >= PERFORMANCE_THRESHOLDS.HIGH_MEMORY) {
    performanceLevel = 'high';
  } else if (cores < PERFORMANCE_THRESHOLDS.MEDIUM_CORES || memoryGB < PERFORMANCE_THRESHOLDS.MEDIUM_MEMORY) {
    performanceLevel = 'low';
  }
  
  // Calculate max workers (use half of available cores, min 1, max 4)
  const maxWorkers = Math.min(4, Math.max(1, Math.floor(cores / 2)));
  
  // Check if low-end device
  const isLowEnd = cores <= 4 || memoryGB <= 4;

  return {
    deviceType,
    performanceLevel,
    isMobile: deviceType === 'Mobile',
    isTablet: deviceType === 'Tablet/SmallLaptop',
    isDesktop: deviceType === 'Desktop/Wide',
    densityFactor: getDensityFactor(deviceType),
    cores,
    memoryGB,
    isLowEnd,
    supportsWebWorkers,
    maxWorkers,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
    },
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
  };
};

/**
 * Hook to track device context changes with detailed information
 *
 * @returns {DeviceInfo} The current device information
 */
export const useDeviceInfo = (): DeviceInfo => {
  // For server-side rendering, default to Desktop/Wide with safe defaults
  if (typeof window === 'undefined') {
    return {
      deviceType: 'Desktop/Wide',
      performanceLevel: 'high',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      densityFactor: 1.0,
      cores: 4,
      memoryGB: 8,
      isLowEnd: false,
      supportsWebWorkers: true,
      maxWorkers: 2,
      screen: { width: 1920, height: 1080, pixelRatio: 1 },
      orientation: 'landscape',
    };
  }

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo());

  useEffect(() => {
    // Update device info on mount
    setDeviceInfo(getDeviceInfo());

    // Handler to call on window resize
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    // Handler for orientation change
    const handleOrientationChange = () => {
      setDeviceInfo(getDeviceInfo());
    };

    // Debounce resize event for performance
    let timeoutId: number;
    const debouncedHandleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleResize, 150);
    };

    // Add event listeners
    window.addEventListener('resize', debouncedHandleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(timeoutId);
    };
  }, []);

  return deviceInfo;
};

/**
 * Hook to track device context changes (legacy, returns DeviceType only)
 *
 * @returns {DeviceType} The current device type
 */
export const useDeviceContext = (): DeviceType => {
  const { deviceType } = useDeviceInfo();
  return deviceType;
};

/**
 * Gets the density factor based on device type
 *
 * Density Factor Configuration:
 * - Desktop/Wide: 1.0 (Full density)
 * - Tablet/SmallLaptop: 0.8 (Medium density)
 * - Mobile: 0.6 (Low density)
 *
 * @param deviceType The device type
 * @returns The density factor for the device type
 */
export const getDensityFactor = (deviceType: DeviceType): number => {
  switch (deviceType) {
    case 'Mobile':
      return 0.6;
    case 'Tablet/SmallLaptop':
      return 0.8;
    default: // Desktop/Wide
      return 1.0;
  }
};

/**
 * Applies density factor to a pixel value
 *
 * @param pixels The base pixel value
 * @param densityFactor The density factor to apply
 * @returns The adjusted pixel value
 */
export const applyDensity = (pixels: number, densityFactor: number): number => {
  return Math.round(pixels * densityFactor);
};

/**
 * Applies density factor to a CSS value (e.g., "16px" -> "10px")
 *
 * @param cssValue The CSS value (e.g., "16px", "1.5rem")
 * @param densityFactor The density factor to apply
 * @returns The adjusted CSS value
 */
export const applyDensityToCSS = (cssValue: string, densityFactor: number): string => {
  // Handle pixel values
  if (cssValue.endsWith('px')) {
    const pixels = parseInt(cssValue.replace('px', ''), 10);
    return `${applyDensity(pixels, densityFactor)}px`;
  }

  // Handle rem values
  if (cssValue.endsWith('rem')) {
    const rems = parseFloat(cssValue.replace('rem', ''));
    return `${(rems * densityFactor).toFixed(2)}rem`;
  }

  // Handle em values
  if (cssValue.endsWith('em')) {
    const ems = parseFloat(cssValue.replace('em', ''));
    return `${(ems * densityFactor).toFixed(2)}em`;
  }

  // Return unchanged for other units or non-numeric values
  return cssValue;
};

/**
 * Context for device information
 */
export interface DeviceContextType {
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

// Create context
export const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

// Provider component
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

// Hook for consuming context
export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
