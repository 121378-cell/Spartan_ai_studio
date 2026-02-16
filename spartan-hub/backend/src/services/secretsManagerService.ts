import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from '../utils/logger';

/**
 * AWS Secrets Manager Service
 * Manages secrets securely using AWS Secrets Manager
 * Supports both local development (env vars) and production (AWS)
 */

export interface SecretValue {
  [key: string]: string;
}

export class SecretsManagerService {
  private client: SecretsManagerClient | null = null;
  private useAws: boolean = false;
  private secretsCache: Map<string, { value: SecretValue; timestamp: number }> = new Map();
  private cacheMaxAge: number = 3600000; // 1 hour

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.useAws = process.env.USE_AWS_SECRETS === 'true' && 
                  Boolean(process.env.AWS_ACCESS_KEY_ID) &&
                  Boolean(process.env.AWS_SECRET_ACCESS_KEY);

    if (this.useAws) {
      this.client = new SecretsManagerClient({ region });
      logger.info('AWS Secrets Manager client initialized', {
        context: 'secretsManager',
        metadata: { region }
      });
    } else {
      logger.info('Using local environment variables for secrets', {
        context: 'secretsManager'
      });
    }
  }

  /**
   * Get secret from AWS or environment variables
   */
  async getSecret(secretName: string): Promise<SecretValue> {
    try {
      // Check cache first
      const cached = this.secretsCache.get(secretName);
      if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
        logger.debug('Secret retrieved from cache', {
          context: 'secretsManager',
          metadata: { secretName }
        });
        return cached.value;
      }

      let secret: SecretValue;

      if (this.useAws && this.client) {
        secret = await this.getSecretFromAws(secretName);
      } else {
        secret = this.getSecretFromEnv(secretName);
      }

      // Cache the secret
      this.secretsCache.set(secretName, {
        value: secret,
        timestamp: Date.now()
      });

      return secret;
    } catch (error) {
      logger.error('Failed to retrieve secret', {
        context: 'secretsManager',
        metadata: { secretName, error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get secret from AWS Secrets Manager
   */
  private async getSecretFromAws(secretName: string): Promise<SecretValue> {
    if (!this.client) {
      throw new Error('AWS Secrets Manager client not initialized');
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      let secret: SecretValue;

      if (response.SecretString) {
        secret = JSON.parse(response.SecretString);
      } else if (response.SecretBinary) {
        // Handle binary secrets if needed
        const binaryString = Buffer.from(response.SecretBinary).toString('utf-8');
        secret = JSON.parse(binaryString);
      } else {
        throw new Error('No secret value found');
      }

      logger.debug('Secret retrieved from AWS', {
        context: 'secretsManager',
        metadata: { secretName }
      });

      return secret;
    } catch (error) {
      logger.error('Failed to retrieve secret from AWS', {
        context: 'secretsManager',
        metadata: { secretName, error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get secret from environment variables
   * Format: Secret name mapped to env vars (e.g., DB_PASSWORD for db-secret)
   */
  private getSecretFromEnv(secretName: string): SecretValue {
    const secret: SecretValue = {};

    // Map common secret names to environment variables
    const envMapping: { [key: string]: string[] } = {
      'database-secret': ['DATABASE_URL', 'DB_PASSWORD', 'DB_USER', 'DB_HOST'],
      'jwt-secret': ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
      'api-keys': ['OLLAMA_API_KEY', 'GROQ_API_KEY', 'GOOGLE_FIT_KEY'],
      'encryption-keys': ['DB_ENCRYPTION_KEY', 'JWT_SECRET'],
      'oauth-secret': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    };

    const envVars = envMapping[secretName] || [];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        // Convert env var name to secret key (e.g., DATABASE_URL -> databaseUrl)
        const keyName = envVar
          .split('_')
          .map((part, i) => i === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('');
        secret[keyName] = value;
      }
    }

    if (Object.keys(secret).length === 0) {
      logger.warn('Secret not found in environment variables', {
        context: 'secretsManager',
        metadata: { secretName, envVars }
      });
    }

    return secret;
  }

  /**
   * Create a new secret in AWS Secrets Manager
   */
  async createSecret(secretName: string, secretValue: SecretValue, description?: string): Promise<string> {
    if (!this.useAws || !this.client) {
      logger.warn('Cannot create secret: AWS not enabled', {
        context: 'secretsManager',
        metadata: { secretName }
      });
      return '';
    }

    try {
      const command = new CreateSecretCommand({
        Name: secretName,
        Description: description || `Secret for ${secretName}`,
        SecretString: JSON.stringify(secretValue),
        Tags: [
          { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
          { Key: 'Application', Value: 'spartan-hub' },
          { Key: 'CreatedDate', Value: new Date().toISOString() }
        ]
      });

      const response = await this.client.send(command);

      logger.info('Secret created in AWS Secrets Manager', {
        context: 'secretsManager',
        metadata: { secretName, arn: response.ARN }
      });

      return response.ARN || '';
    } catch (error) {
      logger.error('Failed to create secret in AWS', {
        context: 'secretsManager',
        metadata: { secretName, error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Update an existing secret
   */
  async updateSecret(secretName: string, secretValue: SecretValue): Promise<string> {
    if (!this.useAws || !this.client) {
      logger.warn('Cannot update secret: AWS not enabled', {
        context: 'secretsManager',
        metadata: { secretName }
      });
      return '';
    }

    try {
      const command = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: JSON.stringify(secretValue)
      });

      const response = await this.client.send(command);

      // Invalidate cache
      this.secretsCache.delete(secretName);

      logger.info('Secret updated in AWS Secrets Manager', {
        context: 'secretsManager',
        metadata: { secretName, arn: response.ARN }
      });

      return response.ARN || '';
    } catch (error) {
      logger.error('Failed to update secret in AWS', {
        context: 'secretsManager',
        metadata: { secretName, error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Clear the secrets cache
   */
  clearCache(secretName?: string): void {
    if (secretName) {
      this.secretsCache.delete(secretName);
      logger.debug('Secret cache cleared for specific secret', {
        context: 'secretsManager',
        metadata: { secretName }
      });
    } else {
      this.secretsCache.clear();
      logger.debug('All secrets cache cleared', { context: 'secretsManager' });
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { size: number; secrets: string[] } {
    return {
      size: this.secretsCache.size,
      secrets: Array.from(this.secretsCache.keys())
    };
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    provider: 'aws' | 'environment';
    region?: string;
    cacheSize: number;
    } {
    return {
      enabled: true,
      provider: this.useAws ? 'aws' : 'environment',
      region: this.useAws ? process.env.AWS_REGION : undefined,
      cacheSize: this.secretsCache.size
    };
  }
}

// Create singleton instance
let instance: SecretsManagerService | null = null;

export const getSecretsManager = (): SecretsManagerService => {
  if (!instance) {
    instance = new SecretsManagerService();
  }
  return instance;
};

// Helper functions
export const getSecret = async (secretName: string): Promise<SecretValue> => {
  const manager = getSecretsManager();
  return manager.getSecret(secretName);
};

export const getDatabaseSecret = async (): Promise<any> => {
  const manager = getSecretsManager();
  return manager.getSecret('database-secret');
};

export const getJwtSecret = async (): Promise<string> => {
  const manager = getSecretsManager();
  const secret = await manager.getSecret('jwt-secret');
  return secret.jwtSecret || secret.JWT_SECRET || '';
};

export const getApiKeys = async (): Promise<any> => {
  const manager = getSecretsManager();
  return manager.getSecret('api-keys');
};

export default SecretsManagerService;
