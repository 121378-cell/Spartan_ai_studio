/**
 * Social Sharing Service
 * Phase B: Social Features - Week 6 Day 3
 * 
 * Manages social media sharing, invites, and referral tracking
 */

import { logger } from '../utils/logger';

export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'whatsapp' | 'telegram' | 'copy_link';

export interface ShareableContent {
  type: 'workout' | 'achievement' | 'challenge' | 'progress';
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface ShareResult {
  platform: SocialPlatform;
  success: boolean;
  shareId: string;
  timestamp: number;
  reach?: number;
  engagement?: number;
}

export interface ReferralCode {
  code: string;
  userId: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  currentUses: number;
  rewards: ReferralReward[];
}

export interface ReferralReward {
  type: 'points' | 'premium_days' | 'badge';
  value: number | string;
  description: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  code: string;
  createdAt: number;
  status: 'pending' | 'active' | 'converted' | 'expired';
  rewardsClaimed: boolean;
}

/**
 * Social Sharing Service
 */
export class SocialSharingService {
  private shareHistory: Map<string, ShareResult[]> = new Map(); // userId -> shares
  private referralCodes: Map<string, ReferralCode> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private userReferralCount: Map<string, number> = new Map(); // userId -> count

  constructor() {
    logger.info('SocialSharingService initialized', {
      context: 'social-sharing'
    });
  }

  /**
   * Generate share URL for platform
   */
  generateShareUrl(platform: SocialPlatform, content: ShareableContent): string {
    const encodedTitle = encodeURIComponent(content.title);
    const encodedDescription = encodeURIComponent(content.description);
    const encodedUrl = encodeURIComponent(content.url);

    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDescription}`;
      
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
      
      case 'whatsapp':
        return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
      
      case 'telegram':
        return `https://t.me/share/url?url=${encodedUrl}&text=${encodedDescription}`;
      
      case 'copy_link':
        return content.url;
      
      default:
        return content.url;
    }
  }

  /**
   * Record a share
   */
  recordShare(userId: string, platform: SocialPlatform, content: ShareableContent): ShareResult {
    const shareResult: ShareResult = {
      platform,
      success: true,
      shareId: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      reach: 0,
      engagement: 0
    };

    // Add to share history
    if (!this.shareHistory.has(userId)) {
      this.shareHistory.set(userId, []);
    }
    this.shareHistory.get(userId)!.push(shareResult);

    logger.info('Content shared', {
      context: 'social-sharing',
      metadata: {
        userId,
        platform,
        contentType: content.type,
        shareId: shareResult.shareId
      }
    });

    return shareResult;
  }

  /**
   * Get user's share count
   */
  getShareCount(userId: string, platform?: SocialPlatform): number {
    const shares = this.shareHistory.get(userId) || [];
    
    if (platform) {
      return shares.filter(s => s.platform === platform).length;
    }
    
    return shares.length;
  }

  /**
   * Get user's share history
   */
  getShareHistory(userId: string, limit: number = 20): ShareResult[] {
    const shares = this.shareHistory.get(userId) || [];
    return shares.slice(-limit);
  }

  /**
   * Generate unique referral code for user
   */
  generateReferralCode(userId: string, expiresAt?: number, maxUses?: number): ReferralCode {
    // Check if user already has active code
    const existingCode = Array.from(this.referralCodes.values())
      .find(code => code.userId === userId && (!code.expiresAt || code.expiresAt > Date.now()));

    if (existingCode) {
      return existingCode;
    }

    // Generate unique code
    const code = `REF-${userId.toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const referralCode: ReferralCode = {
      code,
      userId,
      createdAt: Date.now(),
      expiresAt,
      maxUses,
      currentUses: 0,
      rewards: [
        {
          type: 'points',
          value: 500,
          description: '500 points per successful referral'
        },
        {
          type: 'premium_days',
          value: '7',
          description: '7 days premium for 10 referrals'
        }
      ]
    };

    this.referralCodes.set(code, referralCode);

    logger.info('Referral code generated', {
      context: 'social-sharing',
      metadata: {
        userId,
        code,
        expiresAt,
        maxUses
      }
    });

    return referralCode;
  }

  /**
   * Get user's referral code
   */
  getReferralCode(userId: string): ReferralCode | null {
    const codes = Array.from(this.referralCodes.values())
      .filter(code => code.userId === userId);
    
    return codes.length > 0 ? codes[0] : null;
  }

  /**
   * Use referral code
   */
  useReferralCode(code: string, referredUserId: string): boolean {
    const referralCode = this.referralCodes.get(code);
    
    if (!referralCode) {
      logger.warn('Invalid referral code', {
        context: 'social-sharing',
        metadata: { code }
      });
      return false;
    }

    // Check if expired
    if (referralCode.expiresAt && Date.now() > referralCode.expiresAt) {
      logger.warn('Referral code expired', {
        context: 'social-sharing',
        metadata: { code }
      });
      return false;
    }

    // Check if max uses reached
    if (referralCode.maxUses && referralCode.currentUses >= referralCode.maxUses) {
      logger.warn('Referral code max uses reached', {
        context: 'social-sharing',
        metadata: { code, currentUses: referralCode.currentUses }
      });
      return false;
    }

    // Check if user already referred
    const existingReferral = Array.from(this.referrals.values())
      .find(r => r.referredUserId === referredUserId);

    if (existingReferral) {
      logger.warn('User already referred', {
        context: 'social-sharing',
        metadata: { referredUserId }
      });
      return false;
    }

    // Create referral
    const referral: Referral = {
      id: `referral-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      referrerId: referralCode.userId,
      referredUserId,
      code,
      createdAt: Date.now(),
      status: 'pending',
      rewardsClaimed: false
    };

    this.referrals.set(referral.id, referral);
    referralCode.currentUses++;

    // Update referral count
    const currentCount = this.userReferralCount.get(referralCode.userId) || 0;
    this.userReferralCount.set(referralCode.userId, currentCount + 1);

    logger.info('Referral code used', {
      context: 'social-sharing',
      metadata: {
        code,
        referrerId: referralCode.userId,
        referredUserId
      }
    });

    return true;
  }

  /**
   * Activate referral (when referred user completes action)
   */
  activateReferral(referralId: string): boolean {
    const referral = this.referrals.get(referralId);
    
    if (!referral) {
      return false;
    }

    referral.status = 'active';

    logger.info('Referral activated', {
      context: 'social-sharing',
      metadata: {
        referralId,
        referrerId: referral.referrerId,
        referredUserId: referral.referredUserId
      }
    });

    return true;
  }

  /**
   * Convert referral (when referred user meets conversion criteria)
   */
  convertReferral(referralId: string): boolean {
    const referral = this.referrals.get(referralId);
    
    if (!referral) {
      return false;
    }

    referral.status = 'converted';

    logger.info('Referral converted', {
      context: 'social-sharing',
      metadata: {
        referralId,
        referrerId: referral.referrerId
      }
    });

    return true;
  }

  /**
   * Claim referral rewards
   */
  claimReferralRewards(referralId: string): boolean {
    const referral = this.referrals.get(referralId);
    
    if (!referral || referral.status !== 'converted' || referral.rewardsClaimed) {
      return false;
    }

    referral.rewardsClaimed = true;

    logger.info('Referral rewards claimed', {
      context: 'social-sharing',
      metadata: {
        referralId,
        referrerId: referral.referrerId
      }
    });

    return true;
  }

  /**
   * Get referral statistics for user
   */
  getReferralStats(userId: string): {
    totalReferrals: number;
    activeReferrals: number;
    convertedReferrals: number;
    pendingReferrals: number;
    totalRewards: number;
  } {
    const userReferrals = Array.from(this.referrals.values())
      .filter(r => r.referrerId === userId);

    return {
      totalReferrals: userReferrals.length,
      activeReferrals: userReferrals.filter(r => r.status === 'active').length,
      convertedReferrals: userReferrals.filter(r => r.status === 'converted').length,
      pendingReferrals: userReferrals.filter(r => r.status === 'pending').length,
      totalRewards: userReferrals.filter(r => r.rewardsClaimed).length * 500 // Base points per referral
    };
  }

  /**
   * Get user's referral count
   */
  getUserReferralCount(userId: string): number {
    return this.userReferralCount.get(userId) || 0;
  }

  /**
   * Create shareable content for workout
   */
  createWorkoutShare(workoutData: {
    userId: string;
    exerciseType: string;
    formScore: number;
    duration: number;
  }): ShareableContent {
    const { exerciseType, formScore, duration } = workoutData;
    
    return {
      type: 'workout',
      title: `Just completed a ${exerciseType} workout!`,
      description: `Achieved ${formScore}% form score in ${duration} minutes. Can you beat me?`,
      url: `https://spartanhub.io/workouts/share/${workoutData.userId}-${Date.now()}`,
      imageUrl: `https://spartanhub.io/api/workouts/generate-image?score=${formScore}`,
      metadata: {
        exerciseType,
        formScore,
        duration
      }
    };
  }

  /**
   * Create shareable content for achievement
   */
  createAchievementShare(achievementData: {
    userId: string;
    achievementName: string;
    achievementIcon: string;
  }): ShareableContent {
    const { achievementName, achievementIcon } = achievementData;
    
    return {
      type: 'achievement',
      title: `Unlocked: ${achievementName} ${achievementIcon}`,
      description: `I just unlocked the "${achievementName}" achievement on Spartan Hub!`,
      url: `https://spartanhub.io/achievements/share/${achievementData.userId}-${Date.now()}`,
      metadata: {
        achievementName,
        achievementIcon
      }
    };
  }

  /**
   * Create shareable content for challenge
   */
  createChallengeShare(challengeData: {
    challengeId: string;
    challengeName: string;
    userId: string;
    rank: number;
  }): ShareableContent {
    const { challengeName, rank } = challengeData;
    
    return {
      type: 'challenge',
      title: rank === 1 ? `🏆 Won ${challengeName}!` : `Ranked #${rank} in ${challengeName}`,
      description: rank === 1 
        ? `I won the ${challengeName} challenge on Spartan Hub!`
        : `I ranked #${rank} in the ${challengeName} challenge. Join me!`,
      url: `https://spartanhub.io/challenges/${challengeData.challengeId}`,
      metadata: {
        challengeId: challengeData.challengeId,
        rank
      }
    };
  }
}

export default SocialSharingService;
