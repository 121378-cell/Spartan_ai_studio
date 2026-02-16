import React from 'react';
import { useDevice } from '../context/DeviceContext';

/**
 * Demo component showing how to use the device context
 * This component displays the current device type and provides
 * boolean flags for conditional rendering based on device type
 */
const DeviceContextDemo: React.FC = () => {
  const { deviceType, isMobile, isTablet, isDesktop, densityFactor } = useDevice();

  return (
    <div className="p-4 bg-spartan-card rounded-lg shadow-md">
      <h3 className="text-lg font-bold mb-2">Device Context Information</h3>
      <div className="space-y-2">
        <p>
          <span className="font-semibold">Current Device Type:</span> {deviceType}
        </p>
        <p>
          <span className="font-semibold">Density Factor:</span> {densityFactor}
        </p>
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className={`p-2 rounded text-center ${isMobile ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
            Mobile
          </div>
          <div className={`p-2 rounded text-center ${isTablet ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
            Tablet/Small Laptop
          </div>
          <div className={`p-2 rounded text-center ${isDesktop ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}>
            Desktop/Wide
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Usage Examples:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Show simplified navigation on {isMobile ? 'mobile devices' : 'non-mobile devices'}</li>
            <li>Adjust layout columns based on screen size</li>
            <li>Modify touch targets for {isMobile ? 'mobile' : 'desktop'} users</li>
            <li>Optimize content density for {deviceType} screens</li>
            <li>Apply density factor ({densityFactor}) to font sizes and padding</li>
          </ul>
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Density Factor Applications:</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Font size: {Math.round(16 * densityFactor)}px (base 16px)</li>
            <li>Padding: {Math.round(10 * densityFactor)}px (base 10px)</li>
            <li>Margin: {Math.round(8 * densityFactor)}px (base 8px)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DeviceContextDemo;
