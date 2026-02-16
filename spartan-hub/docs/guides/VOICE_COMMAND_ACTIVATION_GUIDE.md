# Voice Command Activation Guide

This document explains how the voice command activation feature works in the Spartan Hub application.

## Feature Overview

The voice command activation feature provides two different activation methods based on the user's device context:

1. **Desktop/Wide Devices**: Global keyboard shortcut (Ctrl + Shift + V)
2. **Mobile Devices**: Floating voice command button

## Implementation Details

### Device Context Detection

The feature uses the existing device context system to determine the appropriate activation method:

- **Mobile**: Screen width < 768px
- **Tablet/SmallLaptop**: Screen width between 768px and 1024px
- **Desktop/Wide**: Screen width > 1024px

### Desktop Activation (Global Keyboard Shortcut)

For desktop users, the voice command can be activated using the keyboard shortcut `Ctrl + Shift + V`. This shortcut is implemented using a custom hook `useGlobalKeyboardShortcut` that:

1. Listens for global keydown events
2. Checks if the correct key combination is pressed
3. Verifies that only the required keys are pressed (prevents triggering when extra keys are pressed)
4. Prevents default browser behavior
5. Calls the activation callback

### Mobile Activation (Floating Button)

For mobile users, a floating voice command button is displayed in the bottom right corner of the screen. This button:

1. Is only visible on mobile devices
2. Has a microphone icon for clear visual identification
3. Is positioned fixed at the bottom right of the viewport
4. Has a high z-index to ensure it's always clickable
5. Triggers the voice command modal when clicked

## Technical Implementation

### Files Modified/Added

1. **App.tsx**: Integrated both activation methods
2. **components/FloatingVoiceButton.tsx**: Created floating button component for mobile
3. **hooks/useGlobalKeyboardShortcut.ts**: Created hook for global keyboard shortcuts
4. **components/modals/CommandBarModal.tsx**: Updated styling for better responsiveness

### Key Components

#### useGlobalKeyboardShortcut Hook

This custom hook handles global keyboard shortcuts:

```typescript
useGlobalKeyboardShortcut(['Ctrl', 'Shift', 'V'], () => {
  if (isDesktop) {
    showModal('command-bar');
  }
});
```

#### FloatingVoiceButton Component

This component displays a floating button only on mobile devices:

```tsx
const FloatingVoiceButton: React.FC = () => {
  const { isMobile } = useDevice();
  const { showModal } = useAppContext();

  if (!isMobile) {
    return null;
  }

  return (
    <button
      onClick={() => showModal('command-bar')}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-spartan-gold shadow-lg flex items-center justify-center hover:bg-spartan-gold-dark transition-all duration-200 z-50"
      aria-label="Activar comando de voz"
    >
      <MicrophoneIcon className="w-6 h-6 text-spartan-dark" />
    </button>
  );
};
```

## Usage Instructions

### Desktop Users

1. Press `Ctrl + Shift + V` anywhere in the application
2. The voice command modal will appear
3. Speak your command clearly
4. The system will process your command and respond

### Mobile Users

1. Look for the floating microphone button in the bottom right corner
2. Tap the button to activate voice commands
3. Speak your command clearly
4. The system will process your command and respond

## Accessibility Considerations

- The floating button includes an aria-label for screen readers
- Visual feedback is provided through icon animations
- Clear error messages are displayed when voice recognition fails
- The feature degrades gracefully when voice recognition is not supported

## Future Improvements

- Add visual feedback when the keyboard shortcut is pressed
- Implement additional keyboard shortcuts for power users
- Add customization options for the floating button position
- Improve voice recognition accuracy with better error handling