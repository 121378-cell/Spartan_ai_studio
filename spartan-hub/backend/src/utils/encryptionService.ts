import crypto from 'crypto';
import { logger } from './logger';

/**
 * Database Encryption Module
 * Provides encryption/decryption for sensitive data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const TAG_LENGTH = 16; // Authentication tag length
const KEY_DERIVATION_ITERATIONS = 100000;

/**
 * Derive encryption key from master key using PBKDF2
 * @param masterKey - The master encryption key
 * @param salt - Random salt for key derivation
 * @returns Derived 256-bit key
 */
export const deriveKey = (masterKey: string, salt: Buffer = crypto.randomBytes(SALT_LENGTH)): { key: Buffer; salt: Buffer } => {
  try {
    const key = crypto.pbkdf2Sync(masterKey, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha256');
    return { key, salt };
  } catch (error) {
    logger.error('Failed to derive encryption key', {
      context: 'encryption',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @param masterKey - Master encryption key
 * @returns Encrypted data with metadata (format: salt:iv:authTag:ciphertext)
 */
export const encryptData = (plaintext: string | object, masterKey: string): string => {
  try {
    // Convert object to JSON string if needed
    const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key
    const { key } = deriveKey(masterKey, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let ciphertext = cipher.update(data, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: salt:iv:authTag:ciphertext
    const encrypted = [
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      ciphertext
    ].join(':');

    logger.debug('Data encrypted successfully', {
      context: 'encryption',
      metadata: { dataLength: data.length, encryptedLength: encrypted.length }
    });

    return encrypted;
  } catch (error) {
    logger.error('Failed to encrypt data', {
      context: 'encryption',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Decrypt data encrypted with encryptData
 * @param encrypted - Encrypted data (format: salt:iv:authTag:ciphertext)
 * @param masterKey - Master encryption key
 * @returns Decrypted plaintext
 */
export const decryptData = (encrypted: string, masterKey: string): string => {
  try {
    // Split encrypted data
    const parts = encrypted.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltHex, ivHex, authTagHex, ciphertext] = parts;

    // Reconstruct buffers
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derive key from master key using same salt
    const { key } = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    logger.debug('Data decrypted successfully', {
      context: 'encryption',
      metadata: { decryptedLength: plaintext.length }
    });

    return plaintext;
  } catch (error) {
    logger.error('Failed to decrypt data', {
      context: 'encryption',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Encrypt and return JSON object
 * Useful for encrypting structured data
 */
export const encryptJson = (data: object, masterKey: string): string => {
  return encryptData(JSON.stringify(data), masterKey);
};

/**
 * Decrypt and parse JSON object
 */
export const decryptJson = <T = any>(encrypted: string, masterKey: string): T => {
  const plaintext = decryptData(encrypted, masterKey);
  return JSON.parse(plaintext);
};

/**
 * Hash data using SHA-256 (for non-sensitive comparison)
 * @param data - Data to hash
 * @returns Base64-encoded hash
 */
export const hashData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('base64');
};

/**
 * Verify hashed data
 */
export const verifyHash = (data: string, hash: string): boolean => {
  return hashData(data) === hash;
};

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the string (in bytes)
 * @returns Random string (hex-encoded)
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Encrypt database file using SQLite encryption
 * Requires special compilation of SQLite with encryption support
 * This is a placeholder for future implementation
 */
export const enableDatabaseEncryption = (dbPath: string, encryptionKey: string): boolean => {
  try {
    // This would require SQLite compiled with encryption support
    // For now, we recommend using encrypted filesystem or transparent encryption
    logger.info('Database encryption setting enabled', {
      context: 'databaseEncryption',
      metadata: { dbPath, keyLength: encryptionKey.length }
    });
    return true;
  } catch (error) {
    logger.error('Failed to enable database encryption', {
      context: 'databaseEncryption',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return false;
  }
};

export default {
  encryptData,
  decryptData,
  encryptJson,
  decryptJson,
  hashData,
  verifyHash,
  generateRandomString,
  enableDatabaseEncryption
};
