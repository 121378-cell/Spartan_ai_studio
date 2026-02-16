import express, { Router, Request, Response } from 'express';
import { verifyJWT, requireRole, ROLES } from '../middleware/auth';
import { sanitizeInput } from '../utils/sanitization';
import { logger } from '../utils/logger';
import { KnowledgeBaseLoaderService } from '../services/knowledgeBaseLoaderService';
import { VectorStorePopulationService } from '../services/vectorStorePopulationService';
import { KnowledgeBaseValidationService } from '../services/knowledgeBaseValidationService';
import { AuthenticatedRequest } from '../types/index';

const router: Router = express.Router();

// Singleton instances for services
let loaderService: KnowledgeBaseLoaderService | null = null;
let populationService: VectorStorePopulationService | null = null;
let validationService: KnowledgeBaseValidationService | null = null;

/**
 * Initialize knowledge base services (lazy loading)
 */
function initializeServices(): void {
  if (!loaderService) {
    loaderService = new KnowledgeBaseLoaderService('knowledge-base.db');
  }
  if (!populationService) {
    populationService = new VectorStorePopulationService(
      'knowledge-base.db'
    );
  }
  if (!validationService) {
    validationService = new KnowledgeBaseValidationService('knowledge-base.db');
  }
}

/**
 * GET /api/kb/status
 * Get current knowledge base status and statistics
 */
router.get('/status', verifyJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    initializeServices();

    if (!loaderService || !populationService) {
      res.status(500).json({
        success: false,
        message: 'Knowledge base services not available'
      });
      return;
    }

    const books = loaderService.getBooks();
    const chunks = loaderService.getChunksForEmbedding();
    const stats = loaderService.getChunkStatistics();
    const populationStats = populationService.getPopulationStats();

    logger.info('Knowledge base status retrieved', {
      context: 'KnowledgeBaseRoutes',
      metadata: {
        totalBooks: books.length,
        totalChunks: chunks.length,
        embeddedChunks: populationStats.totalEmbedded
      }
    });

    res.status(200).json({
      success: true,
      data: {
        status: 'active',
        books: {
          total: books.length,
          categories: [...new Set(books.map(b => b.category))].length
        },
        chunks: {
          total: stats.totalChunks,
          embedded: populationStats.totalEmbedded,
          percentageEmbedded: stats.totalChunks > 0 
            ? Math.round((populationStats.totalEmbedded / stats.totalChunks) * 100)
            : 0
        },
        statistics: {
          totalTokens: stats.totalTokens,
          averageChunkSize: stats.averageChunkSize,
          minChunkSize: stats.minChunkSize,
          maxChunkSize: stats.maxChunkSize
        },
        costs: {
          totalCost: populationStats.totalCost,
          estimatedStorage: populationStats.estimatedQdrantStorageBytes
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get knowledge base status', {
      context: 'KnowledgeBaseRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge base status'
    });
  }
});

/**
 * GET /api/kb/statistics
 * Get detailed knowledge base statistics
 */
router.get('/statistics', verifyJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    initializeServices();

    if (!loaderService) {
      res.status(500).json({
        success: false,
        message: 'Knowledge base service not available'
      });
      return;
    }

    const stats = loaderService.getChunkStatistics();
    const books = loaderService.getBooks();

    const categoryBreakdown = books.reduce((acc: Record<string, number>, book) => {
      acc[book.category] = (acc[book.category] || 0) + book.totalChunks;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBooks: stats.booksProcessed,
          totalChunks: stats.totalChunks,
          totalTokens: stats.totalTokens,
          averageChunkSize: stats.averageChunkSize,
          minChunkSize: stats.minChunkSize,
          maxChunkSize: stats.maxChunkSize
        },
        categoryBreakdown,
        coverage: {
          categories: books.length > 0 ? [...new Set(books.map(b => b.category))].length : 0,
          percentageTokenDistribution: stats.totalTokens > 0
            ? Math.round((stats.totalTokens / (stats.totalChunks * 200)) * 100) // Normalized to expected 200 tokens/chunk
            : 0
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get knowledge base statistics', {
      context: 'KnowledgeBaseRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge base statistics'
    });
  }
});

/**
 * GET /api/kb/books
 * List all books in knowledge base
 */
router.get('/books', verifyJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    initializeServices();

    if (!loaderService) {
      res.status(500).json({
        success: false,
        message: 'Knowledge base service not available'
      });
      return;
    }

    const books = loaderService.getBooks();

    res.status(200).json({
      success: true,
      data: {
        total: books.length,
        books: books.map(book => ({
          id: book.id,
          title: book.title,
          authors: book.authors,
          year: book.year,
          isbn: book.isbn,
          category: book.category,
          description: book.description,
          totalChunks: book.totalChunks,
          createdAt: book.createdAt
        }))
      }
    });
  } catch (error) {
    logger.error('Failed to list knowledge base books', {
      context: 'KnowledgeBaseRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge base books'
    });
  }
});

/**
 * POST /api/kb/validate
 * Validate knowledge base quality
 */
router.post('/validate', verifyJWT, requireRole([ROLES.ADMIN, ROLES.REVIEWER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    initializeServices();

    if (!loaderService || !validationService) {
      res.status(500).json({
        success: false,
        message: 'Knowledge base services not available'
      });
      return;
    }

    const chunks = loaderService.getChunksForEmbedding();
    
    if (chunks.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No chunks available for validation'
      });
      return;
    }

    const qualityReport = validationService.validateChunkQuality(chunks);

    logger.info('Knowledge base validation completed', {
      context: 'KnowledgeBaseRoutes',
      metadata: {
        totalChunks: qualityReport.totalChunks,
        validChunks: qualityReport.validChunks,
        validationRate: qualityReport.validationRate.toFixed(2)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        validation: qualityReport,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to validate knowledge base', {
      context: 'KnowledgeBaseRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to validate knowledge base'
    });
  }
});

/**
 * GET /api/kb/quality-report
 * Generate comprehensive quality report
 */
router.get('/quality-report', verifyJWT, requireRole([ROLES.ADMIN, ROLES.REVIEWER]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    initializeServices();

    if (!validationService) {
      res.status(500).json({
        success: false,
        message: 'Validation service not available'
      });
      return;
    }

    const report = validationService.generateQualityReport();

    logger.info('Quality report generated', {
      context: 'KnowledgeBaseRoutes',
      metadata: {
        totalBooks: report.totalBooks,
        overallScore: report.overallScore.toFixed(2)
      }
    });

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate quality report', {
      context: 'KnowledgeBaseRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to generate quality report'
    });
  }
});

/**
 * POST /api/kb/search
 * Search knowledge base with query
 */
router.post('/search', verifyJWT, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query, limit = 10 } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Query parameter is required and must be a string'
      });
      return;
    }

    const sanitized = sanitizeInput(query);

    if (sanitized.length === 0 || sanitized.length > 500) {
      res.status(400).json({
        success: false,
        message: 'Query must be between 1 and 500 characters'
      });
      return;
    }

    initializeServices();

    if (!loaderService) {
      res.status(500).json({
        success: false,
        message: 'Knowledge base service not available'
      });
      return;
    }

    const chunks = loaderService.getChunksForEmbedding();
    
    // Simple text search (can be enhanced with semantic search later)
    const results = chunks
      .filter(chunk => 
        chunk.content.toLowerCase().includes(sanitized.toLowerCase()) ||
        chunk.keyTerms.some(term => term.includes(sanitized.toLowerCase()))
      )
      .slice(0, Math.min(limit, 50))
      .map(chunk => ({
        id: chunk.id,
        bookId: chunk.bookId,
        chapterTitle: chunk.chapterTitle,
        content: chunk.content.substring(0, 200) + '...',
        keyTerms: chunk.keyTerms,
        relevance: 0.8 // Placeholder for relevance score
      }));

    logger.info('Knowledge base search executed', {
      context: 'KnowledgeBaseRoutes',
      metadata: {
        query: sanitized,
        resultsFound: results.length
      }
    });

    res.status(200).json({
      success: true,
      data: {
        query: sanitized,
        resultsFound: results.length,
        results
      }
    });
  } catch (error) {
    logger.error('Failed to search knowledge base', {
      context: 'KnowledgeBaseRoutes',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });

    res.status(500).json({
      success: false,
      message: 'Failed to search knowledge base'
    });
  }
});

// Cleanup on exit
process.on('exit', () => {
  if (loaderService) loaderService.close();
  if (validationService) validationService.close();
});

export default router;
