/**
 * Result Re-ranking Service
 *
 * Multi-factor re-ranking of search results for improved relevance
 * Implements recency, authority, clarity, and custom ranking factors
 */

import { logger } from '../utils/logger';

export type RankingFactorType = 'relevance' | 'recency' | 'authority' | 'clarity' | 'completeness' | 'bioContext';

export interface BiometricContext {
  hrv: number;
  hrvBaseline: number;
  rhr: number;
  rhrBaseline: number;
  stressLevel: number;
  sleepDuration: number;
  synergisticLoad: number;
}

export interface RankedResult {
  chunkId: string;
  content: string;
  originalScore: number;
  rerankScore: number;
  factors: Map<RankingFactorType, number>;
  finalScore: number;
  rank: number;
}

export interface RankingConfig {
  factors: RankingFactorType[];
  weights: Record<RankingFactorType, number>;
  normalize?: boolean;
  topK?: number;
}

interface SearchResult {
  chunkId: string;
  content: string;
  score: number;
  createdAt?: Date;
  updatedAt?: Date;
  viewCount?: number;
  citationCount?: number;
  isAuthoritative?: boolean;
  complexity?: number;
}

export class ResultRerankingService {
  // Default weights for ranking factors
  private defaultWeights: Record<RankingFactorType, number> = {
    relevance: 0.5,
    recency: 0.15,
    authority: 0.15,
    clarity: 0.1,
    completeness: 0.1,
    bioContext: 0.0 // Default 0, will be increased if context provided
  };

  // Adaptive weights updated from feedback
  private adaptiveWeights: Record<RankingFactorType, number> = { ...this.defaultWeights };

  /**
   * Initialize re-ranking service
   */
  constructor() {
    logger.info('ResultRerankingService initialized', {
      context: 'reranking',
      metadata: { defaultWeights: this.defaultWeights }
    });
  }

  /**
   * Calculate relevance factor (0-1)
   */
  calculateRelevance(result: SearchResult, query: string): number {
    // Use the semantic similarity score as base
    const relevance = Math.min(1, result.score / 0.8); // Normalize assuming max score is ~0.8

    // Boost if query terms appear in content
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = result.content.toLowerCase();
    const matchedTerms = queryTerms.filter(term => contentLower.includes(term)).length;
    const termMatchBoost = (matchedTerms / queryTerms.length) * 0.2; // Up to 20% boost

    return Math.min(1, relevance + termMatchBoost);
  }

  /**
   * Calculate recency factor (0-1)
   */
  calculateRecency(result: SearchResult): number {
    if (!result.updatedAt) return 0.5; // Neutral if no date

    const now = Date.now();
    const daysSinceUpdate = (now - result.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: recent = 1, 30 days ago = 0.5, 90 days ago = 0.2
    if (daysSinceUpdate < 7) return 1.0;
    if (daysSinceUpdate < 30) return 0.8;
    if (daysSinceUpdate < 90) return 0.6;
    if (daysSinceUpdate < 180) return 0.4;
    return 0.2;
  }

  /**
   * Calculate authority factor (0-1)
   */
  calculateAuthority(result: SearchResult): number {
    let authority = 0.5; // Base neutral score

    // Book source authority (hardcoded for now, can be made configurable)
    const authorityBooks = [
      'TCAP', // The Complete Athletic Profile
      'IOG', // Inside Olympic Training
      'SCP' // Scientific Coaching Principles
    ];

    // Check if from authoritative source
    if (authorityBooks.some(book => result.content.includes(book))) {
      authority = 0.9;
    } else if (result.isAuthoritative) {
      authority = 0.8;
    }

    // Boost by citation count
    if (result.citationCount) {
      const citationBoost = Math.min(0.2, result.citationCount / 50); // Up to 20% boost
      authority = Math.min(1, authority + citationBoost);
    }

    return authority;
  }

  /**
   * Calculate clarity factor (0-1)
   * Based on content length, structure, and readability
   */
  calculateClarity(result: SearchResult): number {
    let clarity = 0.5;

    const contentLength = result.content.length;

    // Moderate length is clearest (not too short, not too long)
    if (contentLength < 100) {
      clarity = 0.4; // Too short, probably incomplete
    } else if (contentLength < 500) {
      clarity = 0.7; // Concise, likely clear
    } else if (contentLength < 2000) {
      clarity = 0.85; // Good detailed content
    } else if (contentLength < 5000) {
      clarity = 0.75; // Comprehensive but getting long
    } else {
      clarity = 0.6; // Very long, may be complex
    }

    // Check for structure indicators (bullets, sections, etc.)
    const hasStructure = /[-•]\s|^#{1,3}\s/m.test(result.content);
    if (hasStructure) {
      clarity = Math.min(1, clarity + 0.15);
    }

    // Penalize if overly complex (many long words)
    const words = result.content.split(/\s+/);
    const longWords = words.filter(w => w.length > 12).length;
    const complexityRatio = longWords / words.length;
    if (complexityRatio > 0.2) {
      clarity = Math.max(0, clarity - 0.15);
    }

    return clarity;
  }

  /**
   * Calculate completeness factor (0-1)
   * Measure of how thoroughly a topic is covered
   */
  calculateCompleteness(result: SearchResult): number {
    let completeness = 0.5;

    // Based on token/content count
    if (result.complexity !== undefined) {
      // Normalize complexity to 0-1
      completeness = Math.min(1, result.complexity / 100);
    } else {
      const contentLength = result.content.length;
      if (contentLength > 3000) {
        completeness = 0.9; // Comprehensive
      } else if (contentLength > 1000) {
        completeness = 0.7; // Good detail
      } else if (contentLength > 300) {
        completeness = 0.5; // Basic info
      } else {
        completeness = 0.3; // Minimal
      }
    }

    // Check for examples
    if (/example|case|instance|study/i.test(result.content)) {
      completeness = Math.min(1, completeness + 0.1);
    }

    // Check for evidence or data
    if (/research|study|data|evidence|found|shows|demonstrates/i.test(result.content)) {
      completeness = Math.min(1, completeness + 0.1);
    }

    return completeness;
  }

  /**
   * Calculate bio-context factor (0-1)
   * Prioritizes content based on user's physiological state
   */
  calculateBioContextFactor(result: SearchResult, context: BiometricContext): number {
    let score = 0.5; // Base neutral
    const content = result.content.toLowerCase();

    // If high stress or low HRV, prioritize recovery and lower intensity
    const isStressed = context.stressLevel > 70 || context.hrv < (context.hrvBaseline * 0.8) || context.synergisticLoad > 80;

    if (isStressed) {
      if (/recovery|recuperación|descanso|rest|sleep|meditation|yoga|mobility|mobility|estiramiento|stretching/i.test(content)) {
        score = 0.9; // Highly relevant for stressed state
      } else if (/heavy|heavy weight|max effort|intensity|amrap|failure|high volume|volumen alto/i.test(content)) {
        score = 0.2; // Less relevant for stressed state
      }
    } else if (context.synergisticLoad < 40 && context.hrv > context.hrvBaseline) {
      // If low load and good HRV, prioritize performance and intensity
      if (/performance|performance|intensity|intensidad|fuerza|strength|power|potencia|hypertrophy|hipertrofia/i.test(content)) {
        score = 0.9;
      }
    }

    return score;
  }

  /**
   * Re-rank results using multiple factors
   */
  async rerankResults(
    results: SearchResult[],
    query: string,
    config?: RankingConfig & { bioContext?: BiometricContext }
  ): Promise<RankedResult[]> {
    const finalConfig = {
      factors: ['relevance', 'recency', 'authority', 'clarity', 'completeness'] as RankingFactorType[],
      weights: { ...this.adaptiveWeights },
      normalize: true,
      topK: 20,
      ...config
    };

    // If bioContext is provided, add it to factors and adjust weights
    if (config?.bioContext) {
      if (!finalConfig.factors.includes('bioContext')) {
        finalConfig.factors.push('bioContext');
      }
      // Give bioContext a significant weight if present, reducing others proportionally
      const bioWeight = 0.25;
      finalConfig.weights.bioContext = bioWeight;
      const remainingWeight = 1 - bioWeight;
      const otherWeightSum = (finalConfig.weights.relevance || 0) +
        (finalConfig.weights.recency || 0) +
        (finalConfig.weights.authority || 0) +
        (finalConfig.weights.clarity || 0) +
        (finalConfig.weights.completeness || 0);

      finalConfig.weights.relevance = ((finalConfig.weights.relevance || 0.5) / otherWeightSum) * remainingWeight;
      finalConfig.weights.recency = ((finalConfig.weights.recency || 0.15) / otherWeightSum) * remainingWeight;
      finalConfig.weights.authority = ((finalConfig.weights.authority || 0.15) / otherWeightSum) * remainingWeight;
      finalConfig.weights.clarity = ((finalConfig.weights.clarity || 0.1) / otherWeightSum) * remainingWeight;
      finalConfig.weights.completeness = ((finalConfig.weights.completeness || 0.1) / otherWeightSum) * remainingWeight;
    }

    logger.info('Starting re-ranking', {
      context: 'reranking',
      metadata: {
        resultsCount: results.length,
        factors: finalConfig.factors,
        query: query.substring(0, 50)
      }
    });

    const ranked: RankedResult[] = results.map((result, index) => {
      const factors = new Map<RankingFactorType, number>();
      let weightedScore = 0;

      // Calculate each factor
      if (finalConfig.factors.includes('relevance')) {
        const rel = this.calculateRelevance(result, query);
        factors.set('relevance', rel);
        weightedScore += rel * (finalConfig.weights.relevance || 0.5);
      }

      if (finalConfig.factors.includes('recency')) {
        const rec = this.calculateRecency(result);
        factors.set('recency', rec);
        weightedScore += rec * (finalConfig.weights.recency || 0.15);
      }

      if (finalConfig.factors.includes('authority')) {
        const auth = this.calculateAuthority(result);
        factors.set('authority', auth);
        weightedScore += auth * (finalConfig.weights.authority || 0.15);
      }

      if (finalConfig.factors.includes('clarity')) {
        const clar = this.calculateClarity(result);
        factors.set('clarity', clar);
        weightedScore += clar * (finalConfig.weights.clarity || 0.1);
      }

      if (finalConfig.factors.includes('completeness')) {
        const comp = this.calculateCompleteness(result);
        factors.set('completeness', comp);
        weightedScore += comp * (finalConfig.weights.completeness || 0.1);
      }

      if (finalConfig.factors.includes('bioContext') && config?.bioContext) {
        const bio = this.calculateBioContextFactor(result, config.bioContext);
        factors.set('bioContext', bio);
        weightedScore += bio * (finalConfig.weights.bioContext || 0.25);
      }

      return {
        chunkId: result.chunkId,
        content: result.content,
        originalScore: result.score,
        rerankScore: weightedScore,
        factors,
        finalScore: 0, // Will be normalized
        rank: 0 // Will be set after sorting
      };
    });

    // Sort by weighted score
    ranked.sort((a, b) => b.rerankScore - a.rerankScore);

    // Normalize scores to 0-1 range if requested
    if (finalConfig.normalize) {
      const maxScore = ranked[0]?.rerankScore || 1;
      ranked.forEach(r => {
        r.finalScore = Math.min(1, r.rerankScore / maxScore);
      });
    } else {
      ranked.forEach(r => {
        r.finalScore = r.rerankScore;
      });
    }

    // Set ranks
    ranked.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    // Limit to topK if specified
    const limited = finalConfig.topK ? ranked.slice(0, finalConfig.topK) : ranked;

    logger.info('Re-ranking complete', {
      context: 'reranking',
      metadata: {
        originalCount: results.length,
        rerankCount: limited.length,
        topScore: limited[0]?.finalScore,
        avgScore: limited.reduce((sum, r) => sum + r.finalScore, 0) / limited.length
      }
    });

    return limited;
  }

  /**
   * Update adaptive weights based on feedback
   */
  updateWeights(feedbackScores: Record<RankingFactorType, number>): void {
    // Simple approach: blend feedback with current weights (80/20)
    for (const factor of ['relevance', 'recency', 'authority', 'clarity', 'completeness'] as RankingFactorType[]) {
      if (feedbackScores[factor] !== undefined) {
        this.adaptiveWeights[factor] = this.adaptiveWeights[factor] * 0.8 + feedbackScores[factor] * 0.2;
      }
    }

    // Re-normalize weights to sum to 1
    const sum = Object.values(this.adaptiveWeights).reduce((a, b) => a + b, 0);
    for (const factor of ['relevance', 'recency', 'authority', 'clarity', 'completeness'] as RankingFactorType[]) {
      this.adaptiveWeights[factor] /= sum;
    }

    logger.info('Ranking weights updated', {
      context: 'reranking',
      metadata: { newWeights: this.adaptiveWeights }
    });
  }

  /**
   * Get current weights
   */
  getWeights(): Record<RankingFactorType, number> {
    return { ...this.adaptiveWeights };
  }

  /**
   * Reset weights to defaults
   */
  resetWeights(): void {
    this.adaptiveWeights = { ...this.defaultWeights };
    logger.info('Ranking weights reset to defaults', {
      context: 'reranking'
    });
  }
}

export default ResultRerankingService;
