/**
 * Nutrition Photo Routes
 * 
 * API routes for food photo analysis and nutrition tracking
 */

import { Router } from 'express';
import multer from 'multer';
import {
  analyzePhoto,
  getNutritionLog,
  getNutritionInsights,
  deleteLogEntry,
  getNutritionTrends
} from '../controllers/nutritionPhotoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/nutrition/analyze
 * @desc    Analyze a food photo
 * @access  Private
 */
router.post('/analyze', upload.single('photo'), analyzePhoto);

/**
 * @route   GET /api/nutrition/log/:userId
 * @desc    Get nutrition log for a user
 * @access  Private
 */
router.get('/log/:userId', getNutritionLog);

/**
 * @route   GET /api/nutrition/insights/:userId
 * @desc    Get nutrition insights
 * @access  Private
 */
router.get('/insights/:userId', getNutritionInsights);

/**
 * @route   DELETE /api/nutrition/log/:entryId
 * @desc    Delete a nutrition log entry
 * @access  Private
 */
router.delete('/log/:entryId', deleteLogEntry);

/**
 * @route   GET /api/nutrition/trends/:userId
 * @desc    Get nutrition trends
 * @access  Private
 */
router.get('/trends/:userId', getNutritionTrends);

export default router;
