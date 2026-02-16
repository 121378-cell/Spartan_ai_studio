import { UserModel, SessionModel } from '../../models';
import { userDb } from '../../services/sqliteDatabaseService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a test user with proper validation
 */
export const createTestUser = async (userData: Partial<any> = {}) => {
  const defaultUserData = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    role: 'user',
    quest: 'Get fit',
    stats: { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
    onboardingCompleted: true,
    keystoneHabits: [],
    masterRegulationSettings: { targetBedtime: '22:00' },
    nutritionSettings: { priority: 'performance' as const },
    isInAutonomyPhase: false,
    ...userData
  };

  try {
    const user = await UserModel.create(defaultUserData);
    return user;
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
};

/**
 * Create a session for an existing user with proper validation
 */
export const createTestSession = async (userId: string, sessionData: Partial<any> = {}) => {
  // Validate that user exists first
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error(`Cannot create session: User with ID ${userId} does not exist`);
  }

  const defaultSessionData = {
    token: `test-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    isActive: true,
    ...sessionData
  };

  try {
    const session = await SessionModel.create({
      userId,
      ...defaultSessionData
    });
    return session;
  } catch (error) {
    console.error('Failed to create test session:', error);
    throw error;
  }
};

/**
 * Create a user and session together with proper relationship validation
 */
export const createTestUserWithSession = async (userData: Partial<any> = {}, sessionData: Partial<any> = {}) => {
  const user = await createTestUser(userData);
  const session = await createTestSession(user.id, sessionData);
  
  return { user, session };
};

/**
 * Clear all test data
 */
export const clearTestData = async () => {
  try {
    userDb.clear();
    await SessionModel.clear();
  } catch (error) {
    console.error('Failed to clear test data:', error);
  }
};

/**
 * Validate user exists and is active
 */
export const validateUserForSession = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} does not exist`);
  }
  return user;
};