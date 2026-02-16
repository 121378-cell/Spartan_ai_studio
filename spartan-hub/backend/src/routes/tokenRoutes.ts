import { Router } from 'express';
import { refreshToken, logout, revokeToken } from '../controllers/tokenController';
import { verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { basicValidationSchema } from '../schemas/healthSchema';
import { sanitizeInputFields } from '../middleware/validationMiddleware';

const router = Router();

/**
 * @swagger
 * /tokens/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Uses refresh token from cookie to generate new access and refresh tokens
 *     tags: [Token Management]
 *     security:
 *       - refreshCookieAuth: []
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             description: New access and refresh tokens
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Tokens refreshed successfully
 *       401:
 *         description: No refresh token or invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noToken:
 *                 summary: No refresh token provided
 *                 value:
 *                   success: false
 *                   message: No refresh token provided
 *               invalidToken:
 *                 summary: Invalid refresh token
 *                 value:
 *                   success: false
 *                   message: Invalid refresh token
 */
// Refresh token endpoint (no auth required - uses refresh token)
router.post('/refresh', validate(basicValidationSchema), refreshToken);

/**
 * @swagger
 * /tokens/logout:
 *   post:
 *     summary: Logout and revoke all tokens
 *     description: Revokes all refresh tokens for the authenticated user and clears cookies
 *     tags: [Token Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Logged out successfully
 *       500:
 *         description: Logout failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Logout failed
 */
// Logout endpoint (requires valid access token)
router.post('/logout', validate(basicValidationSchema), verifyJWT, logout);

/**
 * @swagger
 * /tokens/revoke:
 *   post:
 *     summary: Revoke specific refresh token
 *     description: Revokes a specific refresh token to invalidate it
 *     tags: [Token Management]
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
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Refresh token to revoke
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Token revoked successfully
 *       400:
 *         description: Token is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Token is required
 *       500:
 *         description: Token revocation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Token revocation failed
 */
// Revoke token endpoint (requires valid access token)
router.post('/revoke', validate(basicValidationSchema), verifyJWT, sanitizeInputFields, revokeToken);

export default router;
