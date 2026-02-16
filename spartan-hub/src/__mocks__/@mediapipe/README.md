# MediaPipe Mocks for Testing

This directory contains comprehensive mock implementations for MediaPipe modules used in the Spartan Hub application. These mocks enable testing of video analysis and pose detection features without requiring the actual MediaPipe library, which cannot run in a Node.js/Jest test environment.

## Overview

The mocks provide stub implementations for:

- **`@mediapipe/tasks-vision`** - Modern MediaPipe Vision API (PoseLandmarker, HandLandmarker, FaceLandmarker, FilesetResolver)
- **`@mediapipe/camera_utils`** - Camera utility class for video capture
- **`@mediapipe/control_utils`** - Drawing utilities for pose visualization
- **`@mediapipe/pose`** - Legacy Pose API

## Files

```
src/__mocks__/@mediapipe/
├── tasks-vision.ts    # Modern Vision API mocks
├── camera_utils.ts    # Camera utility mocks
├── control_utils.ts   # Drawing utility mocks
├── pose.ts           # Legacy Pose API mocks
└── README.md         # This documentation
```

## Configuration

The mocks are automatically applied via Jest's `moduleNameMapper` configuration in [`jest.config.components.js`](../../../scripts/config/jest.config.components.js):

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  // Mock @mediapipe modules for all tests
  '^@mediapipe/tasks-vision$': '<rootDir>/src/__mocks__/@mediapipe/tasks-vision.ts',
  '^@mediapipe/camera_utils$': '<rootDir>/src/__mocks__/@mediapipe/camera_utils.ts',
  '^@mediapipe/control_utils$': '<rootDir>/src/__mocks__/@mediapipe/control_utils.ts',
  '^@mediapipe/pose$': '<rootDir>/src/__mocks__/@mediapipe/pose.ts',
},
```

## Usage

### Automatic Mocking (Recommended)

The mocks are applied globally via Jest configuration. No additional setup is required in test files:

```typescript
// No need to manually mock - it's handled by Jest config
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// These will use the mock implementations automatically
const vision = await FilesetResolver.forVisionTasks('...');
const landmarker = await PoseLandmarker.createFromOptions(vision, {...});
```

### Manual Mocking (Legacy Tests)

For tests that need custom mock behavior, you can still use `jest.mock()`:

```typescript
jest.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: jest.fn().mockResolvedValue({}),
  },
  PoseLandmarker: {
    createFromOptions: jest.fn().mockResolvedValue({
      detectForVideo: jest.fn().mockReturnValue({ landmarks: [] }),
      close: jest.fn(),
    }),
  },
}));
```

## Mock Features

### PoseLandmarker

The `PoseLandmarker` mock provides:

- `createFromOptions()` - Static method that returns a mock landmarker instance
- `detectForVideo()` - Returns realistic 33-point pose landmarks
- `detect()` - Returns pose landmarks for static images
- `detectForImage()` - Alias for detect()
- `setOptions()` - Updates landmarker options
- `close()` - Cleans up resources

```typescript
// Example: Using PoseLandmarker mock
const landmarker = await PoseLandmarker.createFromOptions(vision, {
  runningMode: 'VIDEO',
  numPoses: 1,
});

const result = landmarker.detectForVideo(videoElement, timestamp);
// result.landmarks[0] contains 33 pose landmarks with x, y, z, visibility
```

### HandLandmarker

The `HandLandmarker` mock provides:

- `createFromOptions()` - Creates a mock hand landmarker
- `detectForVideo()` - Returns 21-point hand landmarks with handedness
- `detect()` / `detectForImage()` - Static image detection
- `setOptions()` - Updates options
- `close()` - Cleanup

```typescript
const landmarker = await HandLandmarker.createFromOptions(vision, {
  numHands: 2,
});

const result = landmarker.detectForVideo(videoElement, timestamp);
// result.landmarks contains hand landmarks
// result.handedness contains 'Left' or 'Right' classification
```

### FaceLandmarker

The `FaceLandmarker` mock provides:

- `createFromOptions()` - Creates a mock face landmarker
- `detectForVideo()` - Returns 478-point face mesh landmarks
- Optional face blendshapes (smile, blink, etc.)
- Optional segmentation masks
- `setOptions()` / `close()`

```typescript
const landmarker = await FaceLandmarker.createFromOptions(vision, {
  numFaces: 1,
  outputFaceBlendshapes: true,
});

const result = landmarker.detectForVideo(videoElement, timestamp);
// result.landmarks[0] contains 478 face mesh landmarks
// result.faceBlendshapes contains expression data
```

### FilesetResolver

The `FilesetResolver` mock provides:

- `forVisionTasks()` - Returns a mock vision task resolver
- `forTextTasks()` - Returns a mock text task resolver
- `forAudioTasks()` - Returns a mock audio task resolver

### Legacy Pose API

The `@mediapipe/pose` mock provides:

- `setOptions()` - Configure pose detection options
- `onResults()` - Register callback for results
- `send()` - Process video frame and trigger callback
- `close()` - Cleanup

```typescript
const pose = new Pose();
pose.setOptions({ modelComplexity: 1 });
pose.onResults((results) => {
  // results.poseLandmarks contains 33 landmarks
});
await pose.send(videoElement);
```

## Test Utilities

### Resetting Mocks

To reset all MediaPipe mocks between tests:

```typescript
import { resetAllMediaPipeMocks } from '@mediapipe/tasks-vision';

beforeEach(() => {
  resetAllMediaPipeMocks();
});
```

### Accessing Mock Instances

For verification in tests:

```typescript
import { PoseLandmarker } from '@mediapipe/tasks-vision';

// After creating a landmarker
const instance = PoseLandmarker.instance;
expect(PoseLandmarker.createFromOptions).toHaveBeenCalled();
```

## Mock Data Structure

### Pose Landmarks (33 points)

Each landmark includes:
- `x` - Normalized x coordinate (0-1)
- `y` - Normalized y coordinate (0-1)
- `z` - Depth/relative depth
- `visibility` - Confidence score (0-1)
- `presence` - Presence score (0-1)

Landmark indices follow MediaPipe's standard:
- 0-10: Face (nose, eyes, ears, mouth)
- 11-14: Shoulders and elbows
- 15-22: Wrists and hands
- 23-24: Hips
- 25-30: Knees and ankles
- 31-32: Feet

### Hand Landmarks (21 points)

Standard MediaPipe hand landmark indices:
- 0: Wrist
- 1-4: Thumb
- 5-8: Index finger
- 9-12: Middle finger
- 13-16: Ring finger
- 17-20: Pinky

### Face Landmarks (478 points)

Full MediaPipe Face Mesh landmark set for detailed facial tracking.

## Troubleshooting

### Mock Not Applied

If tests fail with "Cannot find module '@mediapipe/tasks-vision'":

1. Verify the `moduleNameMapper` is configured in Jest config
2. Ensure the mock file path is correct
3. Clear Jest cache: `npx jest --clearCache`

### Tests Not Using Mock

If tests still try to load the real MediaPipe:

1. Check that the test is using the correct Jest config
2. Verify no other mock is overriding the global mock
3. Ensure imports happen after mock setup

### Type Errors

If TypeScript shows errors about mock types:

1. The mocks export proper TypeScript types
2. Ensure `skipLibCheck: true` in tsconfig for test files
3. Use `as any` for complex mock configurations in tests

## Related Files

- [`src/__tests__/setup.ts`](../../__tests__/setup.ts) - Global test setup with DOM mocks
- [`scripts/config/jest.config.components.js`](../../../scripts/config/jest.config.components.js) - Jest configuration
- [`src/services/poseDetection.ts`](../../services/poseDetection.ts) - Service using MediaPipe
- [`src/services/formAnalysisEngine.ts`](../../services/formAnalysisEngine.ts) - Form analysis using MediaPipe

## Contributing

When adding new MediaPipe features:

1. Add corresponding mock methods to the appropriate mock file
2. Update the mock to return realistic data structures
3. Add tests to verify the mock works correctly
4. Update this README with new mock features
