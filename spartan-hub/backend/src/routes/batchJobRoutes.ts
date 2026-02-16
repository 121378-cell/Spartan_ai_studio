/**
 * Batch Job Routes
 * 
 * Admin endpoints for managing scheduled batch jobs
 * - List scheduled jobs
 * - View active jobs
 * - Get job status
 * - Cancel running jobs
 */

import { Router, Request, Response } from 'express';
import batchJobController from '../controllers/batchJobController';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Apply middleware
 * - rateLimiter: Standard rate limiting
 * - authenticate: Verify user identity (admin required)
 */
router.use(rateLimiter(100));

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Get list of all scheduled batch jobs
 * GET /api/admin/batch-jobs/scheduled
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     jobs: [
 *       {
 *         name: string,
 *         schedule: string (cron expression),
 *         enabled: boolean
 *       }
 *     ],
 *     totalCount: number
 *   }
 * }
 */
router.get('/scheduled', authenticate, (req: Request, res: Response) => {
  return batchJobController.getScheduledJobs(req as any, res);
});

// ============================================================================
// ACTIVE JOBS
// ============================================================================

/**
 * Get list of currently active batch jobs
 * GET /api/admin/batch-jobs/active
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     jobs: [
 *       {
 *         id: string,
 *         type: string,
 *         status: 'running' | 'completed' | 'failed',
 *         startedAt: timestamp,
 *         completedAt: timestamp | null,
 *         rowsProcessed: number,
 *         retryCount: number
 *       }
 *     ],
 *     totalCount: number
 *   }
 * }
 */
router.get('/active', authenticate, (req: Request, res: Response) => {
  return batchJobController.getActiveJobs(req as any, res);
});

// ============================================================================
// HEALTH STATUS
// ============================================================================

/**
 * Get batch job service health status
 * GET /api/admin/batch-jobs/health
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     active: boolean,
 *     jobCount: number,
 *     activeJobs: number,
 *     config: {
 *       enableDailyAnalytics: boolean,
 *       enableCacheWarming: boolean,
 *       enableDatabaseMaintenance: boolean,
 *       analyticsSchedule: string,
 *       cacheWarmingSchedule: string,
 *       maintenanceSchedule: string,
 *       maxConcurrentJobs: number
 *     }
 *   }
 * }
 */
router.get('/health', authenticate, (req: Request, res: Response) => {
  return batchJobController.getHealth(req as any, res);
});

// ============================================================================
// JOB STATUS & CONTROL
// ============================================================================

/**
 * Get status of specific batch job
 * GET /api/admin/batch-jobs/:jobId
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     id: string,
 *     type: string,
 *     status: 'running' | 'completed' | 'failed',
 *     startedAt: timestamp,
 *     completedAt: timestamp | null,
 *     duration: number | null (milliseconds),
 *     rowsProcessed: number,
 *     retryCount: number,
 *     maxRetries: number,
 *     errorMessage: string | null
 *   }
 * }
 */
router.get('/:jobId', authenticate, (req: Request, res: Response) => {
  return batchJobController.getJobStatus(req as any, res);
});

/**
 * Cancel a running batch job
 * POST /api/admin/batch-jobs/:jobId/cancel
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.post('/:jobId/cancel', authenticate, (req: Request, res: Response) => {
  return batchJobController.cancelJob(req as any, res);
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 Handler for batch job endpoints
 */
router.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Batch job endpoint not found',
    availableEndpoints: [
      'GET /api/admin/batch-jobs/scheduled',
      'GET /api/admin/batch-jobs/active',
      'GET /api/admin/batch-jobs/health',
      'GET /api/admin/batch-jobs/:jobId',
      'POST /api/admin/batch-jobs/:jobId/cancel',
    ],
  });
});

export default router;
