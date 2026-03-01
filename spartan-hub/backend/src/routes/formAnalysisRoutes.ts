/**
 * Form Analysis Routes
 * Phase A: Video Form Analysis MVP
 * 
 * API endpoints for video form analysis
 */

import { Router, Request, Response } from 'express';
import { FormAnalysisService } from '../services/formAnalysisService';
import { getDatabase } from '../database/databaseManager';
import { verifyJWT } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimitMiddleware';
import { logger } from '../utils/logger';
import { CreateFormAnalysisDTO, FormAnalysisFilters, ExerciseType } from '../models/FormAnalysis';

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimit);

/**
 * @route POST /api/form-analysis
 * @desc Save a new form analysis
 * @access Private
 */
router.post('/', verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const dto: CreateFormAnalysisDTO = {
      userId: req.body.userId,
      exerciseType: req.body.exerciseType as ExerciseType,
      formScore: req.body.formScore,
      metrics: req.body.metrics,
      warnings: req.body.warnings || [],
      recommendations: req.body.recommendations || []
    };

    // Validation
    if (!dto.userId || !dto.exerciseType || !dto.formScore) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, exerciseType, formScore'
      });
    }

    if (dto.formScore < 0 || dto.formScore > 100) {
      return res.status(400).json({
        success: false,
        message: 'formScore must be between 0 and 100'
      });
    }

    const result = service.create(dto);

    logger.info('Form analysis created', {
      context: 'form-analysis',
      metadata: { id: result.id, userId: dto.userId }
    });

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error creating form analysis', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to create form analysis'
    });
  }
});

/**
 * @route GET /api/form-analysis/:id
 * @desc Get form analysis by ID
 * @access Private
 */
router.get('/:id', verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const result = service.findById(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Form analysis not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error getting form analysis', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get form analysis'
    });
  }
});

/**
 * @route GET /api/form-analysis/user/:userId
 * @desc Get all form analyses for a user
 * @access Private
 */
router.get('/user/:userId', verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const results = service.findByUserId(req.params.userId, limit);

    return res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    logger.error('Error getting user form analyses', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get user form analyses'
    });
  }
});

/**
 * @route GET /api/form-analysis
 * @desc Get form analyses with filters
 * @access Private
 */
router.get('/', verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const filters: FormAnalysisFilters = {
      userId: req.query.userId as string,
      exerciseType: req.query.exerciseType as ExerciseType,
      minScore: req.query.minScore ? parseInt(req.query.minScore as string) : undefined,
      maxScore: req.query.maxScore ? parseInt(req.query.maxScore as string) : undefined,
      startDate: req.query.startDate ? parseInt(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? parseInt(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const results = service.find(filters);

    return res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    logger.error('Error searching form analyses', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to search form analyses'
    });
  }
});

/**
 * @route PUT /api/form-analysis/:id
 * @desc Update form analysis
 * @access Private
 */
router.put('/:id', verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const updateDto = {
      formScore: req.body.formScore,
      metrics: req.body.metrics,
      warnings: req.body.warnings,
      recommendations: req.body.recommendations
    };

    const result = service.update(req.params.id, updateDto);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Form analysis not found'
      });
    }

    logger.info('Form analysis updated', {
      context: 'form-analysis',
      metadata: { id: req.params.id }
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error updating form analysis', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to update form analysis'
    });
  }
});

/**
 * @route DELETE /api/form-analysis/:id
 * @desc Delete form analysis
 * @access Private
 */
router.delete('/:id', verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const deleted = service.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Form analysis not found'
      });
    }

    logger.info('Form analysis deleted', {
      context: 'form-analysis',
      metadata: { id: req.params.id }
    });

    return res.status(200).json({
      success: true,
      message: 'Form analysis deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting form analysis', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to delete form analysis'
    });
  }
});

/**
 * @route GET /api/form-analysis/user/:userId/stats
 * @desc Get user's form analysis statistics
 * @access Private
 */
router.get('/user/:userId/stats', verifyJWT, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const service = new FormAnalysisService(db);

    const stats = service.getUserStats(req.params.userId);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting user stats', {
      context: 'form-analysis',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get user stats'
    });
  }
});

export default router;
