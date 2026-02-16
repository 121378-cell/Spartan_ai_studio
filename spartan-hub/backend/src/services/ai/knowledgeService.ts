import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse') as any;
const Database = require('better-sqlite3');
type DatabaseType = any;
import axios from 'axios';
import similarity from 'compute-cosine-similarity';
import { logger } from '../../utils/logger';

// Configuration
const KNOWLEDGE_DIR = path.join(__dirname, '../../../data/knowledge');
const DB_PATH = path.join(__dirname, '../../../data/knowledge.db');
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const EMBEDDING_MODEL = 'nomic-embed-text'; // or 'llama3'

interface KnowledgeChunk {
    id?: number;
    doc_id: string;
    text: string;
    vector: number[];
    chunk_index: number;
}

interface OllamaResponse {
    embedding: number[];
}

export class KnowledgeService {
  private db: DatabaseType;

  constructor() {
    // Ensure data directory exists
    if (!fs.existsSync(path.dirname(DB_PATH))) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.initDb();
  }

  private initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT,
        text TEXT,
        vector TEXT, -- JSON string of float array
        chunk_index INTEGER,
        FOREIGN KEY(doc_id) REFERENCES documents(id)
      );
    `);
  }

  // --- Ingestion ---

  async ingestDocuments(): Promise<{ processed: number; errors: number }> {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      logger.warn(`Knowledge directory not found: ${KNOWLEDGE_DIR}`);
      return { processed: 0, errors: 0 };
    }

    const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
    let processed = 0;
    let errors = 0;

    for (const file of files) {
      if (this.isDocumentProcessed(file)) {
        continue; // Skip if already ingested
      }

      logger.info(`Processing knowledge file: ${file}`);
      try {
        await this.processFile(file);
        processed++;
      } catch (err: any) {
        logger.error(`Failed to process ${file}: ${err.message}`);
        errors++;
      }
    }

    return { processed, errors };
  }

  private isDocumentProcessed(filename: string): boolean {
    const row = this.db.prepare('SELECT id FROM documents WHERE filename = ?').get(filename);
    return Boolean(row);
  }

  private async processFile(filename: string) {
    const filePath = path.join(KNOWLEDGE_DIR, filename);
    const dataBuffer = fs.readFileSync(filePath);

    // Parse PDF
    const data = await pdf(dataBuffer);
    const {text} = data;

    // Chunk text (simple sliding window or paragraph based)
    const chunks = this.createChunks(text, 1000, 200); // chunk size ~1000 chars

    // Save document
    const docId = `${Date.now()}_${filename}`;
    this.db.prepare('INSERT INTO documents (id, filename) VALUES (?, ?)').run(docId, filename);

    // Generate embeddings and save chunks
    const insertStmt = this.db.prepare('INSERT INTO embeddings (doc_id, text, vector, chunk_index) VALUES (?, ?, ?, ?)');

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const vector = await this.generateEmbedding(chunk);
        if (vector) {
          insertStmt.run(docId, chunk, JSON.stringify(vector), i);
        }
      } catch (err) {
        logger.error(`Error embedding chunk ${i} of ${filename}: ${err}`);
      }
    }
  }

  private createChunks(text: string, chunkSize: number, overlap: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      currentChunk.push(word);
      currentLength += word.length + 1;

      if (currentLength >= chunkSize) {
        chunks.push(currentChunk.join(' '));
        // Overlap: keep last N words (approx)
        const overlapCount = Math.floor(overlap / 10); // rough estimate
        currentChunk = currentChunk.slice(-overlapCount);
        currentLength = currentChunk.join(' ').length + 1;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  // --- Embedding API (Ollama) ---

  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const response = await axios.post<OllamaResponse>(`${OLLAMA_HOST}/api/embeddings`, {
        model: EMBEDDING_MODEL,
        prompt: text
      });
      return response.data.embedding;
    } catch (error: any) {
      // Fallback for newer Ollama API which uses /api/embed (if needed, but /api/embeddings is standard for now)
      // Or the model might be different.
      logger.error(`Ollama embedding error: ${error.message}`);
      return null;
    }
  }

  // --- Search ---

  async search(query: string, limit: number = 3): Promise<{ text: string; score: number; source: string }[]> {
    const queryVector = await this.generateEmbedding(query);
    if (!queryVector) {
      return [];
    }

    // Retrieve all chunks (brute force cosine similarity for simplicity - good enough for <10k chunks)
    // For production, use a vector extension or specialized DB.
    const rows = this.db.prepare(`
        SELECT e.text, e.vector, d.filename 
        FROM embeddings e 
        JOIN documents d ON e.doc_id = d.id
    `).all() as any[];

    const results = rows.map(row => {
      const vector = JSON.parse(row.vector);
      const score = similarity(queryVector, vector);
      return {
        text: row.text,
        score: score || 0, // handle null
        source: row.filename
      };
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }
}

export const knowledgeService = new KnowledgeService();
