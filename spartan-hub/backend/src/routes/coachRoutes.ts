import { Router } from 'express';
import { getMyAthletes, assignAthleteToCoach } from '../controllers/coachController';
import { verifyJWT } from '../middleware/auth';
import { requireRole, ROLES } from '../utils/roleUtils';

const router = Router();

/**
 * GET /api/coach/athletes
 * Retrieve all athletes assigned to the current coach
 */
router.get('/athletes', verifyJWT, getMyAthletes);

/**
 * POST /api/coach/assign
 * Assign an athlete to a coach (Admin only)
 */
router.post('/assign', verifyJWT, requireRole([ROLES.ADMIN]), assignAthleteToCoach);

export default router;
