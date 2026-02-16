import { z } from 'zod';
import { strictStringSchema } from './validationSchema';

export const serviceNameSchema = z.object({
  params: z.object({
    serviceName: strictStringSchema(1, 100), // Enhanced string validation
  }),
});

export const healthCheckSchema = z.object({
  // No parameters needed for health check
});

export const basicValidationSchema = z.object({
  // Basic schema for routes that need validation middleware but no specific parameters
}).passthrough();
