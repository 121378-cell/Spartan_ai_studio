# Issue #8: Integrate FormAnalysisModal into Exercise Dashboard

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

## Sprint
Week 2 (Feb 10-14)

## Labels
`frontend`, `integration`, `dashboard`, `api`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md (Phase A.8)