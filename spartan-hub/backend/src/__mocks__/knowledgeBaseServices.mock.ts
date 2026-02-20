/**
 * Mocks para Knowledge Base Services
 * KnowledgeBaseLoaderService, VectorStorePopulationService, KnowledgeBaseValidationService
 */

import { mockQdrantClient } from './externalServices.mock';

// ==================== Types ====================

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  totalChunks: number;
  chapters: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  chapterNumber: number;
}

interface Chunk {
  id: string;
  content: string;
  bookId: string;
  chapterNumber: number;
  tokenCount: number;
  keyTerms: string[];
}

interface ChunkStatistics {
  totalChunks: number;
  totalTokens: number;
  averageChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  booksProcessed: number;
}

interface PopulationStats {
  totalChunks: number;
  totalCost: number;
  estimatedQdrantStorageBytes: number;
}

interface ValidationReport {
  totalChunks: number;
  validChunks: number;
  validationRate: number;
}

interface SearchTestResult {
  query: string;
  averageSimilarity: number;
  passed: boolean;
}

interface BenchmarkResult {
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputPerSecond: number;
  totalQueriesRun: number;
}

interface QualityReport {
  timestamp: string;
  totalBooks: number;
  totalChunks: number;
  overallScore: number;
  recommendations: string[];
}

// ==================== Sample Data ====================

const sampleBooks: Book[] = [
  {
    id: 'book-1',
    title: 'Starting Strength',
    author: 'Mark Rippetoe',
    category: 'Strength & Conditioning',
    totalChunks: 15,
    chapters: [
      { 
        id: 'ch-1-1', 
        title: 'The Squat', 
        content: 'The squat is the most important exercise in strength training. It works the entire lower body including quadriceps, hamstrings, glutes, and core muscles. Proper form is essential for safety and effectiveness. The movement pattern should be learned with light weights before progressing to heavier loads.',
        chapterNumber: 1 
      },
      { 
        id: 'ch-1-2', 
        title: 'The Press', 
        content: 'The press develops upper body strength and shoulder stability. It targets the deltoids, triceps, and upper chest. This compound movement should be performed with strict form to maximize muscle recruitment and minimize injury risk.',
        chapterNumber: 2 
      },
      { 
        id: 'ch-1-3', 
        title: 'The Deadlift', 
        content: 'The deadlift works the posterior chain including the hamstrings, glutes, lower back, and upper back. It is one of the most functional movements for overall strength development.',
        chapterNumber: 3 
      }
    ]
  },
  {
    id: 'book-2',
    title: 'Why We Sleep',
    author: 'Matthew Walker',
    category: 'Recovery & Sleep Science',
    totalChunks: 12,
    chapters: [
      { 
        id: 'ch-2-1', 
        title: 'Sleep Basics', 
        content: 'Sleep is essential for recovery and overall health. During sleep, the body repairs tissues, consolidates memories, and regulates hormones. Adults should aim for 7-9 hours of quality sleep per night.',
        chapterNumber: 1 
      },
      { 
        id: 'ch-2-2', 
        title: 'Sleep Cycles', 
        content: 'REM and deep sleep are crucial for different aspects of recovery. Deep sleep supports physical restoration while REM sleep is important for mental recovery and memory consolidation.',
        chapterNumber: 2 
      }
    ]
  },
  {
    id: 'book-3',
    title: 'The Obesity Code',
    author: 'Jason Fung',
    category: 'Nutrition & Metabolism',
    totalChunks: 10,
    chapters: [
      { 
        id: 'ch-3-1', 
        title: 'Metabolism', 
        content: 'Understanding metabolic health is key to sustainable weight management. Metabolism involves complex processes that convert food into energy. Factors like age, muscle mass, and activity level influence metabolic rate.',
        chapterNumber: 1 
      },
      { 
        id: 'ch-3-2', 
        title: 'Hormones', 
        content: 'Insulin and cortisol affect weight regulation significantly. Managing these hormones through diet and lifestyle can improve metabolic health and support weight loss goals.',
        chapterNumber: 2 
      }
    ]
  },
  {
    id: 'book-4',
    title: 'Becoming a Supple Leopard',
    author: 'Kelly Starrett',
    category: 'Mobility & Injury Prevention',
    totalChunks: 14,
    chapters: [
      { 
        id: 'ch-4-1', 
        title: 'Mobility Basics', 
        content: 'Mobility work prevents injuries and improves performance. Regular mobility exercises help maintain joint health and range of motion. This is especially important for athletes and active individuals.',
        chapterNumber: 1 
      },
      { 
        id: 'ch-4-2', 
        title: 'Movement Patterns', 
        content: 'Proper movement mechanics are essential for long-term joint health. Learning correct movement patterns early can prevent chronic injuries and improve athletic performance over time.',
        chapterNumber: 2 
      }
    ]
  },
  {
    id: 'book-5',
    title: 'Mental Training for Athletes',
    author: 'Terry Orlick',
    category: 'Mental Performance',
    totalChunks: 11,
    chapters: [
      { 
        id: 'ch-5-1', 
        title: 'Visualization', 
        content: 'Mental rehearsal improves performance in sports and other high-pressure situations. Visualization techniques help athletes prepare mentally for competition and build confidence.',
        chapterNumber: 1 
      },
      { 
        id: 'ch-5-2', 
        title: 'Focus', 
        content: 'Maintaining concentration under pressure is a skill that can be developed. Focus training helps athletes stay present and perform at their best when it matters most.',
        chapterNumber: 2 
      }
    ]
  }
];

// Generate chunks from books
function generateChunks(): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkId = 1;

  for (const book of sampleBooks) {
    for (const chapter of book.chapters) {
      // Split chapter content into chunks (simplified)
      const content = chapter.content;
      const words = content.split(' ');
      const chunkSize = 50;
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunkWords = words.slice(i, i + chunkSize);
        chunks.push({
          id: `chunk-${chunkId++}`,
          content: chunkWords.join(' '),
          bookId: book.id,
          chapterNumber: chapter.chapterNumber,
          tokenCount: chunkWords.length,
          keyTerms: extractKeyTerms(chunkWords.join(' '))
        });
      }
    }
  }

  return chunks;
}

function extractKeyTerms(content: string): string[] {
  const terms: string[] = [];
  const keywords = ['strength', 'sleep', 'recovery', 'metabolism', 'mobility', 'training', 'performance'];
  
  for (const keyword of keywords) {
    if (content.toLowerCase().includes(keyword)) {
      terms.push(keyword);
    }
  }
  
  return terms;
}

// ==================== Mock Services ====================

export class MockKnowledgeBaseLoaderService {
  private books: Book[] = [];
  private chunks: Chunk[] = [];

  constructor() {
    this.loadAllBooks(sampleBooks);
  }

  loadAllBooks(books: Book[]): void {
    this.books = [...books];
    this.chunks = generateChunks();
  }

  getBooks(): Book[] {
    return this.books;
  }

  getChunksForEmbedding(): Chunk[] {
    return this.chunks;
  }

  getChunkStatistics(): ChunkStatistics {
    const tokenCounts = this.chunks.map(c => c.tokenCount);
    const totalTokens = tokenCounts.reduce((a, b) => a + b, 0);
    
    return {
      totalChunks: this.chunks.length,
      totalTokens,
      averageChunkSize: totalTokens / this.chunks.length,
      minChunkSize: Math.min(...tokenCounts),
      maxChunkSize: Math.max(...tokenCounts),
      booksProcessed: this.books.length
    };
  }

  close(): void {
    // No-op for mock
  }
}

export class MockVectorStorePopulationService {
  private stats: PopulationStats = {
    totalChunks: 0,
    totalCost: 0,
    estimatedQdrantStorageBytes: 0
  };

  constructor(_apiKey: string, _dbPath: string) {
    // Initialize with sample stats
    const chunks = generateChunks();
    this.stats = {
      totalChunks: chunks.length,
      totalCost: chunks.length * 0.002, // $0.002 per chunk
      estimatedQdrantStorageBytes: chunks.length * (1536 * 4 + 500)
    };
  }

  getPopulationStats(): PopulationStats {
    return this.stats;
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}

export class MockKnowledgeBaseValidationService {
  private chunks: Chunk[] = [];

  constructor() {
    this.chunks = generateChunks();
  }

  validateChunkQuality(chunks: Chunk[]): ValidationReport {
    const validChunks = chunks.filter(chunk => 
      chunk.content.length > 20 && 
      chunk.tokenCount > 5 &&
      chunk.bookId !== undefined
    );

    return {
      totalChunks: chunks.length,
      validChunks: validChunks.length,
      validationRate: (validChunks.length / chunks.length) * 100
    };
  }

  testSemanticSearch(queries: string[]): SearchTestResult[] {
    return queries.map(query => ({
      query,
      averageSimilarity: 0.75 + Math.random() * 0.2, // 0.75-0.95
      passed: true
    }));
  }

  benchmarkSearchPerformance(queryCount: number): BenchmarkResult {
    const baseLatency = 50;
    const p50 = baseLatency + Math.random() * 20;
    const p95 = p50 + 30 + Math.random() * 50;
    const p99 = p95 + 50 + Math.random() * 100;

    return {
      avgLatencyMs: p50,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      throughputPerSecond: 1000 / p50,
      totalQueriesRun: queryCount
    };
  }

  generateQualityReport(): QualityReport {
    const stats = {
      totalBooks: sampleBooks.length,
      totalChunks: this.chunks.length,
      overallScore: 85 + Math.floor(Math.random() * 10),
      recommendations: [
        'Add more exercise-specific content',
        'Include video references',
        'Expand nutrition section'
      ]
    };

    return {
      timestamp: new Date().toISOString(),
      ...stats
    };
  }

  close(): void {
    // No-op for mock
  }
}

// ==================== Reset Function ====================

export function resetKnowledgeBaseMocks(): void {
  // All mock services create fresh data on instantiation
}

export { sampleBooks };

export default {
  loaderService: MockKnowledgeBaseLoaderService,
  populationService: MockVectorStorePopulationService,
  validationService: MockKnowledgeBaseValidationService,
  sampleBooks,
  resetAll: resetKnowledgeBaseMocks
};
