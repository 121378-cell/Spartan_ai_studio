import React from 'react';

interface CircularProgressIndicatorProps {
  progress: number; // Percentage progress (0-100)
  size?: number;    // Size of the circle in pixels
  strokeWidth?: number; // Width of the progress ring
  color?: string;   // Color of the progress ring
  bgColor?: string; // Background ring color
  showPercentage?: boolean; // Whether to show percentage text in the center
}

const CircularProgressIndicator: React.FC<CircularProgressIndicatorProps> = ({ 
  progress, 
  size = 100, 
  strokeWidth = 8,
  color = '#D4AF37',
  bgColor = '#333333',
  showPercentage = false
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  // Calculate dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg 
        className="transform -rotate-90" 
        width={size} 
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default CircularProgressIndicator;
