/**
 * Web Worker Pool Manager
 * 
 * Manages a pool of Web Workers for parallel pose detection processing.
 * Provides load balancing and automatic worker scaling based on device performance.
 * 
 * @module services/workerPool
 */

import type { PoseFrame } from '../types/pose';

type WorkerStatus = 'idle' | 'busy' | 'error';

interface WorkerInstance {
  worker: Worker;
  status: WorkerStatus;
  lastUsed: number;
  tasksCompleted: number;
}

interface WorkerPoolConfig {
  maxWorkers: number;
  minWorkers: number;
  taskTimeout: number;
  autoScale: boolean;
}

interface DetectionTask {
  imageData: ImageData;
  timestampMs: number;
  resolve: (result: PoseFrame) => void;
  reject: (error: Error) => void;
  queuedAt: number;
}

/**
 * Default worker pool configuration
 */
const DEFAULT_CONFIG: WorkerPoolConfig = {
  maxWorkers: 4,
  minWorkers: 1,
  taskTimeout: 5000, // 5 seconds
  autoScale: true,
};

/**
 * Worker Pool Manager Class
 * 
 * Manages a pool of pose detection workers with:
 * - Dynamic scaling based on device performance
 * - Load balancing across workers
 * - Task queue management
 * - Error recovery and worker recycling
 */
export class WorkerPoolManager {
  private workers: WorkerInstance[] = [];
  private taskQueue: DetectionTask[] = [];
  private config: WorkerPoolConfig;
  private isInitialized = false;
  private processingTask = false;
  
  // Performance metrics
  private totalTasksProcessed = 0;
  private averageTaskTime = 0;
  private workerErrors = 0;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the worker pool
   * Determines optimal worker count based on device capabilities
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Determine optimal worker count based on hardware concurrency
    const cores = navigator.hardwareConcurrency || 2;
    const memoryGB = (navigator as any).deviceMemory || 4;
    
    // Calculate optimal worker count
    // More workers for more cores and memory
    let optimalWorkers = Math.min(
      this.config.maxWorkers,
      Math.max(this.config.minWorkers, Math.floor(cores / 2))
    );

    // Adjust based on memory
    if (memoryGB < 4) {
      optimalWorkers = Math.min(optimalWorkers, 2);
    }

    // Create workers
    const workerPromises: Promise<void>[] = [];
    for (let i = 0; i < optimalWorkers; i++) {
      workerPromises.push(this.createWorker());
    }

    await Promise.all(workerPromises);
    this.isInitialized = true;

    console.log(`[WorkerPool] Initialized with ${this.workers.length} workers`);
  }

  /**
   * Create and initialize a new worker
   */
  private async createWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create worker from the worker file
        const worker = new Worker(
          new URL('../workers/poseDetection.worker.ts', import.meta.url),
          { type: 'module' }
        );

        const workerInstance: WorkerInstance = {
          worker,
          status: 'idle',
          lastUsed: Date.now(),
          tasksCompleted: 0,
        };

        // Set up message handler
        worker.onmessage = (event) => {
          this.handleWorkerMessage(workerInstance, event.data);
        };

        worker.onerror = (error) => {
          console.error('[WorkerPool] Worker error:', error);
          this.workerErrors++;
          workerInstance.status = 'error';
          this.recycleWorker(workerInstance);
        };

        // Initialize the worker
        worker.postMessage({
          type: 'INITIALIZE',
          payload: {
            config: {
              minPoseDetectionConfidence: 0.6,
              minPosePresenceConfidence: 0.6,
            },
          },
        });

        // Wait for initialization confirmation
        const initTimeout = setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 10000);

        const initHandler = (event: MessageEvent) => {
          if (event.data.type === 'INITIALIZED') {
            clearTimeout(initTimeout);
            worker.removeEventListener('message', initHandler);
            
            if (event.data.success) {
              this.workers.push(workerInstance);
              resolve();
            } else {
              reject(new Error(event.data.error || 'Worker initialization failed'));
            }
          }
        };

        worker.addEventListener('message', initHandler);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(workerInstance: WorkerInstance, data: any): void {
    switch (data.type) {
      case 'DETECTION_RESULT':
        if (data.success && data.poseFrame) {
          // Find and resolve the pending task
          const task = this.taskQueue.shift();
          if (task) {
            const taskTime = Date.now() - task.queuedAt;
            this.updateAverageTaskTime(taskTime);
            this.totalTasksProcessed++;
            task.resolve(data.poseFrame);
          }
        } else {
          const task = this.taskQueue.shift();
          if (task) {
            task.reject(new Error(data.error || 'Detection failed'));
          }
          this.workerErrors++;
        }
        
        workerInstance.status = 'idle';
        workerInstance.lastUsed = Date.now();
        workerInstance.tasksCompleted++;
        
        // Process next task in queue
        this.processQueue();
        break;

      case 'FPS_UPDATE':
        // Forward FPS updates to listeners if needed
        break;
    }
  }

  /**
   * Update average task time with exponential moving average
   */
  private updateAverageTaskTime(taskTime: number): void {
    const alpha = 0.1; // Smoothing factor
    this.averageTaskTime = alpha * taskTime + (1 - alpha) * this.averageTaskTime;
  }

  /**
   * Process the next task in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingTask || this.taskQueue.length === 0) {
      return;
    }

    this.processingTask = true;

    // Find an idle worker
    const idleWorker = this.workers.find((w) => w.status === 'idle');
    
    if (idleWorker && this.taskQueue.length > 0) {
      const task = this.taskQueue[0];
      idleWorker.status = 'busy';
      
      idleWorker.worker.postMessage({
        type: 'DETECT',
        payload: {
          imageData: task.imageData,
          timestampMs: task.timestampMs,
        },
      });
    } else if (this.taskQueue.length > 0 && this.config.autoScale) {
      // No idle workers, try to scale up
      if (this.workers.length < this.config.maxWorkers) {
        try {
          await this.createWorker();
        } catch (error) {
          console.warn('[WorkerPool] Failed to scale up:', error);
        }
      }
    }

    this.processingTask = false;
    
    // Continue processing if there are more tasks
    if (this.taskQueue.length > 0) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Detect pose in a frame (queued if all workers busy)
   */
  public detect(imageData: ImageData, timestampMs: number): Promise<PoseFrame> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error('Worker pool not initialized. Call initialize() first.'));
        return;
      }

      const task: DetectionTask = {
        imageData,
        timestampMs,
        resolve,
        reject,
        queuedAt: Date.now(),
      };

      this.taskQueue.push(task);
      this.processQueue();

      // Set up timeout
      setTimeout(() => {
        const taskIndex = this.taskQueue.findIndex(
          (t) => t.resolve === resolve && t.reject === reject
        );
        if (taskIndex !== -1) {
          this.taskQueue.splice(taskIndex, 1);
          reject(new Error('Detection timeout'));
        }
      }, this.config.taskTimeout);
    });
  }

  /**
   * Recycle a worker that has errored
   */
  private async recycleWorker(workerInstance: WorkerInstance): Promise<void> {
    try {
      workerInstance.worker.terminate();
    } catch (error) {
      console.warn('[WorkerPool] Error terminating worker:', error);
    }

    const index = this.workers.indexOf(workerInstance);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }

    // Replace the worker if we're above minimum
    if (this.workers.length >= this.config.minWorkers && this.isInitialized) {
      try {
        await this.createWorker();
      } catch (error) {
        console.warn('[WorkerPool] Failed to recycle worker:', error);
      }
    }
  }

  /**
   * Scale down the worker pool
   */
  public scaleDown(): void {
    if (this.workers.length <= this.config.minWorkers) {
      return;
    }

    // Remove idle workers first, sorted by least recently used
    const idleWorkers = this.workers
      .filter((w) => w.status === 'idle')
      .sort((a, b) => a.lastUsed - b.lastUsed);

    const workersToRemove = Math.min(
      idleWorkers.length,
      this.workers.length - this.config.minWorkers
    );

    for (let i = 0; i < workersToRemove; i++) {
      const worker = idleWorkers[i];
      worker.worker.terminate();
      const index = this.workers.indexOf(worker);
      if (index !== -1) {
        this.workers.splice(index, 1);
      }
    }

    console.log(`[WorkerPool] Scaled down to ${this.workers.length} workers`);
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    workerCount: number;
    idleWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    averageTaskTime: number;
    totalTasksProcessed: number;
    workerErrors: number;
  } {
    const idleWorkers = this.workers.filter((w) => w.status === 'idle').length;
    const busyWorkers = this.workers.filter((w) => w.status === 'busy').length;

    return {
      workerCount: this.workers.length,
      idleWorkers,
      busyWorkers,
      queuedTasks: this.taskQueue.length,
      averageTaskTime: this.averageTaskTime,
      totalTasksProcessed: this.totalTasksProcessed,
      workerErrors: this.workerErrors,
    };
  }

  /**
   * Check if pool is healthy
   */
  public isHealthy(): boolean {
    const errorRate = this.workerErrors / Math.max(1, this.totalTasksProcessed);
    return errorRate < 0.1 && this.workers.length >= this.config.minWorkers;
  }

  /**
   * Clean up all workers
   */
  public async shutdown(): Promise<void> {
    const shutdownPromises = this.workers.map((workerInstance) => {
      return new Promise<void>((resolve) => {
        workerInstance.worker.postMessage({ type: 'CLOSE' });
        workerInstance.worker.terminate();
        resolve();
      });
    });

    await Promise.all(shutdownPromises);
    this.workers = [];
    this.taskQueue = [];
    this.isInitialized = false;
    
    console.log('[WorkerPool] Shutdown complete');
  }
}

/**
 * Singleton instance
 */
let workerPoolInstance: WorkerPoolManager | null = null;

/**
 * Get or create singleton instance
 */
export function getWorkerPool(): WorkerPoolManager {
  if (!workerPoolInstance) {
    workerPoolInstance = new WorkerPoolManager();
  }
  return workerPoolInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetWorkerPool(): void {
  if (workerPoolInstance) {
    workerPoolInstance.shutdown();
    workerPoolInstance = null;
  }
}
