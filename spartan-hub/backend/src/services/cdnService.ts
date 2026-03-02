/**
 * CDN Service
 * Phase B: Scale Preparation - Week 8 Day 1
 * 
 * CDN integration for global content delivery
 */

import { logger } from '../utils/logger';

export type CDNProvider = 'cloudflare' | 'aws_cloudfront' | 'fastly';
export type CacheStrategy = 'aggressive' | 'moderate' | 'conservative';

export interface CDNConfig {
  provider: CDNProvider;
  apiKey: string;
  zoneId: string;
  domain: string;
  cacheStrategy: CacheStrategy;
  purgeOnDeploy: boolean;
}

export interface CDNAsset {
  path: string;
  type: 'css' | 'js' | 'image' | 'font' | 'video' | 'other';
  cacheTTL: number; // seconds
  compress: boolean;
  minify: boolean;
}

export interface CDNStats {
  cacheHitRate: number;
  bandwidth: number;
  requests: number;
  avgLoadTime: number;
  edgeLocations: number;
  [key: string]: any;
}

/**
 * CDN Service
 */
export class CDNService {
  private config: CDNConfig | null = null;
  private assets: Map<string, CDNAsset> = new Map();
  private stats: CDNStats = {
    cacheHitRate: 0,
    bandwidth: 0,
    requests: 0,
    avgLoadTime: 0,
    edgeLocations: 0
  };

  constructor() {
    logger.info('CDNService initialized', {
      context: 'cdn'
    });
  }

  /**
   * Initialize CDN configuration
   */
  initialize(config: CDNConfig): boolean {
    try {
      this.config = config;
      
      logger.info('CDN initialized', {
        context: 'cdn',
        metadata: {
          provider: config.provider,
          domain: config.domain,
          cacheStrategy: config.cacheStrategy
        }
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize CDN', {
        context: 'cdn',
        metadata: { error }
      });
      return false;
    }
  }

  /**
   * Register asset for CDN delivery
   */
  registerAsset(path: string, options: Partial<CDNAsset> = {}): CDNAsset {
    const asset: CDNAsset = {
      path,
      type: this.detectAssetType(path),
      cacheTTL: this.getDefaultCacheTTL(options.type || this.detectAssetType(path)),
      compress: options.compress ?? true,
      minify: options.minify ?? true,
      ...options
    };

    this.assets.set(path, asset);

    logger.debug('Asset registered for CDN', {
      context: 'cdn',
      metadata: {
        path,
        type: asset.type,
        cacheTTL: asset.cacheTTL
      }
    });

    return asset;
  }

  /**
   * Detect asset type from path
   */
  private detectAssetType(path: string): CDNAsset['type'] {
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.js')) return 'js';
    if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(path)) return 'image';
    if (/\.(woff|woff2|ttf|eot|otf)$/i.test(path)) return 'font';
    if (/\.(mp4|webm|ogg|mov)$/i.test(path)) return 'video';
    return 'other';
  }

  /**
   * Get default cache TTL based on asset type
   */
  private getDefaultCacheTTL(type: CDNAsset['type']): number {
    const ttlMap: Record<CDNAsset['type'], number> = {
      css: 86400 * 7, // 7 days
      js: 86400 * 7, // 7 days
      image: 86400 * 30, // 30 days
      font: 86400 * 365, // 1 year
      video: 86400 * 30, // 30 days
      other: 86400 // 1 day
    };

    return ttlMap[type] || ttlMap.other;
  }

  /**
   * Get CDN URL for asset
   */
  getCDNUrl(path: string): string {
    if (!this.config) {
      throw new Error('CDN not initialized');
    }

    const asset = this.assets.get(path);
    
    if (!asset) {
      // Auto-register asset
      this.registerAsset(path);
    }

    // Return CDN URL
    return `https://${this.config.domain}/${path}`;
  }

  /**
   * Purge CDN cache for specific paths
   */
  async purgeCache(paths: string[]): Promise<boolean> {
    if (!this.config) {
      throw new Error('CDN not initialized');
    }

    try {
      logger.info('Purging CDN cache', {
        context: 'cdn',
        metadata: {
          pathCount: paths.length,
          provider: this.config.provider
        }
      });

      // In production, this would call the CDN provider's API
      // For now, simulate purge
      paths.forEach(path => {
        this.assets.delete(path);
      });

      logger.info('CDN cache purged', {
        context: 'cdn',
        metadata: {
          purgedCount: paths.length
        }
      });

      return true;
    } catch (error) {
      logger.error('Failed to purge CDN cache', {
        context: 'cdn',
        metadata: { error }
      });
      return false;
    }
  }

  /**
   * Purge all cache
   */
  async purgeAllCache(): Promise<boolean> {
    const allPaths = Array.from(this.assets.keys());
    return this.purgeCache(allPaths);
  }

  /**
   * Update CDN stats
   */
  updateStats(stats: Partial<CDNStats>): void {
    this.stats = {
      ...this.stats,
      ...stats
    };

    logger.debug('CDN stats updated', {
      context: 'cdn',
      metadata: this.stats
    });
  }

  /**
   * Get CDN stats
   */
  getStats(): CDNStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    return this.stats.cacheHitRate;
  }

  /**
   * Get average load time
   */
  getAverageLoadTime(): number {
    return this.stats.avgLoadTime;
  }

  /**
   * Preload critical assets
   */
  preloadCriticalAssets(criticalPaths: string[]): void {
    logger.info('Preloading critical assets', {
      context: 'cdn',
      metadata: {
        assetCount: criticalPaths.length
      }
    });

    criticalPaths.forEach(path => {
      this.registerAsset(path, {
        cacheTTL: 86400 * 365, // 1 year for critical assets
        compress: true,
        minify: true
      });
    });
  }

  /**
   * Configure cache strategy
   */
  configureCacheStrategy(strategy: CacheStrategy): void {
    if (!this.config) {
      throw new Error('CDN not initialized');
    }

    this.config.cacheStrategy = strategy;

    const strategyConfig = {
      aggressive: {
        defaultTTL: 86400 * 30,
        browserTTL: 86400 * 7,
        edgeTTL: 86400 * 30
      },
      moderate: {
        defaultTTL: 86400 * 7,
        browserTTL: 86400,
        edgeTTL: 86400 * 7
      },
      conservative: {
        defaultTTL: 86400,
        browserTTL: 3600,
        edgeTTL: 86400
      }
    };

    logger.info('Cache strategy configured', {
      context: 'cdn',
      metadata: {
        strategy,
        config: strategyConfig[strategy]
      }
    });
  }

  /**
   * Enable DDoS protection
   */
  enableDDoSProtection(): void {
    if (!this.config) {
      throw new Error('CDN not initialized');
    }

    logger.info('DDoS protection enabled', {
      context: 'cdn',
      metadata: {
        provider: this.config.provider
      }
    });

    // In production, this would configure DDoS protection rules
  }

  /**
   * Enable SSL/TLS
   */
  enableSSL(): void {
    if (!this.config) {
      throw new Error('CDN not initialized');
    }

    logger.info('SSL/TLS enabled', {
      context: 'cdn',
      metadata: {
        domain: this.config.domain
      }
    });

    // In production, this would configure SSL certificates
  }

  /**
   * Get registered assets
   */
  getRegisteredAssets(): CDNAsset[] {
    return Array.from(this.assets.values());
  }

  /**
   * Optimize asset for delivery
   */
  optimizeAsset(path: string): CDNAsset | null {
    const asset = this.assets.get(path);
    
    if (!asset) {
      logger.warn('Asset not found for optimization', {
        context: 'cdn',
        metadata: { path }
      });
      return null;
    }

    logger.info('Optimizing asset', {
      context: 'cdn',
      metadata: {
        path,
        type: asset.type,
        compress: asset.compress,
        minify: asset.minify
      }
    });

    // In production, this would trigger asset optimization
    return asset;
  }

  /**
   * Setup real-time analytics
   */
  setupAnalytics(): void {
    if (!this.config) {
      throw new Error('CDN not initialized');
    }

    logger.info('Real-time analytics enabled', {
      context: 'cdn',
      metadata: {
        provider: this.config.provider
      }
    });

    // In production, this would setup analytics streaming
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    if (!this.config) {
      return false;
    }

    // Check if CDN is reachable
    const isHealthy = true; // In production, would actually check

    logger.debug('CDN health check', {
      context: 'cdn',
      metadata: {
        healthy: isHealthy,
        provider: this.config.provider
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const cdnService = new CDNService();

export default cdnService;
