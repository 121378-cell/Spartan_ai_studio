# Issue #4: Implement Deadlift Form Detection Algorithm

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

## Sprint
Week 1-2 (Feb 3-14)

## Labels
`frontend`, `algorithm`, `deadlift`, `ai`, `phase-7-video-analysis`

## References
- VIDEO_FORM_ANALYSIS_MVP_RESEARCH.md (Deadlift Algorithm Section)