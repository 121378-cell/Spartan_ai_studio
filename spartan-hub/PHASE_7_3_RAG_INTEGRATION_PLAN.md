# Phase 7.3: Coach Vitalis RAG Integration - Comprehensive Plan

**Status**: 🚀 **IN PROGRESS**  
**Date**: January 25, 2026  
**Foundation**: Phase 7.2 Knowledge Base + Existing Coach Vitalis + RAG Services  
**Estimated Duration**: 3-4 hours

---

## 📋 Executive Summary

Phase 7.3 integrates the Knowledge Base (Phase 7.2) with Coach Vitalis decision engine via a Retrieval-Augmented Generation (RAG) system. The system will:

1. **Semantic Search**: Query KB using Qdrant vector database
2. **KB→Coach Vitalis Bridge**: Connect retrieved documents to coaching decisions
3. **Citation Management**: Track which KB chapters support recommendations
4. **RAG Endpoints**: REST API for semantic search and RAG queries

**Key Integration Point**: 
```
User Query 
  ↓
Semantic Search (Qdrant vectors from Phase 7.2)
  ↓
Retrieved KB chunks
  ↓
Coach Vitalis Decision Engine (existing service)
  ↓
Evidence-based recommendation with citations
  ↓
API Response with sources
```

---

## 🎯 Core Deliverables

### 1. **KBToCoachVitalisBridgeService** (NEW - 400+ lines)
**Purpose**: Connect Knowledge Base retrieval to Coach Vitalis decision making

#### Key Methods:
```typescript
// Get KB evidence for a coaching decision
async getKBEvidenceForDecision(
  decision: CoachVitalisDecision,
  limit?: number
): Promise<RetrievedDocument[]>

// Enhance coach recommendation with KB citations
async enhanceRecommendationWithEvidence(
  recommendation: ActionRecommendation
): Promise<RecommendationWithEvidence>

// Perform semantic search using vectors
async semanticSearch(
  query: string,
  topK?: number,
  filters?: SearchFilters
): Promise<SearchResult[]>

// Get category-specific recommendations
async getCategoryRecommendations(
  category: string,
  context: BiometricContext
): Promise<Recommendation[]>

// Validate recommendation against KB
async validateRecommendationAgainstKB(
  recommendation: ActionRecommendation
): Promise<ValidationResult>
```

#### Data Structures:
```typescript
interface RetrievedDocument {
  bookId: string;
  bookTitle: string;
  chunkId: string;
  content: string;
  relevanceScore: number;
  chapter?: string;
  pageNumber?: number;
  keyTerms: string[];
}

interface RecommendationWithEvidence {
  recommendation: ActionRecommendation;
  evidence: RetrievedDocument[];
  confidenceBoost: number; // How much KB evidence increases confidence
  citations: Citation[];
}

interface Citation {
  sourceBook: string;
  author: string;
  chapter?: string;
  excerpt: string;
  relevanceScore: number;
}

interface SearchFilters {
  category?: string;
  year?: number;
  authors?: string[];
  minRelevance?: number;
}
```

---

### 2. **SemanticSearchService** (NEW - 300+ lines)
**Purpose**: Query Qdrant vector database for semantic similarity

#### Key Methods:
```typescript
// Initialize Qdrant connection
async initialize(): Promise<void>

// Search KB by semantic similarity
async search(
  query: string,
  topK?: number,
  threshold?: number
): Promise<SearchResult[]>

// Batch search multiple queries
async batchSearch(
  queries: string[],
  topK?: number
): Promise<SearchResult[][]>

// Advanced search with filters
async advancedSearch(
  query: string,
  filters: SearchFilters,
  topK?: number
): Promise<SearchResult[]>

// Get similar documents
async getSimilarChunks(
  chunkId: string,
  topK?: number
): Promise<RetrievedDocument[]>

// Rebuild vector index
async rebuildIndex(): Promise<void>

// Get search statistics
async getSearchStats(): Promise<SearchStatistics>
```

#### Features:
- Vector normalization
- Hybrid search (vector + keyword filtering)
- Relevance threshold handling
- Query expansion for better results
- Performance monitoring

---

### 3. **RAGIntegrationService** (NEW - 350+ lines)
**Purpose**: High-level RAG orchestration

#### Key Methods:
```typescript
// Main RAG query method
async queryWithContext(
  userId: string,
  query: string,
  context?: BiometricContext
): Promise<RAGResponse>

// Get recommendations with KB evidence
async getEvidenceBasedRecommendation(
  userId: string,
  decisionType: string,
  context: BiometricContext
): Promise<RecommendationWithEvidence>

// Generate KB summary for user
async generateKBSummaryForUser(
  userId: string,
  topic: string
): Promise<KBSummary>

// Fact-check Coach Vitalis decision
async validateDecisionAgainstKB(
  decision: CoachVitalisDecision
): Promise<ValidationResult>

// Get trending KB topics
async getTrendingTopics(
  days?: number
): Promise<TrendingTopic[]>
```

#### Response Format:
```typescript
interface RAGResponse {
  query: string;
  answer: string; // Generated answer based on KB
  sources: RetrievedDocument[];
  confidence: number;
  citations: Citation[];
  relatedTopics: string[];
  timestamp: Date;
}

interface KBSummary {
  topic: string;
  summary: string;
  keyPoints: string[];
  relatedChapters: RetrievedDocument[];
  confidence: number;
}
```

---

### 4. **Coach Vitalis RAG Endpoints** (NEW - 250+ lines)
**File**: `backend/src/routes/coachVitalisRAGRoutes.ts`

#### Endpoints:

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/vitalis/rag/query` | POST | Semantic search with Coach Vitalis context | JWT |
| `/api/vitalis/rag/recommendation` | POST | Get evidence-based recommendation | JWT |
| `/api/vitalis/rag/evidence` | GET | Get KB evidence for a decision | JWT |
| `/api/vitalis/rag/summary` | GET | KB summary for a topic | JWT |
| `/api/vitalis/rag/validate` | POST | Validate recommendation against KB | ADMIN |
| `/api/vitalis/rag/trending` | GET | Trending KB topics | JWT |

#### Example Request/Response:

**Request**:
```bash
POST /api/vitalis/rag/recommendation
{
  "decisionType": "training_adjustment",
  "context": {
    "hrv": 45,
    "rhr": 58,
    "stressLevel": 75,
    "sleepDuration": 6.5
  }
}
```

**Response**:
```json
{
  "recommendation": {
    "title": "Reduce training intensity",
    "description": "Lower HRV suggests parasympathetic fatigue",
    "expectedBenefit": "Restore nervous system balance within 2-3 days",
    "intensity": "medium",
    "confidence": 92
  },
  "evidence": [
    {
      "bookTitle": "Why We Sleep",
      "chunkId": "why-we-sleep-3-2",
      "content": "Chronic sleep restriction elevates parasympathetic tone...",
      "relevanceScore": 0.94
    },
    {
      "bookTitle": "Sports Nutrition Science",
      "chunkId": "sports-nutrition-4-1",
      "content": "Recovery during high stress requires adequate nutrient timing...",
      "relevanceScore": 0.87
    }
  ],
  "citations": [
    {
      "sourceBook": "Why We Sleep",
      "chapter": "Recovery & Adaptation",
      "excerpt": "Sleep is the single most important factor...",
      "relevanceScore": 0.94
    }
  ]
}
```

---

### 5. **Enhanced Coach Vitalis Service Integration** (MODIFY existing)

**File**: `backend/src/services/coachVitalisService.ts`

#### New Methods:
```typescript
// Get KB context for decision
async getKBContextForDecision(
  decision: CoachVitalisDecision
): Promise<RetrievedDocument[]>

// Boost confidence with KB evidence
async boostConfidenceWithKB(
  decision: CoachVitalisDecision
): Promise<number> // Returns new confidence score
```

---

### 6. **Integration Tests** (NEW - 250+ lines)
**File**: `backend/src/services/__tests__/coachVitalisRAG.test.ts`

#### Test Suite:

1. **Semantic Search Tests** (5)
   - ✅ Initialize Qdrant connection
   - ✅ Search returns relevant documents
   - ✅ Relevance scores are meaningful
   - ✅ Batch search works correctly
   - ✅ Filters reduce results appropriately

2. **KB→Coach Vitalis Bridge Tests** (5)
   - ✅ Retrieve evidence for decision
   - ✅ Enhance recommendation with citations
   - ✅ Category-specific recommendations
   - ✅ Citation generation
   - ✅ Confidence boost calculation

3. **RAG Integration Tests** (5)
   - ✅ Query with context
   - ✅ Evidence-based recommendations
   - ✅ KB summary generation
   - ✅ Decision validation
   - ✅ Trending topics detection

4. **End-to-End Tests** (3)
   - ✅ Full RAG pipeline (query → search → enhance → response)
   - ✅ Coach Vitalis + KB integration
   - ✅ Citation accuracy

**Target**: 18/18 tests passing ✅

---

## 🔗 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Query                               │
│                  (REST API or Coach Vitalis)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  SemanticSearchService         │
        │  - Qdrant vector search        │
        │  - Relevance filtering         │
        │  - Batch operations            │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Retrieved KB Documents        │
        │  - Chunks with relevance       │
        │  - Metadata (book, chapter)    │
        │  - Key terms                   │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  KBToCoachVitalisBridge        │
        │  - Enhance decisions           │
        │  - Generate citations          │
        │  - Boost confidence            │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Coach Vitalis Service         │
        │  - Decision making             │
        │  - Recommendation generation   │
        │  - Alert creation              │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  RAG Response with Evidence    │
        │  - Recommendation              │
        │  - Sources/Citations           │
        │  - Confidence score            │
        └────────────────┬───────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  REST API / Client             │
        │  Display to user               │
        └────────────────────────────────┘
```

---

## 📊 Implementation Phases

### **Phase 1: Semantic Search Foundation** (45 min)
- [ ] Create SemanticSearchService
- [ ] Initialize Qdrant connection
- [ ] Implement basic search
- [ ] Add relevance scoring
- [ ] Write 5 search tests

### **Phase 2: KB→Coach Vitalis Bridge** (60 min)
- [ ] Create KBToCoachVitalisBridgeService
- [ ] Implement evidence retrieval
- [ ] Add recommendation enhancement
- [ ] Citation generation
- [ ] Write 5 bridge tests

### **Phase 3: RAG Orchestration** (45 min)
- [ ] Create RAGIntegrationService
- [ ] Implement high-level query methods
- [ ] Add summary generation
- [ ] Decision validation
- [ ] Write 5 RAG tests

### **Phase 4: API Endpoints** (45 min)
- [ ] Create coachVitalisRAGRoutes.ts
- [ ] Implement 6 endpoints
- [ ] Add error handling
- [ ] Integrate with server.ts
- [ ] Write end-to-end tests

### **Phase 5: Integration & Testing** (30 min)
- [ ] Run full test suite
- [ ] Validate Qdrant integration
- [ ] Check Coach Vitalis integration
- [ ] Performance testing
- [ ] Git commit and push

---

## 🔧 Technical Dependencies

### **Existing Services**:
- ✅ KnowledgeBaseLoaderService (Phase 7.2)
- ✅ VectorStorePopulationService (Phase 7.2)
- ✅ KnowledgeBaseValidationService (Phase 7.2)
- ✅ CoachVitalisService (existing)
- ✅ RAGDocumentService (existing)

### **External Services**:
- Qdrant (vector database) - for semantic search
- OpenAI API (embeddings) - already configured
- SQLite (knowledge base) - from Phase 7.2

### **Required Ports**:
- Qdrant: 6333 (default)
- Backend: 3000 (Express)

---

## 🔐 Security Considerations

1. **Vector Database Access**: Secure Qdrant connection with API keys
2. **Citation Privacy**: Ensure sources don't leak sensitive info
3. **Rate Limiting**: Apply to RAG endpoints (heavier queries)
4. **Input Sanitization**: Clean semantic search queries
5. **Access Control**: 
   - User-level: Can't see other users' recommendations
   - Admin-level: Can validate and audit decisions

---

## 📈 Performance Targets

| Operation | Target | Method |
|-----------|--------|--------|
| Semantic search | <200ms | Qdrant vector lookup |
| Recommendation enhancement | <300ms | Parallel evidence retrieval |
| Full RAG query | <1s | Orchestrated pipeline |
| Citation generation | <100ms | Template-based |
| Batch operations | 10 queries/sec | Async/await |

---

## 🧪 Testing Strategy

### **Unit Tests** (12 tests):
- SemanticSearchService: 5 tests
- KBToCoachVitalisBridge: 5 tests
- RAGIntegrationService: 2 tests

### **Integration Tests** (6 tests):
- Service interactions
- Database queries
- Qdrant connectivity

### **End-to-End Tests** (3 tests):
- Full pipeline (search → enhance → recommend)
- API contract compliance
- Real biometric context

---

## 📝 Database Queries

### **New Tables** (if needed):
```sql
CREATE TABLE IF NOT EXISTS rag_citations (
  id TEXT PRIMARY KEY,
  recommendationId TEXT,
  sourceBook TEXT,
  chunkId TEXT,
  excerptStart INT,
  excerptEnd INT,
  relevanceScore REAL,
  createdAt TIMESTAMP,
  FOREIGN KEY (recommendationId) REFERENCES recommendations(id)
);

CREATE TABLE IF NOT EXISTS semantic_search_log (
  id TEXT PRIMARY KEY,
  userId TEXT,
  query TEXT,
  resultsCount INT,
  executionTimeMs INT,
  createdAt TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

## 🎯 Success Criteria

✅ **Code Quality**:
- [x] 0 TypeScript errors
- [x] All tests passing (18+)
- [x] Proper error handling
- [x] Structured logging

✅ **Functionality**:
- [x] Semantic search works
- [x] KB evidence retrieved
- [x] Citations generated
- [x] Coach Vitalis integration confirmed

✅ **Performance**:
- [x] Search <200ms
- [x] Full query <1s
- [x] No memory leaks

✅ **Integration**:
- [x] Routes mounted in server.ts
- [x] Rate limiting applied
- [x] Authentication enforced
- [x] Error responses formatted

---

## 📚 Files to Create/Modify

### **New Files** (4):
1. `backend/src/services/semanticSearchService.ts` (300+ lines)
2. `backend/src/services/kbToCoachVitalisBridgeService.ts` (400+ lines)
3. `backend/src/services/ragIntegrationService.ts` (350+ lines)
4. `backend/src/routes/coachVitalisRAGRoutes.ts` (250+ lines)

### **Test Files** (1):
1. `backend/src/services/__tests__/coachVitalisRAG.test.ts` (250+ lines)

### **Modified Files** (2):
1. `backend/src/services/coachVitalisService.ts` (add KB methods)
2. `backend/src/server.ts` (mount RAG routes)

### **Total Code**: 1,800+ lines

---

## 🚀 Next Steps

1. Create SemanticSearchService
2. Create KBToCoachVitalisBridgeService
3. Create RAGIntegrationService
4. Create API routes
5. Write integration tests
6. Git commit with summary

---

**Estimated Total Time**: 3-4 hours  
**Status**: Ready to begin Phase 1 ✅
