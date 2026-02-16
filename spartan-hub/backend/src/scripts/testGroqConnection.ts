import dotenv from 'dotenv';
import path from 'path';
import { GroqProvider } from '../services/ai/providers/GroqProvider';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testGroqConnection() {
  console.log('Testing Groq API Connection...');
  console.log('--------------------------------');

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: GROQ_API_KEY is not set in .env file');
    process.exit(1);
  }

  console.log(`API Key found: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);

  const provider = new GroqProvider();

  console.log('\n1. Checking Health...');
  try {
    const isHealthy = await provider.checkHealth();
    if (isHealthy) {
      console.log('✅ Health Check Passed');
    } else {
      console.error('❌ Health Check Failed');
    }
  } catch (error) {
    console.error('❌ Health Check Error:', error);
  }

  console.log('\n2. Testing Simple Prediction...');
  try {
    // Mock user profile for test
    const mockProfile: any = {
      id: 'test-user',
      name: 'Test',
      stats: { currentStreak: 5, totalWorkouts: 10 }
    };

    // We can't easily mock the full prediction without a real response structure,
    // but we can check if it throws or returns a valid fallback structure
    const result = await provider.predictAlert(mockProfile);

    console.log('Result received:', JSON.stringify(result, null, 2));

    if (result.error) {
      if (result.fallback_used) {
        console.warn('⚠️ Request failed but fallback handled it. (Check API Key validity or Quota)');
      } else {
        console.error('❌ Request Failed:', result.error);
      }
    } else {
      console.log('✅ Prediction Request Successful');
    }

  } catch (error) {
    console.error('❌ Prediction Error:', error);
  }
}

testGroqConnection().catch(console.error);
