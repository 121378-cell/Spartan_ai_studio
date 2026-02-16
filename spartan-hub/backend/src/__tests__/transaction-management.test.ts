import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { UserModel, SessionModel } from '../models';
import { createTestUserWithSession, validateUserForSession, clearTestData } from './helpers/testHelpers';

describe('Transaction Management for Foreign Key Constraints', () => {
  beforeEach(async () => {
    // Limpiar datos de prueba
    await clearTestData();
  });

  afterEach(async () => {
    // Limpiar datos de prueba
    await clearTestData();
  });

  describe('User-Session Transaction Operations', () => {
    it('should handle user and session creation in atomic transaction', async () => {
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

      // Crear usuario y sesión en una transacción
      const result = await createTestUserWithSession(userData, sessionData);
      
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(result.session.userId).toBe(result.user.id);
      
      // Verificar que ambos registros existen en la base de datos
      const userFromDb = await UserModel.findById(result.user.id);
      const sessionFromDb = await SessionModel.findById(result.session.id);
      
      expect(userFromDb).toBeDefined();
      expect(sessionFromDb).toBeDefined();
      expect(sessionFromDb?.userId).toBe(userFromDb?.id);
    });

    it('should validate user existence before session creation', async () => {
      const fakeUserId = 'fake-user-id-123';
      
      // Intentar validar usuario que no existe
      await expect(validateUserForSession(fakeUserId)).rejects.toThrow(
        `User with ID ${fakeUserId} does not exist`
      );
    });

    it('should create session only after successful user creation', async () => {
      const userData = {
        name: 'Sequential User',
        email: 'sequential@example.com',
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
        token: 'sequential-token',
        userAgent: 'sequential-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      };

      // Crear usuario primero
      const user = await UserModel.create(userData);
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();

      // Validar que el usuario existe antes de crear la sesión
      await validateUserForSession(user.id);

      // Crear sesión con ID de usuario válido
      const session = await SessionModel.create({
        ...sessionData,
        userId: user.id
      });

      expect(session).toBeDefined();
      expect(session.userId).toBe(user.id);
    });
  });

  describe('Error Handling in Transactions', () => {
    it('should handle session creation failure gracefully', async () => {
      const userData = {
        name: 'Error Test User',
        email: 'error@example.com',
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

      // Crear usuario exitosamente
      const user = await UserModel.create(userData);
      expect(user).toBeDefined();

      // Intentar crear sesión con datos inválidos
      const invalidSessionData = {
        userId: 'non-existent-user-id', // Invalid user ID to trigger foreign key constraint
        token: 'some-token',
        userAgent: 'test-agent',
        ipAddress: 'invalid-ip',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      };

      // La creación de sesión debería fallar
      await expect(SessionModel.create(invalidSessionData)).rejects.toThrow();
    });

    it('should maintain data consistency on partial failures', async () => {
      const userData = {
        name: 'Consistency User',
        email: 'consistency@example.com',
        password: 'password123'
      };

      // Crear usuario
      const user = await UserModel.create({
        ...userData,
        role: 'user',
        quest: 'Get fit',
        stats: { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: true,
        keystoneHabits: [],
        masterRegulationSettings: { targetBedtime: '22:00' },
        nutritionSettings: { priority: 'performance' as const },
        isInAutonomyPhase: false,
        trainingCycle: { phase: 'strength' as const, startDate: new Date().toISOString() }
      });
      expect(user).toBeDefined();

      // Intentar crear múltiples sesiones
      const session1 = await SessionModel.create({
        userId: user.id,
        token: 'token1',
        userAgent: 'agent1',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      });

      const session2 = await SessionModel.create({
        userId: user.id,
        token: 'token2',
        userAgent: 'agent2',
        ipAddress: '127.0.0.2',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      });

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
      expect(session1.userId).toBe(user.id);
      expect(session2.userId).toBe(user.id);

      // Verificar que el usuario sigue existiendo
      const userFromDb = await UserModel.findById(user.id);
      expect(userFromDb).toBeDefined();
    });
  });

  describe('Data Integrity Validation', () => {
    it('should ensure foreign key relationships are valid', async () => {
      // Crear usuario
      const user = await UserModel.create({
        name: 'Integrity User',
        email: 'integrity@example.com',
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
      });

      // Crear sesión con ID de usuario válido
      const session = await SessionModel.create({
        userId: user.id,
        token: 'integrity-token',
        userAgent: 'integrity-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      });

      // Verificar integridad de la relación
      expect(session.userId).toBe(user.id);

      // Verificar que el usuario referenciado existe
      const referencedUser = await UserModel.findById(session.userId);
      expect(referencedUser).toBeDefined();
      expect(referencedUser?.id).toBe(session.userId);
    });

    it('should prevent orphaned sessions', async () => {
      // Crear usuario
      const user = await UserModel.create({
        name: 'Orphan Test User',
        email: 'orphan@example.com',
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
      });

      // Crear sesión
      const session = await SessionModel.create({
        userId: user.id,
        token: 'orphan-token',
        userAgent: 'orphan-agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true
      });

      // Verificar que la sesión tiene un usuario válido
      const userExists = await UserModel.findById(session.userId);
      expect(userExists).toBeDefined();
      expect(userExists?.id).toBe(session.userId);

      // No debería haber sesiones huérfanas
      const allSessions = await SessionModel.findByUserId(session.userId);
      expect(allSessions.length).toBeGreaterThan(0);
    });
  });
});