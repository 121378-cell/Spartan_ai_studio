/**
 * Performance Optimizer Service
 * Phase B: Polish & Launch Prep - Week 9 Day 2
 * 
 * Bundle optimization, code splitting, and lazy loading
 */

import { logger } from '../utils/logger';

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  brotliSize: number;
  chunks: ChunkInfo[];
  largestChunks: ChunkInfo[];
  duplicateModules: string[];
  recommendations: string[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isEntry: boolean;
  isDynamic: boolean;
}

export interface OptimizationConfig {
  enableTreeShaking: boolean;
  enableMinification: boolean;
  enableCodeSplitting: boolean;
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  targetBundleSize: number;
  targetLoadTime: number;
  [key: string]: any;
}

export interface LoadTimeMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  tti: number; // Time to Interactive
  ttfb: number; // Time to First Byte
}

/**
 * Performance Optimizer Service
 */
export class PerformanceOptimizerService {
  private config: OptimizationConfig = {
    enableTreeShaking: true,
    enableMinification: true,
    enableCodeSplitting: true,
    enableLazyLoading: true,
    enableImageOptimization: true,
    targetBundleSize: 500000, // 500KB
    targetLoadTime: 3000 // 3s
  };

  constructor() {
    logger.info('PerformanceOptimizerService initialized', {
      context: 'performance',
      metadata: this.config
    });
  }

  /**
   * Analyze bundle size
   */
  analyzeBundle(chunkData: ChunkInfo[]): BundleAnalysis {
    const totalSize = chunkData.reduce((sum, chunk) => sum + chunk.size, 0);
    const gzippedSize = chunkData.reduce((sum, chunk) => sum + chunk.gzippedSize, 0);
    
    // Estimate Brotli size (typically 15-20% better than gzip)
    const brotliSize = Math.round(gzippedSize * 0.85);

    // Find largest chunks
    const largestChunks = [...chunkData]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);

    // Find duplicate modules (simplified detection)
    const moduleCount = new Map<string, number>();
    chunkData.forEach(chunk => {
      chunk.modules.forEach(module => {
        moduleCount.set(module, (moduleCount.get(module) || 0) + 1);
      });
    });

    const duplicateModules = Array.from(moduleCount.entries())
      .filter(([_, count]) => count > 1)
      .map(([module, _]) => module);

    // Generate recommendations
    const recommendations = this.generateRecommendations(totalSize, largestChunks, duplicateModules);

    const analysis: BundleAnalysis = {
      totalSize,
      gzippedSize,
      brotliSize,
      chunks: chunkData,
      largestChunks,
      duplicateModules,
      recommendations
    };

    logger.info('Bundle analysis completed', {
      context: 'performance',
      metadata: {
        totalSize,
        gzippedSize,
        chunks: chunkData.length,
        recommendations: recommendations.length
      }
    });

    return analysis;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    totalSize: number,
    largestChunks: ChunkInfo[],
    duplicateModules: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check total bundle size
    if (totalSize > this.config.targetBundleSize) {
      recommendations.push(
        `Bundle size (${this.formatBytes(totalSize)}) exceeds target (${this.formatBytes(this.config.targetBundleSize)}). Consider code splitting.`
      );
    }

    // Check largest chunks
    largestChunks.forEach(chunk => {
      if (chunk.size > 100000) { // 100KB
        recommendations.push(
          `Chunk "${chunk.name}" is large (${this.formatBytes(chunk.size)}). Consider splitting into smaller chunks.`
        );
      }
    });

    // Check duplicate modules
    if (duplicateModules.length > 0) {
      recommendations.push(
        `${duplicateModules.length} duplicate modules found. Consider deduplication to reduce bundle size.`
      );
    }

    // General recommendations
    if (this.config.enableTreeShaking) {
      recommendations.push('Enable tree shaking to remove unused code.');
    }

    if (this.config.enableMinification) {
      recommendations.push('Enable minification to reduce file sizes.');
    }

    if (this.config.enableLazyLoading) {
      recommendations.push('Implement lazy loading for non-critical resources.');
    }

    return recommendations;
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Calculate code splitting strategy
   */
  calculateCodeSplitting(routes: string[]): string[] {
    const splits: string[] = [];

    routes.forEach(route => {
      // Each route should be a separate chunk
      splits.push(`route-${route.replace(/\//g, '-')}`);
    });

    // Split large components
    splits.push('components-heavy');
    splits.push('vendor-chunks');

    logger.info('Code splitting strategy calculated', {
      context: 'performance',
      metadata: {
        routes: routes.length,
        splits: splits.length
      }
    });

    return splits;
  }

  /**
   * Generate lazy loading configuration
   */
  generateLazyLoadingConfig(components: string[]): Record<string, any> {
    const config: Record<string, any> = {};

    components.forEach(component => {
      config[component] = {
        loading: 'lazy',
        threshold: 0,
        rootMargin: '200px'
      };
    });

    logger.info('Lazy loading config generated', {
      context: 'performance',
      metadata: {
        components: components.length
      }
    });

    return config;
  }

  /**
   * Optimize images (configuration)
   */
  generateImageOptimizationConfig(): Record<string, any> {
    return {
      formats: ['webp', 'avif', 'jpg'],
      sizes: [320, 640, 960, 1280, 1920],
      quality: 80,
      lazyLoading: true,
      placeholder: 'blur'
    };
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(metrics: LoadTimeMetrics): number {
    // Simplified scoring based on Core Web Vitals
    let score = 100;

    // FCP scoring (target: <1.8s)
    if (metrics.fcp > 1800) score -= 10;
    if (metrics.fcp > 3000) score -= 15;

    // LCP scoring (target: <2.5s)
    if (metrics.lcp > 2500) score -= 15;
    if (metrics.lcp > 4000) score -= 20;

    // FID scoring (target: <100ms)
    if (metrics.fid > 100) score -= 10;
    if (metrics.fid > 300) score -= 15;

    // CLS scoring (target: <0.1)
    if (metrics.cls > 0.1) score -= 10;
    if (metrics.cls > 0.25) score -= 15;

    // TTI scoring (target: <3.8s)
    if (metrics.tti > 3800) score -= 10;
    if (metrics.tti > 7300) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get performance optimization config
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * Update optimization config
   */
  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };

    logger.info('Performance config updated', {
      context: 'performance',
      metadata: this.config
    });
  }

  /**
   * Generate preload hints
   */
  generatePreloadHints(criticalResources: string[]): string[] {
    return criticalResources.map(resource => 
      `<link rel="preload" href="${resource}" as="script">`
    );
  }

  /**
   * Generate prefetch hints
   */
  generatePrefetchHints(likelyNextRoutes: string[]): string[] {
    return likelyNextRoutes.map(route =>
      `<link rel="prefetch" href="/${route}">`
    );
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    logger.debug('Performance optimizer health check', {
      context: 'performance'
    });

    return true;
  }
}

// Singleton instance
const performanceOptimizerService = new PerformanceOptimizerService();

export default performanceOptimizerService;
