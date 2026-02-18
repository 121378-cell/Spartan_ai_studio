import { getVectorStoreService } from '../services/vectorStoreService';
import { SemanticSearchService } from '../services/semanticSearchService';

async function verifyRAG() {
  console.log('🚀 Starting RAG Optimization Verification...');
    
  const vectorStore = getVectorStoreService();
  const searchService = new SemanticSearchService();

  try {
    // 1. Test Real Embedding Generation
    console.log('\n--- Step 1: Testing Local Embedding Generation ---');
    console.log('Loading model (this may take a few seconds the first time)...');
        
    await vectorStore.initialize({
      qdrantHost: 'localhost',
      qdrantPort: 6333
    });

    const testText = 'The importance of progressive overload in strength training for long-term hypertrophy.';
    const startTime = Date.now();
    const embedding = await vectorStore.embedText(testText);
    const duration = Date.now() - startTime;

    console.log('✅ Embedding generated successfully!');
    console.log(`   Dimensions: ${embedding.vector.length}`);
    console.log(`   Model: ${embedding.model}`);
    console.log(`   Time: ${duration}ms`);
    console.log(`   Vector sample (first 5): [${embedding.vector.slice(0, 5).join(', ')}...]`);

    // 2. Test Qdrant Connection
    console.log('\n--- Step 2: Testing Qdrant Connection ---');
    try {
      const stats = await vectorStore.getStats();
      console.log(`✅ Qdrant connection active! Collection: ${stats.collectionName}`);
    } catch (e) {
      console.log('⚠️ Qdrant service not reachable (make sure Docker is running).');
      console.log('   Note: Real embeddings still work offline.');
    }

    // 3. Test Hybrid Logic
    console.log('\n--- Step 3: Verifying Hybrid Search Logic ---');
        
    const results = await searchService.keywordSearch('strength', 1);
    console.log(`✅ SQLite Keyword Search path verified. Found: ${results.length} results.`);

    console.log('\n✨ Verification Complete!');
        
  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
  }
}

verifyRAG();
