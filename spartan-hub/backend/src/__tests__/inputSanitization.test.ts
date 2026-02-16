/**
 * Input Sanitization Tests
 * Comprehensive tests to validate XSS prevention and input sanitization
 */

import { sanitizePlainText, sanitizeLimitedHtml, sanitizeRichText } from '../utils/sanitization';

describe('Input Sanitization Security Tests', () => {
  describe('Plain Text Sanitization', () => {
    test('should remove script tags completely', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizePlainText(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('Hello World');
    });

    test('should handle various attack vectors', () => {
      const attackVectors = [
        '<img src=x onerror=alert(1)>',
        'javascript:alert(document.cookie)',
        '<svg onload=alert(1)>',
        '"><script>alert(1)</script>',
        'onmouseover="alert(1)"'
      ];

      attackVectors.forEach(vector => {
        const sanitized = sanitizePlainText(vector);
        expect(sanitized).not.toMatch(/<script|javascript:|on\w+=|<svg/i);
      });
    });
  });

  describe('Limited HTML Sanitization', () => {
    test('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const sanitized = sanitizeLimitedHtml(input);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('</p>');
      expect(sanitized).toContain('</strong>');
    });

    test('should remove dangerous HTML tags', () => {
      const input = '<p>Hello <script>alert(1)</script> <img src=x onerror=alert(1)></p>';
      const sanitized = sanitizeLimitedHtml(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).toContain('<p>Hello  </p>');
    });
  });

  describe('Rich Text Sanitization', () => {
    test('should allow extended safe HTML tags', () => {
      const input = '<h1>Title</h1><p>Paragraph with <em>emphasis</em></p><ul><li>Item</li></ul>';
      const sanitized = sanitizeRichText(input);
      expect(sanitized).toContain('<h1>');
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<em>');
      expect(sanitized).toContain('<ul>');
      expect(sanitized).toContain('<li>');
    });

    test('should still block dangerous content', () => {
      const input = '<h1 onclick="steal()">Title</h1><script>malicious code</script>';
      const sanitized = sanitizeRichText(input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onclick');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty and null inputs', () => {
      expect(sanitizePlainText('')).toBe('');
      expect(sanitizePlainText(null as any)).toBeNull();
      expect(sanitizePlainText(undefined as any)).toBeUndefined();
    });

    test('should handle non-string inputs', () => {
      expect(sanitizePlainText(123 as any)).toBe(123);
      expect(sanitizePlainText(true as any)).toBe(true);
      expect(sanitizePlainText({} as any)).toEqual({});
    });

    test('should be performant with large inputs', () => {
      const largeInput = `${'A'.repeat(10000)  }<script>alert(1)</script>${  'B'.repeat(10000)}`;
      
      const startTime = Date.now();
      const sanitized = sanitizePlainText(largeInput);
      const endTime = Date.now();
      
      expect(sanitized).not.toContain('<script>');
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});