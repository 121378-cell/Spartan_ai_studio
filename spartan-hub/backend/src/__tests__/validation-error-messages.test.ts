import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { validate } from '../middleware/validate';
import { z } from 'zod';

describe('Improved Validation Error Messages', () => {
  describe('Error Message Optimization', () => {
    it('should provide clear error responses for string validation', async () => {
      const testSchema = z.object({
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          quest: z.string().min(5)
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq = {
        body: { name: 'J', email: 'invalid-email', quest: 'sh' },
        query: {},
        params: {},
        get: jest.fn(),
        header: jest.fn()
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('body.email: Invalid email'),
          statusCode: 400
        })
      );
    });

    it('should provide clear error responses for numeric validation', async () => {
      const testSchema = z.object({
        body: z.object({
          age: z.number().int().positive(),
          weight: z.number().positive(),
          rating: z.number().min(1).max(10)
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq = {
        body: { age: -5, weight: 0, rating: 15 },
        query: {},
        params: {},
        get: jest.fn(),
        header: jest.fn()
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Too small'),
          statusCode: 400
        })
      );
    });

    it('should provide clear error responses for UUID validation', async () => {
      const testSchema = z.object({
        params: z.object({
          userId: z.string().uuid(),
          routineId: z.string().uuid()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq = {
        body: {},
        query: {},
        params: { userId: 'invalid-uuid', routineId: 'also-invalid' },
        get: jest.fn(),
        header: jest.fn()
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid UUID'),
          statusCode: 400
        })
      );
    });

    it('should provide clear error responses for query parameter validation', async () => {
      const testSchema = z.object({
        query: z.object({
          page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0),
          limit: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0 && val <= 100),
          search: z.string().optional()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq = {
        body: {},
        query: { page: 'invalid', limit: '200', search: '' },
        params: {},
        get: jest.fn(),
        header: jest.fn()
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid'),
          statusCode: 400
        })
      );
    });

    it('should provide clear error responses for array validation', async () => {
      const testSchema = z.object({
        body: z.object({
          tags: z.array(z.string().min(1)),
          numbers: z.array(z.number().positive())
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq = {
        body: { tags: ['valid', '', 'also-valid'], numbers: [1, -2, 3] },
        query: {},
        params: {},
        get: jest.fn(),
        header: jest.fn()
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Too small'),
          statusCode: 400
        })
      );
    });
  });

  describe('Field Name Mapping', () => {
    it('should respond with validation error for invalid UUID fields', async () => {
      const testSchema = z.object({
        body: z.object({
          userId: z.string().uuid(),
          routineId: z.string().uuid(),
          sessionId: z.string().uuid()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq = {
        body: { userId: 'invalid', routineId: 'invalid', sessionId: 'invalid' },
        query: {},
        params: {},
        get: jest.fn(),
        header: jest.fn()
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid UUID'),
          statusCode: 400
        })
      );
    });
  });
});
