/**
 * Concurrency Limiter Utility
 * Provides a way to limit the number of concurrent operations
 */

export class ConcurrencyLimiter {
  private readonly maxConcurrency: number;
  private currentConcurrency: number = 0;
  private readonly queue: Array<() => void> = [];

  constructor(maxConcurrency: number) {
    if (maxConcurrency <= 0) {
      throw new Error('Max concurrency must be greater than 0');
    }
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Acquire a slot for concurrent execution
   * @returns A promise that resolves when a slot is available
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.currentConcurrency < this.maxConcurrency) {
          this.currentConcurrency++;
          resolve();
        } else {
          // Add to queue if max concurrency reached
          this.queue.push(tryAcquire);
        }
      };

      tryAcquire();
    });
  }

  /**
   * Release a slot after execution completes
   */
  release(): void {
    this.currentConcurrency--;
    
    // Process next item in queue if available
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        setImmediate(next);
      }
    }
  }

  /**
   * Execute a function with concurrency limiting
   * @param fn The function to execute
   * @returns The result of the function
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Execute multiple functions with concurrency limiting
   * @param fns Array of functions to execute
   * @returns Array of results
   */
  async runAll<T>(fns: (() => Promise<T>)[]): Promise<T[]> {
    const results: T[] = [];
    
    // Process functions in chunks based on max concurrency
    for (let i = 0; i < fns.length; i += this.maxConcurrency) {
      const chunk = fns.slice(i, i + this.maxConcurrency);
      const chunkResults = await Promise.all(
        chunk.map(fn => this.run(fn))
      );
      results.push(...chunkResults);
    }
    
    return results;
  }

  /**
   * Get current concurrency status
   * @returns Object with current concurrency and queue length
   */
  getStatus(): { current: number; max: number; queued: number } {
    return {
      current: this.currentConcurrency,
      max: this.maxConcurrency,
      queued: this.queue.length
    };
  }
}

// Default concurrency limiters for different types of operations
export const API_CONCURRENCY_LIMITER = new ConcurrencyLimiter(5);
export const NUTRITION_API_CONCURRENCY_LIMITER = new ConcurrencyLimiter(3);
export const EXERCISE_API_CONCURRENCY_LIMITER = new ConcurrencyLimiter(3);

export default {
  ConcurrencyLimiter,
  API_CONCURRENCY_LIMITER,
  NUTRITION_API_CONCURRENCY_LIMITER,
  EXERCISE_API_CONCURRENCY_LIMITER
};