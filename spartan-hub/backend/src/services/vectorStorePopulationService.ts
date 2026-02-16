/**
 * Vector Store Population Service - Real Document Indexing
 * 
 * Orchestrates the process of:
 * 1. Chunking documents from SQLite
 * 2. Generating real embeddings using local Transformers.js
 * 3. Upserting to Qdrant using the official client
 */

import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { getVectorStoreService, VectorStoreService } from './vectorStoreService';

export class VectorStorePopulationService {
  private db: any;
  private vectorStore: VectorStoreService;

  constructor() {
    this.db = getDatabase();
    this.vectorStore = getVectorStoreService();
  }

  /**
   * Main entry point to re-index all knowledge base documents
   */
  async populateAll(): Promise<{ total: number; successful: number; failed: number }> {
    const startTime = Date.now();
    let total = 0;
    let successful = 0;
    let failed = 0;

    try {
      // 1. Fetch all chunks from SQLite
      const chunks = this.db.prepare(`
        SELECT c.*, b.title as bookTitle 
        FROM kb_chunks c
        JOIN kb_books b ON c.bookId = b.id
      `).all() as any[];

      total = chunks.length;
      logger.info(`Starting population of ${total} chunks...`);

      // 2. Process in small batches to manage memory
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        try {
          await Promise.all(batch.map(async (chunk) => {
            const embedding = await this.vectorStore.embedText(chunk.content);
            await this.vectorStore.storeEmbedding(chunk.id, embedding.vector, {
              documentId: chunk.bookId,
              documentTitle: chunk.bookTitle,
              content: chunk.content,
              pageNumber: chunk.pageNumber,
              sectionTitle: chunk.chapterTitle,
              wordCount: chunk.content.split(' ').length
            });
            successful++;
          }));

          logger.info(`Progress: ${successful}/${total} chunks indexed`);
        } catch (batchError) {
          logger.error('Batch indexing failed', { metadata: { error: String(batchError) } });
          failed += batch.length;
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      logger.info('Vector store population complete', {
        metadata: { total, successful, failed, durationSeconds: duration }
      });

      return { total, successful, failed };
    } catch (error) {
      logger.error('Population service failed', { metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Clear the collection and start fresh
   */
  async resetAndPopulate(): Promise<void> {
    // Logic to drop and recreate collection would go here via vectorStore
    await this.populateAll();
  }
}

export const vectorStorePopulationService = new VectorStorePopulationService();
