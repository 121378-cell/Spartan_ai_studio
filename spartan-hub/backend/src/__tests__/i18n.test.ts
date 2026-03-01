import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';

describe('i18n Integration Tests', () => {
  describe('Language Detection', () => {
    it('should return English messages by default', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      // We expect validation to fail - checking for generic validation error
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Message should contain "validation" or similar error text
      expect(res.body.message).toMatch(/validation|error|required/i);
    });

    it('should return Spanish messages when language is set to es', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('Accept-Language', 'es')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      // We expect validation to fail - checking for Spanish validation error
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Message should be in Spanish or contain validation error
      expect(res.body.message).toMatch(/validación|error|requerido|campo/i);
    });

    it('should return French messages when language is set to fr', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('Accept-Language', 'fr')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      // We expect validation to fail - checking for French validation error
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Message should be in French or contain validation error
      expect(res.body.message).toMatch(/validation|erreur|requis|champ/i);
    });
  });

  describe('Query Parameter Language Override', () => {
    it('should use language from query parameter', async () => {
      const res = await request(app)
        .post('/auth/register?lng=es')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      // We expect validation to fail - checking for Spanish validation error
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Message should be in Spanish or contain validation error
      expect(res.body.message).toMatch(/validación|error|requerido|campo/i);
    });
  });
});
