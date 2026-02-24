import request from 'supertest';
import jwt from 'jsonwebtoken';
import { e2eManager } from '../e2eTestManager';
import { getJwtSecret } from '../../utils/secrets';

const Database = require('better-sqlite3');
type DatabaseType = any;

describe('AI Services Integration Tests', () => {
  let app: any;
  let db: DatabaseType;
  let authToken: string;

  let enqueueSpy: jest.SpiedFunction<any>;
  let queueStatsSpy: jest.SpiedFunction<any>;
  let healthSpy: jest.SpiedFunction<any>;

  const testUser = {
    id: 'integration-ai-user-1',
    name: 'AI Integration Test User',
    email: 'ai-integration@test.com',
    password: 'aiTestPassword123!',
    role: 'user'
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
        sessionId: 'integration-ai-session-1',
        tokenType: 'access'
      },
      secret || 'test-secret',
      { expiresIn: '1h' }
    );

    await e2eManager.seedUser(testUser);
    await e2eManager.seedSession({
      id: 'integration-ai-session-1',
      userId: testUser.id,
      token: authToken
    });

    db = new Database(e2eManager.getDbPath());

    const queueModule = await import('../../utils/messageQueue');
    enqueueSpy = jest.spyOn(queueModule.aiMessageQueue, 'enqueue');
    queueStatsSpy = jest.spyOn(queueModule.aiMessageQueue, 'getStats');

    const aiServiceModule = await import('../../services/aiService');
    healthSpy = jest.spyOn(aiServiceModule, 'checkAiServiceHealth');
  });

  beforeEach(() => {
    enqueueSpy.mockImplementation(async (type: string) => {
      if (type === 'decision_generation') {
        return {
          Decision: 'Mantener estrategia actual',
          IsAlertaRoja: false,
          NewPartituraSemanal: { score: 78 }
        };
      }

      return {
        alert: 'Carga estable, continuar plan',
        priority: 'medium'
      };
    });

    queueStatsSpy.mockReturnValue({
      queueLength: 0,
      processingCount: 0,
      concurrencyCount: 0,
      maxSize: 100,
      usagePercentage: 0
    });

    healthSpy.mockResolvedValue(true);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    jest.restoreAllMocks();
  });

  test('POST /ai/alert/:userId should return AI alert for an authenticated user', async () => {
    const response = await request(app)
      .post(`/ai/alert/${testUser.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ context: 'missed workouts this week' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.alert).toBeDefined();
    expect(enqueueSpy).toHaveBeenCalledWith('alert_prediction', expect.any(Object));
  });

  test('POST /ai/alert should return AI alert from request body', async () => {
    const response = await request(app)
      .post('/ai/alert')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: testUser.id, context: 'high stress day' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.priority).toBeDefined();
  });

  test('POST /ai/decision/:userId should return structured decision', async () => {
    const response = await request(app)
      .post(`/ai/decision/${testUser.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        PartituraSemanal: { readiness: 75 },
        Causa: 'fatiga moderada',
        PuntajeSinergico: 7.5
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.Decision).toBeDefined();
    expect(enqueueSpy).toHaveBeenCalledWith('decision_generation', expect.any(Object));
  });

  test('GET /ai/health should return AI service health', async () => {
    const response = await request(app)
      .get('/ai/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.aiServiceHealthy).toBe(true);
  });

  test('GET /ai/queue/stats should return queue stats for authenticated user', async () => {
    const response = await request(app)
      .get('/ai/queue/stats')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.queueLength).toBe(0);
  });

  test('POST /ai/config/reload should reload config for authenticated user', async () => {
    const response = await request(app)
      .post('/ai/config/reload')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  test('Protected AI routes should reject unauthenticated requests', async () => {
    const response = await request(app)
      .get('/ai/queue/stats')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  test('POST /ai/decision/:userId should reject invalid payload', async () => {
    const response = await request(app)
      .post(`/ai/decision/${testUser.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ Causa: 'faltan campos requeridos' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});
