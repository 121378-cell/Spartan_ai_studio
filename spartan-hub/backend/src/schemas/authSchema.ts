import { z } from 'zod';
import { emailSchema, passwordSchema, strictStringSchema } from './validationSchema';

export const registerSchema = z.object({
  body: z.object({
    name: strictStringSchema(1, 100), // Enhanced string validation with sanitization
    email: emailSchema, // Enhanced email validation
    password: passwordSchema, // Enhanced password validation
  }),
}).passthrough();

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema, // Enhanced email validation
    password: z.string(), // Password field (will be validated in controller)
  }),
}).passthrough();

export const updateRoleSchema = z.object({
  params: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
  }),
  body: z.object({
    role: z.enum(['user', 'reviewer', 'admin'], {
      message: 'Role is required',
    }),
  }),
}).passthrough();

export const authPaginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(10),
  })
}).passthrough();
