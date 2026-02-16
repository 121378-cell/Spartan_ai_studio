import React from 'react';
import { LoadingStateDetails, DetailedLoadingState, getLoadingStateMessage } from './DetailedLoadingState';
import CircularProgressIndicator from './CircularProgressIndicator';
import LinearProgressBar from './LinearProgressBar';

interface DetailedLoadingIndicatorProps {
  loadingState: LoadingStateDetails;
  showPercentage?: boolean;
  showStateMessage?: boolean;
  size?: number;
  strokeWidth?: number;
  height?: number;
}

const DetailedLoadingIndicator: React.FC<DetailedLoadingIndicatorProps> = ({ 
  loadingState,
  showPercentage = true,
  showStateMessage = true,
  size = 80,
  strokeWidth = 8,
  height = 12
}) => {
  // Determine progress value
  const progress = loadingState.progress ?? 0;
  
  // Determine if we should show the circular indicator (for active states)
  const showCircularIndicator = loadingState.state !== DetailedLoadingState.IDLE && 
                              loadingState.state !== DetailedLoadingState.COMPLETED &&
                              loadingState.state !== DetailedLoadingState.FAILED;
  
  // Determine color based on state
  const getColor = () => {
    switch (loadingState.state) {
      case DetailedLoadingState.FAILED:
        return '#EF4444'; // Red for errors
      case DetailedLoadingState.COMPLETED:
        return '#10B981'; // Green for success
      default:
        return '#D4AF37'; // Gold for ongoing operations
    }
  };
  
  // Get status message
  const statusMessage = loadingState.message || getLoadingStateMessage(loadingState.state);
  
  // Get error message if present
  const errorMessage = loadingState.error;
  
  return (
    <div className="detailed-loading-indicator space-y-4 p-4 rounded-lg bg-spartan-surface">
      {showCircularIndicator && (
        <div className="flex justify-center">
          <CircularProgressIndicator 
            progress={progress}
            size={size}
            strokeWidth={strokeWidth}
            color={getColor()}
            showPercentage={showPercentage}
          />
        </div>
      )}
      
      <div>
        <LinearProgressBar 
          progress={progress} 
          height={height}
          color={getColor()}
          showPercentage={showPercentage}
        />
      </div>
      
      {showStateMessage && (
        <div className="text-center">
          <p className={`font-medium ${loadingState.state === DetailedLoadingState.FAILED ? 'text-red-400' : 'text-spartan-text'}`}>
            {statusMessage}
          </p>
          {errorMessage && (
            <p className="text-red-400 text-sm mt-1">{errorMessage}</p>
          )}
        </div>
      )}
      
      {/* Show completion or error icon */}
      {loadingState.state === DetailedLoadingState.COMPLETED && (
        <div className="flex justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      )}
      
      {loadingState.state === DetailedLoadingState.FAILED && (
        <div className="flex justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
      )}
    </div>
  );
};

export default DetailedLoadingIndicator;
