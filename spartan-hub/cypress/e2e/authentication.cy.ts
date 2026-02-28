/**
 * E2E Tests - Authentication Flow
 * Covers: Login, Logout, Session Management, Token Refresh
 * Priority: CRITICAL
 */

describe('Authentication Flow', () => {
  const testUser = {
    email: `test_${Date.now()}@spartan.com`,
    password: 'TestUser123!',
    name: 'Test Spartan User'
  }

  beforeEach(() => {
    cy.clearAllCookies()
    cy.clearAllLocalStorage()
    cy.clearAllSessionStorage()
  })

  describe('Registration', () => {
    it('Should register a new user successfully', () => {
      cy.visit('/')
      
      // Navigate to register page
      cy.contains(/Registrarse|Sign Up/i).click()
      
      // Fill registration form
      cy.get('input[name="name"]').type(testUser.name)
      cy.get('input[name="email"]').type(testUser.email)
      cy.get('input[name="password"]').type(testUser.password)
      cy.get('input[name="confirmPassword"]').type(testUser.password)
      
      // Submit form
      cy.get('button[type="submit"]').click()
      
      // Should redirect to dashboard or show success
      cy.url().should('include', '/dashboard')
        .or(() => {
          cy.contains(/Bienvenido|Welcome/i).should('exist')
        })
    })

    it('Should show error for invalid email format', () => {
      cy.visit('/')
      cy.contains(/Registrarse|Sign Up/i).click()
      
      cy.get('input[name="name"]').type('Test User')
      cy.get('input[name="email"]').type('invalid-email')
      cy.get('input[name="password"]').type('Test123!')
      cy.get('input[name="confirmPassword"]').type('Test123!')
      
      cy.get('button[type="submit"]').click()
      
      // Should show validation error
      cy.contains(/email inválido|invalid email/i).should('exist')
        .or(() => {
          cy.get('input[name="email"]:invalid').should('exist')
        })
    })

    it('Should show error for password mismatch', () => {
      cy.visit('/')
      cy.contains(/Registrarse|Sign Up/i).click()
      
      cy.get('input[name="name"]').type('Test User')
      cy.get('input[name="email"]').type(testUser.email)
      cy.get('input[name="password"]').type('Test123!')
      cy.get('input[name="confirmPassword"]').type('Different123!')
      
      cy.get('button[type="submit"]').click()
      
      cy.contains(/las contraseñas no coinciden|passwords do not match/i).should('exist')
    })
  })

  describe('Login', () => {
    beforeEach(() => {
      // Create user via API before each test
      cy.request({
        method: 'POST',
        url: 'http://localhost:3001/auth/register',
        body: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
          role: 'user'
        },
        failOnStatusCode: false
      })
    })

    it('Should login with valid credentials', () => {
      cy.visit('/')
      cy.contains(/Iniciar Sesión|Log In/i).click()
      
      cy.get('input[name="email"]').type(testUser.email)
      cy.get('input[name="password"]').type(testUser.password)
      cy.get('button[type="submit"]').click()
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
        .or(() => {
          cy.contains(/Dashboard|Resumen/i).should('exist')
        })
      
      // Should have auth token
      cy.window().its('localStorage').invoke('getItem', 'token').should('exist')
    })

    it('Should show error for invalid credentials', () => {
      cy.visit('/')
      cy.contains(/Iniciar Sesión|Log In/i).click()
      
      cy.get('input[name="email"]').type('invalid@spartan.com')
      cy.get('input[name="password"]').type('WrongPassword123!')
      cy.get('button[type="submit"]').click()
      
      // Should show error message
      cy.contains(/credenciales inválidas|invalid credentials|error/i).should('exist')
    })

    it('Should show error for non-existent user', () => {
      cy.visit('/')
      cy.contains(/Iniciar Sesión|Log In/i).click()
      
      cy.get('input[name="email"]').type('nonexistent@spartan.com')
      cy.get('input[name="password"]').type('Test123!')
      cy.get('button[type="submit"]').click()
      
      cy.contains(/no encontrado|not found|error/i).should('exist')
    })
  })

  describe('Logout', () => {
    beforeEach(() => {
      // Login before each test
      cy.login()
      cy.visit('/dashboard')
    })

    it('Should logout successfully', () => {
      // Find and click logout button
      cy.get('button').contains(/Cerrar Sesión|Logout/i).click()
      
      // Should redirect to login or home
      cy.url().should('not.include', '/dashboard')
      
      // Should clear auth token
      cy.window().its('localStorage').invoke('getItem', 'token').should('be.null')
    })

    it('Should prevent access to protected routes after logout', () => {
      cy.get('button').contains(/Cerrar Sesión|Logout/i).click()
      
      // Try to access protected route
      cy.visit('/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/login')
        .or(() => {
          cy.contains(/Iniciar Sesión|Log In/i).should('exist')
        })
    })
  })

  describe('Session Management', () => {
    it('Should maintain session across page refreshes', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Verify logged in state
      cy.contains(/Dashboard|Resumen/i).should('exist')
      
      // Refresh page
      cy.reload()
      
      // Should still be logged in
      cy.contains(/Dashboard|Resumen/i).should('exist')
      cy.url().should('include', '/dashboard')
    })

    it('Should clear session when token expires', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Manually expire token
      cy.window().then((win) => {
        win.localStorage.setItem('token', 'expired-token')
        win.localStorage.setItem('tokenExpiry', JSON.stringify(Date.now() - 1000))
      })
      
      // Try to access protected route
      cy.visit('/profile')
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })
  })

  describe('Password Recovery', () => {
    it('Should request password reset', () => {
      cy.visit('/')
      cy.contains(/Iniciar Sesión|Log In/i).click()
      
      // Click forgot password
      cy.contains(/Olvidaste tu contraseña|Forgot Password/i).click()
      
      // Enter email
      cy.get('input[name="email"]').type(testUser.email)
      cy.get('button[type="submit"]').click()
      
      // Should show success message (even if email doesn't exist for security)
      cy.contains(/hemos enviado|sent|reset/i).should('exist')
    })
  })
})
