import { z } from 'zod';
import { strictStringSchema, userInputSchema } from './validationSchema';

export const recordActivitySchema = z.object({
  body: z.object({
    userId: strictStringSchema(1, 100), // Enhanced string validation
    type: strictStringSchema(1, 100), // Enhanced string validation
    description: userInputSchema(1, 1000), // Enhanced user input validation with sanitization
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const createActivitySchema = z.object({
  body: z.object({
    type: strictStringSchema(1, 100), // Enhanced string validation
    description: userInputSchema(1, 1000), // Enhanced user input validation with sanitization
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

export const getActivityHistorySchema = z.object({
  params: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
  }),
  query: z.object({
    limit: z.coerce.number().optional().default(50),
  }),
});

export const getMyActivityHistorySchema = z.object({
  query: z.object({
    limit: z.coerce.number().optional().default(50),
  }),
});

export const getActivityByIdSchema = z.object({
  params: z.object({
    activityId: strictStringSchema(1, 100), // Enhanced string validation
  }),
});
