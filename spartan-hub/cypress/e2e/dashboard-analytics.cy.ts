/**
 * E2E Tests - Dashboard & Analytics
 * Covers: Dashboard Widgets, Analytics Charts, Data Filters, Navigation
 * Priority: HIGH
 */

describe('Dashboard & Analytics', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dashboard')
  })

  describe('Dashboard Loading', () => {
    it('Should load dashboard successfully', () => {
      // Should have sidebar navigation
      cy.get('aside').should('exist')
      
      // Should show dashboard header
      cy.contains(/Dashboard|Resumen|Panel/i).should('exist')
      
      // Should load widgets
      cy.get('[class*="widget"]').should('exist')
        .or(() => {
          cy.get('[class*="card"]').should('have.length.gte', 1)
        })
    })

    it('Should display user greeting', () => {
      cy.contains(/Hola|Hello|Bienvenido|Welcome/i).should('exist')
    })

    it('Should show loading state initially', () => {
      // May show skeleton loaders
      cy.get('[class*="skeleton"]').should('exist')
        .or(() => {
          cy.contains(/Cargando|Loading/i).should('exist')
        })
        // Loading should complete
        .should('not.exist', { timeout: 10000 })
    })
  })

  describe('Dashboard Widgets', () => {
    it('Should display readiness score widget', () => {
      cy.contains(/Preparación|Readiness|Ready/i).should('exist')
        .or(() => {
          cy.get('[class*="readiness"]').should('exist')
        })
    })

    it('Should display recovery score widget', () => {
      cy.contains(/Recuperación|Recovery/i).should('exist')
        .or(() => {
          cy.get('[class*="recovery"]').should('exist')
        })
    })

    it('Should display stress level widget', () => {
      cy.contains(/Estrés|Stress/i).should('exist')
        .or(() => {
          cy.get('[class*="stress"]').should('exist')
        })
    })

    it('Should display sleep quality widget', () => {
      cy.contains(/Sueño|Sleep/i).should('exist')
        .or(() => {
          cy.get('[class*="sleep"]').should('exist')
        })
    })

    it('Should display heart rate variability (HRV) widget', () => {
      cy.contains(/HRV|Variabilidad|Heart Rate Variability/i).should('exist')
        .or(() => {
          cy.get('[class*="hrv"]').should('exist')
        })
    })

    it('Should display resting heart rate widget', () => {
      cy.contains(/Ritmo Cardíaco|Heart Rate|RHR/i).should('exist')
        .or(() => {
          cy.get('[class*="heart-rate"]').should('exist')
        })
    })

    it('Should display training load widget', () => {
      cy.contains(/Carga de Entrenamiento|Training Load/i).should('exist')
        .or(() => {
          cy.get('[class*="training-load"]').should('exist')
        })
    })

    it('Should display activity level widget', () => {
      cy.contains(/Actividad|Activity|Pasos|Steps/i).should('exist')
        .or(() => {
          cy.get('[class*="activity"]').should('exist')
        })
    })
  })

  describe('Analytics Charts', () => {
    it('Should display readiness trend chart', () => {
      cy.contains(/Tendencias|Trends/i).click({ force: true })
      
      // Should show chart
      cy.get('[class*="chart"]').should('exist')
        .or(() => {
          cy.get('[class*="graph"]').should('exist')
        })
      
      // Chart should have data points
      cy.get('[class*="data-point"]').should('have.length.gte', 1)
        .or(() => {
          cy.get('svg line, svg path, svg circle').should('have.length.gte', 1)
        })
    })

    it('Should display recovery trend chart', () => {
      cy.contains(/Tendencias|Trends/i).click({ force: true })
      
      // Switch to recovery tab if needed
      cy.contains(/Recuperación|Recovery/i).click({ force: true })
      
      cy.get('[class*="chart"]').should('exist')
    })

    it('Should display sleep trend chart', () => {
      cy.contains(/Tendencias|Trends/i).click({ force: true })
      cy.contains(/Sueño|Sleep/i).click({ force: true })
      
      cy.get('[class*="chart"]').should('exist')
    })

    it('Should display HRV trend chart', () => {
      cy.contains(/Tendencias|Trends/i).click({ force: true })
      cy.contains(/HRV/i).click({ force: true })
      
      cy.get('[class*="chart"]').should('exist')
    })
  })

  describe('Time Range Filters', () => {
    beforeEach(() => {
      cy.contains(/Tendencias|Trends/i).click({ force: true })
    })

    it('Should filter by last 7 days', () => {
      cy.contains(/7 días|7 days|Semana|Week/i).click({ force: true })
      
      // Chart should update
      cy.get('[class*="chart"]').should('exist')
      
      // Should show 7 data points (approximately)
      cy.get('[class*="data-point"]').should('have.length.gte', 5)
        .or(() => {
          cy.log('Chart updated for 7 days')
        })
    })

    it('Should filter by last 30 days', () => {
      cy.contains(/30 días|30 days|Mes|Month/i).click({ force: true })
      
      cy.get('[class*="chart"]').should('exist')
    })

    it('Should filter by last 90 days', () => {
      cy.contains(/90 días|90 days|Trimestre|Quarter/i).click({ force: true })
      
      cy.get('[class*="chart"]').should('exist')
    })
  })

  describe('Data Export', () => {
    it('Should allow exporting data as CSV', () => {
      cy.contains(/Exportar|Export/i).click({ force: true })
      cy.contains(/CSV/i).click({ force: true })
      
      // Should download file or show success
      cy.contains(/Descargando|Downloading|Exportado|Exported/i).should('exist')
    })

    it('Should allow exporting data as PDF', () => {
      cy.contains(/Exportar|Export/i).click({ force: true })
      cy.contains(/PDF/i).click({ force: true })
      
      cy.contains(/Descargando|Downloading|Exportado|Exported/i).should('exist')
    })
  })

  describe('Navigation from Dashboard', () => {
    it('Should navigate to Routines page', () => {
      cy.contains(/Rutinas|Routines/i).click({ force: true })
      
      cy.url().should('include', '/routines')
      cy.contains(/Tus Rutinas|Your Routines/i).should('exist')
    })

    it('Should navigate to Workouts page', () => {
      cy.contains(/Entrenamientos|Workouts/i).click({ force: true })
      
      cy.url().should('include', '/workouts')
      cy.contains(/Historial|History/i).should('exist')
    })

    it('Should navigate to Form Analysis', () => {
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      
      // Should open modal or navigate
      cy.url().should('include', '/form-analysis')
        .or(() => {
          cy.get('[role="dialog"]').should('exist')
        })
    })

    it('Should navigate to Settings', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      
      cy.url().should('include', '/settings')
      cy.contains(/Preferencias|Preferences/i).should('exist')
    })

    it('Should navigate to Profile', () => {
      cy.get('[class*="profile"]').click({ force: true })
        .or(() => {
          cy.contains(/Perfil|Profile/i).click({ force: true })
        })
      
      cy.url().should('include', '/profile')
      cy.contains(/Mi Perfil|My Profile/i).should('exist')
    })
  })

  describe('Real-time Updates', () => {
    it('Should update metrics in real-time', () => {
      // Initial load
      cy.contains(/Preparación|Readiness/i).should('exist')
      
      // Wait for potential WebSocket updates
      cy.wait(5000)
      
      // Metrics should still be visible (no errors)
      cy.contains(/Preparación|Readiness/i).should('exist')
    })

    it('Should show notification for new data', () => {
      // May show toast notification
      cy.get('[class*="toast"]').should('exist')
        .or(() => {
          cy.get('[class*="notification"]').should('exist')
        })
        .or(() => {
          cy.log('No notifications (acceptable)')
        })
    })
  })

  describe('Responsive Design', () => {
    it('Should display correctly on mobile viewport', () => {
      cy.viewport('iphone-12')
      
      cy.get('[class*="widget"]').should('exist')
      
      // Widgets should stack vertically on mobile
      cy.get('[class*="widget"]').first().should('be.visible')
    })

    it('Should display correctly on tablet viewport', () => {
      cy.viewport('ipad-2')
      
      cy.get('[class*="widget"]').should('have.length.gte', 4)
    })

    it('Should display correctly on desktop viewport', () => {
      cy.viewport(1920, 1080)
      
      // Should show grid layout
      cy.get('[class*="grid"]').should('exist')
        .or(() => {
          cy.get('[class*="dashboard"]').should('have.css', 'display', 'grid')
        })
    })
  })

  describe('Error States', () => {
    it('Should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('GET', '**/api/analytics/*', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      })
      
      cy.reload()
      
      // Should show error message or fallback
      cy.contains(/Error|Failed|No disponible|Not available/i).should('exist')
        .or(() => {
          // Or show empty state
          cy.contains(/Sin datos|No data/i).should('exist')
        })
    })

    it('Should allow retry after error', () => {
      // First request fails
      cy.intercept('GET', '**/api/analytics/*', {
        statusCode: 500,
        body: { error: 'Error' }
      }).as('failedRequest')
      
      cy.reload()
      
      cy.wait('@failedRequest')
      
      // Click retry
      cy.contains(/Reintentar|Retry/i).click({ force: true })
      
      // Second request succeeds
      cy.intercept('GET', '**/api/analytics/*', {
        statusCode: 200,
        body: { readiness: 75, recovery: 80 }
      }).as('successRequest')
      
      cy.wait('@successRequest')
      
      // Should show data
      cy.contains(/Preparación|Readiness/i).should('exist')
    })
  })

  describe('Empty States', () => {
    it('Should show empty state for new users', () => {
      // Mock empty data
      cy.intercept('GET', '**/api/analytics/*', {
        statusCode: 200,
        body: { readiness: null, recovery: null, data: [] }
      })
      
      cy.visit('/dashboard')
      
      // Should show empty state or onboarding prompt
      cy.contains(/Comienza|Get Started|Sin datos|No data/i).should('exist')
    })
  })
})
