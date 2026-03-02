/**
 * Region Manager Service
 * Phase B: Scale Preparation - Week 8 Day 3
 * 
 * Multi-region management with failover and data synchronization
 */

import { logger } from '../utils/logger';

export type RegionCode = 'us-east' | 'us-west' | 'eu-west' | 'eu-central' | 'asia-east' | 'asia-southeast';
export type RegionStatus = 'active' | 'inactive' | 'degraded' | 'maintenance';

export interface Region {
  code: RegionCode;
  name: string;
  endpoint: string;
  status: RegionStatus;
  priority: number;
  databases: string[];
  lastHealthCheck: number;
  latency: number; // ms
}

export interface UserSession {
  userId: string;
  homeRegion: RegionCode;
  currentRegion: RegionCode;
  lastActive: number;
}

export interface RegionStats {
  activeUsers: number;
  requestsPerSecond: number;
  avgLatency: number;
  errorRate: number;
  healthScore: number;
}

/**
 * Region Manager Service
 */
export class RegionManagerService {
  private regions: Map<RegionCode, Region> = new Map();
  private userSessions: Map<string, UserSession> = new Map();
  private currentRegion: RegionCode | null = null;
  private failoverEnabled: boolean = true;

  constructor() {
    this.initializeDefaultRegions();
    logger.info('RegionManagerService initialized', {
      context: 'multi-region',
      metadata: {
        regionCount: this.regions.size
      }
    });
  }

  /**
   * Initialize default regions
   */
  private initializeDefaultRegions(): void {
    const defaultRegions: Region[] = [
      {
        code: 'us-east',
        name: 'US East (N. Virginia)',
        endpoint: 'https://us-east.api.spartanhub.io',
        status: 'active',
        priority: 1,
        databases: ['users', 'workouts', 'analytics'],
        lastHealthCheck: Date.now(),
        latency: 0
      },
      {
        code: 'us-west',
        name: 'US West (Oregon)',
        endpoint: 'https://us-west.api.spartanhub.io',
        status: 'active',
        priority: 2,
        databases: ['users', 'workouts', 'analytics'],
        lastHealthCheck: Date.now(),
        latency: 0
      },
      {
        code: 'eu-west',
        name: 'EU West (Ireland)',
        endpoint: 'https://eu-west.api.spartanhub.io',
        status: 'active',
        priority: 1,
        databases: ['users', 'workouts', 'analytics'],
        lastHealthCheck: Date.now(),
        latency: 0
      },
      {
        code: 'eu-central',
        name: 'EU Central (Frankfurt)',
        endpoint: 'https://eu-central.api.spartanhub.io',
        status: 'active',
        priority: 2,
        databases: ['users', 'workouts'],
        lastHealthCheck: Date.now(),
        latency: 0
      },
      {
        code: 'asia-east',
        name: 'Asia East (Tokyo)',
        endpoint: 'https://asia-east.api.spartanhub.io',
        status: 'active',
        priority: 1,
        databases: ['users', 'workouts', 'analytics'],
        lastHealthCheck: Date.now(),
        latency: 0
      },
      {
        code: 'asia-southeast',
        name: 'Asia Southeast (Singapore)',
        endpoint: 'https://asia-southeast.api.spartanhub.io',
        status: 'active',
        priority: 2,
        databases: ['users', 'workouts'],
        lastHealthCheck: Date.now(),
        latency: 0
      }
    ];

    defaultRegions.forEach(region => {
      this.regions.set(region.code, region);
    });

    // Set default current region
    this.currentRegion = 'us-east';
  }

  /**
   * Get region by code
   */
  getRegion(code: RegionCode): Region | null {
    return this.regions.get(code) || null;
  }

  /**
   * Get all active regions
   */
  getActiveRegions(): Region[] {
    return Array.from(this.regions.values())
      .filter(r => r.status === 'active');
  }

  /**
   * Get optimal region for user (lowest latency)
   */
  getOptimalRegion(userLatencies: Record<RegionCode, number>): Region | null {
    const activeRegions = this.getActiveRegions();
    
    let optimalRegion: Region | null = null;
    let lowestLatency = Infinity;

    for (const region of activeRegions) {
      const latency = userLatencies[region.code] || Infinity;
      if (latency < lowestLatency) {
        lowestLatency = latency;
        optimalRegion = region;
      }
    }

    return optimalRegion;
  }

  /**
   * Update region status
   */
  updateRegionStatus(code: RegionCode, status: RegionStatus): void {
    const region = this.regions.get(code);
    
    if (region) {
      region.status = status;
      region.lastHealthCheck = Date.now();

      logger.info('Region status updated', {
        context: 'multi-region',
        metadata: {
          regionCode: code,
          status
        }
      });

      // Trigger failover if region went down
      if (status === 'inactive' && this.failoverEnabled) {
        this.performFailover(code);
      }
    }
  }

  /**
   * Perform failover to backup region
   */
  private performFailover(failedRegion: RegionCode): void {
    const failedRegionData = this.regions.get(failedRegion);
    
    if (!failedRegionData) {
      return;
    }

    // Find backup region with same databases
    const backupRegion = Array.from(this.regions.values())
      .find(r => 
        r.code !== failedRegion &&
        r.status === 'active' &&
        r.priority === failedRegionData.priority + 1
      );

    if (backupRegion) {
      logger.warn('Region failover initiated', {
        context: 'multi-region',
        metadata: {
          from: failedRegion,
          to: backupRegion.code
        }
      });

      // Migrate user sessions
      this.migrateSessions(failedRegion, backupRegion.code);
    } else {
      logger.error('No backup region available for failover', {
        context: 'multi-region',
        metadata: {
          failedRegion
        }
      });
    }
  }

  /**
   * Migrate user sessions to new region
   */
  private migrateSessions(fromRegion: RegionCode, toRegion: RegionCode): void {
    let migratedCount = 0;

    for (const [userId, session] of this.userSessions.entries()) {
      if (session.currentRegion === fromRegion) {
        session.currentRegion = toRegion;
        migratedCount++;
      }
    }

    logger.info('User sessions migrated', {
      context: 'multi-region',
      metadata: {
        from: fromRegion,
        to: toRegion,
        count: migratedCount
      }
    });
  }

  /**
   * Create user session
   */
  createUserSession(userId: string, homeRegion: RegionCode): UserSession {
    const session: UserSession = {
      userId,
      homeRegion,
      currentRegion: homeRegion,
      lastActive: Date.now()
    };

    this.userSessions.set(userId, session);

    logger.debug('User session created', {
      context: 'multi-region',
      metadata: {
        userId,
        homeRegion
      }
    });

    return session;
  }

  /**
   * Get user session
   */
  getUserSession(userId: string): UserSession | null {
    return this.userSessions.get(userId) || null;
  }

  /**
   * Update user's current region
   */
  updateUserRegion(userId: string, newRegion: RegionCode): boolean {
    const session = this.userSessions.get(userId);
    
    if (!session) {
      return false;
    }

    const oldRegion = session.currentRegion;
    session.currentRegion = newRegion;
    session.lastActive = Date.now();

    logger.info('User region updated', {
      context: 'multi-region',
      metadata: {
        userId,
        from: oldRegion,
        to: newRegion
      }
    });

    return true;
  }

  /**
   * Get region statistics
   */
  getRegionStats(code: RegionCode): RegionStats | null {
    const region = this.regions.get(code);
    
    if (!region) {
      return null;
    }

    // Calculate stats from user sessions
    const activeUsers = Array.from(this.userSessions.values())
      .filter(s => s.currentRegion === code && 
                   Date.now() - s.lastActive < 300000 // 5 min
      ).length;

    return {
      activeUsers,
      requestsPerSecond: Math.floor(Math.random() * 1000), // In production, real metrics
      avgLatency: region.latency,
      errorRate: region.status === 'active' ? 0.001 : 0.1,
      healthScore: region.status === 'active' ? 100 : region.status === 'degraded' ? 50 : 0
    };
  }

  /**
   * Update region latency
   */
  updateRegionLatency(code: RegionCode, latency: number): void {
    const region = this.regions.get(code);
    
    if (region) {
      region.latency = latency;
      region.lastHealthCheck = Date.now();
    }
  }

  /**
   * Enable/disable failover
   */
  setFailoverEnabled(enabled: boolean): void {
    this.failoverEnabled = enabled;
    
    logger.info('Failover setting updated', {
      context: 'multi-region',
      metadata: { enabled }
    });
  }

  /**
   * Get current region
   */
  getCurrentRegion(): RegionCode | null {
    return this.currentRegion;
  }

  /**
   * Set current region (for testing)
   */
  setCurrentRegion(code: RegionCode): void {
    const region = this.regions.get(code);
    
    if (region && region.status === 'active') {
      this.currentRegion = code;
      
      logger.info('Current region changed', {
        context: 'multi-region',
        metadata: { region: code }
      });
    }
  }

  /**
   * Get all regions
   */
  getAllRegions(): Region[] {
    return Array.from(this.regions.values());
  }

  /**
   * Health check for all regions
   */
  async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.regions.entries()).map(
      async ([code, region]) => {
        try {
          // In production, this would actually ping the region
          const isHealthy = true; // Simulated health check
          
          if (!isHealthy) {
            this.updateRegionStatus(code, 'inactive');
          } else {
            this.updateRegionStatus(code, 'active');
          }

          logger.debug('Region health check completed', {
            context: 'multi-region',
            metadata: {
              regionCode: code,
              healthy: isHealthy
            }
          });
        } catch (error) {
          this.updateRegionStatus(code, 'degraded');
          
          logger.error('Region health check failed', {
            context: 'multi-region',
            metadata: { regionCode: code, error }
          });
        }
      }
    );

    await Promise.all(checkPromises);
  }

  /**
   * Get region for database
   */
  getRegionForDatabase(databaseName: string): RegionCode[] {
    const compatibleRegions: RegionCode[] = [];

    for (const [code, region] of this.regions.entries()) {
      if (region.databases.includes(databaseName) && region.status === 'active') {
        compatibleRegions.push(code);
      }
    }

    return compatibleRegions;
  }

  /**
   * Cleanup inactive sessions
   */
  cleanupInactiveSessions(maxAge: number = 86400000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, session] of this.userSessions.entries()) {
      if (now - session.lastActive > maxAge) {
        this.userSessions.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Inactive sessions cleaned up', {
        context: 'multi-region',
        metadata: { count: cleaned }
      });
    }

    return cleaned;
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const activeRegions = this.getActiveRegions().length;
    const isHealthy = activeRegions > 0;

    logger.debug('Multi-region health check', {
      context: 'multi-region',
      metadata: {
        healthy: isHealthy,
        activeRegions,
        totalRegions: this.regions.size
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const regionManagerService = new RegionManagerService();

export default regionManagerService;
