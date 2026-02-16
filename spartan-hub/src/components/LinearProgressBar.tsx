import React from 'react';

interface LinearProgressBarProps {
  progress: number; // Percentage progress (0-100)
  color?: string;   // Color of the progress bar
  height?: number;  // Height of the progress bar in pixels
  showPercentage?: boolean; // Whether to show percentage text
}

const LinearProgressBar: React.FC<LinearProgressBarProps> = ({ 
  progress, 
  color = '#D4AF37', 
  height = 12,
  showPercentage = false
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className="spartan-progress-container" style={{ height }}>
      <div 
        className="spartan-progress-bar spartan-progress-bar-gold"
        style={{ 
          width: `${clampedProgress}%`,
          backgroundColor: color
        }}
      />
      {showPercentage && (
        <div className="text-center mt-1 text-sm font-medium">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
};

export default LinearProgressBar;
