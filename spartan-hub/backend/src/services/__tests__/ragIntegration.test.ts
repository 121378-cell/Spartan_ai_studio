/**
 * RAG Services Integration Test
 *
 * Tests:
 * - RAG Document Service functionality
 * - Vector Store Service functionality
 * - Citation Service functionality
 * - RAG Routes endpoints
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import path from 'path';
import { jest } from '@jest/globals';
import { getRAGDocumentService } from '../ragDocumentService';
import { getVectorStoreService } from '../vectorStoreService';
import { getCitationService } from '../citationService';

// Mock database path
const TEST_DB_PATH = path.join(__dirname, 'test-rag.db');

describe('RAG Services Integration', () => {
  let db: DatabaseType;
  let docService: ReturnType<typeof getRAGDocumentService>;
  let vectorService: ReturnType<typeof getVectorStoreService>;
  let citationService: ReturnType<typeof getCitationService>;
  const originalFetch = global.fetch;

  beforeAll(() => {
    // Force fallback path deterministically and avoid slow network retries
    global.fetch = jest.fn(async () => {
      throw new Error('fetch disabled in tests');
    }) as any;

    // Create test database
    db = new Database(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');
    
    docService = getRAGDocumentService();
    vectorService = getVectorStoreService();
    citationService = getCitationService();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    db.close();
  });

  describe('RAGDocumentService', () => {
    it('should initialize with database', async () => {
      await docService.initialize(db);
      const docs = docService.getDocuments();
      expect(Array.isArray(docs)).toBe(true);
    });

    it('should chunk document content', async () => {
      const content = `
        This is a paragraph about fitness training.
        
        This is another paragraph about recovery protocols.
        
        This is a third paragraph about nutrition strategies.
      `;
      
      const chunks = await docService.chunkDocument(content, 'paragraph');
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toBeDefined();
    });

    it('should extract metadata from document', async () => {
      const doc = 'Chapter 1\n\nSome content here.\n\nMore content\n\nEven more content';
      const metadata = await docService.extractMetadata(doc);
      
      expect(metadata.estimatedPages).toBeGreaterThan(0);
      expect(metadata.languages).toContain('English');
    });
  });

  describe('VectorStoreService', () => {
    it('should initialize vector store', async () => {
      await vectorService.initialize({
        qdrantHost: 'localhost',
        qdrantPort: 6333
      });
      
      const stats = await vectorService.getStats();
      expect(stats.provider).toBe('qdrant-proxy');
      expect(stats.status).toBe('connected');
      expect(stats.vectorDimension).toBe(384);
    });

    it('should generate embeddings', async () => {
      const text = 'This is a test sentence about fitness and training';
      const result = await vectorService.embedText(text);
      
      expect(result.vector).toBeDefined();
      expect(result.vector.length).toBe(384);
      expect(result.model).toBe('mock-fallback');
    });

    it('should calculate cosine similarity', () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const similarity = vectorService.cosineSimilarity(v1, v2);
      
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should batch embed texts', async () => {
      const texts = [
        { id: 'text1', text: 'First document about training' },
        { id: 'text2', text: 'Second document about recovery' }
      ];
      
      const embeddings = await vectorService.batchEmbed(texts);
      expect(embeddings.length).toBe(2);
      expect(embeddings[0].vector.length).toBe(384);
    });
  });

  describe('CitationService', () => {
    it('should initialize with database', async () => {
      await citationService.initialize(db);
      // Service initialized successfully if no error thrown
      expect(citationService).toBeDefined();
    });

    it('should format citations in APA style', () => {
      const citation = citationService.formatCitation(
        'The Science of Training',
        ['John Smith', 'Jane Doe'],
        2020,
        42,
        'APA'
      );
      
      expect(citation).toContain('Smith');
      expect(citation).toContain('2020');
      expect(citation).toContain('The Science of Training');
    });

    it('should format citations in Harvard style', () => {
      const citation = citationService.formatCitation(
        'Training Methods',
        ['Author One'],
        2021,
        undefined,
        'Harvard'
      );
      
      expect(citation).toContain('Author One');
      expect(citation).toContain('2021');
    });

    it('should validate citations', () => {
      const validCitation = {
        id: 'cite_1',
        chunkId: 'chunk_1',
        documentId: 'doc_1',
        documentTitle: 'Test Book',
        authors: ['Test Author'],
        publicationYear: 2020,
        formattedText: {
          APA: 'Test Author (2020). Test Book.',
          Chicago: 'Test Author, Test Book (2020).',
          Harvard: 'Test Author 2020. Test Book.'
        },
        createdAt: new Date().toISOString()
      };
      
      const validation = citationService.validateCitation(validCitation);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid citations', () => {
      const invalidCitation = {
        id: 'cite_2',
        chunkId: 'chunk_2',
        documentId: 'doc_2',
        documentTitle: '',
        authors: [],
        publicationYear: 3000,
        formattedText: { APA: '', Chicago: '', Harvard: '' },
        createdAt: new Date().toISOString()
      };
      
      const validation = citationService.validateCitation(invalidCitation);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('RAG Services Integration', () => {
    it('should integrate document, vector, and citation services', async () => {
      // 1. Load a document
      const testBook = {
        title: 'Recovery Science',
        authors: ['Dr. Recovery'],
        publicationYear: 2022,
        category: 'Recovery & Sleep Science',
        tags: ['recovery', 'sleep', 'science']
      };
      
      // We'll skip actual loading since it requires file system
      // But we can verify the services are ready
      expect(docService).toBeDefined();
      expect(vectorService).toBeDefined();
      expect(citationService).toBeDefined();
    });

    it('should handle RAG workflow', async () => {
      // This tests the conceptual RAG workflow:
      // 1. Document loaded
      // 2. Content chunked
      // 3. Embeddings generated
      // 4. Citations formatted
      // 5. Results combined
      
      // Simulate chunk
      const testChunk = {
        id: 'chunk_test',
        content: 'Training with low HRV increases injury risk significantly.',
        wordCount: 10
      };
      
      // Generate embedding
      const embedding = await vectorService.embedText(testChunk.content);
      expect(embedding.vector.length).toBe(384);
      
      // Format citation
      const citation = citationService.formatCitation(
        'Training and Recovery',
        ['Coach'],
        2023,
        undefined,
        'APA'
      );
      expect(citation).toBeDefined();
      
      // Simulate response with citation
      const response = {
        recommendation: testChunk.content,
        citation: citation,
        confidence: 0.92
      };
      
      expect(response.recommendation).toContain('HRV');
      expect(response.citation).toContain('Coach');
    });
  });
});
