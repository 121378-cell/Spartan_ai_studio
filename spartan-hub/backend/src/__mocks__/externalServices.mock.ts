/**
 * Mocks para Servicios Externos
 * Redis, ML, Qdrant, y otros servicios externos
 */

// ==================== Redis Mock ====================

interface CacheEntry {
  value: string;
  expiry?: number;
}

class MockRedisClient {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiry: expirySeconds ? Date.now() + (expirySeconds * 1000) : undefined
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async flushall(): Promise<void> {
    this.store.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Array.from(this.store.keys()).filter(k => regex.test(k));
  }

  // Test helpers
  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const mockRedisClient = new MockRedisClient();

// ==================== ML Services Mock ====================

interface MLPrediction {
  value: number;
  confidence: number;
  recommendations: string[];
}

export const mockMLForecastingService = {
  predictPerformance: async (): Promise<MLPrediction> => ({
    value: 85,
    confidence: 0.92,
    recommendations: ['Increase volume by 10%', 'Add recovery days']
  }),

  predictInjuryRisk: async (): Promise<MLPrediction> => ({
    value: 0.15,
    confidence: 0.88,
    recommendations: ['Reduce intensity', 'Focus on form']
  }),

  predictRecoveryTime: async (): Promise<MLPrediction> => ({
    value: 48,
    confidence: 0.85,
    recommendations: ['Adequate sleep', 'Hydration']
  })
};

export const mockInjuryPredictionService = {
  analyzeForm: async () => ({
    riskScore: 0.2,
    riskLevel: 'low',
    factors: ['good_form', 'adequate_rest'],
    recommendations: ['Maintain current form']
  }),

  predictOvertraining: async () => ({
    riskScore: 0.3,
    warning: false,
    metrics: { hrv: 45, restingHR: 62 }
  })
};

// ==================== Qdrant Vector Store Mock ====================

interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

class MockQdrantClient {
  private collections = new Map<string, VectorPoint[]>();

  async createCollection(name: string): Promise<void> {
    if (!this.collections.has(name)) {
      this.collections.set(name, []);
    }
  }

  async upsert(collection: string, points: VectorPoint[]): Promise<void> {
    if (!this.collections.has(collection)) {
      await this.createCollection(collection);
    }
    
    const existing = this.collections.get(collection)!;
    
    for (const point of points) {
      const idx = existing.findIndex(p => p.id === point.id);
      if (idx >= 0) {
        existing[idx] = point;
      } else {
        existing.push(point);
      }
    }
  }

  async search(
    collection: string,
    vector: number[],
    limit: number = 10
  ): Promise<Array<{ id: string; score: number; payload: Record<string, unknown> }>> {
    const points = this.collections.get(collection) || [];
    
    // Simple cosine similarity (mock)
    return points.slice(0, limit).map(p => ({
      id: p.id,
      score: 0.85, // Mock score
      payload: p.payload
    }));
  }

  async delete(collection: string, ids: string[]): Promise<void> {
    const points = this.collections.get(collection);
    if (points) {
      const filtered = points.filter(p => !ids.includes(p.id));
      this.collections.set(collection, filtered);
    }
  }

  async getCollectionInfo(collection: string): Promise<{ vectors_count: number }> {
    const points = this.collections.get(collection) || [];
    return { vectors_count: points.length };
  }

  // Test helpers
  clear(): void {
    this.collections.clear();
  }

  getCollection(name: string): VectorPoint[] {
    return this.collections.get(name) || [];
  }
}

export const mockQdrantClient = new MockQdrantClient();

// ==================== Knowledge Base Mock ====================

export const mockKnowledgeBaseService = {
  populateFromDocument: async () => ({
    success: true,
    chunksProcessed: 25,
    vectorsInserted: 25,
    cost: 0.05
  }),

  search: async () => [
    {
      content: 'Sample knowledge base entry',
      source: 'test-document.pdf',
      score: 0.92,
      citations: ['Page 1', 'Page 2']
    }
  ],

  getStatistics: async () => ({
    totalDocuments: 10,
    totalChunks: 250,
    totalVectors: 250,
    lastUpdated: new Date().toISOString()
  })
};

// ==================== Reset All Mocks ====================

export function resetAllExternalMocks(): void {
  mockRedisClient.clear();
  mockQdrantClient.clear();
}

export default {
  redis: mockRedisClient,
  mlForecasting: mockMLForecastingService,
  injuryPrediction: mockInjuryPredictionService,
  qdrant: mockQdrantClient,
  knowledgeBase: mockKnowledgeBaseService,
  resetAll: resetAllExternalMocks
};
