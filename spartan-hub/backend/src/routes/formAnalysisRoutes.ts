import { Router } from 'express';
import {
  startFormAnalysisSession,
  endFormAnalysisSession,
  addRepAnalysis,
  getUserFormSessions,
  getFormSessionDetails,
  getUserExerciseStats,
  addFormFeedback,
  getSessionFeedback,
  saveFormAnalysis
} from '../controllers/formAnalysisController';
import { verifyJWT } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimit);

// Session Management
router.post('/sessions/:userId/start', verifyJWT, startFormAnalysisSession);
router.put('/sessions/:sessionId/end', verifyJWT, endFormAnalysisSession);

// Rep Analysis
router.post('/sessions/:sessionId/rep', verifyJWT, addRepAnalysis);

// Data Retrieval
router.get('/sessions/user/:userId', verifyJWT, getUserFormSessions);
router.get('/sessions/:sessionId/details', verifyJWT, getFormSessionDetails);
router.get('/stats/user/:userId', verifyJWT, getUserExerciseStats);

// Feedback
router.post('/feedback/:userId/:sessionId', verifyJWT, addFormFeedback);
router.get('/feedback/session/:sessionId', verifyJWT, getSessionFeedback);

// Monolithic save for Frontend POCs
router.post('/', verifyJWT, saveFormAnalysis);

export default router;
