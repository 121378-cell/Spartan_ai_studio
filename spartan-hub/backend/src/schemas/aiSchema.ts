import { z } from 'zod';

export const aiAlertUserIdSchema = z.object({
  params: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
  }),
});

export const aiAlertBodySchema = z.object({
  body: z.object({
    userId: z.string({
      message: 'User ID is required',
    }).optional(),
  }).passthrough(),
});

export const aiDecisionSchema = z.object({
  params: z.object({
    userId: z.string({
      message: 'User ID is required',
    }),
  }),
  body: z.object({
    PartituraSemanal: z.any(),
    Causa: z.string({
      message: 'Causa is required',
    }),
    PuntajeSinergico: z.coerce.number({
      message: 'PuntajeSinergico is required',
    }),
  }).passthrough(),
});

export const queueStatsSchema = z.object({
  // No parameters needed for queue stats
});
