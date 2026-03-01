/**
 * API Integration E2E Tests
 * Phase A: Video Form Analysis MVP
 * 
 * Tests backend API integration:
 * 1. Save analysis
 * 2. Get analyses
 * 3. Update analysis
 * 4. Delete analysis
 * 5. Error handling
 */

describe('API Integration', () => {
  const testUser = {
    id: 'test-user-e2e',
    email: 'test@spartanhub.io'
  };
  
  beforeEach(() => {
    // Login before each test
    cy.login(testUser.email, 'TestPassword123!');
  });
  
  describe('Save Analysis', () => {
    it('should save form analysis successfully', () => {
      cy.visit('/form-analysis?exercise=squat');
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(3000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Wait for save
      cy.wait('@saveAnalysis');
      
      // Verify success message
      cy.get('[data-testid="success-message"]')
        .should('be.visible');
      cy.get('[data-testid="success-message"]')
        .should('contain', 'saved');
    });
    
    it('should save with correct exercise type', () => {
      cy.visit('/form-analysis?exercise=deadlift');
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Verify exercise type in request
      cy.wait('@saveAnalysis').then((interception) => {
        expect(interception.request.body.exerciseType).to.equal('deadlift');
      });
    });
    
    it('should include metrics in save request', () => {
      cy.visit('/form-analysis?exercise=squat');
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(5000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Verify metrics included
      cy.wait('@saveAnalysis').then((interception) => {
        expect(interception.request.body.metrics).to.exist;
        expect(interception.request.body.metrics.repsCompleted).to.exist;
      });
    });
  });
  
  describe('Get Analyses', () => {
    beforeEach(() => {
      // Mock get analyses response
      cy.intercept('GET', '/api/form-analysis/user/**', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              id: 'analysis-1',
              userId: testUser.id,
              exerciseType: 'squat',
              formScore: 85,
              metrics: {},
              warnings: [],
              recommendations: [],
              createdAt: Date.now()
            },
            {
              id: 'analysis-2',
              userId: testUser.id,
              exerciseType: 'deadlift',
              formScore: 90,
              metrics: {},
              warnings: [],
              recommendations: [],
              createdAt: Date.now()
            }
          ],
          count: 2
        }
      }).as('getAnalyses');
    });
    
    it('should load user analyses', () => {
      cy.visit('/form-history');
      
      // Wait for analyses to load
      cy.wait('@getAnalyses');
      
      // Verify analyses shown
      cy.get('[data-testid="analysis-list"]')
        .should('exist');
      cy.get('[data-testid="analysis-item"]')
        .should('have.length', 2);
    });
    
    it('should display exercise types correctly', () => {
      cy.visit('/form-history');
      
      cy.wait('@getAnalyses');
      
      // Verify exercise types
      cy.get('[data-testid="analysis-item"]')
        .eq(0)
        .should('contain', 'Squat');
      cy.get('[data-testid="analysis-item"]')
        .eq(1)
        .should('contain', 'Deadlift');
    });
    
    it('should display form scores', () => {
      cy.visit('/form-history');
      
      cy.wait('@getAnalyses');
      
      // Verify scores
      cy.get('[data-testid="analysis-score"]')
        .eq(0)
        .should('contain', '85');
      cy.get('[data-testid="analysis-score"]')
        .eq(1)
        .should('contain', '90');
    });
  });
  
  describe('Delete Analysis', () => {
    beforeEach(() => {
      // Mock delete response
      cy.intercept('DELETE', '/api/form-analysis/**', {
        statusCode: 200,
        body: {
          success: true
        }
      }).as('deleteAnalysis');
      
      // Mock get analyses
      cy.intercept('GET', '/api/form-analysis/user/**', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              id: 'analysis-to-delete',
              userId: testUser.id,
              exerciseType: 'squat',
              formScore: 85,
              metrics: {},
              warnings: [],
              recommendations: [],
              createdAt: Date.now()
            }
          ],
          count: 1
        }
      }).as('getAnalyses');
    });
    
    it('should delete analysis', () => {
      cy.visit('/form-history');
      
      cy.wait('@getAnalyses');
      
      // Click delete button
      cy.get('[data-testid="delete-analysis-button"]')
        .first()
        .click();
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]')
        .click();
      
      // Wait for delete request
      cy.wait('@deleteAnalysis');
      
      // Verify removed from list
      cy.get('[data-testid="analysis-item"]')
        .should('have.length', 0);
    });
    
    it('should show confirmation before delete', () => {
      cy.visit('/form-history');
      
      cy.wait('@getAnalyses');
      
      // Click delete button
      cy.get('[data-testid="delete-analysis-button"]')
        .first()
        .click();
      
      // Verify confirmation dialog
      cy.get('[data-testid="delete-confirmation-dialog"]')
        .should('be.visible');
      cy.get('[data-testid="confirm-delete-button"]')
        .should('be.visible');
      
      // Cancel deletion
      cy.get('[data-testid="cancel-delete-button"]')
        .click();
      
      // Verify still in list
      cy.get('[data-testid="analysis-item"]')
        .should('have.length', 1);
      
      // Delete should not have been called
      cy.get('@deleteAnalysis').should('not.have.been.called');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle save failure gracefully', () => {
      // Mock save failure
      cy.intercept('POST', '/api/form-analysis', {
        statusCode: 500,
        body: {
          success: false,
          message: 'Failed to save analysis'
        }
      }).as('saveAnalysisError');
      
      cy.visit('/form-analysis?exercise=squat');
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Wait for error
      cy.wait('@saveAnalysisError');
      
      // Verify error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible');
      cy.get('[data-testid="error-message"]')
        .should('contain', 'Failed to save');
      
      // Should allow retry
      cy.get('[data-testid="retry-button"]')
        .should('be.visible');
    });
    
    it('should handle network timeout', () => {
      // Mock timeout
      cy.intercept('POST', '/api/form-analysis', {
        delay: 30000,
        body: {}
      }).as('saveAnalysisTimeout');
      
      cy.visit('/form-analysis?exercise=squat');
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Should show timeout error
      cy.get('[data-testid="timeout-error"]', { timeout: 35000 })
        .should('be.visible');
    });
    
    it('should handle unauthorized error', () => {
      // Mock unauthorized
      cy.intercept('POST', '/api/form-analysis', {
        statusCode: 401,
        body: {
          success: false,
          message: 'Unauthorized'
        }
      }).as('saveAnalysisUnauthorized');
      
      cy.visit('/form-analysis?exercise=squat');
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Wait for error
      cy.wait('@saveAnalysisUnauthorized');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });
  });
  
  describe('Offline Mode', () => {
    it('should queue analysis for later sync', () => {
      cy.visit('/form-analysis?exercise=squat');
      
      // Go offline
      cy.window().then((win) => {
        win.dispatchEvent(new Event('offline'));
      });
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Should show offline message
      cy.get('[data-testid="offline-message"]')
        .should('be.visible');
      
      // Should queue for later
      cy.get('[data-testid="queued-message"]')
        .should('be.visible');
    });
    
    it('should sync when back online', () => {
      cy.visit('/form-analysis?exercise=squat');
      
      // Go offline
      cy.window().then((win) => {
        win.dispatchEvent(new Event('offline'));
      });
      
      // Complete recording
      cy.get('[data-testid="start-recording-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="stop-recording-button"]').click();
      
      // Go back online
      cy.window().then((win) => {
        win.dispatchEvent(new Event('online'));
      });
      
      // Should sync automatically
      cy.wait('@saveAnalysis');
      
      // Verify success
      cy.get('[data-testid="success-message"]')
        .should('be.visible');
    });
  });
});
