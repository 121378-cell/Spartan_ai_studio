/**
 * RAG Document Service - Knowledge Base Management
 *
 * Handles:
 * - Document ingestion (PDF, EPUB, TXT)
 * - Content chunking strategies
 * - Metadata extraction
 * - Document versioning
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface BookMetadata {
  title: string;
  authors: string[];
  publicationYear: number;
  isbn?: string;
  category: string;
  tags: string[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  sectionTitle?: string;
  metadata: {
    wordCount: number;
    characterCount: number;
    keyTerms: string[];
  };
}

export interface DocumentMetadata {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number;
  isbn?: string;
  category: string;
  tags: string[];
  filePath: string;
  contentHash: string;
  chunkCount: number;
  vectorModel: string;
  indexedAt: string;
  createdAt: string;
}

class RAGDocumentService {
  private static instance: RAGDocumentService;
  private db: DatabaseType | null = null;

  private constructor() {}

  static getInstance(): RAGDocumentService {
    if (!RAGDocumentService.instance) {
      RAGDocumentService.instance = new RAGDocumentService();
    }
    return RAGDocumentService.instance;
  }

  /**
   * Initialize service with database connection
   */
  public async initialize(database: DatabaseType): Promise<void> {
    try {
      this.db = database;
      this.createTablesIfNeeded();
      logger.info('RAGDocumentService initialized', {
        context: 'rag',
        metadata: { service: 'document_management' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize RAGDocumentService', {
        context: 'rag',
        metadata: { error: message }
      });
      throw error;
    }
  }

  /**
   * Load a book from file system
   */
  public async loadBook(filePath: string, metadata: BookMetadata): Promise<DocumentMetadata> {
    try {
      if (!this.db) throw new Error('Database not initialized');

      // Read file
      const content = fs.readFileSync(filePath, 'utf-8');
      const contentHash = this.calculateHash(content);

      // Check for duplicates
      const existing = this.db.prepare(
        'SELECT id FROM rag_documents WHERE content_hash = ?'
      ).get(contentHash);

      if (existing) {
        throw new Error(`Document with same content already exists: ${(existing as any).id}`);
      }

      // Generate chunks
      const chunks = await this.chunkDocument(content, 'paragraph');

      // Create document record
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO rag_documents 
        (id, title, authors, publication_year, isbn, category, tags, file_path, 
         content_hash, chunk_count, vector_model, indexed_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        docId,
        metadata.title,
        JSON.stringify(metadata.authors),
        metadata.publicationYear,
        metadata.isbn || null,
        metadata.category,
        JSON.stringify(metadata.tags),
        filePath,
        contentHash,
        chunks.length,
        'text-embedding-3-small',
        now,
        now
      );

      // Store chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = `chunk_${docId}_${i}`;

        this.db.prepare(`
          INSERT INTO rag_document_chunks
          (id, document_id, chunk_index, content, embedding_model, page_number, section_title, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          chunkId,
          docId,
          i,
          chunk.content,
          'text-embedding-3-small',
          chunk.pageNumber || null,
          chunk.sectionTitle || null,
          now
        );
      }

      logger.info('Book loaded successfully', {
        context: 'rag',
        metadata: {
          documentId: docId,
          title: metadata.title,
          chunks: chunks.length
        }
      });

      return {
        id: docId,
        title: metadata.title,
        authors: metadata.authors,
        publicationYear: metadata.publicationYear,
        isbn: metadata.isbn,
        category: metadata.category,
        tags: metadata.tags,
        filePath,
        contentHash,
        chunkCount: chunks.length,
        vectorModel: 'text-embedding-3-small',
        indexedAt: now,
        createdAt: now
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load book', {
        context: 'rag',
        metadata: { filePath, error: message }
      });
      throw error;
    }
  }

  /**
   * Chunk document into semantic units
   */
  public async chunkDocument(
    content: string,
    strategy: 'paragraph' | 'sentence' | 'token' = 'paragraph'
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    switch (strategy) {
      case 'paragraph':
        return this.chunkByParagraph(content);
      case 'sentence':
        return this.chunkBySentence(content);
      case 'token':
        return this.chunkByTokens(content, 300, 50);
      default:
        return this.chunkByParagraph(content);
    }
  }

  /**
   * Chunk by paragraphs (double newlines)
   */
  private chunkByParagraph(content: string): DocumentChunk[] {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    const chunks: DocumentChunk[] = [];

    paragraphs.forEach((paragraph, index) => {
      const cleanContent = paragraph.trim();
      if (cleanContent.length > 50) { // Filter very short paragraphs
        chunks.push({
          id: `chunk_${index}`,
          documentId: '',
          chunkIndex: index,
          content: cleanContent,
          metadata: {
            wordCount: cleanContent.split(/\s+/).length,
            characterCount: cleanContent.length,
            keyTerms: this.extractKeyTerms(cleanContent)
          }
        });
      }
    });

    return chunks;
  }

  /**
   * Chunk by sentences
   */
  private chunkBySentence(content: string): DocumentChunk[] {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    sentences.forEach((sentence) => {
      currentChunk += sentence;
      
      if (currentChunk.split(/\s+/).length > 100) {
        chunks.push({
          id: `chunk_${chunkIndex}`,
          documentId: '',
          chunkIndex,
          content: currentChunk.trim(),
          metadata: {
            wordCount: currentChunk.split(/\s+/).length,
            characterCount: currentChunk.length,
            keyTerms: this.extractKeyTerms(currentChunk)
          }
        });
        currentChunk = '';
        chunkIndex++;
      }
    });

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `chunk_${chunkIndex}`,
        documentId: '',
        chunkIndex,
        content: currentChunk.trim(),
        metadata: {
          wordCount: currentChunk.split(/\s+/).length,
          characterCount: currentChunk.length,
          keyTerms: this.extractKeyTerms(currentChunk)
        }
      });
    }

    return chunks;
  }

  /**
   * Chunk by token count with overlap
   */
  private chunkByTokens(
    content: string,
    chunkSize: number = 300,
    overlap: number = 50
  ): DocumentChunk[] {
    // Approximate: 1 token ≈ 4 characters
    const charSize = chunkSize * 4;
    const charOverlap = overlap * 4;
    const chunks: DocumentChunk[] = [];

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      const end = Math.min(start + charSize, content.length);
      const chunkContent = content.substring(start, end).trim();

      if (chunkContent.length > 100) {
        chunks.push({
          id: `chunk_${chunkIndex}`,
          documentId: '',
          chunkIndex,
          content: chunkContent,
          metadata: {
            wordCount: chunkContent.split(/\s+/).length,
            characterCount: chunkContent.length,
            keyTerms: this.extractKeyTerms(chunkContent)
          }
        });
        chunkIndex++;
      }

      start += charSize - charOverlap;
    }

    return chunks;
  }

  /**
   * Extract key terms from content using simple NLP
   */
  private extractKeyTerms(content: string): string[] {
    // Simple term extraction: capitalized words and common fitness terms
    const fitnessTerms = [
      'HRV', 'RHR', 'VO2', 'recovery', 'training', 'strength',
      'endurance', 'muscle', 'fatigue', 'readiness', 'sleep',
      'stress', 'injury', 'performance', 'adaptation', 'periodization'
    ];

    const words = content.split(/\s+/);
    const terms = words
      .filter(word => {
        const clean = word.replace(/[^a-zA-Z0-9]/g, '');
        return clean.length > 3 && 
               (clean[0] === clean[0].toUpperCase() || 
                fitnessTerms.some(t => t.toLowerCase() === clean.toLowerCase()));
      })
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter((v, i, a) => a.indexOf(v) === i) // Unique
      .slice(0, 10);

    return terms;
  }

  /**
   * Calculate SHA-256 hash of content
   */
  private calculateHash(content: string): string {
    // Simple hash for demo (use crypto.createHash in production)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `hash_${Math.abs(hash)}`;
  }

  /**
   * Extract metadata from document
   */
  public async extractMetadata(document: string): Promise<{
    estimatedPages: number;
    estimatedChapters: number;
    languages: string[];
  }> {
    const lines = document.split('\n');
    const estimatedPages = Math.ceil(document.length / 2500); // Avg 2500 chars per page
    const chapterPattern = /^(chapter|section|part)\s+\d+/i;
    const estimatedChapters = lines.filter(line => chapterPattern.test(line)).length;

    return {
      estimatedPages,
      estimatedChapters: estimatedChapters || 1,
      languages: ['English'] // Extend for multi-language support
    };
  }

  /**
   * Get all indexed documents
   */
  public getDocuments(): DocumentMetadata[] {
    if (!this.db) return [];

    const docs = this.db.prepare(
      'SELECT * FROM rag_documents ORDER BY created_at DESC'
    ).all() as any[];

    return docs.map(doc => ({
      id: doc.id,
      title: doc.title,
      authors: JSON.parse(doc.authors || '[]'),
      publicationYear: doc.publication_year,
      isbn: doc.isbn,
      category: doc.category,
      tags: JSON.parse(doc.tags || '[]'),
      filePath: doc.file_path,
      contentHash: doc.content_hash,
      chunkCount: doc.chunk_count,
      vectorModel: doc.vector_model,
      indexedAt: doc.indexed_at,
      createdAt: doc.created_at
    }));
  }

  /**
   * Get document by ID
   */
  public getDocument(documentId: string): DocumentMetadata | null {
    if (!this.db) return null;

    const doc = this.db.prepare(
      'SELECT * FROM rag_documents WHERE id = ?'
    ).get(documentId) as any;

    if (!doc) return null;

    return {
      id: doc.id,
      title: doc.title,
      authors: JSON.parse(doc.authors || '[]'),
      publicationYear: doc.publication_year,
      isbn: doc.isbn,
      category: doc.category,
      tags: JSON.parse(doc.tags || '[]'),
      filePath: doc.file_path,
      contentHash: doc.content_hash,
      chunkCount: doc.chunk_count,
      vectorModel: doc.vector_model,
      indexedAt: doc.indexed_at,
      createdAt: doc.created_at
    };
  }

  /**
   * Get document chunks
   */
  public getChunks(documentId: string): DocumentChunk[] {
    if (!this.db) return [];

    const chunks = this.db.prepare(
      'SELECT * FROM rag_document_chunks WHERE document_id = ? ORDER BY chunk_index'
    ).all(documentId) as any[];

    return chunks.map(chunk => ({
      id: chunk.id,
      documentId: chunk.document_id,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      pageNumber: chunk.page_number,
      sectionTitle: chunk.section_title,
      metadata: chunk.metadata ? JSON.parse(chunk.metadata) : {
        wordCount: chunk.content.split(/\s+/).length,
        characterCount: chunk.content.length,
        keyTerms: []
      }
    }));
  }

  /**
   * Create database tables
   */
  private createTablesIfNeeded(): void {
    if (!this.db) return;

    // rag_documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rag_documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        authors TEXT,
        publication_year INTEGER,
        isbn TEXT UNIQUE,
        category TEXT,
        tags TEXT,
        file_path TEXT,
        content_hash TEXT UNIQUE,
        chunk_count INTEGER,
        vector_model TEXT,
        indexed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index
    try {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_documents_category ON rag_documents(category)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_documents_indexed ON rag_documents(indexed_at)');
    } catch (e) {
      // Indices might already exist
    }

    // rag_document_chunks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rag_document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        chunk_index INTEGER,
        content TEXT NOT NULL,
        embedding_vector BLOB,
        embedding_model TEXT,
        metadata JSON,
        page_number INTEGER,
        section_title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES rag_documents(id)
      )
    `);

    // Create indices
    try {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_document ON rag_document_chunks(document_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON rag_document_chunks(chunk_index)');
    } catch (e) {
      // Indices might already exist
    }

    // rag_citations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rag_citations (
        id TEXT PRIMARY KEY,
        chunk_id TEXT NOT NULL,
        format_style TEXT,
        formatted_citation TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chunk_id) REFERENCES rag_document_chunks(id)
      )
    `);

    // vital_coach_citations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vital_coach_citations (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        relevance_score DECIMAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // rag_query_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rag_query_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT,
        retrieved_chunks INTEGER,
        response_confidence DECIMAL,
        citations_count INTEGER,
        user_rating INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('RAG tables verified/created', {
      context: 'rag',
      metadata: { database: 'initialized' }
    });
  }

  /**
   * Close database connection
   */
  public close(): void {
    // Database is managed externally, don't close here
  }
}

// Singleton export
export function getRAGDocumentService(): RAGDocumentService {
  return RAGDocumentService.getInstance();
}
