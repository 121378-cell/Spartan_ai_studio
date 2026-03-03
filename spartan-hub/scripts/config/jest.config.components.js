module.exports = {
  rootDir: '../../',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'scripts/config/tsconfig.test.json'
    }]
  },
  modulePathIgnorePatterns: [
    '<rootDir>/backend/dist/',
    '<rootDir>/backend/coverage/',
    '<rootDir>/backend/data/'
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid)/)'
  ],
  testMatch: [
    '**/hooks/__tests__/**/*.(test|spec).ts',
    '**/__tests__/**/*.(test|spec).(tsx|jsx)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^\\.{2}/\\.{2}/services/coachVitalisClient$': '<rootDir>/src/__mocks__/coachVitalisClient.ts',
    '^\\.{2}/services/coachVitalisClient$': '<rootDir>/src/__mocks__/coachVitalisClient.ts',
    // Mock @mediapipe modules for all tests
    '^@mediapipe/tasks-vision$': '<rootDir>/src/__mocks__/@mediapipe/tasks-vision.ts',
    '^@mediapipe/camera_utils$': '<rootDir>/src/__mocks__/@mediapipe/camera_utils.ts',
    '^@mediapipe/control_utils$': '<rootDir>/src/__mocks__/@mediapipe/control_utils.ts',
    '^@mediapipe/pose$': '<rootDir>/src/__mocks__/@mediapipe/pose.ts',
  },
  // setupFiles runs BEFORE any modules are loaded - injects React.act polyfill
  setupFiles: ['<rootDir>/src/__tests__/setupFiles.js'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
