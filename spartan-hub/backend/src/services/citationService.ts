/**
 * Citation Service - Citation Formatting and Management
 *
 * Handles:
 * - Citation formatting (APA, Chicago, Harvard)
 * - Citation validation
 * - Citation embedding in responses
 * - Citation history tracking
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import logger from '../utils/logger';

export type CitationStyle = 'APA' | 'Chicago' | 'Harvard' | 'MLA';

export interface Citation {
  id: string;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  authors: string[];
  publicationYear: number;
  pageNumber?: number;
  formattedText: {
    APA: string;
    Chicago: string;
    Harvard: string;
  };
  createdAt: string;
}

export interface CitedQuote {
  quote: string;
  citation: string;
  style: CitationStyle;
  relevanceScore: number;
}

export interface CitationContext {
  decision: string;
  relatedChunkIds: string[];
  citations: Citation[];
  citationCount: number;
}

class CitationService {
  private static instance: CitationService;
  private db: DatabaseType | null = null;

  private constructor() {}

  static getInstance(): CitationService {
    if (!CitationService.instance) {
      CitationService.instance = new CitationService();
    }
    return CitationService.instance;
  }

  /**
   * Initialize Citation Service
   */
  public async initialize(database: DatabaseType): Promise<void> {
    try {
      this.db = database;
      this.createTablesIfNeeded();
      logger.info('CitationService initialized', {
        context: 'rag.citations',
        metadata: { service: 'citation_management' }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize CitationService', {
        context: 'rag.citations',
        metadata: { error: message }
      });
      throw error;
    }
  }

  /**
   * Format citation in specified style
   */
  public formatCitation(
    documentTitle: string,
    authors: string[],
    publicationYear: number,
    pageNumber?: number,
    style: CitationStyle = 'APA'
  ): string {
    const firstAuthor = authors[0] || 'Unknown';
    const authorList = this.formatAuthors(authors);

    switch (style) {
    case 'APA':
      return this.formatAPA(authorList, publicationYear, documentTitle, pageNumber);
    case 'Chicago':
      return this.formatChicago(authorList, publicationYear, documentTitle, pageNumber);
    case 'Harvard':
      return this.formatHarvard(authorList, publicationYear, documentTitle, pageNumber);
    case 'MLA':
      return this.formatMLA(authorList, publicationYear, documentTitle, pageNumber);
    default:
      return this.formatAPA(authorList, publicationYear, documentTitle, pageNumber);
    }
  }

  /**
   * Format in APA style
   */
  private formatAPA(
    authors: string,
    year: number,
    title: string,
    pageNumber?: number
  ): string {
    const page = pageNumber ? `, p. ${pageNumber}` : '';
    return `${authors} (${year}). ${title}${page}.`;
  }

  /**
   * Format in Chicago style (Notes and Bibliography)
   */
  private formatChicago(
    authors: string,
    year: number,
    title: string,
    pageNumber?: number
  ): string {
    const page = pageNumber ? `, ${pageNumber}` : '';
    return `${authors}, ${title} (${year})${page}.`;
  }

  /**
   * Format in Harvard style
   */
  private formatHarvard(
    authors: string,
    year: number,
    title: string,
    pageNumber?: number
  ): string {
    const page = pageNumber ? `:${pageNumber}` : '';
    return `${authors} ${year}. ${title}${page}.`;
  }

  /**
   * Format in MLA style
   */
  private formatMLA(
    authors: string,
    year: number,
    title: string,
    pageNumber?: number
  ): string {
    const page = pageNumber ? `, page ${pageNumber}` : '';
    return `${authors}. "${title}." ${year}${page}.`;
  }

  /**
   * Format multiple authors
   */
  private formatAuthors(authors: string[]): string {
    if (authors.length === 0) return 'Unknown';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
    return `${authors[0]} et al.`;
  }

  /**
   * Store citation
   */
  public storeCitation(citation: {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    authors: string[];
    publicationYear: number;
    pageNumber?: number;
  }): Citation {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const id = `cite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const formattedText = {
        APA: this.formatCitation(
          citation.documentTitle,
          citation.authors,
          citation.publicationYear,
          citation.pageNumber,
          'APA'
        ),
        Chicago: this.formatCitation(
          citation.documentTitle,
          citation.authors,
          citation.publicationYear,
          citation.pageNumber,
          'Chicago'
        ),
        Harvard: this.formatCitation(
          citation.documentTitle,
          citation.authors,
          citation.publicationYear,
          citation.pageNumber,
          'Harvard'
        )
      };

      this.db.prepare(`
        INSERT INTO rag_citations 
        (id, chunk_id, format_style, formatted_citation, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        citation.chunkId,
        'JSON',
        JSON.stringify(formattedText),
        now
      );

      logger.debug('Citation stored', {
        context: 'rag.citations',
        metadata: {
          citationId: id,
          documentTitle: citation.documentTitle
        }
      });

      return {
        id,
        chunkId: citation.chunkId,
        documentId: citation.documentId,
        documentTitle: citation.documentTitle,
        authors: citation.authors,
        publicationYear: citation.publicationYear,
        pageNumber: citation.pageNumber,
        formattedText,
        createdAt: now
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to store citation', {
        context: 'rag.citations',
        metadata: { error: message, documentTitle: citation.documentTitle }
      });
      throw error;
    }
  }

  /**
   * Get citation by chunk ID
   */
  public getCitationByChunk(chunkId: string): Citation | null {
    if (!this.db) return null;

    try {
      const row = this.db.prepare(`
        SELECT rc.*, rdc.document_id, rd.title, rd.authors, rd.publication_year
        FROM rag_citations rc
        JOIN rag_document_chunks rdc ON rc.chunk_id = rdc.id
        JOIN rag_documents rd ON rdc.document_id = rd.id
        WHERE rc.chunk_id = ?
        LIMIT 1
      `).get(chunkId) as any;

      if (!row) return null;

      const formattedText = JSON.parse(row.formatted_citation || '{}');
      return {
        id: row.id,
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentTitle: row.title,
        authors: JSON.parse(row.authors || '[]'),
        publicationYear: row.publication_year,
        formattedText,
        createdAt: row.created_at
      };
    } catch (error) {
      logger.error('Failed to get citation', {
        context: 'rag.citations',
        metadata: { error: String(error), chunkId }
      });
      return null;
    }
  }

  /**
   * Embed citation in text
   */
  public embedCitationInText(
    text: string,
    citations: Citation[],
    style: CitationStyle = 'APA'
  ): string {
    try {
      if (citations.length === 0) return text;

      const citationTexts = citations.map(c => {
        switch (style) {
        case 'APA':
          return c.formattedText.APA;
        case 'Chicago':
          return c.formattedText.Chicago;
        case 'Harvard':
          return c.formattedText.Harvard;
        default:
          return c.formattedText.APA;
        }
      });

      // Append citations at end of text
      const citationSection = `\n\n[Citations]\n${citationTexts.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
      return text + citationSection;
    } catch (error) {
      logger.error('Failed to embed citation', {
        context: 'rag.citations',
        metadata: { error: String(error), citationCount: citations.length }
      });
      return text;
    }
  }

  /**
   * Validate citation exists and is accurate
   */
  public validateCitation(citation: Citation): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!citation.documentTitle) errors.push('Document title is required');
    if (!citation.authors || citation.authors.length === 0) {
      errors.push('At least one author is required');
    }
    if (citation.publicationYear < 1900 || citation.publicationYear > new Date().getFullYear()) {
      errors.push('Publication year seems invalid');
    }

    // Validate formatted citations are not empty
    if (!citation.formattedText.APA) errors.push('APA format missing');
    if (!citation.formattedText.Chicago) errors.push('Chicago format missing');
    if (!citation.formattedText.Harvard) errors.push('Harvard format missing');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Link citation to Coach Vitalis decision
   */
  public linkCitationToDecision(
    decisionId: string,
    chunkId: string,
    relevanceScore: number = 0.85
  ): void {
    try {
      if (!this.db) throw new Error('Database not initialized');

      const id = `vcc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.db.prepare(`
        INSERT INTO vital_coach_citations 
        (id, decision_id, chunk_id, relevance_score, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        decisionId,
        chunkId,
        relevanceScore,
        new Date().toISOString()
      );

      logger.debug('Citation linked to decision', {
        context: 'rag.citations',
        metadata: {
          decisionId,
          chunkId,
          relevanceScore
        }
      });
    } catch (error) {
      logger.error('Failed to link citation to decision', {
        context: 'rag.citations',
        metadata: { error: String(error), decisionId }
      });
    }
  }

  /**
   * Get citations for a decision
   */
  public getCitationsForDecision(decisionId: string): Citation[] {
    if (!this.db) return [];

    try {
      const rows = this.db.prepare(`
        SELECT rc.*, rdc.chunk_id, rd.title, rd.authors, rd.publication_year
        FROM vital_coach_citations vcc
        JOIN rag_citations rc ON rc.chunk_id = vcc.chunk_id
        JOIN rag_document_chunks rdc ON rc.chunk_id = rdc.id
        JOIN rag_documents rd ON rdc.document_id = rd.id
        WHERE vcc.decision_id = ?
        ORDER BY vcc.relevance_score DESC
      `).all(decisionId) as any[];

      return rows.map(row => ({
        id: row.id,
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentTitle: row.title,
        authors: JSON.parse(row.authors || '[]'),
        publicationYear: row.publication_year,
        formattedText: JSON.parse(row.formatted_citation || '{}'),
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Failed to get citations for decision', {
        context: 'rag.citations',
        metadata: { error: String(error), decisionId }
      });
      return [];
    }
  }

  /**
   * Create database tables
   */
  private createTablesIfNeeded(): void {
    if (!this.db) return;

    // Tables created by ragDocumentService, ensure they exist
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS rag_citations (
          id TEXT PRIMARY KEY,
          chunk_id TEXT NOT NULL,
          format_style TEXT,
          formatted_citation TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.exec('CREATE INDEX IF NOT EXISTS idx_citations_chunk ON rag_citations(chunk_id)');

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS vital_coach_citations (
          id TEXT PRIMARY KEY,
          decision_id TEXT NOT NULL,
          chunk_id TEXT NOT NULL,
          relevance_score DECIMAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.exec('CREATE INDEX IF NOT EXISTS idx_coach_citations_decision ON vital_coach_citations(decision_id)');
    } catch (e) {
      // Tables might already exist
    }

    logger.info('Citation tables verified', {
      context: 'rag.citations',
      metadata: { database: 'initialized' }
    });
  }
}

export function getCitationService(): CitationService {
  return CitationService.getInstance();
}
