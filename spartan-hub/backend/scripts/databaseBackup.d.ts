export declare class DatabaseBackup {
    private config;
    private usePostgres;
    constructor();
    createBackup(): Promise<string>;
    private createSqliteBackup;
    private createPostgresBackup;
    private verifyBackup;
    private applyRetentionPolicy;
    getBackupStatus(): Promise<any>;
}
//# sourceMappingURL=databaseBackup.d.ts.map