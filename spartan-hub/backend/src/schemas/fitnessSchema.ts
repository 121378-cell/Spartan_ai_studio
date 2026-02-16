import { z } from 'zod';
import { strictStringSchema } from './validationSchema';

export const muscleParamSchema = z.object({
  params: z.object({
    muscle: strictStringSchema(1, 100), // Enhanced string validation
  }),
});

export const exerciseSearchSchema = z.object({
  query: z.object({
    name: strictStringSchema(1, 100), // Enhanced string validation
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(20),
  }),
});

export const nutritionSchema = z.object({
  body: z.object({
    foodItems: z.array(z.string(), {
      message: 'foodItems must be an array',
    }).min(1, 'At least one food item is required'),
  }),
});
