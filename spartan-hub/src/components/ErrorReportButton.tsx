import React, { useState } from 'react';
import ErrorReportingService, { ErrorReport } from '../services/errorReportingService';
import { logger } from '../utils/logger';

interface ErrorReportButtonProps {
  error?: Error | string;
  component: string;
  context?: Record<string, any>;
  userProfile?: any;
  onReportSent?: (report: ErrorReport) => void;
  className?: string;
  children?: React.ReactNode;
}

const ErrorReportButton: React.FC<ErrorReportButtonProps> = ({ 
  error,
  component,
  context,
  userProfile,
  onReportSent,
  className = '',
  children
}) => {
  const [isReporting, setIsReporting] = useState(false);
  const [isReported, setIsReported] = useState(false);

  const handleReportError = async () => {
    if (isReporting || isReported) return;
    
    setIsReporting(true);
    
    try {
      // Report the error
      const report = ErrorReportingService.reportError(
        error || 'User initiated error report',
        component,
        context,
        userProfile,
        'medium',
        true // Reported by user
      );
      
      // Send report to backend
      await ErrorReportingService.sendReports([report]);
      
      // Update state
      setIsReported(true);
      
      // Notify parent component if callback provided
      if (onReportSent) {
        onReportSent(report);
      }
      
      // Reset after 3 seconds
      setTimeout(() => {
        setIsReported(false);
      }, 3000);
    } catch (err) {
      logger.error('Failed to report error:', { metadata: { error: err instanceof Error ? err.message : String(err) } });
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <button
      onClick={handleReportError}
      disabled={isReporting || isReported}
      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
        isReported 
          ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
          : isReporting
            ? 'bg-spartan-border text-spartan-text-secondary cursor-not-allowed'
            : `bg-spartan-card text-spartan-text-secondary hover:bg-spartan-border hover:text-spartan-text ${className}`
      }`}
      aria-label={isReported ? "Error reportado" : "Reportar error"}
    >
      {isReported ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Reportado</span>
        </>
      ) : isReporting ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          <span>Enviando...</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>{children || 'Reportar problema'}</span>
        </>
      )}
    </button>
  );
};

export default ErrorReportButton;

