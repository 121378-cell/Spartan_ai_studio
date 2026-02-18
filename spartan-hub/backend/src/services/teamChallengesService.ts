/**
 * Team Challenges Service
 * 
 * Enables group competitions between friends, teams, and corporations.
 * Challenges track metrics like steps, consistency, workout completion.
 * Creates network effects through social accountability.
 * 
 * Part of Fase 6: Network Effects from strategic roadmap.
 */

import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

export interface Challenge {
  id: string;
  creatorId: string;
  type: 'steps' | 'workouts' | 'consistency' | 'distance' | 'calories' | 'custom';
  title: string;
  description: string;
  goal: {
    metric: string;
    target: number;
    unit: string;
  };
  timeframe: {
    startDate: Date;
    endDate: Date;
    timezone: string;
  };
  visibility: 'public' | 'private' | 'invite_only';
  maxParticipants?: number;
  minParticipants: number;
  reward?: {
    type: 'badge' | 'points' | 'prize' | 'recognition';
    description: string;
    value?: number;
  };
  rules: string[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  stats: {
    totalParticipants: number;
    completionRate: number;
    averageProgress: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  teamId?: string;
  status: 'invited' | 'joined' | 'active' | 'completed' | 'dropped';
  progress: number;
  currentValue: number;
  rank?: number;
  joinedAt: Date;
  completedAt?: Date;
  streakDays: number;
  lastActivity: Date;
}

export interface Team {
  id: string;
  challengeId: string;
  name: string;
  avatar?: string;
  captainId: string;
  members: string[]; // user IDs
  stats: {
    totalProgress: number;
    averageProgress: number;
    rank?: number;
  };
  createdAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  userId: string;
  teamId?: string;
  teamName?: string;
  displayName: string;
  avatar?: string;
  progress: number;
  currentValue: number;
  trend: 'up' | 'down' | 'stable';
  lastActivity: Date;
  streakDays: number;
}

export interface CorporateChallenge extends Challenge {
  organizationId: string;
  departmentFilter?: string[];
  participationIncentive: {
    type: 'health_credit' | 'pto' | 'wellness_points' | 'gift_card';
    value: number;
    description: string;
  };
  reporting: {
    dashboardEnabled: boolean;
    anonymized: boolean;
    metrics: string[];
  };
}

export class TeamChallengesService {
  private challenges: Map<string, Challenge> = new Map();
  private participants: Map<string, ChallengeParticipant> = new Map();
  private teams: Map<string, Team> = new Map();

  /**
   * Create new challenge
   */
  async createChallenge(
    creatorId: string,
    type: Challenge['type'],
    title: string,
    description: string,
    goal: Challenge['goal'],
    timeframe: Challenge['timeframe'],
    options?: {
      visibility?: Challenge['visibility'];
      maxParticipants?: number;
      reward?: Challenge['reward'];
      rules?: string[];
    }
  ): Promise<Challenge> {
    try {
      logger.info('Creating challenge', {
        context: 'team-challenges',
        metadata: { creatorId, type, title }
      });

      const challenge: Challenge = {
        id: this.generateChallengeId(),
        creatorId,
        type,
        title,
        description,
        goal,
        timeframe,
        visibility: options?.visibility || 'private',
        maxParticipants: options?.maxParticipants,
        minParticipants: 2,
        reward: options?.reward,
        rules: options?.rules || [],
        status: 'draft',
        stats: {
          totalParticipants: 0,
          completionRate: 0,
          averageProgress: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.challenges.set(challenge.id, challenge);

      logger.info('Challenge created', {
        context: 'team-challenges',
        metadata: { challengeId: challenge.id, creatorId }
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to create challenge', {
        context: 'team-challenges',
        metadata: { creatorId, error }
      });
      throw error;
    }
  }

  /**
   * Start challenge
   */
  async startChallenge(challengeId: string): Promise<Challenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new ValidationError('Challenge not found');
    }

    const participants = this.getChallengeParticipants(challengeId);
    if (participants.length < challenge.minParticipants) {
      throw new ValidationError(
        `Need at least ${challenge.minParticipants} participants to start`
      );
    }

    challenge.status = 'active';
    challenge.timeframe.startDate = new Date();
    challenge.updatedAt = new Date();

    logger.info('Challenge started', {
      context: 'team-challenges',
      metadata: { challengeId, participants: participants.length }
    });

    return challenge;
  }

  /**
   * Join challenge
   */
  async joinChallenge(
    challengeId: string,
    userId: string,
    teamId?: string
  ): Promise<ChallengeParticipant> {
    try {
      const challenge = this.challenges.get(challengeId);
      if (!challenge) {
        throw new ValidationError('Challenge not found');
      }

      if (challenge.status !== 'active' && challenge.status !== 'draft') {
        throw new ValidationError('Challenge is not accepting new participants');
      }

      if (challenge.maxParticipants) {
        const currentParticipants = this.getChallengeParticipants(challengeId).length;
        if (currentParticipants >= challenge.maxParticipants) {
          throw new ValidationError('Challenge is full');
        }
      }

      // Check if already joined
      const existing = Array.from(this.participants.values()).find(
        p => p.challengeId === challengeId && p.userId === userId
      );
      if (existing) {
        throw new ValidationError('Already joined this challenge');
      }

      const participant: ChallengeParticipant = {
        id: this.generateParticipantId(),
        challengeId,
        userId,
        teamId,
        status: 'joined',
        progress: 0,
        currentValue: 0,
        joinedAt: new Date(),
        streakDays: 0,
        lastActivity: new Date()
      };

      this.participants.set(participant.id, participant);
      challenge.stats.totalParticipants++;

      logger.info('User joined challenge', {
        context: 'team-challenges',
        metadata: { challengeId, userId, participantId: participant.id }
      });

      return participant;
    } catch (error) {
      logger.error('Failed to join challenge', {
        context: 'team-challenges',
        metadata: { challengeId, userId, error }
      });
      throw error;
    }
  }

  /**
   * Create team within challenge
   */
  async createTeam(
    challengeId: string,
    captainId: string,
    name: string,
    avatar?: string
  ): Promise<Team> {
    try {
      const challenge = this.challenges.get(challengeId);
      if (!challenge) {
        throw new ValidationError('Challenge not found');
      }

      // Verify captain is participant
      const captainParticipant = Array.from(this.participants.values()).find(
        p => p.challengeId === challengeId && p.userId === captainId
      );
      if (!captainParticipant) {
        throw new ValidationError('Must join challenge before creating team');
      }

      const team: Team = {
        id: this.generateTeamId(),
        challengeId,
        name,
        avatar,
        captainId,
        members: [captainId],
        stats: {
          totalProgress: 0,
          averageProgress: 0
        },
        createdAt: new Date()
      };

      this.teams.set(team.id, team);
      captainParticipant.teamId = team.id;

      logger.info('Team created', {
        context: 'team-challenges',
        metadata: { teamId: team.id, challengeId, captainId }
      });

      return team;
    } catch (error) {
      logger.error('Failed to create team', {
        context: 'team-challenges',
        metadata: { challengeId, captainId, error }
      });
      throw error;
    }
  }

  /**
   * Join team
   */
  async joinTeam(teamId: string, userId: string): Promise<void> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new ValidationError('Team not found');
    }

    const participant = Array.from(this.participants.values()).find(
      p => p.challengeId === team.challengeId && p.userId === userId
    );
    if (!participant) {
      throw new ValidationError('Must join challenge before joining team');
    }

    if (participant.teamId) {
      throw new ValidationError('Already in a team');
    }

    team.members.push(userId);
    participant.teamId = teamId;

    logger.info('User joined team', {
      context: 'team-challenges',
      metadata: { teamId, userId }
    });
  }

  /**
   * Update participant progress
   */
  async updateProgress(
    challengeId: string,
    userId: string,
    value: number
  ): Promise<ChallengeParticipant> {
    try {
      const participant = Array.from(this.participants.values()).find(
        p => p.challengeId === challengeId && p.userId === userId
      );
      if (!participant) {
        throw new ValidationError('Participant not found');
      }

      const challenge = this.challenges.get(challengeId)!;

      // Update progress
      participant.currentValue = value;
      participant.progress = Math.min(100, (value / challenge.goal.target) * 100);
      participant.lastActivity = new Date();

      // Update streak
      const lastActivity = new Date(participant.lastActivity);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        participant.streakDays++;
      } else {
        participant.streakDays = 1;
      }

      // Check if completed
      if (participant.progress >= 100 && participant.status !== 'completed') {
        participant.status = 'completed';
        participant.completedAt = new Date();
        participant.rank = this.calculateRank(challengeId, participant.id);
      } else {
        participant.status = 'active';
      }

      // Update team stats if applicable
      if (participant.teamId) {
        this.updateTeamStats(participant.teamId);
      }

      // Update challenge stats
      this.updateChallengeStats(challengeId);

      logger.info('Progress updated', {
        context: 'team-challenges',
        metadata: {
          challengeId,
          userId,
          progress: participant.progress,
          streak: participant.streakDays
        }
      });

      return participant;
    } catch (error) {
      logger.error('Failed to update progress', {
        context: 'team-challenges',
        metadata: { challengeId, userId, error }
      });
      throw error;
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    challengeId: string,
    type: 'individual' | 'team' = 'individual'
  ): Promise<LeaderboardEntry[]> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new ValidationError('Challenge not found');
    }

    if (type === 'team') {
      return this.getTeamLeaderboard(challengeId);
    }

    const participants = this.getChallengeParticipants(challengeId);
    const sorted = participants
      .filter(p => p.status !== 'dropped')
      .sort((a, b) => b.progress - a.progress);

    return sorted.map((participant, index) => ({
      rank: index + 1,
      participantId: participant.id,
      userId: participant.userId,
      teamId: participant.teamId,
      teamName: participant.teamId ? this.teams.get(participant.teamId)?.name : undefined,
      displayName: `User ${  participant.userId}`, // In production, fetch from user service
      avatar: undefined, // In production, fetch from user service
      progress: participant.progress,
      currentValue: participant.currentValue,
      trend: this.calculateTrend(participant),
      lastActivity: participant.lastActivity,
      streakDays: participant.streakDays
    }));
  }

  /**
   * Get active challenges for user
   */
  async getUserActiveChallenges(userId: string): Promise<Challenge[]> {
    const participantIds = Array.from(this.participants.values())
      .filter(p => p.userId === userId && (p.status === 'joined' || p.status === 'active'))
      .map(p => p.challengeId);

    return Array.from(this.challenges.values())
      .filter(c => participantIds.includes(c.id) && c.status === 'active')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get available challenges
   */
  async getAvailableChallenges(
    filters?: {
      type?: Challenge['type'];
      visibility?: Challenge['visibility'];
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{ challenges: Challenge[]; total: number }> {
    let challengeList = Array.from(this.challenges.values())
      .filter(c => c.status === 'active' && c.visibility === 'public');

    if (filters?.type) {
      challengeList = challengeList.filter(c => c.type === filters.type);
    }

    // Sort by recency and popularity
    challengeList.sort((a, b) => {
      const scoreA = a.stats.totalParticipants * 0.6 + a.createdAt.getTime() * 0.00000001;
      const scoreB = b.stats.totalParticipants * 0.6 + b.createdAt.getTime() * 0.00000001;
      return scoreB - scoreA;
    });

    const total = challengeList.length;
    return {
      challenges: challengeList.slice(offset, offset + limit),
      total
    };
  }

  // Private helper methods

  private getChallengeParticipants(challengeId: string): ChallengeParticipant[] {
    return Array.from(this.participants.values())
      .filter(p => p.challengeId === challengeId);
  }

  private getTeamLeaderboard(challengeId: string): LeaderboardEntry[] {
    const teams = Array.from(this.teams.values())
      .filter(t => t.challengeId === challengeId)
      .sort((a, b) => b.stats.averageProgress - a.stats.averageProgress);

    return teams.map((team, index) => ({
      rank: index + 1,
      participantId: team.id,
      userId: team.captainId,
      teamId: team.id,
      teamName: team.name,
      displayName: team.name,
      avatar: team.avatar,
      progress: team.stats.averageProgress,
      currentValue: team.stats.totalProgress,
      trend: 'stable',
      lastActivity: new Date(),
      streakDays: 0
    }));
  }

  private updateTeamStats(teamId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;

    const members = this.getChallengeParticipants(team.challengeId)
      .filter(p => p.teamId === teamId);

    const totalProgress = members.reduce((sum, m) => sum + m.progress, 0);
    team.stats = {
      totalProgress,
      averageProgress: totalProgress / members.length,
      rank: team.stats.rank
    };
  }

  private updateChallengeStats(challengeId: string): void {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return;

    const participants = this.getChallengeParticipants(challengeId);
    const active = participants.filter(p => p.status === 'active');
    const completed = participants.filter(p => p.status === 'completed');

    challenge.stats = {
      totalParticipants: participants.length,
      completionRate: participants.length > 0 
        ? (completed.length / participants.length) * 100 
        : 0,
      averageProgress: active.length > 0
        ? active.reduce((sum, p) => sum + p.progress, 0) / active.length
        : 0
    };
  }

  private calculateRank(challengeId: string, participantId: string): number {
    const participants = this.getChallengeParticipants(challengeId)
      .filter(p => p.status === 'completed')
      .sort((a, b) => (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0));

    const index = participants.findIndex(p => p.id === participantId);
    return index !== -1 ? index + 1 : participants.length + 1;
  }

  private calculateTrend(participant: ChallengeParticipant): 'up' | 'down' | 'stable' {
    // Simplified trend calculation
    if (participant.streakDays > 3) return 'up';
    if (participant.streakDays === 0) return 'down';
    return 'stable';
  }

  private generateChallengeId(): string {
    return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateParticipantId(): string {
    return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTeamId(): string {
    return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const teamChallengesService = new TeamChallengesService();
