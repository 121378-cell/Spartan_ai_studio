/**
 * Query Decomposition Service
 *
 * Breaks complex queries into sub-queries for improved RAG performance
 * Handles query intent detection and multi-query parallel execution
 */

import { logger } from '../utils/logger';

export interface SubQuery {
  query: string;
  weight: number;
  context: string;
  intent?: QueryIntent;
}

export interface DecomposedQuery {
  original: string;
  subQueries: SubQuery[];
  aggregationStrategy: 'combine' | 'rank' | 'weighted';
  decompositionReason?: string;
}

export type QueryIntent = 
  | 'recovery'
  | 'nutrition'
  | 'training'
  | 'sleep'
  | 'stress'
  | 'performance'
  | 'injury-prevention'
  | 'general'
  | 'comparison'
  | 'analysis';

interface AggregatedResult {
  chunkId: string;
  content: string;
  relevanceScore: number;
  sources: string[];
  subQueryMatches: number;
}

export class QueryDecompositionService {
  /**
   * Detect query intent from text
   */
  detectIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    const intentPatterns: Record<QueryIntent, string[]> = {
      recovery: ['recover', 'recovery', 'rest', 'restore', 'healing', 'regenerate'],
      nutrition: ['eat', 'food', 'diet', 'protein', 'carbs', 'nutrition', 'meal', 'supplement'],
      training: ['train', 'exercise', 'workout', 'strength', 'endurance', 'intensity'],
      sleep: ['sleep', 'rest', 'nap', 'insomnia', 'fatigue', 'tired'],
      stress: ['stress', 'anxiety', 'tension', 'calm', 'mindfulness', 'meditation'],
      performance: ['peak', 'optimal', 'max', 'improve', 'enhance', 'better'],
      'injury-prevention': ['injury', 'prevent', 'pain', 'ache', 'soreness', 'strain'],
      comparison: ['vs', 'versus', 'compare', 'difference', 'better than', 'worse than'],
      analysis: ['analyze', 'explain', 'why', 'how', 'what', 'understand'],
      general: []
    };

    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(kw => lowerQuery.includes(kw))) {
        return intent as QueryIntent;
      }
    }

    return 'general';
  }

  /**
   * Check if query should be decomposed
   */
  shouldDecompose(query: string): boolean {
    // Decompose if:
    // 1. Query is complex (multiple sentences or long)
    // 2. Contains conjunctions (and, or, but)
    // 3. Multiple distinct concepts
    const sentences = query.split(/[.!?]+/).length;
    const hasConjunctions = /\s(and|or|but|also)\s/i.test(query);
    const isLong = query.length > 100;

    return (sentences > 1 && isLong) || hasConjunctions || query.length > 150;
  }

  /**
   * Decompose complex query into sub-queries
   */
  async decomposeQuery(query: string): Promise<DecomposedQuery> {
    logger.info('Decomposing query', {
      context: 'query-decomposition',
      metadata: { queryLength: query.length }
    });

    if (!this.shouldDecompose(query)) {
      return {
        original: query,
        subQueries: [
          {
            query,
            weight: 1.0,
            context: 'original',
            intent: this.detectIntent(query)
          }
        ],
        aggregationStrategy: 'combine',
        decompositionReason: 'Query not complex enough for decomposition'
      };
    }

    const intent = this.detectIntent(query);
    const subQueries: SubQuery[] = [];

    // Split by key phrases and conjunctions
    const phrases = this.extractKeyPhrases(query);

    phrases.forEach((phrase, idx) => {
      subQueries.push({
        query: phrase,
        weight: 1.0 - idx * 0.1, // Earlier phrases weighted higher
        context: `decomposed-${idx + 1}`,
        intent: this.detectIntent(phrase)
      });
    });

    // Add main query as primary sub-query
    subQueries.unshift({
      query,
      weight: 2.0,
      context: 'original-full',
      intent
    });

    logger.info('Query decomposition complete', {
      context: 'query-decomposition',
      metadata: {
        originalQuery: query,
        subQueriesCount: subQueries.length,
        mainIntent: intent
      }
    });

    return {
      original: query,
      subQueries,
      aggregationStrategy: 'weighted',
      decompositionReason: `Multiple intents detected: ${[...new Set(subQueries.map(sq => sq.intent))].join(', ')}`
    };
  }

  /**
   * Extract key phrases from query
   */
  private extractKeyPhrases(query: string): string[] {
    const phrases: string[] = [];

    // Split by conjunctions
    const conjunctionPattern = /(?:\s+(?:and|or|also|additionally)\s+)/i;
    const parts = query.split(conjunctionPattern);

    // Split by question marks in multi-question queries
    const allParts = parts.flatMap(part => part.split(/\?+/)).filter(p => p.trim().length > 0);

    // Clean and extract
    allParts.forEach(part => {
      const cleaned = part.trim();
      if (cleaned.length > 10) {
        phrases.push(cleaned);
      }
    });

    return phrases.length > 0 ? phrases : [query];
  }

  /**
   * Aggregate results from multiple sub-queries
   */
  async aggregateResults(
    subQueryResults: Map<string, any[]>,
    strategy: 'combine' | 'rank' | 'weighted' = 'weighted',
    weights?: Map<string, number>
  ): Promise<AggregatedResult[]> {
    const resultMap = new Map<string, AggregatedResult>();

    // Combine results from all sub-queries
    for (const [subQueryIdx, results] of subQueryResults.entries()) {
      const weight = weights?.get(subQueryIdx) || 1.0;

      results.forEach((result: any) => {
        const key = result.chunkId || result.id;

        if (resultMap.has(key)) {
          const existing = resultMap.get(key)!;
          existing.relevanceScore += (result.score || 0) * weight;
          existing.sources.push(`subquery-${subQueryIdx}`);
          existing.subQueryMatches++;
        } else {
          resultMap.set(key, {
            chunkId: key,
            content: result.content || result.text || '',
            relevanceScore: (result.score || 0) * weight,
            sources: [`subquery-${subQueryIdx}`],
            subQueryMatches: 1
          });
        }
      });
    }

    // Convert to array and sort by aggregated score
    let aggregated = Array.from(resultMap.values());

    switch (strategy) {
    case 'rank':
      // Sort by number of matching sub-queries, then by score
      aggregated.sort((a, b) => {
        if (b.subQueryMatches !== a.subQueryMatches) {
          return b.subQueryMatches - a.subQueryMatches;
        }
        return b.relevanceScore - a.relevanceScore;
      });
      break;

    case 'weighted':
      // Sort by weighted relevance score
      aggregated.sort((a, b) => b.relevanceScore - a.relevanceScore);
      break;

    case 'combine':
    default:
      // Average the scores
      aggregated = aggregated.map(r => ({
        ...r,
        relevanceScore: r.relevanceScore / r.subQueryMatches
      }));
      aggregated.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Normalize scores to 0-1 range
    const maxScore = aggregated[0]?.relevanceScore || 1;
    aggregated = aggregated.map(r => ({
      ...r,
      relevanceScore: Math.min(1, r.relevanceScore / maxScore)
    }));

    logger.info('Results aggregated', {
      context: 'query-decomposition',
      metadata: {
        totalResults: aggregated.length,
        strategy,
        avgMultiplicity: aggregated.reduce((sum, r) => sum + r.subQueryMatches, 0) / aggregated.length
      }
    });

    return aggregated;
  }

  /**
   * Validate decomposition quality
   */
  validateDecomposition(decomposed: DecomposedQuery): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (decomposed.subQueries.length === 0) {
      issues.push('No sub-queries generated');
    }

    if (decomposed.subQueries.length > 10) {
      issues.push(`Too many sub-queries (${decomposed.subQueries.length}), consider simpler decomposition`);
    }

    // Check for duplicate queries
    const querySet = new Set(decomposed.subQueries.map(sq => sq.query.toLowerCase()));
    if (querySet.size < decomposed.subQueries.length) {
      issues.push('Duplicate sub-queries detected');
    }

    // Check weights sum approximately to expected value
    const weightSum = decomposed.subQueries.reduce((sum, sq) => sum + sq.weight, 0);
    if (weightSum === 0) {
      issues.push('Invalid weights: sum is zero');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Get statistics on decomposition
   */
  getDecompositionStats(decomposed: DecomposedQuery): {
    avgQueryLength: number;
    maxWeight: number;
    minWeight: number;
    intents: Set<QueryIntent | undefined>;
    totalWeight: number;
  } {
    const queryLengths = decomposed.subQueries.map(sq => sq.query.length);
    const weights = decomposed.subQueries.map(sq => sq.weight);

    return {
      avgQueryLength: queryLengths.reduce((a, b) => a + b, 0) / queryLengths.length,
      maxWeight: Math.max(...weights),
      minWeight: Math.min(...weights),
      intents: new Set(decomposed.subQueries.map(sq => sq.intent)),
      totalWeight: weights.reduce((a, b) => a + b, 0)
    };
  }
}

export default QueryDecompositionService;
