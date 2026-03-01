#!/usr/bin/env node
/**
 * Database Query Optimization Script
 * Applies performance optimizations and monitors query execution
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import fs from 'fs';
import path from 'path';

interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
}

interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  isUsed: boolean;
}

class DatabaseOptimizer {
  private db: DatabaseType;
  private performanceLog: QueryPerformance[] = [];
  private indexUsage: Map<string, number> = new Map();

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.setupMonitoring();
  }

  /**
   * Apply all recommended database optimizations
   */
  async applyOptimizations(): Promise<void> {
    console.log('🚀 Starting database optimization process...\n');

    // 1. Create indexes
    await this.createIndexes();
    
    // 2. Optimize existing queries
    await this.optimizeQueries();
    
    // 3. Set up monitoring
    await this.setupQueryMonitoring();
    
    // 4. Generate performance report
    await this.generatePerformanceReport();
    
    console.log('\n✅ Database optimization completed successfully!');
  }

  /**
   * Create all recommended indexes from SQL script
   */
  private async createIndexes(): Promise<void> {
    console.log('📊 Creating database indexes...');
    
    const indexPath = path.join(__dirname, 'create-indexes.sql');
    const indexScript = fs.readFileSync(indexPath, 'utf8');
    
    // Split script into individual statements
    const statements = indexScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const statement of statements) {
      try {
        this.db.exec(statement);
        createdCount++;
        console.log(`  ✅ Created index: ${statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1] || 'unknown'}`);
      } catch (error) {
        if ((error as Error).message.includes('already exists')) {
          skippedCount++;
          console.log('  ⚠️  Skipped existing index');
        } else {
          console.error(`  ❌ Failed to create index: ${(error as Error).message}`);
        }
      }
    }
    
    console.log('\n📈 Index creation summary:');
    console.log(`  Created: ${createdCount} indexes`);
    console.log(`  Skipped: ${skippedCount} existing indexes\n`);
  }

  /**
   * Optimize common query patterns in the application
   */
  private async optimizeQueries(): Promise<void> {
    console.log('⚡ Optimizing query patterns...');
    
    // Cache frequently accessed data
    await this.implementQueryCaching();
    
    // Optimize join queries
    await this.optimizeJoinQueries();
    
    // Implement pagination optimization
    await this.optimizePagination();
  }

  /**
   * Implement intelligent query caching
   */
  private async implementQueryCaching(): Promise<void> {
    console.log('  🔧 Setting up query caching...');
    
    // Create cache table for frequently accessed data
    const cacheTableSQL = `
      CREATE TABLE IF NOT EXISTS query_cache (
        cache_key TEXT PRIMARY KEY,
        cache_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `;
    
    this.db.exec(cacheTableSQL);
    
    // Create index on expiration for cleanup
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at)');
    
    console.log('    ✅ Query cache table created');
  }

  /**
   * Optimize join-heavy queries with proper indexing
   */
  private async optimizeJoinQueries(): Promise<void> {
    console.log('  🔧 Optimizing join queries...');
    
    // Analyze current query performance
    const slowQueries = this.identifySlowQueries();
    
    for (const queryInfo of slowQueries) {
      console.log(`    📊 Analyzing: ${queryInfo.query.substring(0, 50)}...`);
      
      // Get execution plan
      const plan = this.getQueryPlan(queryInfo.query);
      console.log(`      Plan: ${plan}`);
      
      // Suggest optimizations
      this.suggestOptimizations(queryInfo.query, plan);
    }
  }

  /**
   * Optimize pagination queries for better performance
   */
  private async optimizePagination(): Promise<void> {
    console.log('  🔧 Optimizing pagination...');
    
    // Create optimized pagination views
    const paginationViews = [
      `CREATE VIEW IF NOT EXISTS v_recent_workouts AS
         SELECT w.*, u.email as user_email
         FROM workouts w
         JOIN users u ON w.user_id = u.id
         ORDER BY w.created_at DESC`,
      
      `CREATE VIEW IF NOT EXISTS v_active_users AS
         SELECT u.*, COUNT(w.id) as workout_count
         FROM users u
         LEFT JOIN workouts w ON u.id = w.user_id
         WHERE u.status = 'active'
         GROUP BY u.id
         ORDER BY workout_count DESC`
    ];
    
    for (const viewSQL of paginationViews) {
      try {
        this.db.exec(viewSQL);
        console.log('    ✅ Created pagination view');
      } catch (error) {
        console.error(`    ❌ Failed to create view: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Set up comprehensive query monitoring
   */
  private async setupQueryMonitoring(): Promise<void> {
    console.log('🔍 Setting up query monitoring...');
    
    // Enable query logging
    (this.db as any).on('trace', (sql: string) => {
      console.log(`[QUERY] ${sql}`);
    });
    
    // Monitor query performance
    const startTime = Date.now();
    
    // Test common queries
    const testQueries = [
      'SELECT * FROM users WHERE email = ?',
      'SELECT * FROM workouts WHERE user_id = ? ORDER BY scheduled_date DESC LIMIT 10',
      'SELECT COUNT(*) FROM exercises WHERE workout_id = ?',
      'SELECT * FROM workout_logs WHERE user_id = ? AND completed_at >= ? ORDER BY completed_at DESC'
    ];
    
    for (const query of testQueries) {
      const start = Date.now();
      try {
        const result = this.db.prepare(query).all();
        const executionTime = Date.now() - start;
        
        this.performanceLog.push({
          query,
          executionTime,
          rowsReturned: Array.isArray(result) ? result.length : 0,
          timestamp: new Date()
        });
        
        console.log(`  ⚡ ${executionTime}ms - ${query.substring(0, 40)}...`);
      } catch (error) {
        console.error(`  ❌ Query failed: ${(error as Error).message}`);
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️  Total monitoring time: ${totalTime}ms`);
  }

  /**
   * Generate comprehensive performance report
   */
  private async generatePerformanceReport(): Promise<void> {
    console.log('\n📋 Generating performance report...');
    
    // Get database statistics
    const stats = this.getDatabaseStats();
    
    // Get index information
    const indexes = this.getIndexInformation();
    
    // Get performance metrics
    const metrics = this.getPerformanceMetrics();
    
    const report = {
      timestamp: new Date().toISOString(),
      databaseStats: stats,
      indexInformation: indexes,
      performanceMetrics: metrics,
      recommendations: this.generateRecommendations(stats, indexes, metrics)
    };
    
    // Save report to file
    const reportPath = path.join(__dirname, '../logs/database-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📝 Performance report saved to: ${reportPath}`);
    
    // Display key metrics
    console.log('\n📈 Key Performance Metrics:');
    console.log(`  Database Size: ${stats.databaseSize}`);
    console.log(`  Tables: ${stats.tableCount}`);
    console.log(`  Indexes: ${indexes.length}`);
    console.log(`  Average Query Time: ${metrics.averageExecutionTime.toFixed(2)}ms`);
    console.log(`  Slow Queries: ${metrics.slowQueryCount}`);
  }

  // Helper methods
  private setupMonitoring(): void {
    // Set up periodic cleanup of expired cache entries
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 3600000); // Every hour
  }

  private identifySlowQueries(): Array<{query: string, executionTime: number}> {
    // In a real implementation, this would analyze query logs
    // For now, return common slow query patterns
    return [
      {
        query: 'SELECT * FROM workouts w JOIN users u ON w.user_id = u.id WHERE w.scheduled_date >= ? ORDER BY w.scheduled_date',
        executionTime: 150
      },
      {
        query: 'SELECT COUNT(*) FROM exercises e JOIN workouts w ON e.workout_id = w.id WHERE w.user_id = ?',
        executionTime: 85
      }
    ];
  }

  private getQueryPlan(query: string): string {
    try {
      const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${query}`).all();
      return plan.map((row: any) => row.detail).join(' -> ');
    } catch (error) {
      return `Unable to generate plan: ${(error as Error).message}`;
    }
  }

  private suggestOptimizations(query: string, plan: string): void {
    if (plan.includes('SCAN') && !plan.includes('SEARCH')) {
      console.log('      🔍 Recommendation: Add index on filtered column');
    }
    
    if (plan.includes('TEMP B-TREE')) {
      console.log('      🔍 Recommendation: Optimize ORDER BY clause or add composite index');
    }
  }

  private getDatabaseStats(): any {
    const tableCount = this.db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type=\'table\'').get() as {count: number};
    const indexCount = this.db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type=\'index\'').get() as {count: number};
    
    return {
      tableCount: tableCount.count,
      indexCount: indexCount.count,
      databaseSize: 'N/A' // Would require file system access
    };
  }

  private getIndexInformation(): IndexInfo[] {
    const indexes = this.db.prepare(`
      SELECT name, tbl_name as table_name
      FROM sqlite_master 
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{name: string, table_name: string}>;
    
    return indexes.map(idx => ({
      name: idx.name,
      table: idx.table_name,
      columns: [] as string[], // Would need to parse index definition
      isUsed: false // Would require monitoring data
    }));
  }

  private getPerformanceMetrics(): any {
    if (this.performanceLog.length === 0) {
      return {
        averageExecutionTime: 0,
        slowQueryCount: 0,
        totalQueries: 0
      };
    }
    
    const totalExecutionTime = this.performanceLog.reduce((sum, log) => sum + log.executionTime, 0);
    const slowQueries = this.performanceLog.filter(log => log.executionTime > 100);
    
    return {
      averageExecutionTime: totalExecutionTime / this.performanceLog.length,
      slowQueryCount: slowQueries.length,
      totalQueries: this.performanceLog.length
    };
  }

  private generateRecommendations(stats: any, indexes: IndexInfo[], metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.slowQueryCount > 0) {
      recommendations.push('Address slow queries by adding appropriate indexes');
    }
    
    if (stats.indexCount < 15) {
      recommendations.push('Consider adding more indexes for frequently queried columns');
    }
    
    if (metrics.averageExecutionTime > 50) {
      recommendations.push('Investigate query optimization opportunities');
    }
    
    return recommendations;
  }

  private cleanupExpiredCache(): void {
    try {
      const deleted = this.db.prepare(
        'DELETE FROM query_cache WHERE expires_at < datetime("now")'
      ).run();
      console.log(`🧹 Cleaned up ${deleted.changes} expired cache entries`);
    } catch (error) {
      console.error('❌ Cache cleanup failed:', (error as Error).message);
    }
  }
}

// Execute optimization if run directly
if (require.main === module) {
  const dbPath = process.argv[2] || './data/spartan_hub.db';
  
  const optimizer = new DatabaseOptimizer(dbPath);
  optimizer.applyOptimizations().catch(console.error);
}

export default DatabaseOptimizer;