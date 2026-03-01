/**
 * Mock Database Service Factory for Testing
 * Proporciona mocks aislados para tests unitarios
 */

// Mock user database
let mockUsers = new Map<string, User>();
let userIdCounter = 1;

interface UserData {
  name: string;
  email: string;
  password: string;
  role: string;
  [key: string]: unknown;
}

interface User extends UserData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

class MockUserDb {
  create(userData: UserData): User {
    const id = `user-${userIdCounter++}`;
    const user: User = {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...userData
    };
    mockUsers.set(id, user);
    return user;
  }

  findById(id: string): User | null {
    return mockUsers.get(id) || null;
  }

  findByEmail(email: string): User | null {
    for (const user of mockUsers.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  update(id: string, updates: Partial<UserData>): User | null {
    const user = mockUsers.get(id);
    if (!user) return null;
    
    const updated: User = { 
      ...user, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    mockUsers.set(id, updated);
    return updated;
  }

  findAll(): User[] {
    return Array.from(mockUsers.values());
  }

  delete(id: string): boolean {
    return mockUsers.delete(id);
  }

  clear(): void {
    mockUsers.clear();
    userIdCounter = 1;
  }
}

// Singleton instance
export const mockUserDb = new MockUserDb();

// Reset mocks before each test
export function resetMockDatabase(): void {
  mockUserDb.clear();
}

export default mockUserDb;
