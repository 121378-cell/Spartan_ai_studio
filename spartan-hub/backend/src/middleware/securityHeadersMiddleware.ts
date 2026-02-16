/**
 * Security Headers Middleware
 * Adds security headers to all HTTP responses to prevent common attacks
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Security headers configuration
 */
const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Strict transport security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Feature policy (deprecated but still useful)
  'Feature-Policy': 'geolocation \'none\'; microphone \'none\'; camera \'none\''
};

/**
 * Content Security Policy configuration
 */
const CSP_POLICY = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.ninjas.com https://exercisedb.p.rapidapi.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s+/g, ' ').trim();

/**
 * Apply security headers to all responses
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Apply basic security headers
    Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Apply Content Security Policy
    res.setHeader('Content-Security-Policy', CSP_POLICY);

    // Add request ID for tracing
    const requestId = req.headers['x-request-id'] || 
                     `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', requestId);

    logger.debug('Security headers applied', {
      context: 'security-headers',
      metadata: {
        requestId,
        url: req.url,
        method: req.method
      }
    });

    next();
  } catch (error) {
    logger.error('Failed to apply security headers', {
      context: 'security-headers',
      metadata: { error }
    });
    next(); // Continue even if headers fail
  }
};

/**
 * Advanced security middleware with additional protections
 */
export const advancedSecurityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Prevent DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Disable IE compatibility mode
    res.setHeader('X-UA-Compatible', 'IE=edge');
    
    // Prevent caching of sensitive data
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Add security response headers for API endpoints
    if (req.path.startsWith('/api/')) {
      res.setHeader('X-API-Version', '1.0');
      res.setHeader('X-RateLimit-Limit', '1000'); // Example rate limit
    }

    next();
  } catch (error) {
    logger.error('Advanced security middleware error', {
      context: 'advanced-security',
      metadata: { error }
    });
    next();
  }
};

/**
 * Request validation and sanitization
 */
export const requestValidationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate content length
    const contentLength = parseInt(req.headers['content-length'] as string || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      logger.warn('Request too large', {
        context: 'request-validation',
        metadata: {
          contentLength,
          url: req.url,
          method: req.method
        }
      });
      res.status(413).json({
        success: false,
        message: 'Request entity too large'
      });
      return;
    }

    // Validate content type for API requests
    if (req.path.startsWith('/api/') && req.method !== 'GET') {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        logger.warn('Invalid content type for API request', {
          context: 'request-validation',
          metadata: {
            contentType,
            url: req.url,
            method: req.method
          }
        });
        res.status(400).json({
          success: false,
          message: 'Content-Type must be application/json'
        });
        return;
      }
    }

    // Sanitize request headers
    const dangerousHeaders = [
      'x-forwarded-for',
      'x-forwarded-host',
      'x-real-ip',
      'forwarded'
    ];

    dangerousHeaders.forEach(header => {
      if (req.headers[header]) {
        logger.debug('Removed potentially dangerous header', {
          context: 'header-sanitization',
          metadata: { header, value: req.headers[header] }
        });
        delete req.headers[header];
      }
    });

    next();
  } catch (error) {
    logger.error('Request validation failed', {
      context: 'request-validation',
      metadata: { error }
    });
    res.status(400).json({
      success: false,
      message: 'Request validation failed'
    });
  }
};

export default {
  securityHeadersMiddleware,
  advancedSecurityMiddleware,
  requestValidationMiddleware
};