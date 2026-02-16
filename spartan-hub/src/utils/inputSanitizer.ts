/**
 * Frontend input sanitization utilities
 * Provides functions to sanitize user inputs and prevent injection attacks
 * Uses sanitize-html library for consistent sanitization across frontend and backend
 */

import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitize string input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters and escape HTML entities
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
}

/**
 * Sanitize HTML content while preserving allowed tags
 * Uses sanitize-html library for safe HTML sanitization
 * @param input - The HTML content to sanitize
 * @param allowedTags - Array of allowed HTML tags (optional)
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(input: string, allowedTags: string[] = []): string {
  if (typeof input !== 'string') {
    return '';
  }

  // If no allowed tags, treat as plain text
  if (allowedTags.length === 0) {
    return sanitizeInput(input);
  }

  // Use sanitize-html with strict allowlist
  const config = {
    allowedTags: allowedTags,
    // Default restrictive settings for security
    allowedAttributes: {}, // No attributes allowed by default
    textFilter: function(text: string) {
      // Filter text content if needed
      return text;
    },
    // Prevent dangerous protocols
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    allowProtocolRelative: false,
  };

  return sanitizeHtmlLib(input, config);
}

/**
 * Sanitize plain text input - completely disallow all HTML tags
 * @param input - The plain text input to sanitize
 * @returns Sanitized plain text with no HTML tags
 */
export function sanitizePlainText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Completely escape all HTML characters
  return sanitizeInput(input);
}

/**
 * Sanitize rich text input - allow only safe HTML tags
 * @param input - The rich text input to sanitize
 * @returns Sanitized rich text with only safe HTML tags
 */
export function sanitizeRichText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Allow only safe HTML tags with no attributes
  const safeConfig = {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    textFilter: function(text: string) {
      return text;
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
  };
  
  return sanitizeHtmlLib(input, safeConfig);
}

/**
 * Sanitize user input based on field type
 * @param input - The input to sanitize
 * @param fieldType - The type of field ('plain', 'rich', 'name', 'description', 'notes', 'title', 'content', 'comment')
 * @returns Sanitized input appropriate for the field type
 */
export function sanitizeUserInput(input: string, fieldType: 'plain' | 'rich' | 'name' | 'description' | 'notes' | 'title' | 'content' | 'comment'): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  switch (fieldType) {
    case 'plain':
    case 'name':
    case 'title':
    case 'comment':
      return sanitizePlainText(input);
    case 'rich':
    case 'description':
    case 'notes':
    case 'content':
      return sanitizeRichText(input);
    default:
      return sanitizeInput(input);
  }
}

/**
 * Validate and sanitize string input with length constraints
 * @param input - The input to validate and sanitize
 * @param minLength - Minimum length (default: 1)
 * @param maxLength - Maximum length (default: 1000)
 * @returns Object with sanitized value and validation status
 */
export function validateAndSanitizeString(
  input: any, 
  minLength: number = 1, 
  maxLength: number = 1000
): { value: string; isValid: boolean; error?: string } {
  // Check if input is a string
  if (typeof input !== 'string') {
    return {
      value: '',
      isValid: false,
      error: 'Input must be a string'
    };
  }
  
  // Check minimum length
  if (input.length < minLength) {
    return {
      value: '',
      isValid: false,
      error: `Input must be at least ${minLength} characters long`
    };
  }
  
  // Check maximum length
  if (input.length > maxLength) {
    return {
      value: '',
      isValid: false,
      error: `Input must be no more than ${maxLength} characters long`
    };
  }
  
  // Sanitize and return
  return {
    value: sanitizeInput(input),
    isValid: true
  };
}

/**
 * Sanitize numeric input
 * @param input - The input to sanitize
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Object with sanitized value and validation status
 */
export function sanitizeNumericInput(
  input: any,
  min?: number,
  max?: number
): { value: number; isValid: boolean; error?: string } {
  // Convert to number
  const num = typeof input === 'string' ? parseFloat(input) : Number(input);
  
  // Check if it's a valid number
  if (isNaN(num)) {
    return {
      value: 0,
      isValid: false,
      error: 'Input must be a valid number'
    };
  }
  
  // Check minimum value
  if (min !== undefined && num < min) {
    return {
      value: 0,
      isValid: false,
      error: `Input must be at least ${min}`
    };
  }
  
  // Check maximum value
  if (max !== undefined && num > max) {
    return {
      value: 0,
      isValid: false,
      error: `Input must be no more than ${max}`
    };
  }
  
  return {
    value: num,
    isValid: true
  };
}

/**
 * Sanitize URL input
 * @param input - The URL to sanitize
 * @returns Object with sanitized URL and validation status
 */
export function sanitizeUrlInput(input: string): { value: string; isValid: boolean; error?: string } {
  if (typeof input !== 'string') {
    return {
      value: '',
      isValid: false,
      error: 'Input must be a string'
    };
  }
  
  try {
    // Use URL constructor to validate and normalize
    const url = new URL(input);
    
    // Allow only http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        value: '',
        isValid: false,
        error: 'URL must use http or https protocol'
      };
    }
    
    return {
      value: url.href,
      isValid: true
    };
  } catch (e) {
    return {
      value: '',
      isValid: false,
      error: 'Input must be a valid URL'
    };
  }
}

/**
 * Sanitize email input
 * @param input - The email to sanitize
 * @returns Object with sanitized email and validation status
 */
export function sanitizeEmailInput(input: string): { value: string; isValid: boolean; error?: string } {
  if (typeof input !== 'string') {
    return {
      value: '',
      isValid: false,
      error: 'Input must be a string'
    };
  }
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(input)) {
    return {
      value: '',
      isValid: false,
      error: 'Input must be a valid email address'
    };
  }
  
  // Sanitize and return
  return {
    value: sanitizeInput(input),
    isValid: true
  };
}

export default {
  sanitizeInput,
  sanitizeHtml,
  sanitizePlainText,
  sanitizeRichText,
  sanitizeUserInput,
  validateAndSanitizeString,
  sanitizeNumericInput,
  sanitizeUrlInput,
  sanitizeEmailInput
};

// Export types for field types
export type FieldType = 'plain' | 'rich' | 'name' | 'description' | 'notes' | 'title' | 'content' | 'comment';
