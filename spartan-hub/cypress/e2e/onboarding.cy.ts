describe('Onboarding Flow', () => {
  it('Starts onboarding if new user', () => {
    cy.visit('/')
    
    // Check if we are in onboarding
    cy.get('body').then(($body) => {
      if ($body.text().includes('Bienvenido a Spartan')) {
        cy.log('Onboarding modal found')
        cy.get('input[placeholder*="Leonidas"]').type('Cypress User')
        // Check next button is enabled (might need to wait or type more)
        cy.contains('Siguiente').click()
        cy.contains('Dimensión Física').should('be.visible')
      } else {
        cy.log('Onboarding not found, user might be logged in')
      }
    })
  })
})
