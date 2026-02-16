import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
import { app } from '../../server';

describe('E2E Session Persistence', () => {
  const testUser = {
    id: 'e2e-user-1',
    name: 'E2E User',
    email: 'e2e@example.com',
    password: 'password123',
    role: 'user'
  };

  const testSession = {
    id: 'e2e-session-1',
    userId: testUser.id,
    token: 'persistent-token-123'
  };

  beforeAll(async () => {
    // Ensure fresh start for this suite
    await e2eManager.cleanDatabase();
    await e2eManager.seedUser(testUser);
  });

  test('Step 1: Create Session (Seed)', async () => {
    await e2eManager.seedSession(testSession);
    
    // Verify it exists in DB directly
    const dbPath = e2eManager.getDbPath();
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(testSession.token);
    expect(session).toBeDefined();
    expect(session.userId).toBe(testUser.id);
    db.close();
  });

  test('Step 2: Verify Session Persistence', async () => {
    // This runs after Step 1. In standard unit tests with cleanup, this would fail if data was wiped.
    // Here we expect it to persist.
    
    const dbPath = e2eManager.getDbPath();
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(testSession.token);
    
    expect(session).toBeDefined();
    expect(session.isActive).toBeTruthy(); // Should be 1 (true)
    db.close();
  });

  // If we had the app instance, we could also test via API
  // test('Step 3: Verify via API', async () => {
  //   const res = await request(app)
  //     .get('/api/protected-route')
  //     .set('Authorization', `Bearer ${testSession.token}`);
  //   expect(res.status).not.toBe(401);
  // });
});
