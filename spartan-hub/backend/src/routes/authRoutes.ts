import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import jwt from 'jsonwebtoken';
import { userDb } from '../services/databaseServiceFactory';
import { ROLES, verifyJWT } from '../middleware/auth';
import { hashPassword, comparePasswords, validatePasswordStrength } from '../utils/passwordUtils';
import { v4 as uuidv4 } from 'uuid';
import { createSession, destroySession, destroyAllUserSessions } from '../middleware/sessionMiddleware';
import { translate } from '../utils/i18nHelpers';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, updateRoleSchema } from '../schemas/authSchema';
import { sanitizeInputFields } from '../middleware/validationMiddleware';
import { basicValidationSchema } from '../schemas/healthSchema';
import config from '../config/configService';
import { tokenService } from '../services/tokenService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

const router = Router();

const JWT_SECRET = config.get('jwtSecret');
const JWT_ALGO = config.get('jwtAlgo') || 'HS256';

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email and password, automatically logs them in, and returns JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (must be unique)
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: User's password (min 8 characters, must include uppercase, lowercase, number)
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *         headers:
 *           Set-Cookie:
 *             description: Access and refresh tokens set as httpOnly cookies
 *             schema:
 *               type: string
 *               example: access_token=eyJhbGc...; Path=/; HttpOnly; Secure; SameSite=Strict
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
 *                   example: Registration successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Email already exists. Please use a different email or login.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Registration endpoint
router.post('/register', validate(registerSchema), sanitizeInputFields, async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await userDb.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: translate(req, 'emailAlreadyExists')
      });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create user object with default values
    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'user', // Default role for new users
      quest: '',
      stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: false,
      keystoneHabits: [] as string[],
      masterRegulationSettings: {
        targetBedtime: '22:00'
      },
      nutritionSettings: {
        priority: 'performance'
      },
      isInAutonomyPhase: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save user to database
    const savedUser = await userDb.create(newUser);

    // Generate session ID
    const sessionId = uuidv4();

    // Generate token pair
    const tokenPair = await tokenService.generateTokenPair(savedUser.id, savedUser.role || ROLES.USER, sessionId);

    // Create session with matching ID and real access token
    await createSession(savedUser.id, tokenPair.accessToken, req, sessionId);

    // Set secure cookies
    tokenService.setSecureCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

    // Return user info (without sensitive data)
    return res.status(201).json({
      success: true,
      message: translate(req, 'registerSuccess'),
      user: {
        userId: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role || ROLES.USER
      }
    });
  } catch (error) {
    logger.error('Registration error', {
      context: 'auth',
      metadata: { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }
    });
    // Handle specific errors
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: translate(req, 'serverError')
    });
  }
});

// Login endpoint - creates JWT and sets httpOnly cookie
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await userDb.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: translate(req, 'invalidCredentials')
      });
    }

    // Verify password
    const isPasswordValid = await comparePasswords(password, user.password!);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: translate(req, 'invalidCredentials')
      });
    }

    // Generate session ID
    const sessionId = uuidv4();

    // Generate token pair
    const tokenPair = await tokenService.generateTokenPair(user.id, user.role || ROLES.USER, sessionId);

    // Create session with matching ID and real access token
    await createSession(user.id, tokenPair.accessToken, req, sessionId);

    // Set secure cookies
    tokenService.setSecureCookies(res, tokenPair.accessToken, tokenPair.refreshToken);

    // Return user info (without sensitive data)
    return res.status(200).json({
      success: true,
      message: translate(req, 'loginSuccess'),
      user: {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role || ROLES.USER
      }
    });
  } catch (error) {
    logger.error('Login error', {
      context: 'auth',
      metadata: { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }
    });
    // Handle specific errors
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: translate(req, 'serverError')
    });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Destroys current session and clears authentication cookies
 *     tags: [Authentication]
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
 *         $ref: '#/components/responses/ServerError'
 */
// Logout endpoint - clears the cookie and destroys session
router.post('/logout', verifyJWT, validate(basicValidationSchema), async (req: Request, res: Response) => {
  await destroySession(req, res);
  return res.status(200).json({
    success: true,
    message: translate(req, 'logoutSuccess')
  });
});

// Logout all sessions endpoint - destroys all user sessions
router.post('/logout-all', verifyJWT, validate(basicValidationSchema), async (req: AuthenticatedRequest, res: Response) => {
  const {user} = req;
  if (user && user.userId) {
    await destroyAllUserSessions(user.userId);
  }

  res.clearCookie('auth_token');
  return res.status(200).json({
    success: true,
    message: translate(req, 'logoutAllSuccess')
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information
 *     tags: [User Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// Get current user info
router.get('/me', verifyJWT, validate(basicValidationSchema), (req: AuthenticatedRequest, res: Response) => {
  // This will use auth middleware to get user from cookie
  const { user } = req;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: translate(req, 'unauthorized')
    });
  }

  return res.status(200).json({
    success: true,
    user
  });
});

/**
 * @swagger
 * /auth/sessions:
 *   get:
 *     summary: Get user's active sessions
 *     description: Returns a list of all active sessions for the authenticated user
 *     tags: [User Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 sessions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Get active sessions
router.get('/sessions', verifyJWT, validate(basicValidationSchema), async (req: AuthenticatedRequest, res: Response) => {
  const { user } = req;
  if (!user) {
    return res.status(401).json({
      success: false,
      message: translate(req, 'unauthorized')
    });
  }

  try {
    const sessions = await userDb.findSessionsByUserId(user.userId as string);
    return res.status(200).json({
      success: true,
      sessions: sessions.map((session: { id: string; userAgent?: string; ipAddress?: string; createdAt: Date; lastActivityAt: Date; isActive: boolean }) => ({

        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt.toISOString(),
        lastActivityAt: session.lastActivityAt.toISOString(),
        isActive: session.isActive
      }))
    });
  } catch (error) {
    logger.error('Error fetching sessions', {
      context: 'auth',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    // Handle specific errors
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: translate(req, 'serverError')
    });
  }
});

/**
 * @swagger
 * /auth/users/{userId}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     description: Updates the role of a specific user. Requires admin privileges.
 *     tags: [User Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, reviewer, admin, moderator]
 *                 example: reviewer
 *     responses:
 *       200:
 *         description: Role updated successfully
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
 *                   example: User role updated successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: User not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Update user role (admin only)
router.put('/users/:userId/role', verifyJWT, validate(updateRoleSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const { user: requestingUser } = req;

    // Check if requesting user is admin
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: translate(req, 'insufficientPermissions')
      });
    }

    // Find user to update
    const userToUpdate = await userDb.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: translate(req, 'userNotFound')
      });
    }

    // Update user role
    const updatedUser = await userDb.update(userId, { role });

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: translate(req, 'updateUserFailed')
      });
    }

    return res.status(200).json({
      success: true,
      message: translate(req, 'userRoleUpdated'),
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    logger.error('Error updating user role', {
      context: 'auth',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    // Handle specific errors
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: translate(req, 'serverError')
    });
  }
});

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     description: Returns a list of all registered users. Requires admin privileges.
 *     tags: [User Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Get all users (admin only)
router.get('/users', verifyJWT, validate(basicValidationSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestingUser = req.user;

    // Check if requesting user is admin
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: translate(req, 'insufficientPermissions')
      });
    }

    // Get all users
    const users = await userDb.findAll();

    return res.status(200).json({
      success: true,
      users: users.map((user: { id: string; name: string; email: string; role: string; createdAt: Date; updatedAt: Date }) => ({

        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    logger.error('Error fetching users', {
      context: 'auth',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    // Handle specific errors
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: translate(req, 'serverError')
    });
  }
});

export default router;
