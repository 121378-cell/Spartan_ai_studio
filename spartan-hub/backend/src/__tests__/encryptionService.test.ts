import {
  encryptData,
  decryptData,
  encryptJson,
  decryptJson,
  hashData,
  verifyHash,
  generateRandomString,
  deriveKey
} from '../utils/encryptionService';
import { logger } from '../utils/logger';

describe('Encryption Service', () => {
  const TEST_MASTER_KEY = 'test-master-key-12345-very-secure-key';

  beforeAll(() => {
    logger.info('Starting encryption service tests', { context: 'tests' });
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt string data', () => {
      const plaintext = 'Sensitive user data';
      const encrypted = encryptData(plaintext, TEST_MASTER_KEY);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain(':'); // Format validation

      const decrypted = decryptData(encrypted, TEST_MASTER_KEY);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate different ciphertexts for same plaintext', () => {
      const plaintext = 'Same data';
      const encrypted1 = encryptData(plaintext, TEST_MASTER_KEY);
      const encrypted2 = encryptData(plaintext, TEST_MASTER_KEY);

      expect(encrypted1).not.toBe(encrypted2); // Different due to random IV and salt
    });

    it('should fail decryption with wrong key', () => {
      const plaintext = 'Secret data';
      const encrypted = encryptData(plaintext, TEST_MASTER_KEY);
      const wrongKey = 'wrong-key-different-key';

      expect(() => {
        decryptData(encrypted, wrongKey);
      }).toThrow();
    });

    it('should fail decryption with corrupted data', () => {
      const plaintext = 'Data';
      const encrypted = encryptData(plaintext, TEST_MASTER_KEY);
      const corrupted = `${encrypted.slice(0, -10)  }corrupted`;

      expect(() => {
        decryptData(corrupted, TEST_MASTER_KEY);
      }).toThrow();
    });
  });

  describe('JSON Encryption/Decryption', () => {
    it('should encrypt and decrypt JSON objects', () => {
      const data = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'admin',
        sensitive: {
          apiKey: 'secret-key',
          token: 'jwt-token-xyz'
        }
      };

      const encrypted = encryptJson(data, TEST_MASTER_KEY);
      expect(encrypted).toBeDefined();

      const decrypted = decryptJson(encrypted, TEST_MASTER_KEY);
      expect(decrypted).toEqual(data);
    });

    it('should preserve nested structures', () => {
      const data = {
        user: {
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true,
            settings: {
              privacy: 'private'
            }
          }
        },
        tokens: ['token1', 'token2', 'token3']
      };

      const encrypted = encryptJson(data, TEST_MASTER_KEY);
      const decrypted = decryptJson<typeof data>(encrypted, TEST_MASTER_KEY);

      expect(decrypted.user.preferences.settings.privacy).toBe('private');
      expect(decrypted.tokens.length).toBe(3);
    });
  });

  describe('Hashing', () => {
    it('should hash data consistently', () => {
      const data = 'test data';
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('should verify correct hash', () => {
      const data = 'test data';
      const hash = hashData(data);

      expect(verifyHash(data, hash)).toBe(true);
    });

    it('should fail verification with wrong data', () => {
      const data1 = 'test data';
      const data2 = 'different data';
      const hash = hashData(data1);

      expect(verifyHash(data2, hash)).toBe(false);
    });
  });

  describe('Random String Generation', () => {
    it('should generate random strings of correct length', () => {
      const length = 32;
      const random = generateRandomString(length);

      expect(random).toBeDefined();
      expect(random.length).toBe(length * 2); // Hex encoding doubles length
    });

    it('should generate different random strings', () => {
      const random1 = generateRandomString(32);
      const random2 = generateRandomString(32);

      expect(random1).not.toBe(random2);
    });

    it('should generate valid hex strings', () => {
      const random = generateRandomString(16);
      const hexRegex = /^[0-9a-f]+$/;

      expect(hexRegex.test(random)).toBe(true);
    });
  });

  describe('Key Derivation', () => {
    it('should derive same key with same salt', () => {
      const masterKey = 'test-key';
      
      // Use a fixed salt for deterministic testing
      const fixedSalt = Buffer.from('1234567890123456789012345678901234567890', 'hex');
      
      const result1 = deriveKey(masterKey, fixedSalt);
      const result2 = deriveKey(masterKey, fixedSalt);

      expect(result1.key.toString('hex')).toBe(result2.key.toString('hex'));
    });

    it('should derive different keys with different salts', () => {
      const masterKey = 'test-key';
      
      const result1 = deriveKey(masterKey); // Random salt
      const result2 = deriveKey(masterKey); // Different random salt

      expect(result1.key.toString('hex')).not.toBe(result2.key.toString('hex'));
      expect(result1.salt.toString('hex')).not.toBe(result2.salt.toString('hex'));
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large data encryption', () => {
      const largeData = 'x'.repeat(1000000); // 1MB
      const encrypted = encryptData(largeData, TEST_MASTER_KEY);

      const decrypted = decryptData(encrypted, TEST_MASTER_KEY);
      expect(decrypted).toBe(largeData);
    });

    it('should handle special characters', () => {
      const specialData = `
        Special chars: !@#$%^&*()_+-={}[]|:;<>?,./
        Unicode: 你好世界 🔐 مرحبا
        Line breaks: 
        Tabs: \t\t\t
      `;

      const encrypted = encryptData(specialData, TEST_MASTER_KEY);
      const decrypted = decryptData(encrypted, TEST_MASTER_KEY);

      expect(decrypted).toBe(specialData);
    });
  });

  afterAll(() => {
    logger.info('Encryption service tests completed', { context: 'tests' });
  });
});
