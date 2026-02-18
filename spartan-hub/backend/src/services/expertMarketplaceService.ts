/**
 * Expert Marketplace Service
 * 
 * Two-sided marketplace connecting trainers/experts with users.
 * Trainers create content (routines, programs, tutorials), users subscribe.
 * Revenue sharing: 20-30% platform fee.
 * 
 * Part of Fase 6: Network Effects from strategic roadmap.
 */

import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

export interface Expert {
  id: string;
  userId: string;
  profile: {
    displayName: string;
    bio: string;
    specialties: string[];
    certifications: string[];
    yearsExperience: number;
    avatar?: string;
    socialLinks?: {
      instagram?: string;
      youtube?: string;
      website?: string;
    };
  };
  stats: {
    totalSubscribers: number;
    totalContent: number;
    averageRating: number;
    totalRevenue: number;
    joinDate: Date;
  };
  settings: {
    subscriptionPrice: number; // Monthly price in cents
    isAcceptingSubscribers: boolean;
    commissionRate: number; // Platform takes this % (20-30%)
  };
  status: 'pending' | 'approved' | 'suspended';
  verificationStatus: 'unverified' | 'verified' | 'premium';
}

export interface ContentItem {
  id: string;
  expertId: string;
  type: 'routine' | 'program' | 'tutorial' | 'meal_plan' | 'guide';
  title: string;
  description: string;
  content: Record<string, any>;
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    duration?: number; // in minutes
    equipment: string[];
    tags: string[];
  };
  pricing: {
    isPremium: boolean;
    price?: number; // One-time purchase in cents
    includedInSubscription: boolean;
  };
  stats: {
    views: number;
    downloads: number;
    rating: number;
    reviewCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  expertId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  plan: 'monthly' | 'quarterly' | 'yearly';
  price: number;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  paymentMethod: string;
  cancellationDate?: Date;
  cancellationReason?: string;
}

export interface Review {
  id: string;
  userId: string;
  expertId: string;
  contentId?: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
}

export interface RevenueTransaction {
  id: string;
  expertId: string;
  type: 'subscription' | 'content_sale' | 'tip';
  amount: number;
  platformFee: number;
  netAmount: number;
  userId: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  settledAt?: Date;
}

export class ExpertMarketplaceService {
  private experts: Map<string, Expert> = new Map();
  private content: Map<string, ContentItem> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private reviews: Map<string, Review> = new Map();
  private transactions: Map<string, RevenueTransaction> = new Map();

  private readonly PLATFORM_COMMISSION_MIN = 20; // 20%
  private readonly PLATFORM_COMMISSION_MAX = 30; // 30%

  /**
   * Register new expert
   */
  async registerExpert(
    userId: string,
    profile: Expert['profile'],
    subscriptionPrice: number
  ): Promise<Expert> {
    try {
      logger.info('Registering new expert', {
        context: 'expert-marketplace',
        metadata: { userId, displayName: profile.displayName }
      });

      // Validate subscription price
      if (subscriptionPrice < 500) { // Minimum $5/month
        throw new ValidationError('Subscription price must be at least $5/month');
      }

      const expert: Expert = {
        id: this.generateExpertId(),
        userId,
        profile,
        stats: {
          totalSubscribers: 0,
          totalContent: 0,
          averageRating: 0,
          totalRevenue: 0,
          joinDate: new Date()
        },
        settings: {
          subscriptionPrice,
          isAcceptingSubscribers: false, // Pending approval
          commissionRate: this.PLATFORM_COMMISSION_MIN
        },
        status: 'pending',
        verificationStatus: 'unverified'
      };

      this.experts.set(expert.id, expert);

      logger.info('Expert registered successfully', {
        context: 'expert-marketplace',
        metadata: { expertId: expert.id, userId }
      });

      return expert;
    } catch (error) {
      logger.error('Failed to register expert', {
        context: 'expert-marketplace',
        metadata: { userId, error }
      });
      throw error;
    }
  }

  /**
   * Approve expert application
   */
  async approveExpert(expertId: string, commissionRate: number = 25): Promise<Expert> {
    try {
      const expert = this.experts.get(expertId);
      if (!expert) {
        throw new ValidationError('Expert not found');
      }

      // Validate commission rate
      if (commissionRate < this.PLATFORM_COMMISSION_MIN || 
          commissionRate > this.PLATFORM_COMMISSION_MAX) {
        throw new ValidationError(
          `Commission rate must be between ${this.PLATFORM_COMMISSION_MIN}% and ${this.PLATFORM_COMMISSION_MAX}%`
        );
      }

      expert.status = 'approved';
      expert.settings.isAcceptingSubscribers = true;
      expert.settings.commissionRate = commissionRate;

      logger.info('Expert approved', {
        context: 'expert-marketplace',
        metadata: { expertId, commissionRate }
      });

      return expert;
    } catch (error) {
      logger.error('Failed to approve expert', {
        context: 'expert-marketplace',
        metadata: { expertId, error }
      });
      throw error;
    }
  }

  /**
   * Create content item
   */
  async createContent(
    expertId: string,
    type: ContentItem['type'],
    title: string,
    description: string,
    content: Record<string, any>,
    metadata: ContentItem['metadata'],
    pricing: ContentItem['pricing']
  ): Promise<ContentItem> {
    try {
      const expert = this.experts.get(expertId);
      if (!expert) {
        throw new ValidationError('Expert not found');
      }

      if (expert.status !== 'approved') {
        throw new ValidationError('Expert must be approved to create content');
      }

      const contentItem: ContentItem = {
        id: this.generateContentId(),
        expertId,
        type,
        title,
        description,
        content,
        metadata,
        pricing,
        stats: {
          views: 0,
          downloads: 0,
          rating: 0,
          reviewCount: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.content.set(contentItem.id, contentItem);
      expert.stats.totalContent++;

      logger.info('Content created', {
        context: 'expert-marketplace',
        metadata: { contentId: contentItem.id, expertId, type }
      });

      return contentItem;
    } catch (error) {
      logger.error('Failed to create content', {
        context: 'expert-marketplace',
        metadata: { expertId, error }
      });
      throw error;
    }
  }

  /**
   * Subscribe user to expert
   */
  async subscribe(
    userId: string,
    expertId: string,
    plan: Subscription['plan'] = 'monthly',
    autoRenew: boolean = true
  ): Promise<Subscription> {
    try {
      const expert = this.experts.get(expertId);
      if (!expert) {
        throw new ValidationError('Expert not found');
      }

      if (!expert.settings.isAcceptingSubscribers) {
        throw new ValidationError('Expert is not accepting new subscribers');
      }

      // Check if already subscribed
      const existingSubscription = this.findActiveSubscription(userId, expertId);
      if (existingSubscription) {
        throw new ValidationError('User already has active subscription to this expert');
      }

      // Calculate price based on plan
      let multiplier = 1;
      if (plan === 'quarterly') multiplier = 2.5; // 17% discount
      if (plan === 'yearly') multiplier = 9; // 25% discount

      const price = Math.round(expert.settings.subscriptionPrice * multiplier);

      const startDate = new Date();
      const endDate = new Date(startDate);
      if (plan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      if (plan === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
      if (plan === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

      const subscription: Subscription = {
        id: this.generateSubscriptionId(),
        userId,
        expertId,
        status: 'active',
        plan,
        price,
        startDate,
        endDate,
        autoRenew,
        paymentMethod: 'stripe' // Default
      };

      this.subscriptions.set(subscription.id, subscription);
      expert.stats.totalSubscribers++;

      // Create revenue transaction
      await this.processRevenueTransaction(expertId, userId, price, 'subscription');

      logger.info('Subscription created', {
        context: 'expert-marketplace',
        metadata: { subscriptionId: subscription.id, userId, expertId, plan }
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', {
        context: 'expert-marketplace',
        metadata: { userId, expertId, error }
      });
      throw error;
    }
  }

  /**
   * Process revenue transaction
   */
  private async processRevenueTransaction(
    expertId: string,
    userId: string,
    amount: number,
    type: RevenueTransaction['type'],
    description?: string
  ): Promise<RevenueTransaction> {
    const expert = this.experts.get(expertId)!;
    const platformFee = Math.round(amount * (expert.settings.commissionRate / 100));
    const netAmount = amount - platformFee;

    const transaction: RevenueTransaction = {
      id: this.generateTransactionId(),
      expertId,
      type,
      amount,
      platformFee,
      netAmount,
      userId,
      description: description || `${type} transaction`,
      status: 'completed',
      createdAt: new Date(),
      settledAt: new Date()
    };

    this.transactions.set(transaction.id, transaction);
    expert.stats.totalRevenue += netAmount;

    logger.info('Revenue transaction processed', {
      context: 'expert-marketplace',
      metadata: {
        transactionId: transaction.id,
        expertId,
        amount,
        platformFee,
        netAmount
      }
    });

    return transaction;
  }

  /**
   * Get available content for user
   */
  async getAvailableContent(
    userId: string,
    filters?: {
      type?: ContentItem['type'];
      difficulty?: string;
      expertId?: string;
      tags?: string[];
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{ content: ContentItem[]; total: number }> {
    let contentList = Array.from(this.content.values());

    // Filter by user subscriptions
    const userSubscriptions = this.getUserSubscriptions(userId);
    const subscribedExpertIds = userSubscriptions.map(s => s.expertId);

    contentList = contentList.filter(item => {
      // Show if user is subscribed to expert
      if (subscribedExpertIds.includes(item.expertId)) {
        return item.pricing.includedInSubscription || true;
      }
      // Show free content
      if (!item.pricing.isPremium) return true;
      return false;
    });

    // Apply filters
    if (filters?.type) {
      contentList = contentList.filter(c => c.type === filters.type);
    }
    if (filters?.difficulty) {
      contentList = contentList.filter(c => c.metadata.difficulty === filters.difficulty);
    }
    if (filters?.expertId) {
      contentList = contentList.filter(c => c.expertId === filters.expertId);
    }
    if (filters?.tags?.length) {
      contentList = contentList.filter(c => 
        filters.tags!.some(tag => c.metadata.tags.includes(tag))
      );
    }

    // Sort by rating and recency
    contentList.sort((a, b) => {
      const scoreA = a.stats.rating * 0.6 + (a.createdAt.getTime() / 1e12) * 0.4;
      const scoreB = b.stats.rating * 0.6 + (b.createdAt.getTime() / 1e12) * 0.4;
      return scoreB - scoreA;
    });

    const total = contentList.length;
    const paginatedContent = contentList.slice(offset, offset + limit);

    return { content: paginatedContent, total };
  }

  /**
   * Get experts list
   */
  async getExperts(
    filters?: {
      specialty?: string;
      minRating?: number;
      verifiedOnly?: boolean;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<{ experts: Expert[]; total: number }> {
    let expertList = Array.from(this.experts.values())
      .filter(e => e.status === 'approved');

    if (filters?.specialty) {
      expertList = expertList.filter(e => 
        e.profile.specialties.includes(filters.specialty!)
      );
    }
    if (filters?.minRating) {
      expertList = expertList.filter(e => 
        e.stats.averageRating >= filters.minRating!
      );
    }
    if (filters?.verifiedOnly) {
      expertList = expertList.filter(e => 
        e.verificationStatus === 'verified' || e.verificationStatus === 'premium'
      );
    }

    // Sort by rating and subscriber count
    expertList.sort((a, b) => {
      const scoreA = a.stats.averageRating * 0.5 + a.stats.totalSubscribers * 0.5;
      const scoreB = b.stats.averageRating * 0.5 + b.stats.totalSubscribers * 0.5;
      return scoreB - scoreA;
    });

    const total = expertList.length;
    const paginatedExperts = expertList.slice(offset, offset + limit);

    return { experts: paginatedExperts, total };
  }

  /**
   * Add review
   */
  async addReview(
    userId: string,
    expertId: string,
    rating: number,
    comment: string,
    contentId?: string
  ): Promise<Review> {
    try {
      if (rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      // Verify user has subscription or purchased content
      const hasSubscription = this.findActiveSubscription(userId, expertId);
      const hasPurchased = contentId ? this.checkContentPurchase(userId, contentId) : false;

      const review: Review = {
        id: this.generateReviewId(),
        userId,
        expertId,
        contentId,
        rating,
        comment,
        isVerifiedPurchase: Boolean(hasSubscription) || hasPurchased,
        helpfulCount: 0,
        createdAt: new Date()
      };

      this.reviews.set(review.id, review);

      // Update expert average rating
      const expert = this.experts.get(expertId);
      if (expert) {
        const expertReviews = Array.from(this.reviews.values())
          .filter(r => r.expertId === expertId);
        const avgRating = expertReviews.reduce((sum, r) => sum + r.rating, 0) / expertReviews.length;
        expert.stats.averageRating = Math.round(avgRating * 10) / 10;
      }

      logger.info('Review added', {
        context: 'expert-marketplace',
        metadata: { reviewId: review.id, expertId, rating }
      });

      return review;
    } catch (error) {
      logger.error('Failed to add review', {
        context: 'expert-marketplace',
        metadata: { userId, expertId, error }
      });
      throw error;
    }
  }

  // Private helper methods

  private findActiveSubscription(userId: string, expertId: string): Subscription | undefined {
    return Array.from(this.subscriptions.values()).find(
      s => s.userId === userId && 
           s.expertId === expertId && 
           s.status === 'active' &&
           s.endDate > new Date()
    );
  }

  private getUserSubscriptions(userId: string): Subscription[] {
    return Array.from(this.subscriptions.values())
      .filter(s => s.userId === userId && s.status === 'active');
  }

  private checkContentPurchase(userId: string, contentId: string): boolean {
    // In production, check transactions table
    return false;
  }

  private generateExpertId(): string {
    return `expert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateContentId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const expertMarketplaceService = new ExpertMarketplaceService();
