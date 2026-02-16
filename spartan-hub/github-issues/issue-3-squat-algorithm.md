# Issue #3: Implement Squat Form Detection Algorithm

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

## Sprint
Week 1-2 (Feb 3-14)

## Labels
`frontend`, `algorithm`, `squat`, `ai`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md (Squat Algorithm Section)