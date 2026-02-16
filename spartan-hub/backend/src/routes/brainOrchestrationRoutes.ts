/**
 * Brain Orchestration Routes
 * 
 * API endpoints for the Brain Orchestrator:
 * - Trigger daily cycle manually
 * - Fetch daily reports
 * - Manage user feedback on decisions
 * - View pending plan adjustments
 * - Approve/reject adjustments
 * 
 * Protected routes: JWT authentication required
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { BrainOrchestrator } from '../services/brainOrchestrator';
import { DailyBrainCycleJob } from '../jobs/dailyBrainCycleJob';
import { apiRateLimit, heavyApiRateLimit } from '../middleware/rateLimitMiddleware';
import { verifyJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/index';

const router = Router();
const brainOrchestrator = BrainOrchestrator.getInstance();
const dailyBrainCycleJob = DailyBrainCycleJob.getInstance();

/**
 * POST /api/brain/trigger-cycle
 * Trigger daily brain cycle immediately for current user
 */
router.post(
  '/trigger-cycle',
  verifyJWT,
  heavyApiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      logger.info('Triggering manual daily brain cycle', {
        context: 'brain-routes',
        metadata: { userId }
      });

      const cycleData = await brainOrchestrator.executeDailyBrainCycle(userId);

      res.status(200).json({
        success: true,
        message: 'Daily brain cycle triggered successfully',
        data: {
          date: cycleData.date,
          adjustmentCount: cycleData.planAdjustments.length,
          notificationCount: cycleData.notifications.length,
          confidence: cycleData.coachDecision.confidence || 0.85
        }
      });
    } catch (error) {
      logger.error('Failed to trigger brain cycle', {
        context: 'brain-routes',
        metadata: {
          userId: req.user?.userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(error);
    }
  }
);

/**
 * GET /api/brain/daily-report/:date
 * Fetch daily report for a specific date
 */
router.get(
  '/daily-report/:date',
  verifyJWT,
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { date } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const db = require('../database/databaseManager').getDatabase();
      const report = db.prepare(`
        SELECT * FROM daily_brain_decisions
        WHERE userId = ? AND date = ?
      `).get(userId, date);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'No report found for this date'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          date: report.date,
          decisionType: report.decisionType,
          context: JSON.parse(report.context || '{}'),
          recommendations: JSON.parse(report.recommendations || '[]'),
          appliedChanges: JSON.parse(report.appliedChanges || '[]'),
          confidence: report.confidence,
          userApprovalStatus: report.userApprovalStatus,
          feedback: report.feedbackScore ? {
            score: report.feedbackScore,
            timestamp: report.feedbackTimestamp
          } : null
        }
      });
    } catch (error) {
      logger.error('Failed to fetch daily report', {
        context: 'brain-routes',
        metadata: {
          userId: req.user?.userId,
          date: req.params.date,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(error);
    }
  }
);

/**
 * GET /api/brain/decision-history
 * Fetch decision history (last 30 days)
 */
router.get(
  '/decision-history',
  verifyJWT,
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { limit = 30 } = req.query;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const limitNum = Math.min(parseInt(limit as string) || 30, 90);

      const db = require('../database/databaseManager').getDatabase();
      const decisions = db.prepare(`
        SELECT * FROM daily_brain_decisions
        WHERE userId = ?
        ORDER BY date DESC
        LIMIT ?
      `).all(userId, limitNum);

      res.status(200).json({
        success: true,
        data: decisions.map((d: any) => ({
          date: d.date,
          decisionType: d.decisionType,
          confidence: d.confidence,
          appliedChangesCount: JSON.parse(d.appliedChanges || '[]').length,
          userApprovalStatus: d.userApprovalStatus,
          feedback: d.feedbackScore,
          timestamp: d.timestamp
        }))
      });
    } catch (error) {
      logger.error('Failed to fetch decision history', {
        context: 'brain-routes',
        metadata: {
          userId: req.user?.userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(error);
    }
  }
);

/**
 * GET /api/brain/next-plan-adjustments
 * View pending plan adjustments (not yet approved by user)
 */
router.get(
  '/next-plan-adjustments',
  verifyJWT,
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const db = require('../database/databaseManager').getDatabase();
      const adjustments = db.prepare(`
        SELECT * FROM plan_modifications_log
        WHERE userId = ? AND appliedStatus = 'applied'
        ORDER BY timestamp DESC
        LIMIT 10
      `).all(userId);

      res.status(200).json({
        success: true,
        data: adjustments.map((a: any) => ({
          id: a.id,
          type: a.modificationType,
          previous: a.previousValue,
          new: a.newValue,
          reason: a.reason,
          confidence: a.confidence,
          appliedAt: a.appliedAt,
          userFeedback: a.userFeedback
        }))
      });
    } catch (error) {
      logger.error('Failed to fetch plan adjustments', {
        context: 'brain-routes',
        metadata: {
          userId: req.user?.userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(error);
    }
  }
);

/**
 * POST /api/brain/feedback/:decisionId
 * Submit feedback on a brain decision
 */
router.post(
  '/feedback/:decisionId',
  verifyJWT,
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { decisionId } = req.params;
      const { status, score, comment } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const validStatuses = ['auto_applied', 'user_acknowledged', 'user_modified', 'user_rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const db = require('../database/databaseManager').getDatabase();

      // Update decision record
      const stmt = db.prepare(`
        UPDATE daily_brain_decisions
        SET userApprovalStatus = ?, feedbackScore = ?, modificationReason = ?, feedbackTimestamp = ?
        WHERE id = ? AND userId = ?
      `);

      stmt.run(status, score || null, comment || null, Date.now(), decisionId, userId);

      // Store feedback for learning
      const feedbackId = `feedback_${decisionId}_${Date.now()}`;
      const feedbackStmt = db.prepare(`
        INSERT INTO feedback_learning (id, userId, decisionId, feedbackType, feedbackValue, feedbackComment, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      feedbackStmt.run(feedbackId, userId, decisionId, status, score || null, comment || null, Date.now());

      logger.info('Feedback submitted for decision', {
        context: 'brain-routes',
        metadata: { userId, decisionId, status, score }
      });

      res.status(200).json({
        success: true,
        message: 'Feedback recorded successfully',
        data: { decisionId, status }
      });
    } catch (error) {
      logger.error('Failed to submit feedback', {
        context: 'brain-routes',
        metadata: {
          userId: req.user?.userId,
          decisionId: req.params.decisionId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(error);
    }
  }
);

/**
 * POST /api/brain/approve-adjustments
 * Approve pending plan adjustments
 */
router.post(
  '/approve-adjustments',
  verifyJWT,
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { adjustmentIds, approved } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!Array.isArray(adjustmentIds) || adjustmentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'adjustmentIds must be a non-empty array'
        });
      }

      const db = require('../database/databaseManager').getDatabase();

      if (approved) {
        const stmt = db.prepare(`
          UPDATE plan_modifications_log
          SET appliedStatus = 'applied', appliedAt = ?
          WHERE userId = ? AND id = ?
        `);

        for (const adjId of adjustmentIds) {
          stmt.run(Date.now(), userId, adjId);
        }
      } else {
        const stmt = db.prepare(`
          UPDATE plan_modifications_log
          SET appliedStatus = 'rejected'
          WHERE userId = ? AND id = ?
        `);

        for (const adjId of adjustmentIds) {
          stmt.run(userId, adjId);
        }
      }

      logger.info('Plan adjustments processed', {
        context: 'brain-routes',
        metadata: { userId, count: adjustmentIds.length, approved }
      });

      res.status(200).json({
        success: true,
        message: `${adjustmentIds.length} adjustment(s) ${approved ? 'approved' : 'rejected'}`
      });
    } catch (error) {
      logger.error('Failed to process adjustments', {
        context: 'brain-routes',
        metadata: {
          userId: req.user?.userId,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(error);
    }
  }
);

/**
 * GET /api/brain/config
 * Get brain orchestrator configuration
 */
router.get(
  '/config',
  verifyJWT,
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const config = dailyBrainCycleJob.getConfig();

      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Failed to fetch brain config', {
        context: 'brain-routes',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      next(error);
    }
  }
);

export default router;
