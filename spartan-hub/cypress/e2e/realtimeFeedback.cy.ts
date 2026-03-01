/**
 * Real-time Feedback E2E Tests
 * Phase A: Video Form Analysis MVP
 * 
 * Tests WebSocket connection and real-time feedback:
 * 1. WebSocket connection
 * 2. Live feedback updates
 * 3. Injury risk alerts
 * 4. Auto-stop on critical risk
 */

describe('Real-time Feedback', () => {
  beforeEach(() => {
    // Mock WebSocket server
    cy.intercept('WS', '**/form-analysis', {
      upgrade: true
    });
    
    // Mock API responses
    cy.intercept('POST', '/api/form-analysis', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 'test-realtime-1',
          userId: 'test-user',
          exerciseType: 'squat',
          formScore: 85,
          metrics: {},
          warnings: [],
          recommendations: [],
          createdAt: Date.now()
        }
      }
    }).as('saveAnalysis');
  });
  
  it('should connect to WebSocket on recording start', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Verify WebSocket connection attempted
    cy.get('[data-testid="websocket-status"]')
      .should('have.class', 'connected');
  });
  
  it('should display real-time feedback during recording', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Wait for first feedback
    cy.get('[data-testid="form-score-live"]', { timeout: 5000 })
      .should('be.visible');
    
    // Verify feedback updates
    cy.get('[data-testid="feedback-messages"]')
      .should('exist');
  });
  
  it('should show injury risk indicator', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Verify injury risk shown
    cy.get('[data-testid="injury-risk-indicator"]')
      .should('be.visible');
    
    // Verify color coding
    cy.get('[data-testid="injury-risk-low"]')
      .should('exist');
  });
  
  it('should auto-stop on critical injury risk', () => {
    // Mock critical risk feedback
    cy.intercept('WS', '**/form-analysis', {
      upgrade: true,
      body: JSON.stringify({
        timestamp: Date.now(),
        exerciseType: 'squat',
        currentRep: 1,
        formScore: 30,
        feedback: [],
        warnings: ['High injury risk!'],
        injuryRiskLevel: 'critical',
        shouldStop: true
      })
    });
    
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Should auto-stop on critical risk
    cy.get('[data-testid="recording-indicator"]', { timeout: 10000 })
      .should('not.exist');
    
    // Should show critical alert
    cy.get('[data-testid="critical-alert"]')
      .should('be.visible');
    cy.get('[data-testid="critical-alert"]')
      .should('contain', 'injury risk');
  });
  
  it('should handle WebSocket disconnection', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Simulate WebSocket disconnection
    cy.window().then((win) => {
      // Trigger disconnect event
      win.dispatchEvent(new Event('offline'));
    });
    
    // Should show disconnected state
    cy.get('[data-testid="websocket-status"]')
      .should('have.class', 'disconnected');
    
    // Should show warning
    cy.get('[data-testid="connection-warning"]')
      .should('be.visible');
  });
  
  it('should attempt reconnection after disconnect', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Simulate disconnect
    cy.window().then((win) => {
      win.dispatchEvent(new Event('offline'));
    });
    
    // Simulate reconnect
    cy.wait(2000);
    cy.window().then((win) => {
      win.dispatchEvent(new Event('online'));
    });
    
    // Should attempt reconnection
    cy.get('[data-testid="websocket-status"]', { timeout: 5000 })
      .should('have.class', 'reconnecting');
  });
  
  it('should update feedback history', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Wait for multiple feedback updates
    cy.wait(5000);
    
    // Verify history shown
    cy.get('[data-testid="feedback-history"]')
      .should('exist');
    
    // Should have multiple entries
    cy.get('[data-testid="feedback-history-item"]')
      .should('have.length.greaterThan', 0);
  });
  
  it('should display form score trend', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Wait for trend calculation
    cy.wait(5000);
    
    // Verify trend shown
    cy.get('[data-testid="form-trend"]')
      .should('be.visible');
    
    // Should show improving/stable/declining
    cy.get('[data-testid="form-trend"]')
      .should('match', /improving|stable|declining/);
  });
});

describe('Real-time Feedback - Performance', () => {
  it('should maintain 60fps during feedback', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Record performance metrics
    cy.performanceMeasure('feedback-fps', {
      duration: 5000
    }).then((metrics) => {
      // Verify FPS >= 55 (allow small variance)
      expect(metrics.fps).to.be.greaterThan(54);
    });
  });
  
  it('should not block UI thread', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Try to interact with UI
    cy.get('[data-testid="exercise-selector"]')
      .should('be.enabled')
      .click();
    
    // Should respond immediately
    cy.get('[data-testid="exercise-dropdown"]')
      .should('be.visible');
  });
});

describe('Real-time Feedback - Edge Cases', () => {
  it('should handle slow WebSocket responses', () => {
    // Mock slow WebSocket
    cy.intercept('WS', '**/form-analysis', {
      upgrade: true,
      delay: 5000
    });
    
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Should show loading state
    cy.get('[data-testid="feedback-loading"]')
      .should('be.visible');
    
    // Should eventually show feedback
    cy.get('[data-testid="form-score-live"]', { timeout: 10000 })
      .should('be.visible');
  });
  
  it('should handle malformed feedback data', () => {
    // Mock malformed data
    cy.intercept('WS', '**/form-analysis', {
      upgrade: true,
      body: 'invalid-json'
    });
    
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Should handle gracefully (no crash)
    cy.get('[data-testid="form-analysis-modal"]')
      .should('exist');
    
    // Should show error or default state
    cy.get('[data-testid="feedback-error"], [data-testid="form-score-default"]')
      .should('exist');
  });
  
  it('should handle multiple rapid recordings', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // First recording
    cy.get('[data-testid="start-recording-button"]').click();
    cy.wait(2000);
    cy.get('[data-testid="stop-recording-button"]').click();
    
    // Wait for save
    cy.wait('@saveAnalysis');
    
    // Second recording (immediately)
    cy.get('[data-testid="start-recording-button"]').click();
    cy.wait(2000);
    cy.get('[data-testid="stop-recording-button"]').click();
    
    // Both should save successfully
    cy.get('@saveAnalysis').should('have.callCount', 2);
  });
});
