/**
 * RAG Integration Service - High-level RAG Orchestration
 *
 * Coordinates semantic search, KB retrieval, and Coach Vitalis integration
 * to provide evidence-based recommendations and answers.
 *
 * Features:
 * - Query with biometric context
 * - KB evidence retrieval
 * - Decision validation
 * - Topic summaries
 * - Trending topics detection
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { SemanticSearchService, SearchResult } from './semanticSearchService';
import {
  KBToCoachVitalisBridgeService,
  RecommendationWithEvidence,
  ActionRecommendation,
  BiometricContext,
  ValidationResult
} from './kbToCoachVitalisBridgeService';
import { QueryDecompositionService } from './queryDecompositionService';
import { ResultRerankingService, RankingFactorType } from './resultRerankingService';
import { QueryCacheService } from './queryCacheService';
import { QueryOptimizationService } from './queryOptimizationService';
import { FeedbackLearningService } from './feedbackLearningService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RAGResponse {
  query: string;
  answer: string;
  sources: SearchResult[];
  citations: Array<{
    sourceBook: string;
    excerpt: string;
    relevanceScore: number;
  }>;
  confidence: number;
  relatedTopics: string[];
  timestamp: Date;
}

export interface KBSummary {
  topic: string;
  summary: string;
  keyPoints: string[];
  relatedChapters: SearchResult[];
  confidence: number;
}

export interface TrendingTopic {
  topic: string;
  mentionCount: number;
  relevanceScore: number;
  relatedBooks: string[];
}

// ============================================================================
// RAG INTEGRATION SERVICE
// ============================================================================

export class RAGIntegrationService {
  private db: DatabaseType;
  private searchService: SemanticSearchService;
  private bridgeService: KBToCoachVitalisBridgeService;
  private decompositionService: QueryDecompositionService;
  private rerankingService: ResultRerankingService;
  private cacheService: QueryCacheService;
  private optimizationService: QueryOptimizationService;
  private feedbackService: FeedbackLearningService;

  constructor(
    searchService: SemanticSearchService,
    bridgeService: KBToCoachVitalisBridgeService,
    decompositionService?: QueryDecompositionService,
    rerankingService?: ResultRerankingService,
    cacheService?: QueryCacheService,
    optimizationService?: QueryOptimizationService,
    feedbackService?: FeedbackLearningService,
    dbPath?: string
  ) {
    this.db = getDatabase();
    this.searchService = searchService;
    this.bridgeService = bridgeService;
    this.decompositionService = decompositionService || new QueryDecompositionService();
    this.rerankingService = rerankingService || new ResultRerankingService();
    this.cacheService = cacheService || new QueryCacheService();
    this.optimizationService = optimizationService || new QueryOptimizationService();
    this.feedbackService = feedbackService || new FeedbackLearningService();
  }

  /**
   * Main RAG query method with biometric context
   * @param userId - User ID
   * @param query - User question/query
   * @param context - Optional biometric context
   * @returns RAG response with sources and citations
   */
  async queryWithContext(
    userId: string,
    query: string,
    context: BiometricContext | undefined = undefined
  ): Promise<RAGResponse> {
    try {
      // Retrieve relevant documents using hybrid search (Vector + Keywords)
      const sources = await this.searchService.hybridSearch(query, 10, 0.4);
      
      if (!sources || sources.length === 0) {
        return {
          query,
          answer: 'No relevant information found in the knowledge base.',
          sources: [],
          citations: [],
          confidence: 0,
          relatedTopics: [],
          timestamp: new Date()
        };
      }

      // Generate answer from top sources
      const answer = this.generateAnswerFromSources(sources);

      // Generate citations
      const citations = sources.slice(0, 5).map(source => ({
        sourceBook: source.bookTitle,
        excerpt: `${source.content.substring(0, 150)  }...`,
        relevanceScore: source.relevanceScore
      }));

      // Extract related topics from sources
      const relatedTopics = this.extractRelatedTopics(sources);

      // Calculate confidence based on source quality
      const confidence = Math.round(
        (sources[0].relevanceScore + sources[1]?.relevanceScore || 0) / 2 * 100
      );

      const response: RAGResponse = {
        query,
        answer,
        sources: sources || [],
        citations,
        confidence,
        relatedTopics,
        timestamp: new Date()
      };

      // Log the query
      await this.logRAGQuery(userId, query, sources.length, confidence);

      logger.info('RAG query completed', {
        context: 'rag-integration',
        metadata: {
          userId,
          query: query.substring(0, 50),
          sourcesCount: sources.length,
          confidence
        }
      });

      return response;
    } catch (error) {
      logger.error('RAG query failed', {
        context: 'rag-integration',
        metadata: {
          userId,
          query,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Advanced query with optimization, decomposition, caching, and re-ranking
   * @param userId - User ID
   * @param query - User question/query
   * @param context - Optional biometric context
   * @returns RAG response with advanced features
   */
  async queryWithAdvancedRAG(
    userId: string,
    query: string,
    context: BiometricContext | undefined = undefined
  ): Promise<RAGResponse & { decompositionUsed: boolean; cacheHit: boolean; executionTimeMs: number }> {
    const startTime = Date.now();

    try {
      // Step 1: Check cache first
      let sources = await this.cacheService.getCachedResults(query);
      const cacheHit = Boolean(sources);
      
      if (!sources) {
        sources = [];
      }

      if (!cacheHit) {
        // Step 2: Optimize query (expansion, context filtering)
        const optimized = await this.optimizationService.expandQuery(query);
        const optimizedQuery = optimized.expanded;

        logger.debug('Query optimized', {
          context: 'rag-advanced',
          metadata: {
            original: query,
            expanded: optimizedQuery,
            intent: optimized.intent
          }
        });

        // Step 3: Check if decomposition is needed
        const shouldDecompose = this.decompositionService.shouldDecompose(optimizedQuery);
        let decompositionUsed = false;

        if (shouldDecompose) {
          // Decompose and search sub-queries in parallel
          const decomposed = await this.decompositionService.decomposeQuery(optimizedQuery);
          decompositionUsed = true;

          logger.debug('Query decomposed', {
            context: 'rag-advanced',
            metadata: {
              subQueriesCount: decomposed.subQueries.length,
              aggregationStrategy: decomposed.aggregationStrategy
            }
          });

          // Search sub-queries in parallel
          const subResults = await Promise.all(
            decomposed.subQueries.map(subQuery =>
              this.searchService.search(subQuery.query, 10 * subQuery.weight, 0.5)
            )
          );

          // Aggregate results
          const aggregatedResults = await this.decompositionService.aggregateResults(
            new Map(subResults.map((results, idx) => [idx.toString(), results])),
            decomposed.aggregationStrategy
          );

          // Convert AggregatedResult to SearchResult
          sources = aggregatedResults.map(aggResult => ({
            chunkId: aggResult.chunkId,
            bookId: 'unknown',
            bookTitle: 'Unknown Source',
            authors: ['Unknown'],
            category: 'general',
            content: aggResult.content,
            relevanceScore: aggResult.relevanceScore,
            keyTerms: [],
            vectorId: 'aggregated'
          })).slice(0, 15);
        } else {
          // Single query hybrid search
          sources = await this.searchService.hybridSearch(optimizedQuery, 10, 0.4);
          if (!sources) {
            sources = [];
          }
        }

        // Step 4: Re-rank results
        if (sources && sources.length > 0) {
          // Convert SearchResult to format expected by rerankResults
          const searchResultsForReranking = sources.map(source => ({
            chunkId: source.chunkId,
            content: source.content,
            score: source.relevanceScore,
            createdAt: undefined,
            updatedAt: undefined,
            viewCount: undefined,
            citationCount: undefined,
            isAuthoritative: undefined,
            complexity: undefined
          }));

          const ranked = await this.rerankingService.rerankResults(searchResultsForReranking, query, {
            factors: ['relevance', 'recency', 'authority'],
            weights: { relevance: 0.5, recency: 0.15, authority: 0.15, clarity: 0.1, completeness: 0.1, bioContext: 0 },
            bioContext: context ? {
              hrv: context.hrv || 0,
              hrvBaseline: context.hrv || 0,
              rhr: context.rhr || 0,
              rhrBaseline: context.rhr || 0,
              stressLevel: context.stressLevel || 0,
              sleepDuration: context.sleepDuration || 0,
              synergisticLoad: 0 // Default value since it's not in the BiometricContext interface
            } : undefined
          });

          // Convert RankedResult to SearchResult
          sources = ranked.map(rankedResult => ({
            chunkId: rankedResult.chunkId,
            bookId: 'unknown',
            bookTitle: 'Unknown Source',
            authors: ['Unknown'],
            category: 'general',
            content: rankedResult.content,
            relevanceScore: rankedResult.finalScore,
            keyTerms: [],
            vectorId: 'reranked'
          }));
        }

        // Step 5: Cache the results
        await this.cacheService.setCachedResults(query, sources, 3600000); // 1 hour TTL
      }

      if (sources.length === 0) {
        return {
          query,
          answer: 'No relevant information found in the knowledge base.',
          sources: [],
          citations: [],
          confidence: 0,
          relatedTopics: [],
          timestamp: new Date(),
          decompositionUsed: false,
          cacheHit,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Generate answer and citations
      const answer = this.generateAnswerFromSources(sources);
      const citations = sources.slice(0, 5).map(source => ({
        sourceBook: source.bookTitle,
        excerpt: `${source.content.substring(0, 150)  }...`,
        relevanceScore: source.relevanceScore
      }));

      const relatedTopics = this.extractRelatedTopics(sources);
      const confidence = Math.round(
        (sources[0].relevanceScore + sources[1]?.relevanceScore || 0) / 2 * 100
      );

      const executionTimeMs = Date.now() - startTime;

      const response = {
        query,
        answer,
        sources: sources || [],
        citations,
        confidence,
        relatedTopics,
        timestamp: new Date(),
        decompositionUsed: false,
        cacheHit,
        executionTimeMs
      };

      // Log the query
      await this.logRAGQuery(userId, query, sources.length, confidence);

      logger.info('Advanced RAG query completed', {
        context: 'rag-advanced',
        metadata: {
          userId,
          query: query.substring(0, 50),
          sourcesCount: sources.length,
          confidence,
          cacheHit,
          executionTimeMs
        }
      });

      return response;
    } catch (error) {
      logger.error('Advanced RAG query failed', {
        context: 'rag-advanced',
        metadata: {
          userId,
          query,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Get evidence-based recommendation
   * @param userId - User ID
   * @param decisionType - Type of coaching decision
   * @param context - Biometric context
   * @returns Recommendation with KB evidence
   */
  async getEvidenceBasedRecommendation(
    userId: string,
    decisionType: string,
    context: BiometricContext
  ): Promise<RecommendationWithEvidence> {
    try {
      // Create a mock recommendation based on context
      const recommendation: ActionRecommendation = {
        id: `rec-${Date.now()}`,
        userId,
        actionType: 'training_adjustment',
        title: `Optimize training for ${decisionType}`,
        description: this.generateRecommendationDescription(context),
        expectedBenefit: 'Improved performance and recovery',
        intensity: 'medium',
        confidence: 75,
        createdAt: new Date()
      };

      // Enhance with KB evidence
      const enhanced = await this.bridgeService.enhanceRecommendationWithEvidence(
        recommendation
      );

      logger.info('Evidence-based recommendation generated', {
        context: 'rag-integration',
        metadata: {
          userId,
          decisionType,
          evidenceCount: enhanced.evidence.length,
          boostedConfidence: enhanced.boostedConfidence
        }
      });

      return enhanced;
    } catch (error) {
      logger.error('Failed to get evidence-based recommendation', {
        context: 'rag-integration',
        metadata: {
          userId,
          decisionType,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Generate KB summary for a topic
   * @param userId - User ID
   * @param topic - Topic to summarize
   * @returns Summary with key points and related chapters
   */
  async generateKBSummaryForUser(
    userId: string,
    topic: string
  ): Promise<KBSummary> {
    try {
      // Search for relevant documents using hybrid search
      const documents = await this.searchService.hybridSearch(topic, 5, 0.5);

      if (documents.length === 0) {
        return {
          topic,
          summary: 'No information found for this topic.',
          keyPoints: [],
          relatedChapters: [],
          confidence: 0
        };
      }

      // Generate summary
      const summary = this.generateSummaryFromDocuments(documents);

      // Extract key points
      const keyPoints = this.extractKeyPointsFromDocuments(documents);

      // Calculate confidence
      const avgRelevance = documents.reduce((sum, d) => sum + d.relevanceScore, 0) / documents.length;
      const confidence = Math.round(avgRelevance * 100);

      const result: KBSummary = {
        topic,
        summary,
        keyPoints,
        relatedChapters: documents,
        confidence
      };

      logger.info('KB summary generated', {
        context: 'rag-integration',
        metadata: {
          userId,
          topic,
          documentCount: documents.length,
          confidence
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate KB summary', {
        context: 'rag-integration',
        metadata: {
          userId,
          topic,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Validate coaching decision against KB
   * @param userId - User ID
   * @param decision - Decision/recommendation to validate
   * @returns Validation result with evidence
   */
  async validateDecisionAgainstKB(
    userId: string,
    decision: ActionRecommendation
  ): Promise<ValidationResult> {
    try {
      const validation = await this.bridgeService.validateRecommendationAgainstKB(
        decision
      );

      logger.info('Decision validation completed', {
        context: 'rag-integration',
        metadata: {
          userId,
          decisionId: decision.id,
          isValid: validation.isValid,
          confidenceLevel: validation.confidenceLevel
        }
      });

      return validation;
    } catch (error) {
      logger.error('Failed to validate decision', {
        context: 'rag-integration',
        metadata: {
          userId,
          decisionId: decision.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Get trending topics in the KB
   * @param days - Number of days to look back (default: 30)
   * @returns List of trending topics
   */
  async getTrendingTopics(days: number = 30): Promise<TrendingTopic[]> {
    try {
      // Get frequently searched topics from logs
      const queryLogs = this.db
        .prepare(
          `
        SELECT 
          query,
          COUNT(*) as mentionCount,
          AVG(CAST(relevanceScore as FLOAT)) as avgRelevance
        FROM rag_queries
        WHERE createdAt > datetime('now', ? || ' days')
        GROUP BY query
        ORDER BY mentionCount DESC
        LIMIT 10
        `
        )
        .all(`-${days}`) as any[];

      const trendingTopics: TrendingTopic[] = [];

      for (const log of queryLogs) {
        // Search for books related to each query
        const results = await this.searchService.search(log.query, 5, 0.6);

        const uniqueBooks = [...new Set(results.map(r => r.bookTitle))];

        trendingTopics.push({
          topic: log.query,
          mentionCount: log.mentionCount,
          relevanceScore: log.avgRelevance || 0.7,
          relatedBooks: uniqueBooks
        });
      }

      logger.info('Trending topics retrieved', {
        context: 'rag-integration',
        metadata: {
          topicsCount: trendingTopics.length,
          daysLookback: days
        }
      });

      return trendingTopics;
    } catch (error) {
      logger.error('Failed to get trending topics', {
        context: 'rag-integration',
        metadata: {
          days,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return [];
    }
  }

  /**
   * Close service and cleanup
   */
  async close(): Promise<void> {
    try {
      await this.bridgeService.close();
      if (this.db) {
        this.db.close();
      }
      logger.info('RAG integration service closed', {
        context: 'rag-integration'
      });
    } catch (error) {
      logger.error('Error closing RAG service', {
        context: 'rag-integration',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  // =========================================================================
  // PRIVATE HELPER METHODS
  // =========================================================================

  /**
   * Generate answer from search results
   */
  private generateAnswerFromSources(sources: SearchResult[]): string {
    if (sources.length === 0) return 'No se encontró información relevante en la base de conocimiento.';

    const topSource = sources[0];
    const otherSources = sources.slice(1, 3);

    let answer = `De acuerdo con la base de conocimiento Spartan (específicamente "${topSource.bookTitle}"), `;

    // Attempt to make a more natural synthesis
    const content = topSource.content.trim();
    const firstPeriod = content.indexOf('.');
    const firstSentence = firstPeriod !== -1 ? content.substring(0, firstPeriod + 1) : `${content.substring(0, 200)  }...`;

    answer += `${firstSentence}`;

    if (otherSources.length > 0) {
      answer += ` Además, se han encontrado referencias complementarias en "${otherSources[0].bookTitle}" que sugieren un enfoque integrado en ${otherSources[0].keyTerms.slice(0, 2).join(' y ')}.`;
    }

    answer += ' Esta información se considera altamente relevante para tu consulta sobre el rendimiento y la salud bio-fisiológica.';

    return answer;
  }

  /**
   * Extract related topics from search results
   */
  private extractRelatedTopics(sources: SearchResult[]): string[] {
    const topics = new Set<string>();

    sources.forEach(source => {
      if (source.keyTerms) {
        source.keyTerms.slice(0, 2).forEach(term => topics.add(term));
      }
      if (source.chapterTitle) {
        topics.add(source.chapterTitle);
      }
    });

    return Array.from(topics).slice(0, 5);
  }

  /**
   * Generate recommendation description based on context
   */
  private generateRecommendationDescription(context: BiometricContext): string {
    const issues: string[] = [];

    if (context.hrv < context.hrvBaseline * 0.8) {
      issues.push('low HRV');
    }
    if (context.rhr > context.rhrBaseline * 1.1) {
      issues.push('elevated resting heart rate');
    }
    if (context.stressLevel > 70) {
      issues.push('high stress');
    }
    if (context.sleepDuration < 7) {
      issues.push('insufficient sleep');
    }

    return issues.length > 0
      ? `Address ${issues.join(', ')} to optimize training`
      : 'Maintain current training approach';
  }

  /**
   * Generate summary from documents
   */
  private generateSummaryFromDocuments(documents: SearchResult[]): string {
    if (documents.length === 0) return '';

    const books = [...new Set(documents.map(d => d.bookTitle))];
    const summary = `This topic is covered in ${books.join(', ')} with emphasis on ${documents[0].keyTerms?.[0] || 'key concepts'}.`;

    return summary;
  }

  /**
   * Advanced RAG query with decomposition, re-ranking, and caching
   * - Checks cache first
   * - Decomposes complex queries
   * - Executes in parallel
   * - Applies re-ranking
   * - Returns detailed metadata
   */
  async advancedQuery(
    userId: string,
    query: string,
    context?: BiometricContext,
    options?: {
      decompose?: boolean;
      useCache?: boolean;
      rankingFactors?: RankingFactorType[];
      topK?: number;
    }
  ): Promise<{
    results: SearchResult[];
    decomposed: boolean;
    cacheHit: boolean;
    executionTimeMs: number;
    rankingFactors: Record<string, number>;
  }> {
    const startTime = Date.now();
    const opts = {
      decompose: true,
      useCache: true,
      rankingFactors: ['relevance', 'recency', 'authority'] as RankingFactorType[],
      topK: 10,
      ...options
    };

    try {
      // 1. Check cache first
      let cachedResults = null;
      if (opts.useCache) {
        cachedResults = await this.cacheService.getCachedResults(query);
      }

      if (cachedResults) {
        logger.info('Cache hit for advanced query', {
          context: 'rag-advanced',
          metadata: { query, resultCount: cachedResults.length }
        });

        return {
          results: cachedResults,
          decomposed: false,
          cacheHit: true,
          executionTimeMs: Date.now() - startTime,
          rankingFactors: {}
        };
      }

      // 2. Optimize query
      const optimizedQuery = await this.optimizationService.expandQuery(query);

      // 3. Decompose if needed
      let subQueries: Array<{ query: string; weight: number }> = [];
      let isDecomposed = false;

      if (opts.decompose) {
        const decomposed = await this.decompositionService.decomposeQuery(optimizedQuery.expanded);
        // Check if we have more than one sub-query to determine if it's complex
        if (decomposed.subQueries.length > 1) {
          subQueries = decomposed.subQueries.map(sq => ({
            query: sq.query,
            weight: sq.weight
          }));
          isDecomposed = true;
        } else {
          subQueries = [{ query: optimizedQuery.expanded, weight: 1.0 }];
        }
      } else {
        subQueries = [{ query: optimizedQuery.expanded, weight: 1.0 }];
      }

      // 4. Execute searches in parallel
      const searchPromises = subQueries.map(sq =>
        this.searchService.hybridSearch(sq.query, opts.topK || 10, 0.4)
          .catch(err => {
            logger.warn('Sub-query search failed', {
              context: 'rag-advanced',
              metadata: { query: sq.query, error: err instanceof Error ? err.message : String(err) }
            });
            return [];
          })
      );

      const searchResults = await Promise.all(searchPromises);

      // 5. Aggregate results
      const allResults = new Map<string, SearchResult>();
      searchResults.forEach((results, idx) => {
        results.forEach(r => {
          const key = r.chunkId || JSON.stringify(r);
          if (!allResults.has(key)) {
            allResults.set(key, r);
          }
        });
      });

      const aggregatedResults = Array.from(allResults.values());

      // 6. Apply re-ranking
      const rerankingWeights = opts.rankingFactors.reduce((acc, factor) => {
        acc[factor] = 1 / opts.rankingFactors.length;
        return acc;
      }, {} as Record<string, number>);

      // Convert SearchResult to format expected by rerankResults
      const searchResultsForReranking = aggregatedResults.map(source => ({
        chunkId: source.chunkId,
        content: source.content,
        score: source.relevanceScore,
        createdAt: undefined,
        updatedAt: undefined,
        viewCount: undefined,
        citationCount: undefined,
        isAuthoritative: undefined,
        complexity: undefined
      }));

      const rankedResults = await this.rerankingService.rerankResults(
        searchResultsForReranking,
        optimizedQuery.expanded,
        {
          factors: opts.rankingFactors || [],
          weights: rerankingWeights,
          normalize: true
        }
      );

      // Convert RankedResult to SearchResult
      const finalResults = rankedResults.slice(0, opts.topK).map(rankedResult => ({
        chunkId: rankedResult.chunkId,
        bookId: 'unknown',
        bookTitle: 'Unknown Source',
        authors: ['Unknown'],
        category: 'general',
        content: rankedResult.content,
        relevanceScore: rankedResult.finalScore,
        keyTerms: [],
        vectorId: 'reranked'
      }));

      // 7. Cache results
      if (opts.useCache) {
        await this.cacheService.setCachedResults(query, finalResults, 3600); // 1 hour TTL
      }

      logger.info('Advanced query executed', {
        context: 'rag-advanced',
        metadata: {
          query,
          decomposed: isDecomposed,
          subQueryCount: subQueries.length,
          resultCount: finalResults.length,
          executionTimeMs: Date.now() - startTime
        }
      });

      return {
        results: finalResults,
        decomposed: isDecomposed,
        cacheHit: false,
        executionTimeMs: Date.now() - startTime,
        rankingFactors: rerankingWeights
      };
    } catch (error) {
      logger.error('Advanced query failed', {
        context: 'rag-advanced',
        metadata: {
          userId,
          query,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Extract key points from documents
   */
  private extractKeyPointsFromDocuments(documents: SearchResult[]): string[] {
    const keyPoints = new Set<string>();

    documents.forEach(doc => {
      if (doc.keyTerms) {
        doc.keyTerms.forEach(term => keyPoints.add(term));
      }
    });

    return Array.from(keyPoints).slice(0, 5);
  }

  /**
   * Log RAG query to database
   */
  private async logRAGQuery(
    userId: string,
    query: string,
    resultsCount: number,
    confidence: number
  ): Promise<void> {
    try {
      const queryId = `rag-${Date.now()}`;

      this.db
        .prepare(
          `
        INSERT OR IGNORE INTO rag_queries (id, userId, query, resultsCount, confidence, createdAt)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        `
        )
        .run(queryId, userId, query, resultsCount, confidence);
    } catch (error) {
      logger.warn('Failed to log RAG query', {
        context: 'rag-integration',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}

export default RAGIntegrationService;
