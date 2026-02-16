
import { e2eManager } from '../__tests__/e2eTestManager';
import { logger } from '../utils/logger';

async function main() {
  try {
    logger.info('🚀 Setting up E2E Test Database...');
    await e2eManager.setupDatabase();
    
    // Clean any existing data to start fresh
    await e2eManager.cleanDatabase();
    
    logger.info('✅ E2E Test Database setup complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to setup E2E Test Database', { context: 'setup-e2e', metadata: { error } });
    process.exit(1);
  }
}

main();
