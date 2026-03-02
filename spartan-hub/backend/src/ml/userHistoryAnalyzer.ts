/**
 * User History Analyzer
 * Phase B: Advanced ML Models - Week 5 Day 2
 * 
 * Analyzes user workout history for personalized recommendations
 */

import { logger } from '../utils/logger';

export interface UserWorkout {
  id: string;
  userId: string;
  exerciseType: string;
  formScore: number;
  timestamp: number;
  metrics: Record<string, any>;
  warnings: string[];
  recommendations: string[];
}

export interface UserPatterns {
  averageFormScore: number;
  formScoreTrend: 'improving' | 'stable' | 'declining';
  mostFrequentExercises: string[];
  commonWarnings: string[];
  bestPerformanceTime: string;
  consistencyScore: number;
  improvementAreas: string[];
}

export interface UserProgress {
  userId: string;
  totalWorkouts: number;
  exercisesCompleted: Record<string, number>;
  formScoreHistory: number[];
  streakDays: number;
  personalRecords: Record<string, number>;
  weaknesses: string[];
  strengths: string[];
}

/**
 * User History Analyzer
 */
export class UserHistoryAnalyzer {
  private workoutHistory: UserWorkout[] = [];

  constructor() {
    logger.info('UserHistoryAnalyzer initialized', {
      context: 'user-history'
    });
  }

  /**
   * Add workout to history
   */
  addWorkout(workout: UserWorkout): void {
    this.workoutHistory.push(workout);
    
    logger.debug('Workout added to history', {
      context: 'user-history',
      metadata: {
        userId: workout.userId,
        exerciseType: workout.exerciseType,
        formScore: workout.formScore
      }
    });
  }

  /**
   * Analyze user patterns
   */
  analyzePatterns(userId: string): UserPatterns {
    const userWorkouts = this.getUserWorkouts(userId);
    
    if (userWorkouts.length === 0) {
      return this.getEmptyPatterns();
    }

    const averageFormScore = this.calculateAverageFormScore(userWorkouts);
    const formScoreTrend = this.calculateFormScoreTrend(userWorkouts);
    const mostFrequentExercises = this.getMostFrequentExercises(userWorkouts);
    const commonWarnings = this.getCommonWarnings(userWorkouts);
    const bestPerformanceTime = this.getBestPerformanceTime(userWorkouts);
    const consistencyScore = this.calculateConsistencyScore(userWorkouts);
    const improvementAreas = this.identifyImprovementAreas(userWorkouts);

    return {
      averageFormScore,
      formScoreTrend,
      mostFrequentExercises,
      commonWarnings,
      bestPerformanceTime,
      consistencyScore,
      improvementAreas
    };
  }

  /**
   * Get user progress report
   */
  getUserProgress(userId: string): UserProgress {
    const userWorkouts = this.getUserWorkouts(userId);
    
    const totalWorkouts = userWorkouts.length;
    const exercisesCompleted = this.countExercises(userWorkouts);
    const formScoreHistory = userWorkouts.map(w => w.formScore);
    const streakDays = this.calculateStreak(userWorkouts);
    const personalRecords = this.getPersonalRecords(userWorkouts);
    const weaknesses = this.identifyWeaknesses(userWorkouts);
    const strengths = this.identifyStrengths(userWorkouts);

    return {
      userId,
      totalWorkouts,
      exercisesCompleted,
      formScoreHistory,
      streakDays,
      personalRecords,
      weaknesses,
      strengths
    };
  }

  /**
   * Get recent workouts
   */
  getRecentWorkouts(userId: string, limit: number = 10): UserWorkout[] {
    return this.getUserWorkouts(userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get workouts by exercise type
   */
  getWorkoutsByExercise(userId: string, exerciseType: string): UserWorkout[] {
    return this.getUserWorkouts(userId).filter(w => w.exerciseType === exerciseType);
  }

  // Private helper methods

  private getUserWorkouts(userId: string): UserWorkout[] {
    return this.workoutHistory.filter(w => w.userId === userId);
  }

  private getEmptyPatterns(): UserPatterns {
    return {
      averageFormScore: 0,
      formScoreTrend: 'stable',
      mostFrequentExercises: [],
      commonWarnings: [],
      bestPerformanceTime: 'morning',
      consistencyScore: 0,
      improvementAreas: []
    };
  }

  private calculateAverageFormScore(workouts: UserWorkout[]): number {
    if (workouts.length === 0) return 0;
    
    const sum = workouts.reduce((acc, w) => acc + w.formScore, 0);
    return Math.round(sum / workouts.length);
  }

  private calculateFormScoreTrend(workouts: UserWorkout[]): 'improving' | 'stable' | 'declining' {
    if (workouts.length < 3) return 'stable';
    
    // Compare last 5 workouts to previous 5
    const sorted = [...workouts].sort((a, b) => a.timestamp - b.timestamp);
    const recent = sorted.slice(-5);
    const older = sorted.slice(-10, -5);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = this.calculateAverageFormScore(recent);
    const olderAvg = this.calculateAverageFormScore(older);
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private getMostFrequentExercises(workouts: UserWorkout[]): string[] {
    const exerciseCount: Record<string, number> = {};
    
    workouts.forEach(w => {
      exerciseCount[w.exerciseType] = (exerciseCount[w.exerciseType] || 0) + 1;
    });
    
    return Object.entries(exerciseCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([exercise]) => exercise);
  }

  private getCommonWarnings(workouts: UserWorkout[]): string[] {
    const warningCount: Record<string, number> = {};
    
    workouts.forEach(w => {
      w.warnings.forEach(warning => {
        warningCount[warning] = (warningCount[warning] || 0) + 1;
      });
    });
    
    return Object.entries(warningCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([warning]) => warning);
  }

  private getBestPerformanceTime(workouts: UserWorkout[]): string {
    // Analyze performance by time of day
    const timePerformance: Record<string, number[]> = {
      morning: [],
      afternoon: [],
      evening: []
    };
    
    workouts.forEach(w => {
      const hour = new Date(w.timestamp).getHours();
      let period: 'morning' | 'afternoon' | 'evening' = 'morning';
      
      if (hour >= 12 && hour < 17) period = 'afternoon';
      else if (hour >= 17) period = 'evening';
      
      timePerformance[period].push(w.formScore);
    });
    
    const averages = Object.entries(timePerformance).map(([period, scores]) => ({
      period,
      average: scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0
    }));
    
    const best = averages.reduce((a, b) => a.average > b.average ? a : b);
    return best.period;
  }

  private calculateConsistencyScore(workouts: UserWorkout[]): number {
    if (workouts.length < 2) return 0;
    
    // Calculate variance in form scores
    const scores = workouts.map(w => w.formScore);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, s) => acc + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower stdDev = higher consistency
    const consistencyScore = Math.max(0, 100 - stdDev * 2);
    return Math.round(consistencyScore);
  }

  private identifyImprovementAreas(workouts: UserWorkout[]): string[] {
    const areas: string[] = [];
    
    // Analyze common warnings
    const commonWarnings = this.getCommonWarnings(workouts);
    if (commonWarnings.length > 0) {
      areas.push(...commonWarnings.slice(0, 3));
    }
    
    // Analyze form score trend
    const trend = this.calculateFormScoreTrend(workouts);
    if (trend === 'declining') {
      areas.push('Overall form declining');
    }
    
    // Analyze consistency
    const consistency = this.calculateConsistencyScore(workouts);
    if (consistency < 60) {
      areas.push('Inconsistent performance');
    }
    
    return areas;
  }

  private countExercises(workouts: UserWorkout[]): Record<string, number> {
    const count: Record<string, number> = {};
    
    workouts.forEach(w => {
      count[w.exerciseType] = (count[w.exerciseType] || 0) + 1;
    });
    
    return count;
  }

  private calculateStreak(workouts: UserWorkout[]): number {
    if (workouts.length === 0) return 0;
    
    const sorted = [...workouts].sort((a, b) => b.timestamp - a.timestamp);
    let streak = 1;
    
    for (let i = 1; i < sorted.length; i++) {
      const diff = sorted[i - 1].timestamp - sorted[i].timestamp;
      const daysDiff = diff / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 2) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private getPersonalRecords(workouts: UserWorkout[]): Record<string, number> {
    const records: Record<string, number> = {};
    
    workouts.forEach(w => {
      if (!records[w.exerciseType] || w.formScore > records[w.exerciseType]) {
        records[w.exerciseType] = w.formScore;
      }
    });
    
    return records;
  }

  private identifyWeaknesses(workouts: UserWorkout[]): string[] {
    const weaknesses: string[] = [];
    
    // Find exercises with lowest average scores
    const exerciseScores: Record<string, number[]> = {};
    
    workouts.forEach(w => {
      if (!exerciseScores[w.exerciseType]) {
        exerciseScores[w.exerciseType] = [];
      }
      exerciseScores[w.exerciseType].push(w.formScore);
    });
    
    const exerciseAverages = Object.entries(exerciseScores).map(([exercise, scores]) => ({
      exercise,
      average: scores.reduce((a, b) => a + b, 0) / scores.length
    }));
    
    const weakest = exerciseAverages.sort((a, b) => a.average - b.average).slice(0, 2);
    weaknesses.push(...weakest.map(w => w.exercise));
    
    return weaknesses;
  }

  private identifyStrengths(workouts: UserWorkout[]): string[] {
    const strengths: string[] = [];
    
    // Find exercises with highest average scores
    const exerciseScores: Record<string, number[]> = {};
    
    workouts.forEach(w => {
      if (!exerciseScores[w.exerciseType]) {
        exerciseScores[w.exerciseType] = [];
      }
      exerciseScores[w.exerciseType].push(w.formScore);
    });
    
    const exerciseAverages = Object.entries(exerciseScores).map(([exercise, scores]) => ({
      exercise,
      average: scores.reduce((a, b) => a + b, 0) / scores.length
    }));
    
    const strongest = exerciseAverages.sort((a, b) => b.average - a.average).slice(0, 2);
    strengths.push(...strongest.map(s => s.exercise));
    
    return strengths;
  }
}

export default UserHistoryAnalyzer;
