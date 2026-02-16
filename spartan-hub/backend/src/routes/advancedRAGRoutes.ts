/**
 * Advanced RAG Routes
 *
 * Endpoints for:
 * - Query optimization and enhancement
 * - Advanced search with decomposition and re-ranking
 * - Feedback collection for learning
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { validateAndSanitizeString } from '../utils/sanitization';
import { RAGIntegrationService } from '../services/ragIntegrationService';
import { SemanticSearchService } from '../services/semanticSearchService';
import { KBToCoachVitalisBridgeService } from '../services/kbToCoachVitalisBridgeService';
import { QueryOptimizationService } from '../services/queryOptimizationService';
import { FeedbackLearningService, QueryFeedback } from '../services/feedbackLearningService';

const router = Router();

// Lazy initialize services to avoid DB initialization issues
let semanticSearchService: SemanticSearchService | null = null;
let bridgeService: KBToCoachVitalisBridgeService | null = null;
let ragService: RAGIntegrationService | null = null;
let optimizationService: QueryOptimizationService | null = null;
let feedbackService: FeedbackLearningService | null = null;

const initializeServices = () => {
  if (!semanticSearchService) {
    semanticSearchService = new SemanticSearchService();
    bridgeService = new KBToCoachVitalisBridgeService(semanticSearchService);
    ragService = new RAGIntegrationService(semanticSearchService, bridgeService);
    optimizationService = new QueryOptimizationService();
    feedbackService = new FeedbackLearningService();
  }
};

// ============================================================================
// ENDPOINT 1: Optimize Query
// ============================================================================

/**
 * POST /api/vitalis/rag/optimize-query
 *
 * Optimize a query by:
 * - Expanding with synonyms
 * - Detecting intent
 * - Extracting key terms
 * - Suggesting improvements
 *
 * Body:
 * {
 *   query: string,
 *   context?: { HRV?: number, sleep?: number, stress?: number, RHR?: number }
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   originalQuery: string,
 *   expandedQuery: string,
 *   intent: string,
 *   keyTerms: string[],
 *   suggestions: string[],
 *   executionTimeMs: number
 * }
 */
router.post(
  '/optimize-query',
  rateLimiter(30), // 30 requests per minute
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      initializeServices();
      const { query, context } = req.body;

      // Validate query
      const validation = validateAndSanitizeString(query, 3, 500);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }

      const sanitizedQuery = validation.value!;

      logger.info('Optimizing query', {
        context: 'advanced-rag-routes',
        metadata: {
          userId: req.user?.id,
          query: sanitizedQuery.substring(0, 50)
        }
      });

      // Check service availability
      if (!optimizationService) {
        res.status(500).json({
          success: false,
          error: 'Optimization service not initialized'
        });
        return;
      }
      
      // Expand query
      const expandedQuery = await optimizationService.expandQuery(sanitizedQuery);

      // Extract key terms - We need to get them from expandedQuery since extractKeyTerms is private
      const keyTerms = expandedQuery.keyTerms;

      // Check service availability
      if (!optimizationService) {
        res.status(500).json({
          success: false,
          error: 'Optimization service not initialized'
        });
        return;
      }
      
      // Detect intent
      const intent = optimizationService.detectIntent(sanitizedQuery);

      // Check ragService availability
      if (!ragService) {
        res.status(500).json({
          success: false,
          error: 'RAG service not initialized'
        });
        return;
      }

      // Get suggestions for query improvement
      const suggestions = await ragService.queryWithContext(
        req.user?.id || 'anonymous',
        sanitizedQuery,
        context
      );

      res.json({
        success: true,
        originalQuery: sanitizedQuery,
        expandedQuery: expandedQuery.expanded,
        intent,
        keyTerms,
        suggestions: suggestions.relatedTopics,
        executionTimeMs: Date.now() - startTime
      });
    } catch (error) {
      logger.error('Query optimization failed', {
        context: 'advanced-rag-routes',
        metadata: {
          userId: req.user?.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      res.status(500).json({
        success: false,
        error: 'Query optimization failed',
        details: error instanceof Error ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// ENDPOINT 2: Advanced Search with Re-ranking
// ============================================================================

/**
 * POST /api/vitalis/rag/search-advanced
 *
 * Perform advanced search with:
 * - Query optimization
 * - Query decomposition (if needed)
 * - Result re-ranking
 * - Caching
 *
 * Body:
 * {
 *   query: string,
 *   context?: { HRV?: number, sleep?: number, stress?: number, RHR?: number },
 *   rankingFactors?: { relevance?: number, recency?: number, authority?: number, clarity?: number, completeness?: number },
 *   topK?: number
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   query: string,
 *   answer: string,
 *   sources: SearchResult[],
 *   citations: Citation[],
 *   confidence: number,
 *   relatedTopics: string[],
 *   decompositionUsed: boolean,
 *   cacheHit: boolean,
 *   executionTimeMs: number
 * }
 */
router.post(
  '/search-advanced',
  rateLimiter(20), // 20 requests per minute
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      initializeServices();
      const { query, context, rankingFactors, topK } = req.body;

      // Validate query
      const validation = validateAndSanitizeString(query, 3, 500);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }

      const sanitizedQuery = validation.value!;

      logger.info('Performing advanced search', {
        context: 'advanced-rag-routes',
        metadata: {
          userId: req.user?.id,
          query: sanitizedQuery.substring(0, 50),
          decomposeQuery: req.body.decomposeQuery || false
        }
      });

      // Check ragService availability
      if (!ragService) {
        res.status(500).json({
          success: false,
          error: 'RAG service not initialized'
        });
        return;
      }

      // Use advanced RAG query
      const result = await ragService.queryWithAdvancedRAG(
        req.user?.id || 'anonymous',
        sanitizedQuery,
        context
      );

      res.json({
        success: true,
        ...result,
        topK: topK || 10
      });
    } catch (error) {
      logger.error('Advanced search failed', {
        context: 'advanced-rag-routes',
        metadata: {
          userId: req.user?.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      res.status(500).json({
        success: false,
        error: 'Advanced search failed',
        details: error instanceof Error ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// ENDPOINT 3: Collect Feedback
// ============================================================================

/**
 * POST /api/vitalis/rag/feedback
 *
 * Collect user feedback on search results for learning
 *
 * Body:
 * {
 *   queryId: string,
 *   resultRatings: { chunkId: score, ... } (0-5 scale),
 *   userRating: 'poor' | 'fair' | 'good' | 'excellent',
 *   comments?: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   feedbackId: string,
 *   message: string,
 *   learningMetrics?: {
 *     totalQueries: number,
 *     avgRelevanceImprovement: number,
 *     rerankerAccuracy: number,
 *     feedbackSentiment: { poor, fair, good, excellent }
 *   }
 * }
 */
router.post(
  '/feedback',
  rateLimiter(50), // 50 requests per minute
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      initializeServices();
      const { queryId, resultRatings, userRating, comments } = req.body;

      // Validate inputs
      if (!queryId || typeof queryId !== 'string' || queryId.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid queryId'
        });
        return;
      }

      if (!['poor', 'fair', 'good', 'excellent'].includes(userRating)) {
        res.status(400).json({
          success: false,
          error: 'Invalid userRating. Must be poor, fair, good, or excellent'
        });
        return;
      }

      if (!resultRatings || Object.keys(resultRatings).length === 0) {
        res.status(400).json({
          success: false,
          error: 'resultRatings cannot be empty'
        });
        return;
      }

      // Validate rating values
      for (const [chunkId, score] of Object.entries(resultRatings)) {
        if (typeof score !== 'number' || score < 0 || score > 5) {
          res.status(400).json({
            success: false,
            error: `Invalid score for ${chunkId}. Must be between 0 and 5`
          });
          return;
        }
      }

      logger.info('Collecting feedback', {
        context: 'advanced-rag-routes',
        metadata: {
          userId: req.user?.id,
          queryId,
          userRating,
          ratedResults: Object.keys(resultRatings).length
        }
      });

      // Create feedback object
      const feedback: QueryFeedback = {
        queryId,
        userId: req.user?.id || 'anonymous',
        resultRatings: new Map(Object.entries(resultRatings) as [string, number][]),
        userRating,
        comments,
        timestamp: Date.now()
      };

      // Check feedback service availability
      if (!feedbackService) {
        res.status(500).json({
          success: false,
          error: 'Feedback service not initialized'
        });
        return;
      }

      // Collect feedback
      const feedbackResult = await feedbackService.collectFeedback(feedback);

      if (!feedbackResult.accepted) {
        res.status(400).json({
          success: false,
          error: 'Feedback validation failed'
        });
        return;
      }

      // Check feedback service availability
      if (!feedbackService) {
        res.status(500).json({
          success: false,
          error: 'Feedback service not initialized'
        });
        return;
      }

      // Update ranking weights based on feedback
      const feedbackList = await feedbackService.exportFeedback();
      
      // Check feedback service availability
      if (!feedbackService) {
        res.status(500).json({
          success: false,
          error: 'Feedback service not initialized'
        });
        return;
      }
      
      const updates = await feedbackService.updateRankingWeights(feedbackList);

      // Get learning metrics
      // Check feedback service availability again
      if (!feedbackService) {
        res.status(500).json({
          success: false,
          error: 'Feedback service not initialized'
        });
        return;
      }
      
      const metrics = feedbackService.calculateMetrics();

      logger.info('Feedback collected and processed', {
        context: 'advanced-rag-routes',
        metadata: {
          feedbackId: feedbackResult.feedbackId,
          weightsUpdated: updates.length,
          accuracy: metrics.rerankerAccuracy.toFixed(2)
        }
      });

      res.json({
        success: true,
        feedbackId: feedbackResult.feedbackId,
        message: 'Feedback collected and learning model updated',
        learningMetrics: {
          totalQueries: metrics.totalQueries,
          avgRelevanceImprovement: metrics.avgRelevanceImprovement.toFixed(2),
          rerankerAccuracy: metrics.rerankerAccuracy.toFixed(2),
          feedbackSentiment: metrics.feedbackSentiment,
          weightsUpdated: updates.length
        }
      });
    } catch (error) {
      logger.error('Feedback collection failed', {
        context: 'advanced-rag-routes',
        metadata: {
          userId: req.user?.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      res.status(500).json({
        success: false,
        error: 'Feedback collection failed',
        details: error instanceof Error ? error.message : undefined
      });
    }
  }
);

// ============================================================================
// ENDPOINT 4: Get Learning Metrics
// ============================================================================

/**
 * GET /api/vitalis/rag/metrics
 *
 * Get RAG system learning metrics
 *
 * Response:
 * {
 *   success: boolean,
 *   metrics: {
 *     totalFeedback: number,
 *     uniqueQueries: number,
 *     uniqueUsers: number,
 *     avgRelevanceImprovement: number,
 *     rerankerAccuracy: number,
 *     cacheHitRate: number,
 *     feedbackSentiment: { poor, fair, good, excellent }
 *   }
 * }
 */
router.get(
  '/metrics',
  rateLimiter(30),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      initializeServices();
      
      if (!feedbackService) {
        res.status(500).json({
          success: false,
          error: 'Feedback service not initialized'
        });
        return;
      }
      
      const metrics = feedbackService.calculateMetrics();
      const stats = feedbackService.getStatistics();

      res.json({
        success: true,
        metrics: {
          totalFeedback: metrics.totalQueries,
          uniqueQueries: stats.uniqueQueries.size,
          uniqueUsers: stats.uniqueUsers.size,
          dateRange: stats.dateRange,
          avgRelevanceImprovement: metrics.avgRelevanceImprovement.toFixed(2),
          rerankerAccuracy: metrics.rerankerAccuracy.toFixed(2),
          cacheHitRate: metrics.cacheHitRate.toFixed(2),
          feedbackSentiment: metrics.feedbackSentiment
        }
      });
    } catch (error) {
      logger.error('Metrics retrieval failed', {
        context: 'advanced-rag-routes',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });

      res.status(500).json({
        success: false,
        error: 'Metrics retrieval failed'
      });
    }
  }
);

export default router;
