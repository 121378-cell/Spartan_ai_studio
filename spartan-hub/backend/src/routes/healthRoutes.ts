import express from 'express';
import { 
  getHealthStatus, 
  getSimpleHealthStatus, 
  getServiceHealthStatus 
} from '../controllers/healthController';
import { validate } from '../middleware/validate';
import { serviceNameSchema, healthCheckSchema } from '../schemas/healthSchema';

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get detailed system health status
 *     description: Returns comprehensive health status of all critical dependencies including database, AI service, and cache
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy, degraded]
 *                       example: healthy
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-12-26T12:00:00Z'
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: 'Database'
 *                           status:
 *                             type: string
 *                             enum: [healthy, unhealthy, degraded]
 *                             example: 'healthy'
 *                           responseTime:
 *                             type: number
 *                             example: 15
 *                           lastChecked:
 *                             type: string
 *                             format: date-time
 *                             example: '2025-12-26T12:00:00Z'
 *                     uptime:
 *                       type: string
 *                       example: '2d 3h 45m 30s'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 'Health check failed'
 *                 error:
 *                   type: string
 *                   example: 'Database connection failed'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Get detailed system health status
router.get('/', validate(healthCheckSchema), getHealthStatus);

/**
 * @swagger
 * /health/simple:
 *   get:
 *     summary: Get simplified health status
 *     description: Returns a simplified health status of the system
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                   example: 'healthy'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2025-12-26T12:00:00Z'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: 'unhealthy'
 *                 error:
 *                   type: string
 *                   example: 'Database connection failed'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Get simplified health status
router.get('/simple', validate(healthCheckSchema), getSimpleHealthStatus);

/**
 * @swagger
 * /health/service/{serviceName}:
 *   get:
 *     summary: Get health status for a specific service
 *     description: Returns health status for a specific service by name
 *     tags: [Health]
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the service to check
 *         example: 'database'
 *     responses:
 *       200:
 *         description: Service health retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: 'Database'
 *                     status:
 *                       type: string
 *                       enum: [healthy, unhealthy, degraded]
 *                       example: 'healthy'
 *                     responseTime:
 *                       type: number
 *                       example: 15
 *                     lastChecked:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-12-26T12:00:00Z'
 *       400:
 *         description: Service name is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: 'Service name is required'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Service database not found"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Get health status for a specific service
router.get('/service/:serviceName', validate(serviceNameSchema), getServiceHealthStatus);

export default router;
