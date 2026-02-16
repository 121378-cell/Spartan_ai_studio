# GitHub Issues - Phase A: Video Form Analysis Frontend

> **Ready to Create:** Copy-paste templates below into GitHub Issues  
> **Epic:** Phase 7 - Video Form Analysis MVP  
> **Timeline:** Week of Feb 3, 2026 | Duration: 1.5 weeks  
> **Developer:** [FE Team Lead]  
> **Label:** `phase-7-video-analysis`, `frontend`, `sprint-feb3`

---

## 📋 Issue #1: Setup MediaPipe Integration & Project Structure

```markdown
# Setup MediaPipe Integration & Project Structure

## Objective
Initialize frontend project with MediaPipe Pose detection library and establish component structure for video form analysis.

## Acceptance Criteria
- [ ] `@mediapipe/tasks-vision` installed and tested
- [ ] TypeScript types properly configured
- [ ] Project structure created:
  - `src/components/VideoAnalysis/`
  - `src/services/poseDetection.ts`
  - `src/types/pose.ts`
  - `src/utils/formAnalysis.ts`
- [ ] CI/CD passes (ESLint, TypeScript, Jest)
- [ ] README updated with setup instructions

## Technical Details
```typescript
// Expected structure
src/
├── components/
│   └── VideoAnalysis/
│       ├── FormAnalysisModal.tsx
│       ├── VideoCapture.tsx
│       ├── PoseOverlay.tsx
│       └── FormFeedback.tsx
├── services/
│   ├── poseDetection.ts
│   └── formAnalysis.ts
├── types/
│   ├── pose.ts
│   └── exercise.ts
└── utils/
    ├── formAnalysis.ts
    └── scoring.ts
```

## Dependencies
- @mediapipe/tasks-vision
- React 19
- TypeScript 5.9

## Estimated Effort
4 hours

## References
- [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) (Phase A.1)
- [MediaPipe Pose Docs](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)
```

---

## 📋 Issue #2: Create VideoCapture Component with Webcam Integration

```markdown
# Create VideoCapture Component with Webcam Integration

## Objective
Build VideoCapture component that captures webcam feed and passes frames to MediaPipe Pose detection.

## Acceptance Criteria
- [ ] Component accepts camera permissions
- [ ] Displays live webcam feed in canvas
- [ ] Handles camera start/stop lifecycle
- [ ] Error handling for camera access denied
- [ ] Performance: 25+ fps at 720p
- [ ] Unit tests (95% coverage)
- [ ] Mobile-responsive design

## Component Props
```typescript
interface VideoCapturProps {
  onPoseDetected: (landmarks: Landmark[]) => void;
  exerciseType: 'squat' | 'deadlift';
  isRecording: boolean;
  onError?: (error: Error) => void;
}
```

## Technical Checklist
- [ ] getUserMedia API integration
- [ ] Canvas rendering optimized
- [ ] Frame rate monitoring
- [ ] Memory leak prevention
- [ ] Mobile fallbacks

## Estimated Effort
6 hours

## References
- [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) (Phase A.2)
```

---

## 📋 Issue #3: Implement Squat Form Detection Algorithm

```markdown
# Implement Squat Form Detection Algorithm

## Objective
Build squat-specific form detection algorithm using MediaPipe Pose keypoints to analyze depth, alignment, and knee tracking.

## Acceptance Criteria
- [ ] Algorithm detects:
  - Hip depth (parallel or below)
  - Knee tracking (not caving inward)
  - Back angle (neutral spine)
  - Heel lift detection
- [ ] Squat phases recognized (descent, bottom, ascent)
- [ ] Form score: 0-100 (formula defined)
- [ ] Common errors flagged (with coaching hints)
- [ ] Unit tests: 95% coverage
- [ ] Performance: Real-time feedback (<100ms)

## Algorithm Pseudocode
```
1. Extract relevant keypoints:
   - Left/Right Hip (13, 14)
   - Left/Right Knee (25, 26)
   - Left/Right Ankle (27, 28)
   - Left/Right Shoulder (11, 12)

2. Calculate angles:
   - Hip angle (hip → knee → ankle)
   - Knee angle (hip → knee → ankle)
   - Torso angle (shoulder → hip)

3. Detect form issues:
   - IF knee_angle < 70° AND hip_y < ankle_y → "Good depth"
   - IF abs(left_knee_x - right_knee_x) > threshold → "Knees caving"
   - IF heel_y > foot_y → "Heels off ground"

4. Calculate score:
   - Base: 100
   - -10 per form issue detected
   - +5 for textbook form
```

## Form Scoring Table
| Metric | Perfect | Good | Poor | Missing |
|--------|---------|------|------|---------|
| Depth | -0 pts | -5 pts | -15 pts | -25 pts |
| Alignment | -0 pts | -5 pts | -15 pts | -20 pts |
| Tracking | -0 pts | -5 pts | -10 pts | -15 pts |

## Estimated Effort
8 hours

## References
- [VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md](./VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md) (Squat Algorithm Section)
```

---

## 📋 Issue #4: Implement Deadlift Form Detection Algorithm

```markdown
# Implement Deadlift Form Detection Algorithm

## Objective
Build deadlift-specific form detection algorithm using MediaPipe Pose keypoints to analyze hip hinge, back position, and bar path.

## Acceptance Criteria
- [ ] Algorithm detects:
  - Hip hinge angle (proper positioning)
  - Back extension (neutral spine maintenance)
  - Bar path (vertical lift)
  - Knee positioning (extension pattern)
- [ ] Deadlift phases: (setup, pull, lockout, descent)
- [ ] Form score: 0-100
- [ ] Common errors flagged with coaching hints
- [ ] Unit tests: 95% coverage
- [ ] Real-time feedback (<100ms)

## Algorithm Pseudocode
```
1. Extract relevant keypoints:
   - Left/Right Hip (13, 14)
   - Left/Right Knee (25, 26)
   - Left/Right Shoulder (11, 12)
   - Spine (midpoint hip-shoulder)

2. Calculate angles:
   - Hip hinge angle (hip angle from ground)
   - Back angle (torso alignment)
   - Knee angle (extension progression)

3. Detect form issues:
   - IF hip_angle > 45° → "Good hip hinge"
   - IF back_angle > 20° → "Back rounding (RED FLAG)"
   - IF knee_extension < 20° → "Knees not extended"

4. Calculate score (same as squat)
```

## Form Scoring
| Metric | Perfect | Good | Poor | Missing |
|--------|---------|------|------|---------|
| Hip Hinge | -0 pts | -5 pts | -15 pts | -25 pts |
| Back Position | -0 pts | -5 pts | -20 pts | -30 pts |
| Extension | -0 pts | -3 pts | -10 pts | -15 pts |

## Estimated Effort
8 hours

## References
- [VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md](./VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md) (Deadlift Algorithm Section)
```

---

## 📋 Issue #5: Create PoseOverlay Component for Real-Time Visualization

```markdown
# Create PoseOverlay Component for Real-Time Visualization

## Objective
Build PoseOverlay component that renders MediaPipe landmarks and connections on video canvas with real-time form coaching.

## Acceptance Criteria
- [ ] Renders 33 keypoints with proper scaling
- [ ] Draws skeleton connections (lines between joints)
- [ ] Color-codes keypoints by confidence:
  - Green: High confidence (>0.5)
  - Yellow: Medium (0.3-0.5)
  - Red: Low (<0.3)
- [ ] Displays current form score badge
- [ ] Shows angle measurements (hip, knee, shoulder)
- [ ] Performance: 25+ fps (no lag)
- [ ] Mobile-friendly rendering
- [ ] Unit tests (90% coverage)

## Visual Specs
```
- Keypoint size: 8px (desktop), 6px (mobile)
- Connection width: 2px
- Font: 14px (desktop), 12px (mobile)
- Refresh rate: 30fps max
- Memory: <50MB per session
```

## Estimated Effort
6 hours

## References
- [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) (Phase A.3)
```

---

## 📋 Issue #6: Build FormFeedback Component with Coaching Hints

```markdown
# Build FormFeedback Component with Coaching Hints

## Objective
Create FormFeedback component that displays real-time coaching hints and form corrections during exercise video analysis.

## Acceptance Criteria
- [ ] Displays current form issues (dynamic list)
- [ ] Shows improvement suggestions
- [ ] Current score visualization (0-100)
- [ ] Historical trend (last 10 reps)
- [ ] Exercise-specific tips (squat vs deadlift)
- [ ] Accessibility: proper contrast, readable fonts
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Unit tests: 90% coverage

## Feedback Types
```typescript
interface FormFeedback {
  type: 'error' | 'warning' | 'tip' | 'praise';
  message: string;
  severity: 'high' | 'medium' | 'low';
  icon: string;
}

// Examples:
{ type: 'error', message: 'Knees caving inward - focus on spreading knees', severity: 'high' }
{ type: 'warning', message: 'Heels lifting - press feet into ground', severity: 'medium' }
{ type: 'tip', message: 'Try moving chest forward slightly', severity: 'low' }
{ type: 'praise', message: 'Excellent depth! Keep it up!', severity: 'low' }
```

## Component Layout
```
┌─────────────────────────────┐
│ 📊 Rep #3 | Score: 92/100   │
├─────────────────────────────┤
│ ✅ Perfect hip depth        │
│ ⚠️  Slight knee cave (5°)   │
│ ✅ Neutral spine            │
│ 🎯 Tip: Keep core engaged   │
└─────────────────────────────┘
```

## Estimated Effort
5 hours

## References
- [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) (Phase A.5)
```

---

## 📋 Issue #7: Create FormAnalysisModal Component Container

```markdown
# Create FormAnalysisModal Component Container

## Objective
Build the main FormAnalysisModal component that orchestrates VideoCapture, PoseOverlay, and FormFeedback components.

## Acceptance Criteria
- [ ] Modal state management (open/close/recording)
- [ ] Exercise type selector (squat/deadlift)
- [ ] Start/Stop/Pause recording controls
- [ ] Camera permission handling
- [ ] Error boundary implementation
- [ ] Loading states during pose detection
- [ ] Responsive modal sizing
- [ ] Unit tests: 95% coverage
- [ ] Integration tests with child components

## Props Interface
```typescript
interface FormAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  onAnalysisComplete: (results: AnalysisResults) => void;
}

interface AnalysisResults {
  exerciseType: string;
  videoBlob: Blob;
  reps: RepAnalysis[];
  averageScore: number;
  timestamp: Date;
}
```

## State Management
```typescript
type AnalysisState = 
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error';
```

## Estimated Effort
6 hours

## References
- [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) (Phase A.4)
```

---

## 📋 Issue #8: Integrate FormAnalysisModal into Exercise Dashboard

```markdown
# Integrate FormAnalysisModal into Exercise Dashboard

## Objective
Integrate FormAnalysisModal component into the Exercise Dashboard page and connect data flow to API endpoints.

## Acceptance Criteria
- [ ] Modal button added to Exercise Dashboard
- [ ] Modal opens/closes cleanly
- [ ] Form data passed to backend API
- [ ] Error handling for API failures
- [ ] Success notification after submission
- [ ] Loading state during API call
- [ ] Integration tests passing
- [ ] E2E test for full flow

## API Integration
```typescript
// POST /api/exercises/:exerciseId/analysis
{
  exerciseType: 'squat',
  videoBlob: Blob,
  analysisData: {
    reps: 5,
    averageScore: 92,
    commonErrors: ['slight knee cave'],
  }
}

// Response
{
  success: true,
  analysisId: 'ana_123456',
  savedData: { ... }
}
```

## Estimated Effort
5 hours

## References
- [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) (Phase A.8)
```

---

## 📋 Issue #9: Add Unit & Integration Tests for All Components

```markdown
# Add Unit & Integration Tests for All Components

## Objective
Achieve 95% test coverage for all Phase A frontend components.

## Acceptance Criteria
- [ ] VideoCapture unit tests (95% coverage)
- [ ] Squat detection tests (95% coverage)
- [ ] Deadlift detection tests (95% coverage)
- [ ] PoseOverlay component tests (90% coverage)
- [ ] FormFeedback component tests (90% coverage)
- [ ] FormAnalysisModal integration tests (95% coverage)
- [ ] Full E2E flow test
- [ ] CI passes all tests
- [ ] Coverage report generated

## Test Types Required
```
Unit Tests (Per Component)
├─ Rendering
├─ Props handling
├─ State changes
├─ Error boundaries
└─ Performance assertions

Integration Tests
├─ Component communication
├─ API mocking
├─ Camera permission flows
└─ Error recovery

E2E Tests
├─ Full form analysis flow
├─ Multiple exercises
└─ Error scenarios
```

## Estimated Effort
8 hours

## References
- Jest configuration already in place
- Coverage target: 95% for critical components
```

---

## 📋 Issue #10: Performance Optimization & Mobile Responsiveness

```markdown
# Performance Optimization & Mobile Responsiveness

## Objective
Optimize Phase A components for performance and ensure mobile-responsive design across all devices.

## Acceptance Criteria
- [ ] Frame rate: 25+ fps (desktop), 15+ fps (mobile)
- [ ] Memory usage: <500MB per session
- [ ] Bundle size: <800KB (gzipped)
- [ ] CSS media queries for mobile/tablet/desktop
- [ ] Touch-friendly UI (48px min tap targets)
- [ ] Lazy loading for heavy components
- [ ] Performance audit: Lighthouse score >85
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)

## Performance Targets
```
Desktop:
  - Frame rate: 25-30 fps
  - Memory: <300MB
  - Latency: <100ms

Mobile:
  - Frame rate: 15-20 fps
  - Memory: <200MB
  - Latency: <150ms
```

## Testing Checklist
- [ ] iPhone 12+
- [ ] Samsung Galaxy S21+
- [ ] iPad Pro
- [ ] Chrome Desktop
- [ ] Firefox Desktop
- [ ] Safari Desktop

## Estimated Effort
6 hours

## References
- [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) (Phase C.1)
```

---

## 📊 Summary Table

| # | Issue | Effort | Blocker | Sprint |
|---|-------|--------|---------|--------|
| 1 | Setup MediaPipe | 4h | Yes | Week 1 |
| 2 | VideoCapture | 6h | #1 | Week 1 |
| 3 | Squat Algorithm | 8h | #2 | Week 1-2 |
| 4 | Deadlift Algorithm | 8h | #2 | Week 1-2 |
| 5 | PoseOverlay | 6h | #3 | Week 2 |
| 6 | FormFeedback | 5h | #3 | Week 2 |
| 7 | FormAnalysisModal | 6h | #2,#5,#6 | Week 2 |
| 8 | Dashboard Integration | 5h | #7 | Week 2 |
| 9 | Tests & Coverage | 8h | All | Week 2 |
| 10 | Performance & Mobile | 6h | All | Week 2 |

**Total: 62 hours (~1.5 weeks with 1 FE developer)**

---

## 🚀 Getting Started

1. **Create Epic:**
   - Title: "Phase 7: Video Form Analysis MVP - Frontend"
   - Description: [Copy from VIDEO_FORM_ANALYSIS_EXECUTIVE_SUMMARY.md]
   - Labels: `phase-7`, `video-analysis`, `frontend`

2. **Create Issues:**
   - Copy templates above into GitHub Issues
   - Assign all to FE developer
   - Link to Epic
   - Add to Feb 3 Sprint

3. **Developer Onboarding:**
   - Review [VIDEO_FORM_ANALYSIS_EXECUTIVE_SUMMARY.md](./VIDEO_FORM_ANALYSIS_EXECUTIVE_SUMMARY.md)
   - Review [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) - Phase A
   - Review [VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md](./VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md)
   - Set up local environment (see AGENTS.md)

4. **Branch Strategy:**
   - Main branch: `feature/form-analysis`
   - Per-issue branches: `feature/form-analysis/videocapture`, etc.
   - Create PRs for code review

---

**Created:** January 26, 2026  
**Status:** ✅ Ready to Import to GitHub  
**Next:** Present to FE Developer + Sprint Planning  
