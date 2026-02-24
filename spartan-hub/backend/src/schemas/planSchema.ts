import { z } from 'zod';

export const assignPlanSchema = z.object({
  body: z.object({
    userId: z.string({
      message: 'User ID is required to assign a plan.',
    }),
    routineId: z.string({
      message: 'Routine ID is required to assign a plan.',
    }),
    startDate: z.string({
      message: 'Start date is required to assign a plan.',
    }).refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start date format. Must be a valid ISO date string.',
    }),
  }),
});

export const trackCommitmentSchema = z.object({
  body: z.object({
    userId: z.string({
      message: 'User ID is required to track commitment.',
    }),
    routineId: z.string({
      message: 'Routine ID is required to track commitment.',
    }),
    commitmentLevel: z.coerce.number({
      message: 'Commitment level is required to track commitment.',
    }).min(1, 'Commitment level must be between 1 and 10.')
      .max(10, 'Commitment level must be between 1 and 10.'),
    notes: z.string().optional(),
  }),
});

export const getUserPlansSchema = z.object({
  params: z.object({
    userId: z.string({
      message: 'User ID is required.',
    }),
  }),
  query: z.object({
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(20),
  }).optional()
});

export const getCommitmentSchema = z.object({
  params: z.object({
    userId: z.string({
      message: 'User ID is required.',
    }),
    routineId: z.string({
      message: 'Routine ID is required.',
    }),
  }),
});
