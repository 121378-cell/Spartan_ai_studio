"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseBackup = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const zlib_1 = __importDefault(require("zlib"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../src/utils/logger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
dotenv_1.default.config();
const usePostgres = process.env.DATABASE_TYPE === 'postgres';
let dbPath = '';
if (!usePostgres) {
    const dbDir = path_1.default.join(process.cwd(), 'data');
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path_1.default.join(dbDir, 'spartan.db');
    if (!fs_1.default.existsSync(dbPath)) {
        const altDbPath1 = path_1.default.join(process.cwd(), '..', 'data', 'spartan.db');
        const altDbPath2 = path_1.default.join(__dirname, '..', '..', 'data', 'spartan.db');
        if (fs_1.default.existsSync(altDbPath1)) {
            dbPath = altDbPath1;
        }
        else if (fs_1.default.existsSync(altDbPath2)) {
            dbPath = altDbPath2;
        }
        else {
            logger_1.logger.info('Creating new database at: ' + dbPath, { context: 'backup' });
        }
    }
}
class DatabaseBackup {
    config;
    usePostgres;
    constructor() {
        this.config = {
            retention: {
                daily: parseInt(process.env.BACKUP_RETENTION_DAILY || '7', 10),
                weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY || '4', 10),
                monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY || '12', 10),
            },
            backupDir: process.env.BACKUP_DIR || path_1.default.join(__dirname, '../../../backups'),
            compress: process.env.BACKUP_COMPRESS !== 'false',
        };
        this.usePostgres = process.env.DATABASE_TYPE === 'postgres';
        if (!fs_1.default.existsSync(this.config.backupDir)) {
            fs_1.default.mkdirSync(this.config.backupDir, { recursive: true });
            logger_1.logger.info(`Created backup directory: ${this.config.backupDir}`);
        }
    }
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup_${this.usePostgres ? 'postgres' : 'sqlite'}_${timestamp}.db${this.config.compress ? '.gz' : ''}`;
        const backupPath = path_1.default.join(this.config.backupDir, fileName);
        try {
            if (this.usePostgres) {
                await this.createPostgresBackup(backupPath);
            }
            else {
                await this.createSqliteBackup(backupPath);
            }
            const isVerified = await this.verifyBackup(backupPath);
            if (!isVerified) {
                throw new Error(`Backup verification failed for: ${backupPath}`);
            }
            logger_1.logger.info('Database backup completed successfully', {
                context: 'backup',
                metadata: {
                    backupPath,
                    databaseType: this.usePostgres ? 'PostgreSQL' : 'SQLite',
                    timestamp
                }
            });
            await this.applyRetentionPolicy();
            return backupPath;
        }
        catch (error) {
            logger_1.logger.error('Database backup failed', {
                context: 'backup',
                metadata: {
                    error: error instanceof Error ? error.message : String(error),
                    backupPath
                }
            });
            throw error;
        }
    }
    async createSqliteBackup(backupPath) {
        let sqliteDb;
        try {
            if (!fs_1.default.existsSync(dbPath)) {
                throw new Error(`Database file does not exist: ${dbPath}`);
            }
            sqliteDb = new better_sqlite3_1.default(dbPath, {
                readonly: true,
            });
        }
        catch (error) {
            throw new Error(`Failed to open database for backup: ${error instanceof Error ? error.message : String(error)}`);
        }
        try {
            if (this.config.compress) {
                const tempPath = backupPath.replace('.gz', '');
                await sqliteDb.backup(tempPath);
                if (!fs_1.default.existsSync(tempPath)) {
                    throw new Error(`Backup file was not created at: ${tempPath}`);
                }
                const data = fs_1.default.readFileSync(tempPath);
                const compressedData = await gzip(data);
                fs_1.default.writeFileSync(backupPath, compressedData);
                fs_1.default.unlinkSync(tempPath);
            }
            else {
                await sqliteDb.backup(backupPath);
            }
        }
        finally {
            sqliteDb.close();
        }
    }
    async createPostgresBackup(backupPath) {
        const pgHost = process.env.PGHOST || 'localhost';
        const pgPort = process.env.PGPORT || '5432';
        const pgDatabase = process.env.PGDATABASE || 'spartan_fitness';
        const pgUser = process.env.PGUSER || 'spartan_user';
        const pgPassword = process.env.PGPASSWORD || '';
        if (!pgPassword) {
            throw new Error('PGPASSWORD environment variable is required for PostgreSQL backup');
        }
        const pgDumpCmd = `pg_dump -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDatabase} -f "${backupPath.replace('.gz', '')}"`;
        const env = { ...process.env, PGPASSWORD: pgPassword };
        if (this.config.compress) {
            const tempPath = backupPath.replace('.gz', '');
            await execAsync(pgDumpCmd, { env });
            const data = fs_1.default.readFileSync(tempPath);
            const compressedData = await gzip(data);
            fs_1.default.writeFileSync(backupPath, compressedData);
            fs_1.default.unlinkSync(tempPath);
        }
        else {
            await execAsync(pgDumpCmd, { env });
        }
    }
    async verifyBackup(backupPath) {
        try {
            if (this.usePostgres) {
                const backupContent = fs_1.default.readFileSync(backupPath.replace('.gz', this.config.compress ? '.sql' : ''), 'utf8');
                return backupContent.includes('SET') || backupContent.includes('CREATE') || backupContent.includes('INSERT');
            }
            else {
                let checkPath = backupPath;
                if (this.config.compress) {
                    const tempPath = backupPath.replace('.gz', '');
                    const compressedData = fs_1.default.readFileSync(backupPath);
                    const decompressedData = await gunzip(compressedData);
                    fs_1.default.writeFileSync(tempPath, decompressedData);
                    const backupDb = new better_sqlite3_1.default(tempPath);
                    backupDb.prepare('SELECT 1').run();
                    backupDb.close();
                    fs_1.default.unlinkSync(tempPath);
                }
                else {
                    const backupDb = new better_sqlite3_1.default(checkPath);
                    backupDb.prepare('SELECT 1').run();
                    backupDb.close();
                }
                return true;
            }
        }
        catch (error) {
            logger_1.logger.error('Backup verification failed', {
                context: 'backup',
                metadata: {
                    error: error instanceof Error ? error.message : String(error),
                    backupPath
                }
            });
            return false;
        }
    }
    async applyRetentionPolicy() {
        try {
            const files = fs_1.default.readdirSync(this.config.backupDir)
                .filter(file => file.startsWith('backup_') && (file.endsWith('.db') || file.endsWith('.db.gz') || file.endsWith('.sql') || file.endsWith('.sql.gz')))
                .map(file => {
                const filePath = path_1.default.join(this.config.backupDir, file);
                const stat = fs_1.default.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    birthTime: stat.birthtime,
                    mtime: stat.mtime
                };
            })
                .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            const now = new Date();
            const dailyBackups = [];
            const weeklyBackups = [];
            const monthlyBackups = [];
            files.forEach(file => {
                const fileDate = new Date(file.mtime);
                const daysDiff = Math.floor((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff < this.config.retention.monthly * 30) {
                    const monthKey = `${fileDate.getFullYear()}-${fileDate.getMonth()}`;
                    const existingMonthly = monthlyBackups.find(b => {
                        const bDate = new Date(b.mtime);
                        return `${bDate.getFullYear()}-${bDate.getMonth()}` === monthKey;
                    });
                    if (!existingMonthly) {
                        monthlyBackups.push(file);
                    }
                }
                if (daysDiff < this.config.retention.weekly * 7) {
                    const weekNumber = Math.floor(fileDate.getTime() / (1000 * 60 * 60 * 24 * 7));
                    const existingWeekly = weeklyBackups.find(b => {
                        const bDate = new Date(b.mtime);
                        return Math.floor(bDate.getTime() / (1000 * 60 * 60 * 24 * 7)) === weekNumber;
                    });
                    if (!existingWeekly) {
                        weeklyBackups.push(file);
                    }
                }
                if (daysDiff < this.config.retention.daily) {
                    dailyBackups.push(file);
                }
            });
            const filesToKeep = new Set([
                ...dailyBackups.map(f => f.name),
                ...weeklyBackups.map(f => f.name),
                ...monthlyBackups.map(f => f.name)
            ]);
            const filesToDelete = files.filter(f => !filesToKeep.has(f.name));
            for (const file of filesToDelete) {
                fs_1.default.unlinkSync(file.path);
                logger_1.logger.info(`Deleted old backup: ${file.name}`, {
                    context: 'backup-retention'
                });
            }
            logger_1.logger.info('Backup retention policy applied', {
                context: 'backup-retention',
                metadata: {
                    totalBackups: files.length,
                    backupsDeleted: filesToDelete.length,
                    retention: this.config.retention
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to apply retention policy', {
                context: 'backup-retention',
                metadata: {
                    error: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }
    async getBackupStatus() {
        try {
            const files = fs_1.default.readdirSync(this.config.backupDir)
                .filter(file => file.startsWith('backup_') && (file.endsWith('.db') || file.endsWith('.db.gz') || file.endsWith('.sql') || file.endsWith('.sql.gz')))
                .map(file => {
                const filePath = path_1.default.join(this.config.backupDir, file);
                const stat = fs_1.default.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stat.size,
                    createdAt: stat.birthtime,
                    modifiedAt: stat.mtime
                };
            })
                .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
            return {
                totalBackups: files.length,
                latestBackup: files[0] || null,
                backups: files,
                retention: this.config.retention,
                backupDir: this.config.backupDir
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get backup status', {
                context: 'backup-status',
                metadata: {
                    error: error instanceof Error ? error.message : String(error)
                }
            });
            return null;
        }
    }
}
exports.DatabaseBackup = DatabaseBackup;
//# sourceMappingURL=databaseBackup.js.map