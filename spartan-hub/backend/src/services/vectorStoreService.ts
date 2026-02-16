/**
 * Vector Store Service - AI Microservice Proxy
 * 
 * Simplified version to avoid ONNX runtime crashes in Alpine.
 * Delegates all embedding work to the Python microservice.
 */

import { logger } from '../utils/logger';
import { QdrantClient } from '@qdrant/js-client-rest';

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

export class VectorStoreService {
  private static instance: VectorStoreService;
  private qdrantClient: QdrantClient | null = null;
  private qdrantConfig: QdrantConfig | null = null;
  private isConnected: boolean = false;
  private vectorDimension: number = 384; 

  private constructor() {}

  static getInstance(): VectorStoreService {
    if (!VectorStoreService.instance) {
      VectorStoreService.instance = new VectorStoreService();
    }
    return VectorStoreService.instance;
  }

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

      this.qdrantClient = new QdrantClient({
        url: `http://${this.qdrantConfig.host}:${this.qdrantConfig.port}`,
        apiKey: this.qdrantConfig.apiKey
      });

      logger.info('VectorStoreService initialized in Proxy Mode (AI Microservice)');
      await this.ensureCollection();
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to initialize VectorStoreService Proxy', { metadata: { error: String(error) } });
    }
  }

  private async ensureCollection(): Promise<void> {
    if (!this.qdrantClient || !this.qdrantConfig) return;
    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(c => c.name === this.qdrantConfig!.collectionName);
      if (!exists) {
        await this.qdrantClient.createCollection(this.qdrantConfig.collectionName, {
          vectors: { size: this.vectorDimension, distance: 'Cosine' }
        });
      }
    } catch (error) {
      logger.warn('Could not verify/create Qdrant collection');
    }
  }

  public async embedText(text: string): Promise<EmbeddingResult> {
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://ai_microservice:8000';
      const response = await fetch(`${aiServiceUrl}/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error(`AI Service error: ${response.status}`);

      const data = await response.json() as any;
      return {
        chunkId: '',
        vector: data.embedding,
        model: data.model || 'ai-microservice',
        tokenCount: data.tokens || Math.ceil(text.length / 4)
      };
    } catch (error) {
      logger.error('Embedding failed, using mock fallback', { metadata: { error: String(error) } });
      return {
        chunkId: '',
        vector: new Array(this.vectorDimension).fill(0),
        model: 'mock-fallback',
        tokenCount: 0
      };
    }
  }

  public async batchEmbed(items: Array<{ id: string; text: string }>): Promise<EmbeddingResult[]> {
    return Promise.all(items.map(async (item) => {
      const result = await this.embedText(item.text);
      return { ...result, chunkId: item.id };
    }));
  }

  public async getStats(): Promise<any> {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      provider: 'qdrant-proxy',
      vectorDimension: this.vectorDimension
    };
  }

  public cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }
    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  public async storeEmbedding(chunkId: string, vector: number[], metadata: any): Promise<void> {
    if (!this.qdrantClient || !this.qdrantConfig) return;
    await this.qdrantClient.upsert(this.qdrantConfig.collectionName, {
      points: [{ id: chunkId, vector, payload: metadata }]
    });
  }

  public async semanticSearch(query: string, topK: number = 5, threshold: number = 0.5): Promise<VectorSearchResult[]> {
    if (!this.qdrantClient || !this.qdrantConfig) return [];
    const embedding = await this.embedText(query);
    const results = await this.qdrantClient.search(this.qdrantConfig.collectionName, {
      vector: embedding.vector,
      limit: topK,
      with_payload: true,
      score_threshold: threshold
    });

    return results.map(r => ({
      chunkId: String(r.id),
      documentId: String(r.payload?.documentId || ''),
      documentTitle: String(r.payload?.documentTitle || ''),
      similarity: r.score,
      content: String(r.payload?.content || ''),
      metadata: {
        pageNumber: Number(r.payload?.pageNumber),
        sectionTitle: String(r.payload?.sectionTitle || ''),
        wordCount: Number(r.payload?.wordCount || 0)
      }
    }));
  }
}

export const getVectorStoreService = () => VectorStoreService.getInstance();
export default VectorStoreService;
