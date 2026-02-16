/**
 * Test suite for input sanitization utilities
 */

import { 
  sanitizeInput, 
  sanitizeHtml, 
  validateAndSanitizeString, 
  sanitizeNumericInput,
  sanitizeUrlInput,
  sanitizeEmailInput
} from '../utils/inputSanitizer';

describe('Input Sanitization Utilities', () => {
  describe('sanitizeInput', () => {
    it('should sanitize HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should handle empty strings', () => {
      const sanitized = sanitizeInput('');
      expect(sanitized).toBe('');
    });

    it('should handle non-string inputs gracefully', () => {
      const sanitized = sanitizeInput(null as any);
      expect(sanitized).toBe('');
    });

    it('should sanitize complex XSS attempts', () => {
      const input = '"><script>alert(document.cookie)</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('&quot;&gt;&lt;script&gt;alert(document.cookie)&lt;&#x2F;script&gt;');
    });
  });

  describe('validateAndSanitizeString', () => {
    it('should validate and sanitize valid strings', () => {
      const result = validateAndSanitizeString('Hello World', 1, 100);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('Hello World');
    });

    it('should reject strings shorter than minimum length', () => {
      const result = validateAndSanitizeString('Hi', 5, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be at least 5 characters long');
    });

    it('should reject strings longer than maximum length', () => {
      const result = validateAndSanitizeString('A'.repeat(150), 1, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be no more than 100 characters long');
    });

    it('should reject non-string inputs', () => {
      const result = validateAndSanitizeString(123 as any, 1, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be a string');
    });
  });

  describe('sanitizeNumericInput', () => {
    it('should sanitize valid numeric strings', () => {
      const result = sanitizeNumericInput('123.45');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(123.45);
    });

    it('should validate minimum value', () => {
      const result = sanitizeNumericInput('5', 10, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be at least 10');
    });

    it('should validate maximum value', () => {
      const result = sanitizeNumericInput('150', 10, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be no more than 100');
    });

    it('should reject invalid numeric strings', () => {
      const result = sanitizeNumericInput('not-a-number');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be a valid number');
    });
  });

  describe('sanitizeUrlInput', () => {
    it('should sanitize valid URLs', () => {
      const result = sanitizeUrlInput('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('https://example.com/');
    });

    it('should reject invalid URLs', () => {
      const result = sanitizeUrlInput('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be a valid URL');
    });

    it('should reject non-HTTPS URLs', () => {
      const result = sanitizeUrlInput('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL must use http or https protocol');
    });
  });

  describe('sanitizeEmailInput', () => {
    it('should sanitize valid email addresses', () => {
      const result = sanitizeEmailInput('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });

    it('should reject invalid email addresses', () => {
      const result = sanitizeEmailInput('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be a valid email address');
    });

    it('should sanitize email addresses with XSS attempts', () => {
      const result = sanitizeEmailInput('<script>@example.com');
      expect(result.isValid).toBe(true); // Still valid email format after sanitization
      expect(result.value).toBe('&lt;script&gt;@example.com');
    });
  });
});