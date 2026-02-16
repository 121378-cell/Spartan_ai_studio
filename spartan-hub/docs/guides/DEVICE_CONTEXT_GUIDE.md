# Device Context Implementation Guide

This guide explains how to use the device context system for responsive and contextual scaling in the Spartan Hub application.

## Overview

The device context system provides automatic detection and classification of user devices based on screen width:
- **Mobile**: Screen width < 768px
- **Tablet/SmallLaptop**: Screen width between 768px and 1024px
- **Desktop/Wide**: Screen width > 1024px

Additionally, the system provides a density factor for adjusting information density based on device type:
- **Desktop/Wide**: Density factor of 1.0 (full density)
- **Tablet/SmallLaptop**: Density factor of 0.8 (medium density)
- **Mobile**: Density factor of 0.6 (low density)

## Implementation Files

1. `types.ts` - Contains the `DeviceType` type definition
2. `utils/deviceContext.ts` - Utility functions for device detection and density calculations
3. `context/DeviceContext.tsx` - React context provider and hook
4. `components/DeviceContextDemo.tsx` - Example component demonstrating usage

## Usage

### 1. Accessing Device Context in Components

To use the device context in any component, import and use the `useDevice` hook:

```tsx
import React from 'react';
import { useDevice } from '../context/DeviceContext';

const MyComponent: React.FC = () => {
  const { deviceType, isMobile, isTablet, isDesktop, densityFactor } = useDevice();

  return (
    <div>
      <h1>Current Device: {deviceType}</h1>
      <p>Density Factor: {densityFactor}</p>
      {isMobile && <p>Mobile-specific content</p>}
      {isTablet && <p>Tablet-specific content</p>}
      {isDesktop && <p>Desktop-specific content</p>}
    </div>
  );
};

export default MyComponent;
```

### 2. Available Properties

The `useDevice` hook provides the following properties:

- `deviceType`: The current device type ('Mobile' | 'Tablet/SmallLaptop' | 'Desktop/Wide')
- `isMobile`: Boolean indicating if the device is mobile
- `isTablet`: Boolean indicating if the device is a tablet or small laptop
- `isDesktop`: Boolean indicating if the device is a desktop or wide screen
- `densityFactor`: Number representing the density factor for the current device type
- `getDeviceContext`: Function to manually get the current device context

### 3. Conditional Rendering Examples

```tsx
// Render different layouts based on device type
const ResponsiveComponent: React.FC = () => {
  const { isMobile, isTablet, isDesktop } = useDevice();

  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  );
};

// Adjust component behavior based on device
const AdaptiveButton: React.FC = () => {
  const { isMobile } = useDevice();

  return (
    <button 
      className={isMobile ? "w-full py-4 text-lg" : "w-auto py-2 text-base"}
      onClick={isMobile ? handleTouch : handleClick}
    >
      {isMobile ? "Tap Me" : "Click Me"}
    </button>
  );
};
```

### 4. Using Density Factor for Information Density

The density factor can be used to adjust font sizes, padding, and other spacing elements:

```tsx
import React from 'react';
import { useDevice } from '../context/DeviceContext';

const DensityAwareComponent: React.FC = () => {
  const { densityFactor } = useDevice();
  
  // Calculate adjusted sizes based on density factor
  const fontSize = `${16 * densityFactor}px`;
  const padding = `${10 * densityFactor}px`;
  const margin = `${8 * densityFactor}px`;

  return (
    <div 
      style={{
        fontSize,
        padding,
        margin
      }}
      className="bg-blue-100 rounded"
    >
      This content adapts its density based on device type
    </div>
  );
};
```

### 5. Utility Functions for Density Calculations

The `utils/deviceContext.ts` file provides utility functions for working with density factors:

```tsx
import { applyDensity, applyDensityToCSS } from '../utils/deviceContext';
import { useDevice } from '../context/DeviceContext';

const MyComponent: React.FC = () => {
  const { densityFactor } = useDevice();
  
  // Apply density to a pixel value
  const adjustedPadding = applyDensity(16, densityFactor); // Returns 10 on mobile (16 * 0.6)
  
  // Apply density to a CSS value
  const adjustedFontSize = applyDensityToCSS('1.5rem', densityFactor); // Returns '0.90rem' on mobile
  
  return (
    <div style={{ padding: `${adjustedPadding}px`, fontSize: adjustedFontSize }}>
      Content with adjusted density
    </div>
  );
};
```

## Integration with Existing Components

To make components responsive, simply import and use the `useDevice` hook:

1. Import the hook: `import { useDevice } from '../context/DeviceContext';`
2. Call the hook in your component: `const { deviceType, isMobile, isTablet, isDesktop, densityFactor } = useDevice();`
3. Use the properties to conditionally render content or adjust styling

## Manual Device Detection

If you need to manually detect the device type outside of a React component, you can use the utility function:

```tsx
import { getDeviceContext, getDensityFactor } from '../utils/deviceContext';

// Get current device type
const deviceType = getDeviceContext();
const densityFactor = getDensityFactor(deviceType);
console.log('Current device type:', deviceType);
console.log('Density factor:', densityFactor);
```

## Best Practices

1. **Performance**: The device context automatically updates on window resize events, so components will re-render when the device type changes.

2. **Server-Side Rendering**: The device context defaults to 'Desktop/Wide' during server-side rendering to ensure consistent initial rendering.

3. **Conditional Logic**: Use the boolean flags (`isMobile`, `isTablet`, `isDesktop`) for cleaner conditional logic in your components.

4. **Density Factor Usage**: Apply the density factor to font sizes, padding, and margins to ensure appropriate information density across devices:
   - Use `applyDensity()` for pixel values
   - Use `applyDensityToCSS()` for CSS unit values
   - Consider the visual hierarchy when applying density adjustments

5. **CSS Classes**: Combine device context with CSS classes for more complex responsive designs:

```tsx
const ResponsiveCard: React.FC = () => {
  const { isMobile, densityFactor } = useDevice();

  return (
    <div 
      className={`card ${isMobile ? 'card-mobile' : 'card-desktop'}`}
      style={{
        fontSize: `${16 * densityFactor}px`,
        padding: `${12 * densityFactor}px`
      }}
    >
      <h2>Responsive Card</h2>
      <p>Content adapts to device type and density</p>
    </div>
  );
};
```

## Testing Different Device Types

To test how your components look on different devices:

1. Open the browser's developer tools
2. Toggle the device toolbar (usually Ctrl+Shift+M or Cmd+Shift+M)
3. Select different device presets or manually resize the viewport
4. Observe how components adapt to different screen sizes

The device context will automatically update as you resize the viewport, allowing you to see how your responsive design behaves in real-time.