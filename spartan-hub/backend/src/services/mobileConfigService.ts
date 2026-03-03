/**
 * Mobile Configuration Service
 * Phase C: Mobile Foundation - Week 10 Day 1
 * 
 * Mobile app configuration and environment management
 */

import { logger } from '../utils/logger';

export type Platform = 'ios' | 'android' | 'web';
export type Environment = 'development' | 'staging' | 'production';

export interface MobileConfig {
  platform: Platform;
  environment: Environment;
  apiBaseUrl: string;
  wsUrl: string;
  cdnUrl: string;
  appVersion: string;
  minAppVersion: string;
  features: MobileFeatures;
  analytics: AnalyticsConfig;
  pushNotifications: PushConfig;
}

export interface MobileFeatures {
  enableFormAnalysis: boolean;
  enableVoiceCoaching: boolean;
  enableWearableSync: boolean;
  enableSocialSharing: boolean;
  enableGamification: boolean;
  enableChallenges: boolean;
  enablePremium: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  provider: 'firebase' | 'mixpanel' | 'amplitude';
  apiKey: string;
  trackEvents: boolean;
  trackPerformance: boolean;
  trackCrashes: boolean;
}

export interface PushConfig {
  enabled: boolean;
  provider: 'firebase' | 'onesignal';
  apiKey: string;
  iosBundleId: string;
  androidPackageName: string;
}

/**
 * Mobile Configuration Service
 */
export class MobileConfigService {
  private config: Map<string, MobileConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
    logger.info('MobileConfigService initialized', {
      context: 'mobile-config',
      metadata: {
        platforms: ['ios', 'android', 'web'],
        environments: ['development', 'staging', 'production']
      }
    });
  }

  /**
   * Initialize default configurations
   */
  private initializeDefaultConfigs(): void {
    // iOS Development
    this.config.set('ios-development', {
      platform: 'ios',
      environment: 'development',
      apiBaseUrl: 'https://dev-api.spartanhub.io',
      wsUrl: 'wss://dev-ws.spartanhub.io',
      cdnUrl: 'https://dev-cdn.spartanhub.io',
      appVersion: '1.0.0',
      minAppVersion: '1.0.0',
      features: {
        enableFormAnalysis: true,
        enableVoiceCoaching: false,
        enableWearableSync: true,
        enableSocialSharing: true,
        enableGamification: true,
        enableChallenges: true,
        enablePremium: false
      },
      analytics: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'dev-firebase-key',
        trackEvents: true,
        trackPerformance: true,
        trackCrashes: true
      },
      pushNotifications: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'dev-fcm-key',
        iosBundleId: 'io.spartanhub.dev',
        androidPackageName: 'io.spartanhub.dev'
      }
    });

    // iOS Production
    this.config.set('ios-production', {
      platform: 'ios',
      environment: 'production',
      apiBaseUrl: 'https://api.spartanhub.io',
      wsUrl: 'wss://ws.spartanhub.io',
      cdnUrl: 'https://cdn.spartanhub.io',
      appVersion: '1.0.0',
      minAppVersion: '0.9.0',
      features: {
        enableFormAnalysis: true,
        enableVoiceCoaching: true,
        enableWearableSync: true,
        enableSocialSharing: true,
        enableGamification: true,
        enableChallenges: true,
        enablePremium: true
      },
      analytics: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'prod-firebase-key',
        trackEvents: true,
        trackPerformance: true,
        trackCrashes: true
      },
      pushNotifications: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'prod-fcm-key',
        iosBundleId: 'io.spartanhub.app',
        androidPackageName: 'io.spartanhub.app'
      }
    });

    // Android Development
    this.config.set('android-development', {
      platform: 'android',
      environment: 'development',
      apiBaseUrl: 'https://dev-api.spartanhub.io',
      wsUrl: 'wss://dev-ws.spartanhub.io',
      cdnUrl: 'https://dev-cdn.spartanhub.io',
      appVersion: '1.0.0',
      minAppVersion: '1.0.0',
      features: {
        enableFormAnalysis: true,
        enableVoiceCoaching: false,
        enableWearableSync: true,
        enableSocialSharing: true,
        enableGamification: true,
        enableChallenges: true,
        enablePremium: false
      },
      analytics: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'dev-firebase-key',
        trackEvents: true,
        trackPerformance: true,
        trackCrashes: true
      },
      pushNotifications: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'dev-fcm-key',
        iosBundleId: 'io.spartanhub.dev',
        androidPackageName: 'io.spartanhub.dev'
      }
    });

    // Android Production
    this.config.set('android-production', {
      platform: 'android',
      environment: 'production',
      apiBaseUrl: 'https://api.spartanhub.io',
      wsUrl: 'wss://ws.spartanhub.io',
      cdnUrl: 'https://cdn.spartanhub.io',
      appVersion: '1.0.0',
      minAppVersion: '0.9.0',
      features: {
        enableFormAnalysis: true,
        enableVoiceCoaching: true,
        enableWearableSync: true,
        enableSocialSharing: true,
        enableGamification: true,
        enableChallenges: true,
        enablePremium: true
      },
      analytics: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'prod-firebase-key',
        trackEvents: true,
        trackPerformance: true,
        trackCrashes: true
      },
      pushNotifications: {
        enabled: true,
        provider: 'firebase',
        apiKey: 'prod-fcm-key',
        iosBundleId: 'io.spartanhub.app',
        androidPackageName: 'io.spartanhub.app'
      }
    });

    logger.debug('Mobile configs initialized', {
      context: 'mobile-config',
      metadata: {
        totalConfigs: this.config.size
      }
    });
  }

  /**
   * Get configuration for platform and environment
   */
  getConfig(platform: Platform, environment: Environment): MobileConfig | null {
    const key = `${platform}-${environment}`;
    const config = this.config.get(key);

    if (!config) {
      logger.warn('Mobile config not found', {
        context: 'mobile-config',
        metadata: { platform, environment }
      });
      return null;
    }

    return { ...config };
  }

  /**
   * Get current API base URL
   */
  getApiBaseUrl(platform: Platform, environment: Environment): string {
    const config = this.getConfig(platform, environment);
    return config?.apiBaseUrl || 'https://api.spartanhub.io';
  }

  /**
   * Get feature flag status
   */
  isFeatureEnabled(
    platform: Platform,
    environment: Environment,
    feature: keyof MobileFeatures
  ): boolean {
    const config = this.getConfig(platform, environment);
    return config?.features[feature] || false;
  }

  /**
   * Update feature flag
   */
  updateFeatureFlag(
    platform: Platform,
    environment: Environment,
    feature: keyof MobileFeatures,
    enabled: boolean
  ): boolean {
    const key = `${platform}-${environment}`;
    const config = this.config.get(key);

    if (!config) {
      logger.warn('Cannot update feature flag - config not found', {
        context: 'mobile-config',
        metadata: { platform, environment, feature }
      });
      return false;
    }

    config.features[feature] = enabled;
    this.config.set(key, config);

    logger.info('Feature flag updated', {
      context: 'mobile-config',
      metadata: { platform, environment, feature, enabled }
    });

    return true;
  }

  /**
   * Get app version
   */
  getAppVersion(platform: Platform, environment: Environment): string {
    const config = this.getConfig(platform, environment);
    return config?.appVersion || '1.0.0';
  }

  /**
   * Check if app version is supported
   */
  isVersionSupported(version: string, platform: Platform, environment: Environment): boolean {
    const config = this.getConfig(platform, environment);
    if (!config) return false;

    return this.compareVersions(version, config.minAppVersion) >= 0;
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 !== num2) {
        return num1 - num2;
      }
    }

    return 0;
  }

  /**
   * Get all configurations
   */
  getAllConfigs(): Map<string, MobileConfig> {
    return new Map(this.config);
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const configCount = this.config.size;
    const isHealthy = configCount >= 4; // At least 4 configs (2 platforms × 2 envs)

    logger.debug('Mobile config health check', {
      context: 'mobile-config',
      metadata: {
        healthy: isHealthy,
        configCount
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const mobileConfigService = new MobileConfigService();

export default mobileConfigService;
