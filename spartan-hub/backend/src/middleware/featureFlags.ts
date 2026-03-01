/**
 * Backend Feature Flags Middleware
 * Controls API feature availability across environments
 * 
 * Spartan Hub 2.0 - Staging Environment Setup
 * Version: 2.0.0
 * Last Updated: March 1, 2026
 */

import { Request, Response, NextFunction } from 'express';

export interface FeatureFlagConfig {
  enabled: boolean;
  environments?: ('staging' | 'production')[];
  rolloutPercentage?: number;
  description?: string;
}

/**
 * Feature Flags Registry
 * Synchronized with frontend feature flags
 */
const FeatureFlags: Record<string, FeatureFlagConfig> = {
  // ==========================================================================
  // CORE MVP FEATURES - 100% ENABLED
  // ==========================================================================
  
  VIDEO_ANALYSIS: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 100,
    description: 'AI-powered video form analysis for exercises',
  },
  
  AI_COACH: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 100,
    description: 'AI coaching and workout recommendations',
  },
  
  WORKOUT_TRACKING: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 100,
    description: 'Track workouts, sets, reps, and progress',
  },
  
  WEARABLE_SYNC: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 100,
    description: 'Sync with Garmin, Google Fit, and Health Connect',
  },
  
  NUTRITION_TRACKING: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 100,
    description: 'Track nutrition and meal planning',
  },
  
  PROGRESS_DASHBOARD: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 100,
    description: 'Visual progress tracking and analytics',
  },
  
  // ==========================================================================
  // BETA FEATURES - STAGING FIRST
  // ==========================================================================
  
  COMMUNITY_FEATURES: {
    enabled: process.env.NODE_ENV === 'staging',
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Community forums, challenges, and social features',
  },
  
  PREMIUM_ANALYTICS: {
    enabled: process.env.NODE_ENV === 'staging',
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Advanced analytics and insights for premium users',
  },
  
  ML_INJURY_PREDICTION: {
    enabled: process.env.NODE_ENV === 'staging',
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Machine learning-based injury risk prediction',
  },
  
  ML_WORKOUT_FORECAST: {
    enabled: process.env.NODE_ENV === 'staging',
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'ML-powered workout performance forecasting',
  },
  
  // ==========================================================================
  // GRADUAL ROLLOUT FEATURES
  // ==========================================================================
  
  SMART_NOTIFICATIONS: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 50,
    description: 'Intelligent push notifications based on user behavior',
  },
  
  PERSONALIZED_WORKOUTS: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 75,
    description: 'AI-personalized workout recommendations',
  },
  
  // ==========================================================================
  // EXPERIMENTAL FEATURES - DISABLED
  // ==========================================================================
  
  SOCIAL_SHARING: {
    enabled: false,
    environments: [],
    rolloutPercentage: 0,
    description: 'Share workouts and achievements on social media',
  },
  
  MOBILE_APP: {
    enabled: false,
    environments: [],
    rolloutPercentage: 0,
    description: 'Native mobile application (iOS/Android)',
  },
  
  VR_WORKOUTS: {
    enabled: false,
    environments: [],
    rolloutPercentage: 0,
    description: 'Virtual reality workout experiences',
  },
  
  LIVE_COACHING: {
    enabled: false,
    environments: [],
    rolloutPercentage: 0,
    description: 'Real-time live coaching sessions',
  },
};

/**
 * Middleware factory to check if a feature flag is enabled
 * 
 * @param featureName - The name of the feature to check
 * @returns Express middleware function
 * 
 * @example
 * // Protect a route with feature flag
 * router.post('/api/video-analysis',
 *   checkFeatureFlag('VIDEO_ANALYSIS'),
 *   videoAnalysisController
 * );
 * 
 * @example
 * // Community features only available in staging
 * router.get('/api/community',
 *   checkFeatureFlag('COMMUNITY_FEATURES'),
 *   communityController
 * );
 */
export function checkFeatureFlag(featureName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const environment = (process.env.NODE_ENV as 'staging' | 'production') || 'production';
    const flag = FeatureFlags[featureName];
    
    // Feature doesn't exist
    if (!flag) {
      return res.status(403).json({
        success: false,
        error: 'FEATURE_NOT_FOUND',
        message: `Feature '${featureName}' does not exist`,
        feature: featureName,
        environment,
      });
    }
    
    // Feature is globally disabled
    if (!flag.enabled) {
      return res.status(403).json({
        success: false,
        error: 'FEATURE_DISABLED',
        message: `Feature '${featureName}' is not available`,
        feature: featureName,
        environment,
      });
    }
    
    // Check if feature is available in current environment
    if (flag.environments && !flag.environments.includes(environment)) {
      return res.status(403).json({
        success: false,
        error: 'FEATURE_NOT_AVAILABLE_IN_ENVIRONMENT',
        message: `Feature '${featureName}' is not available in ${environment} environment`,
        feature: featureName,
        environment,
        availableEnvironments: flag.environments,
      });
    }
    
    // Check rollout percentage for gradual releases
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      // Use consistent hashing based on user ID if available
      let userHash = 0;
      const userId = req.user?.id || req.headers['x-user-id'] as string;
      
      if (userId) {
        // Create consistent hash from user ID
        for (let i = 0; i < userId.length; i++) {
          const char = userId.charCodeAt(i);
          userHash = ((userHash << 5) - userHash) + char;
          userHash = userHash & userHash; // Convert to 32-bit integer
        }
        userHash = Math.abs(userHash) % 100;
      } else {
        // Fallback to random for unauthenticated requests
        userHash = Math.random() * 100;
      }
      
      if (userHash >= flag.rolloutPercentage) {
        return res.status(403).json({
          success: false,
          error: 'FEATURE_ROLLOUT_IN_PROGRESS',
          message: `Feature '${featureName}' is in gradual rollout (${flag.rolloutPercentage}%)`,
          feature: featureName,
          environment,
          rolloutPercentage: flag.rolloutPercentage,
        });
      }
    }

    // Feature is enabled, proceed to next middleware
    return next();
  };
}

/**
 * Check if a feature is enabled (non-middleware version)
 *
 * @param featureName - The name of the feature
 * @param environment - The environment to check (defaults to NODE_ENV)
 * @returns boolean - Whether the feature is enabled
 */
export function isFeatureEnabled(
  featureName: string,
  environment?: 'staging' | 'production'
): boolean {
  const env = environment || (process.env.NODE_ENV as 'staging' | 'production') || 'production';
  const flag = FeatureFlags[featureName];

  if (!flag || !flag.enabled) return false;
  if (flag.environments && !flag.environments.includes(env)) return false;
  if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
    return Math.random() * 100 < flag.rolloutPercentage;
  }

  return true;
}

/**
 * Get all enabled features for current environment
 * 
 * @param environment - The environment (defaults to NODE_ENV)
 * @returns string[] - Array of enabled feature names
 */
export function getEnabledFeatures(environment?: 'staging' | 'production'): string[] {
  const env = environment || (process.env.NODE_ENV as 'staging' | 'production') || 'production';
  return Object.entries(FeatureFlags)
    .filter(([_, config]) => {
      const flag = config as FeatureFlagConfig;
      return (
        flag.enabled &&
        (!flag.environments || flag.environments.includes(env))
      );
    })
    .map(([name]) => name);
}

/**
 * Get feature flag configuration
 * 
 * @param featureName - The name of the feature
 * @returns FeatureFlagConfig | undefined
 */
export function getFeatureFlag(featureName: string): FeatureFlagConfig | undefined {
  return FeatureFlags[featureName];
}

/**
 * Get all feature flags (for admin/debug purposes)
 * 
 * @param environment - The environment to filter by
 * @returns Record<string, FeatureFlagConfig>
 */
export function getAllFeatureFlags(environment?: 'staging' | 'production'): Record<string, FeatureFlagConfig> {
  if (!environment) {
    return { ...FeatureFlags };
  }
  
  return Object.entries(FeatureFlags).reduce((acc, [name, config]) => {
    if (!config.environments || config.environments.includes(environment)) {
      acc[name] = config;
    }
    return acc;
  }, {} as Record<string, FeatureFlagConfig>);
}

/**
 * API endpoint handler to expose feature flags to authenticated admins
 *
 * @param req - Express request
 * @param res - Express response
 */
export function featureFlagsHandler(req: Request, res: Response): void {
  const environment = (process.env.NODE_ENV as 'staging' | 'production') || 'production';

  // Only expose to admins (check your auth middleware)
  const user = req.user as { role?: string } | undefined;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only administrators can view feature flag configuration',
    });
    return;
  }

  res.json({
    success: true,
    environment,
    features: getAllFeatureFlags(environment),
    enabledFeatures: getEnabledFeatures(environment),
  });
}

export default FeatureFlags;
