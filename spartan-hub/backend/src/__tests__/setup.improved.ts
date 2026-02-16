import { beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import { testDbManager } from './testDatabaseManager';

// Sistema de mocks mejorado
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockAiService: {
  generateResponse: jest.Mock;
  analyzeData: jest.Mock;
  getRecommendations: jest.Mock;
  isAvailable: jest.Mock;
} = {
  generateResponse: jest.fn(),
  analyzeData: jest.fn(),
  getRecommendations: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true)
};

const mockExternalApis: {
  apiNinjas: {
    getExercise: jest.Mock;
    getNutrition: jest.Mock;
  };
  exerciseDb: {
    getExercise: jest.Mock;
    searchExercises: jest.Mock;
  };
} = {
  apiNinjas: {
    getExercise: jest.fn(),
    getNutrition: jest.fn()
  },
  exerciseDb: {
    getExercise: jest.fn(),
    searchExercises: jest.fn()
  }
};

// Global test setup mejorado
beforeAll(async () => {
  // Configurar entorno de test
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_32_characters_long_minimum_requirement_for_jwt';
  process.env.JWT_ALGO = 'HS256';
  process.env.SESSION_SECRET = 'test_session_secret_32_characters_long_for_sessions';
  process.env.DATABASE_TYPE = 'sqlite';
  process.env.TEST_DATABASE_PATH = ':memory:';
  
  // Desactivar servicios externos
  process.env.REDIS_URL = '';
  process.env.POSTGRES_HOST = '';
  process.env.POSTGRES_PORT = '';
  process.env.POSTGRES_DB = '';
  process.env.POSTGRES_USER = '';
  process.env.POSTGRES_PASSWORD = '';
  process.env.AI_SERVICE_URL = '';
  process.env.API_NINJAS_KEY = '';
  
  // Configurar mocks globales
  jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedis)
  }));
  
  jest.mock('../services/aiService', () => ({
    AiService: jest.fn(() => mockAiService)
  }));
  
  // jest.mock('../services/externalApiService', () => ({
  //   ExternalApiService: jest.fn(() => mockExternalApis)
  // }));
  
  // Configurar base de datos de test
  await testDbManager.setupTestDatabase();
  testDbManager.setTestEnvironment();
  
  // Configurar console para tests
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
});

// Global test cleanup mejorado
afterAll(async () => {
  // Limpiar base de datos de test
  await testDbManager.cleanupTestDatabase();
  testDbManager.restoreOriginalEnvironment();
  
  // Restaurar mocks
  jest.restoreAllMocks();
  
  // Limpiar variables de entorno
  delete process.env.NODE_ENV;
  delete process.env.JWT_SECRET;
  delete process.env.JWT_ALGO;
  delete process.env.SESSION_SECRET;
  delete process.env.DATABASE_TYPE;
  delete process.env.TEST_DATABASE_PATH;
  delete process.env.REDIS_URL;
  delete process.env.POSTGRES_HOST;
  delete process.env.POSTGRES_PORT;
  delete process.env.POSTGRES_DB;
  delete process.env.POSTGRES_USER;
  delete process.env.POSTGRES_PASSWORD;
  delete process.env.AI_SERVICE_URL;
  delete process.env.API_NINJAS_KEY;
});

// Setup mejorado para cada test
beforeEach(() => {
  // Resetear todos los mocks
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  
  // Configurar variables de entorno para cada test
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_32_characters_long_minimum_requirement_for_jwt';
  process.env.JWT_ALGO = 'HS256';
  process.env.SESSION_SECRET = 'test_session_secret_32_characters_long_for_sessions';
  process.env.DATABASE_TYPE = 'sqlite';
  process.env.TEST_DATABASE_PATH = ':memory:';
  
  // Configurar mocks específicos para cada test
  (mockRedis.get as any).mockResolvedValue(null);
  (mockRedis.set as any).mockResolvedValue('OK');
  (mockRedis.del as any).mockResolvedValue(1);
  (mockRedis.exists as any).mockResolvedValue(0);
  (mockRedis.expire as any).mockResolvedValue(1);
  (mockRedis.flushall as any).mockResolvedValue('OK');
  (mockRedis.connect as any).mockResolvedValue(undefined);
  (mockRedis.disconnect as any).mockResolvedValue(undefined);
  
  (mockAiService.generateResponse as any).mockResolvedValue('Test response');
  (mockAiService.analyzeData as any).mockResolvedValue({ analysis: 'test' });
  (mockAiService.getRecommendations as any).mockResolvedValue(['recommendation1']);
  (mockAiService.isAvailable as any).mockReturnValue(true);
  
  // (mockExternalApis.apiNinjas.getExercise as any).mockResolvedValue({ exercise: 'test' });
  // (mockExternalApis.apiNinjas.getNutrition as any).mockResolvedValue({ nutrition: 'test' });
  // (mockExternalApis.exerciseDb.getExercise as any).mockResolvedValue({ exercise: 'test' });
  // (mockExternalApis.exerciseDb.searchExercises as any).mockResolvedValue([{ exercise: 'test' }]);
  
  // Limpiar datos de test
  try {
    const { userDb } = require('../services/databaseServiceFactory');
    if (userDb && typeof userDb.clear === 'function') {
      userDb.clear();
    }
  } catch (error) {
    // Ignorar errores si el servicio de base de datos no está disponible
  }
});

// Teardown mejorado para cada test
afterEach(async () => {
  // Limpiar datos persistentes
  try {
    const { initializeDatabase } = require('../config/database');
    const db = initializeDatabase();
    
    // Desactivar claves foráneas temporalmente para la limpieza si es SQLite
    if (process.env.DATABASE_TYPE === 'sqlite' || !process.env.DATABASE_TYPE) {
      db.prepare('PRAGMA foreign_keys = OFF').run();
    }

    const { userDb, routineDb, exerciseDb, planAssignmentDb, commitmentDb } = 
      require('../services/sqliteDatabaseService');
    
    if (userDb && typeof userDb.clear === 'function') {
      await userDb.clear();
    }
    if (routineDb && typeof routineDb.clear === 'function') {
      await routineDb.clear();
    }
    if (exerciseDb && typeof exerciseDb.clear === 'function') {
      await exerciseDb.clear();
    }
    if (planAssignmentDb && typeof planAssignmentDb.clear === 'function') {
      await planAssignmentDb.clear();
    }
    if (commitmentDb && typeof commitmentDb.clear === 'function') {
      await commitmentDb.clear();
    }

    // Reactivar claves foráneas
    if (process.env.DATABASE_TYPE === 'sqlite' || !process.env.DATABASE_TYPE) {
      db.prepare('PRAGMA foreign_keys = ON').run();
    }
  } catch (error) {
    // Ignorar errores si los servicios de base de datos no están disponibles
  }
  
  // Verificar que no haya handles abiertos
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Limpiar timers
  jest.clearAllTimers();
  
  // Restaurar módulos
  jest.resetModules();
});

// Configuración de timeouts específicos para diferentes tipos de tests
const testTimeouts = {
  unit: 5000,
  integration: 10000,
  load: 30000,
  security: 60000
};

// Función para configurar timeout según el tipo de test
export const setTestTimeout = (type: keyof typeof testTimeouts = 'unit') => {
  jest.setTimeout(testTimeouts[type]);
};

// Exportar mocks para usar en tests específicos
export {
  mockRedis,
  mockAiService,
  mockExternalApis
};