# Data Density Restriction Guide

This document explains how the data density restriction feature works in the Spartan Hub application's Advanced Analysis section.

## Feature Overview

The data density restriction feature adjusts the amount and type of data displayed in the analysis section based on the user's device context:

1. **Mobile Devices**: Show only weekly trend charts to reduce information density
2. **Desktop/Wide Devices**: Show detailed synergistic correlation charts to maximize information density
3. **Tablet/Small Laptop Devices**: Show a simplified version with basic charts

## Implementation Details

### Device Context Detection

The feature uses the existing device context system to determine what to display:

- **Mobile**: Screen width < 768px
- **Tablet/SmallLaptop**: Screen width between 768px and 1024px
- **Desktop/Wide**: Screen width > 1024px

### Content Adaptation

#### Mobile Devices (P19 - Weekly Trend Charts Only)
- Display only the simple line chart showing weekly trends
- Focus on the most essential data: training load and perceived stress
- Reduced cognitive load for smaller screens
- Optimized touch interaction

#### Desktop/Wide Devices (P19 - Detailed Synergistic Correlation Charts)
- Display both the simple line chart and the detailed synergistic correlation chart
- Show comprehensive analysis with dual-axis visualization
- Take advantage of horizontal space for detailed data presentation
- Include the "Laboratorio del Coach: Firma de Desgaste" section

#### Tablet/Small Laptop Devices (Intermediate)
- Display a simplified version similar to mobile but with slightly more detail
- Balance between information density and screen real estate

## Technical Implementation

### Files Modified

1. **components/SynergyCharts.tsx**: Updated to conditionally render different charts based on device context

### Key Components

#### Conditional Rendering Logic

The [SynergyCharts.tsx](file:///c:/spartan%20hub/components/SynergyCharts.tsx#L1-L158) component now uses the [useDevice](file:///c:/spartan%20hub/context/DeviceContext.tsx#L65-L71) hook to determine what to display:

```typescript
const { isMobile, isDesktop } = useDevice();

// For mobile devices, show only the simple line chart (weekly trend)
if (isMobile) {
  // Render simple weekly trend chart only
}

// For desktop/wide devices, show the detailed synergistic correlation charts
if (isDesktop) {
  // Render both simple chart and detailed correlation chart
}

// For tablet/small laptop devices, show a simplified version
// (default rendering)
```

## Usage Instructions

### Mobile Users
- Navigate to the Progress section
- The analysis will automatically show only the weekly trend charts
- This provides a focused view without overwhelming information

### Desktop Users
- Navigate to the Progress section
- The analysis will automatically show both the weekly trend charts and detailed synergistic correlation charts
- The detailed view includes the "Laboratorio del Coach: Firma de Desgaste" section with dual-axis visualization

### Tablet/Small Laptop Users
- Navigate to the Progress section
- The analysis will show a simplified version similar to mobile but with slightly more detail

## Accessibility Considerations

- All charts maintain proper color contrast for readability
- Text sizes are adjusted based on the density factor
- Interactive elements are appropriately sized for their device context
- Clear labeling and legends are provided for all charts

## Future Improvements

- Add user preference option to override automatic device-based selection
- Implement additional chart types for intermediate device sizes
- Add animation transitions when switching between chart types
- Improve responsive behavior for ultra-wide desktop displays