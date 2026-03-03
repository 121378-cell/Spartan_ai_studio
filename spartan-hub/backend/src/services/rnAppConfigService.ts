/**
 * React Native App Configuration Service
 * Phase C: Mobile App Implementation - Week 11 Day 1
 * 
 * React Native app configuration and environment setup
 */

import { logger } from '../utils/logger';

export type AppEnvironment = 'development' | 'staging' | 'production';
export type Platform = 'ios' | 'android' | 'web';

export interface AppConfig {
  environment: AppEnvironment;
  platform: Platform;
  version: string;
  buildNumber: string;
  apiBaseUrl: string;
  wsUrl: string;
  cdnUrl: string;
  features: FeatureFlags;
  analytics: AnalyticsConfig;
}

export interface FeatureFlags {
  enableFormAnalysis: boolean;
  enableVoiceCoaching: boolean;
  enableWearableSync: boolean;
  enableSocialSharing: boolean;
  enableGamification: boolean;
  enableChallenges: boolean;
  enablePremium: boolean;
  enableOfflineMode: boolean;
}

export interface AnalyticsConfig {
  enabled: boolean;
  provider: 'firebase' | 'mixpanel' | 'amplitude';
  apiKey: string;
  trackEvents: boolean;
  trackPerformance: boolean;
  trackCrashes: boolean;
}

/**
 * React Native App Configuration Service
 */
export class RNAppConfigService {
  private config: AppConfig | null = null;

  constructor() {
    logger.info('RNAppConfigService initialized', {
      context: 'rn-app-config'
    });
  }

  /**
   * Initialize app configuration
   */
  initialize(platform: Platform, environment: AppEnvironment): AppConfig {
    this.config = this.getDefaultConfig(platform, environment);

    logger.info('App configuration initialized', {
      context: 'rn-app-config',
      metadata: {
        platform,
        environment,
        version: this.config.version
      }
    });

    return this.config;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(platform: Platform, environment: AppEnvironment): AppConfig {
    const configs: Record<AppEnvironment, AppConfig> = {
      development: {
        environment: 'development',
        platform,
        version: '1.0.0-dev',
        buildNumber: '1',
        apiBaseUrl: 'https://dev-api.spartanhub.io',
        wsUrl: 'wss://dev-ws.spartanhub.io',
        cdnUrl: 'https://dev-cdn.spartanhub.io',
        features: {
          enableFormAnalysis: true,
          enableVoiceCoaching: false,
          enableWearableSync: true,
          enableSocialSharing: true,
          enableGamification: true,
          enableChallenges: true,
          enablePremium: false,
          enableOfflineMode: true
        },
        analytics: {
          enabled: true,
          provider: 'firebase',
          apiKey: 'dev-firebase-key',
          trackEvents: true,
          trackPerformance: true,
          trackCrashes: true
        }
      },
      staging: {
        environment: 'staging',
        platform,
        version: '1.0.0-beta',
        buildNumber: '10',
        apiBaseUrl: 'https://staging-api.spartanhub.io',
        wsUrl: 'wss://staging-ws.spartanhub.io',
        cdnUrl: 'https://staging-cdn.spartanhub.io',
        features: {
          enableFormAnalysis: true,
          enableVoiceCoaching: true,
          enableWearableSync: true,
          enableSocialSharing: true,
          enableGamification: true,
          enableChallenges: true,
          enablePremium: true,
          enableOfflineMode: true
        },
        analytics: {
          enabled: true,
          provider: 'firebase',
          apiKey: 'staging-firebase-key',
          trackEvents: true,
          trackPerformance: true,
          trackCrashes: true
        }
      },
      production: {
        environment: 'production',
        platform,
        version: '1.0.0',
        buildNumber: '100',
        apiBaseUrl: 'https://api.spartanhub.io',
        wsUrl: 'wss://ws.spartanhub.io',
        cdnUrl: 'https://cdn.spartanhub.io',
        features: {
          enableFormAnalysis: true,
          enableVoiceCoaching: true,
          enableWearableSync: true,
          enableSocialSharing: true,
          enableGamification: true,
          enableChallenges: true,
          enablePremium: true,
          enableOfflineMode: true
        },
        analytics: {
          enabled: true,
          provider: 'firebase',
          apiKey: 'prod-firebase-key',
          trackEvents: true,
          trackPerformance: true,
          trackCrashes: true
        }
      }
    };

    return configs[environment];
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig | null {
    return this.config;
  }

  /**
   * Get feature flag
   */
  getFeatureFlag(flag: keyof FeatureFlags): boolean {
    if (!this.config) {
      return false;
    }
    return this.config.features[flag];
  }

  /**
   * Update feature flag
   */
  updateFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): boolean {
    if (!this.config) {
      return false;
    }

    this.config.features[flag] = enabled;

    logger.info('Feature flag updated', {
      context: 'rn-app-config',
      metadata: {
        flag,
        enabled
      }
    });

    return true;
  }

  /**
   * Get API base URL
   */
  getApiBaseUrl(): string {
    return this.config?.apiBaseUrl || 'https://api.spartanhub.io';
  }

  /**
   * Get WebSocket URL
   */
  getWsUrl(): string {
    return this.config?.wsUrl || 'wss://ws.spartanhub.io';
  }

  /**
   * Get CDN URL
   */
  getCdnUrl(): string {
    return this.config?.cdnUrl || 'https://cdn.spartanhub.io';
  }

  /**
   * Check if analytics is enabled
   */
  isAnalyticsEnabled(): boolean {
    return this.config?.analytics.enabled || false;
  }

  /**
   * Get analytics config
   */
  getAnalyticsConfig(): AnalyticsConfig | null {
    return this.config?.analytics || null;
  }

  /**
   * Generate environment file
   */
  generateEnvFile(platform: Platform, environment: AppEnvironment): string {
    const config = this.getDefaultConfig(platform, environment);

    return `# Spartan Hub Mobile App - ${environment.toUpperCase()} Configuration
# Generated: ${new Date().toISOString()}

# App Configuration
APP_ENV=${environment}
APP_PLATFORM=${platform}
APP_VERSION=${config.version}
APP_BUILD_NUMBER=${config.buildNumber}

# API Configuration
API_BASE_URL=${config.apiBaseUrl}
WS_URL=${config.wsUrl}
CDN_URL=${config.cdnUrl}

# Feature Flags
ENABLE_FORM_ANALYSIS=${config.features.enableFormAnalysis}
ENABLE_VOICE_COACHING=${config.features.enableVoiceCoaching}
ENABLE_WEARABLE_SYNC=${config.features.enableWearableSync}
ENABLE_SOCIAL_SHARING=${config.features.enableSocialSharing}
ENABLE_GAMIFICATION=${config.features.enableGamification}
ENABLE_CHALLENGES=${config.features.enableChallenges}
ENABLE_PREMIUM=${config.features.enablePremium}
ENABLE_OFFLINE_MODE=${config.features.enableOfflineMode}

# Analytics
ANALYTICS_ENABLED=${config.analytics.enabled}
ANALYTICS_PROVIDER=${config.analytics.provider}
ANALYTICS_API_KEY=${config.analytics.apiKey}
ANALYTICS_TRACK_EVENTS=${config.analytics.trackEvents}
ANALYTICS_TRACK_PERFORMANCE=${config.analytics.trackPerformance}
ANALYTICS_TRACK_CRASHES=${config.analytics.trackCrashes}
`;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const isHealthy = this.config !== null;

    logger.debug('RN App Config health check', {
      context: 'rn-app-config',
      metadata: {
        healthy: isHealthy,
        configured: this.config !== null
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const rnAppConfigService = new RNAppConfigService();

export default rnAppConfigService;
