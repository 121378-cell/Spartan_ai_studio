# Issue #6: Build FormFeedback Component with Coaching Hints

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

## Sprint
Week 2 (Feb 10-14)

## Labels
`frontend`, `ui`, `feedback`, `coaching`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md (Phase A.5)