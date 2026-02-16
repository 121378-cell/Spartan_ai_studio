import { Request, Response, NextFunction } from 'express';
import { getSecretsManager } from '../services/secretsManagerService';
import { logger } from '../utils/logger';

/**
 * Secrets Injection Middleware
 * Loads secrets from AWS Secrets Manager on application startup
 * Provides access to secrets throughout the application
 */

declare global {
  namespace Express {
    interface Request {
      secrets?: {
        databasePassword?: string;
        jwtSecret?: string;
        apiKeys?: any;
        encryptionKey?: string;
      };
    }
  }
}

export const initializeSecretsMiddleware = async (): Promise<void> => {
  try {
    const secretsManager = getSecretsManager();
    
    logger.info('Initializing secrets from AWS Secrets Manager...', {
      context: 'secretsMiddleware'
    });

    // Load secrets needed at startup
    try {
      const dbSecret = await secretsManager.getSecret('database-secret');
      logger.info('Database secret loaded', { context: 'secretsMiddleware' });
    } catch (error) {
      logger.warn('Could not load database secret from AWS', {
        context: 'secretsMiddleware',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    try {
      const jwtSecret = await secretsManager.getSecret('jwt-secret');
      logger.info('JWT secret loaded', { context: 'secretsMiddleware' });
    } catch (error) {
      logger.warn('Could not load JWT secret from AWS', {
        context: 'secretsMiddleware',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    const status = secretsManager.getStatus();
    logger.info('Secrets Manager initialized successfully', {
      context: 'secretsMiddleware',
      metadata: status
    });
  } catch (error) {
    logger.error('Failed to initialize secrets', {
      context: 'secretsMiddleware',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Middleware to attach secrets to request (optional)
 * Use with caution - don't expose secrets in logs or responses
 */
export const secretsInjectionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const secretsManager = getSecretsManager();
    
    // Attach secrets manager to request for controllers to use
    (req as any).secretsManager = secretsManager;

    next();
  } catch (error) {
    logger.error('Error in secrets injection middleware', {
      context: 'secretsMiddleware',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Validate that required secrets are loaded
 */
export const validateSecretsMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const secretsManager = getSecretsManager();
    const status = secretsManager.getStatus();

    if (!status.enabled) {
      logger.warn('Secrets Manager not enabled', { context: 'secretsMiddleware' });
      res.status(503).json({
        success: false,
        message: 'Secrets service unavailable'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error validating secrets', {
      context: 'secretsMiddleware',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Endpoint to check secrets manager health
 */
export const secretsHealthEndpoint = (req: Request, res: Response): void => {
  try {
    const secretsManager = getSecretsManager();
    const status = secretsManager.getStatus();
    const cache = secretsManager.getCacheStatus();

    res.status(200).json({
      success: true,
      data: {
        status,
        cache,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get secrets status'
    });
  }
};

export default {
  initializeSecretsMiddleware,
  secretsInjectionMiddleware,
  validateSecretsMiddleware,
  secretsHealthEndpoint
};
