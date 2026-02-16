#!/usr/bin/env node
/**
 * Database Migration Script for Performance Optimizations
 * Applies all Phase 3 Week 5 optimizations to existing database
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import fs from 'fs';
import path from 'path';

interface MigrationResult {
  success: boolean;
  message: string;
  executionTime: number;
  affectedRows?: number;
}

class DatabaseMigration {
  private db: DatabaseType;
  private results: MigrationResult[] = [];

  constructor(dbPath: string) {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    console.log(`📁 Connected to database: ${dbPath}`);
  }

  /**
   * Execute complete database optimization migration
   */
  async executeMigration(): Promise<void> {
    console.log('🚀 Starting Phase 3 Week 5 Database Migration\n');
    
    try {
      // 1. Backup existing database
      await this.createBackup();
      
      // 2. Apply index optimizations
      await this.applyIndexOptimizations();
      
      // 3. Optimize table structures
      await this.optimizeTableStructures();
      
      // 4. Implement query caching
      await this.setupQueryCaching();
      
      // 5. Validate optimizations
      await this.validateOptimizations();
      
      // 6. Generate migration report
      await this.generateMigrationReport();
      
      console.log('\n✅ Database migration completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Migration failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Create backup of current database
   */
  private async createBackup(): Promise<void> {
    const startTime = Date.now();
    console.log('💾 Creating database backup...');
    
    try {
      const backupPath = this.db.name.replace('.db', '_backup_pre_migration.db');
      
      // SQLite backup using VACUUM INTO (SQLite 3.27.0+)
      this.db.exec(`VACUUM INTO '${backupPath}'`);
      
      const executionTime = Date.now() - startTime;
      this.results.push({
        success: true,
        message: `Database backed up to ${backupPath}`,
        executionTime
      });
      
      console.log(`  ✅ Backup created: ${backupPath}`);
      
    } catch (error) {
      // Fallback backup method using file copy
      console.log('  ⚠️  Using fallback backup method...');
      const backupPath = this.db.name.replace('.db', '_backup_fallback.db');
      
      // Simple file copy as fallback
      const sourcePath = this.db.name;
      fs.copyFileSync(sourcePath, backupPath);
      
      const executionTime = Date.now() - startTime;
      this.results.push({
        success: true,
        message: `Database backed up using fallback method to ${backupPath}`,
        executionTime
      });
      
      console.log(`  ✅ Fallback backup created: ${backupPath}`);
    }
  }

  /**
   * Apply all recommended index optimizations
   */
  private async applyIndexOptimizations(): Promise<void> {
    console.log('\n📊 Applying index optimizations...');
    
    const indexPath = path.join(__dirname, '../scripts/create-indexes.sql');
    const indexScript = fs.readFileSync(indexPath, 'utf8');
    
    const statements = indexScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      const startTime = Date.now();
      try {
        this.db.exec(statement);
        const executionTime = Date.now() - startTime;
        
        const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        this.results.push({
          success: true,
          message: `Created index: ${indexName}`,
          executionTime
        });
        
        console.log(`  ✅ ${indexName}`);
        successCount++;
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.results.push({
          success: false,
          message: `Failed to create index: ${(error as Error).message}`,
          executionTime
        });
        
        if (!(error as Error).message.includes('already exists')) {
          console.error(`  ❌ ${(error as Error).message}`);
          errorCount++;
        } else {
          console.log(`  ⚠️  Index already exists`);
        }
      }
    }
    
    console.log(`\n📈 Index optimization summary:`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
  }

  /**
   * Optimize table structures for better performance
   */
  private async optimizeTableStructures(): Promise<void> {
    console.log('\n🔧 Optimizing table structures...');
    
    const optimizations = [
      // Add indexes for foreign keys if they don't exist
      `CREATE INDEX IF NOT EXISTS idx_exercises_workout_id ON exercises(workout_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id)`,
      `CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_id ON workout_logs(workout_id)`,
      
      // Optimize user table with additional indexes
      `CREATE INDEX IF NOT EXISTS idx_users_status_email ON users(status, email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_created_status ON users(created_at, status)`,
      
      // Add computed columns for frequently calculated values
      `ALTER TABLE workouts ADD COLUMN exercise_count INTEGER DEFAULT 0`,
      `ALTER TABLE workouts ADD COLUMN total_volume REAL DEFAULT 0`
    ];
    
    let successCount = 0;
    
    for (const optimization of optimizations) {
      const startTime = Date.now();
      try {
        this.db.exec(optimization);
        const executionTime = Date.now() - startTime;
        
        this.results.push({
          success: true,
          message: `Applied optimization: ${optimization.substring(0, 50)}...`,
          executionTime
        });
        
        console.log(`  ✅ Applied optimization`);
        successCount++;
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        // Ignore errors for already existing indexes/columns
        if ((error as Error).message.includes('duplicate column') || 
            (error as Error).message.includes('already exists')) {
          console.log(`  ⚠️  Already exists, skipping`);
          successCount++; // Count as success since it's already optimized
        } else {
          this.results.push({
            success: false,
            message: `Failed optimization: ${(error as Error).message}`,
            executionTime
          });
          console.error(`  ❌ ${(error as Error).message}`);
        }
      }
    }
    
    console.log(`\n📈 Table optimization summary:`);
    console.log(`  Successful: ${successCount}/${optimizations.length}`);
  }

  /**
   * Set up query caching infrastructure
   */
  private async setupQueryCaching(): Promise<void> {
    console.log('\nキャッシング Setting up query caching...');
    
    const cacheSetup = [
      // Create cache table
      `CREATE TABLE IF NOT EXISTS query_cache (
        cache_key TEXT PRIMARY KEY,
        cache_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        hit_count INTEGER DEFAULT 0
      )`,
      
      // Create indexes for cache table
      `CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_query_cache_created ON query_cache(created_at)`,
      
      // Create cache statistics table
      `CREATE TABLE IF NOT EXISTS cache_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT NOT NULL,
        hit_count INTEGER DEFAULT 0,
        miss_count INTEGER DEFAULT 0,
        avg_execution_time REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    for (const setupQuery of cacheSetup) {
      const startTime = Date.now();
      try {
        this.db.exec(setupQuery);
        const executionTime = Date.now() - startTime;
        
        this.results.push({
          success: true,
          message: `Cache setup: ${setupQuery.substring(0, 40)}...`,
          executionTime
        });
        
        console.log(`  ✅ Cache setup completed`);
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.results.push({
          success: false,
          message: `Cache setup failed: ${(error as Error).message}`,
          executionTime
        });
        console.error(`  ❌ ${(error as Error).message}`);
      }
    }
  }

  /**
   * Validate that optimizations were applied correctly
   */
  private async validateOptimizations(): Promise<void> {
    console.log('\n🔍 Validating optimizations...');
    
    // Check index count
    const indexCount = this.db.prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    ).get() as {count: number};
    
    console.log(`  📊 Total indexes: ${indexCount.count}`);
    
    // Check table structures
    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as Array<{name: string}>;
    
    console.log(`  📊 Tables with optimizations: ${tables.length}`);
    
    // Test query performance
    const testQueries = [
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      'SELECT COUNT(*) FROM workouts WHERE user_id = ?',
      'SELECT * FROM exercises WHERE workout_id = ? LIMIT 10'
    ];
    
    console.log('\n  ⚡ Performance tests:');
    for (const query of testQueries) {
      const startTime = Date.now();
      try {
        // Use dummy parameters for testing
        this.db.prepare(query).all(1);
        const executionTime = Date.now() - startTime;
        console.log(`    ${executionTime}ms - ${query.substring(0, 40)}...`);
      } catch (error) {
        console.log(`    ERROR - ${(error as Error).message}`);
      }
    }
    
    this.results.push({
      success: true,
      message: `Validation completed - ${indexCount.count} indexes, ${tables.length} tables`,
      executionTime: 0
    });
  }

  /**
   * Generate comprehensive migration report
   */
  private async generateMigrationReport(): Promise<void> {
    console.log('\n📋 Generating migration report...');
    
    const successfulOps = this.results.filter(r => r.success).length;
    const failedOps = this.results.filter(r => !r.success).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.executionTime, 0);
    
    const report = {
      timestamp: new Date().toISOString(),
      migrationSummary: {
        totalOperations: this.results.length,
        successfulOperations: successfulOps,
        failedOperations: failedOps,
        totalTimeMs: totalTime
      },
      detailedResults: this.results,
      databaseInfo: this.getDatabaseInfo(),
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../logs/migration-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  📝 Full report saved to: ${reportPath}`);
    
    // Display summary
    console.log('\n📈 Migration Summary:');
    console.log(`  Total Operations: ${this.results.length}`);
    console.log(`  Successful: ${successfulOps}`);
    console.log(`  Failed: ${failedOps}`);
    console.log(`  Total Time: ${totalTime}ms`);
    console.log(`  Success Rate: ${((successfulOps / this.results.length) * 100).toFixed(1)}%`);
  }

  private getDatabaseInfo(): any {
    const tableCount = this.db.prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).get() as {count: number};
    
    const indexCount = this.db.prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    ).get() as {count: number};
    
    return {
      tableCount: tableCount.count,
      indexCount: indexCount.count,
      fileName: path.basename(this.db.name)
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedOps = this.results.filter(r => !r.success);
    
    if (failedOps.length > 0) {
      recommendations.push('Review and address failed operations');
    }
    
    recommendations.push('Monitor query performance to validate improvements');
    recommendations.push('Consider implementing connection pooling for high-traffic scenarios');
    recommendations.push('Set up regular maintenance routines for cache cleanup');
    
    return recommendations;
  }
}

// Execute migration if run directly
if (require.main === module) {
  const dbPath = process.argv[2] || './data/spartan_hub.db';
  
  const migration = new DatabaseMigration(dbPath);
  migration.executeMigration().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export default DatabaseMigration;