/**
 * Mock Auth Middleware for Testing
 * Proporciona autenticación simulada para tests de rutas
 */

import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

export interface MockUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export const mockAuthenticatedUser: MockUser = {
  id: 'user-test-123',
  email: 'test@example.com',
  role: 'user',
  name: 'Test User'
};

/**
 * Mock auth middleware that simulates authenticated requests
 */
export const mockAuthMiddleware = jest.fn((req: Request, res: Response, next: NextFunction) => {
  // Check if Authorization header is present
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const token = authHeader.substring(7);
  
  // Validate token format (mock validation)
  if (token === 'valid-token' || token.startsWith('valid')) {
    // Add user to request
    (req as any).user = { ...mockAuthenticatedUser };
    (req as any).userId = mockAuthenticatedUser.id;
    return next();
  }
  
  // Invalid token
  return res.status(401).json({ 
    success: false, 
    message: 'Invalid token' 
  });
});

/**
 * Mock optional auth middleware
 */
export const mockOptionalAuthMiddleware = jest.fn((req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === 'valid-token' || token.startsWith('valid')) {
      (req as any).user = { ...mockAuthenticatedUser };
      (req as any).userId = mockAuthenticatedUser.id;
    }
  }
  
  return next();
});

/**
 * Setup function to replace auth middleware in tests
 */
export function setupMockAuth(): void {
  jest.mock('../middleware/auth', () => ({
    authMiddleware: mockAuthMiddleware,
    optionalAuthMiddleware: mockOptionalAuthMiddleware
  }));
}

/**
 * Reset auth mocks
 */
export function resetMockAuth(): void {
  mockAuthMiddleware.mockClear();
  mockOptionalAuthMiddleware.mockClear();
}

export default {
  mockAuthMiddleware,
  mockOptionalAuthMiddleware,
  mockAuthenticatedUser,
  setupMockAuth,
  resetMockAuth
};
