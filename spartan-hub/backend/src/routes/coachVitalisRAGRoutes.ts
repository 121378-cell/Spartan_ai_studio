/**
 * Coach Vitalis RAG Routes - Knowledge Base Integration Endpoints
 *
 * Provides REST endpoints for RAG-powered recommendations,
 * semantic search, and KB evidence retrieval.
 *
 * Endpoints:
 * - POST /api/vitalis/rag/query - Semantic search with context
 * - POST /api/vitalis/rag/recommendation - Evidence-based recommendation
 * - GET /api/vitalis/rag/evidence - Get KB evidence for decision
 * - GET /api/vitalis/rag/summary - KB summary for topic
 * - POST /api/vitalis/rag/validate - Validate recommendation
 * - GET /api/vitalis/rag/trending - Trending KB topics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { verifyJWT } from '../middleware/auth';
import { heavyApiRateLimit } from '../middleware/rateLimitMiddleware';
import type { AuthenticatedRequest } from '../types/index';
import { sanitizeInput } from '../utils/sanitization';
import { logger } from '../utils/logger';
import { requireRole, ROLES } from '../middleware/auth';
import { SemanticSearchService } from '../services/semanticSearchService';
import { KBToCoachVitalisBridgeService } from '../services/kbToCoachVitalisBridgeService';
import { RAGIntegrationService } from '../services/ragIntegrationService';

const router = Router();

// Apply rate limiting to all routes
router.use(heavyApiRateLimit);

// Service instances (lazy initialized)
let semanticSearchService: SemanticSearchService | null = null;
let bridgeService: KBToCoachVitalisBridgeService | null = null;
let ragIntegrationService: RAGIntegrationService | null = null;

/**
 * Initialize RAG services (lazy initialization pattern)
 */
async function initializeServices() {
  if (!semanticSearchService) {
    semanticSearchService = new SemanticSearchService();
    await semanticSearchService.initialize();
  }
  if (!bridgeService) {
    bridgeService = new KBToCoachVitalisBridgeService(semanticSearchService!);
  }
  if (!ragIntegrationService) {
    ragIntegrationService = new RAGIntegrationService(
      semanticSearchService!,
      bridgeService!
    );
  }
}

/**
 * POST /api/vitalis/rag/query
 * Semantic search with Coach Vitalis context
 *
 * Request body:
 * {
 *   "query": string,
 *   "context": {
 *     "hrv": number,
 *     "rhr": number,
 *     "stressLevel": number,
 *     "sleepDuration": number,
 *     ...
 *   }
 * }
 */
router.post(
  '/query',
  verifyJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { query?: unknown; context?: unknown };
      let query: string;
      
      if (!body.query || typeof body.query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Query is required and must be a string'
        });
      }
      query = body.query;
      const context = (body.context || {}) as Record<string, unknown> | undefined;

      const sanitizedQuery = sanitizeInput(query) as string;

      if (!sanitizedQuery || sanitizedQuery.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Query cannot be empty after sanitization'
        });
      }

      await initializeServices();

      const ragResponse = await ragIntegrationService!.queryWithContext(
        req.user!.userId as string,
        sanitizedQuery,
        (context as any) || undefined
      );

      logger.info('RAG query endpoint called', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user!.userId,
          queryLength: sanitizedQuery.length,
          sourcesCount: ragResponse.sources.length,
          confidence: ragResponse.confidence
        }
      });

      return res.status(200).json({
        success: true,
        data: ragResponse
      });
    } catch (error) {
      logger.error('RAG query failed', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user?.userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return res.status(500).json({
        success: false,
        message: 'RAG query failed'
      });
    }
  }
);

/**
 * POST /api/vitalis/rag/recommendation
 * Get evidence-based recommendation with KB support
 *
 * Request body:
 * {
 *   "decisionType": string,
 *   "context": { biometricContext }
 * }
 */
router.post(
  '/recommendation',
  verifyJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { decisionType?: unknown; context?: unknown };
      let decisionType: string;
      let context: Record<string, unknown>;

      // Validate input
      if (!body.decisionType || typeof body.decisionType !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'decisionType is required'
        });
      }
      decisionType = body.decisionType;

      if (!body.context || typeof body.context !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'context is required'
        });
      }
      context = body.context as Record<string, unknown>;

      await initializeServices();

      const recommendation = await ragIntegrationService!.getEvidenceBasedRecommendation(
        req.user!.userId as string,
        decisionType,
        (context as any) || undefined
      );

      logger.info('Evidence-based recommendation generated', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user!.userId,
          decisionType,
          evidenceCount: recommendation.evidence.length,
          confidence: recommendation.boostedConfidence
        }
      });

      return res.status(200).json({
        success: true,
        data: recommendation
      });
    } catch (error) {
      logger.error('Evidence-based recommendation failed', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user?.userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate evidence-based recommendation'
      });
    }
  }
);

/**
 * GET /api/vitalis/rag/evidence
 * Get KB evidence for a specific decision
 *
 * Query parameters:
 * - query: The decision/topic to find evidence for
 * - limit: Maximum number of evidence sources (default: 5)
 */
router.get(
  '/evidence',
  verifyJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query.query as string | undefined;
      const limit = req.query.limit as string | undefined;

      // Validate input
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'query parameter is required'
        });
      }

      const sanitizedQuery = sanitizeInput(query);
      const limitNum = Math.min(parseInt(limit || '5') || 5, 20);

      if (!sanitizedQuery || sanitizedQuery.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Query cannot be empty'
        });
      }

      await initializeServices();

      const evidence = await bridgeService!.getKBEvidenceForDecision(
        sanitizedQuery,
        limitNum
      );

      logger.info('KB evidence retrieved', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user!.userId,
          query: sanitizedQuery,
          evidenceCount: evidence.length
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          query: sanitizedQuery,
          evidence,
          total: evidence.length
        }
      });
    } catch (error) {
      logger.error('Failed to get evidence', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user?.userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve evidence'
      });
    }
  }
);

/**
 * GET /api/vitalis/rag/summary
 * Get KB summary for a topic
 *
 * Query parameters:
 * - topic: The topic to summarize
 */
router.get(
  '/summary',
  verifyJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const topicParam = req.query.topic as string | undefined;
      let topic: string;

      // Validate input
      if (!topicParam || typeof topicParam !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'topic parameter is required'
        });
      }
      topic = topicParam;

      const sanitizedTopic = sanitizeInput(topic) as string;

      if (!sanitizedTopic || sanitizedTopic.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Topic cannot be empty'
        });
      }

      await initializeServices();

      const summary = await ragIntegrationService!.generateKBSummaryForUser(
        req.user!.userId as string,
        sanitizedTopic
      );

      logger.info('KB summary generated', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user!.userId,
          topic: sanitizedTopic,
          chaptersCount: summary.relatedChapters.length,
          confidence: summary.confidence
        }
      });

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Failed to generate summary', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user?.userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to generate summary'
      });
    }
  }
);

/**
 * POST /api/vitalis/rag/validate
 * Validate a coaching recommendation against KB (ADMIN/REVIEWER only)
 *
 * Request body:
 * {
 *   "recommendation": { ActionRecommendation }
 * }
 */
router.post(
  '/validate',
  verifyJWT,
  requireRole([ROLES.ADMIN, ROLES.REVIEWER]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { recommendation?: unknown };
      const recommendation = body.recommendation as Record<string, unknown> | undefined;

      // Validate input
      if (!recommendation || typeof recommendation !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'recommendation is required'
        });
      }

      await initializeServices();

      const validation = await ragIntegrationService!.validateDecisionAgainstKB(
        req.user!.userId as string,
        (recommendation as any) || {}
      );

      logger.info('Recommendation validation completed', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user!.userId,
          userRole: req.user!.role,
          recommendationId: recommendation.id,
          isValid: validation.isValid,
          confidence: validation.confidenceLevel
        }
      });

      return res.status(200).json({
        success: true,
        data: validation
      });
    } catch (error) {
      logger.error('Recommendation validation failed', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user?.userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return res.status(500).json({
        success: false,
        message: 'Validation failed'
      });
    }
  }
);

/**
 * GET /api/vitalis/rag/trending
 * Get trending topics in the knowledge base
 *
 * Query parameters:
 * - days: Number of days to look back (default: 30, max: 90)
 */
router.get(
  '/trending',
  verifyJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const days = req.query.days as string | undefined;

      const daysNum = Math.min(Math.max(parseInt(days || '30') || 30, 1), 90);

      await initializeServices();

      const trendingTopics = await ragIntegrationService!.getTrendingTopics(
        daysNum
      );

      logger.info('Trending topics retrieved', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user!.userId,
          topicsCount: trendingTopics.length,
          daysLookback: daysNum
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          trendingTopics,
          total: trendingTopics.length,
          period: `${daysNum} days`
        }
      });
    } catch (error) {
      logger.error('Failed to get trending topics', {
        context: 'vitalis-rag-routes',
        metadata: {
          userId: req.user?.userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve trending topics'
      });
    }
  }
);

/**
 * Cleanup handlers on process exit
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing RAG services gracefully', {
    context: 'vitalis-rag-routes'
  });
  if (ragIntegrationService) {
    await ragIntegrationService.close();
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing RAG services gracefully', {
    context: 'vitalis-rag-routes'
  });
  if (ragIntegrationService) {
    await ragIntegrationService.close();
  }
});

export default router;
