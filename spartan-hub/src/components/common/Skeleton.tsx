/**
 * Loading Skeleton Component
 * Phase A: Video Form Analysis MVP
 * 
 * Provides visual loading states for better UX
 */

import React from 'react';

interface SkeletonProps {
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height,
  className = ''
}) => {
  const baseClasses = 'animate-pulse bg-gray-300 dark:bg-gray-700';
  const variantClasses = {
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    text: 'rounded h-4'
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      role="status"
      aria-label="Loading..."
    />
  );
};

/**
 * Form Analysis Loading State
 */
export const FormAnalysisLoading: React.FC = () => {
  return (
    <div className="space-y-4" data-testid="form-analysis-loading">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" />
        </div>
      </div>

      {/* Video Area Skeleton */}
      <div className="relative bg-gray-200 dark:bg-gray-800 rounded-lg aspect-video">
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton variant="circular" width={60} height={60} />
        </div>
      </div>

      {/* Feedback Cards Skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <Skeleton variant="text" width="40%" className="mb-2" />
          <Skeleton variant="text" width="80%" />
        </div>
        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          <Skeleton variant="text" width="40%" className="mb-2" />
          <Skeleton variant="text" width="80%" />
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="space-y-2">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="100%" />
      </div>
    </div>
  );
};

/**
 * Recording Loading State
 */
export const RecordingLoading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4" data-testid="recording-loading">
      {/* Pulsing Recording Indicator */}
      <div className="relative">
        <div className="w-16 h-16 bg-red-500 rounded-full animate-ping" />
        <div className="absolute inset-0 w-16 h-16 bg-red-500 rounded-full" />
      </div>

      {/* Loading Text */}
      <Skeleton variant="text" width="200px" className="text-center" />

      {/* Timer Skeleton */}
      <div className="bg-gray-800 text-white px-6 py-3 rounded-lg">
        <Skeleton variant="text" width="80px" height="32px" />
      </div>

      {/* Progress Bar Skeleton */}
      <div className="w-64 h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-spartan-primary animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  );
};

/**
 * Analysis Results Loading State
 */
export const AnalysisResultsLoading: React.FC = () => {
  return (
    <div className="space-y-6" data-testid="analysis-results-loading">
      {/* Score Card Skeleton */}
      <div className="bg-gradient-to-r from-spartan-primary to-spartan-gold rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="text" width="120px" className="mb-2" />
            <Skeleton variant="text" width="80px" height="48px" />
          </div>
          <Skeleton variant="circular" width={80} height={80} />
        </div>
      </div>

      {/* Feedback Sections */}
      <div className="space-y-4">
        <Skeleton variant="text" width="150px" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" width="100%" />
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-center">
            <Skeleton variant="text" width="60%" className="mb-2" />
            <Skeleton variant="text" width="80%" height="32px" />
          </div>
        ))}
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex gap-4">
        <Skeleton variant="rectangular" width="50%" height="48px" />
        <Skeleton variant="rectangular" width="50%" height="48px" />
      </div>
    </div>
  );
};

/**
 * List Loading State
 */
export const ListLoading: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3" data-testid="list-loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;
