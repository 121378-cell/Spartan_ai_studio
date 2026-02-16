/**
 * Query Optimization Service
 *
 * Enhances queries through expansion, intent detection, and context filtering
 */

import { logger } from '../utils/logger';

export interface OptimizedQuery {
  original: string;
  expanded: string;
  synonyms: string[];
  keyTerms: string[];
  timeWindow?: { start: Date; end: Date };
  intent?: QueryIntent;
  confidence: number;
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

interface BiometricContext {
  hrv?: number;
  rhr?: number;
  stressLevel?: number;
  sleepDuration?: number;
  [key: string]: unknown;
}

/**
 * Synonym and term expansion database
 */
const SYNONYMS: Record<string, string[]> = {
  recovery: ['recuperation', 'rest', 'restore', 'regeneration', 'healing'],
  recovery_adj: ['recovering', 'recuperating', 'resting'],
  nutrition: ['diet', 'food', 'eating', 'fuel', 'nourishment', 'nutrients'],
  protein: ['amino', 'whey', 'casein', 'leucine'],
  training: ['exercise', 'workout', 'conditioning', 'practice', 'session'],
  sleep: ['rest', 'nap', 'sleep_quality', 'insomnia'],
  strength: ['power', 'force', 'muscular_strength'],
  endurance: ['stamina', 'aerobic', 'cardiovascular'],
  stress: ['anxiety', 'tension', 'pressure', 'cortisol'],
  relaxation: ['calm', 'calmness', 'mindfulness', 'meditation'],
  performance: ['peak', 'optimal', 'maximum', 'best'],
  injury: ['pain', 'soreness', 'strain', 'sprain', 'ache'],
  prevention: ['prevent', 'avoid', 'precaution'],
  race: ['competition', 'event', 'championship'],
  muscle: ['muscular', 'myofibril', 'fiber']
};

export class QueryOptimizationService {
  /**
   * Expand query with synonyms and related terms
   */
  async expandQuery(query: string): Promise<OptimizedQuery> {
    const intent = this.detectIntent(query);
    const keyTerms = this.extractKeyTerms(query);
    const synonyms = this.findSynonyms(keyTerms);

    // Build expanded query
    let expanded = query;
    keyTerms.forEach(term => {
      const termSynonyms = synonyms[term] || [];
      if (termSynonyms.length > 0) {
        // Add top 2 synonyms to expanded query
        expanded += ` OR ${termSynonyms.slice(0, 2).join(' OR ')}`;
      }
    });

    logger.info('Query expansion complete', {
      context: 'query-optimization',
      metadata: {
        original: query.substring(0, 50),
        expanded: expanded.substring(0, 100),
        termsExpanded: keyTerms.length,
        intent
      }
    });

    return {
      original: query,
      expanded,
      synonyms: Object.values(synonyms).flat(),
      keyTerms,
      intent,
      confidence: 0.85
    };
  }

  /**
   * Detect query intent
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
   * Extract key terms from query
   */
  private extractKeyTerms(query: string): string[] {
    // Remove common words
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'am', 'be', 'being', 'been',
      'what', 'how', 'why', 'when', 'where', 'which', 'who', 'can', 'could',
      'should', 'would', 'will', 'do', 'does', 'did'
    ]);

    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopwords.has(word));

    // Extract 2-3 word phrases as well
    const terms = [...words];

    // Add some bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      if (bigram.length < 20) {
        terms.push(bigram);
      }
    }

    return [...new Set(terms)].slice(0, 10); // Return unique, max 10 terms
  }

  /**
   * Find synonyms for terms
   */
  private findSynonyms(terms: string[]): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    terms.forEach(term => {
      const termLower = term.toLowerCase().replace(/_/g, ' ');

      // Direct match
      if (SYNONYMS[termLower]) {
        result[term] = SYNONYMS[termLower];
        return;
      }

      // Partial match
      for (const [key, syns] of Object.entries(SYNONYMS)) {
        if (termLower.includes(key) || key.includes(termLower)) {
          result[term] = syns;
          return;
        }
      }

      // No match found
      result[term] = [];
    });

    return result;
  }

  /**
   * Filter search based on biometric context
   */
  filterByContext(query: string, context: BiometricContext): {
    filters: Record<string, unknown>;
    timeWindow?: { start: Date; end: Date };
    recommendations: string[];
  } {
    const filters: Record<string, unknown> = {};
    const recommendations: string[] = [];

    // Recovery recommendation
    if (context.hrv !== undefined && context.hrv < 50) {
      filters.category = 'recovery';
      recommendations.push('Prioritizing recovery-focused content due to low HRV');
    }

    // Sleep-related
    if (context.sleepDuration !== undefined && context.sleepDuration < 7) {
      filters.category = 'sleep';
      recommendations.push('Recommending sleep optimization strategies');
    }

    // Stress level high
    if (context.stressLevel !== undefined && context.stressLevel > 70) {
      filters.category = 'stress';
      recommendations.push('Prioritizing stress management content');
    }

    // Training-related
    if (context.rhr !== undefined && context.rhr < 60) {
      recommendations.push('You appear well-conditioned; advanced training content recommended');
    }

    logger.info('Context-based filtering applied', {
      context: 'query-optimization',
      metadata: {
        filterCount: Object.keys(filters).length,
        recommendationCount: recommendations.length
      }
    });

    return {
      filters,
      recommendations
    };
  }

  /**
   * Correct common spelling mistakes
   */
  private correctSpelling(query: string): string {
    const corrections: Record<string, string> = {
      'optimla': 'optimal',
      'performence': 'performance',
      'nutrtion': 'nutrition',
      'recomendation': 'recommendation',
      'recovry': 'recovery',
      'strenth': 'strength',
      'cardio': 'cardiovascular'
    };

    let corrected = query;
    for (const [misspelled, correct] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${misspelled}\\b`, 'gi');
      corrected = corrected.replace(regex, correct);
    }

    return corrected;
  }

  /**
   * Validate and sanitize query
   */
  validateQuery(query: string): {
    isValid: boolean;
    issues: string[];
    cleaned: string;
  } {
    const issues: string[] = [];
    let cleaned = query.trim();

    if (cleaned.length === 0) {
      issues.push('Query is empty');
    }

    if (cleaned.length < 3) {
      issues.push('Query too short (minimum 3 characters)');
    }

    if (cleaned.length > 500) {
      issues.push('Query too long (maximum 500 characters)');
    }

    // Check for SQL injection patterns (basic)
    if (/[;'"]|DROP|DELETE|INSERT|UPDATE/i.test(cleaned)) {
      issues.push('Query contains potentially malicious content');
    }

    // Correct spelling
    cleaned = this.correctSpelling(cleaned);

    return {
      isValid: issues.length === 0,
      issues,
      cleaned
    };
  }

  /**
   * Get query statistics
   */
  getQueryStats(optimized: OptimizedQuery): {
    originalLength: number;
    expandedLength: number;
    expansionRatio: number;
    uniqueTerms: number;
    totalSynonyms: number;
  } {
    return {
      originalLength: optimized.original.length,
      expandedLength: optimized.expanded.length,
      expansionRatio: optimized.expanded.length / optimized.original.length,
      uniqueTerms: optimized.keyTerms.length,
      totalSynonyms: optimized.synonyms.length
    };
  }
}

export default QueryOptimizationService;
