import { Router } from 'express';
import {
  getAiAlert,
  checkAiHealth,
  getAiAlertFromBody,
  generateStructuredDecision,
  getQueueStats,
  reloadAiConfig
} from '../controllers/aiController';
import { validate } from '../middleware/validate';
import { verifyJWT } from '../middleware/auth';
import { heavyApiRateLimit, getRateLimit } from '../middleware/rateLimitMiddleware';
import { aiAlertUserIdSchema, aiAlertBodySchema, aiDecisionSchema, queueStatsSchema } from '../schemas/aiSchema';
import { healthCheckSchema } from '../schemas/healthSchema';

const router = Router();

// Apply rate limiting to all routes
router.use(heavyApiRateLimit);

// Apply authentication to protected routes (health endpoint is public)
router.use('/alert', verifyJWT);
router.use('/decision', verifyJWT);
router.use('/queue/stats', verifyJWT);

/**
 * @swagger
 * /ai/alert/{userId}:
 *   post:
 *     summary: Get AI alert for a specific user
 *     description: Generates an AI-based alert or recommendation for the specified user
 *     tags: [AI Services]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to generate alert for
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               context:
 *                 type: string
 *                 description: Additional context for the AI alert
 *                 example: 'User has missed 3 workouts this week'
 *     responses:
 *       200:
 *         description: AI alert generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'AI alert generated successfully'
 *                 data:
 *                   type: object
 *                   description: AI-generated alert or recommendation
 *                   example: { alert: 'Consider adjusting your workout schedule to maintain consistency', priority: 'medium' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// AI alert routes
router.post('/alert/:userId', validate(aiAlertUserIdSchema), getAiAlert);

/**
 * @swagger
 * /ai/alert:
 *   post:
 *     summary: Get AI alert from request body
 *     description: Generates an AI-based alert or recommendation based on the request body
 *     tags: [AI Services]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *               context:
 *                 type: string
 *                 description: Context for the AI alert
 *                 example: 'User has missed 3 workouts this week'
 *     responses:
 *       200:
 *         description: AI alert generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'AI alert generated successfully'
 *                 data:
 *                   type: object
 *                   description: AI-generated alert or recommendation
 *                   example: { alert: 'Consider adjusting your workout schedule to maintain consistency', priority: 'medium' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/alert', validate(aiAlertBodySchema), getAiAlertFromBody);

/**
 * @swagger
 * /ai/decision/{userId}:
 *   post:
 *     summary: Generate structured AI decision
 *     description: Generates a structured decision based on user data and context
 *     tags: [AI Services]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to generate decision for
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - context
 *             properties:
 *               context:
 *                 type: string
 *                 description: Context for the AI decision
 *                 example: 'User performance data and goals'
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Available options for the decision
 *                 example: ['Increase intensity', 'Reduce volume', 'Change focus']
 *     responses:
 *       200:
 *         description: Structured decision generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Decision generated successfully'
 *                 data:
 *                   type: object
 *                   description: Structured AI decision
 *                   example: { decision: 'Increase intensity', confidence: 0.8, reasoning: 'User shows good recovery patterns' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/decision/:userId', validate(aiDecisionSchema), generateStructuredDecision);

/**
 * @swagger
 * /ai/health:
 *   get:
 *     summary: Check AI service health
 *     description: Returns the health status of the AI service
 *     tags: [AI Services]
 *     responses:
 *       200:
 *         description: AI service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'AI service is operational'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/health', validate(healthCheckSchema), checkAiHealth);

/**
 * @swagger
 * /ai/queue/stats:
 *   get:
 *     summary: Get AI queue statistics
 *     description: Returns statistics about the AI processing queue
 *     tags: [AI Services]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics retrieved successfully
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
 *                   description: Queue statistics
 *                   example: { pending: 5, processing: 2, completed: 150, failed: 1 }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/queue/stats', validate(queueStatsSchema), getQueueStats);

/**
 * @swagger
 * /ai/config/reload:
 *   post:
 *     summary: Reload AI provider configuration
 *     description: Manually triggers a reload of the AI provider configuration without restarting the server.
 *     tags: [AI Services]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration reloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'AI provider configuration reloaded successfully.'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/config/reload', verifyJWT, reloadAiConfig);

export default router;