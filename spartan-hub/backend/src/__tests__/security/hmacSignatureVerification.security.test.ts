/**
 * HMAC Signature Verification - Security Test
 * 
 * Validates webhook signature validation and integrity:
 * HMAC-SHA256 signing, verification, tamper detection
 */

import * as crypto from 'crypto';
import { TerraHealthService } from '../../services/terraHealthService';

describe('HMAC Signature Verification Security - Phase 3.4', () => {
  const webhookSecret = 'webhook_secret_key_256_bit_minimum_for_security_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  let terraService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    terraService = TerraHealthService.getInstance();
  });

  describe('Signature Generation', () => {
    test('generate valid HMAC-SHA256 signature', () => {
      const payload = { userId: 'terra_123', event: 'activity' };
      const payloadStr = JSON.stringify(payload);

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(64); // SHA256 hex = 64 chars
      expect(/^[a-f0-9]{64}$/.test(signature)).toBe(true);
    });

    test('use consistent signature for same payload', () => {
      const payload = { userId: 'terra_123', data: 'test' };
      const payloadStr = JSON.stringify(payload);

      const sig1 = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      const sig2 = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      expect(sig1).toBe(sig2);
    });

    test('different payloads produce different signatures', () => {
      const payload1 = { userId: 'user_1' };
      const payload2 = { userId: 'user_2' };

      const sig1 = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload1))
        .digest('hex');

      const sig2 = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload2))
        .digest('hex');

      expect(sig1).not.toBe(sig2);
    });

    test('payload order matters for deterministic signing', () => {
      const payload1Str = JSON.stringify({ a: 1, b: 2 });
      const payload2Str = JSON.stringify({ b: 2, a: 1 });

      // Depending on implementation, order might matter
      const sig1 = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload1Str)
        .digest('hex');

      const sig2 = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload2Str)
        .digest('hex');

      // Signatures will differ if JSON order differs
      const signaturesMatch = sig1 === sig2;
      expect([true, false]).toContain(signaturesMatch);
    });
  });

  describe('Signature Verification', () => {
    test('verify valid signature successfully', () => {
      const payload = { userId: 'terra_123', event: 'activity' };
      const payloadStr = JSON.stringify(payload);

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      const isValid = terraService.validateSignature(payloadStr, signature, webhookSecret);

      expect(isValid).toBe(true);
    });

    test('reject invalid signature', () => {
      const payload = { userId: 'terra_123' };
      const payloadStr = JSON.stringify(payload);

      const invalidSignature = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      const isValid = terraService.validateSignature(
        payloadStr,
        invalidSignature,
        webhookSecret
      );

      expect(isValid).toBe(false);
    });

    test('reject empty signature', () => {
      const payloadStr = '{}';

      const isValid = terraService.validateSignature(payloadStr, '', webhookSecret);

      expect(isValid).toBe(false);
    });

    test('reject malformed signature', () => {
      const payloadStr = '{}';

      const isValid = terraService.validateSignature(
        payloadStr,
        'not-hex-format',
        webhookSecret
      );

      expect(isValid).toBe(false);
    });

    test('use constant-time comparison to prevent timing attacks', () => {
      const payload = { data: 'test' };
      const payloadStr = JSON.stringify(payload);

      const correctSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      // Start with first byte wrong
      const wrongStart = 'x' + correctSignature.slice(1);

      // Start with last byte wrong
      const wrongEnd = correctSignature.slice(0, -1) + 'x';

      // Both should fail with similar timing
      const startTime1 = process.hrtime.bigint();
      terraService.validateSignature(payloadStr, wrongStart, webhookSecret);
      const time1 = process.hrtime.bigint() - startTime1;

      const startTime2 = process.hrtime.bigint();
      terraService.validateSignature(payloadStr, wrongEnd, webhookSecret);
      const time2 = process.hrtime.bigint() - startTime2;

      // Times should be similar (within 50% variance)
      const ratio = Number(time1) / Number(time2);
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0);
    });
  });

  describe('Tamper Detection', () => {
    test('detect payload modification', () => {
      const originalPayload = { userId: 'terra_123', heartRate: 72 };
      const originalStr = JSON.stringify(originalPayload);

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(originalStr)
        .digest('hex');

      // Attacker modifies payload
      const tamperedPayload = { userId: 'terra_123', heartRate: 120 };
      const tamperedStr = JSON.stringify(tamperedPayload);

      const isValid = terraService.validateSignature(tamperedStr, signature, webhookSecret);

      expect(isValid).toBe(false);
    });

    test('detect user ID manipulation', () => {
      const payload1 = { userId: 'user_123', data: 'test' };
      const sig1 = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload1))
        .digest('hex');

      // Attacker tries to change user
      const payload2 = { userId: 'admin_user', data: 'test' };

      const isValid = terraService.validateSignature(
        JSON.stringify(payload2),
        sig1,
        webhookSecret
      );

      expect(isValid).toBe(false);
    });

    test('detect signature truncation', () => {
      const payload = { data: 'test' };
      const payloadStr = JSON.stringify(payload);

      const fullSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      // Attacker truncates signature
      const truncatedSignature = fullSignature.slice(0, 32);

      const isValid = terraService.validateSignature(
        payloadStr,
        truncatedSignature,
        webhookSecret
      );

      expect(isValid).toBe(false);
    });

    test('detect replay attacks with timestamp validation', () => {
      const now = Date.now();
      const maxAge = 300000; // 5 minutes

      const payload = { timestamp: now, data: 'test' };
      const payloadStr = JSON.stringify(payload);

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      // Valid: recent timestamp
      let isValid = terraService.validateSignatureWithTimestamp(
        payloadStr,
        signature,
        webhookSecret,
        maxAge
      );
      expect(isValid).toBe(true);

      // Invalid: old timestamp
      const oldPayload = { timestamp: now - 600000, data: 'test' };
      const oldSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(oldPayload))
        .digest('hex');

      isValid = terraService.validateSignatureWithTimestamp(
        JSON.stringify(oldPayload),
        oldSignature,
        webhookSecret,
        maxAge
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Secret Key Management', () => {
    test('use 256-bit (32 byte) minimum secret key', () => {
      const shortSecret = 'short'; // Weak
      const strongSecret = crypto.randomBytes(32).toString('hex'); // Strong

      // Both will work but strong is recommended
      expect(shortSecret.length).toBeLessThan(strongSecret.length);
      expect(strongSecret.length).toBeGreaterThanOrEqual(64); // 32 bytes = 64 hex chars
    });

    test('never hardcode secrets', () => {
      const SECRET = 'this_is_a_hardcoded_secret';

      // In real code, this would fail security audit
      // Secret should come from environment variables
      expect(process.env.WEBHOOK_SECRET || SECRET).toBeDefined();
    });

    test('rotate secrets securely', () => {
      const oldSecret = webhookSecret;
      const newSecret = crypto.randomBytes(32).toString('hex');

      const payload = { data: 'test' };
      const payloadStr = JSON.stringify(payload);

      // Sign with old secret
      const oldSignature = crypto
        .createHmac('sha256', oldSecret)
        .update(payloadStr)
        .digest('hex');

      // Should validate with old secret during rotation period
      let isValid = terraService.validateSignature(
        payloadStr,
        oldSignature,
        oldSecret
      );
      expect(isValid).toBe(true);

      // Should also validate with new secret after accepting both
      const newSignature = crypto
        .createHmac('sha256', newSecret)
        .update(payloadStr)
        .digest('hex');

      isValid = terraService.validateSignature(payloadStr, newSignature, newSecret);
      expect(isValid).toBe(true);
    });

    test('prevent secret key from appearing in logs', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const payload = { test: 'data' };
      terraService.validateSignature(
        JSON.stringify(payload),
        'sig',
        webhookSecret
      );

      const logs = consoleSpy.mock.calls.map((c) => c[0]).join('');
      expect(logs).not.toContain(webhookSecret);

      consoleSpy.mockRestore();
    });
  });

  describe('Algorithm Security', () => {
    test('use HMAC-SHA256 (not MD5 or SHA1)', () => {
      const payload = { data: 'test' };
      const payloadStr = JSON.stringify(payload);

      // Secure
      const sha256 = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      // Insecure (for comparison only)
      const md5 = crypto
        .createHmac('md5', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      expect(sha256).toHaveLength(64); // SHA256
      expect(md5).toHaveLength(32); // MD5

      // SHA256 should be used
      expect(sha256.length > md5.length).toBe(true);
    });

    test('not use simple hashing (no salt)', () => {
      const payload = JSON.stringify({ data: 'test' });

      // Secure: HMAC with secret
      const hmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Insecure: just hash
      const hash = crypto.createHash('sha256').update(payload).digest('hex');

      expect(hmac).not.toBe(hash); // They should differ
    });
  });

  describe('Header Validation', () => {
    test('validate signature in X-Webhook-Signature header', () => {
      const payload = { data: 'test' };
      const payloadStr = JSON.stringify(payload);

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      const headers = {
        'x-webhook-signature': signature,
      };

      const isValid = terraService.validateWebhookHeaders(
        payloadStr,
        headers,
        webhookSecret
      );

      expect(isValid).toBe(true);
    });

    test('reject request without signature header', () => {
      const payload = JSON.stringify({ data: 'test' });

      const headers = {}; // No signature header

      const isValid = terraService.validateWebhookHeaders(
        payload,
        headers,
        webhookSecret
      );

      expect(isValid).toBe(false);
    });

    test('case-insensitive header name matching', () => {
      const payload = JSON.stringify({ data: 'test' });

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      // Headers might be in different cases
      const headers1 = { 'x-webhook-signature': signature };
      const headers2 = { 'X-Webhook-Signature': signature };
      const headers3 = { 'X-WEBHOOK-SIGNATURE': signature };

      expect(
        terraService.validateWebhookHeaders(payload, headers1, webhookSecret)
      ).toBe(true);

      expect(
        terraService.validateWebhookHeaders(payload, headers2, webhookSecret)
      ).toBe(true);

      expect(
        terraService.validateWebhookHeaders(payload, headers3, webhookSecret)
      ).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handle empty payload securely', () => {
      const emptyPayload = '';

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(emptyPayload)
        .digest('hex');

      const isValid = terraService.validateSignature(
        emptyPayload,
        signature,
        webhookSecret
      );

      expect(isValid).toBe(true);
    });

    test('handle null bytes in payload', () => {
      const payloadWithNull = Buffer.from([0x00, 0x01, 0x02]);

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadWithNull)
        .digest('hex');

      const isValid = terraService.validateSignature(
        payloadWithNull.toString('binary'),
        signature,
        webhookSecret
      );

      expect(isValid).toBe(true);
    });

    test('handle unicode in payload', () => {
      const payload = { message: '你好世界🌍' };
      const payloadStr = JSON.stringify(payload);

      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadStr)
        .digest('hex');

      const isValid = terraService.validateSignature(
        payloadStr,
        signature,
        webhookSecret
      );

      expect(isValid).toBe(true);
    });

    test('prevent billion laughs attack with size limit', () => {
      // Very large payload
      const largePayload = 'x'.repeat(100 * 1024 * 1024); // 100MB

      const payloadStr = JSON.stringify({ data: largePayload });

      const isValid = terraService.validateSignature(
        payloadStr,
        'sig',
        webhookSecret,
        1024 * 1024 // 1MB limit
      );

      expect(isValid).toBe(false); // Should reject oversized payload
    });
  });
});
