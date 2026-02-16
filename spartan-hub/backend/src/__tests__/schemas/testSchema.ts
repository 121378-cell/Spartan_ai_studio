import { z } from 'zod';

export const createTestUserSchema = z.object({
  body: z.object({
    name: z.string({
      message: 'name is required',
    }),
    email: z.string({
      message: 'email is required',
    }).email('Invalid email address'),
  }).passthrough(),
});

export const createTestRoutineSchema = z.object({
  body: z.object({
    userId: z.string({
      message: 'userId is required',
    }),
    name: z.string({
      message: 'name is required',
    }),
  }).passthrough(),
});

export const recordWorkoutSchema = z.object({
  body: z.object({
    userId: z.string({
      message: 'userId is required',
    }),
    routineId: z.string({
      message: 'routineId is required',
    }),
    date: z.string({
      message: 'date is required',
    }).refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
    durationMinutes: z.number().optional(),
    totalWeightLifted: z.number().optional(),
    focus: z.string().optional(),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string({
      message: 'userId is required',
    }),
  }),
});

export const routineIdParamSchema = z.object({
  params: z.object({
    routineId: z.string({
      message: 'routineId is required',
    }),
  }),
});
