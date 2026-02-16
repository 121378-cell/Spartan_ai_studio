/**
 * Feedback Learning Service
 *
 * Collects user feedback on search results and learns ranking weights
 */

import { logger } from '../utils/logger';

export interface QueryFeedback {
  queryId: string;
  userId: string;
  resultRatings: Map<string, number>; // chunkId -> score (0-5)
  userRating: 'poor' | 'fair' | 'good' | 'excellent';
  comments?: string;
  timestamp: number;
}

export interface LearningMetrics {
  totalQueries: number;
  avgRelevanceImprovement: number;
  rerankerAccuracy: number;
  cacheHitRate: number;
  feedbackSentiment: {
    poor: number;
    fair: number;
    good: number;
    excellent: number;
  };
}

interface RankingWeightUpdate {
  factor: string;
  oldWeight: number;
  newWeight: number;
  confidenceScore: number;
}

export class FeedbackLearningService {
  private feedbackHistory: QueryFeedback[] = [];
  private rankingWeights: Map<string, number> = new Map([
    ['relevance', 0.5],
    ['recency', 0.15],
    ['authority', 0.15],
    ['clarity', 0.1],
    ['completeness', 0.1]
  ]);
  private learningRate = 0.05; // Conservative learning rate

  /**
   * Collect feedback on query results
   */
  async collectFeedback(feedback: QueryFeedback): Promise<{ feedbackId: string; accepted: boolean }> {
    // Validate feedback
    const validation = this.validateFeedback(feedback);
    if (!validation.isValid) {
      logger.warn('Invalid feedback received', {
        context: 'feedback-learning',
        metadata: {
          issues: validation.issues,
          queryId: feedback.queryId
        }
      });
      return { feedbackId: '', accepted: false };
    }

    // Generate feedback ID
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store feedback
    this.feedbackHistory.push({
      ...feedback,
      timestamp: Date.now()
    });

    logger.info('Feedback collected', {
      context: 'feedback-learning',
      metadata: {
        feedbackId,
        queryId: feedback.queryId,
        userId: feedback.userId,
        userRating: feedback.userRating,
        ratedResults: feedback.resultRatings.size
      }
    });

    return { feedbackId, accepted: true };
  }

  /**
   * Validate feedback quality
   */
  private validateFeedback(feedback: QueryFeedback): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!feedback.queryId) {
      issues.push('Missing queryId');
    }

    if (!feedback.userId) {
      issues.push('Missing userId');
    }

    if (!['poor', 'fair', 'good', 'excellent'].includes(feedback.userRating)) {
      issues.push('Invalid userRating');
    }

    if (feedback.resultRatings.size === 0) {
      issues.push('No result ratings provided');
    }

    // Check rating values (should be 0-5)
    for (const [chunkId, score] of feedback.resultRatings.entries()) {
      if (typeof score !== 'number' || score < 0 || score > 5) {
        issues.push(`Invalid score for ${chunkId}: ${score}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Calculate metrics from feedback
   */
  calculateMetrics(): LearningMetrics {
    const total = this.feedbackHistory.length;

    if (total === 0) {
      return {
        totalQueries: 0,
        avgRelevanceImprovement: 0,
        rerankerAccuracy: 0,
        cacheHitRate: 0,
        feedbackSentiment: { poor: 0, fair: 0, good: 0, excellent: 0 }
      };
    }

    // Calculate sentiment distribution
    const sentiment = {
      poor: 0,
      fair: 0,
      good: 0,
      excellent: 0
    };

    this.feedbackHistory.forEach(fb => {
      sentiment[fb.userRating]++;
    });

    // Calculate average relevance improvement
    let totalImprovement = 0;
    this.feedbackHistory.forEach(fb => {
      const avgRating = Array.from(fb.resultRatings.values()).reduce((a, b) => a + b, 0) / fb.resultRatings.size;
      // Improvement: how close to max rating (5)
      totalImprovement += (avgRating / 5) * 100;
    });

    const avgRelevanceImprovement = totalImprovement / total;

    // Reranker accuracy: % of feedback with "good" or "excellent" ratings
    const goodOrExcellent = sentiment.good + sentiment.excellent;
    const rerankerAccuracy = (goodOrExcellent / total) * 100;

    return {
      totalQueries: total,
      avgRelevanceImprovement,
      rerankerAccuracy,
      cacheHitRate: 0, // Would need cache data
      feedbackSentiment: sentiment
    };
  }

  /**
   * Update ranking weights based on feedback
   */
  async updateRankingWeights(feedback: QueryFeedback[]): Promise<RankingWeightUpdate[]> {
    if (feedback.length === 0) {
      return [];
    }

    const updates: RankingWeightUpdate[] = [];

    // Analyze feedback to determine which factors to adjust
    const avgRatings = this.analyzeRatings(feedback);

    // Update weights based on performance
    if (avgRatings.relevance < 3.5) {
      // Relevance factor might be weighted too low
      const oldWeight = this.rankingWeights.get('relevance') || 0.5;
      const newWeight = Math.min(1, oldWeight + this.learningRate);
      this.rankingWeights.set('relevance', newWeight);

      updates.push({
        factor: 'relevance',
        oldWeight,
        newWeight,
        confidenceScore: 0.7
      });
    }

    if (avgRatings.clarity > 4.0) {
      // Clarity factor might need boost
      const oldWeight = this.rankingWeights.get('clarity') || 0.1;
      const newWeight = Math.min(1, oldWeight + this.learningRate * 0.5);
      this.rankingWeights.set('clarity', newWeight);

      updates.push({
        factor: 'clarity',
        oldWeight,
        newWeight,
        confidenceScore: 0.8
      });
    }

    // Re-normalize weights
    this.normalizeWeights();

    logger.info('Ranking weights updated', {
      context: 'feedback-learning',
      metadata: {
        updates: updates.length,
        newWeights: Object.fromEntries(this.rankingWeights)
      }
    });

    return updates;
  }

  /**
   * Analyze rating patterns in feedback
   */
  private analyzeRatings(feedback: QueryFeedback[]): Record<string, number> {
    const analysis: Record<string, number> = {
      relevance: 0,
      clarity: 0,
      authority: 0,
      recency: 0,
      completeness: 0
    };

    // Simple analysis: average ratings per feedback
    let count = 0;
    feedback.forEach(fb => {
      const avgRating = Array.from(fb.resultRatings.values()).reduce((a, b) => a + b, 0) / fb.resultRatings.size;

      // Map user ratings to factor improvements
      if (fb.userRating === 'excellent') {
        analysis.relevance += avgRating;
        analysis.clarity += avgRating * 0.9;
        analysis.authority += avgRating * 0.8;
        count++;
      } else if (fb.userRating === 'good') {
        analysis.relevance += avgRating * 0.8;
        analysis.clarity += avgRating * 0.7;
        count++;
      }
    });

    // Normalize
    for (const key in analysis) {
      analysis[key] = count > 0 ? analysis[key] / count : 3;
    }

    return analysis;
  }

  /**
   * Normalize weights to sum to 1
   */
  private normalizeWeights(): void {
    const sum = Array.from(this.rankingWeights.values()).reduce((a, b) => a + b, 0);

    if (sum > 0) {
      for (const [factor, weight] of this.rankingWeights.entries()) {
        this.rankingWeights.set(factor, weight / sum);
      }
    }
  }

  /**
   * Get current ranking weights
   */
  getRankingWeights(): Record<string, number> {
    return Object.fromEntries(this.rankingWeights);
  }

  /**
   * Get feedback suggestions for query improvement
   */
  async suggestQueryImprovements(queryId: string): Promise<string[]> {
    const relatedFeedback = this.feedbackHistory.filter(fb => fb.queryId === queryId);

    if (relatedFeedback.length === 0) {
      return [];
    }

    const suggestions: string[] = [];
    const avgRating = relatedFeedback
      .flatMap(fb => Array.from(fb.resultRatings.values()))
      .reduce((a, b) => a + b, 0) / relatedFeedback.length;

    if (avgRating < 2.5) {
      suggestions.push('Consider refining the query with more specific terms');
      suggestions.push('Try adding context (recovery, training, nutrition, etc.)');
    }

    if (avgRating < 3.5) {
      suggestions.push('The query might benefit from synonym expansion');
      suggestions.push('Consider breaking this into multiple more focused queries');
    }

    const userComments = relatedFeedback.filter(fb => fb.comments).map(fb => fb.comments);
    if (userComments.length > 0) {
      suggestions.push(`User feedback: ${userComments.join('; ')}`);
    }

    return suggestions;
  }

  /**
   * Get learning statistics
   */
  getStatistics(): {
    totalFeedback: number;
    dateRange: { start: Date; end: Date } | null;
    uniqueQueries: Set<string>;
    uniqueUsers: Set<string>;
  } {
    const queryIds = new Set(this.feedbackHistory.map(fb => fb.queryId));
    const userIds = new Set(this.feedbackHistory.map(fb => fb.userId));

    const timestamps = this.feedbackHistory.map(fb => fb.timestamp);
    const dateRange = timestamps.length > 0 ? {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    } : null;

    return {
      totalFeedback: this.feedbackHistory.length,
      dateRange,
      uniqueQueries: queryIds,
      uniqueUsers: userIds
    };
  }

  /**
   * Export feedback for analysis
   */
  async exportFeedback(): Promise<QueryFeedback[]> {
    return this.feedbackHistory.map(fb => ({
      ...fb,
      resultRatings: new Map(fb.resultRatings)
    }));
  }

  /**
   * Reset learning (for testing)
   */
  reset(): void {
    this.feedbackHistory = [];
    this.rankingWeights = new Map([
      ['relevance', 0.5],
      ['recency', 0.15],
      ['authority', 0.15],
      ['clarity', 0.1],
      ['completeness', 0.1]
    ]);
    logger.info('Feedback learning service reset', { context: 'feedback-learning' });
  }
}

export default FeedbackLearningService;
