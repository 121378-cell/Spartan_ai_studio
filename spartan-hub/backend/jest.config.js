module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(spec|test).+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  setupFiles: ['<rootDir>/src/__tests__/test-env-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        strict: false,
        noImplicitAny: false,
        strictNullChecks: false,
        strictFunctionTypes: false,
        noImplicitThis: false
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  testTimeout: 30000, // 30 second timeout for tests
  maxWorkers: 2, // Limit concurrent tests to avoid resource conflicts
  
  // Override timeout for E2E and integration tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/**/*.test.ts', '!**/__tests__/e2e/**/*.test.ts', '!**/__tests__/integration/**/*.test.ts', '!**/__tests__/performance/**/*.test.ts'],
      testTimeout: 30000,
    },
    {
      displayName: 'e2e',
      testMatch: ['**/__tests__/e2e/**/*.test.ts'],
      testTimeout: 60000, // 60 seconds for E2E tests
      maxWorkers: 1, // Run E2E tests sequentially
    },
    {
      displayName: 'integration',
      testMatch: ['**/__tests__/integration/**/*.test.ts'],
      testTimeout: 45000, // 45 seconds for integration tests
      maxWorkers: 1,
    },
    {
      displayName: 'performance',
      testMatch: ['**/__tests__/performance/**/*.test.ts'],
      testTimeout: 120000, // 2 minutes for performance tests
      maxWorkers: 1,
    }
  ],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/routes/authRoutes.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/routes/tokenRoutes.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/middleware/auth.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/tokenService.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/controllers/tokenController.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/middleware/security.middleware.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};