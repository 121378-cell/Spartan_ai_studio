/**
 * Vector Store Service - Real Embedding and Qdrant Search
 *
 * Handles:
 * - Local embedding generation using Transformers.js
 * - Real vector storage in Qdrant
 * - Semantic similarity search
 */

import { logger } from '../utils/logger';
import { QdrantClient } from '@qdrant/js-client-rest';
// @ts-ignore
import { pipeline } from '@xenova/transformers';

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  similarity: number;
  content: string;
  metadata: {
    pageNumber?: number;
    sectionTitle?: string;
    wordCount: number;
  };
}

export interface EmbeddingResult {
  chunkId: string;
  vector: number[];
  model: string;
  tokenCount: number;
}

interface QdrantConfig {
  host: string;
  port: number;
  apiKey?: string;
  collectionName: string;
}

/**
 * Vector Store Service Class
 */
export class VectorStoreService {
  private static instance: VectorStoreService;
  private qdrantClient: QdrantClient | null = null;
  private qdrantConfig: QdrantConfig | null = null;
  private extractor: any = null;
  private vectorDimension: number = 384; // Dimension for all-MiniLM-L6-v2
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): VectorStoreService {
    if (!VectorStoreService.instance) {
      VectorStoreService.instance = new VectorStoreService();
    }
    return VectorStoreService.instance;
  }

  /**
   * Initialize Vector Store Service with local model
   */
  public async initialize(config: {
    qdrantHost?: string;
    qdrantPort?: number;
    qdrantApiKey?: string;
  }): Promise<void> {
    try {
      this.qdrantConfig = {
        host: config.qdrantHost || 'localhost',
        port: config.qdrantPort || 6333,
        apiKey: config.qdrantApiKey,
        collectionName: 'spartan-hub-knowledge'
      };

      // Initialize Qdrant Client
      this.qdrantClient = new QdrantClient({
        url: `http://${this.qdrantConfig.host}:${this.qdrantConfig.port}`,
        apiKey: this.qdrantConfig.apiKey
      });

      // Load local embedding model
      logger.info('VectorStoreService: Loading local embedding model (all-MiniLM-L6-v2)...');
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      
      // Ensure collection exists
      await this.ensureCollection();
      
      this.isConnected = true;
      logger.info('VectorStoreService initialized with local embeddings and real Qdrant connection');
    } catch (error) {
      logger.error('Failed to initialize VectorStoreService', {
        context: 'rag.vectors',
        metadata: { error: String(error) }
      });
      // Fallback mode or rethrow depending on needs
    }
  }

  private async ensureCollection(): Promise<void> {
    if (!this.qdrantClient || !this.qdrantConfig) return;

    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(c => c.name === this.qdrantConfig!.collectionName);

      if (!exists) {
        logger.info(`Creating Qdrant collection: ${this.qdrantConfig.collectionName}`);
        await this.qdrantClient.createCollection(this.qdrantConfig.collectionName, {
          vectors: {
            size: this.vectorDimension,
            distance: 'Cosine'
          }
        });
      }
    } catch (error) {
      logger.warn('Could not verify/create Qdrant collection', { metadata: { error: String(error) } });
    }
  }

  /**
   * Generate REAL local embedding for text
   */
  public async embedText(text: string): Promise<EmbeddingResult> {
    try {
      if (!this.extractor) {
        throw new Error('Embedding model not initialized');
      }

      const output = await this.extractor(text, { pooling: 'mean', normalize: true });
      const vector = Array.from(output.data) as number[];

      return {
        chunkId: '',
        vector,
        model: 'Xenova/all-MiniLM-L6-v2',
        tokenCount: Math.ceil(text.length / 4)
      };
    } catch (error) {
      logger.error('Failed to embed text', { metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Store REAL embedding in Qdrant
   */
  public async storeEmbedding(
    chunkId: string,
    vector: number[],
    metadata: {
      documentId: string;
      documentTitle: string;
      content: string;
      pageNumber?: number;
      sectionTitle?: string;
      wordCount: number;
    }
  ): Promise<void> {
    try {
      if (!this.qdrantClient || !this.qdrantConfig) {
        throw new Error('Qdrant not connected');
      }

      await this.qdrantClient.upsert(this.qdrantConfig.collectionName, {
        points: [
          {
            id: chunkId,
            vector,
            payload: metadata
          }
        ]
      });
    } catch (error) {
      logger.error('Failed to store embedding in Qdrant', { metadata: { error: String(error), chunkId } });
      throw error;
    }
  }

  /**
   * REAL Semantic search in Qdrant
   */
  public async semanticSearch(
    query: string,
    topK: number = 5,
    minSimilarity: number = 0.6
  ): Promise<VectorSearchResult[]> {
    try {
      if (!this.isConnected || !this.qdrantClient || !this.qdrantConfig) {
        logger.warn('Qdrant not connected, returning empty results');
        return [];
      }

      const queryEmbedding = await this.embedText(query);

      const results = await this.qdrantClient.search(this.qdrantConfig.collectionName, {
        vector: queryEmbedding.vector,
        limit: topK,
        score_threshold: minSimilarity,
        with_payload: true
      });

      return results.map(hit => ({
        chunkId: String(hit.id),
        documentId: String(hit.payload?.documentId || ''),
        documentTitle: String(hit.payload?.documentTitle || ''),
        similarity: hit.score,
        content: String(hit.payload?.content || ''),
        metadata: {
          pageNumber: hit.payload?.pageNumber as number,
          sectionTitle: hit.payload?.sectionTitle as string,
          wordCount: hit.payload?.wordCount as number
        }
      }));
    } catch (error) {
      logger.error('Semantic search failed', { metadata: { error: String(error), query } });
      return [];
    }
  }

  /**
   * Get vector store statistics
   */
  public async getStats(): Promise<{
    collectionName: string;
    pointCount: number;
    vectorDimension: number;
  }> {
    try {
      if (!this.qdrantClient || !this.qdrantConfig) {
        throw new Error('Qdrant not connected');
      }

      const collectionInfo = await this.qdrantClient.getCollection(this.qdrantConfig.collectionName);
      
      return {
        collectionName: this.qdrantConfig.collectionName,
        pointCount: collectionInfo.points_count || 0,
        vectorDimension: this.vectorDimension
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get vector store stats', {
        context: 'rag.vectors',
        metadata: { error: message }
      });
      throw error;
    }
  }

  /**
   * Delete embedding
   */
  public async deleteEmbedding(chunkId: string): Promise<void> {
    if (!this.qdrantClient || !this.qdrantConfig) return;
    await this.qdrantClient.delete(this.qdrantConfig.collectionName, {
      points: [chunkId]
    });
  }

  /**
   * Calculate similarity (utility)
   */
  public cosineSimilarity(vector1: number[], vector2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

export function getVectorStoreService(): VectorStoreService {
  return VectorStoreService.getInstance();
}
