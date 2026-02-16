import React from 'react';
import { useDevice } from '../context/DeviceContext';

/**
 * A demonstration component showing how to apply density factors
 * to create responsive information density
 */
const DensityAwareCard: React.FC = () => {
  const { deviceType, densityFactor } = useDevice();

  // Calculate responsive styles based on density factor
  const cardStyle = {
    fontSize: `${16 * densityFactor}px`,
    padding: `${20 * densityFactor}px`,
    margin: `${10 * densityFactor}px`,
    borderRadius: `${8 * densityFactor}px`,
  };

  const titleStyle = {
    fontSize: `${24 * densityFactor}px`,
    marginBottom: `${15 * densityFactor}px`,
  };

  const buttonStyle = {
    fontSize: `${14 * densityFactor}px`,
    padding: `${10 * densityFactor}px ${15 * densityFactor}px`,
    marginTop: `${15 * densityFactor}px`,
  };

  return (
    <div 
      className="bg-spartan-card border border-spartan-border rounded-lg shadow-md max-w-md mx-auto"
      style={cardStyle}
    >
      <h2 style={titleStyle} className="font-bold text-spartan-primary">
        Adaptive Density Card
      </h2>
      
      <p className="mb-4 text-spartan-text">
        This card automatically adjusts its information density based on your device type.
        You are currently on a <span className="font-semibold">{deviceType}</span> device 
        with a density factor of <span className="font-semibold">{densityFactor}</span>.
      </p>
      
      <ul className="list-disc pl-5 mb-4 space-y-2">
        <li>Font sizes scale with device</li>
        <li>Padding adjusts for touch targets</li>
        <li>Layout optimizes for screen real estate</li>
      </ul>
      
      <button 
        className="bg-spartan-primary hover:bg-spartan-primary-dark text-white font-semibold rounded transition-colors duration-200"
        style={buttonStyle}
      >
        Responsive Button
      </button>
      
      <div className="mt-4 p-3 bg-spartan-bg-light rounded">
        <p className="text-sm">
          <span className="font-semibold">Density Factor:</span> {densityFactor}
        </p>
        <p className="text-sm">
          <span className="font-semibold">Base Font:</span> 16px → {Math.round(16 * densityFactor)}px
        </p>
        <p className="text-sm">
          <span className="font-semibold">Base Padding:</span> 20px → {Math.round(20 * densityFactor)}px
        </p>
      </div>
    </div>
  );
};

export default DensityAwareCard;
