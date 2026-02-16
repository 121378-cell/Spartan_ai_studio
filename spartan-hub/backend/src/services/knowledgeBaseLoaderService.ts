const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';

interface BookMetadata {
  title: string;
  authors: string[];
  year: number;
  isbn?: string;
  category: string;
  description?: string;
}

interface Book extends BookMetadata {
  id: string;
  chapters: Chapter[];
  totalChunks: number;
  createdAt: string;
}

interface Chapter {
  number: number;
  title: string;
  content: string;
}

interface DocumentChunk {
  id: string;
  bookId: string;
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  order: number;
  tokenCount: number;
  keyTerms: string[];
  createdAt: string;
}

interface ChunkStatistics {
  totalChunks: number;
  totalTokens: number;
  averageChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  booksProcessed: number;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  tokenCount?: number;
  keyTerms?: string[];
}

/**
 * Knowledge Base Loader Service
 * Handles book loading, parsing, chunking, and quality assurance
 */
export class KnowledgeBaseLoaderService {
  private db: DatabaseType;
  private totalChunksCreated: number = 0;
  private booksProcessed: number = 0;

  constructor(dbPath: string = 'spartan-hub.db') {
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database tables for knowledge base
   */
  private initializeDatabase(): void {
    try {
      // Books table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS kb_books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          authors TEXT NOT NULL,
          year INTEGER,
          isbn TEXT,
          category TEXT,
          description TEXT,
          totalChunks INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indices for books
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_category ON kb_books(category)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_year ON kb_books(year)`);

      // Chunks table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS kb_chunks (
          id TEXT PRIMARY KEY,
          bookId TEXT NOT NULL,
          chapterNumber INTEGER,
          chapterTitle TEXT,
          content TEXT NOT NULL,
          chunk_order INTEGER,
          tokenCount INTEGER,
          keyTerms TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (bookId) REFERENCES kb_books(id)
        )
      `);

      // Create indices for chunks
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_bookId ON kb_chunks(bookId)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_chapter ON kb_chunks(bookId, chapterNumber)`);

      logger.info('Knowledge base tables initialized', { context: 'KnowledgeBaseLoaderService' });
    } catch (error: any) {
      logger.error('Failed to initialize database', { context: 'KnowledgeBaseLoaderService', metadata: { error: error.message } });
      throw error;
    }
  }

  /**
   * Load a single book from JSON format
   */
  async loadBook(bookData: any): Promise<Book> {
    try {
      const bookId = this.generateBookId(bookData.title);
      
      // Insert book metadata
      const insertBook = this.db.prepare(`
        INSERT OR REPLACE INTO kb_books 
        (id, title, authors, year, isbn, category, description, totalChunks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertBook.run(
        bookId,
        bookData.title,
        JSON.stringify(bookData.authors),
        bookData.year,
        bookData.isbn || null,
        bookData.category,
        bookData.description || null,
        0
      );

      // Process chapters and create chunks
      let chunkCount = 0;
      for (const chapter of bookData.chapters) {
        const chunks = this.chunkContent(bookData.id || bookId, chapter.content, chapter.number, chapter.title);
        
        const insertChunk = this.db.prepare(`
          INSERT INTO kb_chunks 
          (id, bookId, chapterNumber, chapterTitle, content, chunk_order, tokenCount, keyTerms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const chunk of chunks) {
          insertChunk.run(
            chunk.id,
            bookId,
            chapter.number,
            chapter.title,
            chunk.content,
            chunk.order,
            chunk.tokenCount,
            JSON.stringify(chunk.keyTerms)
          );
          chunkCount++;
        }
      }

      // Update book chunk count
      const updateBook = this.db.prepare('UPDATE kb_books SET totalChunks = ? WHERE id = ?');
      updateBook.run(chunkCount, bookId);

      this.totalChunksCreated += chunkCount;
      this.booksProcessed++;

      logger.info(`Book loaded successfully: ${bookData.title}`, {
        context: 'KnowledgeBaseLoaderService',
        metadata: { bookId, chapters: bookData.chapters.length, chunks: chunkCount }
      });

      return { ...bookData, id: bookId, totalChunks: chunkCount, createdAt: new Date().toISOString() };
    } catch (error: any) {
      logger.error(`Failed to load book: ${bookData.title}`, { context: 'KnowledgeBaseLoaderService', metadata: { error: error.message } });
      throw error;
    }
  }

  /**
   * Load all books from JSON array
   */
  async loadAllBooks(booksData: any[]): Promise<Book[]> {
    const loadedBooks: Book[] = [];
    
    for (const bookData of booksData) {
      try {
        const loaded = await this.loadBook(bookData);
        loadedBooks.push(loaded);
      } catch (error: any) {
        logger.error(`Skipping book due to error: ${bookData.title}`, { context: 'KnowledgeBaseLoaderService', metadata: { error: error.message } });
      }
    }

    return loadedBooks;
  }

  /**
   * Chunk content into semantic segments
   */
  private chunkContent(
    bookId: string,
    content: string,
    chapterNumber: number,
    chapterTitle: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // Split by sentences first
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    
    let currentChunk = '';
    let currentTokenCount = 0;
    let chunkOrder = 0;

    const TARGET_TOKENS = 200;
    const MAX_TOKENS = 300;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokenCount(sentence);
      
      if (currentTokenCount + sentenceTokens > TARGET_TOKENS && currentChunk.length > 0) {
        // Save current chunk
        const chunkId = `${bookId}_ch${chapterNumber}_chunk${chunkOrder}`;
        chunks.push({
          id: chunkId,
          bookId,
          chapterNumber,
          chapterTitle,
          content: currentChunk.trim(),
          order: chunkOrder,
          tokenCount: currentTokenCount,
          keyTerms: this.extractKeyTerms(currentChunk),
          createdAt: new Date().toISOString()
        });

        currentChunk = '';
        currentTokenCount = 0;
        chunkOrder++;
      }

      currentChunk += ' ' + sentence;
      currentTokenCount += sentenceTokens;

      // Force chunk if it gets too large
      if (currentTokenCount > MAX_TOKENS) {
        const chunkId = `${bookId}_ch${chapterNumber}_chunk${chunkOrder}`;
        chunks.push({
          id: chunkId,
          bookId,
          chapterNumber,
          chapterTitle,
          content: currentChunk.trim(),
          order: chunkOrder,
          tokenCount: currentTokenCount,
          keyTerms: this.extractKeyTerms(currentChunk),
          createdAt: new Date().toISOString()
        });

        currentChunk = '';
        currentTokenCount = 0;
        chunkOrder++;
      }
    }

    // Add remaining content
    if (currentChunk.trim().length > 0) {
      const chunkId = `${bookId}_ch${chapterNumber}_chunk${chunkOrder}`;
      chunks.push({
        id: chunkId,
        bookId,
        chapterNumber,
        chapterTitle,
        content: currentChunk.trim(),
        order: chunkOrder,
        tokenCount: currentTokenCount,
        keyTerms: this.extractKeyTerms(currentChunk),
        createdAt: new Date().toISOString()
      });
    }

    return chunks.filter(chunk => this.validateChunk(chunk).isValid);
  }

  /**
   * Estimate token count (simplified: ~4 chars per token)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Extract key terms from chunk
   */
  private extractKeyTerms(text: string): string[] {
    // Simple regex-based extraction: capitalize words and scientific terms
    const words = text.split(/\s+/);
    const keyTerms = new Set<string>();

    for (const word of words) {
      // Add capitalized words (proper nouns, acronyms)
      if (/^[A-Z][a-zA-Z]+/.test(word)) {
        keyTerms.add(word.replace(/[^a-zA-Z]/g, '').toLowerCase());
      }

      // Add common fitness/science terms
      if (/\b(hrv|rhr|vo2|lactate|cortisol|sleep|recovery|training|periodization|hypertrophy|strength|endurance)\b/i.test(word)) {
        keyTerms.add(word.toLowerCase());
      }
    }

    return Array.from(keyTerms).slice(0, 10); // Return top 10 terms
  }

  /**
   * Validate chunk quality
   */
  validateChunk(chunk: DocumentChunk): ValidationResult {
    // Check minimum length
    if (chunk.content.length < 50) {
      return { isValid: false, error: 'Chunk too short (<50 chars)' };
    }

    // Check maximum length
    if (chunk.content.length > 5000) {
      return { isValid: false, error: 'Chunk too long (>5000 chars)' };
    }

    // Check for meaningful content (not just whitespace/numbers)
    const meaningfulText = chunk.content.replace(/\s+/g, '').replace(/\d+/g, '');
    if (meaningfulText.length < 30) {
      return { isValid: false, error: 'Insufficient meaningful content' };
    }

    // Validate token count
    const expectedTokens = this.estimateTokenCount(chunk.content);
    if (Math.abs(expectedTokens - chunk.tokenCount) > 50) {
      return { isValid: false, error: 'Token count mismatch' };
    }

    return { isValid: true, tokenCount: chunk.tokenCount, keyTerms: chunk.keyTerms };
  }

  /**
   * Get chunk statistics
   */
  getChunkStatistics(): ChunkStatistics {
    try {
      const totalChunks = this.db.prepare('SELECT COUNT(*) as count FROM kb_chunks').get() as { count: number };
      const tokenStats = this.db.prepare(`
        SELECT 
          SUM(tokenCount) as total,
          AVG(tokenCount) as avg,
          MIN(tokenCount) as min,
          MAX(tokenCount) as max
        FROM kb_chunks
      `).get() as { total: number; avg: number; min: number; max: number };

      return {
        totalChunks: totalChunks.count,
        totalTokens: tokenStats.total || 0,
        averageChunkSize: Math.round(tokenStats.avg || 0),
        minChunkSize: tokenStats.min || 0,
        maxChunkSize: tokenStats.max || 0,
        booksProcessed: this.booksProcessed
      };
    } catch (error: any) {
      logger.error('Failed to get chunk statistics', { context: 'KnowledgeBaseLoaderService', metadata: { error: error.message } });
      return {
        totalChunks: 0,
        totalTokens: 0,
        averageChunkSize: 0,
        minChunkSize: 0,
        maxChunkSize: 0,
        booksProcessed: 0
      };
    }
  }

  /**
   * Get all chunks for embedding
   */
  getChunksForEmbedding(): DocumentChunk[] {
    try {
      const chunks = this.db.prepare(`
        SELECT 
          id, bookId, chapterNumber, chapterTitle, content, 
          chunk_order as 'order', tokenCount, keyTerms, createdAt
        FROM kb_chunks
        ORDER BY bookId, chapterNumber, chunk_order
      `).all() as any[];

      return chunks.map(chunk => ({
        ...chunk,
        keyTerms: JSON.parse(chunk.keyTerms || '[]')
      }));
    } catch (error: any) {
      logger.error('Failed to get chunks for embedding', { context: 'KnowledgeBaseLoaderService', metadata: { error: error.message } });
      return [];
    }
  }

  /**
   * Get books list
   */
  getBooks(): Book[] {
    try {
      const books = this.db.prepare(`
        SELECT id, title, authors, year, isbn, category, description, totalChunks, createdAt
        FROM kb_books
        ORDER BY category, title
      `).all() as any[];

      return books.map(book => ({
        ...book,
        authors: JSON.parse(book.authors)
      }));
    } catch (error: any) {
      logger.error('Failed to get books', { context: 'KnowledgeBaseLoaderService', metadata: { error: error.message } });
      return [];
    }
  }

  /**
   * Get book by ID
   */
  getBook(bookId: string): Book | null {
    try {
      const book = this.db.prepare(`
        SELECT id, title, authors, year, isbn, category, description, totalChunks, createdAt
        FROM kb_books
        WHERE id = ?
      `).get(bookId) as any;

      if (!book) return null;

      const chapters = this.db.prepare(`
        SELECT DISTINCT chapterNumber, chapterTitle
        FROM kb_chunks
        WHERE bookId = ?
        ORDER BY chapterNumber
      `).all(bookId);

      return {
        ...book,
        authors: JSON.parse(book.authors),
        chapters: chapters as Chapter[]
      };
    } catch (error: any) {
      logger.error(`Failed to get book ${bookId}`, { context: 'KnowledgeBaseLoaderService', metadata: { error: error.message } });
      return null;
    }
  }

  /**
   * Generate book ID from title
   */
  private generateBookId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    logger.info('Knowledge base loader closed', { context: 'KnowledgeBaseLoaderService' });
  }
}
