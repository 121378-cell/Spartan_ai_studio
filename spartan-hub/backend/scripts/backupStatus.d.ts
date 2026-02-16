export declare class BackupStatus {
    private databaseBackup;
    constructor();
    getBackupStatus(): Promise<any>;
    isBackupHealthy(): Promise<boolean>;
    generateReport(): Promise<string>;
}
//# sourceMappingURL=backupStatus.d.ts.map