/**
 * Type definitions for Jest mocks used in tests
 */

declare module 'redis' {
  export interface RedisClientType {
    get: jest.Mock<Promise<string | null>, [string]>;
    set: jest.Mock<Promise<string>, [string, string, ...(string | number | Buffer)[]]>;
    del: jest.Mock<Promise<number>, [string | string[]]>;
    exists: jest.Mock<Promise<number>, [string | string[]]>;
    expire: jest.Mock<Promise<number>, [string, number]>;
    flushall: jest.Mock<Promise<string>, []>;
    connect: jest.Mock<Promise<void>, []>;
    disconnect: jest.Mock<Promise<void>, []>;
  }

  export function createClient(options?: any): RedisClientType;
}

// Define proper types for test setup mocks
declare global {
  // Define the mockRedis type
  const mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
    expire: jest.Mock;
    flushall: jest.Mock;
    connect: jest.Mock;
    disconnect: jest.Mock;
  };

  // Define the mockAiService type
  const mockAiService: {
    generateResponse: jest.Mock;
    analyzeData: jest.Mock;
    getRecommendations: jest.Mock;
    isAvailable: jest.Mock;
  };

  // Define the mockExternalApis type
  const mockExternalApis: {
    apiNinjas: {
      getExercise: jest.Mock;
      getNutrition: jest.Mock;
    };
    exerciseDb: {
      getExercise: jest.Mock;
      searchExercises: jest.Mock;
    };
  };
}

export {};