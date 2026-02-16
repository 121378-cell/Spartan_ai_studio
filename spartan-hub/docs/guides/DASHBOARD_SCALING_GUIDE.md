# Dashboard Scaling Implementation Guide

This guide explains how the dashboard implements responsive scaling based on device context for optimal information density and user experience.

## Overview

The dashboard implements responsive scaling with the following behaviors:
- **Mobile Devices**: Coach Avatar and Synergistic Heart are reduced in size and fixed to the top-right corner, maximizing routine visualization space
- **Desktop/Wide Devices**: Use increased padding and enable the floating Central Command Window (FUI5)

## Implementation Details

### 1. Device Context Integration

The dashboard uses the device context to determine how to render components:

```tsx
import { useDevice } from '../context/DeviceContext.tsx';

const Dashboard: React.FC = () => {
  const { deviceType, isMobile, isDesktop, densityFactor } = useDevice();
  // ... rest of component
};
```

### 2. Responsive Coach Widget and Synergistic Heart

The Coach Widget and Synergistic Heart (P17) are positioned and sized based on device type:

#### Mobile Implementation
- Positioned in the top-right corner using absolute positioning
- Reduced in size using density factor
- Synergistic Heart is displayed as a prominent icon
- Central Command Window is accessible via a floating button at the bottom

#### Desktop/Wide Implementation
- Coach Widget is displayed in the header with standard sizing
- Synergistic Heart is integrated into the header
- Central Command Window is accessible directly from the header
- Increased padding throughout the dashboard

### 3. Density Factor Application

The density factor is applied to all sizing elements:

```tsx
// Calculate responsive styles based on density factor
const coachWidgetStyle = {
  padding: `${24 * densityFactor}px`,
  borderRadius: `${8 * densityFactor}px`,
};

const coachWidgetIconStyle = {
  width: `${24 * densityFactor}px`,
  height: `${24 * densityFactor}px`,
};

const headerStyle = {
  padding: `${16 * densityFactor}px`,
  gap: `${16 * densityFactor}px`,
};
```

### 4. Component Visibility Control

Components are shown or hidden based on device type:

```tsx
// Show floating command center button only on mobile
{isMobile && (
  <button 
    onClick={() => showModal('command-center')}
    className="fixed bottom-6 right-6 ..."
  >
    <SynergisticLoadDial score={synergisticLoad.score} size={24 * densityFactor} />
  </button>
)}

// Show coach widget in sidebar only on desktop
{isDesktop && (
  <div className="space-y-6">
    <div className="spartan-card">
      <div className="spartan-card-header">
        <h2 className="spartan-card-title">Asistente de Entrenamiento</h2>
      </div>
      <div className="spartan-card-content">
        <CoachWidget synergisticLoadScore={synergisticLoad.score} />
      </div>
    </div>
  </div>
)}
```

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

### SynergisticLoadDial
Updated to support dynamic sizing through the `size` prop:

```tsx
<SynergisticLoadDial score={synergisticLoad.score} size={24 * densityFactor} />
```

### CoachWidget
Updated to apply density factor to all text and spacing elements:

```tsx
const padding = `${24 * densityFactor}px`;
const borderRadius = `${8 * densityFactor}px`;
const iconSize = `${24 * densityFactor}px`;
const titleFontSize = `${20 * densityFactor}px`;
const contentFontSize = `${16 * densityFactor}px`;
```

## Best Practices

1. **Consistent Density Application**: Apply the density factor to all sizing properties (padding, margin, font size, border radius)

2. **Positioning for Mobile**: Use absolute positioning for key elements on mobile to maximize content space

3. **Component Visibility**: Show/hide components based on device type to optimize screen real estate

4. **Touch Targets**: Ensure interactive elements are appropriately sized for touch interaction on mobile devices

5. **Performance**: The device context automatically updates on window resize events, so components will re-render when the device type changes

## Testing Different Device Types

To test the responsive scaling:

1. Open the browser's developer tools
2. Toggle the device toolbar (usually Ctrl+Shift+M or Cmd+Shift+M)
3. Select different device presets or manually resize the viewport
4. Observe how the dashboard adapts its layout and component sizing

The dashboard will automatically adjust its layout and information density as you resize the viewport, allowing you to see how the responsive design behaves in real-time.