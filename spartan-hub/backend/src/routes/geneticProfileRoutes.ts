/**
 * Genetics Routes
 * 
 * API routes for genetic data import and analysis
 */

import { Router } from 'express';
import multer from 'multer';
import {
  uploadGeneticData,
  getGeneticProfile,
  getGeneticAnalysis,
  getPowerEnduranceProfile,
  getRecoveryProfile,
  getInjuryRiskProfile,
  getCaffeineMetabolism,
  getWeightManagementProfile,
  getChronotypeProfile,
  deleteGeneticProfile,
  getTrainingRecommendations,
  getNutritionRecommendations
} from '../controllers/geneticProfileController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for genetic data files
  }
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/genetics/upload
 * @desc    Upload genetic data file (23andMe or Ancestry format)
 * @access  Private
 */
router.post('/upload', upload.single('geneticFile'), uploadGeneticData);

/**
 * @route   GET /api/genetics/profile/:userId
 * @desc    Get user's genetic profile
 * @access  Private
 */
router.get('/profile/:userId', getGeneticProfile);

/**
 * @route   GET /api/genetics/analysis/:userId
 * @desc    Get genetic analysis summary
 * @access  Private
 */
router.get('/analysis/:userId', getGeneticAnalysis);

/**
 * @route   GET /api/genetics/power-endurance/:userId
 * @desc    Get power/endurance genetic profile
 * @access  Private
 */
router.get('/power-endurance/:userId', getPowerEnduranceProfile);

/**
 * @route   GET /api/genetics/recovery/:userId
 * @desc    Get recovery genetic profile
 * @access  Private
 */
router.get('/recovery/:userId', getRecoveryProfile);

/**
 * @route   GET /api/genetics/injury-risk/:userId
 * @desc    Get injury risk genetic profile
 * @access  Private
 */
router.get('/injury-risk/:userId', getInjuryRiskProfile);

/**
 * @route   GET /api/genetics/caffeine/:userId
 * @desc    Get caffeine metabolism genetic profile
 * @access  Private
 */
router.get('/caffeine/:userId', getCaffeineMetabolism);

/**
 * @route   GET /api/genetics/weight-management/:userId
 * @desc    Get weight management genetic profile
 * @access  Private
 */
router.get('/weight-management/:userId', getWeightManagementProfile);

/**
 * @route   GET /api/genetics/chronotype/:userId
 * @desc    Get chronotype genetic profile
 * @access  Private
 */
router.get('/chronotype/:userId', getChronotypeProfile);

/**
 * @route   GET /api/genetics/training-recommendations/:userId
 * @desc    Get training recommendations based on genetics
 * @access  Private
 */
router.get('/training-recommendations/:userId', getTrainingRecommendations);

/**
 * @route   GET /api/genetics/nutrition-recommendations/:userId
 * @desc    Get nutrition recommendations based on genetics
 * @access  Private
 */
router.get('/nutrition-recommendations/:userId', getNutritionRecommendations);

/**
 * @route   DELETE /api/genetics/profile/:profileId
 * @desc    Delete genetic profile
 * @access  Private
 */
router.delete('/profile/:profileId', deleteGeneticProfile);

export default router;
