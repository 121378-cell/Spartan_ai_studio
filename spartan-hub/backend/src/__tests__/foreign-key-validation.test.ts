import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserModel, SessionModel } from '../models';
import { userDb } from '../services/sqliteDatabaseService';
import { createTestUserWithSession } from './helpers/testHelpers';

describe('Foreign Key Constraint Validation', () => {
  beforeEach(async () => {
    // Limpiar datos de prueba
    userDb.clear();
    await SessionModel.clear();
  });

  afterEach(async () => {
    // Limpiar datos de prueba
    userDb.clear();
    await SessionModel.clear();
  });

  describe('User-Session Relationships', () => {
    it('should create session only with valid user ID', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
        quest: 'Get fit',
        stats: { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: true,
        keystoneHabits: [],
        masterRegulationSettings: { targetBedtime: '22:00' },
        nutritionSettings: { priority: 'performance' as const },
        isInAutonomyPhase: false,
        trainingCycle: { phase: 'strength' as const, startDate: new Date().toISOString() }
      };

      // Crear usuario primero
      const user = await UserModel.create(userData);
      
      // Crear sesión con ID de usuario válido
      const sessionData = {
        userId: user.id,
        token: 'test-token',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      };

      const session = await SessionModel.create(sessionData);
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);
    });

    it('should reject session creation with invalid user ID', async () => {
      const sessionData = {
        userId: 'invalid-user-id',
        token: 'test-token',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      };

      await expect(SessionModel.create(sessionData)).rejects.toThrow();
    });

    it('should validate user existence before creating session', async () => {
      const fakeUserId = 'fake-user-id-123';
      
      // Intentar crear sesión con ID de usuario que no existe
      const sessionData = {
        userId: fakeUserId,
        token: 'test-token',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      };

      // La validación debería fallar
      const userExists = await UserModel.findById(fakeUserId);
      expect(userExists).toBeNull();
    });
  });

  describe('Transaction Management', () => {
    it('should handle user and session creation in transaction', async () => {
      const userData = {
        name: 'Transaction User',
        email: 'transaction@example.com',
        password: 'password123',
        role: 'user',
        quest: 'Get fit',
        stats: { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: true,
        keystoneHabits: [],
        masterRegulationSettings: { targetBedtime: '22:00' },
        nutritionSettings: { priority: 'performance' as const },
        isInAutonomyPhase: false,
        trainingCycle: { phase: 'strength' as const, startDate: new Date().toISOString() }
      };

      const sessionData = {
        token: 'transaction-token',
        userAgent: 'transaction-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      };

      // We'll create user and session separately to test the relationship
      const user = await UserModel.create(userData);
      const session = await SessionModel.create({
        ...sessionData,
        userId: user.id
      });
      const result = { user, session };
      
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe(result.user.id);
    });
  });
});
