import { Router } from 'express';
import { getCsrfToken } from '../controllers/csrfController';
import { globalRateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();

router.get('/csrf-token', globalRateLimit, getCsrfToken);

export default router;
