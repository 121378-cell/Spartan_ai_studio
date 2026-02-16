# Hologram 3D Scaling Implementation Guide

This guide explains how the hologram 3D viewer implements responsive scaling based on device context for optimal visualization and user experience.

## Overview

The hologram 3D viewer implements responsive scaling with the following behaviors:
- **Mobile Devices**: The visualization occupies the full screen to maximize detail and provide an immersive experience
- **Desktop/Wide Devices**: The hologram remains in a resizable floating window that does not block the underlying Dashboard

## Implementation Details

### 1. Device Context Integration

The hologram viewer uses the device context to determine how to render:

```tsx
import { useDevice } from '../context/DeviceContext.tsx';

const ResponsiveHologramViewer: React.FC<ResponsiveHologramViewerProps> = ({ ... }) => {
  const { isMobile, isDesktop, densityFactor } = useDevice();
  // ... rest of component
};
```

### 2. Responsive Layout Implementation

The hologram viewer implements different layouts based on device type:

#### Mobile Implementation (RESP.5 Requirement)
✅ **Full Screen Visualization**:
- Occupies the entire screen using fixed positioning
- Close button in the top-right corner for easy exit
- Maximized detail and immersive experience
- No other UI elements to avoid distraction

#### Desktop/Wide Implementation (RESP.5 Requirement)
✅ **Floating Window**:
- Remains in a resizable floating window
- Does not block the underlying Dashboard
- Allows multitasking and context switching
- Standard modal behavior with close button

### 3. Density Factor Application

The density factor is applied to all UI elements:

```tsx
// Calculate responsive styles based on density factor
const buttonFontSize = `${12 * densityFactor}px`;
const buttonPaddingX = `${12 * densityFactor}px`;
const buttonPaddingY = `${4 * densityFactor}px`;
const suggestionFontSize = `${12 * densityFactor}px`;
const suggestionPaddingX = `${12 * densityFactor}px`;
const suggestionPaddingY = `${4 * densityFactor}px`;
```

### 4. Component Updates

#### ResponsiveHologramViewer
New component that handles device-specific behavior:
- Full screen mode for mobile devices
- Standard modal mode for desktop devices
- Responsive UI elements with density factor application
- Close button for mobile fullscreen mode

#### ExerciseDetailModal
Updated to conditionally render the responsive hologram:
- Full screen hologram on mobile devices
- Standard modal with hologram on desktop devices

## Density Factor Configuration

The density factors are applied as follows:
- **Desktop/Wide**: 1.0 (Full density)
- **Tablet/SmallLaptop**: 0.8 (Medium density)
- **Mobile**: 0.6 (Low density)

This results in the following size adjustments:
- Mobile devices: 60% of original size for UI elements
- Tablet devices: 80% of original size for UI elements
- Desktop devices: 100% of original size for UI elements

## Component Implementation

### ResponsiveHologramViewer
New component that implements the responsive behavior:

```tsx
// For mobile devices, use full screen mode
<div className={`relative ${isMobile ? 'w-screen h-screen fixed inset-0 z-50' : 'w-full h-full'}`}>
  {/* Hologram content */}
</div>

// Close button for mobile fullscreen mode
{isMobile && onClose && (
  <button 
    onClick={onClose}
    className="absolute top-4 right-4 z-10 bg-spartan-card/80 backdrop-blur-sm text-spartan-text rounded-full p-2 hover:bg-spartan-border transition-colors"
    aria-label="Cerrar holograma"
  >
    {/* Close icon */}
  </button>
)}
```

### ExerciseDetailModal
Updated to conditionally render the responsive hologram:

```tsx
// For mobile devices, show hologram in fullscreen mode
if (isMobile) {
  return (
    <ResponsiveHologramViewer 
      modelUrl="/assets/hologram_model_with_deviations.glb" 
      targetMuscle={targetMuscle}
      animationType={animationType}
      deviationPart={exercise.deviation?.highlightPart}
      suggestedView={exercise.suggestedView}
      onClose={hideModal}
    />
  );
}

// For desktop devices, show standard modal with hologram
return (
  <div className="max-h-[80vh] overflow-y-auto pr-2">
    {/* Modal content with hologram in standard window */}
  </div>
);
```

## Best Practices

1. **Full Screen for Mobile**: Mobile users get an immersive experience with full screen visualization
2. **Floating Window for Desktop**: Desktop users can multitask with a resizable floating window
3. **Consistent Density Application**: Apply the density factor to all UI elements for optimal sizing
4. **Clear Exit Points**: Provide clear ways to close the hologram on all device types
5. **Performance**: The device context automatically updates on window resize events

## Testing Different Device Types

To test the responsive scaling:

1. Open the browser's developer tools
2. Toggle the device toolbar (usually Ctrl+Shift+M or Cmd+Shift+M)
3. Select different device presets or manually resize the viewport
4. Open a hologram viewer to observe how it adapts its layout

The hologram viewer will automatically adjust its layout and behavior as you resize the viewport, allowing you to see how the responsive design behaves in real-time.