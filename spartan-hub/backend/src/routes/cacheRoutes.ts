/**
 * Cache routes for Spartan Hub application
 * Provides endpoints for managing external API cache
 */

import express from 'express';
import { 
  getCacheStatsEndpoint,
  clearCacheEndpoint,
  removeCacheEntryEndpoint,
  getCacheEntryEndpoint
} from '../controllers/cacheController';
import { validate } from '../middleware/validate';
import { verifyJWT } from '../middleware/auth';
import { apiRateLimit, writeRateLimit } from '../middleware/rateLimitMiddleware';
import { cacheKeySchema } from '../schemas/cacheSchema';
import { healthCheckSchema } from '../schemas/healthSchema';
import { ROLES } from '../middleware/auth';

const router = express.Router();

router.use(apiRateLimit);
router.use(verifyJWT);

router.get('/stats', validate(healthCheckSchema), getCacheStatsEndpoint);
router.delete('/clear', validate(healthCheckSchema), clearCacheEndpoint);
router.delete('/:key', validate(cacheKeySchema), removeCacheEntryEndpoint);
router.get('/:key', validate(cacheKeySchema), getCacheEntryEndpoint);

export default router;
