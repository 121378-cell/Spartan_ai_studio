/**
 * Cypress E2E Support File
 * Phase A: Video Form Analysis MVP
 */

// Import commands
import './commands';

// Global hooks
beforeEach(() => {
  // Clear localStorage before each test
  cy.clearLocalStorage();
  
  // Clear cookies
  cy.clearCookies();
  
  // Set viewport to desktop by default
  cy.viewport(1280, 720);
});

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore specific errors that don't affect tests
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  
  // Fail on other errors
  return true;
});

// Add custom command types
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      startRecording(exerciseType: string): Chainable<void>;
      stopRecording(): Chainable<void>;
      mockFormAnalysisResponse(): Chainable<void>;
    }
  }
}
