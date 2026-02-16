import sanitizeHtml from 'sanitize-html';

// Sanitize text fields that should not contain any HTML
export const sanitizePlainText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let sanitized = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {}
  });

  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return sanitized;
};

// Sanitize text fields that can contain limited HTML
export const sanitizeLimitedHtml = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  return sanitizeHtml(text, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    allowedAttributes: {}
  });
};

// Sanitize rich text fields that can contain more HTML
export const sanitizeRichText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  return sanitizeHtml(text, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code'
    ],
    allowedAttributes: {}
  });
};

// Generic sanitization function that can be configured
export const sanitizeInput = (text: string, options?: sanitizeHtml.IOptions): string => {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  const defaultOptions: sanitizeHtml.IOptions = {
    allowedTags: [],
    allowedAttributes: {}
  };
  
  return sanitizeHtml(text, options || defaultOptions);
};

/**
 * Validates and sanitizes a string input
 * @param input - The string to validate and sanitize
 * @param minLength - Minimum allowed length (default: 1)
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Object with validation result
 */
export const validateAndSanitizeString = (
  input: string,
  minLength: number = 1,
  maxLength: number = 1000
): { isValid: boolean; value?: string; error?: string } => {
  if (!input || typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }

  const trimmed = input.trim();

  if (trimmed.length < minLength) {
    return { isValid: false, error: `Input must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Input must not exceed ${maxLength} characters` };
  }

  const sanitized = sanitizePlainText(trimmed);

  return { isValid: true, value: sanitized };
};
