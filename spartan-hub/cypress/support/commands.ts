/**
 * Cypress Custom Commands
 * Phase A: Video Form Analysis MVP
 */

/**
 * Login with test user
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    
    // Verify login successful
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('exist');
  });
});

/**
 * Logout current user
 */
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/login');
});

/**
 * Start recording for exercise analysis
 */
Cypress.Commands.add('startRecording', (exerciseType: string) => {
  cy.visit(`/form-analysis?exercise=${exerciseType}`);
  
  // Wait for camera permission
  cy.get('[data-testid="camera-access"]').should('exist');
  
  // Click start recording
  cy.get('[data-testid="start-recording-button"]').click();
  
  // Verify recording started
  cy.get('[data-testid="recording-indicator"]').should('be.visible');
  cy.get('[data-testid="stop-recording-button"]').should('be.visible');
});

/**
 * Stop recording and save analysis
 */
Cypress.Commands.add('stopRecording', () => {
  cy.get('[data-testid="stop-recording-button"]').click();
  
  // Wait for analysis to complete
  cy.get('[data-testid="analysis-loading"]').should('exist');
  cy.get('[data-testid="analysis-loading"]').should('not.exist');
  
  // Verify results shown
  cy.get('[data-testid="form-score"]').should('exist');
  cy.get('[data-testid="feedback-text"]').should('exist');
});

/**
 * Mock form analysis API response
 */
Cypress.Commands.add('mockFormAnalysisResponse', () => {
  cy.intercept('POST', '/api/form-analysis', {
    statusCode: 201,
    body: {
      success: true,
      data: {
        id: 'test-analysis-1',
        userId: 'test-user',
        exerciseType: 'squat',
        formScore: 85,
        metrics: {
          repsCompleted: 10,
          durationSeconds: 45,
          kneeValgusAngle: 5,
          squatDepth: 'parallel'
        },
        warnings: ['Slight knee valgus detected'],
        recommendations: ['Focus on pushing knees out'],
        createdAt: Date.now()
      }
    }
  }).as('saveAnalysis');
});

// Export for TypeScript
export {};
