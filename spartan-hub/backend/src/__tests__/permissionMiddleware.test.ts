import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { requirePermission, requireRoleOrHigher, requireAdmin, requireReviewer, requireUser } from '../middleware/permissionMiddleware';
import { ROLES } from '../middleware/auth';

// Mock Express request and response objects
const createMockRequest = (role: string) => ({
  user: {
    userId: 'test-user-id',
    role
  }
});

const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  return res;
};

describe('Permission Middleware Tests', () => {
  let mockReq: any;
  let mockRes: any;
  let next: jest.Mock;

  beforeEach(() => {
    mockRes = createMockResponse();
    next = jest.fn();
  });

  describe('requirePermission', () => {
    it('should call next() for user with required permission', () => {
      mockReq = createMockRequest(ROLES.ADMIN);
      const middleware = requirePermission('manage_users');
      middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for user without required permission', () => {
      mockReq = createMockRequest(ROLES.USER);
      const middleware = requirePermission('manage_users');
      middleware(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You need the \'manage_users\' permission to perform this action.'
      });
    });

    it('should return 401 for unauthenticated user', () => {
      mockReq = { user: null };
      const middleware = requirePermission('read_profile');
      middleware(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please log in to continue.'
      });
    });
  });

  describe('requireRoleOrHigher', () => {
    it('should call next() for user with required role', () => {
      mockReq = createMockRequest(ROLES.ADMIN);
      const middleware = requireRoleOrHigher(ROLES.REVIEWER);
      middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for user with lower role', () => {
      mockReq = createMockRequest(ROLES.USER);
      const middleware = requireRoleOrHigher(ROLES.REVIEWER);
      middleware(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. You need to be at least \'reviewer\' to perform this action.'
      });
    });
  });

  describe('Role-specific middlewares', () => {
    it('should allow admin user for requireAdmin middleware', () => {
      mockReq = createMockRequest(ROLES.ADMIN);
      const middleware = requireAdmin();
      middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
    });

    it('should deny regular user for requireAdmin middleware', () => {
      mockReq = createMockRequest(ROLES.USER);
      const middleware = requireAdmin();
      middleware(mockReq, mockRes, next);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should allow reviewer user for requireReviewer middleware', () => {
      mockReq = createMockRequest(ROLES.REVIEWER);
      const middleware = requireReviewer();
      middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow user for requireUser middleware', () => {
      mockReq = createMockRequest(ROLES.USER);
      const middleware = requireUser();
      middleware(mockReq, mockRes, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
