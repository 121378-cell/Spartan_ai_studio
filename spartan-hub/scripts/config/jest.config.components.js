module.exports = {
  rootDir: '../../',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'scripts/config/tsconfig.test.json'
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid)/)'
  ],
  testMatch: ['<rootDir>/src/__tests__/**/*.(test|spec).(tsx|jsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
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