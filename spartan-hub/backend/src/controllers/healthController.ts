/**
 * Health controller for handling health check requests
 * Provides endpoints for monitoring status of Spartan Hub application
 */

import { Request, Response } from 'express';
import { getSystemHealth, isSystemHealthy } from '../services/healthService';
import { logger } from '../utils/logger';

/**
 * Get detailed system health status
 * @param req - Express request object
 * @param res - Express response object
 * @returns Promise<void>
 * @description Returns comprehensive health status with all critical dependencies
 */
export async function getHealthStatus(req: Request, res: Response) {
  try {
    const health = await getSystemHealth();
    
    // Set appropriate HTTP status code based on overall health
    const statusCode = health.status === 'healthy' ? 200 : 
      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: health
    });
  } catch (error: unknown) {
    logger.error('Error getting health status', { context: 'health', metadata: { error } });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      message: 'Error retrieving health status',
      error: errorMessage
    });
  }
}

/**
 * Get simplified health status
 * @param req - Express request object
 * @param res - Express response object
 * @returns Promise<void>
 * @description Returns simplified health status with 200/503 status
 */
export async function getSimpleHealthStatus(req: Request, res: Response) {
  try {
    const isHealthy = await isSystemHealthy();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    logger.error('Error getting simple health status', { context: 'health', metadata: { error } });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      status: 'unhealthy',
      error: errorMessage
    });
  }
}

/**
 * Get health status for a specific service
 * @param req - Express request object with serviceName parameter
 * @param res - Express response object
 * @returns Promise<void>
 * @description Returns health status for a specific service by name
 */
export async function getServiceHealthStatus(req: Request, res: Response) {
  try {
    const {serviceName} = req.params;
    
    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }
    
    const health = await getSystemHealth();
    const service = health.services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service '${serviceName}' not found`
      });
    }
    
    return res.status(200).json({
      success: true,
      data: service
    });
  } catch (error: unknown) {
    logger.error('Error getting service health status', { context: 'health', metadata: { error } });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      success: false,
      message: 'Error retrieving service health status',
      error: errorMessage
    });
  }
}

export default {
  getHealthStatus,
  getSimpleHealthStatus,
  getServiceHealthStatus
};