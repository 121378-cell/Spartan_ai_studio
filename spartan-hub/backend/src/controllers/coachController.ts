import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index';
import { coachService } from '../services/coachService';
import { logger } from '../utils/logger';

/**
 * Get all athletes assigned to the logged-in coach
 */
export async function getMyAthletes(req: AuthenticatedRequest, res: Response) {
  try {
    const coachId = req.user!.userId;
    const athletes = await coachService.getAssignedAthletes(coachId);
    
    res.status(200).json({
      success: true,
      data: athletes
    });
  } catch (error) {
    logger.error('CoachController: Error fetching athletes', { metadata: { error: String(error) } });
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Manually assign an athlete to a coach (Admin/Enterprise operation)
 */
export async function assignAthleteToCoach(req: AuthenticatedRequest, res: Response) {
  try {
    const { coachId, athleteId } = req.body;
    
    if (!coachId || !athleteId) {
      return res.status(400).json({ success: false, message: 'coachId and athleteId are required' });
    }

    const result = await coachService.assignAthlete(coachId, athleteId);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign athlete' });
  }
}
