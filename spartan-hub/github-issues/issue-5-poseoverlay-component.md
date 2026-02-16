# Issue #5: Create PoseOverlay Component for Real-Time Visualization

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

## Sprint
Week 2 (Feb 10-14)

## Labels
`frontend`, `visualization`, `ui`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_IMPLEMENTATION_CHECKLIST.md (Phase A.3)