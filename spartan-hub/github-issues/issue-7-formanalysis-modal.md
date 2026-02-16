# Issue #7: Create FormAnalysisModal Component Container

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

## Sprint
Week 2 (Feb 10-14)

## Labels
`frontend`, `modal`, `orchestration`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md (Phase A.4)