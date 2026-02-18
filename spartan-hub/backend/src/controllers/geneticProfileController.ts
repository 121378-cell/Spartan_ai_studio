/**
 * Genetic Profile Controller
 * 
 * Handles API requests for genetic data import and analysis
 */

import { Request, Response } from 'express';
import { geneticProfileService } from '../services/geneticProfileService';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

/**
 * Upload genetic data file
 * POST /api/genetics/upload
 */
export const uploadGeneticData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, source } = req.body;
    const {file} = req;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!source || !['23andme', 'ancestry'].includes(source)) {
      throw new ValidationError('Source must be 23andme or ancestry');
    }

    if (!file) {
      throw new ValidationError('Genetic data file is required');
    }

    logger.info('Uploading genetic data', {
      context: 'genetics-controller',
      metadata: { userId, source, fileSize: file.size }
    });

    // Convert buffer to string
    const rawData = file.buffer.toString('utf-8');

    // Import and analyze
    const result = await geneticProfileService.importGeneticData(userId, source, rawData);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to upload genetic data', {
      context: 'genetics-controller',
      metadata: { error }
    });

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process genetic data'
    });
  }
};

/**
 * Get user's genetic profile
 * GET /api/genetics/profile/:userId
 */
export const getGeneticProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    logger.info('Fetching genetic profile', {
      context: 'genetics-controller',
      metadata: { userId }
    });

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Failed to fetch genetic profile', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch genetic profile'
    });
  }
};

/**
 * Get genetic analysis summary
 * GET /api/genetics/analysis/:userId
 */
export const getGeneticAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile.analysis
    });
  } catch (error) {
    logger.error('Failed to fetch genetic analysis', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch analysis'
    });
  }
};

/**
 * Get power/endurance profile
 * GET /api/genetics/power-endurance/:userId
 */
export const getPowerEnduranceProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile.analysis.powerEnduranceProfile
    });
  } catch (error) {
    logger.error('Failed to fetch power/endurance profile', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Get recovery profile
 * GET /api/genetics/recovery/:userId
 */
export const getRecoveryProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile.analysis.recoveryProfile
    });
  } catch (error) {
    logger.error('Failed to fetch recovery profile', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Get injury risk profile
 * GET /api/genetics/injury-risk/:userId
 */
export const getInjuryRiskProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile.analysis.injuryRiskProfile
    });
  } catch (error) {
    logger.error('Failed to fetch injury risk profile', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Get caffeine metabolism profile
 * GET /api/genetics/caffeine/:userId
 */
export const getCaffeineMetabolism = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile.analysis.caffeineMetabolism
    });
  } catch (error) {
    logger.error('Failed to fetch caffeine metabolism', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch caffeine data'
    });
  }
};

/**
 * Get weight management profile
 * GET /api/genetics/weight-management/:userId
 */
export const getWeightManagementProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile.analysis.weightManagement
    });
  } catch (error) {
    logger.error('Failed to fetch weight management profile', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Get chronotype profile
 * GET /api/genetics/chronotype/:userId
 */
export const getChronotypeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile.analysis.chronotype
    });
  } catch (error) {
    logger.error('Failed to fetch chronotype profile', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Delete genetic profile
 * DELETE /api/genetics/profile/:profileId
 */
export const deleteGeneticProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileId } = req.params;

    logger.info('Deleting genetic profile', {
      context: 'genetics-controller',
      metadata: { profileId }
    });

    await geneticProfileService.deleteProfile(profileId);

    res.status(200).json({
      success: true,
      message: 'Genetic profile deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete genetic profile', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete profile'
    });
  }
};

/**
 * Get training recommendations based on genetics
 * GET /api/genetics/training-recommendations/:userId
 */
export const getTrainingRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    const recommendations = {
      trainingType: profile.analysis.powerEnduranceProfile.trainingFocus,
      optimalSchedule: profile.analysis.chronotype.optimalWorkoutTime,
      restDays: profile.analysis.recoveryProfile.recommendedRestDays,
      intensity: profile.analysis.weightManagement.exerciseIntensity,
      injuryPrevention: profile.analysis.injuryRiskProfile.preventiveMeasures,
      supplements: profile.analysis.injuryRiskProfile.recommendedSupplements
    };

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Failed to generate training recommendations', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations'
    });
  }
};

/**
 * Get nutrition recommendations based on genetics
 * GET /api/genetics/nutrition-recommendations/:userId
 */
export const getNutritionRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const profile = geneticProfileService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'Genetic profile not found'
      });
      return;
    }

    const recommendations = {
      metabolicType: profile.analysis.weightManagement.metabolicType,
      dietPlan: profile.analysis.weightManagement.dietRecommendations,
      macros: profile.analysis.weightManagement.macros,
      antiInflammatoryFoods: profile.analysis.recoveryProfile.antiInflammatoryFoods,
      caffeineGuidance: profile.analysis.caffeineMetabolism,
      supplements: profile.analysis.injuryRiskProfile.recommendedSupplements
    };

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Failed to generate nutrition recommendations', {
      context: 'genetics-controller',
      metadata: { error }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations'
    });
  }
};
