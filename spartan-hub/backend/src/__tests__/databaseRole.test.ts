import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { userDb } from '../services/databaseServiceFactory';
import { v4 as uuidv4 } from 'uuid';

describe('Database Role Field Tests', () => {
  // Generate a unique email for testing
  const uniqueEmail = `test.${Date.now()}@example.com`;
  let testUserId: string;

  beforeAll(() => {
    // Setup might be needed if we had a clean database
  });

  afterAll(() => {
    // Cleanup might be needed
  });

  it('should create a user with role field', () => {
    const userData = {
      name: 'Test User',
      email: uniqueEmail,
      password: 'hashedPassword123',
      quest: 'Get fit',
      stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [],
      masterRegulationSettings: {
        targetBedtime: '22:00'
      },
      nutritionSettings: {
        priority: 'performance' as const
      },
      isInAutonomyPhase: false,
      role: 'user'
    };

    const user = userDb.create(userData);
    testUserId = user.id;
    
    console.log('[TEST] User created:', { userId: testUserId, role: user.role, email: user.email });
    console.log('[TEST] Environment:', { dbPath: process.env.DB_PATH });

    expect(user).toBeDefined();
    expect(user.role).toBe('user');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe(uniqueEmail);
  });

  it('should find user by ID with role field', () => {
    console.log('[TEST] Finding user with ID:', testUserId);
    console.log('[TEST] Environment:', { dbPath: process.env.DB_PATH });
    
    const user = userDb.findById(testUserId);
    
    expect(user).toBeDefined();
    expect(user!.role).toBe('user');
  });

  it('should find user by email with role field', () => {
    const user = userDb.findByEmail(uniqueEmail);
    
    expect(user).toBeDefined();
    expect(user!.role).toBe('user');
  });

  it('should update user role', () => {
    const updatedUser = userDb.update(testUserId, { role: 'admin' });
    
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.role).toBe('admin');
  });

  it('should find all users with role fields', () => {
    const users = userDb.findAll();
    
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    
    // Check that at least one user has a role field
    if (users.length > 0) {
      expect(users[0].role).toBeDefined();
    }
  });
});
