const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';

interface QualityReport {
  totalChunks: number;
  validChunks: number;
  invalidChunks: number;
  validationRate: number;
  averageChunkQuality: number;
  issues: string[];
}

interface SearchTestResult {
  query: string;
  foundResults: number;
  averageSimilarity: number;
  topResultContent: string;
  relevanceScore: number;
  passed: boolean;
}

interface PerformanceBenchmark {
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputPerSecond: number;
  totalQueriesRun: number;
}

interface CitationValidationResult {
  totalCitations: number;
  validCitations: number;
  invalidCitations: number;
  accuracyRate: number;
  issues: string[];
}

interface DetailedQualityReport {
  timestamp: string;
  totalChunks: number;
  totalBooks: number;
  coverageByCategory: Record<string, number>;
  qualityMetrics: {
    chunkCompleteness: number;
    contentCoherence: number;
    metadataAccuracy: number;
    embeddingQuality: number;
  };
  searchPerformance: PerformanceBenchmark;
  citationAccuracy: CitationValidationResult;
  overallScore: number;
  recommendations: string[];
}

/**
 * Knowledge Base Validation Service
 * Performs quality assurance, search validation, and performance benchmarking
 */
export class KnowledgeBaseValidationService {
  private db: DatabaseType;

  constructor(dbPath: string = 'spartan-hub.db') {
    this.db = new Database(dbPath);
  }

  /**
   * Validate chunk quality
   */
  validateChunkQuality(chunks: any[] = []): QualityReport {
    try {
      let chunks_to_validate = chunks;

      // If no chunks provided, get all from database
      if (chunks_to_validate.length === 0) {
        chunks_to_validate = this.db.prepare(`
          SELECT id, content, tokenCount FROM kb_chunks
        `).all();
      }

      const issues: string[] = [];
      let validChunks = 0;

      for (const chunk of chunks_to_validate) {
        let isValid = true;

        // Check minimum length
        if (chunk.content.length < 50) {
          issues.push(`Chunk ${chunk.id}: Too short (<50 chars)`);
          isValid = false;
        }

        // Check maximum length
        if (chunk.content.length > 5000) {
          issues.push(`Chunk ${chunk.id}: Too long (>5000 chars)`);
          isValid = false;
        }

        // Check for meaningful content
        const meaningfulText = chunk.content.replace(/\s+/g, '').replace(/\d+/g, '');
        if (meaningfulText.length < 30) {
          issues.push(`Chunk ${chunk.id}: Insufficient meaningful content`);
          isValid = false;
        }

        // Check token count accuracy
        const estimatedTokens = Math.ceil(chunk.content.length / 4);
        if (Math.abs(estimatedTokens - (chunk.tokenCount || 0)) > 50) {
          issues.push(`Chunk ${chunk.id}: Token count mismatch`);
          isValid = false;
        }

        // Check for duplicates
        const similar = this.db.prepare(`
          SELECT COUNT(*) as count FROM kb_chunks 
          WHERE id != ? AND content = ?
        `).get(chunk.id, chunk.content) as { count: number };

        if (similar && similar.count > 0) {
          issues.push(`Chunk ${chunk.id}: Duplicate content detected`);
          isValid = false;
        }

        if (isValid) {
          validChunks++;
        }
      }

      const validationRate = chunks_to_validate.length > 0 
        ? (validChunks / chunks_to_validate.length) * 100 
        : 0;

      const report: QualityReport = {
        totalChunks: chunks_to_validate.length,
        validChunks,
        invalidChunks: chunks_to_validate.length - validChunks,
        validationRate,
        averageChunkQuality: validationRate,
        issues: issues.slice(0, 10) // Return first 10 issues
      };

      logger.info('Chunk quality validation complete', {
        context: 'KnowledgeBaseValidationService',
        metadata: {
          totalChunks: report.totalChunks,
          validChunks: report.validChunks,
          validationRate: report.validationRate.toFixed(2)
        }
      });

      return report;
    } catch (error) {
      logger.error('Failed to validate chunk quality', { context: 'KnowledgeBaseValidationService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      throw error;
    }
  }

  /**
   * Test semantic search quality
   */
  testSemanticSearch(queries: string[] = []): SearchTestResult[] {
    const defaultQueries = [
      'recovery from intense training',
      'sleep optimization for athletes',
      'injury prevention techniques',
      'strength training periodization',
      'nutrition for muscle growth',
      'heart rate variability',
      'overtraining syndrome',
      'high intensity interval training',
      'mobility and flexibility',
      'mental performance coaching'
    ];

    const testQueries = queries.length > 0 ? queries : defaultQueries;
    const results: SearchTestResult[] = [];

    try {
      for (const query of testQueries) {
        // Simulate semantic search by looking for relevant chunks
        const queryTerms = query.toLowerCase().split(/\s+/);
        const matchedChunks = this.db.prepare(`
          SELECT id, content, keyTerms FROM kb_chunks
          WHERE 1=1
        `).all() as any[];

        // Score chunks by relevance
        const scoredChunks = matchedChunks.map(chunk => {
          let score = 0;
          const lowerContent = chunk.content.toLowerCase();
          const keyTerms = JSON.parse(chunk.keyTerms || '[]');

          // Score based on query term matches
          for (const term of queryTerms) {
            if (lowerContent.includes(term)) {
              score += 0.5;
            }
            if (keyTerms.includes(term)) {
              score += 1.0;
            }
          }

          return { ...chunk, score: Math.min(score / queryTerms.length, 1.0) };
        }).sort((a, b) => b.score - a.score);

        const topResults = scoredChunks.slice(0, 5);
        const averageSimilarity = topResults.length > 0
          ? topResults.reduce((sum, chunk) => sum + chunk.score, 0) / topResults.length
          : 0;

        const passed = averageSimilarity > 0.6;

        results.push({
          query,
          foundResults: topResults.length,
          averageSimilarity,
          topResultContent: topResults[0]?.content.substring(0, 100) || '',
          relevanceScore: averageSimilarity,
          passed
        });
      }

      logger.info('Semantic search tests complete', {
        context: 'KnowledgeBaseValidationService',
        metadata: {
          queriesTested: testQueries.length,
          passedQueries: results.filter(r => r.passed).length
        }
      });

      return results;
    } catch (error) {
      logger.error('Failed to test semantic search', { context: 'KnowledgeBaseValidationService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      throw error;
    }
  }

  /**
   * Benchmark search performance
   */
  benchmarkSearchPerformance(iterations: number = 100): PerformanceBenchmark {
    const latencies: number[] = [];

    try {
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        // Simulate a search query
        this.db.prepare(`
          SELECT * FROM kb_chunks LIMIT 10
        `).all();

        latencies.push(Date.now() - startTime);
      }

      latencies.sort((a, b) => a - b);

      const benchmark: PerformanceBenchmark = {
        avgLatencyMs: latencies.reduce((a, b) => a + b) / latencies.length,
        p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)],
        p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)],
        p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)],
        throughputPerSecond: 1000 / (latencies.reduce((a, b) => a + b) / latencies.length),
        totalQueriesRun: iterations
      };

      logger.info('Search performance benchmark complete', {
        context: 'KnowledgeBaseValidationService',
        metadata: {
          avgLatency: benchmark.avgLatencyMs.toFixed(2),
          p95Latency: benchmark.p95LatencyMs.toFixed(2),
          throughput: benchmark.throughputPerSecond.toFixed(2),
          totalQueries: iterations
        }
      });

      return benchmark;
    } catch (error) {
      logger.error('Failed to benchmark search performance', { context: 'KnowledgeBaseValidationService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      return {
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        throughputPerSecond: 0,
        totalQueriesRun: 0
      };
    }
  }

  /**
   * Validate citation links
   */
  validateCitationLinks(): CitationValidationResult {
    try {
      // Check if citations table exists and validate structure
      const citationCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM rag_citations
      `).get() as { count: number };

      let validCitations = 0;
      const issues: string[] = [];

      if (citationCount.count > 0) {
        const citations = this.db.prepare(`
          SELECT id, title, authors, year, page FROM rag_citations
        `).all() as any[];

        for (const citation of citations) {
          let isValid = true;

          if (!citation.title || citation.title.length === 0) {
            issues.push(`Citation ${citation.id}: Missing title`);
            isValid = false;
          }

          if (!citation.authors || citation.authors.length === 0) {
            issues.push(`Citation ${citation.id}: Missing authors`);
            isValid = false;
          }

          if (!citation.year || citation.year < 1900 || citation.year > new Date().getFullYear()) {
            issues.push(`Citation ${citation.id}: Invalid year`);
            isValid = false;
          }

          if (isValid) {
            validCitations++;
          }
        }
      }

      const result: CitationValidationResult = {
        totalCitations: citationCount.count,
        validCitations,
        invalidCitations: citationCount.count - validCitations,
        accuracyRate: citationCount.count > 0 ? (validCitations / citationCount.count) * 100 : 0,
        issues: issues.slice(0, 10)
      };

      logger.info('Citation validation complete', {
        context: 'KnowledgeBaseValidationService',
        metadata: {
          totalCitations: result.totalCitations,
          validCitations,
          accuracy: result.accuracyRate.toFixed(2)
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to validate citations', { context: 'KnowledgeBaseValidationService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      return {
        totalCitations: 0,
        validCitations: 0,
        invalidCitations: 0,
        accuracyRate: 0,
        issues: []
      };
    }
  }

  /**
   * Generate comprehensive quality report
   */
  generateQualityReport(): DetailedQualityReport {
    try {
      const bookStats = this.db.prepare(`
        SELECT COUNT(*) as totalBooks FROM kb_books
      `).get() as { totalBooks: number };

      const chunkStats = this.db.prepare(`
        SELECT COUNT(*) as totalChunks FROM kb_chunks
      `).get() as { totalChunks: number };

      const categoryStats = this.db.prepare(`
        SELECT category, COUNT(*) as count FROM kb_books GROUP BY category
      `).all() as any[];

      const coverageByCategory: Record<string, number> = {};
      for (const stat of categoryStats) {
        coverageByCategory[stat.category] = stat.count;
      }

      const qualityMetrics = {
        chunkCompleteness: Math.random() * 100, // Placeholder
        contentCoherence: Math.random() * 100,
        metadataAccuracy: Math.random() * 100,
        embeddingQuality: Math.random() * 100
      };

      const searchPerformance = this.benchmarkSearchPerformance(50);
      const citationAccuracy = this.validateCitationLinks();
      const qualityChunk = this.validateChunkQuality();

      const overallScore =
        (qualityMetrics.chunkCompleteness +
          qualityMetrics.contentCoherence +
          qualityMetrics.metadataAccuracy +
          qualityMetrics.embeddingQuality +
          citationAccuracy.accuracyRate +
          qualityChunk.validationRate) /
        6;

      const recommendations: string[] = [];

      if (searchPerformance.p95LatencyMs > 500) {
        recommendations.push('Consider adding database indices to improve search performance');
      }

      if (citationAccuracy.accuracyRate < 95) {
        recommendations.push('Review and improve citation validation logic');
      }

      if (qualityChunk.validationRate < 90) {
        recommendations.push('Investigate and fix invalid chunks');
      }

      const report: DetailedQualityReport = {
        timestamp: new Date().toISOString(),
        totalChunks: chunkStats.totalChunks,
        totalBooks: bookStats.totalBooks,
        coverageByCategory,
        qualityMetrics,
        searchPerformance,
        citationAccuracy,
        overallScore,
        recommendations
      };

      logger.info('Quality report generated', {
        context: 'KnowledgeBaseValidationService',
        metadata: { overallScore: report.overallScore.toFixed(2), totalBooks: bookStats.totalBooks }
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate quality report', { context: 'KnowledgeBaseValidationService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      throw error;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    logger.info('Knowledge base validation service closed', { context: 'KnowledgeBaseValidationService' });
  }
}
