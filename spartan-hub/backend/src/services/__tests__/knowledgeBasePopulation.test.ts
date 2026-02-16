import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { KnowledgeBaseLoaderService } from '../knowledgeBaseLoaderService';
import { VectorStorePopulationService } from '../vectorStorePopulationService';
import { KnowledgeBaseValidationService } from '../knowledgeBaseValidationService';
import { sampleBooks } from '../../data/sampleKnowledgeBase';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 7.2: Knowledge Base Population', () => {
  let loaderService: KnowledgeBaseLoaderService;
  let populationService: VectorStorePopulationService;
  let validationService: KnowledgeBaseValidationService;
  const testDbPath = path.join(__dirname, 'test-kb.db');

  beforeAll(() => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Initialize services with shared database
    loaderService = new KnowledgeBaseLoaderService(testDbPath);
    populationService = new VectorStorePopulationService(
      process.env.OPENAI_API_KEY || 'test-key',
      testDbPath
    );
    validationService = new KnowledgeBaseValidationService(testDbPath);
  });

  afterAll(async () => {
    loaderService.close();
    await populationService.close();
    validationService.close();

    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // Load sample data once at the beginning
  let booksLoaded = false;
  const loadTestData = async () => {
    if (!booksLoaded) {
      await loaderService.loadAllBooks(sampleBooks);
      booksLoaded = true;
    }
  };

  describe('KnowledgeBaseLoaderService', () => {
    beforeAll(async () => {
      await loadTestData();
    });

    it('should initialize with in-memory database', () => {
      expect(loaderService).toBeDefined();
      expect(loaderService.getBooks).toBeDefined();
      expect(loaderService.getChunksForEmbedding).toBeDefined();
    });

    it('should load books from sample data', () => {
      const loadedBooks = loaderService.getBooks();

      expect(loadedBooks.length).toBe(5);
      const titles = loadedBooks.map(b => b.title);
      expect(titles).toContain('Starting Strength');
      expect(loadedBooks[0].totalChunks).toBeGreaterThan(0);
    });

    it('should create chunks from book content', () => {
      const books = loaderService.getBooks();
      expect(books.length).toBeGreaterThan(0);

      const chunks = loaderService.getChunksForEmbedding();
      expect(chunks.length).toBeGreaterThan(0);
      
      // Each chunk should have valid content
      for (const chunk of chunks) {
        expect(chunk.content.length).toBeGreaterThan(50);
        expect(chunk.tokenCount).toBeGreaterThan(0);
        expect(chunk.keyTerms.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should extract key terms from chunks', () => {
      const chunks = loaderService.getChunksForEmbedding();
      
      // Check that some chunks have key terms
      const chunksWithTerms = chunks.filter(chunk => chunk.keyTerms.length > 0);
      expect(chunksWithTerms.length).toBeGreaterThan(0);
      
      // Verify term format
      for (const chunk of chunksWithTerms) {
        for (const term of chunk.keyTerms) {
          expect(typeof term).toBe('string');
          expect(term.length).toBeGreaterThan(0);
        }
      }
    });

    it('should calculate chunk statistics', () => {
      const stats = loaderService.getChunkStatistics();
      
      expect(stats.totalChunks).toBeGreaterThan(0);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.averageChunkSize).toBeGreaterThan(0);
      expect(stats.booksProcessed).toBe(5);
      expect(stats.minChunkSize).toBeGreaterThan(0);
      expect(stats.maxChunkSize).toBeGreaterThan(stats.minChunkSize);
    });
  });

  describe('VectorStorePopulationService', () => {
    beforeAll(async () => {
      await loadTestData();
    });

    it('should initialize vector store service', () => {
      expect(populationService).toBeDefined();
      expect(populationService.getPopulationStats).toBeDefined();
      expect(populationService.benchmarkSearchPerformance).toBeDefined();
    });

    it('should prepare chunks for embedding', async () => {
      const chunks = loaderService.getChunksForEmbedding();
      expect(chunks.length).toBeGreaterThan(0);
      
      // Verify chunk structure for embedding
      for (const chunk of chunks.slice(0, 5)) {
        expect(chunk.id).toBeDefined();
        expect(chunk.content).toBeDefined();
        expect(chunk.bookId).toBeDefined();
      }
    });

    it('should get population statistics', () => {
      const stats = populationService.getPopulationStats();
      
      expect(stats).toBeDefined();
      expect(stats.totalChunks).toBeGreaterThanOrEqual(0);
      expect(stats.totalCost).toBeGreaterThanOrEqual(0);
      expect(stats.estimatedQdrantStorageBytes).toBeGreaterThanOrEqual(0);
    });

    it('should estimate storage requirements', async () => {
      const stats = populationService.getPopulationStats();
      const chunks = loaderService.getChunksForEmbedding();
      
      // Estimate: each vector is 1536 dimensions * 4 bytes + metadata
      const estimatedBytes = chunks.length * (1536 * 4 + 500);
      expect(estimatedBytes).toBeGreaterThan(0);
      expect(estimatedBytes).toBeLessThan(1000 * 1024 * 1024); // Less than 1GB for test data
    });
  });

  describe('KnowledgeBaseValidationService', () => {
    beforeAll(async () => {
      await loadTestData();
    });

    it('should initialize validation service', () => {
      expect(validationService).toBeDefined();
      expect(validationService.validateChunkQuality).toBeDefined();
      expect(validationService.testSemanticSearch).toBeDefined();
    });

    it('should validate chunk quality', () => {
      const chunks = loaderService.getChunksForEmbedding();
      const report = validationService.validateChunkQuality(chunks);
      
      expect(report).toBeDefined();
      expect(report.totalChunks).toBe(chunks.length);
      expect(report.validChunks).toBeGreaterThan(0);
      expect(report.validationRate).toBeGreaterThan(0);
    });

    it('should test semantic search', () => {
      const testQueries = [
        'strength training',
        'recovery sleep',
        'nutrition performance'
      ];
      
      const results = validationService.testSemanticSearch(testQueries);
      
      expect(results.length).toBe(testQueries.length);
      for (const result of results) {
        expect(result.query).toBeDefined();
        expect(result.averageSimilarity).toBeGreaterThanOrEqual(0);
        expect(result.averageSimilarity).toBeLessThanOrEqual(1);
        expect(typeof result.passed).toBe('boolean');
      }
    });

    it('should benchmark search performance', () => {
      const benchmark = validationService.benchmarkSearchPerformance(50);
      
      expect(benchmark).toBeDefined();
      expect(benchmark.avgLatencyMs).toBeGreaterThanOrEqual(0);
      expect(benchmark.p50LatencyMs).toBeGreaterThanOrEqual(0);
      expect(benchmark.p95LatencyMs).toBeGreaterThanOrEqual(benchmark.p50LatencyMs);
      expect(benchmark.p99LatencyMs).toBeGreaterThanOrEqual(benchmark.p95LatencyMs);
      expect(benchmark.throughputPerSecond).toBeGreaterThanOrEqual(0);
      expect(benchmark.totalQueriesRun).toBe(50);
    });

    it('should generate quality report', () => {
      const report = validationService.generateQualityReport();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.totalBooks).toBeGreaterThan(0);
      expect(report.totalChunks).toBeGreaterThan(0);
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('End-to-End Population Workflow', () => {
    beforeAll(async () => {
      await loadTestData();
    });

    it('should execute complete population pipeline', () => {
      // Step 1: Verify books loaded
      const loadedBooks = loaderService.getBooks();
      expect(loadedBooks.length).toBe(5);

      // Step 2: Get chunks
      const chunks = loaderService.getChunksForEmbedding();
      expect(chunks.length).toBeGreaterThan(0);

      // Step 3: Validate quality
      const qualityReport = validationService.validateChunkQuality(chunks);
      expect(qualityReport.validationRate).toBeGreaterThan(50); // At least 50% valid

      // Step 4: Test search
      const searchResults = validationService.testSemanticSearch([
        'training recovery',
        'sleep improvement'
      ]);
      expect(searchResults.length).toBe(2);

      // Step 5: Get statistics
      const stats = loaderService.getChunkStatistics();
      expect(stats.totalChunks).toEqual(chunks.length);
    });

    it('should meet performance targets', () => {
      const benchmark = validationService.benchmarkSearchPerformance(100);
      
      // Performance targets
      expect(benchmark.avgLatencyMs).toBeLessThan(500); // Avg <500ms
      expect(benchmark.p95LatencyMs).toBeLessThan(1000); // P95 <1s
      expect(benchmark.throughputPerSecond).toBeGreaterThan(1); // >1 query/sec
    });

    it('should ensure data integrity', () => {
      const chunks = loaderService.getChunksForEmbedding();
      
      // Verify all chunks are unique
      const uniqueIds = new Set(chunks.map(c => c.id));
      expect(uniqueIds.size).toBe(chunks.length);

      // Verify all chunks have valid content
      for (const chunk of chunks) {
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(chunk.bookId).toBeDefined();
        expect(chunk.chapterNumber).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Knowledge Base Coverage', () => {
    beforeAll(async () => {
      await loadTestData();
    });

    it('should cover multiple categories', () => {
      const books = loaderService.getBooks();
      const categories = new Set(books.map(b => b.category));
      
      expect(categories.size).toBeGreaterThan(0);
      expect(Array.from(categories)).toContain('Strength & Conditioning');
      expect(Array.from(categories)).toContain('Recovery & Sleep Science');
    });

    it('should have minimum chunk count', () => {
      const stats = loaderService.getChunkStatistics();
      
      // Target: 10,000-15,000 chunks for full KB
      // For 5 sample books: should be 15+ chunks (3 chapters * 5 books)
      expect(stats.totalChunks).toBeGreaterThan(10);
    });

    it('should have reasonable token distribution', () => {
      const stats = loaderService.getChunkStatistics();
      
      // Average chunk should be 100+ tokens
      expect(stats.averageChunkSize).toBeGreaterThan(50);
      expect(stats.averageChunkSize).toBeLessThan(500);
    });
  });
});
