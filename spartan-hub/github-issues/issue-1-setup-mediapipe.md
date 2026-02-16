# Issue #1: Setup MediaPipe Integration & Project Structure

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

## Sprint
Week 1 (Feb 3-7)

## Labels
`frontend`, `mediapipe`, `setup`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md (Phase A.1)
- MediaPipe Pose Docs: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker