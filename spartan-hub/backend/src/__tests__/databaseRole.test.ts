import { describe, it, expect, beforeEach } from '@jest/globals';
import { mockUserDb, resetMockDatabase } from '../__mocks__/databaseServiceFactory.mock';

describe('Database Role Field Tests', () => {
  // Generate a unique email for testing
  const uniqueEmail = `test.${Date.now()}@example.com`;
  let testUserId: string;

  beforeEach(() => {
    // Reset mock database before each test
    resetMockDatabase();
  });

  it('should create a user with role field', () => {
    const userData = {
      name: 'Test User',
      email: uniqueEmail,
      password: 'hashedPassword123',
      role: 'user'
    };

    const user = mockUserDb.create(userData);
    testUserId = user.id;

    expect(user).toBeDefined();
    expect(user.role).toBe('user');
    expect(user.name).toBe('Test User');
    expect(user.email).toBe(uniqueEmail);
  });

  it('should find user by ID with role field', () => {
    // First create a user
    const userData = {
      name: 'Test User',
      email: uniqueEmail,
      password: 'hashedPassword123',
      role: 'user'
    };
    const created = mockUserDb.create(userData);
    
    // Then find it
    const user = mockUserDb.findById(created.id);
    
    expect(user).toBeDefined();
    expect(user!.role).toBe('user');
  });

  it('should find user by email with role field', () => {
    // First create a user
    const userData = {
      name: 'Test User',
      email: uniqueEmail,
      password: 'hashedPassword123',
      role: 'user'
    };
    mockUserDb.create(userData);
    
    // Then find by email
    const user = mockUserDb.findByEmail(uniqueEmail);
    
    expect(user).toBeDefined();
    expect(user!.role).toBe('user');
  });

  it('should update user role', () => {
    // First create a user
    const userData = {
      name: 'Test User',
      email: uniqueEmail,
      password: 'hashedPassword123',
      role: 'user'
    };
    const created = mockUserDb.create(userData);
    
    // Then update role
    const updatedUser = mockUserDb.update(created.id, { role: 'admin' });
    
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.role).toBe('admin');
  });

  it('should find all users with role fields', () => {
    // Create multiple users
    mockUserDb.create({
      name: 'User 1',
      email: 'user1@example.com',
      password: 'pass123',
      role: 'user'
    });
    mockUserDb.create({
      name: 'User 2',
      email: 'user2@example.com',
      password: 'pass123',
      role: 'admin'
    });
    
    const users = mockUserDb.findAll();
    
    expect(users).toBeDefined();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(2);
    
    // Check that users have role field
    expect(users[0].role).toBeDefined();
    expect(users[1].role).toBeDefined();
  });
});
