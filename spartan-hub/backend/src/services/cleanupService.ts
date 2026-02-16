import { SessionModel } from '../models/Session';
import { RefreshTokenModel } from '../models/RefreshToken';
import { logger } from '../utils/logger';

// Automatic cleanup service for expired sessions and refresh tokens
export class CleanupService {
  private static instance: CleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  // Start automatic cleanup process
  public startCleanup(): void {
    if (this.cleanupInterval) {
      logger.info('Cleanup service already running');
      return;
    }

    logger.info('Starting automatic cleanup service...');
    
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 60 * 60 * 1000); // 1 hour

    // Run initial cleanup
    this.performCleanup();
  }

  // Stop automatic cleanup process
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Cleanup service stopped');
    }
  }

  // Perform cleanup of expired sessions and refresh tokens
  private async performCleanup(): Promise<void> {
    try {
      logger.info('Performing cleanup of expired sessions and tokens...');
      
      // Clean up expired sessions
      await SessionModel.cleanupExpiredSessions();
      
      // Clean up expired refresh tokens
      await RefreshTokenModel.cleanupExpired();
      
      logger.info('Cleanup completed successfully');
    } catch (error) {
      logger.error('Cleanup failed', { metadata: { error: String(error) } });
    }
  }

  // Manual cleanup trigger
  public async triggerCleanup(): Promise<void> {
    await this.performCleanup();
  }
}

// Export singleton instance
export const cleanupService = CleanupService.getInstance();
export default cleanupService;
