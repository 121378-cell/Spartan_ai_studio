# Issue #2: Create VideoCapture Component with Webcam Integration

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
interface VideoCaptureProps {
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

## Sprint
Week 1 (Feb 3-7)

## Labels
`frontend`, `camera`, `component`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md (Phase A.2)