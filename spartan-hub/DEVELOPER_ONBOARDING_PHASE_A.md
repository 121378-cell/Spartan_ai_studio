# 🚀 Developer Onboarding - Phase A Video Form Analysis

**Welcome to Phase 7: Video Form Analysis MVP!**

This document guides new developers through the project setup and context needed to start Phase A development.

---

## 📋 Quick Start (15 minutes)

### 1. **Clone & Setup**
```bash
# Clone repository
git clone https://github.com/121378-cell/spartan-hub.git
cd spartan-hub

# Create feature branch
git checkout -b feature/form-analysis

# Install dependencies
npm install

# Verify setup
npm run type-check
npm test -- --testPathPattern="mlForecasting"
```

### 2. **Read These Documents (In Order)**
1. ✅ **This file** - You are here
2. 📖 [VIDEO_FORM_ANALYSIS_EXECUTIVE_SUMMARY.md](./VIDEO_FORM_ANALYSIS_EXECUTIVE_SUMMARY.md) - 10 min read
3. 📋 [VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md](./VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md) - Phase A section
4. 🔍 [VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md](./VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md) - Deep dive (reference)

### 3. **Setup Local Development**
```bash
# Start dev server
npm run dev

# In another terminal - watch tests
npm test -- --watch

# Type checking
npm run type-check
```

### 4. **You're Ready!**
Start with Issue #1: "Setup MediaPipe Integration & Project Structure"

---

## 🎯 Project Goals (Elevator Pitch)

**Build a browser-based fitness form analysis system that:**
- Captures video from user's webcam
- Uses MediaPipe Pose to detect body position
- Analyzes squat & deadlift forms in real-time
- Provides live coaching feedback
- Stores results for progress tracking
- Keeps video private (never uploaded)

**Why?** Help users perfect their exercise form to prevent injuries and maximize gains.

**Timeline:** 4 weeks (you: 1.5 weeks for Phase A frontend)

---

## 🏗️ Architecture Overview

### System Flow
```
User → Video Input → MediaPipe Pose Detection → Form Analysis → Feedback
                           ↓
                      Send to Backend → Store in DB
```

### Frontend Components (Phase A)
```
src/components/VideoAnalysis/
├── FormAnalysisModal.tsx        ← Main container
│   ├── VideoCapture.tsx         ← Webcam + canvas
│   ├── PoseOverlay.tsx          ← Keypoint visualization
│   └── FormFeedback.tsx         ← Coaching hints
```

### Backend Integration (Phase B - Not your concern yet)
```
POST /api/exercises/:exerciseId/analysis
  → MLForecastingService (Phase 5.3)
  → Database (SQLite/PostgreSQL)
  → Return: Analysis ID + results
```

---

## 📚 Key Concepts

### MediaPipe Pose
**What:** Google's pose detection ML model running in your browser

**33 Keypoints:** Head, shoulders, arms, hips, legs, feet (with depth)

**Key Landmarks for Fitness:**
```
Left Hip (13)      Right Hip (14)
  ↓                   ↓
Left Knee (25)    Right Knee (26)
  ↓                   ↓
Left Ankle (27)   Right Ankle (28)

Left Shoulder (11) → Right Shoulder (12)
```

**Confidence Scores:** Each keypoint has 0-1 confidence (0=not visible, 1=confident)

**Performance:** 30+ fps desktop, 15+ fps mobile (good enough for real-time)

### Form Analysis Algorithm
**Squat Detection Example:**
```
1. Extract hip, knee, ankle positions
2. Calculate angles:
   - Hip angle = angle(knee→hip→shoulder)
   - Knee angle = angle(hip→knee→ankle)
3. Evaluate form:
   - Deep enough? hip_angle < 90°
   - Knees tracking? |left_knee_x - right_knee_x| < threshold
   - Heels down? ankle_y > foot_y
4. Calculate score:
   - Start: 100 points
   - Deduct for each issue (-10, -5, -15 depending)
   - Result: 0-100 form score
```

**Real-Time:** This runs on every frame (~30 fps) so feedback is instant

### TypeScript Strict Mode
All code must be strictly typed. NO `any` types (except tests).

```typescript
// ❌ WRONG
function analyzeForm(data) { ... }

// ✅ CORRECT
interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

function analyzeForm(landmarks: Landmark[]): FormScore { ... }
```

---

## 💾 Project Structure

```
spartan-hub/
├── src/
│   ├── components/
│   │   ├── VideoAnalysis/          ← YOU BUILD THIS
│   │   │   ├── FormAnalysisModal.tsx
│   │   │   ├── VideoCapture.tsx
│   │   │   ├── PoseOverlay.tsx
│   │   │   └── FormFeedback.tsx
│   │   └── [existing components]
│   ├── services/
│   │   ├── poseDetection.ts        ← YOU BUILD THIS
│   │   ├── formAnalysis.ts         ← YOU BUILD THIS
│   │   └── [existing services]
│   ├── types/
│   │   ├── pose.ts                 ← YOU BUILD THIS
│   │   ├── exercise.ts             ← YOU BUILD THIS
│   │   └── [existing types]
│   ├── utils/
│   │   ├── formAnalysis.ts         ← YOU BUILD THIS
│   │   ├── scoring.ts              ← YOU BUILD THIS
│   │   └── [existing utils]
│   └── App.tsx
├── backend/
│   └── src/                        ← BE Developer's domain
├── package.json
├── tsconfig.json
├── vite.config.ts
└── jest.config.js
```

**Files You WON'T Touch:**
- `backend/` - Backend developer handles
- Existing components in `components/`
- Database schema
- API routes

**Files You WILL Create:**
- VideoAnalysis components (4 files)
- Pose detection services (2 files)
- Type definitions (2 files)
- Utility functions (2 files)
- Tests for all above (~8 test files)

---

## 🛠️ Tech Stack

### Frontend
```
React 19.2.0      - UI framework
TypeScript 5.9.3  - Type safety
Vite 7.1.12       - Build tool
Jest 30.2.0       - Testing
@mediapipe/tasks-vision - Pose detection
```

### Development Tools
```
ESLint            - Code linting
Prettier          - Code formatting
ts-jest           - TypeScript testing
React Testing Library - Component testing
```

### No External UI Library!
Build components with plain HTML/CSS (Tailwind available in project)

---

## 🧪 Testing Requirements

### Coverage Targets
- **VideoCapture:** 95%
- **PoseOverlay:** 90%
- **FormFeedback:** 90%
- **FormAnalysisModal:** 95%
- **Services:** 95%

### Test Examples
```typescript
describe('SquatFormAnalysis', () => {
  test('should detect perfect squat form', () => {
    const landmarks = createMockLandmarks('perfect-squat');
    const score = analyzeSquatForm(landmarks);
    expect(score).toBe(100);
  });

  test('should penalize knee cave', () => {
    const landmarks = createMockLandmarks('knee-cave');
    const score = analyzeSquatForm(landmarks);
    expect(score).toBeLessThan(100);
  });

  test('should handle missing keypoints gracefully', () => {
    const landmarks = createMockLandmarks('partial');
    const score = analyzeSquatForm(landmarks);
    expect(score).toBeGreaterThan(0);
  });
});
```

### Run Tests
```bash
npm test                           # All tests
npm test -- --watch              # Watch mode
npm test -- --coverage           # Coverage report
npm test -- FormAnalysisModal    # Specific component
```

---

## 🔐 Security & Best Practices

### Security Checklist
- ✅ **Video Privacy:** Video is NEVER sent to backend raw
  - Only pose landmarks (33 points) are sent
  - Video blob stays local for optional storage
  - GDPR compliant (no facial recognition)

- ✅ **Input Sanitization:** All form data sanitized before API calls
- ✅ **Error Handling:** Try-catch blocks around all pose detection
- ✅ **Permissions:** Request camera permission explicitly

### Code Style
```typescript
// ✅ DO
const analyzeForm = (landmarks: Landmark[]): FormScore => {
  if (!landmarks || landmarks.length === 0) {
    throw new ValidationError('No landmarks provided');
  }
  // Process...
  return score;
};

// ❌ DON'T
const analyzeForm = (data) => {
  return processData(data); // Where is processData? No types!
};

// ❌ DON'T
const analyzeForm = (landmarks: any) => { // any = bad
  // ...
};
```

### Import Organization
```typescript
// 1. External dependencies first
import React, { useState, useEffect } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

// 2. Internal modules
import { analyzeSquatForm } from '../services/formAnalysis';
import type { Landmark, FormScore } from '../types/pose';

// 3. Types/interfaces
import { VideoAnalysisState } from '../types/exercise';

// 4. Utils
import { validateLandmarks } from '../utils/formAnalysis';
```

---

## 📖 API Integration (Reference)

You don't implement this in Phase A, but good to know for context.

### Send Analysis to Backend
```typescript
// This will be called from FormAnalysisModal.tsx
const submitAnalysis = async (
  exerciseId: string,
  analysisData: AnalysisResults
) => {
  const response = await fetch(
    `/api/exercises/${exerciseId}/analysis`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseType: 'squat',
        videoBlob: analysisData.videoBlob,
        reps: analysisData.reps,
        averageScore: analysisData.averageScore,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to submit analysis');
  }

  return response.json();
};
```

### Backend Response
```json
{
  "success": true,
  "analysisId": "ana_123456",
  "savedData": {
    "exerciseType": "squat",
    "reps": 5,
    "averageScore": 92.5,
    "recommendations": [
      "Work on knee tracking",
      "Good depth achieved"
    ]
  }
}
```

---

## 🎓 Learning Resources

### MediaPipe Pose
- Official Docs: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- GitHub: https://github.com/google-ai-edge/mediapipe-solutions-web
- Examples: https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/tasks/web/vision

### React Performance
- React Profiler: https://react.dev/reference/react/Profiler
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame

### TypeScript
- Handbook: https://www.typescriptlang.org/docs/
- Strict Mode: https://www.typescriptlang.org/tsconfig#strict

### Jest Testing
- Documentation: https://jestjs.io/
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/

---

## ⚠️ Common Pitfalls (Avoid These!)

### ❌ Pitfall 1: Calling Model Every Frame
**Problem:** Creates memory leak, slows down app
```typescript
// ❌ WRONG - Do NOT do this
useEffect(() => {
  const poseLandmarker = new PoseLandmarker(...); // Created on EVERY render!
  // ...
}, []); // Missing dependency!
```

**Solution:** Initialize model once
```typescript
// ✅ CORRECT
useEffect(() => {
  let poseLandmarker;
  
  const initialize = async () => {
    poseLandmarker = await PoseLandmarker.createFromOptions(...);
  };
  
  initialize();
  
  return () => {
    if (poseLandmarker) {
      poseLandmarker.close(); // Cleanup!
    }
  };
}, []); // Only on mount
```

### ❌ Pitfall 2: Not Handling Camera Permissions
**Problem:** App crashes if user denies camera access
```typescript
// ❌ WRONG
const video = await navigator.mediaDevices.getUserMedia({ video: true });

// ✅ CORRECT
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  // Handle stream
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // User denied camera
    setError('Camera permission denied');
  } else {
    setError('Camera not available');
  }
}
```

### ❌ Pitfall 3: Infinite Re-renders
**Problem:** Component infinitely re-renders
```typescript
// ❌ WRONG - Object created on every render
useEffect(() => {
  process({ data: processData }); // NEW object each time!
}, []); // So dependency array doesn't help

// ✅ CORRECT - Memoize the object
const config = useMemo(() => ({ data: processData }), [processData]);
useEffect(() => {
  process(config);
}, [config]);
```

### ❌ Pitfall 4: Not Cleaning Up Resources
**Problem:** Memory leaks, background processes keep running
```typescript
// ❌ WRONG - No cleanup
useEffect(() => {
  const interval = setInterval(() => {
    detectPose();
  }, 30); // Runs forever even after unmount!
}, []);

// ✅ CORRECT - Cleanup
useEffect(() => {
  const interval = setInterval(() => {
    detectPose();
  }, 30);
  
  return () => clearInterval(interval); // Cleanup function
}, []);
```

---

## 📞 Getting Help

### Questions?
1. **Check documentation first** - Usually answered in IMPLEMENTATION_CHECKLIST.md
2. **Ask in team Slack** - #phase-7-video-analysis
3. **Code review** - PR comments are great for learning
4. **Backend Developer** - For API integration questions

### Blockers?
- Document the blocker
- Notify PM/Team Lead
- Start next issue (don't wait)
- Unblock as soon as possible

---

## 🎯 Your First Week (Day by Day)

### Day 1 (Monday)
- [ ] Read this document completely
- [ ] Setup local environment
- [ ] Run existing tests (`npm test`)
- [ ] Understand project structure
- [ ] Open Issue #1

### Day 2 (Tuesday)
- [ ] Issue #1: MediaPipe setup (4 hours)
- [ ] Create folder structure
- [ ] Install @mediapipe/tasks-vision
- [ ] Create types/pose.ts
- [ ] Create PR for review

### Day 3 (Wednesday)
- [ ] Code review feedback on PR #1
- [ ] Issue #2: VideoCapture component (6 hours)
- [ ] Implement webcam capture
- [ ] Basic canvas rendering
- [ ] Add unit tests

### Day 4 (Thursday)
- [ ] Finish VideoCapture tests
- [ ] Issue #3: Squat algorithm (start)
- [ ] Implement squat form detection
- [ ] Create algorithm tests

### Day 5 (Friday)
- [ ] Finish Squat algorithm
- [ ] Issue #4: Deadlift algorithm
- [ ] Start deadlift detection
- [ ] Weekly sync + demo

**By end of Week 1:**
- Issues #1, #2, #3 complete
- 95% test coverage
- Ready for Week 2 UI components

---

## ✅ Definition of Done

Your code is ready for merge when:

- ✅ All tests passing (npm test)
- ✅ No TypeScript errors (npm run type-check)
- ✅ ESLint passes (npm run lint)
- ✅ Coverage target met (95% critical, 90% other)
- ✅ Code reviewed and approved
- ✅ No console warnings/errors
- ✅ Documented in comments where needed
- ✅ Commit message is clear
- ✅ Related issues are linked

---

## 🚀 Ready to Ship?

Once Phase A is complete:
- Backend Developer starts Phase B (database + API)
- You start Phase C (polish + mobile optimization)
- Full launch in 4 weeks

---

**Questions? Ask the team!**

**Excited to build this with you! 🎉**

---

**Document Version:** 1.0  
**Last Updated:** January 26, 2026  
**Next Review:** February 3, 2026 (Sprint Start)
