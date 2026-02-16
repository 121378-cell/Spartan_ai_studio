import fs from 'fs';
import { logger } from './logger';

/**
 * Utility functions for secure secret management
 * Handles reading secrets from files with fallback to environment variables
 */

/**
 * Reads a secret value from a file if available, otherwise falls back to environment variable
 * @param secretFileEnvVar Environment variable that specifies the path to the secret file
 * @param fallbackEnvVar Environment variable to use as fallback
 * @param defaultValue Default value to return if neither source is available
 * @returns The secret value or undefined if not found
 */
export function getSecret(
  secretFileEnvVar: string,
  fallbackEnvVar?: string,
  defaultValue?: string
): string | undefined {
  try {
    // First, try to get the path to the secret file from environment
    const secretFilePath = process.env[secretFileEnvVar];
    
    if (secretFilePath && fs.existsSync(secretFilePath)) {
      // Read the secret from the file
      const secretValue = fs.readFileSync(secretFilePath, 'utf8').trim();
      
      if (secretValue) {
        logger.info(`✅ Secret loaded from file: ${secretFileEnvVar}`, {
          context: 'secrets',
          metadata: { secretFile: secretFilePath }
        });
        return secretValue;
      }
    }
    
    // If file is not available or empty, try fallback environment variable
    if (fallbackEnvVar && process.env[fallbackEnvVar]) {
      logger.info(`✅ Secret loaded from environment: ${fallbackEnvVar}`, {
        context: 'secrets',
        metadata: { envVar: fallbackEnvVar }
      });
      return process.env[fallbackEnvVar] as string;
    }
    
    const isProduction = process.env.NODE_ENV === 'production';

    // If no secret file or environment variable, decide based on environment
    if (defaultValue !== undefined) {
      if (isProduction) {
        throw new Error(`Missing required secret ${secretFileEnvVar} / ${fallbackEnvVar} in production`);
      }

      logger.warn('⚠️ Using default value for secret (development only)', {
        context: 'secrets',
        metadata: { source: 'defaultValue' }
      });
      return defaultValue;
    }

    const message = `No secret available for ${secretFileEnvVar}`;
    if (isProduction) {
      throw new Error(message);
    }

    logger.warn(`⚠️ ${message}`, {
      context: 'secrets',
      metadata: {
        secretFileEnvVar,
        fallbackEnvVar,
        hasSecretFile: Boolean(secretFilePath),
        hasFallback: Boolean(fallbackEnvVar && process.env[fallbackEnvVar])
      }
    });

    return undefined;
  } catch (error) {
    logger.error(`❌ Error reading secret: ${secretFileEnvVar}`, {
      context: 'secrets',
      metadata: {
        secretFileEnvVar,
        error: error instanceof Error ? error.message : String(error)
      }
    });
    return undefined;
  }
}

/**
 * Checks if a secret file exists and is accessible
 * @param secretFilePath Path to the secret file
 * @returns Boolean indicating if the file exists and is readable
 */
export function isSecretFileAccessible(secretFilePath: string): boolean {
  try {
    if (!fs.existsSync(secretFilePath)) {
      return false;
    }
    
    // Check if we can read the file
    fs.accessSync(secretFilePath, fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the database password using secure secret management
 * @returns Database password or undefined if not available
 */
export function getDatabasePassword(): string | undefined {
  return getSecret('DB_PASSWORD_FILE', 'POSTGRES_PASSWORD', 'default_password_for_dev');
}

/**
 * Gets the API key using secure secret management
 * @returns API key or undefined if not available
 */
export function getApiKey(): string | undefined {
  return getSecret('API_KEY_FILE', 'API_KEY', 'default_api_key_for_dev');
}

/**
 * Gets the Ollama API key using secure secret management
 * @returns Ollama API key or undefined if not available
 */
export function getOllamaApiKey(): string | undefined {
  return getSecret('OLLAMA_API_KEY_FILE', 'OLLAMA_API_KEY', 'default_ollama_api_key_for_dev');
}

/**
 * Gets the JWT secret using secure secret management
 * @returns JWT secret or undefined if not available
 */
export function getJwtSecret(): string | undefined {
  return getSecret('JWT_SECRET_FILE', 'JWT_SECRET', 'default_jwt_secret_for_dev');
}

/**
 * Gets the session secret using secure secret management
 * @returns Session secret or undefined if not available
 */
export function getSessionSecret(): string | undefined {
  return getSecret('SESSION_SECRET_FILE', 'SESSION_SECRET', 'default_session_secret_for_dev');
}
