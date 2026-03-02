/**
 * Data Synchronization Service
 * Phase B: Scale Preparation - Week 8 Day 3
 * 
 * Cross-region data synchronization with conflict resolution
 */

import { logger } from '../utils/logger';
import { RegionCode } from './regionManagerService';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';
export type ConflictResolution = 'last_write_wins' | 'first_write_wins' | 'manual' | 'merge';

export interface SyncJob {
  id: string;
  sourceRegion: RegionCode;
  targetRegion: RegionCode;
  dataType: string;
  recordId: string;
  status: SyncStatus;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface DataConflict {
  id: string;
  dataType: string;
  recordId: string;
  region1: RegionCode;
  region1Data: any;
  region1Timestamp: number;
  region2: RegionCode;
  region2Data: any;
  region2Timestamp: number;
  resolution: ConflictResolution;
  resolved: boolean;
}

export interface SyncStats {
  totalJobs: number;
  pendingJobs: number;
  completedJobs: number;
  failedJobs: number;
  conflictsDetected: number;
  conflictsResolved: number;
  avgSyncTime: number;
}

/**
 * Data Synchronization Service
 */
export class DataSyncService {
  private syncJobs: Map<string, SyncJob> = new Map();
  private conflicts: Map<string, DataConflict> = new Map();
  private stats: SyncStats = {
    totalJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    conflictsDetected: 0,
    conflictsResolved: 0,
    avgSyncTime: 0
  };
  private defaultResolution: ConflictResolution = 'last_write_wins';

  constructor() {
    logger.info('DataSyncService initialized', {
      context: 'data-sync',
      metadata: {
        defaultResolution: this.defaultResolution
      }
    });
  }

  /**
   * Create sync job
   */
  createSyncJob(
    sourceRegion: RegionCode,
    targetRegion: RegionCode,
    dataType: string,
    recordId: string
  ): SyncJob {
    const job: SyncJob = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceRegion,
      targetRegion,
      dataType,
      recordId,
      status: 'pending',
      createdAt: Date.now()
    };

    this.syncJobs.set(job.id, job);
    this.stats.totalJobs++;
    this.stats.pendingJobs++;

    logger.debug('Sync job created', {
      context: 'data-sync',
      metadata: {
        jobId: job.id,
        source: sourceRegion,
        target: targetRegion,
        dataType
      }
    });

    return job;
  }

  /**
   * Start sync job
   */
  async startSyncJob(jobId: string): Promise<boolean> {
    const job = this.syncJobs.get(jobId);
    
    if (!job) {
      return false;
    }

    job.status = 'syncing';
    const startTime = Date.now();

    try {
      // In production, this would actually sync data between regions
      await this.performSync(job);
      
      const syncTime = Date.now() - startTime;
      job.status = 'completed';
      job.completedAt = Date.now();
      
      this.stats.completedJobs++;
      this.stats.pendingJobs--;
      this.updateAvgSyncTime(syncTime);

      logger.info('Sync job completed', {
        context: 'data-sync',
        metadata: {
          jobId,
          syncTime
        }
      });

      return true;
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.stats.failedJobs++;
      this.stats.pendingJobs--;

      logger.error('Sync job failed', {
        context: 'data-sync',
        metadata: {
          jobId,
          error: job.error
        }
      });

      return false;
    }
  }

  /**
   * Perform actual sync (simulated)
   */
  private async performSync(job: SyncJob): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In production, this would:
    // 1. Fetch data from source region
    // 2. Check for conflicts in target region
    // 3. Resolve conflicts if any
    // 4. Write data to target region
    // 5. Verify sync completion
  }

  /**
   * Detect data conflict
   */
  detectConflict(
    dataType: string,
    recordId: string,
    region1: RegionCode,
    region1Data: any,
    region1Timestamp: number,
    region2: RegionCode,
    region2Data: any,
    region2Timestamp: number
  ): DataConflict {
    const conflict: DataConflict = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dataType,
      recordId,
      region1,
      region1Data,
      region1Timestamp,
      region2,
      region2Data,
      region2Timestamp,
      resolution: this.defaultResolution,
      resolved: false
    };

    this.conflicts.set(conflict.id, conflict);
    this.stats.conflictsDetected++;

    logger.warn('Data conflict detected', {
      context: 'data-sync',
      metadata: {
        conflictId: conflict.id,
        dataType,
        recordId,
        regions: [region1, region2]
      }
    });

    return conflict;
  }

  /**
   * Resolve conflict
   */
  resolveConflict(conflictId: string, resolution: ConflictResolution): boolean {
    const conflict = this.conflicts.get(conflictId);
    
    if (!conflict) {
      return false;
    }

    conflict.resolution = resolution;
    conflict.resolved = true;
    this.stats.conflictsResolved++;

    logger.info('Conflict resolved', {
      context: 'data-sync',
      metadata: {
        conflictId,
        resolution
      }
    });

    return true;
  }

  /**
   * Auto-resolve conflict based on strategy
   */
  autoResolveConflict(conflict: DataConflict): any {
    switch (conflict.resolution) {
      case 'last_write_wins':
        return conflict.region1Timestamp > conflict.region2Timestamp 
          ? conflict.region1Data 
          : conflict.region2Data;
      
      case 'first_write_wins':
        return conflict.region1Timestamp < conflict.region2Timestamp 
          ? conflict.region1Data 
          : conflict.region2Data;
      
      case 'merge':
        // Simple merge - in production would use proper merge logic
        return {
          ...conflict.region2Data,
          ...conflict.region1Data
        };
      
      case 'manual':
        throw new Error('Manual resolution required');
      
      default:
        return conflict.region1Data;
    }
  }

  /**
   * Get sync job status
   */
  getSyncJobStatus(jobId: string): SyncJob | null {
    return this.syncJobs.get(jobId) || null;
  }

  /**
   * Get pending sync jobs
   */
  getPendingSyncJobs(): SyncJob[] {
    return Array.from(this.syncJobs.values())
      .filter(j => j.status === 'pending');
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): DataConflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => !c.resolved);
  }

  /**
   * Get synchronization statistics
   */
  getStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Update average sync time
   */
  private updateAvgSyncTime(newTime: number): void {
    const total = this.stats.completedJobs + this.stats.failedJobs;
    const currentAvg = this.stats.avgSyncTime;
    this.stats.avgSyncTime = ((currentAvg * (total - 1)) + newTime) / total;
  }

  /**
   * Set default conflict resolution
   */
  setDefaultResolution(resolution: ConflictResolution): void {
    this.defaultResolution = resolution;
    
    logger.info('Default conflict resolution updated', {
      context: 'data-sync',
      metadata: { resolution }
    });
  }

  /**
   * Retry failed sync jobs
   */
  retryFailedJobs(maxRetries: number = 3): number {
    let retried = 0;

    for (const [jobId, job] of this.syncJobs.entries()) {
      if (job.status === 'failed') {
        const retryCount = (job.error?.match(/retry/gi) || []).length;
        
        if (retryCount < maxRetries) {
          job.status = 'pending';
          job.error = undefined;
          this.stats.failedJobs--;
          this.stats.pendingJobs++;
          retried++;

          logger.info('Sync job queued for retry', {
            context: 'data-sync',
            metadata: {
              jobId,
              retryCount: retryCount + 1
            }
          });
        }
      }
    }

    return retried;
  }

  /**
   * Cleanup old sync jobs
   */
  cleanupOldJobs(maxAge: number = 86400000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, job] of this.syncJobs.entries()) {
      if (job.completedAt && now - job.completedAt > maxAge) {
        this.syncJobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Old sync jobs cleaned up', {
        context: 'data-sync',
        metadata: { count: cleaned }
      });
    }

    return cleaned;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const pendingJobs = this.stats.pendingJobs;
    const failedJobs = this.stats.failedJobs;
    const isHealthy = pendingJobs < 100 && failedJobs < 10;

    logger.debug('Data sync health check', {
      context: 'data-sync',
      metadata: {
        healthy: isHealthy,
        pendingJobs,
        failedJobs
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const dataSyncService = new DataSyncService();

export default dataSyncService;
