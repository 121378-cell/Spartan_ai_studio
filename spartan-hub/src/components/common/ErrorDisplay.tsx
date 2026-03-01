/**
 * Error Display Components
 * Phase A: Video Form Analysis MVP
 * 
 * User-friendly error messages with actionable states
 */

import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner' | 'modal';
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  message,
  errorCode,
  onRetry,
  onDismiss,
  variant = 'inline'
}) => {
  const variantClasses = {
    inline: 'p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
    banner: 'p-6 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 rounded-r-lg',
    modal: 'p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl'
  };

  return (
    <div
      className={`${variantClasses[variant]} text-red-800 dark:text-red-200`}
      role="alert"
      data-testid="error-display"
    >
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <div className="flex-shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Error Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className="text-sm opacity-90 mb-2">{message}</p>
          
          {errorCode && (
            <p className="text-xs font-mono opacity-70">
              Code: {errorCode}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                data-testid="retry-button"
              >
                Try Again
              </button>
            )}
            {onDismiss && variant !== 'modal' && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors text-sm font-medium"
                data-testid="dismiss-error"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Close Button for Modal */}
        {variant === 'modal' && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Camera Access Error
 */
export const CameraAccessError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorDisplay
      title="Camera Access Required"
      message="We need access to your camera to analyze your form. Please check your browser permissions and try again."
      errorCode="CAMERA_PERMISSION_DENIED"
      onRetry={onRetry}
      variant="banner"
    />
  );
};

/**
 * Network Error
 */
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorDisplay
      title="Connection Issue"
      message="We're having trouble connecting to our servers. Please check your internet connection and try again."
      errorCode="NETWORK_ERROR"
      onRetry={onRetry}
      variant="banner"
    />
  );
};

/**
 * Analysis Error
 */
export const AnalysisError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorDisplay
      title="Analysis Failed"
      message="We couldn't analyze your form. This might be due to poor lighting or unclear video. Please try again in better conditions."
      errorCode="ANALYSIS_FAILED"
      onRetry={onRetry}
      variant="inline"
    />
  );
};

/**
 * Timeout Error
 */
export const TimeoutError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorDisplay
      title="Request Timeout"
      message="The request took too long to complete. Please try again or check your internet connection."
      errorCode="REQUEST_TIMEOUT"
      onRetry={onRetry}
      variant="inline"
    />
  );
};

/**
 * Offline Banner
 */
export const OfflineBanner: React.FC = () => {
  return (
    <div
      className="bg-yellow-500 dark:bg-yellow-600 text-white px-4 py-3 text-center text-sm font-medium"
      role="alert"
      data-testid="offline-banner"
    >
      <div className="flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <span>You're offline. Changes will sync when you're back online.</span>
      </div>
    </div>
  );
};

export default ErrorDisplay;
