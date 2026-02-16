import { Request, Response, NextFunction } from 'express';
import { alertService, AlertType, AlertSeverity } from '../services/alertService';

/**
 * Middleware to create alerts for rate limit exceeded events
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function rateLimitAlertMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Listen for rate limit exceeded events
  const originalSend = res.send;
  res.send = function(body?: unknown) {
    // Check if this is a rate limit response (429 status)
    if (res.statusCode === 429) {
      // Extract client identifier (IP address)
      const clientId = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Create alert for rate limit exceeded
      alertService.createAlert(
        AlertType.RATE_LIMIT_EXCEEDED,
        AlertSeverity.MEDIUM,
        `Rate limit exceeded for ${req.method} ${req.path} by client ${clientId}`,
        'rateLimitAlertMiddleware',
        {
          endpoint: req.path,
          method: req.method,
          clientId,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }
      );
    }
    
    // Call original send method
    return originalSend.call(this, body);
  };
  
  next();
}

export default {
  rateLimitAlertMiddleware
};