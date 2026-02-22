/// <reference types="cypress" />

Cypress.Commands.add('login', (email = 'dev_test_user@example.com', password = 'TestUser123!') => {
  cy.session([email, password], () => {
    // 1. Get CSRF token first (if needed, based on useAuth implementation)
    // The backend might set a cookie or return it. useAuth fetches /api/csrf-token
    // But typically cy.request handles cookies automatically.
    
    // 2. Perform login or register
    cy.request({
      method: 'POST',
      url: 'http://localhost:3001/auth/login', // Direct to backend to avoid proxy issues during auth
      body: { email, password },
      failOnStatusCode: false
    }).then((resp) => {
      if (resp.status === 401 || resp.status === 400 || resp.status === 404) {
        cy.log('Login failed, attempting registration')
        cy.request({
          method: 'POST',
          url: 'http://localhost:3001/auth/register',
          body: { email, password, name: 'Test User', role: 'user' }
        }).then((regResp) => {
          expect(regResp.status).to.be.oneOf([200, 201])
        })
      } else {
        expect(resp.status).to.eq(200)
      }
    })
  }, {
    validate: () => {
      // Skip backend validation for now to rely on frontend intercept
      // cy.request('http://localhost:3001/auth/me').its('status').should('eq', 200)
    }
  })
})

declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
    }
  }
}

export {}
