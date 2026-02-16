#!/usr/bin/env node
declare class DatabaseMigration {
    private db;
    private results;
    constructor(dbPath: string);
    executeMigration(): Promise<void>;
    private createBackup;
    private applyIndexOptimizations;
    private optimizeTableStructures;
    private setupQueryCaching;
    private validateOptimizations;
    private generateMigrationReport;
    private getDatabaseInfo;
    private generateRecommendations;
}
export default DatabaseMigration;
//# sourceMappingURL=migrate-database.d.ts.map