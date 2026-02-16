#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class DatabaseMigration {
    db;
    results = [];
    constructor(dbPath) {
        const dbDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        console.log(`📁 Connected to database: ${dbPath}`);
    }
    async executeMigration() {
        console.log('🚀 Starting Phase 3 Week 5 Database Migration\n');
        try {
            await this.createBackup();
            await this.applyIndexOptimizations();
            await this.optimizeTableStructures();
            await this.setupQueryCaching();
            await this.validateOptimizations();
            await this.generateMigrationReport();
            console.log('\n✅ Database migration completed successfully!');
        }
        catch (error) {
            console.error('\n❌ Migration failed:', error.message);
            throw error;
        }
    }
    async createBackup() {
        const startTime = Date.now();
        console.log('💾 Creating database backup...');
        try {
            const backupPath = this.db.name.replace('.db', '_backup_pre_migration.db');
            this.db.exec(`VACUUM INTO '${backupPath}'`);
            const executionTime = Date.now() - startTime;
            this.results.push({
                success: true,
                message: `Database backed up to ${backupPath}`,
                executionTime
            });
            console.log(`  ✅ Backup created: ${backupPath}`);
        }
        catch (error) {
            console.log('  ⚠️  Using fallback backup method...');
            const backupPath = this.db.name.replace('.db', '_backup_fallback.db');
            const sourcePath = this.db.name;
            fs_1.default.copyFileSync(sourcePath, backupPath);
            const executionTime = Date.now() - startTime;
            this.results.push({
                success: true,
                message: `Database backed up using fallback method to ${backupPath}`,
                executionTime
            });
            console.log(`  ✅ Fallback backup created: ${backupPath}`);
        }
    }
    async applyIndexOptimizations() {
        console.log('\n📊 Applying index optimizations...');
        const indexPath = path_1.default.join(__dirname, '../scripts/create-indexes.sql');
        const indexScript = fs_1.default.readFileSync(indexPath, 'utf8');
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
            }
            catch (error) {
                const executionTime = Date.now() - startTime;
                this.results.push({
                    success: false,
                    message: `Failed to create index: ${error.message}`,
                    executionTime
                });
                if (!error.message.includes('already exists')) {
                    console.error(`  ❌ ${error.message}`);
                    errorCount++;
                }
                else {
                    console.log(`  ⚠️  Index already exists`);
                }
            }
        }
        console.log(`\n📈 Index optimization summary:`);
        console.log(`  Successful: ${successCount}`);
        console.log(`  Errors: ${errorCount}`);
    }
    async optimizeTableStructures() {
        console.log('\n🔧 Optimizing table structures...');
        const optimizations = [
            `CREATE INDEX IF NOT EXISTS idx_exercises_workout_id ON exercises(workout_id)`,
            `CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id)`,
            `CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_id ON workout_logs(workout_id)`,
            `CREATE INDEX IF NOT EXISTS idx_users_status_email ON users(status, email)`,
            `CREATE INDEX IF NOT EXISTS idx_users_created_status ON users(created_at, status)`,
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
            }
            catch (error) {
                const executionTime = Date.now() - startTime;
                if (error.message.includes('duplicate column') ||
                    error.message.includes('already exists')) {
                    console.log(`  ⚠️  Already exists, skipping`);
                    successCount++;
                }
                else {
                    this.results.push({
                        success: false,
                        message: `Failed optimization: ${error.message}`,
                        executionTime
                    });
                    console.error(`  ❌ ${error.message}`);
                }
            }
        }
        console.log(`\n📈 Table optimization summary:`);
        console.log(`  Successful: ${successCount}/${optimizations.length}`);
    }
    async setupQueryCaching() {
        console.log('\nキャッシング Setting up query caching...');
        const cacheSetup = [
            `CREATE TABLE IF NOT EXISTS query_cache (
        cache_key TEXT PRIMARY KEY,
        cache_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        hit_count INTEGER DEFAULT 0
      )`,
            `CREATE INDEX IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at)`,
            `CREATE INDEX IF NOT EXISTS idx_query_cache_created ON query_cache(created_at)`,
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
            }
            catch (error) {
                const executionTime = Date.now() - startTime;
                this.results.push({
                    success: false,
                    message: `Cache setup failed: ${error.message}`,
                    executionTime
                });
                console.error(`  ❌ ${error.message}`);
            }
        }
    }
    async validateOptimizations() {
        console.log('\n🔍 Validating optimizations...');
        const indexCount = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").get();
        console.log(`  📊 Total indexes: ${indexCount.count}`);
        const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
        console.log(`  📊 Tables with optimizations: ${tables.length}`);
        const testQueries = [
            'SELECT * FROM users WHERE email = ? LIMIT 1',
            'SELECT COUNT(*) FROM workouts WHERE user_id = ?',
            'SELECT * FROM exercises WHERE workout_id = ? LIMIT 10'
        ];
        console.log('\n  ⚡ Performance tests:');
        for (const query of testQueries) {
            const startTime = Date.now();
            try {
                this.db.prepare(query).all(1);
                const executionTime = Date.now() - startTime;
                console.log(`    ${executionTime}ms - ${query.substring(0, 40)}...`);
            }
            catch (error) {
                console.log(`    ERROR - ${error.message}`);
            }
        }
        this.results.push({
            success: true,
            message: `Validation completed - ${indexCount.count} indexes, ${tables.length} tables`,
            executionTime: 0
        });
    }
    async generateMigrationReport() {
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
        const reportPath = path_1.default.join(__dirname, '../logs/migration-report.json');
        const reportDir = path_1.default.dirname(reportPath);
        if (!fs_1.default.existsSync(reportDir)) {
            fs_1.default.mkdirSync(reportDir, { recursive: true });
        }
        fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`  📝 Full report saved to: ${reportPath}`);
        console.log('\n📈 Migration Summary:');
        console.log(`  Total Operations: ${this.results.length}`);
        console.log(`  Successful: ${successfulOps}`);
        console.log(`  Failed: ${failedOps}`);
        console.log(`  Total Time: ${totalTime}ms`);
        console.log(`  Success Rate: ${((successfulOps / this.results.length) * 100).toFixed(1)}%`);
    }
    getDatabaseInfo() {
        const tableCount = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get();
        const indexCount = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").get();
        return {
            tableCount: tableCount.count,
            indexCount: indexCount.count,
            fileName: path_1.default.basename(this.db.name)
        };
    }
    generateRecommendations() {
        const recommendations = [];
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
if (require.main === module) {
    const dbPath = process.argv[2] || './data/spartan_hub.db';
    const migration = new DatabaseMigration(dbPath);
    migration.executeMigration().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}
exports.default = DatabaseMigration;
//# sourceMappingURL=migrate-database.js.map