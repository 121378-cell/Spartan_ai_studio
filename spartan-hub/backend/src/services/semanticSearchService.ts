/**
 * Semantic Search Service - Advanced Vector & Hybrid Querying
 *
 * Coordinates real semantic search via VectorStoreService
 * and combines it with SQLite Full-Text Search.
 */

import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';
import { getVectorStoreService, VectorStoreService } from './vectorStoreService';

export interface SearchResult {
  chunkId: string;
  bookId: string;
  bookTitle: string;
  authors: string[];
  category: string;
  content: string;
  chapterNumber?: number;
  chapterTitle?: string;
  relevanceScore: number;
  keyTerms: string[];
  vectorId: string;
}

export interface SearchFilters {
  category?: string;
  bookId?: string;
  minRelevance?: number;
  tags?: string[];
}

export class SemanticSearchService {
  private vectorStore: VectorStoreService;
  private db: any;

  constructor() {
    this.vectorStore = getVectorStoreService();
    this.db = getDatabase();
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    logger.info('SemanticSearchService initialized', { context: 'semantic-search' });
  }

  /**
   * Perform advanced search with filters
   */
  async advancedSearch(query: string, filters: any, topK: number = 10): Promise<SearchResult[]> {
    // Basic implementation delegating to hybridSearch for now
    return this.hybridSearch(query, topK);
  }

  /**
   * Batch search multiple queries
   */
  async batchSearch(queries: string[], topK: number = 5): Promise<SearchResult[][]> {
    return Promise.all(queries.map(q => this.hybridSearch(q, topK)));
  }

  /**
   * Get similar chunks for a specific chunk ID
   */
  async getSimilarChunks(chunkId: string, topK: number = 5): Promise<SearchResult[]> {
    // Stub implementation
    return [];
  }

  /**
   * Get search performance statistics
   */
  getSearchStats(): any {
    return {
      status: 'active',
      provider: 'qdrant+sqlite'
    };
  }

  /**
   * Close service
   */
  async close(): Promise<void> {
    logger.info('SemanticSearchService closed', { context: 'semantic-search' });
  }

  /**
   * Search using real vector similarity
   */
  async search(query: string, topK: number = 10, threshold: number = 0.5): Promise<SearchResult[]> {
    try {
      const sanitizedQuery = sanitizeInput(query);
      if (!sanitizedQuery) return [];

      const vectorResults = await this.vectorStore.semanticSearch(sanitizedQuery, topK, threshold);
      
      // Enrich results with database metadata
      const enrichedResults: SearchResult[] = [];
      for (const res of vectorResults) {
        const chunk = this.db.prepare(`
          SELECT c.*, b.title, b.authors, b.category
          FROM kb_chunks c
          JOIN kb_books b ON c.bookId = b.id
          WHERE c.id = ?
        `).get(res.chunkId) as any;

        if (chunk) {
          enrichedResults.push({
            chunkId: chunk.id,
            bookId: chunk.bookId,
            bookTitle: chunk.title,
            authors: chunk.authors ? chunk.authors.split(',') : [],
            category: chunk.category,
            content: chunk.content,
            chapterNumber: chunk.chapterNumber,
            chapterTitle: chunk.chapterTitle,
            relevanceScore: res.similarity,
            keyTerms: chunk.keyTerms ? chunk.keyTerms.split(',') : [],
            vectorId: res.chunkId
          });
        }
      }

      return enrichedResults;
    } catch (error) {
      logger.error('Semantic search failed', { metadata: { error: String(error), query } });
      return [];
    }
  }

  /**
   * Perform keyword search in SQLite
   */
  async keywordSearch(query: string, topK: number = 10): Promise<SearchResult[]> {
    try {
      const sanitizedQuery = sanitizeInput(query);
      const results = this.db.prepare(`
        SELECT c.*, b.title, b.authors, b.category
        FROM kb_chunks c
        JOIN kb_books b ON c.bookId = b.id
        WHERE c.content LIKE ? OR b.title LIKE ?
        LIMIT ?
      `).all(`%${sanitizedQuery}%`, `%${sanitizedQuery}%`, topK) as any[];

      return results.map(chunk => ({
        chunkId: chunk.id,
        bookId: chunk.bookId,
        bookTitle: chunk.title,
        authors: chunk.authors ? chunk.authors.split(',') : [],
        category: chunk.category,
        content: chunk.content,
        chapterNumber: chunk.chapterNumber,
        chapterTitle: chunk.chapterTitle,
        relevanceScore: 0.7, // Base score for keyword match
        keyTerms: chunk.keyTerms ? chunk.keyTerms.split(',') : [],
        vectorId: 'keyword'
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Advanced Hybrid Search (RRF - Reciprocal Rank Fusion)
   */
  async hybridSearch(query: string, topK: number = 10, threshold: number = 0.4): Promise<SearchResult[]> {
    const [vectorResults, keywordResults] = await Promise.all([
      this.search(query, topK * 2, threshold),
      this.keywordSearch(query, topK)
    ]);

    const k = 60; // RRF constant
    const scores = new Map<string, { res: SearchResult; score: number }>();

    vectorResults.forEach((res, i) => {
      scores.set(res.chunkId, { res, score: 1 / (k + i + 1) });
    });

    keywordResults.forEach((res, i) => {
      const existing = scores.get(res.chunkId);
      const rrfScore = 1 / (k + i + 1);
      if (existing) {
        existing.score += rrfScore;
        existing.res.relevanceScore = (existing.res.relevanceScore + 0.8) / 2;
      } else {
        scores.set(res.chunkId, { res, score: rrfScore });
      }
    });

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => s.res);
  }
}

export default SemanticSearchService;
