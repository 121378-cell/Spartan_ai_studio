module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Optimización de configuración para reducir falsos positivos
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transformación mejorada
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true, // Mejora el rendimiento
      useESM: true
    }]
  },
  
  // Patrones de exclusión para evitar falsos positivos
  transformIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Patrones de búsqueda de tests
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx)',
    '**/*.test.(ts|tsx)'
  ],
  
  // Mapeo de módulos mejorado
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },
  
  // Setup y teardown mejorado
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.improved.ts'
  ],
  
  // Configuración de cobertura
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Configuración de timeouts específicos
  testTimeout: 10000, // Timeout general de 10 segundos
  
  // Configuración específica para diferentes tipos de tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Configuración de snapshots
  snapshotSerializers: [
    'jest-snapshot-serializer-ansi'
  ],
  
  // Configuración de verbose para mejor depuración
  verbose: true,
  
  // Configuración de forceExit para evitar falsos positivos por procesos colgados
  forceExit: true,
  
  // Configuración de detectOpenHandles para detectar handles abiertos
  detectOpenHandles: true,
  
  // Configuración de maxWorkers para optimizar el rendimiento
  maxWorkers: '50%',
  
  // Configuración de cache para mejorar el rendimiento
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Configuración de clearMocks para limpiar mocks después de cada test
  clearMocks: true,
  restoreMocks: true,
  
  // Configuración de resetMocks para resetear mocks después de cada test
  resetMocks: true,
  
  // Configuración de resetModules para resetear módulos después de cada test
  resetModules: true,
  
  // Configuración de globalSetup y globalTeardown
  globalSetup: '<rootDir>/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.ts',
  
  // Configuración de reporters personalizados
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      suiteName: 'Spartan Hub Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // Configuración de testResultsProcessor
  testResultsProcessor: '<rootDir>/__tests__/testResultsProcessor.js',
  
  // Configuración de watchman para desarrollo
  watchman: true,
  
  // Configuración de haste para mejorar el rendimiento
  haste: {
    computeSha1: true,
    throwOnModuleCollision: false
  }
};