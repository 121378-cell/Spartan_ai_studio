import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { ROLES, requireRole, verifyJWT } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/authSchema';
import config from '../config/configService';

const JWT_SECRET = config.get('jwtSecret');
const JWT_ALGO = config.get('jwtAlgo') || 'HS256';

// Ensure JWT configuration is valid for tests
if (typeof JWT_SECRET !== 'string') {
  throw new Error('JWT_SECRET must be a string for tests');
}
if (typeof JWT_ALGO !== 'string') {
  throw new Error('JWT_ALGO must be a string for tests');
}

describe('Security Unit Tests', () => {
  describe('Input Validation Middleware', () => {
    it('should validate request body with Zod schema', async () => {
      // Test the validation middleware directly
      const mockReq: any = {
        body: { email: 'test@example.com', password: 'password123' },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ email: 'test@example.com', password: 'password123' });
    });

    it('should reject invalid email format in request body', async () => {
      const mockReq: any = {
        body: { email: 'invalid-email', password: 'password123' },
        query: {},
        params: {}
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            message: expect.stringContaining('Invalid email format')
          })
        ])
      });
    });

    it('should reject request with missing required fields', async () => {
      const mockReq: any = {
        body: { email: 'test@example.com' }, // Missing password
        query: {},
        params: {}
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const validationMiddleware = validate(loginSchema);
      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({
            path: 'password',
            message: expect.stringContaining('Required')
          })
        ])
      });
    });
  });

  describe('Authorization Role Validation', () => {
    it('should allow access when user has sufficient role', async () => {
      const mockReq: any = { user: { role: ROLES.ADMIN } };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const roleMiddleware = requireRole([ROLES.USER, ROLES.ADMIN]);
      roleMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should deny access when user has insufficient role', async () => {
      const mockReq: any = { user: { role: ROLES.USER } };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const roleMiddleware = requireRole([ROLES.ADMIN]);
      roleMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when no user info is attached to request', async () => {
      const mockReq: any = { user: null };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const roleMiddleware = requireRole([ROLES.ADMIN]);
      roleMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('JWT Token Validation', () => {
    it('should verify valid JWT token', () => {
      const token = jwt.sign({ userId: 'test123', role: ROLES.USER }, JWT_SECRET, { 
        algorithm: JWT_ALGO as jwt.Algorithm 
      });

      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGO as jwt.Algorithm] }) as { userId: string; role: string; };
      expect(decoded.userId).toBe('test123');
      expect(decoded.role).toBe(ROLES.USER);
    });

    it('should reject invalid JWT token', () => {
      expect(() => {
        jwt.verify('invalid.token.here', JWT_SECRET);
      }).toThrow();
    });

    it('should reject expired JWT token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test123', role: ROLES.USER, exp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
        JWT_SECRET,
        { algorithm: JWT_ALGO as jwt.Algorithm }
      );

      expect(() => {
        jwt.verify(expiredToken, JWT_SECRET);
      }).toThrow();
    });
  });
});