/**
 * Personalized Recommendations Engine
 * Phase B: Advanced ML Models - Week 5 Day 2
 * 
 * Generates adaptive recommendations based on user history
 */

import { UserHistoryAnalyzer, UserPatterns, UserProgress } from './userHistoryAnalyzer';
import { logger } from '../utils/logger';

export interface PersonalizedRecommendation {
  id: string;
  type: 'exercise' | 'form' | 'recovery' | 'progression';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  basedOn: string[];
  expectedImprovement: string;
}

export interface RecommendationConfig {
  maxRecommendations: number;
  prioritizeWeaknesses: boolean;
  includeProgression: boolean;
  adaptationRate: 'slow' | 'normal' | 'fast';
  [key: string]: any;
}

/**
 * Personalized Recommendations Engine
 */
export class PersonalizedRecommendationsEngine {
  private historyAnalyzer: UserHistoryAnalyzer;
  private config: RecommendationConfig;

  constructor(config?: Partial<RecommendationConfig>) {
    this.historyAnalyzer = new UserHistoryAnalyzer();
    this.config = {
      maxRecommendations: 5,
      prioritizeWeaknesses: true,
      includeProgression: true,
      adaptationRate: 'normal',
      ...config
    };

    logger.info('PersonalizedRecommendationsEngine initialized', {
      context: 'recommendations',
      metadata: this.config
    });
  }

  /**
   * Generate personalized recommendations for user
   */
  generateRecommendations(userId: string): PersonalizedRecommendation[] {
    const patterns = this.historyAnalyzer.analyzePatterns(userId);
    const progress = this.historyAnalyzer.getUserProgress(userId);

    logger.info('Generating personalized recommendations', {
      context: 'recommendations',
      metadata: {
        userId,
        totalWorkouts: progress.totalWorkouts,
        averageFormScore: patterns.averageFormScore,
        formScoreTrend: patterns.formScoreTrend
      }
    });

    const recommendations: PersonalizedRecommendation[] = [];

    // Generate recommendations based on patterns
    recommendations.push(...this.generateFormRecommendations(patterns, progress));
    recommendations.push(...this.generateExerciseRecommendations(patterns, progress));
    recommendations.push(...this.generateRecoveryRecommendations(patterns, progress));
    recommendations.push(...this.generateProgressionRecommendations(patterns, progress));

    // Sort by priority
    recommendations.sort((a, b) => this.priorityScore(a) - this.priorityScore(b));

    // Return top N recommendations
    return recommendations.slice(0, this.config.maxRecommendations);
  }

  /**
   * Add workout and update recommendations
   */
  addWorkoutAndRefresh(workout: any): PersonalizedRecommendation[] {
    this.historyAnalyzer.addWorkout(workout);
    return this.generateRecommendations(workout.userId);
  }

  // Private recommendation generators

  private generateFormRecommendations(
    patterns: UserPatterns,
    progress: UserProgress
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Common warnings
    if (patterns.commonWarnings.length > 0) {
      const topWarning = patterns.commonWarnings[0];
      
      recommendations.push({
        id: `form-${Date.now()}-1`,
        type: 'form',
        priority: 'high',
        title: 'Address Form Issue',
        description: `You frequently experience: ${topWarning}`,
        actionItems: [
          'Review exercise technique guide',
          'Reduce weight by 10-20%',
          'Focus on controlled movement',
          'Record yourself for self-assessment'
        ],
        basedOn: [topWarning],
        expectedImprovement: '10-15% form score improvement'
      });
    }

    // Declining trend
    if (patterns.formScoreTrend === 'declining') {
      recommendations.push({
        id: `form-${Date.now()}-2`,
        type: 'form',
        priority: 'high',
        title: 'Form Decline Detected',
        description: 'Your form scores have been declining recently',
        actionItems: [
          'Take a deload week',
          'Focus on technique over weight',
          'Consider rest and recovery',
          'Review sleep and nutrition'
        ],
        basedOn: ['Declining form score trend'],
        expectedImprovement: 'Stabilize and reverse decline'
      });
    }

    // Low consistency
    if (patterns.consistencyScore < 60) {
      recommendations.push({
        id: `form-${Date.now()}-3`,
        type: 'form',
        priority: 'medium',
        title: 'Improve Consistency',
        description: 'Your performance varies significantly between sessions',
        actionItems: [
          'Establish consistent warm-up routine',
          'Train at similar times of day',
          'Track pre-workout conditions',
          'Standardize rest periods'
        ],
        basedOn: ['Low consistency score'],
        expectedImprovement: 'More predictable performance'
      });
    }

    return recommendations;
  }

  private generateExerciseRecommendations(
    patterns: UserPatterns,
    progress: UserProgress
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Weak exercises
    if (progress.weaknesses.length > 0) {
      const weakExercise = progress.weaknesses[0];
      
      recommendations.push({
        id: `exercise-${Date.now()}-1`,
        type: 'exercise',
        priority: 'high',
        title: 'Focus on Weakness',
        description: `${weakExercise} needs attention`,
        actionItems: [
          `Add 2-3 extra ${weakExercise} sessions per week`,
          'Start with lighter weight',
          'Focus on mind-muscle connection',
          'Consider accessory exercises'
        ],
        basedOn: [`Low performance in ${weakExercise}`],
        expectedImprovement: '15-20% improvement in 4 weeks'
      });
    }

    // Exercise variety
    if (patterns.mostFrequentExercises.length < 3) {
      recommendations.push({
        id: `exercise-${Date.now()}-2`,
        type: 'exercise',
        priority: 'low',
        title: 'Increase Exercise Variety',
        description: 'You tend to focus on limited exercises',
        actionItems: [
          'Add variety to your routine',
          'Try complementary exercises',
          'Work on balanced development',
          'Prevent overuse injuries'
        ],
        basedOn: ['Limited exercise variety'],
        expectedImprovement: 'Better overall development'
      });
    }

    return recommendations;
  }

  private generateRecoveryRecommendations(
    patterns: UserPatterns,
    progress: UserProgress
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    // Best performance time
    if (patterns.bestPerformanceTime !== 'morning') {
      recommendations.push({
        id: `recovery-${Date.now()}-1`,
        type: 'recovery',
        priority: 'low',
        title: 'Optimize Training Time',
        description: `You perform best in the ${patterns.bestPerformanceTime}`,
        actionItems: [
          `Schedule important sessions in the ${patterns.bestPerformanceTime}`,
          'Ensure adequate pre-workout nutrition',
          'Optimize sleep schedule',
          'Track energy levels throughout day'
        ],
        basedOn: [`Best performance in ${patterns.bestPerformanceTime}`],
        expectedImprovement: '5-10% performance boost'
      });
    }

    // Streak encouragement
    if (progress.streakDays > 0) {
      recommendations.push({
        id: `recovery-${Date.now()}-2`,
        type: 'recovery',
        priority: 'low',
        title: 'Maintain Your Streak',
        description: 'You\'re on a ' + progress.streakDays + '-day streak!',
        actionItems: [
          'Keep up the great work',
          'Ensure adequate recovery',
          'Listen to your body',
          'Don\'t sacrifice form for streak'
        ],
        basedOn: [progress.streakDays + ' day streak'],
        expectedImprovement: 'Habit formation and consistency'
      });
    }

    return recommendations;
  }

  private generateProgressionRecommendations(
    patterns: UserPatterns,
    progress: UserProgress
  ): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = [];

    if (!this.config.includeProgression) {
      return recommendations;
    }

    // Improving trend - suggest progression
    if (patterns.formScoreTrend === 'improving') {
      recommendations.push({
        id: `progression-${Date.now()}-1`,
        type: 'progression',
        priority: 'medium',
        title: 'Ready for Progression',
        description: 'Your form is improving - time to progress!',
        actionItems: [
          'Increase weight by 5-10%',
          'Add complexity to exercises',
          'Try advanced variations',
          'Set new performance goals'
        ],
        basedOn: ['Improving form trend'],
        expectedImprovement: 'Continued progress and adaptation'
      });
    }

    // Personal records
    const prExercises = Object.keys(progress.personalRecords);
    if (prExercises.length > 0) {
      recommendations.push({
        id: `progression-${Date.now()}-2`,
        type: 'progression',
        priority: 'low',
        title: 'Build on Your Success',
        description: `You have personal records in: ${prExercises.join(', ')}`,
        actionItems: [
          'Use successful exercises as templates',
          'Apply lessons to weaker areas',
          'Maintain what works',
          'Set new PR goals'
        ],
        basedOn: ['Personal records achieved'],
        expectedImprovement: 'Transfer success to other areas'
      });
    }

    return recommendations;
  }

  private priorityScore(rec: PersonalizedRecommendation): number {
    const priorityWeights = {
      high: 0,
      medium: 1,
      low: 2
    };
    return priorityWeights[rec.priority];
  }
}

export default PersonalizedRecommendationsEngine;
