# Registration Card Scaling Implementation Guide

This guide explains how the registration cards implement responsive scaling based on device context for optimal input field layout and user experience.

## Overview

The registration cards implement responsive scaling with the following behaviors:
- **Mobile Devices**: Input fields (Weight, Reps, RIR) are stacked vertically to ensure that the spinner controls are large and easy to touch
- **Desktop/Wide Devices**: Input fields are aligned horizontally to prioritize compact visualization

## Implementation Details

### 1. Device Context Integration

The registration cards use the device context to determine how to render input fields:

```tsx
import { useDevice } from '../../../context/DeviceContext.tsx';

const StrengthModeBody: React.FC<StrengthModeBodyProps> = ({ ... }) => {
  const { isMobile, isDesktop, densityFactor } = useDevice();
  // ... rest of component
};
```

### 2. Responsive Layout Implementation

The input fields are arranged using flexbox or grid based on device type:

#### Mobile Implementation
- Fields are stacked vertically using flex column layout
- Increased spacing between fields for better touch interaction
- Larger touch targets for spinner controls

#### Desktop/Wide Implementation
- Fields are arranged horizontally using grid layout
- Compact arrangement to maximize information density
- Standard spacing for mouse interaction

### 3. Density Factor Application

The density factor is applied to all sizing elements:

```tsx
// Calculate responsive styles based on density factor
const containerPadding = `${24 * densityFactor}px`;
const fieldSpacing = `${24 * densityFactor}px`;
const labelFontSize = `${14 * densityFactor}px`;
const fieldLabelSpacing = `${8 * densityFactor}px`;

// Apply to container
<div 
    className={`${isMobile ? 'flex flex-col gap-6' : 'grid grid-cols-1 md:grid-cols-3 gap-4'} items-center justify-center`}
    style={{ padding: containerPadding }}
>
```

### 4. Component Updates

All three registration modes have been updated to support responsive layouts:

#### StrengthModeBody
- Weight, Reps, and RIR fields arranged vertically on mobile
- Horizontal grid layout on desktop
- Density factor applied to all text and spacing

#### TimeModeBody
- Timer and RPE slider arranged vertically on mobile
- Two-column grid layout on desktop
- Responsive font sizes for timer display

#### ActivationModeBody
- Quality buttons arranged vertically on mobile
- Horizontal arrangement on desktop
- Responsive button sizing and spacing

## Density Factor Configuration

The density factors are applied as follows:
- **Desktop/Wide**: 1.0 (Full density)
- **Tablet/SmallLaptop**: 0.8 (Medium density)
- **Mobile**: 0.6 (Low density)

This results in the following size adjustments:
- Mobile devices: 60% of original size
- Tablet devices: 80% of original size
- Desktop devices: 100% of original size

## Component Updates

### StrengthModeBody
Updated to support responsive layout:
- Vertical stacking on mobile devices
- Horizontal grid on desktop devices
- Density factor applied to all text and spacing elements

### TimeModeBody
Updated to support responsive layout:
- Vertical arrangement on mobile
- Two-column grid on desktop
- Responsive timer font size

### ActivationModeBody
Updated to support responsive layout:
- Vertical button arrangement on mobile
- Horizontal arrangement on desktop
- Responsive button sizing and spacing

## Best Practices

1. **Consistent Density Application**: Apply the density factor to all sizing properties (padding, margin, font size, border radius)

2. **Layout Switching**: Use conditional classes to switch between flex and grid layouts based on device type

3. **Touch Targets**: Ensure interactive elements are appropriately sized for touch interaction on mobile devices

4. **Visual Hierarchy**: Maintain clear visual hierarchy across all device sizes

5. **Performance**: The device context automatically updates on window resize events, so components will re-render when the device type changes

## Testing Different Device Types

To test the responsive scaling:

1. Open the browser's developer tools
2. Toggle the device toolbar (usually Ctrl+Shift+M or Cmd+Shift+M)
3. Select different device presets or manually resize the viewport
4. Observe how the registration cards adapt their layout and component sizing

The registration cards will automatically adjust their layout and information density as you resize the viewport, allowing you to see how the responsive design behaves in real-time.