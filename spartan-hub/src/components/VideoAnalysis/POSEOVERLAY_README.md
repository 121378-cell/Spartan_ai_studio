# PoseOverlay Component

Real-time pose visualization component for MediaPipe landmarks and skeletal connections.

## Overview

The `PoseOverlay` component renders all 33 MediaPipe pose keypoints and their skeletal connections on a canvas overlay, providing real-time visual feedback for form analysis.

## Features

### ✅ Keypoint Rendering
- Renders all 33 MediaPipe keypoints
- **Color-coded by confidence level**:
  - 🟢 Green: High confidence (>0.5)
  - 🟡 Yellow: Medium (0.3-0.5)
  - 🔴 Red: Low (<0.3)
- Keypoint size adjusts for mobile vs desktop

### ✅ Skeletal Connections
- 12 skeleton connections connecting major joints
- White semi-transparent lines for clarity
- Adaptive line width for responsive design

### ✅ Form Score Display
- Real-time score badge (0-100)
- Color-coded by performance:
  - 🟢 Green: Excellent (≥85)
  - 🟡 Yellow: Good (70-84)
  - 🟠 Orange: Fair (50-69)
  - 🔴 Red: Poor (<50)

### ✅ Angle Measurements
- Automatic joint angle calculation
- Displays: hip, knee angles
- Real-time updates per frame

### ✅ Confidence Legend
- Visual guide for color meanings
- Always visible in corner
- Mobile-friendly sizing

## Usage

```tsx
import { PoseOverlay } from '@/components/VideoAnalysis';
import { useRef, useState } from 'react';

export function VideoPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState<PoseFrame | null>(null);
  const [score, setScore] = useState(0);

  return (
    <div>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
      <PoseOverlay
        canvasRef={canvasRef}
        currentFrame={currentFrame}
        formScore={score}
        analysisResult={analysisResult}
        isMobile={false}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `canvasRef` | `React.RefObject<HTMLCanvasElement>` | ✅ | Reference to canvas element for rendering |
| `currentFrame` | `PoseFrame \| null` | ✅ | Current pose frame with landmarks |
| `formScore` | `number` | ✅ | Current form analysis score (0-100) |
| `analysisResult` | `FormAnalysisResult \| undefined` | ❌ | Optional form analysis details |
| `isMobile` | `boolean` | ❌ | Adjust sizing for mobile (default: false) |

## Skeleton Connections

The component draws 12 connections representing the human skeleton:

```
Head region: None (head not in pose 33)
Upper body:
  - Left shoulder ↔ Left elbow ↔ Left wrist
  - Right shoulder ↔ Right elbow ↔ Right wrist
  - Left shoulder ↔ Right shoulder (across chest)

Torso/Core:
  - Left shoulder ↔ Left hip
  - Right shoulder ↔ Right hip
  - Left hip ↔ Right hip

Lower body:
  - Left hip ↔ Left knee ↔ Left ankle
  - Right hip ↔ Right knee ↔ Right ankle
```

## Angle Calculations

Uses law of cosines for joint angle calculations:

```typescript
// Angle at vertex between p1 and p2
angle = arccos((v1·v2) / (|v1| |v2|))
```

Measured angles:
- **Hip angle**: Shoulder → Hip → Knee
- **Knee angle**: Hip → Knee → Ankle
- Range: 0-180°

## Performance Considerations

### Optimization
- ✅ Only renders landmarks with visibility > 0.3
- ✅ Skips skeleton connections with low-visibility endpoints
- ✅ Uses `translate3d` for GPU acceleration
- ✅ Canvas clearing before each draw
- ✅ Efficient 2D context operations

### Target Metrics
- **FPS**: 25+ fps minimum
- **Memory**: <50MB per session
- **CPU**: Optimized for real-time processing

### Mobile Adjustments
```typescript
Desktop:
  - Keypoint radius: 8px
  - Connection width: 2px
  - Font size: 14px

Mobile:
  - Keypoint radius: 6px
  - Connection width: 1.5px
  - Font size: 12px
```

## Color System

### Confidence Colors
```
#00FF00 (Green)   - High confidence (>0.5)
#FFFF00 (Yellow)  - Medium (0.3-0.5)
#FF0000 (Red)     - Low (<0.3)
```

### Score Colors
```
#00FF00 (Green)   - Excellent (≥85)
#FFFF00 (Yellow)  - Good (70-84)
#FFA500 (Orange)  - Fair (50-69)
#FF0000 (Red)     - Poor (<50)
```

## Integration with VideoCapture

The PoseOverlay is designed to work with the VideoCapture component:

```tsx
<VideoCapture
  exerciseType="squat"
  onAnalysisComplete={(result) => setAnalysisResult(result)}
/>
<PoseOverlay
  canvasRef={canvasRef}
  currentFrame={currentFrame}
  formScore={score}
  analysisResult={analysisResult}
/>
```

## Testing

Component includes comprehensive test coverage:
- ✅ Rendering tests (null frame, missing ref)
- ✅ Canvas context operations
- ✅ Keypoint rendering and filtering
- ✅ Skeleton connection drawing
- ✅ Score display and colors
- ✅ Angle calculations
- ✅ Legend rendering
- ✅ Mobile responsiveness
- ✅ Performance checks
- ✅ Edge cases

Run tests:
```bash
npm test -- PoseOverlay.test.ts
```

## Browser Support

- ✅ Chrome/Chromium (90+)
- ✅ Firefox (88+)
- ✅ Safari (14+)
- ✅ Edge (90+)
- ✅ Mobile browsers (iOS Safari 14+, Chrome Android)

## Accessibility

- High contrast colors for visibility
- Readable font sizes (14px desktop, 12px mobile)
- No flickering or seizure triggers
- Legend provides color meaning reference

## Known Limitations

1. Head not rendered (MediaPipe Pose 33 doesn't include head)
2. Angles calculated from 2D projection (not true 3D angles)
3. Canvas scaling may be affected by device pixel ratio

## Future Enhancements

- [ ] 3D rendering with Three.js
- [ ] Angle range indicators (safe/unsafe zones)
- [ ] Skeleton motion trails
- [ ] Frame-by-frame replay
- [ ] Angle history graphs
- [ ] Custom color schemes
- [ ] Performance metrics display
