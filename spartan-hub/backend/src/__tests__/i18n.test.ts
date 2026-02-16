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
      
      // We expect validation to fail but with English messages
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('This field is required');
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
      
      // We expect validation to fail but with Spanish messages
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Este campo es obligatorio');
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
      
      // We expect validation to fail but with French messages
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Ce champ est requis');
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
      
      // We expect validation to fail but with Spanish messages due to query param
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Este campo es obligatorio');
    });
  });
});
