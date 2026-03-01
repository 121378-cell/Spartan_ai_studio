import { Router } from 'express';
import { getMyAthletes, assignAthleteToCoach } from '../controllers/coachController';
import { verifyJWT } from '../middleware/auth';
import { requireRole, ROLES } from '../utils/roleUtils';
import { getCoachVitalisService } from '../services/coachVitalisService';

const router = Router();

/**
 * GET /api/coach/status
 * Get current bio-feedback status and advice from Coach Vitalis
 */
router.get('/status', verifyJWT, async (req: any, res): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User ID missing in token' });
      return;
    }

    const coachService = getCoachVitalisService();
    const advice = await coachService.generateCoachingAdvice(userId);

    res.status(200).json({
      success: true,
      data: advice
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get coach status' });
  }
});

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
