import dotenv from 'dotenv';
import path from 'path';
import { googleFitService } from '../services/googleFitService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testAuthUrl() {
  console.log('Testing Google Fit Auth URL Generation...');

  const userId = 'test-user-id';
  try {
    const url = googleFitService.getAuthUrl(userId);
    console.log('✅ Auth URL Generated Successfully:');
    console.log(url);

    if (url.includes('client_id=PLACEHOLDER')) {
      console.warn('⚠️ WARNING: using PLACEHOLDER_CLIENT_ID. Please update .env');
    }
  } catch (error) {
    console.error('❌ Failed to generate Auth URL:', error);
  }
}

testAuthUrl();
