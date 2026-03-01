/**
 * Accessibility Utilities
 * Phase A: Video Form Analysis MVP
 * 
 * ARIA labels, keyboard navigation, and screen reader support
 */

/**
 * ARIA labels for form analysis components
 */
export const formAnalysisAriaLabels = {
  // Main modal
  modal: 'Form Analysis - AI-powered exercise technique evaluation',
  closeButton: 'Close form analysis',
  
  // Video controls
  startRecording: 'Start recording exercise',
  stopRecording: 'Stop recording and analyze form',
  cancelRecording: 'Cancel recording',
  cameraAccess: 'Camera access required for form analysis',
  
  // Feedback
  formScore: 'Form score out of 100',
  feedbackMessages: 'Exercise feedback and recommendations',
  warnings: 'Form warnings and cautions',
  injuryRisk: 'Injury risk level indicator',
  
  // Results
  analysisResults: 'Exercise analysis results',
  metrics: 'Exercise metrics and statistics',
  saveAnalysis: 'Save analysis results',
  deleteAnalysis: 'Delete this analysis',
  
  // Navigation
  exerciseSelector: 'Select exercise type',
  historyLink: 'View analysis history',
  settingsLink: 'Open settings'
} as const;

/**
 * Keyboard shortcuts for form analysis
 */
export const keyboardShortcuts = {
  startRecording: 'Space',
  stopRecording: 'Escape',
  toggleCamera: 'C',
  saveAnalysis: 'Ctrl+S',
  deleteAnalysis: 'Delete',
  navigateUp: 'ArrowUp',
  navigateDown: 'ArrowDown',
  navigateLeft: 'ArrowLeft',
  navigateRight: 'ArrowRight',
  confirm: 'Enter',
  cancel: 'Escape'
} as const;

/**
 * Screen reader announcements
 */
export const screenReaderAnnouncements = {
  recordingStarted: 'Recording started. Perform your exercise.',
  recordingStopped: 'Recording stopped. Analyzing your form...',
  analysisComplete: 'Analysis complete. Your form score is {score} out of 100.',
  errorOccurred: 'An error occurred. {message}',
  savingAnalysis: 'Saving analysis...',
  analysisSaved: 'Analysis saved successfully.',
  analysisDeleted: 'Analysis deleted.',
  cameraAccessDenied: 'Camera access denied. Please enable camera permissions.',
  networkError: 'Network error. Please check your connection.',
  offline: 'You are offline. Changes will sync when connected.',
  online: 'You are back online. Syncing changes...'
} as const;

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Trap focus within a container (for modals)
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
      
      if (e.key === 'Escape') {
        (container.querySelector('[aria-label="Close"]') as HTMLElement)?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Restore focus to previously focused element
   */
  restoreFocus(element: HTMLElement | null): void {
    element?.focus();
  },

  /**
   * Move focus to error message
   */
  focusOnError(errorContainerId: string): void {
    const errorContainer = document.getElementById(errorContainerId);
    if (errorContainer) {
      errorContainer.setAttribute('tabindex', '-1');
      errorContainer.focus();
    }
  }
};

/**
 * Live region announcements for screen readers
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const liveRegion = document.getElementById('screen-reader-announcements');
  
  if (liveRegion) {
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.textContent = '';
    // Force reflow
    void liveRegion.offsetHeight;
    liveRegion.textContent = message;
  } else {
    // Create live region if it doesn't exist
    const newLiveRegion = document.createElement('div');
    newLiveRegion.id = 'screen-reader-announcements';
    newLiveRegion.setAttribute('aria-live', priority);
    newLiveRegion.setAttribute('aria-atomic', 'true');
    newLiveRegion.className = 'sr-only';
    newLiveRegion.textContent = message;
    document.body.appendChild(newLiveRegion);
  }
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get keyboard focusable elements
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];

  return Array.from(
    container.querySelectorAll(focusableSelectors.join(', '))
  ) as HTMLElement[];
};

export default {
  formAnalysisAriaLabels,
  keyboardShortcuts,
  screenReaderAnnouncements,
  focusManagement,
  announceToScreenReader,
  prefersReducedMotion,
  getFocusableElements
};
