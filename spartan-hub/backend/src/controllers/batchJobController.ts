/**
 * Batch Job Controller
 * 
 * Handles API requests for batch job management
 * - List scheduled jobs
 * - View active jobs
 * - Trigger manual job execution
 * - Cancel running jobs
 */

import { Request, Response } from 'express';
import { getBatchJobService } from '../services/batchJobService';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';

import { AuthenticatedRequest } from '../middleware/auth';

export class BatchJobController {
  private batchJobService = getBatchJobService();

  /**
   * Get list of scheduled batch jobs
   * GET /api/admin/batch-jobs/scheduled
   */
  async getScheduledJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const jobs = this.batchJobService.getScheduledJobs();

      logger.info('Scheduled jobs retrieved', {
        context: 'batchJob.controller',
        metadata: { jobCount: jobs.length },
      });

      res.status(200).json({
        success: true,
        data: {
          jobs,
          totalCount: jobs.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get scheduled jobs', {
        context: 'batchJob.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get scheduled jobs',
      });
    }
  }

  /**
   * Get currently active batch jobs
   * GET /api/admin/batch-jobs/active
   */
  async getActiveJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const jobs = this.batchJobService.getActiveJobs();

      logger.info('Active jobs retrieved', {
        context: 'batchJob.controller',
        metadata: { jobCount: jobs.length },
      });

      res.status(200).json({
        success: true,
        data: {
          jobs: jobs.map(job => ({
            id: job.id,
            type: job.type,
            status: job.status,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            rowsProcessed: job.rowsProcessed,
            retryCount: job.retryCount,
            errorMessage: job.errorMessage,
          })),
          totalCount: jobs.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get active jobs', {
        context: 'batchJob.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get active jobs',
      });
    }
  }

  /**
   * Get status of specific batch job
   * GET /api/admin/batch-jobs/:jobId
   */
  async getJobStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const sanitizedJobId = sanitizeInput(jobId);

      if (!sanitizedJobId) {
        res.status(400).json({
          success: false,
          message: 'Invalid job ID',
        });
        return;
      }

      const job = this.batchJobService.getJobStatus(sanitizedJobId);

      if (!job) {
        res.status(404).json({
          success: false,
          message: 'Job not found',
        });
        return;
      }

      logger.info('Job status retrieved', {
        context: 'batchJob.controller',
        metadata: { jobId: sanitizedJobId, status: job.status },
      });

      res.status(200).json({
        success: true,
        data: {
          id: job.id,
          type: job.type,
          status: job.status,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          duration: job.completedAt && job.startedAt
            ? job.completedAt.getTime() - job.startedAt.getTime()
            : null,
          rowsProcessed: job.rowsProcessed,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
          errorMessage: job.errorMessage,
        },
      });
    } catch (error) {
      logger.error('Failed to get job status', {
        context: 'batchJob.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
      });
    }
  }

  /**
   * Cancel a running batch job
   * POST /api/admin/batch-jobs/:jobId/cancel
   */
  async cancelJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const sanitizedJobId = sanitizeInput(jobId);

      if (!sanitizedJobId) {
        res.status(400).json({
          success: false,
          message: 'Invalid job ID',
        });
        return;
      }

      const cancelled = this.batchJobService.cancelJob(sanitizedJobId);

      if (!cancelled) {
        res.status(400).json({
          success: false,
          message: 'Job could not be cancelled (not found or not running)',
        });
        return;
      }

      logger.info('Batch job cancelled', {
        context: 'batchJob.controller',
        metadata: { jobId: sanitizedJobId, userId: req.user?.id },
      });

      res.status(200).json({
        success: true,
        message: 'Job cancelled successfully',
      });
    } catch (error) {
      logger.error('Failed to cancel job', {
        context: 'batchJob.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({
        success: false,
        message: 'Failed to cancel job',
      });
    }
  }

  /**
   * Get batch job service health status
   * GET /api/admin/batch-jobs/health
   */
  async getHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const health = await this.batchJobService.getHealth();

      logger.info('Batch job health retrieved', {
        context: 'batchJob.controller',
        metadata: health,
      });

      res.status(200).json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Failed to get batch job health', {
        context: 'batchJob.controller',
        metadata: {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      res.status(500).json({
        success: false,
        message: 'Failed to get batch job health',
      });
    }
  }
}

export default new BatchJobController();
