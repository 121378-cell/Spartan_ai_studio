import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  getJwtSecret,
  getSessionSecret,
  getDatabasePassword,
  getApiKey,
  getOllamaApiKey
} from '../utils/secrets';

// Load environment variables from .env file
dotenv.config();

export interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;
  corsOrigin: string;

  // Database Configuration
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbPassword?: string;
  dbUrl: string;

  // Redis Configuration
  redisUrl: string;
  redisEnabled: boolean;

  // Security Configuration
  jwtSecret: string;
  jwtAlgo: string;
  sessionSecret: string;

  // Logging Configuration
  logLevel: string;

  // API Keys
  apiNinjasKey?: string;
  edamamAppId?: string;
  edamamAppKey?: string;
  fatsecretKey?: string;
  fatsecretSecret?: string;
  exercisedbKey?: string;

  // Ollama Configuration
  ollamaHost: string;
}

class ConfigService {
  private static instance: ConfigService;
  private config: Config;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): Config {
    const config: Config = {
      // Server Configuration
      port: parseInt(process.env.PORT || '3001', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

      // Database Configuration
      dbHost: process.env.DB_HOST || 'localhost',
      dbPort: parseInt(process.env.DB_PORT || '27017', 10),
      dbName: process.env.DB_NAME || 'spartan_hub',
      dbPassword: process.env.DB_PASSWORD,
      dbUrl: process.env.DB_URL || 'mongodb://localhost:27017',

      // Redis Configuration
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      redisEnabled: process.env.NODE_ENV !== 'test' && Boolean(process.env.REDIS_URL) && process.env.REDIS_URL !== '',

      // Security Configuration
      jwtSecret: getJwtSecret() || '',
      jwtAlgo: process.env.JWT_ALGO || 'HS256',
      sessionSecret: getSessionSecret() || '',

      // Logging Configuration
      logLevel: process.env.LOG_LEVEL || 'info',

      // API Keys
      apiNinjasKey: process.env.API_NINJAS_KEY,
      edamamAppId: process.env.EDAMAM_APP_ID,
      edamamAppKey: process.env.EDAMAM_APP_KEY,
      fatsecretKey: process.env.FATSECRET_KEY,
      fatsecretSecret: process.env.FATSECRET_SECRET,
      exercisedbKey: process.env.EXERCISEDB_KEY,

      // Ollama Configuration
      ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434'
    };

    return config;
  }

  private validateConfig(): void {
    // Only require secrets in production environment
    if (this.config.nodeEnv === 'production') {
      const requiredFields = ['jwtSecret', 'sessionSecret'];
      const missingFields = requiredFields.filter(field => !this.config[field as keyof Config]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
      }
    }

    // Validate JWT secret length if provided
    if (this.config.jwtSecret && this.config.jwtSecret.length > 0) {
      if (this.config.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long for security');
      }
    }

    // Validate session secret length if provided
    if (this.config.sessionSecret && this.config.sessionSecret.length > 0) {
      if (this.config.sessionSecret.length < 32) {
        throw new Error('SESSION_SECRET must be at least 32 characters long for security');
      }
    }

    // Validate port number
    if (isNaN(this.config.port) || this.config.port < 1 || this.config.port > 65535) {
      throw new Error('PORT must be a valid port number between 1 and 65535');
    }
  }

  public getConfig(): Config {
    return this.config;
  }

  public get(key: keyof Config): string | number | boolean | undefined {
    return this.config[key];
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  public isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  // Method to get database connection string with password if provided
  public getDatabaseUrl(): string {
    if (this.config.dbPassword) {
      return `mongodb://${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}`;
    }
    return this.config.dbUrl;
  }
}

// Export singleton instance
export const config = ConfigService.getInstance();
export default config;
