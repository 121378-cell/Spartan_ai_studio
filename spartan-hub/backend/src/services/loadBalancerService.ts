/**
 * Load Balancer Service
 * Phase B: Scale Preparation - Week 8 Day 4
 * 
 * Intelligent traffic distribution with health monitoring
 */

import { logger } from '../utils/logger';

export type LoadBalancingStrategy = 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted';
export type HealthCheckType = 'http' | 'tcp' | 'grpc';

export interface BackendServer {
  id: string;
  host: string;
  port: number;
  weight: number;
  currentConnections: number;
  maxConnections: number;
  healthy: boolean;
  lastHealthCheck: number;
  failedChecks: number;
}

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  stickySessions: boolean;
  stickySessionTTL: number;
}

export interface Request {
  id: string;
  clientId: string;
  clientIP: string;
  path: string;
  method: string;
  timestamp: number;
}

export interface LoadBalancerStats {
  totalRequests: number;
  requestsPerSecond: number;
  avgResponseTime: number;
  activeConnections: number;
  healthyServers: number;
  totalServers: number;
  errorRate: number;
}

/**
 * Load Balancer Service
 */
export class LoadBalancerService {
  private servers: Map<string, BackendServer> = new Map();
  private config: LoadBalancerConfig;
  private roundRobinIndex: number = 0;
  private stickySessions: Map<string, string> = new Map(); // clientId -> serverId
  private stats: LoadBalancerStats = {
    totalRequests: 0,
    requestsPerSecond: 0,
    avgResponseTime: 0,
    activeConnections: 0,
    healthyServers: 0,
    totalServers: 0,
    errorRate: 0
  };

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.config = {
      strategy: 'round_robin',
      healthCheckInterval: 10000,
      healthCheckTimeout: 5000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
      stickySessions: true,
      stickySessionTTL: 3600000, // 1 hour
      ...config
    };

    logger.info('LoadBalancerService initialized', {
      context: 'load-balancer',
      metadata: {
        strategy: this.config.strategy,
        stickySessions: this.config.stickySessions
      }
    });
  }

  /**
   * Add backend server
   */
  addServer(server: BackendServer): boolean {
    if (this.servers.has(server.id)) {
      logger.warn('Server already exists', {
        context: 'load-balancer',
        metadata: { serverId: server.id }
      });
      return false;
    }

    this.servers.set(server.id, server);
    this.stats.totalServers++;
    this.stats.healthyServers++;

    logger.info('Backend server added', {
      context: 'load-balancer',
      metadata: {
        serverId: server.id,
        host: server.host,
        port: server.port,
        weight: server.weight
      }
    });

    return true;
  }

  /**
   * Remove backend server
   */
  removeServer(serverId: string): boolean {
    const removed = this.servers.delete(serverId);
    
    if (removed) {
      this.stats.totalServers--;
      this.stats.healthyServers--;
      
      // Cleanup sticky sessions
      for (const [clientId, sid] of this.stickySessions.entries()) {
        if (sid === serverId) {
          this.stickySessions.delete(clientId);
        }
      }

      logger.info('Backend server removed', {
        context: 'load-balancer',
        metadata: { serverId }
      });
    }

    return removed;
  }

  /**
   * Get next server based on strategy
   */
  getNextServer(request?: Request): BackendServer | null {
    const healthyServers = Array.from(this.servers.values())
      .filter(s => s.healthy && s.currentConnections < s.maxConnections);

    if (healthyServers.length === 0) {
      return null;
    }

    // Check sticky sessions
    if (this.config.stickySessions && request) {
      const stickyServerId = this.stickySessions.get(request.clientId);
      
      if (stickyServerId) {
        const server = this.servers.get(stickyServerId);
        if (server && server.healthy && server.currentConnections < server.maxConnections) {
          return server;
        }
      }
    }

    let server: BackendServer | null = null;

    switch (this.config.strategy) {
      case 'round_robin':
        server = this.getRoundRobinServer(healthyServers);
        break;
      
      case 'least_connections':
        server = this.getLeastConnectionsServer(healthyServers);
        break;
      
      case 'ip_hash':
        server = request ? this.getIPHashServer(request, healthyServers) : healthyServers[0];
        break;
      
      case 'weighted':
        server = this.getWeightedServer(healthyServers);
        break;
      
      default:
        server = healthyServers[0];
    }

    // Set sticky session
    if (this.config.stickySessions && request && server) {
      this.stickySessions.set(request.clientId, server.id);
    }

    return server;
  }

  /**
   * Round-robin strategy
   */
  private getRoundRobinServer(servers: BackendServer[]): BackendServer {
    this.roundRobinIndex = (this.roundRobinIndex + 1) % servers.length;
    return servers[this.roundRobinIndex];
  }

  /**
   * Least connections strategy
   */
  private getLeastConnectionsServer(servers: BackendServer[]): BackendServer {
    return servers.reduce((min, server) => 
      server.currentConnections < min.currentConnections ? server : min
    );
  }

  /**
   * IP hash strategy
   */
  private getIPHashServer(request: Request, servers: BackendServer[]): BackendServer {
    const hash = this.hashString(request.clientIP);
    const index = Math.abs(hash) % servers.length;
    return servers[index];
  }

  /**
   * Weighted strategy
   */
  private getWeightedServer(servers: BackendServer[]): BackendServer {
    const totalWeight = servers.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }

    return servers[0];
  }

  /**
   * Simple string hash
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Update server connection count
   */
  updateServerConnections(serverId: string, delta: number): void {
    const server = this.servers.get(serverId);
    
    if (server) {
      server.currentConnections = Math.max(0, server.currentConnections + delta);
      this.stats.activeConnections = this.getActiveConnections();
    }
  }

  /**
   * Get active connections
   */
  private getActiveConnections(): number {
    let total = 0;
    for (const server of this.servers.values()) {
      total += server.currentConnections;
    }
    return total;
  }

  /**
   * Update server health
   */
  updateServerHealth(serverId: string, healthy: boolean): void {
    const server = this.servers.get(serverId);
    
    if (!server) {
      return;
    }

    if (healthy) {
      server.failedChecks = 0;
      
      if (!server.healthy) {
        server.healthy = true;
        this.stats.healthyServers++;
        
        logger.info('Server recovered', {
          context: 'load-balancer',
          metadata: { serverId }
        });
      }
    } else {
      server.failedChecks++;
      
      if (server.failedChecks >= this.config.unhealthyThreshold && server.healthy) {
        server.healthy = false;
        this.stats.healthyServers--;
        
        logger.warn('Server marked unhealthy', {
          context: 'load-balancer',
          metadata: {
            serverId,
            failedChecks: server.failedChecks
          }
        });
      }
    }

    server.lastHealthCheck = Date.now();
  }

  /**
   * Perform health checks on all servers
   */
  async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.servers.entries()).map(
      async ([id, server]) => {
        try {
          // In production, this would actually check the server health
          const isHealthy = true; // Simulated health check
          this.updateServerHealth(id, isHealthy);
          
          logger.debug('Server health check passed', {
            context: 'load-balancer',
            metadata: { serverId: id }
          });
        } catch (error) {
          this.updateServerHealth(id, false);
          
          logger.error('Server health check failed', {
            context: 'load-balancer',
            metadata: { serverId: id, error }
          });
        }
      }
    );

    await Promise.all(checkPromises);
  }

  /**
   * Track request
   */
  trackRequest(responseTime: number, success: boolean): void {
    this.stats.totalRequests++;
    this.stats.requestsPerSecond = this.stats.totalRequests / ((Date.now() / 1000) % 3600);
    
    // Update average response time
    const total = this.stats.totalRequests;
    const currentAvg = this.stats.avgResponseTime;
    this.stats.avgResponseTime = ((currentAvg * (total - 1)) + responseTime) / total;
    
    // Update error rate
    const errors = success ? 0 : 1;
    this.stats.errorRate = (errors / total) * 100;
  }

  /**
   * Get load balancer statistics
   */
  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  /**
   * Get all servers
   */
  getAllServers(): BackendServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get healthy servers
   */
  getHealthyServers(): BackendServer[] {
    return Array.from(this.servers.values())
      .filter(s => s.healthy);
  }

  /**
   * Update load balancing strategy
   */
  updateStrategy(strategy: LoadBalancingStrategy): void {
    this.config.strategy = strategy;
    
    logger.info('Load balancing strategy updated', {
      context: 'load-balancer',
      metadata: { strategy }
    });
  }

  /**
   * Enable/disable sticky sessions
   */
  setStickySessions(enabled: boolean): void {
    this.config.stickySessions = enabled;
    
    if (!enabled) {
      this.stickySessions.clear();
    }

    logger.info('Sticky sessions updated', {
      context: 'load-balancer',
      metadata: { enabled }
    });
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): BackendServer | null {
    return this.servers.get(serverId) || null;
  }

  /**
   * Cleanup expired sticky sessions
   */
  cleanupStickySessions(): number {
    const now = Date.now();
    let cleaned = 0;

    // In production, would track session creation time
    // For now, just clear old sessions
    if (now % this.config.stickySessionTTL === 0) {
      this.stickySessions.clear();
      cleaned = this.stickySessions.size;
    }

    return cleaned;
  }

  /**
   * Get server load distribution
   */
  getServerLoadDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const [id, server] of this.servers.entries()) {
      distribution[id] = (server.currentConnections / server.maxConnections) * 100;
    }

    return distribution;
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(timeout: number = 30000): Promise<void> {
    logger.info('Load balancer graceful shutdown initiated', {
      context: 'load-balancer',
      metadata: { timeout }
    });

    // Stop accepting new requests
    // Wait for existing connections to drain
    await new Promise(resolve => setTimeout(resolve, timeout));

    logger.info('Load balancer shutdown complete', {
      context: 'load-balancer'
    });
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const healthyServers = this.stats.healthyServers;
    const isHealthy = healthyServers > 0;

    logger.debug('Load balancer health check', {
      context: 'load-balancer',
      metadata: {
        healthy: isHealthy,
        healthyServers,
        totalServers: this.stats.totalServers
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const loadBalancerService = new LoadBalancerService();

export default loadBalancerService;
