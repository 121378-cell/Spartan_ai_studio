import { useState, useEffect } from 'react';
import { DeviceType } from '../types';

/**
 * Detects and classifies the user's device based on screen width
 * 
 * Device Classification:
 * - Mobile: Screen width < 768px
 * - Tablet/SmallLaptop: Screen width between 768px and 1024px
 * - Desktop/Wide: Screen width > 1024px
 * 
 * @returns {DeviceType} The detected device type
 */
export const getDeviceContext = (): DeviceType => {
  const width = window.innerWidth;
  
  if (width < 768) {
    return 'Mobile';
  } else if (width >= 768 && width <= 1024) {
    return 'Tablet/SmallLaptop';
  } else {
    return 'Desktop/Wide';
  }
};

/**
 * Hook to track device context changes
 * 
 * @returns {DeviceType} The current device type
 */
export const useDeviceContext = (): DeviceType => {
  // For server-side rendering, default to Desktop/Wide
  if (typeof window === 'undefined') {
    return 'Desktop/Wide';
  }

  // Get initial device context
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceContext());

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      setDeviceType(getDeviceContext());
    };

    // Debounce resize event for performance
    let timeoutId: number;
    const debouncedHandleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleResize, 150);
    };

    // Add event listener
    window.addEventListener('resize', debouncedHandleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => {
        window.removeEventListener('resize', debouncedHandleResize);
        clearTimeout(timeoutId);
    }
  }, []);

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
