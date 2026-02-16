import { z } from 'zod';

/**
 * Comprehensive validation schemas addressing security vulnerabilities
 * including email format, special character filtering, field length limits,
 * data type validation, and HTML/script sanitization
 */

// Enhanced email validation with stricter regex
export const emailSchema = z
  .string()
  .min(1, { message: 'Email is required' })
  .email({ message: 'Invalid email format' })
  .max(254, { message: 'Email must be at most 254 characters' })
  .transform((str) => str.toLowerCase().trim());

// Strict string validation with sanitization and length limits
export const strictStringSchema = (minLength: number = 1, maxLength: number = 1000) => 
  z
    .string()
    .min(minLength, { message: `Field must be at least ${minLength} characters` })
    .max(maxLength, { message: `Field must be at most ${maxLength} characters` })
    .refine(
      (value) => !/[<>'"&;]/.test(value), 
      { message: 'Field contains invalid characters' }
    )
    .transform((str) => str.trim());

// Sanitized string that removes potentially dangerous characters
export const sanitizedStringSchema = (minLength: number = 1, maxLength: number = 1000) => 
  z
    .string()
    .min(minLength, { message: `Field must be at least ${minLength} characters` })
    .max(maxLength, { message: `Field must be at most ${maxLength} characters` })
    .transform((str) => {
      // Remove potentially dangerous characters
      return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/\\/g, '&#x5C;')
        .replace(/`/g, '&#x60;')
        .replace(/=/g, '&#x3D;')
        .trim();
    });

// HTML content validation with allowed tags
export const htmlContentSchema = (allowedTags: string[] = [], maxLength: number = 5000) => 
  z
    .string()
    .max(maxLength, { message: `HTML content must be at most ${maxLength} characters` })
    .transform((str) => {
      // Sanitize HTML content - in a real implementation, this would use a proper sanitizer like DOMPurify
      // For now, we'll use basic escaping
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    });

// URL validation
export const urlSchema = z
  .string()
  .url({ message: 'Must be a valid URL' })
  .max(2048, { message: 'URL must be at most 2048 characters' })
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must use http or https protocol' }
  );

// Numeric validation with min/max constraints and coercion
export const numericSchema = (minValue?: number, maxValue?: number) => {
  let schema = z.coerce.number();

  if (minValue !== undefined) {
    schema = schema.min(minValue, { message: `Value must be at least ${minValue}` });
  }

  if (maxValue !== undefined) {
    schema = schema.max(maxValue, { message: `Value must be at most ${maxValue}` });
  }

  return schema;
};

// Boolean validation
export const booleanSchema = z
  .boolean()
  .default(false);

// Array validation with item constraints
export const arraySchema = <T extends z.ZodTypeAny>(schema: T, minItems: number = 0, maxItems: number = 100) =>
  z
    .array(schema)
    .min(minItems, { message: `Array must have at least ${minItems} items` })
    .max(maxItems, { message: `Array must have at most ${maxItems} items` });

// Object validation with specific keys
export const objectSchema = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();

// UUID validation
export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    { message: 'Invalid UUID format' }
  );

// Username validation (alphanumeric with underscores/hyphens)
export const usernameSchema = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters' })
  .max(30, { message: 'Username must be at most 30 characters' })
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  });

// Password validation with strength requirements
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must be at most 128 characters' })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  });

// Date string validation
export const dateStringSchema = z
  .string()
  .refine(
    (date) => !isNaN(Date.parse(date)),
    { message: 'Invalid date format' }
  );

// IP address validation
export const ipAddressSchema = z
  .string()
  .regex(
    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    { message: 'Invalid IPv4 address format' }
  )
  .or(
    z.string().regex(
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
      { message: 'Invalid IPv6 address format' }
    )
  );

// Sanitized text input for user-generated content
export const userInputSchema = (minLength: number = 1, maxLength: number = 1000) => 
  z
    .string()
    .min(minLength, { message: `Input must be at least ${minLength} characters` })
    .max(maxLength, { message: `Input must be at most ${maxLength} characters` })
    .refine(
      (value) => !/<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i.test(value), 
      { message: 'Input contains potentially dangerous content' }
    )
    .transform((str) => str.trim());

// Pagination schema for consistent query parameter handling
export const paginationSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  offset: z.coerce.number().optional().default(0),
});

// API request validation using the existing pattern from other schemas
export const apiRequestSchema = <T extends z.ZodRawShape>(shape: T) => 
  z.object({
    body: z.object(shape).optional(),
    query: z.record(z.string(), z.unknown()).optional(),
    params: z.record(z.string(), z.unknown()).optional(),
  });