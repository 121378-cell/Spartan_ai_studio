/**
 * ML Pipeline Optimization
 * Phase B: Advanced ML Models - Week 5 Day 4
 * 
 * Optimizes ML inference pipeline for performance
 */

import { logger } from '../utils/logger';

export interface PipelineConfig {
  enableBatching: boolean;
  batchSize: number;
  batchTimeout: number; // milliseconds
  enableCaching: boolean;
  cacheSize: number; // number of items
  cacheTTL: number; // seconds
  enableCompression: boolean;
  maxWorkers: number;
  [key: string]: any;
}

export interface BatchResult<T> {
  results: T[];
  processingTime: number;
  batchSize: number;
  averageTime: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
  [key: string]: any;
}

/**
 * ML Pipeline Optimizer
 */
export class MLPipelineOptimizer {
  private config: PipelineConfig;
  private cache: Map<string, { result: any; timestamp: number }> = new Map();
  private queue: Array<{ input: any; resolve: (result: any) => void; reject: (error: any) => void }> = [];
  private processing = false;
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    evictions: 0
  };

  constructor(config?: Partial<PipelineConfig>) {
    this.config = {
      enableBatching: true,
      batchSize: 32,
      batchTimeout: 100, // 100ms
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 3600, // 1 hour
      enableCompression: true,
      maxWorkers: 4,
      ...config
    };

    logger.info('MLPipelineOptimizer initialized', {
      context: 'ml-pipeline',
      metadata: this.config
    });

    // Start batch processor
    if (this.config.enableBatching) {
      this.startBatchProcessor();
    }

    // Start cache cleanup
    if (this.config.enableCaching) {
      this.startCacheCleanup();
    }
  }

  /**
   * Process single input with optimization
   */
  async process<T>(input: any, processor: (input: any) => T): Promise<T> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(input);

    // Check cache
    if (this.config.enableCaching) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        logger.debug('Cache hit', {
          context: 'ml-pipeline',
          metadata: { cacheKey, processingTime: Date.now() - startTime }
        });
        return cached as T;
      }
    }

    // Use batching if enabled
    if (this.config.enableBatching) {
      const result = await this.enqueueForBatch(input, processor);
      this.cacheResult(cacheKey, result);
      return result;
    }

    // Process immediately
    const result = await processor(input);
    this.cacheResult(cacheKey, result);

    logger.debug('Processed input', {
      context: 'ml-pipeline',
      metadata: {
        processingTime: Date.now() - startTime,
        cached: false
      }
    });

    return result;
  }

  /**
   * Process multiple inputs in batch
   */
  async processBatch<T>(inputs: any[], processor: (inputs: any[]) => T[]): Promise<BatchResult<T>> {
    const startTime = Date.now();
    const results: T[] = [];
    const cacheKeys: string[] = [];
    const indicesToProcess: number[] = [];

    // Check cache for each input
    if (this.config.enableCaching) {
      inputs.forEach((input, index) => {
        const cacheKey = this.generateCacheKey(input);
        const cached = this.getCached(cacheKey);
        
        if (cached) {
          results[index] = cached;
          cacheKeys[index] = cacheKey;
        } else {
          indicesToProcess.push(index);
          cacheKeys[index] = cacheKey;
        }
      });
    } else {
      indicesToProcess.push(...inputs.map((_, i) => i));
      cacheKeys.push(...inputs.map((_, i) => this.generateCacheKey(_)));
    }

    // Process uncached inputs
    if (indicesToProcess.length > 0) {
      const inputsToProcess = indicesToProcess.map(i => inputs[i]);
      const processedResults = await processor(inputsToProcess);
      
      // Store results
      indicesToProcess.forEach((index, i) => {
        results[index] = processedResults[i];
        this.cacheResult(cacheKeys[index], processedResults[i]);
      });
    }

    const processingTime = Date.now() - startTime;
    const averageTime = processingTime / inputs.length;

    logger.info('Batch processing completed', {
      context: 'ml-pipeline',
      metadata: {
        batchSize: inputs.length,
        processingTime,
        averageTime,
        cacheHits: inputs.length - indicesToProcess.length
      }
    });

    return {
      results,
      processingTime,
      batchSize: inputs.length,
      averageTime
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
    this.cacheStats.size = this.cache.size;
    
    return { ...this.cacheStats };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      evictions: 0
    };

    logger.info('Cache cleared', {
      context: 'ml-pipeline',
      metadata: this.cacheStats
    });
  }

  // Private methods

  private generateCacheKey(input: any): string {
    // Simple hash-based key generation
    // In production, use proper hashing
    return JSON.stringify(input);
  }

  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }

    // Check TTL
    const age = (Date.now() - cached.timestamp) / 1000;
    if (age > this.config.cacheTTL) {
      this.cache.delete(key);
      this.cacheStats.evictions++;
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return cached.result;
  }

  private cacheResult(key: string, result: any): void {
    if (!this.config.enableCaching) {
      return;
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.config.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.cacheStats.evictions++;
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  private enqueueForBatch<T>(input: any, processor: (input: any) => T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ input, resolve, reject });
    });
  }

  private startBatchProcessor(): void {
    const processBatch = async () => {
      if (this.queue.length === 0) {
        setTimeout(processBatch, this.config.batchTimeout);
        return;
      }

      // Take up to batchSize items
      const batch = this.queue.splice(0, this.config.batchSize);
      const inputs = batch.map(item => item.input);

      try {
        // Process batch (simplified - in production use actual ML model)
        const results = inputs.map(input => ({ result: 'processed', input }));
        
        // Resolve promises
        batch.forEach((item, index) => {
          item.resolve(results[index]);
        });

        logger.debug('Batch processed', {
          context: 'ml-pipeline',
          metadata: { batchSize: batch.length }
        });
      } catch (error) {
        batch.forEach(item => {
          item.reject(error);
        });
      }

      setTimeout(processBatch, this.config.batchTimeout);
    };

    processBatch();
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      this.cache.forEach((value, key) => {
        const age = (now - value.timestamp) / 1000;
        if (age > this.config.cacheTTL) {
          this.cache.delete(key);
          cleaned++;
          this.cacheStats.evictions++;
        }
      });

      if (cleaned > 0) {
        logger.debug('Cache cleanup completed', {
          context: 'ml-pipeline',
          metadata: { cleaned }
        });
      }
    }, 60000); // Run every minute
  }
}

/**
 * Model Compression Utilities
 */
export class ModelCompressor {
  /**
   * Compress model weights (simplified)
   */
  compress(weights: number[]): number[] {
    // In production, use proper compression techniques
    // like quantization, pruning, etc.
    
    // Simple quantization to int8
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min;
    
    const compressed = weights.map(w => {
      const normalized = (w - min) / range;
      const quantized = Math.round(normalized * 255);
      return quantized;
    });
    
    return compressed;
  }

  /**
   * Decompress model weights
   */
  decompress(compressed: number[], originalMin: number, originalMax: number): number[] {
    const range = originalMax - originalMin;
    
    const decompressed = compressed.map(c => {
      const normalized = c / 255;
      const original = normalized * range + originalMin;
      return original;
    });
    
    return decompressed;
  }

  /**
   * Calculate compression ratio
   */
  getCompressionRatio(original: number[], compressed: number[]): number {
    const originalSize = original.length * 4; // float32 = 4 bytes
    const compressedSize = compressed.length * 1; // int8 = 1 byte
    
    return originalSize / compressedSize;
  }
}

/**
 * Performance Benchmarks
 */
export interface BenchmarkResult {
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number; // operations per second
  [key: string]: any;
}

export class PerformanceBenchmarker {
  /**
   * Run benchmark
   */
  async benchmark<T>(
    testName: string,
    operation: () => Promise<T>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await operation();
      const endTime = Date.now();
      times.push(endTime - startTime);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Calculate percentiles
    const sorted = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const p95Time = sorted[p95Index] || maxTime;
    const p99Time = sorted[p99Index] || maxTime;
    
    const throughput = (iterations / totalTime) * 1000;

    const result: BenchmarkResult = {
      testName,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      p95Time,
      p99Time,
      throughput
    };

    logger.info('Benchmark completed', {
      context: 'ml-pipeline',
      metadata: result
    });

    return result;
  }

  /**
   * Compare multiple operations
   */
  async compare(
    testName: string,
    operations: Array<{ name: string; operation: () => Promise<any> }>,
    iterations: number = 100
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const { name, operation } of operations) {
      const result = await this.benchmark(`${testName} - ${name}`, operation, iterations);
      results.push(result);
    }

    // Sort by average time
    results.sort((a, b) => a.averageTime - b.averageTime);

    return results;
  }
}

export default { MLPipelineOptimizer, ModelCompressor, PerformanceBenchmarker };
