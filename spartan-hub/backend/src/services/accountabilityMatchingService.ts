/**
 * Smart Accountability Matching Service
 * 
 * Matches users with compatible workout partners to increase engagement
 * and retention through social accountability and network effects.
 */

import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

export interface UserProfile {
  userId: string;
  displayName: string;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  primaryGoals: string[];
  preferredWorkoutTypes: string[];
  availability: {
    daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
    preferredTimes: string[]; // 'morning', 'afternoon', 'evening'
  };
  timezone: string;
  location?: {
    lat: number;
    lng: number;
    city?: string;
  };
  streak: number;
  weeklyWorkoutFrequency: number;
  personalityType?: 'competitive' | 'collaborative' | 'supportive' | 'analytical';
  languages: string[];
  onboardingDate: Date;
}

export interface CompatibilityFactors {
  scheduleMatch: number; // 0-100
  fitnessLevelCompatibility: number; // 0-100
  goalAlignment: number; // 0-100
  locationProximity?: number; // 0-100 (optional, for in-person matching)
  personalityFit: number; // 0-100
  activityOverlap: number; // 0-100
}

export interface MatchResult {
  user1Id: string;
  user2Id: string;
  compatibilityScore: number;
  factors: CompatibilityFactors;
  reason: string;
  suggestedChallenges: string[];
  matchType: 'perfect' | 'great' | 'good' | 'experimental';
}

export interface AccountabilityMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  matchScore: number;
  status: 'pending' | 'accepted' | 'declined' | 'active' | 'completed';
  createdAt: Date;
  acceptedAt?: Date;
  currentStreak: number;
  totalCheckIns: number;
  lastInteraction: Date;
}

export interface Challenge {
  id: string;
  matchId: string;
  type: 'daily_checkin' | 'workout_together' | 'step_competition' | 'custom';
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  targetValue: number;
  unit: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  participants: {
    userId: string;
    currentValue: number;
    completed: boolean;
    completedAt?: Date;
  }[];
}

export class AccountabilityMatchingService {
  private readonly MINIMUM_COMPATIBILITY_SCORE = 60;
  private readonly MAX_DISTANCE_KM = 50; // For in-person matching

  /**
   * Find optimal workout partners for a user
   */
  async findMatches(
    userId: string,
    limit: number = 5,
    preferInPerson: boolean = false
  ): Promise<MatchResult[]> {
    try {
      logger.info('Finding accountability matches', {
        context: 'accountability-matching',
        metadata: { userId, limit, preferInPerson }
      });

      const userProfile = await this.getUserProfile(userId);
      const candidates = await this.getCandidateUsers(userId, preferInPerson);

      const matches = candidates
        .map((candidate) => this.calculateCompatibility(userProfile, candidate, preferInPerson))
        .filter((match) => match.compatibilityScore >= this.MINIMUM_COMPATIBILITY_SCORE)
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
        .slice(0, limit);

      logger.info('Match search completed', {
        context: 'accountability-matching',
        metadata: {
          userId,
          candidatesFound: candidates.length,
          matchesFound: matches.length
        }
      });

      return matches;
    } catch (error) {
      logger.error('Failed to find matches', {
        context: 'accountability-matching',
        metadata: { userId, error }
      });
      throw error;
    }
  }

  /**
   * Calculate comprehensive compatibility score between two users
   */
  private calculateCompatibility(
    user1: UserProfile,
    user2: UserProfile,
    checkLocation: boolean
  ): MatchResult {
    const factors: CompatibilityFactors = {
      scheduleMatch: this.calculateScheduleMatch(user1, user2),
      fitnessLevelCompatibility: this.calculateFitnessLevelCompatibility(user1, user2),
      goalAlignment: this.calculateGoalAlignment(user1, user2),
      personalityFit: this.calculatePersonalityFit(user1, user2),
      activityOverlap: this.calculateActivityOverlap(user1, user2)
    };

    if (checkLocation && user1.location && user2.location) {
      factors.locationProximity = this.calculateLocationProximity(user1, user2);
    }

    // Weighted scoring
    const weights = {
      scheduleMatch: 0.30,
      fitnessLevelCompatibility: 0.20,
      goalAlignment: 0.20,
      personalityFit: 0.15,
      activityOverlap: 0.15
    };

    let compatibilityScore = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      const factorKey = key as keyof CompatibilityFactors;
      if (factors[factorKey] !== undefined) {
        compatibilityScore += factors[factorKey] * weight;
        totalWeight += weight;
      }
    }

    // Normalize if location proximity wasn't included
    if (checkLocation && factors.locationProximity === undefined) {
      compatibilityScore = compatibilityScore / totalWeight * 1;
    }

    compatibilityScore = Math.round(compatibilityScore);

    return {
      user1Id: user1.userId,
      user2Id: user2.userId,
      compatibilityScore,
      factors,
      reason: this.generateMatchReason(user1, user2, factors),
      suggestedChallenges: this.generateSuggestedChallenges(user1, user2),
      matchType: this.categorizeMatch(compatibilityScore)
    };
  }

  /**
   * Calculate schedule compatibility (0-100)
   */
  private calculateScheduleMatch(user1: UserProfile, user2: UserProfile): number {
    const daysOverlap = user1.availability.daysOfWeek.filter((day) =>
      user2.availability.daysOfWeek.includes(day)
    ).length;
    const daysScore = (daysOverlap / 7) * 50;

    const timesOverlap = user1.availability.preferredTimes.filter((time) =>
      user2.availability.preferredTimes.includes(time)
    ).length;
    const timesScore = user1.availability.preferredTimes.length > 0
      ? (timesOverlap / Math.max(user1.availability.preferredTimes.length, user2.availability.preferredTimes.length)) * 50
      : 25;

    return Math.min(daysScore + timesScore, 100);
  }

  /**
   * Calculate fitness level compatibility (0-100)
   */
  private calculateFitnessLevelCompatibility(user1: UserProfile, user2: UserProfile): number {
    const levels = ['beginner', 'intermediate', 'advanced', 'elite'];
    const index1 = levels.indexOf(user1.fitnessLevel);
    const index2 = levels.indexOf(user2.fitnessLevel);
    const levelDiff = Math.abs(index1 - index2);

    // Allow one level difference, penalize more
    if (levelDiff === 0) return 100;
    if (levelDiff === 1) return 75;
    if (levelDiff === 2) return 40;
    return 10;
  }

  /**
   * Calculate goal alignment (0-100)
   */
  private calculateGoalAlignment(user1: UserProfile, user2: UserProfile): number {
    if (user1.primaryGoals.length === 0 || user2.primaryGoals.length === 0) {
      return 50;
    }

    const overlap = user1.primaryGoals.filter((goal) =>
      user2.primaryGoals.some((g2) =>
        g2.toLowerCase().includes(goal.toLowerCase()) ||
        goal.toLowerCase().includes(g2.toLowerCase())
      )
    ).length;

    return Math.min((overlap / Math.min(user1.primaryGoals.length, user2.primaryGoals.length)) * 100, 100);
  }

  /**
   * Calculate personality compatibility (0-100)
   */
  private calculatePersonalityFit(user1: UserProfile, user2: UserProfile): number {
    if (!user1.personalityType || !user2.personalityType) {
      return 70; // Neutral score if unknown
    }

    const compatiblePairs: Record<string, string[]> = {
      competitive: ['competitive', 'analytical'],
      collaborative: ['collaborative', 'supportive'],
      supportive: ['supportive', 'collaborative', 'beginner'],
      analytical: ['analytical', 'competitive']
    };

    if (user1.personalityType === user2.personalityType) {
      return 90;
    }

    if (compatiblePairs[user1.personalityType]?.includes(user2.personalityType)) {
      return 80;
    }

    return 50;
  }

  /**
   * Calculate workout activity overlap (0-100)
   */
  private calculateActivityOverlap(user1: UserProfile, user2: UserProfile): number {
    if (user1.preferredWorkoutTypes.length === 0 || user2.preferredWorkoutTypes.length === 0) {
      return 50;
    }

    const overlap = user1.preferredWorkoutTypes.filter((type) =>
      user2.preferredWorkoutTypes.some((t2) =>
        t2.toLowerCase() === type.toLowerCase()
      )
    ).length;

    return Math.min((overlap / Math.min(user1.preferredWorkoutTypes.length, user2.preferredWorkoutTypes.length)) * 100, 100);
  }

  /**
   * Calculate physical proximity for in-person matching (0-100)
   */
  private calculateLocationProximity(user1: UserProfile, user2: UserProfile): number {
    if (!user1.location || !user2.location) {
      return 0;
    }

    const distance = this.calculateDistance(
      user1.location.lat,
      user1.location.lng,
      user2.location.lat,
      user2.location.lng
    );

    if (distance <= 5) return 100;
    if (distance <= 15) return 80;
    if (distance <= 30) return 60;
    if (distance <= this.MAX_DISTANCE_KM) return 40;
    return 10;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate human-readable match reason
   */
  private generateMatchReason(
    user1: UserProfile,
    user2: UserProfile,
    factors: CompatibilityFactors
  ): string {
    const reasons: string[] = [];

    if (factors.scheduleMatch >= 80) {
      reasons.push('Great schedule overlap');
    }

    if (factors.goalAlignment >= 70) {
      const sharedGoals = user1.primaryGoals.filter((g) =>
        user2.primaryGoals.some((g2) => g2.toLowerCase().includes(g.toLowerCase()))
      );
      if (sharedGoals.length > 0) {
        reasons.push(`Shared goal: ${sharedGoals[0]}`);
      }
    }

    if (factors.fitnessLevelCompatibility >= 75) {
      reasons.push('Compatible fitness levels');
    }

    if (factors.activityOverlap >= 70) {
      const sharedActivities = user1.preferredWorkoutTypes.filter((t) =>
        user2.preferredWorkoutTypes.includes(t)
      );
      if (sharedActivities.length > 0) {
        reasons.push(`Both enjoy ${sharedActivities[0]}`);
      }
    }

    if (reasons.length === 0) {
      return 'Promising compatibility across multiple factors';
    }

    return reasons.join(' • ');
  }

  /**
   * Generate suggested challenges for the match
   */
  private generateSuggestedChallenges(user1: UserProfile, user2: UserProfile): string[] {
    const challenges: string[] = [];

    if (user1.preferredWorkoutTypes.some((t) => user2.preferredWorkoutTypes.includes(t))) {
      const sharedActivity = user1.preferredWorkoutTypes.find((t) =>
        user2.preferredWorkoutTypes.includes(t)
      );
      challenges.push(`Complete 3 ${sharedActivity} sessions together this week`);
    }

    if (user1.streak > 0 || user2.streak > 0) {
      challenges.push('Maintain 7-day workout streak together');
    }

    challenges.push('Daily check-in: Share one win from your workout');
    challenges.push('Step challenge: Reach 10,000 steps together for 5 days');

    return challenges.slice(0, 3);
  }

  /**
   * Categorize match quality
   */
  private categorizeMatch(score: number): 'perfect' | 'great' | 'good' | 'experimental' {
    if (score >= 90) return 'perfect';
    if (score >= 80) return 'great';
    if (score >= 70) return 'good';
    return 'experimental';
  }

  /**
   * Create an accountability match between two users
   */
  async createMatch(
    user1Id: string,
    user2Id: string,
    matchScore: number
  ): Promise<AccountabilityMatch> {
    try {
      const match: AccountabilityMatch = {
        id: this.generateMatchId(),
        user1Id,
        user2Id,
        matchScore,
        status: 'pending',
        createdAt: new Date(),
        currentStreak: 0,
        totalCheckIns: 0,
        lastInteraction: new Date()
      };

      // In real implementation, save to database
      logger.info('Accountability match created', {
        context: 'accountability-matching',
        metadata: { matchId: match.id, user1Id, user2Id, matchScore }
      });

      return match;
    } catch (error) {
      logger.error('Failed to create match', {
        context: 'accountability-matching',
        metadata: { user1Id, user2Id, error }
      });
      throw error;
    }
  }

  /**
   * Accept a pending match
   */
  async acceptMatch(matchId: string, userId: string): Promise<AccountabilityMatch> {
    try {
      // In real implementation, update database
      logger.info('Match accepted', {
        context: 'accountability-matching',
        metadata: { matchId, userId }
      });

      return {
        id: matchId,
        user1Id: userId,
        user2Id: '',
        matchScore: 0,
        status: 'active',
        createdAt: new Date(),
        acceptedAt: new Date(),
        currentStreak: 0,
        totalCheckIns: 0,
        lastInteraction: new Date()
      };
    } catch (error) {
      logger.error('Failed to accept match', {
        context: 'accountability-matching',
        metadata: { matchId, userId, error }
      });
      throw error;
    }
  }

  /**
   * Create a challenge for an active match
   */
  async createChallenge(
    matchId: string,
    type: Challenge['type'],
    title: string,
    description: string,
    targetValue: number,
    unit: string,
    durationDays: number,
    participantIds: string[]
  ): Promise<Challenge> {
    try {
      const challenge: Challenge = {
        id: this.generateChallengeId(),
        matchId,
        type,
        title,
        description,
        startDate: new Date(),
        endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
        targetValue,
        unit,
        status: 'active',
        participants: participantIds.map((id) => ({
          userId: id,
          currentValue: 0,
          completed: false
        }))
      };

      logger.info('Challenge created', {
        context: 'accountability-matching',
        metadata: {
          challengeId: challenge.id,
          matchId,
          type,
          participantCount: participantIds.length
        }
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to create challenge', {
        context: 'accountability-matching',
        metadata: { matchId, type, error }
      });
      throw error;
    }
  }

  /**
   * Record a check-in for an accountability match
   */
  async recordCheckIn(matchId: string, userId: string): Promise<void> {
    try {
      // In real implementation, update database
      logger.info('Check-in recorded', {
        context: 'accountability-matching',
        metadata: { matchId, userId, timestamp: new Date() }
      });
    } catch (error) {
      logger.error('Failed to record check-in', {
        context: 'accountability-matching',
        metadata: { matchId, userId, error }
      });
      throw error;
    }
  }

  /**
   * Get user's current matches
   */
  async getUserMatches(userId: string): Promise<AccountabilityMatch[]> {
    // In real implementation, query database
    return [];
  }

  /**
   * Get user's active challenges
   */
  async getUserChallenges(userId: string): Promise<Challenge[]> {
    // In real implementation, query database
    return [];
  }

  /**
   * Decline a match request
   */
  async declineMatch(matchId: string, userId: string): Promise<void> {
    try {
      logger.info('Declining match', {
        context: 'accountability-matching',
        metadata: { matchId, userId }
      });

      // In real implementation, update database
    } catch (error) {
      logger.error('Failed to decline match', {
        context: 'accountability-matching',
        metadata: { matchId, userId, error }
      });
      throw error;
    }
  }

  /**
   * Update challenge progress
   */
  async updateChallengeProgress(
    challengeId: string,
    userId: string,
    value: number
  ): Promise<void> {
    try {
      logger.info('Updating challenge progress', {
        context: 'accountability-matching',
        metadata: { challengeId, userId, value }
      });

      // In real implementation, update database
    } catch (error) {
      logger.error('Failed to update challenge progress', {
        context: 'accountability-matching',
        metadata: { challengeId, userId, error }
      });
      throw error;
    }
  }

  /**
   * Get user profile (placeholder - will integrate with existing user service)
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    // In real implementation, fetch from database
    throw new ValidationError('User profile not found');
  }

  /**
   * Get candidate users for matching (placeholder)
   */
  private async getCandidateUsers(userId: string, preferInPerson: boolean): Promise<UserProfile[]> {
    // In real implementation, query database with filters
    return [];
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChallengeId(): string {
    return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
