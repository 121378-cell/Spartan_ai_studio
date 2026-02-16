import { z } from 'zod';

export const cacheKeySchema = z.object({
  params: z.object({
    key: z.string({
      message: 'Cache key is required',
    }),
  }),
});
