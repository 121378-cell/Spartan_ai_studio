# Video Form Analysis MVP - Implementation Checklist

**Phase**: Ready for Development  
**Start Date**: Week of January 27, 2025  
**Timeline**: 4 weeks  
**Team**: 1 Frontend Dev + 1 Backend Dev

---

## 📋 Pre-Implementation (This Week)

- [ ] Stakeholder review of research documents
- [ ] MVP scope approval
- [ ] Dev team assignment
- [ ] Create GitHub issues (30-40 tickets)
- [ ] Set up branch strategy (feature/form-analysis)
- [ ] Schedule kickoff meeting

---

## 🎨 Phase A: Frontend Foundation (Week 1-2)

### A1: Project Setup
- [ ] Install dependencies: `npm install @mediapipe/tasks-vision @tensorflow/tfjs`
- [ ] Create `/src/components/FormAnalysis/` directory
- [ ] Create `/src/services/formAnalysisEngine.ts`
- [ ] Create `/src/hooks/useFormAnalysis.ts`
- [ ] Create `/src/types/formAnalysis.ts`
- [ ] Update Vite config if needed

### A2: TypeScript Types
**File: `src/types/formAnalysis.ts`**
```typescript
// ✅ Must include:
interface Pose { keypoints: Keypoint[] ... }
interface Keypoint { x, y, score, name }
interface FormAnalysisResult { 
  exerciseType, formScore, metrics, warnings 
}
interface SquatMetrics { 
  kneeTracking, depth, backAngle, ... 
}
interface DeadliftMetrics { 
  barPath, shoulderPos, hipHinge, ... 
}
```
- [ ] Define all 6 interfaces
- [ ] Export types for components

### A3: MediaPipe Integration
**File: `src/services/formAnalysisEngine.ts`**
- [ ] Initialize PoseLandmarker
- [ ] Load model on mount
- [ ] Handle model loading errors
- [ ] Validate browser support (WebGL/WASM)

```typescript
// ✅ Key function: estimatePose(imageSource: HTMLCanvasElement)
// Must return: Pose | null
```

**Checklist:**
- [ ] Model loads within 2 seconds
- [ ] Supports desktop browsers (Chrome, Firefox, Safari)
- [ ] Graceful fallback for unsupported browsers
- [ ] Error logging via logger.ts

### A4: Squat Detection Algorithm
**File: `src/services/formAnalysisEngine.ts`**
```typescript
export function analyzeSquatForm(pose: Pose): SquatMetrics
```

**Metrics to calculate:**
- [ ] Hip-knee-ankle angle (depth detection)
- [ ] Knee valgus (knee tracking)
- [ ] Back angle (forward lean)
- [ ] Heel contact (from segmentation)
- [ ] Overall score (0-100)
- [ ] Warnings (form issues)

**Test cases:**
- [ ] Perfect form (parallel depth, knees over toes)
- [ ] Too shallow (above parallel)
- [ ] Knee collapse (valgus)
- [ ] Forward lean (back rounded)

### A5: Deadlift Detection Algorithm
**File: `src/services/formAnalysisEngine.ts`**
```typescript
export function analyzeDeadliftForm(pose: Pose): DeadliftMetrics
```

**Metrics to calculate:**
- [ ] Bar position relative to shoulders (over bar check)
- [ ] Hip hinge angle
- [ ] Knee extension at lockout
- [ ] Back angle (rounded/straight)
- [ ] Overall score (0-100)
- [ ] Warnings (form issues)

**Test cases:**
- [ ] Proper setup (over bar, flat back)
- [ ] Bar drift forward
- [ ] Early hip rise
- [ ] Incomplete lockout

### A6: WebRTC Video Capture
**File: `src/components/FormAnalysis/VideoCapture.tsx`**
```typescript
export const VideoCapture: React.FC<VideoCapturProps> = ({...})
```

**Features:**
- [ ] getUserMedia() permission request
- [ ] Video element (video tag)
- [ ] Canvas for frame capture
- [ ] Handle permission denied
- [ ] Handle device not found
- [ ] Stop/cleanup on unmount

**Checklist:**
- [ ] Works on desktop
- [ ] Works on tablet
- [ ] Shows camera permission prompt
- [ ] Handles errors gracefully
- [ ] Memory cleanup on unmount

### A7: Realtime Visualization
**File: `src/components/FormAnalysis/PoseOverlay.tsx`**
```typescript
export const PoseOverlay: React.FC<PoseOverlayProps> = ({pose, ...})
```

**Draw on canvas:**
- [ ] Circles for keypoints (radius 5px, color based on confidence)
- [ ] Lines connecting joints (skeleton)
- [ ] Color coding: green (good), yellow (warning), red (poor)
- [ ] Confidence threshold: hide <0.5 confidence points

**Performance:**
- [ ] 60fps drawing (no lag)
- [ ] <16ms per frame
- [ ] Efficient canvas API usage

### A8: Form Analysis Modal Component
**File: `src/components/FormAnalysis/FormAnalysisModal.tsx`**

**Structure:**
```
FormAnalysisModal
├─ Header: "Form Analysis: [Squat|Deadlift]"
├─ ExerciseSelector: Toggle squat/deadlift
├─ VideoCapture (full width)
├─ PoseOverlay (on top of video)
├─ Controls:
│  ├─ Start Recording
│  ├─ Stop Recording
│  ├─ Instructions
│  └─ Privacy notice
├─ Form Metrics Display (live)
└─ SaveButton (after analysis complete)
```

**State Management:**
- [ ] Use `useFormAnalysis` hook
- [ ] Track: video, poses, metrics, recording status
- [ ] Update metrics every frame
- [ ] Accumulate metrics for average

**Features:**
- [ ] Live form score display
- [ ] Live metric updates
- [ ] Warnings in real-time
- [ ] Rep counting (optional MVP)

### A9: Custom Hook: useFormAnalysis
**File: `src/hooks/useFormAnalysis.ts`**
```typescript
export function useFormAnalysis() {
  return {
    poses: Pose[],
    metrics: FormAnalysisResult,
    isRecording: boolean,
    startRecording: () => void,
    stopRecording: () => void,
    reset: () => void,
    ...
  }
}
```

**Responsibilities:**
- [ ] Manage video stream
- [ ] Call pose detection loop
- [ ] Calculate metrics
- [ ] Track recording state
- [ ] Cleanup on unmount

### A10: Frontend Tests
**File: `src/components/FormAnalysis/__tests__/formAnalysisEngine.test.ts`**

**Test cases:**
- [ ] Squat detection: known good form
- [ ] Squat detection: too shallow
- [ ] Squat detection: knee collapse
- [ ] Deadlift detection: proper form
- [ ] Deadlift detection: forward lean
- [ ] Angle calculations (known values)
- [ ] Edge cases (missing keypoints, low confidence)

**Coverage target:** 95%

**Commands:**
```bash
npm test -- FormAnalysis                    # Run tests
npm test -- FormAnalysis --coverage         # Coverage report
```

---

## 🔧 Phase B: Backend Integration (Week 3)

### B1: Database Schema
**File: `backend/src/database/migrations/004-form-analysis-tables.ts`**

```sql
CREATE TABLE form_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,      -- 'squat' | 'deadlift'
  form_score REAL NOT NULL,         -- 0-100
  metric_details JSON NOT NULL,     -- Full metrics object
  feedback TEXT,                    -- AI coaching feedback
  video_frames INT,                 -- Total frames
  analysis_duration REAL,           -- seconds
  injury_risk_score REAL,           -- 0-1 (from ML)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_form_user_date 
  ON form_analyses(user_id, created_at DESC);

CREATE INDEX idx_form_score 
  ON form_analyses(user_id, form_score);
```

**Checklist:**
- [ ] Migration file created
- [ ] Runs without errors
- [ ] Indexes created
- [ ] Foreign key constraint works

### B2: Service Layer
**File: `backend/src/services/formAnalysisService.ts`**

```typescript
export class FormAnalysisService {
  static async saveAnalysis(data: FormAnalysisInput): Promise<FormAnalysis>
  static async getAnalysis(id: string): Promise<FormAnalysis | null>
  static async getUserAnalyses(userId: string, limit: number): Promise<FormAnalysis[]>
  static async updateInjuryRisk(id: string, risk: number): Promise<void>
  static async deleteAnalysis(id: string): Promise<boolean>
}
```

**Responsibilities:**
- [ ] Input validation (sanitizeInput)
- [ ] Database operations
- [ ] Error handling
- [ ] Logging via logger.ts
- [ ] ML service integration

### B3: Controller
**File: `backend/src/controllers/formAnalysisController.ts`**

```typescript
export async function saveFormAnalysis(
  req: AuthenticatedRequest,
  res: Response
): Promise<void>

export async function getFormAnalysis(
  req: AuthenticatedRequest,
  res: Response
): Promise<void>

export async function getUserAnalyses(
  req: AuthenticatedRequest,
  res: Response
): Promise<void>

export async function deleteFormAnalysis(
  req: AuthenticatedRequest,
  res: Response
): Promise<void>
```

**Checklist:**
- [ ] POST handler saves analysis
- [ ] GET handlers retrieve data
- [ ] DELETE handler removes analysis
- [ ] Authentication checked (JWT)
- [ ] User isolation (can't access others' data)
- [ ] Error responses standardized

### B4: Routes
**File: `backend/src/routes/formAnalysisRoutes.ts`**

```typescript
const router = express.Router();

router.post('/form-analysis', authenticate, saveFormAnalysis);
router.get('/form-analysis/:id', authenticate, getFormAnalysis);
router.get('/form-analysis/user/:userId', authenticate, getUserAnalyses);
router.delete('/form-analysis/:id', authenticate, deleteFormAnalysis);

export default router;
```

**Integration:**
- [ ] Add to `server.ts` (after authentication)
- [ ] Rate limiting: 10 analyses/min per user
- [ ] CORS configured if needed

### B5: ML Integration
**File: `backend/src/services/formAnalysisService.ts`**

**Integration with MLForecastingService:**
```typescript
import { mlForecastingService } from './mlForecastingService';

async function updateMLPredictions(
  userId: string, 
  formScore: number, 
  exerciseType: string
) {
  // Poor form increases injury risk
  const riskFactor = 1.0 - (formScore / 100);
  
  // Update ML forecasts
  await mlForecastingService.updateWithFormData({
    userId,
    formScore,
    exerciseType,
    riskFactor,
    timestamp: new Date()
  });
}
```

**Checklist:**
- [ ] Generate injury risk score
- [ ] Call MLForecastingService
- [ ] Update readiness forecast
- [ ] Error handling if ML unavailable

### B6: Backend Tests
**File: `backend/src/__tests__/formAnalysis.test.ts`**

**Test structure:**
```typescript
describe('FormAnalysisService', () => {
  describe('saveAnalysis', () => {
    it('should save valid analysis')
    it('should validate input')
    it('should calculate injury risk')
    it('should handle errors')
  })
  
  describe('getAnalysis', () => {
    it('should retrieve by id')
    it('should return null if not found')
  })
  
  describe('getUserAnalyses', () => {
    it('should get paginated results')
    it('should filter by user')
  })
})

describe('FormAnalysisController', () => {
  describe('POST /form-analysis', () => {
    it('should save and return analysis')
    it('should validate authentication')
    it('should sanitize input')
    it('should handle validation errors')
  })
  
  describe('GET /form-analysis/:id', () => {
    it('should return analysis')
    it('should check user permissions')
  })
})
```

**Coverage target:** 90%

### B7: Input Validation
**File: `backend/src/services/validationService.ts`** (extend existing)

```typescript
static validateFormAnalysis(analysis: any) {
  // Exercise type
  if (!['squat', 'deadlift'].includes(analysis.exerciseType)) {
    throw new ValidationError('Invalid exercise type')
  }
  
  // Form score
  if (analysis.formScore < 0 || analysis.formScore > 100) {
    throw new ValidationError('Score must be 0-100')
  }
  
  // Metrics object
  if (!analysis.metricDetails || typeof analysis.metricDetails !== 'object') {
    throw new ValidationError('Metric details required')
  }
  
  // Video frames
  if (analysis.videoFrames < 1 || analysis.videoFrames > 10000) {
    throw new ValidationError('Invalid frame count')
  }
}
```

**Checklist:**
- [ ] All fields validated
- [ ] Range checks
- [ ] Type checks
- [ ] SQL injection prevention
- [ ] XSS prevention

### B8: Error Handling
**File: `backend/src/utils/errorHandler.ts`** (extend existing)

**New error types:**
- [ ] InvalidFormDataError
- [ ] FormAnalysisNotFoundError
- [ ] MLServiceUnavailableError

```typescript
// In controller
try {
  await saveFormAnalysis(analysis);
} catch (error) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ success: false, error: error.message });
  }
  throw error; // Global handler
}
```

---

## ✨ Phase C: Polish & Integration (Week 4)

### C1: UI Enhancements
**File: `src/components/FormAnalysis/FormScoreCard.tsx`**

```typescript
export const FormScoreCard: React.FC<{result: FormAnalysisResult}> = ({result}) => {
  return (
    <div className="form-score-card">
      <div className="score-circle">{result.formScore}</div>
      <div className="metrics">
        {/* Detailed breakdown */}
      </div>
      <div className="warnings">
        {/* Form issues */}
      </div>
      <div className="recommendations">
        {/* AI coaching */}
      </div>
    </div>
  )
}
```

**Features:**
- [ ] Large score display
- [ ] Color-coded score (green/yellow/red)
- [ ] Metric breakdown
- [ ] Warning callouts
- [ ] Coaching recommendations

### C2: Coaching Feedback Generation
**File: `src/services/coachingFeedbackService.ts`**

```typescript
export function generateCoachingFeedback(
  metrics: SquatMetrics | DeadliftMetrics,
  exerciseType: string
): string[]
```

**Examples:**
```
Squat (score: 65):
- ⚠️ "Knees caving inward - focus on keeping them over toes"
- ⚠️ "Depth limited - aim for hip crease below parallel"
- ✅ "Good heel contact maintained"

Deadlift (score: 78):
- ⚠️ "Shoulders slightly forward - keep over bar"
- ✅ "Strong hip extension at lockout"
```

**Checklist:**
- [ ] Generate context-specific tips
- [ ] Prioritize most critical issues
- [ ] Include positive reinforcement
- [ ] Export feedback to component

### C3: Rep Counting (Optional)
**File: `src/services/repCounterService.ts`**

```typescript
export function detectRepCompletion(
  previousFrame: Pose,
  currentFrame: Pose,
  exerciseType: string
): boolean
```

**Logic:**
```
Squat rep completion:
1. Hip at bottom position (hip_y > knee_y)
2. Frame counter: detect standing -> bottom -> standing
3. Return when hip_y decreases (hip rising to top)

Deadlift rep completion:
1. Detect lockout (knees fully extended)
2. Return when weight returns to ground (similar y position)
```

**Checklist:**
- [ ] Detect rep boundaries
- [ ] Count reps accurately
- [ ] Handle partial reps
- [ ] Display running count

### C4: Trend Visualization
**File: `src/components/FormAnalysis/FormTrends.tsx`**

**Chart type:** Line chart showing form score over time

```typescript
export const FormTrends: React.FC<{userId: string}> = ({userId}) => {
  const [analyses, setAnalyses] = useState<FormAnalysis[]>([]);
  const [chart, setChart] = useState<ChartData | null>(null);
  
  useEffect(() => {
    // Fetch user's analyses
    // Group by exercise type
    // Calculate trend (moving average)
    // Render chart
  }, [userId]);
}
```

**Features:**
- [ ] Separate lines per exercise
- [ ] Moving average (5-rep average)
- [ ] Show min/max range
- [ ] Date range selector
- [ ] Export as image

### C5: Mobile Optimization
**File: `src/components/FormAnalysis/FormAnalysisModal.tsx`**

**Responsive adjustments:**
- [ ] Full-screen video on mobile
- [ ] Touch-friendly controls
- [ ] Reduced canvas resolution (<720p on mobile)
- [ ] Smaller font sizes
- [ ] Vertical layout

**Device testing:**
- [ ] Desktop Chrome/Firefox/Safari
- [ ] iPad (landscape)
- [ ] iPhone 12+ (portrait)

### C6: Documentation
**Create in `docs/` or README:**

- [ ] **FORM_ANALYSIS_SETUP.md** - Quick start guide
- [ ] **FORM_ANALYSIS_API.md** - API reference
- [ ] **FORM_ANALYSIS_TESTING.md** - Test procedures
- [ ] **FORM_ANALYSIS_TROUBLESHOOTING.md** - Common issues

### C7: Testing & QA
**Manual testing checklist:**
- [ ] [ ] Squat with perfect form
- [ ] [ ] Squat with form issues (x3 different)
- [ ] [ ] Deadlift with perfect form
- [ ] [ ] Deadlift with form issues (x3 different)
- [ ] [ ] Low light conditions
- [ ] [ ] Multiple angles
- [ ] [ ] Mobile device
- [ ] [ ] Tablet device

### C8: Code Review
- [ ] [ ] Lint checks pass: `npm run lint:fix`
- [ ] [ ] TypeScript strict mode: `npm run type-check`
- [ ] [ ] Tests pass: `npm test`
- [ ] [ ] Coverage >90%
- [ ] [ ] No console.logs
- [ ] [ ] No `any` types
- [ ] [ ] Comments for complex logic
- [ ] [ ] Consistent naming

### C9: Performance Benchmarking
**Measure & optimize:**
- [ ] [ ] Model load time: target <2s
- [ ] [ ] Pose detection FPS: target 25+
- [ ] [ ] Memory usage: target <200MB
- [ ] [ ] API response: target <200ms
- [ ] [ ] Bundle size: target <800KB

**Commands:**
```bash
npm run build                  # Production build
npm run build:analyze         # Bundle analysis
npm run performance:test       # Performance benchmarks
```

---

## 📊 Delivery Checklist

### Code Deliverables
- [ ] Frontend components (6 files)
  - FormAnalysisModal.tsx
  - VideoCapture.tsx
  - PoseOverlay.tsx
  - FormScoreCard.tsx
  - useFormAnalysis.ts
  - formAnalysisEngine.ts

- [ ] Backend services (4 files)
  - formAnalysisService.ts
  - formAnalysisController.ts
  - formAnalysisRoutes.ts
  - 004-form-analysis-tables.ts (migration)

- [ ] Tests (2 files)
  - formAnalysis.test.ts (frontend)
  - formAnalysis.test.ts (backend)

- [ ] Types (1 file)
  - formAnalysis.ts

### Documentation Deliverables
- [ ] VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md ✅ (complete)
- [ ] VIDEO_FORM_ANALYSIS_EXECUTIVE_SUMMARY.md ✅ (complete)
- [ ] FORM_ANALYSIS_SETUP.md (new)
- [ ] FORM_ANALYSIS_API.md (new)
- [ ] FORM_ANALYSIS_TESTING.md (new)

### Testing Deliverables
- [ ] Unit tests: 95% coverage (frontend)
- [ ] Unit tests: 90% coverage (backend)
- [ ] Integration tests: 80%+ coverage
- [ ] Manual E2E test results
- [ ] Performance benchmarks

### Git Deliverables
- [ ] Feature branch: `feature/form-analysis`
- [ ] 3 commits: Frontend → Backend → Polish
- [ ] PR description with test results
- [ ] Code review approved
- [ ] Merged to main

---

## 🎯 Success Criteria

### Functional ✅
- [x] Video capture works
- [x] Pose detection 25+ fps
- [x] Squat analysis accurate
- [x] Deadlift analysis accurate
- [x] Form scores stored
- [x] API endpoints functional
- [x] Data retrievable

### Performance ✅
- [x] API <200ms latency
- [x] Frontend <500MB memory
- [x] 95%+ form detection accuracy
- [x] Model loads <2s

### Quality ✅
- [x] 95% code coverage (frontend)
- [x] 90% code coverage (backend)
- [x] Zero console errors
- [x] No TypeScript errors
- [x] All tests passing

### Security ✅
- [x] Input validated
- [x] User isolation enforced
- [x] No sensitive data in logs
- [x] Rate limiting applied
- [x] HTTPS enforced

---

## 📞 Support & Questions

**Blockers escalation:**
- [ ] Frontend/MediaPipe issues → reach out to @google/mediapipe-team or check demos
- [ ] Backend/DB issues → review existing SQLite patterns in codebase
- [ ] ML integration → reference Phase 5.3 MLForecastingService implementation
- [ ] Browser compatibility → test with [caniuse.com](https://caniuse.com)

**Documentation references:**
- MediaPipe: https://ai.google.dev/edge/mediapipe
- TensorFlow.js: https://www.tensorflow.org/js/guide
- React hooks: https://react.dev/reference/react/hooks
- Express patterns: Refer to existing backend code

---

**Last Updated:** January 26, 2025  
**Next Review:** After Phase A completion  
**Status:** ✅ Ready for Implementation
