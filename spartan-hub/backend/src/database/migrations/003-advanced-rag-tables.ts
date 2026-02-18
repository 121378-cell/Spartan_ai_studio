/**
 * Database Migration: Advanced RAG Tables
 *
 * Creates tables for:
 * - advanced_rag_queries: Track decomposition, re-ranking, caching
 * - ranking_feedback: Store user feedback on result quality
 * - query_decompositions: Log decomposition history
 * - ranking_weights: Persist adaptive ranking model
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../../utils/logger';

export function createAdvancedRAGTables(db: DatabaseType): void {
  try {
    // Table 1: advanced_rag_queries
    // Tracks advanced RAG operations (decomposition, re-ranking, cache hits)
    db.exec(`
      CREATE TABLE IF NOT EXISTS advanced_rag_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        originalQuery TEXT NOT NULL,
        optimizedQuery TEXT,
        decomposed INTEGER DEFAULT 0,
        subQueriesCount INTEGER,
        resultsCount INTEGER,
        executionTimeMs INTEGER,
        cacheHit INTEGER DEFAULT 0,
        userRating TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_user_created ON advanced_rag_queries (userId, createdAt)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_decomposed ON advanced_rag_queries (decomposed)');

    logger.info('Created table: advanced_rag_queries', { context: 'database-migration' });

    // Table 2: ranking_feedback
    // Stores user feedback on individual results
    db.exec(`
      CREATE TABLE IF NOT EXISTS ranking_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queryId TEXT NOT NULL,
        chunkId TEXT NOT NULL,
        relevanceScore REAL,
        userScore INTEGER CHECK(userScore >= 0 AND userScore <= 5),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (queryId) REFERENCES advanced_rag_queries(id) ON DELETE CASCADE
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_query_chunk ON ranking_feedback (queryId, chunkId)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_score ON ranking_feedback (userScore)');

    logger.info('Created table: ranking_feedback', { context: 'database-migration' });

    // Table 3: query_decompositions
    // Logs query decomposition history for analysis
    db.exec(`
      CREATE TABLE IF NOT EXISTS query_decompositions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        queryId TEXT NOT NULL,
        originalQuery TEXT NOT NULL,
        subQueries TEXT NOT NULL,
        aggregationStrategy TEXT,
        totalTime INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (queryId) REFERENCES advanced_rag_queries(id) ON DELETE CASCADE
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_strategy ON query_decompositions (aggregationStrategy)');

    logger.info('Created table: query_decompositions', { context: 'database-migration' });

    // Table 4: ranking_weights
    // Persists adaptive ranking weights
    db.exec(`
      CREATE TABLE IF NOT EXISTS ranking_weights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factor TEXT UNIQUE NOT NULL,
        weight REAL NOT NULL CHECK(weight >= 0 AND weight <= 1),
        accuracy REAL CHECK(accuracy >= 0 AND accuracy <= 100),
        confidenceScore REAL CHECK(confidenceScore >= 0 AND confidenceScore <= 1),
        feedbackCount INTEGER DEFAULT 0,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_factor ON ranking_weights (factor)');

    logger.info('Created table: ranking_weights', { context: 'database-migration' });

    // Initialize ranking weights with default values
    const initWeights = db.prepare(`
      INSERT OR IGNORE INTO ranking_weights (factor, weight, accuracy, confidenceScore)
      VALUES (?, ?, ?, ?)
    `);

    const defaultWeights = [
      ['relevance', 0.5, 85.0, 0.95],
      ['recency', 0.15, 75.0, 0.80],
      ['authority', 0.15, 80.0, 0.85],
      ['clarity', 0.1, 70.0, 0.75],
      ['completeness', 0.1, 72.0, 0.78]
    ];

    defaultWeights.forEach(weight => {
      initWeights.run(...weight);
    });

    logger.info('Initialized ranking weights', { context: 'database-migration' });

    // Table 5: cache_metadata
    // Tracks cache performance and statistics
    db.exec(`
      CREATE TABLE IF NOT EXISTS cache_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT UNIQUE NOT NULL,
        queryHash TEXT UNIQUE NOT NULL,
        hitCount INTEGER DEFAULT 0,
        missCount INTEGER DEFAULT 0,
        lastAccessAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME
      )
    `);

    db.exec('CREATE INDEX IF NOT EXISTS idx_expires ON cache_metadata (expiresAt)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_hash ON cache_metadata (queryHash)');

    logger.info('Created table: cache_metadata', { context: 'database-migration' });

    logger.info('✅ Advanced RAG database migration completed successfully', {
      context: 'database-migration'
    });
  } catch (error) {
    logger.error('❌ Error creating advanced RAG tables', {
      context: 'database-migration',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
}

export default createAdvancedRAGTables;
