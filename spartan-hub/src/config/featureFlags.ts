/**
 * Feature Flags Configuration
 * Controls feature availability across environments
 * 
 * Spartan Hub 2.0 - Staging Environment Setup
 * Version: 2.0.0
 * Last Updated: March 1, 2026
 */

export interface FeatureFlagConfig {
  enabled: boolean;
  environments?: ('staging' | 'production')[];
  rolloutPercentage?: number; // 0-100
  description?: string;
}

/**
 * Feature Flags Registry
 * 
 * Core MVP Features: 100% enabled in staging and production
 * Beta Features: Enabled in staging first, then gradual production rollout
 * Experimental Features: Disabled until ready for testing
 */
export const FeatureFlags: Record<string, FeatureFlagConfig> = {
  // ==========================================================================
  // CORE MVP FEATURES - 100% ENABLED
  // These features are fully tested and available in all environments
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
  // These features are being tested in staging before production rollout
  // ==========================================================================
  
  COMMUNITY_FEATURES: {
    enabled: true,
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Community forums, challenges, and social features',
  },
  
  PREMIUM_ANALYTICS: {
    enabled: true,
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Advanced analytics and insights for premium users',
  },
  
  ML_INJURY_PREDICTION: {
    enabled: true,
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Machine learning-based injury risk prediction',
  },
  
  ML_WORKOUT_FORECAST: {
    enabled: true,
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'ML-powered workout performance forecasting',
  },
  
  // ==========================================================================
  // GRADUAL ROLLOUT FEATURES
  // These features use percentage-based rollout for controlled release
  // ==========================================================================
  
  SMART_NOTIFICATIONS: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 50, // 50% of users in production
    description: 'Intelligent push notifications based on user behavior',
  },
  
  PERSONALIZED_WORKOUTS: {
    enabled: true,
    environments: ['staging', 'production'],
    rolloutPercentage: 75, // 75% of users in production
    description: 'AI-personalized workout recommendations',
  },
  
  // ==========================================================================
  // EXPERIMENTAL FEATURES - DISABLED
  // These features are under development and not yet ready for testing
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
  
  // ==========================================================================
  // INTERNAL/ADMIN FEATURES
  // These features are only available in staging for internal testing
  // ==========================================================================
  
  ADMIN_DASHBOARD_V2: {
    enabled: true,
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Next-generation admin dashboard',
  },
  
  DEBUG_PANEL: {
    enabled: true,
    environments: ['staging'],
    rolloutPercentage: 100,
    description: 'Developer debug panel for testing',
  },
};

/**
 * Check if a feature is enabled for the current environment
 * 
 * @param featureName - The name of the feature to check
 * @param environment - The current environment ('staging' or 'production')
 * @returns boolean - Whether the feature is enabled
 * 
 * @example
 * // Check if video analysis is enabled in staging
 * const isVideoAnalysisEnabled = isFeatureEnabled('VIDEO_ANALYSIS', 'staging');
 * 
 * @example
 * // Check if community features are enabled (staging only)
 * const isCommunityEnabled = isFeatureEnabled('COMMUNITY_FEATURES', 'staging'); // true
 * const isCommunityEnabledProd = isFeatureEnabled('COMMUNITY_FEATURES', 'production'); // false
 */
export function isFeatureEnabled(
  featureName: string,
  environment: 'staging' | 'production' = 'production'
): boolean {
  const flag = FeatureFlags[featureName];
  
  // Feature doesn't exist
  if (!flag) {
    console.warn(`[FeatureFlags] Unknown feature flag: ${featureName}`);
    return false;
  }
  
  // Feature is globally disabled
  if (!flag.enabled) {
    return false;
  }
  
  // Check if feature is available in current environment
  if (flag.environments && !flag.environments.includes(environment)) {
    return false;
  }
  
  // Check rollout percentage for gradual releases
  if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
    // Use consistent hashing based on feature name for stable rollout
    // In production, this would typically use user ID for consistent experience
    const random = Math.random() * 100;
    if (random >= flag.rolloutPercentage) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get all enabled features for the current environment
 * 
 * @param environment - The current environment ('staging' or 'production')
 * @returns string[] - Array of enabled feature names
 * 
 * @example
 * // Get all features enabled in staging
 * const stagingFeatures = getEnabledFeatures('staging');
 * 
 * @example
 * // Get all features enabled in production
 * const productionFeatures = getEnabledFeatures('production');
 */
export function getEnabledFeatures(environment: 'staging' | 'production'): string[] {
  return Object.entries(FeatureFlags)
    .filter(([_, config]) => {
      const flag = config as FeatureFlagConfig;
      return (
        flag.enabled &&
        (!flag.environments || flag.environments.includes(environment))
      );
    })
    .map(([name]) => name);
}

/**
 * Get feature flag configuration
 * 
 * @param featureName - The name of the feature
 * @returns FeatureFlagConfig | undefined - The feature configuration or undefined
 */
export function getFeatureFlag(featureName: string): FeatureFlagConfig | undefined {
  return FeatureFlags[featureName];
}

/**
 * Get rollout percentage for a feature
 * 
 * @param featureName - The name of the feature
 * @param environment - The current environment
 * @returns number - Rollout percentage (0-100)
 */
export function getRolloutPercentage(
  featureName: string,
  environment: 'staging' | 'production' = 'production'
): number {
  const flag = FeatureFlags[featureName];
  if (!flag || !flag.enabled) return 0;
  if (flag.environments && !flag.environments.includes(environment)) return 0;
  return flag.rolloutPercentage ?? 100;
}

/**
 * Hook-like function for React components to check feature flags
 * Can be used in functional components
 * 
 * @param featureName - The name of the feature
 * @returns boolean - Whether the feature is enabled
 * 
 * @deprecated Use isFeatureEnabled() directly instead
 */
export function useFeatureFlag(featureName: string): boolean {
  // Get environment from window or default to production
  const environment = (window as any).__APP_ENV__ as 'staging' | 'production' || 'production';
  return isFeatureEnabled(featureName, environment);
}

export default FeatureFlags;
