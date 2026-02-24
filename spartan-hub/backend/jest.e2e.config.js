module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/e2e/**/*.+(spec|test).+(ts|tsx|js)'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setupE2E.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      diagnostics: false,
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
  testTimeout: 60000,
  maxWorkers: 1, // Run sequentially to avoid DB locking issues in E2E
  verbose: true
};
