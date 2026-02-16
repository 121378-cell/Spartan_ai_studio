import { Router } from 'express';
import {
  assignPlan,
  trackCommitment,
  getUserPlans,
  getCommitment
} from '../controllers/planController';
import { validate } from '../middleware/validate';
import { verifyJWT } from '../middleware/auth';
import { apiRateLimit, writeRateLimit } from '../middleware/rateLimitMiddleware';
import {
  assignPlanSchema,
  trackCommitmentSchema,
  getUserPlansSchema,
  getCommitmentSchema
} from '../schemas/planSchema';
import { sanitizeInputFields } from '../middleware/validationMiddleware';

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimit);

// Apply authentication to all routes
router.use(verifyJWT);

/**
 * @swagger
 * /plan/asignar:
 *   post:
 *     summary: Assign a plan to a user
 *     description: Assigns a specific routine/plan to a user with a start date
 *     tags: [Plan Management]
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
 *               - routineId
 *               - startDate
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to assign the plan to
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *               routineId:
 *                 type: string
 *                 description: Routine ID to assign
 *                 example: '456f7890-f12b-34d5-e678-537725285111'
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for the plan
 *                 example: '2025-01-01'
 *     responses:
 *       201:
 *         description: Plan assigned successfully
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
 *                   example: Plan assigned successfully.
 *                 data:
 *                   type: object
 *                   description: The created plan assignment
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: '789a0123-456c-78d9-e012-345567890123'
 *                     userId:
 *                       type: string
 *                       example: '123e4567-e89b-12d3-a456-426614174000'
 *                     routineId:
 *                       type: string
 *                       example: '456f7890-f12b-34d5-e678-537725285111'
 *                     startDate:
 *                       type: string
 *                       format: date
 *                       example: '2025-01-01'
 *                     assignedAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-12-26T12:00:00Z'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User or routine not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: We could not find a user with that ID. Please check the user information and try again.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Plan assignment routes
router.post('/asignar', validate(assignPlanSchema), sanitizeInputFields, assignPlan);

/**
 * @swagger
 * /plan/asignar/{userId}:
 *   get:
 *     summary: Get user's assigned plans
 *     description: Retrieves all plans assigned to a specific user
 *     tags: [Plan Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve plans for
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       200:
 *         description: User plans retrieved successfully
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
 *                   example: User plans retrieved successfully.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: '789a0123-456c-78d9-e012-345567890123'
 *                       userId:
 *                         type: string
 *                         example: '123e4567-e89b-12d3-a456-426614174000'
 *                       routineId:
 *                         type: string
 *                         example: '456f7890-f12b-34d5-e678-537725285111'
 *                       startDate:
 *                         type: string
 *                         format: date
 *                         example: '2025-01-01'
 *                       assignedAt:
 *                         type: string
 *                         format: date-time
 *                         example: '2025-12-26T12:00:00Z'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: We could not find a user with that ID. Please check the user information and try again.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/asignar/:userId', validate(getUserPlansSchema), getUserPlans);

/**
 * @swagger
 * /plan/compromiso:
 *   post:
 *     summary: Track user commitment to a plan
 *     description: Records a user's commitment level to a specific routine/plan
 *     tags: [Plan Management]
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
 *               - routineId
 *               - commitmentLevel
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: '123e4567-e89b-12d3-a456-426614174000'
 *               routineId:
 *                 type: string
 *                 description: Routine ID
 *                 example: '456f7890-f12b-34d5-e678-537725285111'
 *               commitmentLevel:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Commitment level on a scale of 1-10
 *                 example: 8
 *               notes:
 *                 type: string
 *                 description: Optional notes about the commitment
 *                 example: 'Feeling confident about this routine'
 *     responses:
 *       200:
 *         description: Commitment tracked successfully
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
 *                   example: Commitment tracked successfully.
 *                 data:
 *                   type: object
 *                   description: The created/updated commitment
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: '012b3456-789d-01e2-f345-678901234567'
 *                     userId:
 *                       type: string
 *                       example: '123e4567-e89b-12d3-a456-426614174000'
 *                     routineId:
 *                       type: string
 *                       example: '456f7890-f12b-34d5-e678-537725285111'
 *                     commitmentLevel:
 *                       type: number
 *                       example: 8
 *                     notes:
 *                       type: string
 *                       example: 'Feeling confident about this routine'
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-12-26T12:00:00Z'
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-12-26T12:00:00Z'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User or routine not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: We could not find a user with that ID. Please check the user information and try again.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Commitment tracking routes
router.post('/compromiso', validate(trackCommitmentSchema), sanitizeInputFields, trackCommitment);

/**
 * @swagger
 * /plan/compromiso/{userId}/{routineId}:
 *   get:
 *     summary: Get user's commitment to a specific routine
 *     description: Retrieves a user's commitment level for a specific routine
 *     tags: [Plan Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *       - in: path
 *         name: routineId
 *         required: true
 *         schema:
 *           type: string
 *         description: Routine ID
 *         example: '456f7890-f12b-34d5-e678-537725285111'
 *     responses:
 *       200:
 *         description: Commitment retrieved successfully
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
 *                   example: Commitment retrieved successfully.
 *                 data:
 *                   type: object
 *                   description: The commitment record (or null if not found)
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: '012b3456-789d-01e2-f345-678901234567'
 *                     userId:
 *                       type: string
 *                       example: '123e4567-e89b-12d3-a456-426614174000'
 *                     routineId:
 *                       type: string
 *                       example: '456f7890-f12b-34d5-e678-537725285111'
 *                     commitmentLevel:
 *                       type: number
 *                       example: 8
 *                     notes:
 *                       type: string
 *                       example: 'Feeling confident about this routine'
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-12-26T12:00:00Z'
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-12-26T12:00:00Z'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User or routine not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: We could not find a user with that ID. Please check the user information and try again.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/compromiso/:userId/:routineId', validate(getCommitmentSchema), getCommitment);

export default router;