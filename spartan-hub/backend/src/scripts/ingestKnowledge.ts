import dotenv from 'dotenv';
import path from 'path';
import { knowledgeService } from '../services/ai/knowledgeService';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function ingest() {
  console.log('📚 Starting Knowledge Ingestion...');
  console.log('-----------------------------------');

  try {
    const result = await knowledgeService.ingestDocuments();

    console.log('\n-----------------------------------');
    console.log('✅ Ingestion Complete');
    console.log(`   Processed: ${result.processed} documents`);
    console.log(`   Errors:    ${result.errors}`);

    if (result.processed > 0) {
      console.log('\n✨ Testing Search (sanity check)...');
      const testResults = await knowledgeService.search('training', 1);
      if (testResults.length > 0) {
        console.log('   Found relevant chunk for "training":');
        console.log(`   "${testResults[0].text.substring(0, 100)}..."`);
      } else {
        console.warn('   ⚠️ No chunks found for basic query. Check if PDFs text is extractable.');
      }
    }
  } catch (error) {
    console.error('❌ Ingestion Failed:', error);
  }
}

ingest().catch(console.error);
