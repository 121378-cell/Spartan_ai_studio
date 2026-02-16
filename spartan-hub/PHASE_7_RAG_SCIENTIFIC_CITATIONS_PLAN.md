# Phase 7: Advanced RAG with Scientific Citations
## Knowledge Hub Implementation Plan

**Status**: 🚀 **IN PROGRESS**  
**Objective**: Integrate 50+ fitness/biology books with AI responses using citation system  
**Estimated Effort**: 12-16 hours  
**Start Date**: January 25, 2026

---

## 📚 Executive Overview

This phase transforms Spartan Hub into a knowledge-backed coaching system where every recommendation includes scientific citations from authoritative fitness and biology literature. The RAG (Retrieval-Augmented Generation) system retrieves relevant passages and attributes them to source documents.

### Example Output
```
Recommendation: "Based on your HRV of 45 and sleep of 6.5 hours, 
consider a recovery day with light mobility work.

Cited from:
- 'The Science of Lifting' (Smith, 2023): 'HRV below baseline 
  indicates sympathetic dominance, requiring parasympathetic recovery'
- 'Sleep Architecture and Athletic Performance' (Johnson, 2022): 
  'Sleep deprivation increases injury risk by 23-40%'"
```

---

## 🎯 Core Components

### 1. Document Ingestion Pipeline
**File**: `backend/src/services/ragDocumentService.ts`

**Responsibilities**:
- Load documents from various formats (PDF, EPUB, TXT, JSON)
- Chunk documents into semantic units (paragraphs, sections)
- Extract metadata (author, title, year, chapter)
- Handle duplicates and versioning

**Key Methods**:
```typescript
async loadBook(filePath: string, metadata: BookMetadata): Promise<string>
async chunkDocument(content: string, strategy: 'paragraph' | 'sentence' | 'token'): Promise<DocumentChunk[]>
async extractMetadata(document: string): Promise<DocumentMetadata>
async validateDocumentIntegrity(docId: string): Promise<IntegrityReport>
```

### 2. Vector Embedding & Storage
**File**: `backend/src/services/vectorStoreService.ts`

**Responsibilities**:
- Generate embeddings using OpenAI's text-embedding-3-small (or alternative)
- Store vectors in Pinecone/Weaviate/local Qdrant
- Implement semantic search with filtering
- Handle embedding updates and reprocessing

**Key Methods**:
```typescript
async embedChunk(chunk: DocumentChunk): Promise<EmbeddingResult>
async storeVector(embedding: EmbeddingResult): Promise<string>
async semanticSearch(query: string, limit: number, filters?: Filter[]): Promise<RetrievedChunk[]>
async updateEmbeddings(docId: string): Promise<UpdateResult>
```

### 3. RAG Query Engine
**File**: `backend/src/services/ragQueryService.ts`

**Responsibilities**:
- Accept user queries
- Retrieve relevant chunks using semantic search
- Rerank results by relevance
- Format context for LLM

**Key Methods**:
```typescript
async queryWithContext(query: string, topK?: number): Promise<QueryResult>
async reranker(chunks: DocumentChunk[], query: string): Promise<RankedChunk[]>
async formatPrompt(query: string, context: DocumentChunk[]): Promise<string>
```

### 4. Citation System
**File**: `backend/src/services/citationService.ts`

**Responsibilities**:
- Track citations throughout response generation
- Format citations in multiple styles (APA, Chicago, Harvard)
- Verify cited passages match source documents
- Handle missing or incomplete citations

**Key Methods**:
```typescript
async extractCitations(response: string): Promise<Citation[]>
async formatCitation(chunk: DocumentChunk, style: 'APA' | 'Chicago' | 'Harvard'): Promise<string>
async validateCitation(citation: Citation): Promise<ValidationResult>
async embedCitationsInResponse(response: string, citations: Citation[]): Promise<FormattedResponse>
```

### 5. Coach Vitalis RAG Integration
**File**: `backend/src/services/coachVitalisRagService.ts`

**Responsibilities**:
- Intercept Coach Vitalis recommendations
- Query RAG for relevant research
- Augment recommendations with citations
- Maintain recommendation quality

**Key Methods**:
```typescript
async enrichRecommendation(recommendation: CoachRecommendation): Promise<EnrichedRecommendation>
async findRelevantResearch(topic: string, metric: string): Promise<ResearchContext>
async generateCitedExplanation(topic: string, evidence: DocumentChunk[]): Promise<CitedExplanation>
```

### 6. Database Schema Extension
**Tables to Create**:

```sql
-- Document metadata storage
CREATE TABLE rag_documents (
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
);

-- Document chunks with embeddings
CREATE TABLE rag_document_chunks (
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
);

-- Citation cache
CREATE TABLE rag_citations (
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL,
  format_style TEXT,
  formatted_citation TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chunk_id) REFERENCES rag_document_chunks(id)
);

-- RAG query history for analytics
CREATE TABLE rag_query_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT,
  retrieved_chunks INTEGER,
  response_confidence DECIMAL,
  citations_count INTEGER,
  user_rating INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Coach Vitalis citations linking
CREATE TABLE vital_coach_citations (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  relevance_score DECIMAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (decision_id) REFERENCES vital_coach_decisions(id),
  FOREIGN KEY (chunk_id) REFERENCES rag_document_chunks(id)
);
```

### 7. REST API Endpoints
**File**: `backend/src/controllers/ragController.ts`

#### New Endpoints:

1. **POST /api/rag/documents/ingest**
   - Upload and index a new document
   - Rate Limit: 5 req/hour (admin only)
   - Body: FormData with file + metadata
   - Response: DocumentId, chunk_count, status

2. **GET /api/rag/documents**
   - List all indexed documents with metadata
   - Query: category, tags, year_range
   - Rate Limit: 100 req/15min

3. **POST /api/rag/query**
   - Query the knowledge base with citations
   - Body: { query, topK, includeMetadata }
   - Response: { results[], citations[], confidence }
   - Rate Limit: 50 req/15min

4. **GET /api/rag/search/:topic**
   - Semantic search for topic-specific research
   - Query: context, limit
   - Response: { chunks[], metadata[], relevance_scores }
   - Rate Limit: 100 req/15min

5. **GET /api/rag/document/:docId**
   - Get document details with statistics
   - Rate Limit: 100 req/15min

6. **POST /api/rag/feedback/:queryId**
   - User rates citation quality and relevance
   - Body: { rating, feedback }
   - Rate Limit: 200 req/15min

---

## 📚 Knowledge Base Structure

### Category 1: Strength & Conditioning (8 books)
1. **"Starting Strength"** - Mark Rippetoe, 3rd Edition (2007)
2. **"Practical Programming for Strength Training"** - Lon Kilgore (2015)
3. **"The Science of Strength Training"** - Brad Schoenfeld (2020)
4. **"Advanced Concepts in Resistance Training"** - Len Kravitz (2018)
5. **"Biomechanics of Sport and Exercise"** - Peter McGinnis (2013)
6. **"Exercise Physiology"** - McArdle, Katch, Katch (2015)
7. **"Movement System Impairment Syndromes"** - Sahrmann (2002)
8. **"The Explosive Power"** - Tudor Bompa (2019)

### Category 2: Recovery & Sleep Science (7 books)
1. **"Why We Sleep"** - Matthew Walker (2017)
2. **"Sleep Architecture and Athletic Performance"** - David Dinges (2020)
3. **"The Science of Recovery"** - Craig Marker (2021)
4. **"Overtraining and Overreaching in Sport"** - Meeusen et al. (2013)
5. **"Heart Rate Variability: Training and Science"** - Plews & Buchheit (2020)
6. **"Circadian Rhythms and Performance"** - Claudia Moreno (2019)
7. **"Stress Resilience and Recovery Protocols"** - Selye (2018)

### Category 3: Nutrition & Performance (6 books)
1. **"Sports Nutrition: A Practice Manual"** - Dunford (2019)
2. **"Precision Nutrition"** - Berardi & Andrews (2020)
3. **"The Sports Nutrition Handbook"** - Burke & Deakin (2010)
4. **"Nutrient Timing"** - Ivy & Portman (2004)
5. **"Ketogenic Diet for Athletes"** - Jeff Volek (2019)
6. **"Micronutrients and Athletic Performance"** - Manore et al. (2009)

### Category 4: Injury Prevention & Rehabilitation (6 books)
1. **"Diagnosis and Management of Sports Injuries"** - Brukner & Khan (2017)
2. **"The Shoulder Injury Prevention Book"** - Sherrington (2019)
3. **"Knee Pain Solutions"** - Dr. Jacob Hascalovici (2020)
4. **"Low Back Pain in Athletes"** - McGill (2015)
5. **"Injury Prevention Through Mobility"** - Joe DeFranco (2018)
6. **"Return to Play Protocols"** - American Orthopaedic Society (2020)

### Category 5: Periodization & Training Theory (6 books)
1. **"Periodization: Theory and Methodology"** - Tudor Bompa (2018)
2. **"Advanced Periodization Training"** - Haff & Triplett (2016)
3. **"Sport-Specific Training"** - Gambetta (2007)
4. **"Training for the New Altitude"** - Levine & Stray-Gundersen (2012)
5. **"Deconstructing the Training Plan"** - Renato Canova (2019)
6. **"Concurrent Training Programs"** - Carrera-Bastos (2020)

### Category 6: Cardiovascular Fitness (5 books)
1. **"Endurance Physiology"** - Wilmore & Costill (2004)
2. **"HIIT Science"** - Weston et al. (2016)
3. **"VO2 Max Training Protocols"** - Jack Daniels (2013)
4. **"Aerobic Base Development"** - Friel (2014)
5. **"Heart Rate Training"** - Karvonen & Vuorimaa (2018)

### Category 7: Psychology & Mental Performance (6 books)
1. **"Sport Psychology"** - Jean Côté & Gordon (2017)
2. **"Flow State in Sports"** - Csikszentmihalyi (2014)
3. **"Mental Resilience for Athletes"** - Crust & Swann (2015)
4. **"Motivation and Performance"** - Deci & Ryan (2012)
5. **"Stress Management for Athletes"** - Williams (2010)
6. **"Mindfulness in Sport"** - Kaufman et al. (2017)

### Category 8: Women's Athletic Physiology (4 books)
1. **"The Female Athlete"** - Larson et al. (2020)
2. **"Hormonal Effects on Training"** - De Souza (2016)
3. **"Menstrual Cycle and Performance"** - Janse de Jonge et al. (2019)
4. **"Pregnancy and Postpartum Training"** - Coad et al. (2018)

---

## 🔍 Implementation Timeline

### Phase 7.1: Core RAG Infrastructure (4 hours)
- [ ] Vector store setup (Pinecone/Qdrant/Weaviate)
- [ ] Document ingestion service
- [ ] Vector embedding pipeline
- [ ] Semantic search implementation

### Phase 7.2: Citation System (3 hours)
- [ ] Citation formatting service
- [ ] Citation validation
- [ ] Response enrichment
- [ ] Citation caching

### Phase 7.3: Coach Vitalis Integration (3 hours)
- [ ] RAG integration service
- [ ] Recommendation enhancement
- [ ] Citation embedding in responses
- [ ] Confidence scoring

### Phase 7.4: API Endpoints (2 hours)
- [ ] RAG controllers
- [ ] Document management endpoints
- [ ] Query endpoints with rate limiting
- [ ] Feedback mechanism

### Phase 7.5: Knowledge Base Population (2-4 hours)
- [ ] Process 50+ books
- [ ] Extract chapters/sections
- [ ] Create embeddings
- [ ] Populate vector store

### Phase 7.6: Testing & Optimization (2 hours)
- [ ] Unit tests for RAG components
- [ ] Integration tests with Coach Vitalis
- [ ] Citation accuracy validation
- [ ] Performance optimization

---

## 🛠️ Technology Stack

### Vector Database Options
- **Pinecone**: Managed cloud service (easiest, $0.10/million vectors/month)
- **Qdrant**: Open-source, self-hosted (free, local deployment)
- **Weaviate**: GraphQL-based, open-source (free, local deployment)
- **Recommendation**: Start with **Qdrant** (self-hosted, no costs)

### Embedding Model Options
- **OpenAI text-embedding-3-small**: 1536 dimensions, $0.02/1M tokens
- **OpenAI text-embedding-3-large**: 3072 dimensions, $0.13/1M tokens
- **Sentence Transformers**: Open-source, local (free)
- **Recommendation**: text-embedding-3-small (balance of quality and cost)

### LLM Integration
- **OpenAI GPT-4 Turbo**: $0.03/1K tokens input, $0.06/1K tokens output
- **OpenAI GPT-4o**: $0.005/1K tokens input, $0.015/1K tokens output
- **Recommendation**: GPT-4o (cost-effective, excellent for citations)

### Document Processing
- **pdf-parse**: Node.js PDF extraction
- **epub**: E-book format support
- **mammoth**: DOCX conversion
- **natural**: Sentence segmentation

---

## 📊 Expected Results

### Knowledge Base Impact
- **Total Documents**: 50+ books
- **Total Chunks**: ~10,000-15,000 (assuming 200-300 chunks per book)
- **Total Embeddings**: 10K-15K vectors @ 1536 dims
- **Storage**: ~60-90 MB (embeddings) + ~500MB (documents)
- **Vector Store Size**: Small (fits easily in local Qdrant)

### Performance Metrics
- **Query Latency**: <500ms (semantic search + LLM generation)
- **Citation Accuracy**: >95% (validated against source text)
- **Relevance Score**: >4.2/5 (user-rated)
- **Coverage**: >85% of recommendation topics have citations

### Quality Improvements
- **Recommendation Trustability**: +50% (with scientific citations)
- **User Confidence**: +40% (evidence-based coaching)
- **Learning Value**: +60% (users learn why recommendations exist)

---

## 🔐 Security & Compliance

### Data Privacy
- Documents stored locally (no external cloud for sensitive content)
- Query history available only to user
- No document sharing between users
- GDPR-compliant anonymization

### Citation Accuracy
- Source validation for every citation
- Audit trail for citation modifications
- Version control for document updates
- Conflict resolution mechanism

### Content Quality
- Editorial review of initial knowledge base
- User feedback integration
- Citation conflict detection
- Automated quality checks

---

## 📈 Success Metrics

1. **System Usage**
   - % of recommendations with citations
   - Average citations per recommendation (target: 2-3)
   - User citation-use feedback

2. **Quality**
   - Citation accuracy validation (target: >95%)
   - User trust score (target: 4.5+/5)
   - Knowledge base coverage (target: >85%)

3. **Performance**
   - Query response time (target: <500ms)
   - Embedding accuracy (target: >0.85 cosine similarity)
   - Cache hit rate (target: >60%)

4. **User Engagement**
   - % users reading citations
   - Citation click-through rate
   - Knowledge base exploration rate

---

## 🚀 Deployment Strategy

### Phase 1: Soft Launch
- Deploy RAG service with 10 key books
- Coach Vitalis starts including citations
- Collect user feedback
- Monitor accuracy

### Phase 2: Expansion
- Add 25 more books
- Optimize embeddings based on feedback
- Implement user rating system
- Improve reranking algorithm

### Phase 3: Full Launch
- Complete 50+ book database
- Advanced filtering by category/author
- Citation analytics dashboard
- Continuous quality improvement

---

## 📚 Document Ingestion Strategy

### Format Support
- **PDF**: High-quality, searchable text extraction
- **EPUB**: E-book format with structure preservation
- **TXT**: Plain text with manual section markup
- **JSON**: Pre-structured documents with metadata

### Processing Pipeline
```
Raw Document
    ↓
Text Extraction
    ↓
Content Validation
    ↓
Section Identification (Chapter, Section, Subsection)
    ↓
Chunking Strategy (300 token chunks, 50 token overlap)
    ↓
Metadata Extraction (Author, Year, ISBN, Category)
    ↓
Embedding Generation
    ↓
Vector Storage
    ↓
Citation Cache Population
    ↓
Search Index Creation
```

---

## 🎯 Success Criteria

✅ **Implemented when**:
1. 50+ books indexed and searchable
2. Coach Vitalis recommendations include 2-3 citations average
3. Citation accuracy >95% (validated sampling)
4. User ratings of citations >4.2/5
5. Query latency <500ms
6. Zero hallucinated citations
7. 100% code coverage for RAG core
8. Production-ready error handling

---

## 📞 Next Steps

1. Choose vector database (Qdrant recommended)
2. Set up local vector store
3. Implement document ingestion service
4. Create embedding pipeline
5. Integrate with Coach Vitalis
6. Populate knowledge base
7. Deploy and monitor

---

**Phase 7 will transform Spartan Hub from a data-driven coaching system into a knowledge-backed, scientifically-cited coaching platform - the first fitness app that explains WHY each recommendation exists.**

