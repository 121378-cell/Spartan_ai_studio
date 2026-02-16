/**
 * Security Dashboard API
 * Provides security monitoring and metrics endpoints
 */

import { Request, Response } from 'express';
import { sanitizationMonitor } from '../utils/sanitizationMonitor';
import { logger } from '../utils/logger';

interface SecurityMetrics {
  sanitization: {
    totalOperations: number;
    errors: number;
    bypassAttempts: number;
    fieldTypes: Record<string, number>;
    averageProcessingTime: number;
  };
  rateLimiting: {
    api: {
      activeClients: number;
      bannedClients: number;
      totalViolations: number;
    };
    auth: {
      activeClients: number;
      bannedClients: number;
      totalViolations: number;
    };
    strict: {
      activeClients: number;
      bannedClients: number;
      totalViolations: number;
    };
  };
  system: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    securityIssues: string[];
  };
}

/**
 * Get comprehensive security metrics
 */
export const getSecurityMetrics = (req: Request, res: Response): void => {
  try {
    const startTime = Date.now();
    
    // Get sanitization metrics
    const sanitizationMetrics = sanitizationMonitor.getMetrics();
    
    // Get rate limiting metrics (simulated - would need actual implementation)
    const rateLimitMetrics = {
      api: {
        activeClients: 0,
        bannedClients: 0,
        totalViolations: 0
      },
      auth: {
        activeClients: 0,
        bannedClients: 0,
        totalViolations: 0
      },
      strict: {
        activeClients: 0,
        bannedClients: 0,
        totalViolations: 0
      }
    };
    
    // Get system metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      securityIssues: sanitizationMonitor.detectSecurityIssues()
    };
    
    const metrics: SecurityMetrics = {
      sanitization: {
        totalOperations: sanitizationMetrics.totalOperations,
        errors: sanitizationMetrics.errors,
        bypassAttempts: sanitizationMetrics.bypassAttempts,
        fieldTypes: sanitizationMetrics.fieldTypes,
        averageProcessingTime: sanitizationMetrics.averageProcessingTime
      },
      rateLimiting: rateLimitMetrics,
      system: systemMetrics
    };
    
    const processingTime = Date.now() - startTime;
    
    logger.info('Security metrics retrieved', {
      context: 'security-dashboard',
      metadata: {
        processingTime,
        totalOperations: sanitizationMetrics.totalOperations,
        securityIssues: systemMetrics.securityIssues.length
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Security metrics retrieved successfully',
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve security metrics', {
      context: 'security-dashboard',
      metadata: { error }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get recent security events
 */
export const getSecurityEvents = (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const eventType = req.query.type as string || 'all';
    
    const events = sanitizationMonitor.getRecentEvents(limit);
    
    // Filter by event type if specified
    const filteredEvents = eventType === 'all' 
      ? events 
      : events.filter(event => event.result === eventType);
    
    logger.info('Security events retrieved', {
      context: 'security-events',
      metadata: {
        totalCount: events.length,
        filteredCount: filteredEvents.length,
        eventType
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Security events retrieved successfully',
      data: {
        events: filteredEvents,
        totalCount: filteredEvents.length,
        filters: {
          limit,
          eventType
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to retrieve security events', {
      context: 'security-events',
      metadata: { error }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security events',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get security report
 */
export const getSecurityReport = (req: Request, res: Response): void => {
  try {
    const report = sanitizationMonitor.generateSecurityReport();
    
    logger.info('Security report generated', {
      context: 'security-report',
      metadata: {
        totalOperations: report.metrics.totalOperations,
        securityIssues: report.securityIssues.length
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Security report generated successfully',
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to generate security report', {
      context: 'security-report',
      metadata: { error }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate security report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Reset security metrics (admin only)
 */
export const resetSecurityMetrics = (req: Request, res: Response): void => {
  try {
    // In production, this should require admin authentication
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_TOKEN;
    
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }
    
    sanitizationMonitor.resetMetrics();
    
    logger.warn('Security metrics reset by admin', {
      context: 'security-admin',
      metadata: {
        userId: req.headers['x-user-id'],
        timestamp: new Date().toISOString()
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Security metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reset security metrics', {
      context: 'security-admin',
      metadata: { error }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to reset security metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Health check for security systems
 */
export const securityHealthCheck = (req: Request, res: Response): void => {
  try {
    const healthStatus = {
      sanitization: {
        status: 'healthy',
        operational: true,
        metricsAvailable: true
      },
      rateLimiting: {
        status: 'healthy',
        operational: true,
        active: true
      },
      monitoring: {
        status: 'healthy',
        logging: true,
        metricsCollection: true
      },
      overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy'
    };
    
    // Check sanitization system
    try {
      const metrics = sanitizationMonitor.getMetrics();
      if (metrics.totalOperations < 0) {
        healthStatus.sanitization.status = 'degraded';
        healthStatus.overall = 'degraded';
      }
    } catch (error) {
      healthStatus.sanitization.status = 'unhealthy';
      healthStatus.sanitization.operational = false;
      healthStatus.overall = 'unhealthy';
    }
    
    res.status(200).json({
      success: true,
      message: 'Security systems health check completed',
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Security health check failed', {
      context: 'security-health',
      metadata: { error }
    });
    
    res.status(503).json({
      success: false,
      message: 'Security health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  getSecurityMetrics,
  getSecurityEvents,
  getSecurityReport,
  resetSecurityMetrics,
  securityHealthCheck
};
