import { Router } from 'express';
import {
  createTestUser,
  createTestRoutine,
  recordWorkout,
  getTestUser,
  getTestRoutine,
  getWorkoutHistory,
  getChronicLoad
} from '../controllers/testController';
import {
  recordActivity,
  getUserActivityHistory
} from '../../controllers/activityController';
import { validate } from '../../middleware/validate';
import {
  recordActivitySchema,
  getActivityHistorySchema
} from '../../schemas/activitySchema';
import { sanitizeUserInputFields } from '../../middleware/inputSanitizationMiddleware';

const router = Router();

// Test routes for data persistence verification
router.post('/create-user', createTestUser);
router.post('/create-routine', createTestRoutine);
router.post('/record-workout', recordWorkout);
router.get('/user/:userId', getTestUser);
router.get('/routine/:routineId', getTestRoutine);
router.get('/workouts/:userId', getWorkoutHistory);
router.get('/chronic-load/:userId', getChronicLoad);

// Test routes for activity functionality
router.post('/activity', recordActivity);
router.get('/activity/:userId', getUserActivityHistory);

export default router;