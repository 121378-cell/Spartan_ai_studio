/**
 * Team Challenges Service
 * Phase B: Social Features - Week 6 Day 1
 * 
 * Manages team creation, challenges, and leaderboards
 */

import { logger } from '../utils/logger';

export interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  ownerId: string;
  members: TeamMember[];
  maxMembers: number;
  isPrivate: boolean;
  totalPoints: number;
  rank: number;
}

export interface TeamMember {
  userId: string;
  joinedAt: number;
  role: 'owner' | 'admin' | 'member';
  points: number;
  challengesCompleted: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'team' | 'global';
  startDate: number;
  endDate: number;
  participants: string[]; // userIds
  teams: string[]; // teamIds
  goal: ChallengeGoal;
  rewards: ChallengeReward[];
  leaderboard: LeaderboardEntry[];
  status: 'upcoming' | 'active' | 'completed';
}

export interface ChallengeGoal {
  type: 'workouts' | 'form_score' | 'streak' | 'points';
  target: number;
  unit: string;
}

export interface ChallengeReward {
  type: 'points' | 'badge' | 'title' | 'premium';
  value: number | string;
  description: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId?: string;
  teamId?: string;
  name: string;
  value: number;
  progress: number;
  percentage: number;
}

/**
 * Team Challenges Service
 */
export class TeamChallengesService {
  private teams: Map<string, Team> = new Map();
  private challenges: Map<string, Challenge> = new Map();
  private userTeams: Map<string, string[]> = new Map(); // userId -> teamIds

  constructor() {
    logger.info('TeamChallengesService initialized', {
      context: 'team-challenges'
    });
  }

  /**
   * Create a new team
   */
  createTeam(ownerId: string, name: string, description: string, isPrivate: boolean = false): Team {
    const team: Team = {
      id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      createdAt: Date.now(),
      ownerId,
      members: [{
        userId: ownerId,
        joinedAt: Date.now(),
        role: 'owner',
        points: 0,
        challengesCompleted: 0
      }],
      maxMembers: 10,
      isPrivate,
      totalPoints: 0,
      rank: 0
    };

    this.teams.set(team.id, team);
    this.userTeams.set(ownerId, [...(this.userTeams.get(ownerId) || []), team.id]);

    logger.info('Team created', {
      context: 'team-challenges',
      metadata: {
        teamId: team.id,
        teamName: team.name,
        ownerId,
        isPrivate
      }
    });

    return team;
  }

  /**
   * Join a team
   */
  joinTeam(teamId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn('Team not found', {
        context: 'team-challenges',
        metadata: { teamId }
      });
      return false;
    }

    if (team.members.length >= team.maxMembers) {
      logger.warn('Team is full', {
        context: 'team-challenges',
        metadata: { teamId, maxMembers: team.maxMembers }
      });
      return false;
    }

    if (team.isPrivate) {
      logger.warn('Cannot join private team without invite', {
        context: 'team-challenges',
        metadata: { teamId }
      });
      return false;
    }

    // Check if already a member
    if (team.members.some(m => m.userId === userId)) {
      logger.warn('User already in team', {
        context: 'team-challenges',
        metadata: { teamId, userId }
      });
      return false;
    }

    // Add member
    team.members.push({
      userId,
      joinedAt: Date.now(),
      role: 'member',
      points: 0,
      challengesCompleted: 0
    });

    this.userTeams.set(userId, [...(this.userTeams.get(userId) || []), teamId]);

    logger.info('User joined team', {
      context: 'team-challenges',
      metadata: {
        teamId,
        userId,
        memberCount: team.members.length
      }
    });

    return true;
  }

  /**
   * Leave a team
   */
  leaveTeam(teamId: string, userId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      return false;
    }

    // Owner cannot leave without transferring ownership
    if (team.ownerId === userId) {
      logger.warn('Owner cannot leave without transferring ownership', {
        context: 'team-challenges',
        metadata: { teamId, userId }
      });
      return false;
    }

    // Remove member
    team.members = team.members.filter(m => m.userId !== userId);
    
    // Update user teams
    const userTeamList = this.userTeams.get(userId) || [];
    this.userTeams.set(userId, userTeamList.filter(id => id !== teamId));

    logger.info('User left team', {
      context: 'team-challenges',
      metadata: { teamId, userId }
    });

    return true;
  }

  /**
   * Get team by ID
   */
  getTeam(teamId: string): Team | null {
    return this.teams.get(teamId) || null;
  }

  /**
   * Get user's teams
   */
  getUserTeams(userId: string): Team[] {
    const teamIds = this.userTeams.get(userId) || [];
    return teamIds.map(id => this.teams.get(id)).filter((t): t is Team => !!t);
  }

  /**
   * Create a challenge
   */
  createChallenge(
    name: string,
    description: string,
    type: Challenge['type'],
    startDate: number,
    endDate: number,
    goal: ChallengeGoal,
    rewards: ChallengeReward[]
  ): Challenge {
    const challenge: Challenge = {
      id: `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type,
      startDate,
      endDate,
      participants: [],
      teams: [],
      goal,
      rewards,
      leaderboard: [],
      status: 'upcoming'
    };

    this.challenges.set(challenge.id, challenge);

    logger.info('Challenge created', {
      context: 'team-challenges',
      metadata: {
        challengeId: challenge.id,
        challengeName: challenge.name,
        type: challenge.type,
        startDate,
        endDate
      }
    });

    return challenge;
  }

  /**
   * Join a challenge
   */
  joinChallenge(challengeId: string, userId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return false;
    }

    if (challenge.status !== 'upcoming' && challenge.status !== 'active') {
      logger.warn('Cannot join challenge - not active', {
        context: 'team-challenges',
        metadata: { challengeId, status: challenge.status }
      });
      return false;
    }

    if (challenge.participants.includes(userId)) {
      logger.warn('User already in challenge', {
        context: 'team-challenges',
        metadata: { challengeId, userId }
      });
      return false;
    }

    challenge.participants.push(userId);

    // Initialize leaderboard entry
    challenge.leaderboard.push({
      rank: 0,
      userId,
      name: `User ${userId}`,
      value: 0,
      progress: 0,
      percentage: 0
    });

    logger.info('User joined challenge', {
      context: 'team-challenges',
      metadata: { challengeId, userId }
    });

    return true;
  }

  /**
   * Submit challenge progress
   */
  submitChallengeProgress(
    challengeId: string,
    userId: string,
    value: number
  ): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return false;
    }

    if (challenge.status !== 'active') {
      logger.warn('Challenge not active', {
        context: 'team-challenges',
        metadata: { challengeId, status: challenge.status }
      });
      return false;
    }

    // Update leaderboard
    const existingEntry = challenge.leaderboard.find(e => e.userId === userId);
    if (existingEntry) {
      existingEntry.value += value;
      existingEntry.progress = existingEntry.value;
      existingEntry.percentage = Math.min(100, (existingEntry.progress / challenge.goal.target) * 100);
    } else {
      challenge.leaderboard.push({
        rank: 0,
        userId,
        name: `User ${userId}`,
        value,
        progress: value,
        percentage: Math.min(100, (value / challenge.goal.target) * 100)
      });
    }

    // Sort and update ranks
    challenge.leaderboard.sort((a, b) => b.value - a.value);
    challenge.leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    logger.info('Challenge progress submitted', {
      context: 'team-challenges',
      metadata: {
        challengeId,
        userId,
        value,
        rank: challenge.leaderboard.find(e => e.userId === userId)?.rank
      }
    });

    return true;
  }

  /**
   * Get challenge leaderboard
   */
  getLeaderboard(challengeId: string, limit: number = 10): LeaderboardEntry[] {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return [];
    }

    return challenge.leaderboard.slice(0, limit);
  }

  /**
   * Get team leaderboard
   */
  getTeamLeaderboard(limit: number = 10): Team[] {
    const sortedTeams = Array.from(this.teams.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    // Update ranks
    sortedTeams.forEach((team, index) => {
      team.rank = index + 1;
    });

    return sortedTeams;
  }

  /**
   * Get active challenges
   */
  getActiveChallenges(): Challenge[] {
    const now = Date.now();
    return Array.from(this.challenges.values())
      .filter(c => c.status === 'active' || (c.status === 'upcoming' && c.startDate <= now));
  }

  /**
   * Update challenge status
   */
  updateChallengeStatus(challengeId: string): void {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return;
    }

    const now = Date.now();
    
    if (now < challenge.startDate) {
      challenge.status = 'upcoming';
    } else if (now >= challenge.startDate && now <= challenge.endDate) {
      challenge.status = 'active';
    } else {
      challenge.status = 'completed';
    }

    logger.debug('Challenge status updated', {
      context: 'team-challenges',
      metadata: {
        challengeId,
        status: challenge.status
      }
    });
  }
}

export default TeamChallengesService;
