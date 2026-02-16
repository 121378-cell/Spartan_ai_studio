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
    '/node_modules/'
  ],
  testMatch: ['<rootDir>/src/__tests__/components/**/*.(test|spec).(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};