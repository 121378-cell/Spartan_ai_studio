import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/errorHandler';
import { SessionModel } from '../models/Session';
import { userDb } from '../services/databaseServiceFactory';
import { logger } from '../utils/logger';
import config from '../config/configService';

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: string;
        id?: string;
        role?: string;
        email?: string;
        name?: string;
      }
    }
  }
}

interface JWTPayload {
  userId: string;
  role: string;
  exp?: number;
}

export const ROLES = {
  USER: 'user',
  REVIEWER: 'reviewer',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Export AuthenticatedRequest interface
export interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    id?: string;
    role?: string;
    email?: string;
    name?: string;
  };
  userId?: string;
  requestId?: string;
}

export const verifyJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // First try to get token from httpOnly cookie
  let token = req.cookies?.auth_token || req.cookies?.access_token;

  // If no cookie token, check Authorization header (for backward compatibility)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.trim().toLowerCase().startsWith('bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }
    // Handle extra whitespace in Authorization header
    token = authHeader.trim().split(/\s+/)[1];
  }

  try {
    // Verify JWT
    const secret = config.get('jwtSecret');
    const algo = config.get('jwtAlgo');

    if (typeof secret !== 'string' || typeof algo !== 'string') {
      throw new Error('JWT configuration not complete');
    }

    const decoded = jwt.verify(token, secret, { algorithms: [algo as jwt.Algorithm] });
    const payload = decoded as JWTPayload;
    logger.debug('JWT verified', {
      context: 'auth',
      metadata: {
        hasUserId: Boolean(payload.userId),
        role: payload.role
      }
    });

    if (!payload.userId || !payload.role) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    // Find session by token
    const session = await SessionModel.findByToken(token);

    // Check if session exists and is active
    if (!session || !session.isActive) {
      res.status(401).json({
        success: false,
        message: 'Session expired'
      });
      return;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Deactivate expired session
      await SessionModel.deactivate(session.id);
      res.status(401).json({
        success: false,
        message: 'Session expired'
      });
      return;
    }

    // Update last activity
    await SessionModel.updateLastActivity(session.id);

    let email: string | undefined;
    try {
      const dbUser = await userDb.findById(payload.userId);
      if (dbUser && typeof dbUser.email === 'string') {
        email = dbUser.email;
      }
    } catch (error) {
      logger.error('Error fetching user during JWT verification', {
        context: 'auth',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
      email
    };

    next();
  } catch (err) {
    // Provide specific error messages for different error types
    let message = 'Invalid or expired token. Please log in again.';

    if (err instanceof Error) {
      if (err.message.includes('invalid signature') || err.message.includes('malformed')) {
        message = 'Access denied';
      } else if (err.message.includes('expired')) {
        message = 'Invalid or expired token. Please log in again.';
      }
    }

    res.status(401).json({
      success: false,
      message
    });
  }
};

export const requireRole = (roles: Role | Role[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
      return;
    }

    const hasRole = allowedRoles.includes(req.user.role as Role);
    if (!hasRole) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.'
      });
      return;
    }

    next();
  };
};

// Export verifyJWT as authenticate for compatibility
export { verifyJWT as authenticate };

// Export authenticate as authenticateToken for compatibility
export { verifyJWT as authenticateToken };

// Export verifyJWT as authMiddleware for compatibility
export { verifyJWT as authMiddleware };
