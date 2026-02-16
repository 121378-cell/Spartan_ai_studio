
import { e2eManager } from '../__tests__/e2eTestManager';
import { logger } from '../utils/logger';

async function main() {
  try {
    logger.info('🧹 Resetting E2E Test Database...');
    await e2eManager.cleanDatabase();
    logger.info('✅ E2E Test Database reset complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to reset E2E Test Database', { context: 'reset-e2e', metadata: { error } });
    process.exit(1);
  }
}

main();
