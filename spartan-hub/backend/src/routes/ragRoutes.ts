/**
 * RAG Routes - Retrieval-Augmented Generation endpoints
 *
 * Endpoints:
 * - POST /api/rag/documents/ingest - Upload and index documents
 * - GET /api/rag/documents - List all indexed documents
 * - POST /api/rag/query - Query knowledge base with citations
 * - GET /api/rag/search/:topic - Semantic search by topic
 * - GET /api/rag/document/:docId - Get document details
 * - POST /api/rag/feedback/:queryId - Rate citation relevance
 */

import { Router, Response } from 'express';
import { verifyJWT } from '../middleware/auth';
import { sanitizeInput } from '../utils/sanitization';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types/index';
import { getRAGDocumentService } from '../services/ragDocumentService';
import { getVectorStoreService } from '../services/vectorStoreService';
import { getCitationService } from '../services/citationService';

const router = Router();

// Helper validation function
interface ValidationResult {
  isValid: boolean;
  value: string;
  error?: string;
}

function validateString(input: string, minLength: number, maxLength: number): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, value: input, error: 'Input must be a non-empty string' };
  }
  if (input.length < minLength) {
    return { isValid: false, value: input, error: `Minimum length is ${minLength}` };
  }
  if (input.length > maxLength) {
    return { isValid: false, value: input, error: `Maximum length is ${maxLength}` };
  }
  return { isValid: true, value: sanitizeInput(input) };
}

/**
 * POST /api/rag/documents/ingest
 * Upload and index a new document
 */
router.post('/documents/ingest', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, authors, publicationYear, category, tags, content, filePath, isbn } = req.body;

    // Validate input
    const titleValidation = validateString(title, 3, 500);
    if (!titleValidation.isValid) {
      res.status(400).json({
        success: false,
        message: `Invalid title: ${titleValidation.error}`
      });
      return;
    }

    if (!Array.isArray(authors) || authors.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one author is required'
      });
      return;
    }

    if (!Number.isInteger(publicationYear) || publicationYear < 1900) {
      res.status(400).json({
        success: false,
        message: 'Invalid publication year'
      });
      return;
    }

    const categoryValidation = validateString(category, 2, 100);
    if (!categoryValidation.isValid) {
      res.status(400).json({
        success: false,
        message: `Invalid category: ${categoryValidation.error}`
      });
      return;
    }

    if (!content || typeof content !== 'string' || content.length < 100) {
      res.status(400).json({
        success: false,
        message: 'Document content must be at least 100 characters'
      });
      return;
    }

    // Process document
    const documentService = getRAGDocumentService();
    const vectorService = getVectorStoreService();

    // Load book
    const doc = await documentService.loadBook(filePath || 'uploaded_document', {
      title: titleValidation.value,
      authors: authors.map(a => sanitizeInput(a)),
      publicationYear,
      isbn: isbn ? sanitizeInput(isbn) : undefined,
      category: categoryValidation.value,
      tags: tags ? tags.map((t: string) => sanitizeInput(t)) : []
    });

    // Generate embeddings for chunks
    const chunks = documentService.getChunks(doc.id);
    const embeddings = await vectorService.batchEmbed(
      chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.content
      }))
    );

    // Store embeddings in vector database
    for (const embedding of embeddings) {
      const chunk = chunks.find(c => c.id === embedding.chunkId);
      if (chunk) {
        await vectorService.storeEmbedding(embedding.chunkId, embedding.vector, {
          documentId: doc.id,
          documentTitle: doc.title,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          sectionTitle: chunk.sectionTitle,
          wordCount: chunk.metadata.wordCount
        });
      }
    }

    logger.info('Document ingested successfully', {
      context: 'rag.ingest',
      metadata: {
        documentId: doc.id,
        title: doc.title,
        chunkCount: doc.chunkCount,
        embeddings: embeddings.length
      }
    });

    res.status(200).json({
      success: true,
      data: {
        documentId: doc.id,
        title: doc.title,
        chunkCount: doc.chunkCount,
        embeddingModel: doc.vectorModel,
        message: `Successfully ingested "${doc.title}" with ${doc.chunkCount} chunks and ${embeddings.length} embeddings`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to ingest document', {
      context: 'rag.ingest',
      metadata: { error: message }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to ingest document'
    });
  }
});

/**
 * GET /api/rag/documents
 * List all indexed documents
 */
router.get('/documents', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documentService = getRAGDocumentService();
    const documents = documentService.getDocuments();

    res.status(200).json({
      success: true,
      data: {
        count: documents.length,
        documents: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          authors: doc.authors,
          publicationYear: doc.publicationYear,
          category: doc.category,
          tags: doc.tags,
          chunkCount: doc.chunkCount,
          indexedAt: doc.indexedAt
        }))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to list documents', {
      context: 'rag.list',
      metadata: { error: message }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to list documents'
    });
  }
});

/**
 * POST /api/rag/query
 * Query knowledge base and return results with citations
 */
router.post('/query', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { query, topK = 5, minSimilarity = 0.6, citationStyle = 'APA' } = req.body;

    const queryValidation = validateString(query, 5, 500);
    if (!queryValidation.isValid) {
      res.status(400).json({
        success: false,
        message: `Invalid query: ${queryValidation.error}`
      });
      return;
    }

    const vectorService = getVectorStoreService();
    const documentService = getRAGDocumentService();
    const citationService = getCitationService();

    // Perform semantic search
    const searchResults = await vectorService.semanticSearch(
      queryValidation.value,
      topK,
      minSimilarity
    );

    // Get document metadata and citations
    const citedResults = searchResults.map(result => {
      const doc = documentService.getDocument(result.documentId);
      const citation = citationService.getCitationByChunk(result.chunkId);

      return {
        chunkId: result.chunkId,
        content: result.content,
        similarity: result.similarity,
        document: {
          id: result.documentId,
          title: result.documentTitle,
          authors: doc?.authors || [],
          publicationYear: doc?.publicationYear
        },
        citation: citation ? {
          formatted: citation.formattedText[citationStyle as 'APA' | 'Chicago' | 'Harvard'] ||
                     citation.formattedText.APA,
          style: citationStyle
        } : null
      };
    });

    logger.info('Query executed successfully', {
      context: 'rag.query',
      metadata: {
        query: queryValidation.value.substring(0, 50),
        resultsCount: citedResults.length,
        minSimilarity
      }
    });

    res.status(200).json({
      success: true,
      data: {
        query: queryValidation.value,
        resultsCount: citedResults.length,
        results: citedResults
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to execute query', {
      context: 'rag.query',
      metadata: { error: message }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to execute query'
    });
  }
});

/**
 * GET /api/rag/search/:topic
 * Semantic search by topic
 */
router.get('/search/:topic', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic } = req.params;
    const { topK = 5, minSimilarity = 0.6 } = req.query;

    const topicValidation = validateString(topic, 2, 100);
    if (!topicValidation.isValid) {
      res.status(400).json({
        success: false,
        message: `Invalid topic: ${topicValidation.error}`
      });
      return;
    }

    const vectorService = getVectorStoreService();
    const results = await vectorService.semanticSearch(
      topicValidation.value,
      parseInt(topK as string) || 5,
      parseFloat(minSimilarity as string) || 0.6
    );

    res.status(200).json({
      success: true,
      data: {
        topic: topicValidation.value,
        resultsCount: results.length,
        results: results.slice(0, 5).map(r => ({
          chunkId: r.chunkId,
          documentTitle: r.documentTitle,
          similarity: r.similarity,
          preview: r.content.substring(0, 200) + '...'
        }))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to search topic', {
      context: 'rag.search',
      metadata: { error: message, topic: req.params.topic }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to search topic'
    });
  }
});

/**
 * GET /api/rag/document/:docId
 * Get document details
 */
router.get('/document/:docId', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { docId } = req.params;

    const documentService = getRAGDocumentService();
    const document = documentService.getDocument(docId);

    if (!document) {
      res.status(404).json({
        success: false,
        message: 'Document not found'
      });
      return;
    }

    const chunks = documentService.getChunks(docId);

    res.status(200).json({
      success: true,
      data: {
        id: document.id,
        title: document.title,
        authors: document.authors,
        publicationYear: document.publicationYear,
        isbn: document.isbn,
        category: document.category,
        tags: document.tags,
        chunkCount: document.chunkCount,
        vectorModel: document.vectorModel,
        indexedAt: document.indexedAt,
        chunks: chunks.slice(0, 10).map(c => ({
          id: c.id,
          index: c.chunkIndex,
          preview: c.content.substring(0, 150) + '...',
          wordCount: c.metadata.wordCount
        }))
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get document', {
      context: 'rag.document',
      metadata: { error: message, docId: req.params.docId }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get document'
    });
  }
});

/**
 * POST /api/rag/feedback/:queryId
 * Rate citation relevance (for improving RAG performance)
 */
router.post('/feedback/:queryId', verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { queryId } = req.params;
    const { rating, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
      return;
    }

    logger.info('RAG feedback recorded', {
      context: 'rag.feedback',
      metadata: {
        queryId,
        rating,
        hasComment: !!comment
      }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Feedback recorded successfully',
        queryId,
        rating
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to record feedback', {
      context: 'rag.feedback',
      metadata: { error: message }
    });
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback'
    });
  }
});

/**
 * GET /api/rag/health
 * RAG service health check
 */
router.get('/health', async (req, res: Response) => {
  try {
    const vectorService = getVectorStoreService();
    const stats = await vectorService.getStats();

    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        service: 'RAG',
        vectorStore: {
          collectionName: stats.collectionName,
          vectorDimension: stats.vectorDimension,
          pointCount: stats.pointCount
        },
        embeddingModel: 'text-embedding-3-small'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('RAG health check failed', {
      context: 'rag.health',
      metadata: { error: message }
    });
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'RAG service unhealthy'
    });
  }
});

export default router;
