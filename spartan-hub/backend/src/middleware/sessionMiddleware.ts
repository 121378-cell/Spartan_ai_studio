import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SessionModel } from '../models/Session';
import config from '../config/configService';
import { logger } from '../utils/logger';

// Extend the Request interface to include session property
declare global {
  namespace Express {
    interface Request {
      session?: {
        id: string;
        userId: string;
        token: string;
      };
    }
  }
}

interface JWTPayload {
  userId: string;
  role: string;
  exp?: number;
  sessionId?: string;
}

const JWT_SECRET = config.get('jwtSecret');
const JWT_ALGO = config.get('jwtAlgo') || 'HS256';

export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from cookie (support both access_token and legacy auth_token)
    const token = req.cookies?.access_token || req.cookies?.auth_token;

    if (!token) {
      return next();
    }

    // Verify JWT
    if (typeof JWT_SECRET !== 'string') {
      throw new Error('JWT secret not configured');
    }
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as JWTPayload;

    // Find session by token
    const session = await SessionModel.findByToken(token);

    // Check if session exists and is active
    if (!session || !session.isActive) {
      // Clear invalid token cookie
      res.clearCookie('access_token');
      res.clearCookie('auth_token');
      return next();
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Deactivate expired session
      await SessionModel.deactivate(session.id);
      // Clear expired token cookie
      res.clearCookie('access_token');
      res.clearCookie('auth_token');
      return next();
    }

    // Update last activity
    await SessionModel.updateLastActivity(session.id);

    // Add session info to request
    req.session = {
      id: session.id,
      userId: session.userId,
      token: session.token
    };

    next();
  } catch (error) {
    // If JWT verification fails, clear the cookie
    res.clearCookie('access_token');
    res.clearCookie('auth_token');
    next();
  }
};

// Middleware to require active session
export const requireActiveSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.session) {
    res.status(401).json({
      success: false,
      message: 'Active session required. Please log in.'
    });
    return;
  }

  next();
};

// Function to create a new session
export const createSession = async (userId: string, token: string, req: Request, sessionId?: string): Promise<void> => {
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

  const sessionData = {
    id: sessionId,
    userId,
    token,
    userAgent,
    ipAddress,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    isActive: true
  };

  await SessionModel.create(sessionData);
};

// Function to destroy session
export const destroySession = async (req: Request, res: Response): Promise<void> => {
  if (req.session) {
    await SessionModel.deactivate(req.session.id);
  }

  // Clear cookie
  res.clearCookie('access_token');
  res.clearCookie('auth_token');
};

// Function to destroy all user sessions
export const destroyAllUserSessions = async (userId: string): Promise<void> => {
  await SessionModel.deactivateAllUserSessions(userId);
};

// Cleanup expired sessions periodically
export const cleanupExpiredSessions = async (): Promise<void> => {
  try {
    await SessionModel.cleanupExpiredSessions();
  } catch (error) {
    logger.error('Error during expired session cleanup', { context: 'session', metadata: { error } });
  }
};

// Schedule periodic cleanup using cron
import { CronJob } from 'cron';

const cleanupJob = new CronJob('0 0 * * *', async () => {
  await SessionModel.cleanupExpiredSessions();
});

if (process.env.NODE_ENV !== 'test') {
  cleanupJob.start();
}
