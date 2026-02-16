import { UserProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Interface for error report data
 */
export interface ErrorReport {
  id: string;
  timestamp: string;
  error: string;
  errorStack?: string;
  component: string;
  userAgent?: string;
  url?: string;
  userProfile?: Partial<UserProfile>;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedByUser: boolean;
}

/**
 * Service for error reporting with context
 */
export class ErrorReportingService {
  private static reports: ErrorReport[] = [];
  private static maxReports = 50; // Limit stored reports to prevent memory issues

  /**
   * Report an error with context
   * @param error The error object or message
   * @param component The component where the error occurred
   * @param context Additional context information
   * @param userProfile User profile information (optional)
   * @param severity Error severity level
   * @param reportedByUser Whether the error was reported by the user
   */
  static reportError(
    error: Error | string,
    component: string,
    context?: Record<string, any>,
    userProfile?: Partial<UserProfile>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    reportedByUser = false
  ): ErrorReport {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    const report: ErrorReport = {
      id: `err_${Date.now()}_${uuidv4().replace(/-/g, '').substring(0, 9)}`,
      timestamp: new Date().toISOString(),
      error: errorObj.message,
      errorStack: errorObj.stack,
      component,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userProfile: userProfile ? {
        name: userProfile.name,
        email: userProfile.email,
        quest: userProfile.quest,
        stats: userProfile.stats,
        trainingCycle: userProfile.trainingCycle,
        isInAutonomyPhase: userProfile.isInAutonomyPhase
      } : undefined,
      context,
      severity,
      reportedByUser
    };

    // Add to reports array (keeping only the most recent reports)
    this.reports.unshift(report);
    if (this.reports.length > this.maxReports) {
      this.reports.pop();
    }

    // Log to console for development
    logger.error('Error Report', {
      context: 'error-reporting',
      metadata: {
        component,
        message: errorObj.message,
        report
      }
    });

    return report;
  }

  /**
   * Get all error reports
   * @returns Array of error reports
   */
  static getReports(): ErrorReport[] {
    return [...this.reports];
  }

  /**
   * Get error reports by component
   * @param component Component name
   * @returns Array of error reports for the component
   */
  static getReportsByComponent(component: string): ErrorReport[] {
    return this.reports.filter(report => report.component === component);
  }

  /**
   * Get error reports by severity
   * @param severity Severity level
   * @returns Array of error reports with the specified severity
   */
  static getReportsBySeverity(severity: ErrorReport['severity']): ErrorReport[] {
    return this.reports.filter(report => report.severity === severity);
  }

  /**
   * Clear all error reports
   */
  static clearReports(): void {
    this.reports = [];
  }

  /**
   * Export error reports as JSON
   * @returns JSON string of error reports
   */
  static exportReports(): string {
    return JSON.stringify(this.reports, null, 2);
  }

  /**
   * Simulate sending error reports to a backend service
   * In a real implementation, this would send to an actual backend endpoint
   * @param reports Error reports to send
   * @returns Promise that resolves when reports are sent
   */
  static async sendReports(reports: ErrorReport[] = this.reports): Promise<void> {
    try {
      // In a real implementation, this would be:
      // await fetch('/api/error-reports', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(reports)
      // });

      logger.info('Sending error reports to backend', {
        context: 'error-reporting',
        metadata: { reportCount: reports.length }
      });

      // For demo purposes, we'll just log to console
      // In a real app, you would send to your backend service
    } catch (error) {
      logger.error('Failed to send error reports', {
        context: 'error-reporting',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Don't throw here as we don't want reporting errors to break the app
    }
  }
}

export default ErrorReportingService;

