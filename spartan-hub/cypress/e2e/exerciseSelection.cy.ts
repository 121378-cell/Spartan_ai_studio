/**
 * Exercise Selection E2E Tests
 * Phase B: Additional Exercises
 */

describe('Exercise Selection Flow', () => {
  beforeEach(() => {
    cy.visit('/form-analysis');
  });

  it('should display all exercises', () => {
    cy.get('[data-testid="exercise-selector"]').should('exist');
    cy.get('[data-testid="exercise-card"]').should('have.length', 4);
  });

  it('should filter exercises by category', () => {
    // Click legs filter
    cy.get('[data-testid="category-filter-legs"]').click();
    
    // Should show only 1 exercise
    cy.get('[data-testid="exercise-card"]').should('have.length', 1);
    cy.get('[data-testid="exercise-card-squat"]').should('exist');
  });

  it('should filter exercises by difficulty', () => {
    // Click advanced filter
    cy.get('[data-testid="difficulty-filter-advanced"]').click();
    
    // Should show only 1 exercise
    cy.get('[data-testid="exercise-card"]').should('have.length', 1);
    cy.get('[data-testid="exercise-card-deadlift"]').should('exist');
  });

  it('should search exercises', () => {
    // Type in search
    cy.get('[data-testid="exercise-search"]')
      .type('bench');
    
    // Should show only bench press
    cy.get('[data-testid="exercise-card"]').should('have.length', 1);
    cy.get('[data-testid="exercise-card-bench_press"]').should('exist');
  });

  it('should clear filters', () => {
    // Apply filter
    cy.get('[data-testid="category-filter-chest"]').click();
    cy.get('[data-testid="exercise-card"]').should('have.length', 1);
    
    // Clear filters
    cy.get('[data-testid="clear-filters"]').click();
    cy.get('[data-testid="exercise-card"]').should('have.length', 4);
  });

  it('should select exercise and start analysis', () => {
    // Select squat
    cy.get('[data-testid="exercise-card-squat"]')
      .click();
    
    // Should show selected state
    cy.get('[data-testid="exercise-card-squat"]')
      .should('have.class', 'selected');
    
    // Start analysis button should be enabled
    cy.get('[data-testid="start-analysis-button"]')
      .should('be.visible')
      .click();
  });

  it('should show exercise details', () => {
    // Click on exercise card
    cy.get('[data-testid="exercise-card-bench_press"]').click();
    
    // Should show details
    cy.get('[data-testid="exercise-details"]').should('be.visible');
    cy.contains('pectorals').should('be.visible');
    cy.contains('triceps').should('be.visible');
  });

  it('should handle empty search results', () => {
    // Search for nonexistent exercise
    cy.get('[data-testid="exercise-search"]')
      .type('nonexistent-exercise');
    
    // Should show empty state
    cy.get('[data-testid="empty-state"]').should('be.visible');
    cy.contains('No exercises found').should('be.visible');
  });
});

describe('Custom Exercise Creator Flow', () => {
  beforeEach(() => {
    cy.visit('/form-analysis/create');
  });

  it('should display exercise creator wizard', () => {
    cy.get('[data-testid="exercise-creator"]').should('exist');
    cy.get('[data-testid="step-indicator"]').should('exist');
  });

  it('should navigate through wizard steps', () => {
    // Step 1: Basic info
    cy.get('[data-testid="exercise-name-input"]')
      .type('Custom Exercise');
    
    cy.get('[data-testid="exercise-description-input"]')
      .type('This is a custom exercise');
    
    // Go to next step
    cy.get('[data-testid="next-button"]').click();
    
    // Should be on step 2
    cy.get('[data-testid="primary-muscles-input"]').should('be.visible');
  });

  it('should validate required fields', () => {
    // Try to proceed without filling required fields
    cy.get('[data-testid="next-button"]').should('be.disabled');
  });

  it('should add instructions dynamically', () => {
    // Navigate to step 3
    cy.get('[data-testid="exercise-name-input"]').type('Test');
    cy.get('[data-testid="exercise-description-input"]').type('Test');
    cy.get('[data-testid="next-button"]').click();
    cy.get('[data-testid="primary-muscles-input"]').type('quads');
    cy.get('[data-testid="next-button"]').click();
    
    // Add instruction
    cy.get('[data-testid="add-instruction-button"]').click();
    cy.get('[data-testid="add-instruction-button"]').click();
    
    // Should have 2 instruction inputs
    cy.get('[placeholder^="Step"]').should('have.length', 2);
  });

  it('should remove instructions', () => {
    // Add and remove instruction
    cy.get('[data-testid="add-instruction-button"]').click();
    cy.get('[data-testid="add-instruction-button"]').click();
    
    // Remove one
    cy.get('[aria-label="Remove instruction"]').first().click();
    
    // Should have 1 instruction left
    cy.get('[placeholder^="Step"]').should('have.length', 1);
  });

  it('should save custom exercise', () => {
    // Complete all steps
    cy.get('[data-testid="exercise-name-input"]').type('My Custom Exercise');
    cy.get('[data-testid="exercise-description-input"]').type('Description');
    cy.get('[data-testid="next-button"]').click();
    
    cy.get('[data-testid="primary-muscles-input"]').type('quads, glutes');
    cy.get('[data-testid="next-button"]').click();
    
    cy.get('[data-testid="add-instruction-button"]').click();
    cy.get('[placeholder="Step 1..."]').type('Step 1');
    cy.get('[data-testid="next-button"]').click();
    
    // Skip metrics (optional)
    cy.get('[data-testid="save-button"]').click();
    
    // Should have saved
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should cancel exercise creation', () => {
    cy.get('[data-testid="cancel-button"]').click();
    
    // Should navigate away or close modal
    cy.get('[data-testid="exercise-creator"]').should('not.exist');
  });
});
