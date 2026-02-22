describe('Basic E2E Test', () => {
  it('Loads the application correctly', () => {
    cy.visit('/')
    cy.title().should('include', 'Spartan')
    cy.get('#root').should('be.visible')
  })
})
