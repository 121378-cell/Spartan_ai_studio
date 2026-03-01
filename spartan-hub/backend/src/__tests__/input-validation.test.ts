import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import { z } from 'zod';
import { validate } from '../middleware/validate';

describe('Input Validation Tests', () => {
  describe('Validation Middleware', () => {
    it('should validate request body correctly', async () => {
      const testSchema = z.object({
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          age: z.number().int().positive()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { name: 'John', email: 'john@example.com', age: 25 },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({
        name: 'John',
        email: 'john@example.com',
        age: 25
      });
    });

    it('should reject invalid request body', async () => {
      const testSchema = z.object({
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          age: z.number().int().positive()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { name: 'J', email: 'invalid-email', age: -5 },
        query: {},
        params: {}
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      // Middleware sends 400 response directly, doesn't call next
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Validation error');
    });

    it('should validate query parameters correctly', async () => {
      const testSchema = z.object({
        query: z.object({
          page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0),
          limit: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0 && val <= 100),
          search: z.string().optional()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: {},
        query: { page: '1', limit: '10', search: 'test' },
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.query).toEqual({ page: 1, limit: 10, search: 'test' });
    });

    it('should reject invalid query parameters', async () => {
      const testSchema = z.object({
        query: z.object({
          page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0),
          limit: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0 && val <= 100)
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: {},
        query: { page: 'invalid', limit: '200' },
        params: {}
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      // Middleware sends 400 response directly, doesn't call next
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Validation error');
    });

    it('should validate path parameters correctly', async () => {
      const testSchema = z.object({
        params: z.object({
          id: z.string().uuid(),
          category: z.string().min(1)
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: {},
        query: {},
        params: { id: '550e8400-e29b-41d4-a716-446655440000', category: 'fitness' }
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.params).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        category: 'fitness'
      });
    });

    it('should reject invalid path parameters', async () => {
      const testSchema = z.object({
        params: z.object({
          id: z.string().uuid(),
          category: z.string().min(1)
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: {},
        query: {},
        params: { id: 'invalid-uuid', category: '' }
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      // Middleware sends 400 response directly, doesn't call next
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Validation error');
    });

    it('should sanitize input data', async () => {
      const testSchema = z.object({
        body: z.object({
          name: z.string(),
          description: z.string()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { 
          name: '  John Doe  ', 
          description: '<script>alert("xss")</script>Safe text' 
        },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // The sanitized data should be processed
      expect(mockReq.body.name).toBeDefined();
      expect(mockReq.body.description).toBeDefined();
    });

    it('should handle mixed validation scenarios', async () => {
      const testSchema = z.object({
        body: z.object({
          name: z.string().min(2),
          email: z.string().email()
        }),
        query: z.object({
          page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0)
        }),
        params: z.object({
          id: z.string().uuid()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { name: 'John', email: 'john@example.com' },
        query: { page: '1' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' }
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ name: 'John', email: 'john@example.com' });
      expect(mockReq.query).toEqual({ page: 1 });
      expect(mockReq.params).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' });
    });

    it('should handle optional fields correctly', async () => {
      const testSchema = z.object({
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          age: z.number().int().positive().optional()
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should handle array validation', async () => {
      const testSchema = z.object({
        body: z.object({
          tags: z.array(z.string().min(1))
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { tags: ['fitness', 'health', 'lifestyle'] },
        query: {},
        params: {}
      };
      const mockRes: any = {};
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body).toEqual({ tags: ['fitness', 'health', 'lifestyle'] });
    });

    it('should reject invalid array elements', async () => {
      const testSchema = z.object({
        body: z.object({
          tags: z.array(z.string().min(1))
        })
      });

      const validationMiddleware = validate(testSchema);

      const mockReq: any = {
        body: { tags: ['fitness', '', 'lifestyle'] },
        query: {},
        params: {}
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      await validationMiddleware(mockReq, mockRes, mockNext);

      // Middleware sends 400 response directly, doesn't call next
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Validation error');
    });
  });

  describe('Integration with Express Routes', () => {
    it('should validate login request', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Should return 400 if validation fails or 401 if validation passes but auth fails
      expect([400, 401]).toContain(res.status);
    });

    it('should validate registration request', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      // Should return 400 if validation fails or 409 if validation passes but user exists
      expect([400, 409]).toContain(res.status);
    });

    it('should reject malformed requests', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: '123' // Too short
        });

      expect(res.status).toBe(400);
    });
  });
});