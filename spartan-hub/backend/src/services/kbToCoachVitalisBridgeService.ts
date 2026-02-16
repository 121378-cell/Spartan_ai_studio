/**
 * KB to Coach Vitalis Bridge Service
 *
 * Connects Knowledge Base retrieval with Coach Vitalis decision making.
 * Provides evidence-based recommendations by bridging semantic search
 * results with coaching decisions.
 *
 * Features:
 * - Evidence retrieval for decisions
 * - Recommendation enhancement with citations
 * - Category-specific recommendations
 * - Confidence score boosting
 * - Citation generation
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { SemanticSearchService, SearchResult, SearchFilters } from './semanticSearchService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ActionRecommendation {
  id: string;
  userId: string;
  actionType: 'training_adjustment' | 'alert' | 'intervention' | 'monitoring';
  title: string;
  description: string;
  expectedBenefit: string;
  intensity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  createdAt: Date;
}

export interface Citation {
  sourceBook: string;
  authors?: string[];
  chapter?: string;
  excerpt: string;
  relevanceScore: number;
  pageNumber?: number;
}

export interface RecommendationWithEvidence {
  recommendation: ActionRecommendation;
  evidence: SearchResult[];
  citations: Citation[];
  confidenceBoost: number; // How much KB evidence increases confidence
  originalConfidence: number;
  boostedConfidence: number;
  relevanceExplanation: string;
}

export interface BiometricContext {
  hrv: number;
  hrvBaseline: number;
  rhr: number;
  rhrBaseline: number;
  stressLevel: number;
  sleepDuration: number;
  trainingLoad: number;
}

export interface ValidationResult {
  isValid: boolean;
  supportingEvidence: SearchResult[];
  contradictingEvidence: SearchResult[];
  confidenceLevel: number;
  explanation: string;
}

export interface CategoryRecommendation {
  category: string;
  recommendation: ActionRecommendation;
  relevantTopics: string[];
  estimatedDuration: string;
}

// ============================================================================
// KB TO COACH VITALIS BRIDGE SERVICE
// ============================================================================

export class KBToCoachVitalisBridgeService {
  private db: DatabaseType;
  private searchService: SemanticSearchService;

  constructor(
    searchService: SemanticSearchService,
    dbPath?: string
  ) {
    this.db = getDatabase();
    this.searchService = searchService;
  }

  /**
   * Get KB evidence for a coaching decision
   * @param query - The decision/recommendation to find evidence for
   * @param limit - Maximum number of sources
   * @returns Relevant KB chunks that support the decision
   */
  async getKBEvidenceForDecision(
    query: string,
    limit = 5
  ): Promise<SearchResult[]> {
    try {
      const evidence = await this.searchService.search(query, limit, 0.6);

      logger.info('KB evidence retrieved for decision', {
        context: 'kb-coach-bridge',
        metadata: {
          query: query.substring(0, 50),
          evidenceCount: evidence.length
        }
      });

      return evidence;
    } catch (error) {
      logger.error('Failed to get KB evidence', {
        context: 'kb-coach-bridge',
        metadata: {
          query,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Enhance a recommendation with KB citations
   * @param recommendation - The original recommendation
   * @returns Recommendation with evidence and citations
   */
  async enhanceRecommendationWithEvidence(
    recommendation: ActionRecommendation
  ): Promise<RecommendationWithEvidence> {
    try {
      // Search for evidence supporting the recommendation
      const query = `${recommendation.title} ${recommendation.description}`;
      const evidence = await this.getKBEvidenceForDecision(query, 5);

      // Generate citations from evidence
      const citations = this.generateCitations(evidence);

      // Calculate confidence boost based on evidence quality
      const confidenceBoost = this.calculateConfidenceBoost(evidence);
      const boostedConfidence = Math.min(
        100,
        recommendation.confidence + confidenceBoost
      );

      const explanation = this.generateRelevanceExplanation(
        recommendation,
        evidence
      );

      const result: RecommendationWithEvidence = {
        recommendation,
        evidence,
        citations,
        confidenceBoost,
        originalConfidence: recommendation.confidence,
        boostedConfidence,
        relevanceExplanation: explanation
      };

      logger.info('Recommendation enhanced with evidence', {
        context: 'kb-coach-bridge',
        metadata: {
          recommendationId: recommendation.id,
          evidenceCount: evidence.length,
          originalConfidence: recommendation.confidence,
          boostedConfidence,
          confidenceBoost
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to enhance recommendation', {
        context: 'kb-coach-bridge',
        metadata: {
          recommendationId: recommendation.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Get category-specific recommendations with KB context
   * @param category - Recommendation category (recovery, training, injury prevention)
   * @param context - Biometric context
   * @returns Recommendations specific to the category
   */
  async getCategoryRecommendations(
    category: string,
    context: BiometricContext
  ): Promise<CategoryRecommendation[]> {
    try {
      // Define category-specific search queries
      const categoryQueries: Record<string, string[]> = {
        recovery: [
          'sleep optimization recovery',
          'stress management recovery',
          'nutrition recovery adaptation'
        ],
        training: [
          'training intensity progression',
          'periodization structure',
          'recovery week planning'
        ],
        'injury-prevention': [
          'mobility flexibility injury prevention',
          'strength balance asymmetry',
          'movement pattern quality'
        ]
      };

      const queries = categoryQueries[category] || [];
      const recommendations: CategoryRecommendation[] = [];

      for (const query of queries) {
        const evidence = await this.getKBEvidenceForDecision(query, 3);

        if (evidence.length > 0) {
          const recommendation: ActionRecommendation = {
            id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: '',
            actionType: 'training_adjustment',
            title: query.split(' ').slice(0, 3).join(' '),
            description: `Focus on ${query}`,
            expectedBenefit: 'Improved performance and recovery',
            intensity: 'medium',
            confidence: 75,
            createdAt: new Date()
          };

          recommendations.push({
            category,
            recommendation,
            relevantTopics: evidence.map(e => e.chapterTitle || e.bookTitle),
            estimatedDuration: '2-4 weeks'
          });
        }
      }

      logger.info('Category recommendations generated', {
        context: 'kb-coach-bridge',
        metadata: {
          category,
          recommendationCount: recommendations.length
        }
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to get category recommendations', {
        context: 'kb-coach-bridge',
        metadata: {
          category,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Validate a recommendation against KB knowledge
   * @param recommendation - The recommendation to validate
   * @returns Validation result with supporting/contradicting evidence
   */
  async validateRecommendationAgainstKB(
    recommendation: ActionRecommendation
  ): Promise<ValidationResult> {
    try {
      // Search for supporting evidence
      const supportingQuery = `${recommendation.title} ${recommendation.description}`;
      const supportingEvidence = await this.searchService.search(
        supportingQuery,
        5,
        0.65
      );

      // Search for contradicting evidence
      const contradictingQuery = `contraindication risk opposite ${recommendation.title}`;
      const contradictingEvidence = await this.searchService.search(
        contradictingQuery,
        3,
        0.6
      );

      // Calculate validation confidence
      const supportCount = supportingEvidence.length;
      const contradictCount = contradictingEvidence.length;
      const confidenceLevel = Math.max(
        0,
        Math.min(
          100,
          75 + supportCount * 5 - contradictCount * 10
        )
      );

      const isValid = confidenceLevel >= 60;

      const explanation = this.generateValidationExplanation(
        supportingEvidence,
        contradictingEvidence,
        isValid
      );

      const result: ValidationResult = {
        isValid,
        supportingEvidence,
        contradictingEvidence,
        confidenceLevel,
        explanation
      };

      logger.info('Recommendation validation completed', {
        context: 'kb-coach-bridge',
        metadata: {
          recommendationId: recommendation.id,
          isValid,
          confidenceLevel,
          supportingCount: supportCount,
          contradictingCount: contradictCount
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to validate recommendation', {
        context: 'kb-coach-bridge',
        metadata: {
          recommendationId: recommendation.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Perform semantic search with filters
   * @param query - Search query
   * @param filters - Optional filters
   * @param topK - Number of results
   * @returns Filtered search results
   */
  async semanticSearch(
    query: string,
    filters?: SearchFilters,
    topK: number = 10
  ): Promise<SearchResult[]> {
    try {
      let results: SearchResult[];

      if (filters) {
        results = await this.searchService.advancedSearch(query, filters, topK);
      } else {
        results = await this.searchService.search(query, topK);
      }

      logger.info('Semantic search performed', {
        context: 'kb-coach-bridge',
        metadata: {
          query: query.substring(0, 50),
          resultsCount: results.length,
          hasFilters: !!filters
        }
      });

      return results;
    } catch (error) {
      logger.error('Semantic search failed', {
        context: 'kb-coach-bridge',
        metadata: {
          query,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  /**
   * Close service and cleanup
   */
  async close(): Promise<void> {
    try {
      await this.searchService.close();
      if (this.db) {
        this.db.close();
      }
      logger.info('KB to Coach Vitalis bridge closed', {
        context: 'kb-coach-bridge'
      });
    } catch (error) {
      logger.error('Error closing bridge service', {
        context: 'kb-coach-bridge',
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
   * Generate citations from search results
   */
  private generateCitations(evidence: SearchResult[]): Citation[] {
    return evidence.map(result => ({
      sourceBook: result.bookTitle,
      authors: result.authors,
      chapter: result.chapterTitle,
      excerpt: result.content.substring(0, 200),
      relevanceScore: result.relevanceScore,
      pageNumber: result.chapterNumber
    }));
  }

  /**
   * Calculate confidence boost based on evidence quality
   */
  private calculateConfidenceBoost(evidence: SearchResult[]): number {
    if (evidence.length === 0) return 0;

    const avgRelevance = evidence.reduce((sum, e) => sum + e.relevanceScore, 0) / evidence.length;
    const qualityBoost = avgRelevance * 20; // Up to 20 point boost
    const quantityBoost = Math.min(10, evidence.length * 2); // Up to 10 point boost

    return Math.round(qualityBoost + quantityBoost);
  }

  /**
   * Generate explanation of relevance
   */
  private generateRelevanceExplanation(
    recommendation: ActionRecommendation,
    evidence: SearchResult[]
  ): string {
    if (evidence.length === 0) {
      return 'No supporting evidence found in knowledge base.';
    }

    const topSources = evidence
      .slice(0, 2)
      .map(e => e.bookTitle)
      .join(' and ');

    return `Recommendation is supported by evidence from ${topSources} and ${evidence.length - 2} additional sources.`;
  }

  /**
   * Generate validation explanation
   */
  private generateValidationExplanation(
    supporting: SearchResult[],
    contradicting: SearchResult[],
    isValid: boolean
  ): string {
    if (contradicting.length > supporting.length) {
      return 'Recommendation has contradicting evidence in knowledge base.';
    }

    if (supporting.length === 0) {
      return 'No supporting evidence found in knowledge base.';
    }

    return `Recommendation is well-supported by ${supporting.length} knowledge base sources.`;
  }
}

export default KBToCoachVitalisBridgeService;
