module.exports = {
  rootDir: '../../',
  preset: 'ts-jest',
  testEnvironment: 'node',
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
    '/node_modules/(?!uuid/.*)'
  ],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)'],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/components/',
    '<rootDir>/src/components/',
    '<rootDir>/src/hooks/__tests__/',
    '<rootDir>/src/services/__tests__/formAnalysisApi.test.ts',
    '<rootDir>/src/services/__tests__/realTimeFeedbackService.test.ts',
    '<rootDir>/src/__tests__/services/poseDetection.test.ts',
    '<rootDir>/src/__tests__/AiChat.test.js',
    '<rootDir>/src/__tests__/AiErrorScreen.test.tsx',
    '<rootDir>/src/__tests__/FormAnalysisModal.test.tsx'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
