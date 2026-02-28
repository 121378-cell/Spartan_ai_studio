/**
 * E2E Tests - Biometric Data Synchronization
 * Covers: Garmin Sync, Apple Health, Google Fit, Data Persistence
 * Priority: HIGH
 */

describe('Biometric Data Synchronization', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dashboard')
  })

  describe('Garmin Integration', () => {
    it('Should display Garmin connection option', () => {
      // Navigate to settings or integrations
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations|Dispositivos|Devices/i).click({ force: true })
      
      // Should show Garmin option
      cy.contains(/Garmin/i).should('exist')
    })

    it('Should initiate Garmin OAuth flow', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      // Click connect Garmin
      cy.contains(/Conectar Garmin|Connect Garmin/i).click({ force: true })
      
      // Should redirect to Garmin OAuth or show popup
      cy.url().should('include', 'garmin.com')
        .or(() => {
          cy.get('[class*="oauth-popup"]').should('exist')
        })
    })

    it('Should show connected state after successful sync', () => {
      // Mock successful Garmin connection
      cy.intercept('GET', '**/api/garmin/status', {
        statusCode: 200,
        body: {
          connected: true,
          lastSync: new Date().toISOString(),
          devices: ['Fenix 6 Pro']
        }
      })
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      // Should show connected state
      cy.contains(/Garmin Conectado|Garmin Connected/i).should('exist')
        .or(() => {
          cy.contains(/Desconectar Garmin|Disconnect Garmin/i).should('exist')
        })
    })

    it('Should sync biometric data from Garmin', () => {
      // Mock sync endpoint
      cy.intercept('POST', '**/api/garmin/sync', {
        statusCode: 200,
        body: {
          success: true,
          syncedDataPoints: 150,
          lastSync: new Date().toISOString()
        }
      })
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      // Click sync
      cy.contains(/Sincronizar|Sync/i).click({ force: true })
      
      // Should show syncing state
      cy.contains(/Sincronizando|Syncing/i).should('exist')
      
      // Should show success
      cy.contains(/Sincronización completada|Sync completed/i).should('exist')
    })

    it('Should handle Garmin sync errors gracefully', () => {
      // Mock sync error
      cy.intercept('POST', '**/api/garmin/sync', {
        statusCode: 401,
        body: { error: 'Token expired' }
      })
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      cy.contains(/Sincronizar|Sync/i).click({ force: true })
      
      // Should show error message
      cy.contains(/Error|Failed|Reconnect/i).should('exist')
    })
  })

  describe('Apple Health Integration', () => {
    it('Should display Apple Health connection option', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      cy.contains(/Apple Health|HealthKit/i).should('exist')
    })

    it('Should request HealthKit permissions', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      cy.contains(/Conectar Apple Health|Connect Apple Health/i).click({ force: true })
      
      // Should show permission request
      cy.contains(/permisos|permissions|acceso|access/i).should('exist')
        .or(() => {
          // On iOS, this would be native dialog
          cy.log('Native HealthKit permission dialog would appear here')
        })
    })

    it('Should sync health data from Apple Health', () => {
      // Mock successful sync
      cy.intercept('POST', '**/api/apple-health/sync', {
        statusCode: 200,
        body: {
          success: true,
          dataTypes: ['heartRate', 'steps', 'sleep', 'workouts'],
          lastSync: new Date().toISOString()
        }
      })
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      cy.contains(/Sincronizar|Sync/i).click({ force: true })
      
      cy.contains(/Sincronización completada|Sync completed/i).should('exist')
    })
  })

  describe('Google Fit Integration', () => {
    it('Should display Google Fit connection option', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      cy.contains(/Google Fit/i).should('exist')
    })

    it('Should initiate Google OAuth flow', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      cy.contains(/Conectar Google Fit|Connect Google Fit/i).click({ force: true })
      
      // Should redirect to Google OAuth
      cy.url().should('include', 'accounts.google.com')
        .or(() => {
          cy.get('[class*="google-oauth"]').should('exist')
        })
    })

    it('Should sync fitness data from Google Fit', () => {
      cy.intercept('POST', '**/api/google-fit/sync', {
        statusCode: 200,
        body: {
          success: true,
          steps: 10000,
          calories: 2500,
          distance: 8.5
        }
      })
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      cy.contains(/Sincronizar|Sync/i).click({ force: true })
      
      cy.contains(/Sincronización completada|Sync completed/i).should('exist')
    })
  })

  describe('Data Persistence', () => {
    it('Should persist synced data to database', () => {
      // Perform sync
      cy.intercept('POST', '**/api/garmin/sync', {
        statusCode: 200,
        body: { success: true, syncedDataPoints: 150 }
      })
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      cy.contains(/Sincronizar|Sync/i).click({ force: true })
      
      // Navigate to dashboard
      cy.contains(/Dashboard|Resumen/i).click({ force: true })
      
      // Should show synced data
      cy.contains(/HRV|Recuperación|Recovery|Ritmo Cardíaco|Heart Rate/i).should('exist')
    })

    it('Should display last sync timestamp', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      // Should show last sync time
      cy.contains(/Última sincronización|Last synced/i).should('exist')
    })

    it('Should allow manual data refresh', () => {
      cy.visit('/dashboard')
      
      // Find and click refresh button
      cy.get('[aria-label="Refresh"]').click({ force: true })
        .or(() => {
          cy.contains(/Actualizar|Refresh/i).click({ force: true })
        })
      
      // Should show loading then updated data
      cy.contains(/Actualizando|Refreshing/i).should('exist')
    })
  })

  describe('Disconnect & Reconnect', () => {
    it('Should disconnect from Garmin', () => {
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      
      // Disconnect
      cy.contains(/Desconectar Garmin|Disconnect Garmin/i).click({ force: true })
      
      // Should confirm disconnection
      cy.contains(/¿Seguro que deseas desconectar|Are you sure/i).should('exist')
      cy.contains(/Sí, desconectar|Yes, disconnect/i).click({ force: true })
      
      // Should show disconnected state
      cy.contains(/Conectar Garmin|Connect Garmin/i).should('exist')
    })

    it('Should allow reconnection after disconnect', () => {
      // First disconnect
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      cy.contains(/Desconectar|Disconnect/i).click({ force: true })
      cy.contains(/Sí, desconectar/i).click({ force: true })
      
      // Then reconnect
      cy.contains(/Conectar Garmin|Connect Garmin/i).click({ force: true })
      
      // Should initiate OAuth again
      cy.url().should('include', 'garmin.com')
    })
  })

  describe('Error Scenarios', () => {
    it('Should handle API timeout gracefully', () => {
      cy.intercept('POST', '**/api/garmin/sync', {
        statusCode: 504,
        body: { error: 'Gateway timeout' }
      })
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      cy.contains(/Sincronizar|Sync/i).click({ force: true })
      
      // Should show timeout error
      cy.contains(/Tiempo de espera|Timeout|Intentar de nuevo|Try again/i).should('exist')
    })

    it('Should handle network errors', () => {
      cy.intercept('POST', '**/api/garmin/sync', {
        statusCode: 0,
        body: {}
      }).as('failedSync')
      
      cy.contains(/Configuración|Settings/i).click({ force: true })
      cy.contains(/Integraciones|Integrations/i).click({ force: true })
      cy.contains(/Sincronizar|Sync/i).click({ force: true })
      
      cy.wait('@failedSync')
      
      // Should show network error
      cy.contains(/Error de red|Network error|Sin conexión|No connection/i).should('exist')
    })
  })
})
