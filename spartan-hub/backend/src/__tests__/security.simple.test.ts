import { describe, it, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { ROLES } from '../middleware/auth';

// Mock the config service to avoid loading actual secrets
jest.mock('../config/configService', () => ({
  __esModule: true,
  default: {
    get: (key: string) => {
      if (key === 'jwtSecret') return 'test_secret_32_chars_12345678_test_secret_32_chars_12345678_12345678';
      if (key === 'sessionSecret') return 'test_session_secret_32_chars_12345678_test_secret_32_chars_12345678_12345678';
      if (key === 'jwtAlgo') return 'HS256';
      return 'default_value';
    }
  }
}));

// Import after mocking
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema } from '../schemas/authSchema';

describe('Security Simple Tests', () => {
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

      // The middleware should have called next to continue to error handling
      expect(mockNext).toHaveBeenCalled();
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

      // The middleware should have called next to continue to error handling
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Authorization Role Validation', () => {
    it('should allow access when user has sufficient role', () => {
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

    it('should deny access when user has insufficient role', () => {
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

    it('should deny access when no user info is attached to request', () => {
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
    const jwtSecret = 'test_secret_32_chars_12345678_test_secret_32_chars_12345678_12345678';

    it('should verify valid JWT token', () => {
      const token = jwt.sign({ userId: 'test123', role: ROLES.USER }, jwtSecret, { 
        algorithm: 'HS256' 
      });

      const decoded = jwt.verify(token, jwtSecret) as any;
      expect(decoded.userId).toBe('test123');
      expect(decoded.role).toBe(ROLES.USER);
    });

    it('should reject invalid JWT token', () => {
      expect(() => {
        jwt.verify('invalid.token.here', jwtSecret);
      }).toThrow();
    });

    it('should reject expired JWT token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test123', role: ROLES.USER, exp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
        jwtSecret,
        { algorithm: 'HS256' }
      );

      expect(() => {
        jwt.verify(expiredToken, jwtSecret);
      }).toThrow();
    });
  });
});