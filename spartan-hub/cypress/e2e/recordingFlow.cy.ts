/**
 * Recording Flow E2E Tests
 * Phase A: Video Form Analysis MVP
 * 
 * Tests the complete recording flow:
 * 1. Navigate to form analysis
 * 2. Grant camera access
 * 3. Start recording
 * 4. Perform exercise
 * 5. Stop recording
 * 6. View analysis results
 * 7. Save analysis
 */

describe('Recording Flow', () => {
  beforeEach(() => {
    // Mock camera access
    cy.stub(navigator.mediaDevices, 'getUserMedia')
      .resolves({
        getTracks: () => [{ stop: cy.stub() }]
      } as any);
    
    // Mock API response
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
            durationSeconds: 45
          },
          warnings: [],
          recommendations: ['Good form!'],
          createdAt: Date.now()
        }
      }
    }).as('saveAnalysis');
  });
  
  it('should complete full recording flow for squat analysis', () => {
    // Navigate to form analysis
    cy.visit('/form-analysis?exercise=squat');
    
    // Verify page loaded
    cy.get('[data-testid="form-analysis-modal"]').should('exist');
    cy.get('[data-testid="exercise-type"]').should('contain', 'Squat');
    
    // Grant camera access (mocked)
    cy.get('[data-testid="camera-access"]').should('exist');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Verify recording started
    cy.get('[data-testid="recording-indicator"]', { timeout: 5000 })
      .should('be.visible');
    cy.get('[data-testid="stop-recording-button"]')
      .should('be.visible');
    
    // Wait for recording (simulate exercise)
    cy.wait(3000);
    
    // Stop recording
    cy.get('[data-testid="stop-recording-button"]').click();
    
    // Wait for analysis
    cy.get('[data-testid="analysis-loading"]', { timeout: 10000 })
      .should('exist');
    cy.get('[data-testid="analysis-loading"]')
      .should('not.exist');
    
    // Verify results
    cy.get('[data-testid="form-score"]').should('exist');
    cy.get('[data-testid="form-score"]').should('contain', '85');
    
    cy.get('[data-testid="feedback-text"]').should('exist');
    cy.get('[data-testid="feedback-text"]')
      .should('contain', 'Good form!');
    
    // Verify save was called
    cy.wait('@saveAnalysis');
  });
  
  it('should show error when camera access denied', () => {
    // Mock camera denial
    cy.stub(navigator.mediaDevices, 'getUserMedia')
      .rejects(new Error('Permission denied'));
    
    cy.visit('/form-analysis?exercise=squat');
    
    // Should show error message
    cy.get('[data-testid="camera-error"]', { timeout: 5000 })
      .should('be.visible');
    cy.get('[data-testid="camera-error"]')
      .should('contain', 'camera access');
  });
  
  it('should allow user to cancel recording', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    cy.get('[data-testid="recording-indicator"]').should('be.visible');
    
    // Cancel recording
    cy.get('[data-testid="cancel-button"]').click();
    
    // Verify recording stopped
    cy.get('[data-testid="recording-indicator"]')
      .should('not.exist');
    cy.get('[data-testid="start-recording-button"]')
      .should('be.visible');
    
    // Verify save was NOT called
    cy.get('@saveAnalysis').should('not.have.been.called');
  });
  
  it('should show real-time feedback during recording', () => {
    // Mock WebSocket
    cy.intercept('WS', '**/form-analysis', {
      upgrade: true
    });
    
    cy.visit('/form-analysis?exercise=squat');
    
    // Start recording
    cy.get('[data-testid="start-recording-button"]').click();
    
    // Wait for feedback overlay
    cy.get('[data-testid="feedback-overlay"]', { timeout: 5000 })
      .should('be.visible');
    
    // Verify feedback shown
    cy.get('[data-testid="form-score-live"]')
      .should('exist');
    cy.get('[data-testid="feedback-messages"]')
      .should('exist');
  });
  
  it('should handle API errors gracefully', () => {
    // Mock API error
    cy.intercept('POST', '/api/form-analysis', {
      statusCode: 500,
      body: {
        success: false,
        message: 'Failed to save analysis'
      }
    }).as('saveAnalysisError');
    
    cy.visit('/form-analysis?exercise=squat');
    
    // Start and stop recording
    cy.get('[data-testid="start-recording-button"]').click();
    cy.wait(2000);
    cy.get('[data-testid="stop-recording-button"]').click();
    
    // Wait for analysis
    cy.wait('@saveAnalysisError');
    
    // Should show error message
    cy.get('[data-testid="error-message"]', { timeout: 5000 })
      .should('be.visible');
    cy.get('[data-testid="error-message"]')
      .should('contain', 'Failed to save');
    
    // Should allow retry
    cy.get('[data-testid="retry-button"]')
      .should('be.visible');
  });
});

describe('Recording Flow - Deadlift', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/form-analysis', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 'test-deadlift-1',
          userId: 'test-user',
          exerciseType: 'deadlift',
          formScore: 90,
          metrics: {},
          warnings: [],
          recommendations: ['Excellent form!'],
          createdAt: Date.now()
        }
      }
    }).as('saveAnalysis');
  });
  
  it('should complete deadlift recording flow', () => {
    cy.visit('/form-analysis?exercise=deadlift');
    
    // Verify deadlift-specific UI
    cy.get('[data-testid="exercise-type"]')
      .should('contain', 'Deadlift');
    
    // Complete recording flow
    cy.get('[data-testid="start-recording-button"]').click();
    cy.wait(3000);
    cy.get('[data-testid="stop-recording-button"]').click();
    
    // Verify results
    cy.get('[data-testid="form-score"]', { timeout: 10000 })
      .should('contain', '90');
  });
});

describe('Recording Flow - Mobile', () => {
  beforeEach(() => {
    // Set mobile viewport
    cy.viewport('iphone-13');
    
    cy.intercept('POST', '/api/form-analysis', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 'test-mobile-1',
          userId: 'test-user',
          exerciseType: 'squat',
          formScore: 80,
          metrics: {},
          warnings: [],
          recommendations: [],
          createdAt: Date.now()
        }
      }
    }).as('saveAnalysis');
  });
  
  it('should work on mobile devices', () => {
    cy.visit('/form-analysis?exercise=squat');
    
    // Verify mobile UI
    cy.get('[data-testid="mobile-layout"]').should('exist');
    
    // Complete recording
    cy.get('[data-testid="start-recording-button"]').click();
    cy.wait(2000);
    cy.get('[data-testid="stop-recording-button"]').click();
    
    // Verify results
    cy.get('[data-testid="form-score"]', { timeout: 10000 })
      .should('be.visible');
  });
});
