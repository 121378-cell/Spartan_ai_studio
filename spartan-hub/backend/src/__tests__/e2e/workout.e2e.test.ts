import request from 'supertest';
import jwt from 'jsonwebtoken';
import { e2eManager } from '../e2eTestManager';
import { getJwtSecret } from '../../utils/secrets';

const Database = require('better-sqlite3');
type DatabaseType = any;

describe('E2E Plan Management', () => {
  let app: any;
  let db: DatabaseType;
  let authToken: string;

  const testUser = {
    id: 'e2e-plan-user-1',
    name: 'Plan Test User',
    email: 'plan-test@example.com',
    password: 'planPassword123!',
    role: 'user'
  };

  const testRoutine = {
    id: 'e2e-routine-1',
    userId: testUser.id,
    name: 'Strength Base',
    focus: 'strength',
    duration: 60,
    objective: 'Build base strength',
    blocks: JSON.stringify([{ day: 1, work: 'Squat + Bench' }])
  };

  const secondaryRoutine = {
    id: 'e2e-routine-2',
    userId: testUser.id,
    name: 'Recovery Day',
    focus: 'recovery',
    duration: 30,
    objective: 'Active recovery',
    blocks: JSON.stringify([{ day: 2, work: 'Mobility' }])
  };

  beforeAll(async () => {
    process.env.DB_PATH = e2eManager.getDbPath();

    const serverModule = await import('../../server');
    app = serverModule.app;

    await e2eManager.cleanDatabase();

    const secret = getJwtSecret();
    authToken = jwt.sign(
      {
        userId: testUser.id,
        role: testUser.role,
        sessionId: 'e2e-plan-session-1',
        tokenType: 'access'
      },
      secret || 'test-secret',
      { expiresIn: '1h' }
    );

    await e2eManager.seedUser(testUser);
    await e2eManager.seedSession({
      id: 'e2e-plan-session-1',
      userId: testUser.id,
      token: authToken
    });

    db = new Database(e2eManager.getDbPath());
    db.prepare(`
      INSERT INTO routines (id, userId, name, focus, duration, objective, blocks, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testRoutine.id,
      testRoutine.userId,
      testRoutine.name,
      testRoutine.focus,
      testRoutine.duration,
      testRoutine.objective,
      testRoutine.blocks,
      new Date().toISOString(),
      new Date().toISOString()
    );

    db.prepare(`
      INSERT INTO routines (id, userId, name, focus, duration, objective, blocks, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      secondaryRoutine.id,
      secondaryRoutine.userId,
      secondaryRoutine.name,
      secondaryRoutine.focus,
      secondaryRoutine.duration,
      secondaryRoutine.objective,
      secondaryRoutine.blocks,
      new Date().toISOString(),
      new Date().toISOString()
    );
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  test('POST /plan/asignar should assign routine to user', async () => {
    const startDate = '2026-02-24';

    const response = await request(app)
      .post('/plan/asignar')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: testUser.id,
        routineId: testRoutine.id,
        startDate
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe(testUser.id);
    expect(response.body.data.routineId).toBe(testRoutine.id);
    expect(response.body.data.startDate).toBe(startDate);
  });

  test('POST /plan/asignar should reject invalid payload', async () => {
    const response = await request(app)
      .post('/plan/asignar')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: testUser.id,
        routineId: testRoutine.id
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('GET /plan/asignar/:userId should return assigned plans', async () => {
    const response = await request(app)
      .get(`/plan/asignar/${testUser.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.some((item: any) => item.routineId === testRoutine.id)).toBe(true);
  });

  test('POST /plan/compromiso should create commitment', async () => {
    const response = await request(app)
      .post('/plan/compromiso')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: testUser.id,
        routineId: testRoutine.id,
        commitmentLevel: 8,
        notes: 'Strong start'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.userId).toBe(testUser.id);
    expect(response.body.data.routineId).toBe(testRoutine.id);
    expect(response.body.data.commitmentLevel).toBe(8);
  });

  test('POST /plan/compromiso should update existing commitment', async () => {
    const response = await request(app)
      .post('/plan/compromiso')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: testUser.id,
        routineId: testRoutine.id,
        commitmentLevel: 6,
        notes: 'Adjusted target'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.commitmentLevel).toBe(6);
    expect(response.body.data.notes).toBe('Adjusted target');
  });

  test('GET /plan/compromiso/:userId/:routineId should return commitment', async () => {
    const response = await request(app)
      .get(`/plan/compromiso/${testUser.id}/${testRoutine.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeTruthy();
    expect(response.body.data.userId).toBe(testUser.id);
    expect(response.body.data.routineId).toBe(testRoutine.id);
  });

  test('GET /plan/compromiso/:userId/:routineId should return null if not tracked', async () => {
    const response = await request(app)
      .get(`/plan/compromiso/${testUser.id}/${secondaryRoutine.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();
  });

  test('Plan endpoints should require authentication', async () => {
    const response = await request(app)
      .post('/plan/asignar')
      .send({
        userId: testUser.id,
        routineId: testRoutine.id,
        startDate: '2026-02-25'
      })
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
