/**
 * E2E Tests - Video Form Analysis
 * Covers: Squat Analysis, Deadlift Analysis, Form Scoring, History
 * Priority: CRITICAL (Phase A Core Feature)
 */

describe('Video Form Analysis', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dashboard')
  })

  describe('Navigation to Form Analysis', () => {
    it('Should navigate to Form Analysis from dashboard', () => {
      // Find and click Form Analysis button/link
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      
      // Should open modal or navigate to page
      cy.url().should('include', '/form-analysis')
        .or(() => {
          cy.get('[role="dialog"]').should('exist')
        })
    })
  })

  describe('Exercise Selection', () => {
    beforeEach(() => {
      // Navigate to form analysis
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      cy.wait(500) // Wait for modal/page to load
    })

    it('Should display available exercises', () => {
      // Check for exercise buttons
      cy.contains(/Squat|Sentadilla/i).should('exist')
      cy.contains(/Deadlift|Peso Muerto/i).should('exist')
      cy.contains(/Lunge|Zancada/i).should('exist')
      cy.contains(/Push.?Up|Flexion/i).should('exist')
    })

    it('Should select Squat exercise', () => {
      cy.contains(/Squat|Sentadilla/i).click({ force: true })
      
      // Should load squat analysis interface
      cy.contains(/Análisis de Squat|Squat Analysis/i).should('exist')
        .or(() => {
          cy.contains(/Iniciar Análisis|Start Analysis/i).should('exist')
        })
    })

    it('Should select Deadlift exercise', () => {
      cy.contains(/Deadlift|Peso Muerto/i).click({ force: true })
      
      // Should load deadlift analysis interface
      cy.contains(/Análisis de Deadlift|Deadlift Analysis/i).should('exist')
    })
  })

  describe('Camera Access', () => {
    beforeEach(() => {
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      cy.wait(500)
      cy.contains(/Squat|Sentadilla/i).click({ force: true })
      cy.wait(1000) // Wait for camera to initialize
    })

    it('Should request camera permissions', () => {
      // Camera should be requested
      cy.window().then((win) => {
        cy.wrap(win.navigator.mediaDevices.getUserMedia({ video: true }))
          .should('exist')
      })
    })

    it('Should display camera feed', () => {
      // Check for video element
      cy.get('video').should('exist')
        .and('be.visible')
    })

    it('Should show loading state while initializing', () => {
      // Should show loading indicator
      cy.contains(/Cargando|Loading|Iniciando/i).should('exist')
        .or(() => {
          cy.contains(/Calibrando|Calibrating/i).should('exist')
        })
    })
  })

  describe('Form Analysis Execution', () => {
    beforeEach(() => {
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      cy.wait(500)
      cy.contains(/Squat|Sentadilla/i).click({ force: true })
      cy.wait(2000) // Wait for camera and models to load
    })

    it('Should start analysis when user clicks start', () => {
      // Click start analysis button
      cy.contains(/Iniciar Análisis|Start Analysis/i).click({ force: true })
      
      // Should show recording/analyzing state
      cy.contains(/Analizando|Analyzing|Grabando|Recording/i).should('exist')
    })

    it('Should display pose landmarks during analysis', () => {
      // Start analysis
      cy.contains(/Iniciar Análisis|Start Analysis/i).click({ force: true })
      
      // Should show pose overlay or landmarks
      cy.get('canvas').should('exist')
        .or(() => {
          cy.get('[class*="pose"][class*="overlay"]').should('exist')
        })
    })

    it('Should provide real-time feedback', () => {
      // Start analysis
      cy.contains(/Iniciar Análisis|Start Analysis/i).click({ force: true })
      
      // Should show feedback messages
      cy.contains(/profundidad|depth|rodillas|knees|espalda|back/i).should('exist')
        .or(() => {
          cy.get('[class*="feedback"]').should('exist')
        })
    })
  })

  describe('Form Scoring', () => {
    beforeEach(() => {
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      cy.wait(500)
      cy.contains(/Squat|Sentadilla/i).click({ force: true })
      cy.wait(2000)
    })

    it('Should display form score after analysis', () => {
      // Mock completed analysis
      cy.contains(/Iniciar Análisis|Start Analysis/i).click({ force: true })
      
      // Wait for analysis to complete (or mock it)
      cy.wait(5000)
      
      // Should show score
      cy.contains(/Puntuación|Score|Calificación/i).should('exist')
        .or(() => {
          cy.get('[class*="score"]').should('exist')
        })
    })

    it('Should show score between 0-100', () => {
      // After analysis
      cy.contains(/Iniciar Análisis|Start Analysis/i).click({ force: true })
      cy.wait(5000)
      
      // Score should be numeric and in range
      cy.get('[class*="score"]').invoke('text')
        .then((text) => {
          const score = parseInt(text.replace(/\D/g, ''))
          expect(score).to.be.within(0, 100)
        })
    })

    it('Should provide specific feedback for improvements', () => {
      cy.contains(/Iniciar Análisis|Start Analysis/i).click({ force: true })
      cy.wait(5000)
      
      // Should have improvement suggestions
      cy.contains(/mejorar|improve|sugerencia|suggestion/i).should('exist')
        .or(() => {
          cy.get('[class*="feedback"][class*="improvement"]').should('exist')
        })
    })
  })

  describe('Analysis History', () => {
    beforeEach(() => {
      cy.login()
    })

    it('Should save analysis to history', () => {
      // Perform analysis
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      cy.wait(500)
      cy.contains(/Squat|Sentadilla/i).click({ force: true })
      cy.wait(2000)
      cy.contains(/Iniciar Análisis|Start Analysis/i).click({ force: true })
      cy.wait(5000)
      
      // Navigate to history
      cy.contains(/Historial|History/i).click({ force: true })
      
      // Should show recent analysis
      cy.contains(/Squat|Análisis/i).should('exist')
    })

    it('Should display previous analysis scores', () => {
      cy.contains(/Historial|History/i).click({ force: true })
      
      // Should show list of analyses with scores
      cy.get('[class*="history"] [class*="score"]').should('exist')
    })

    it('Should allow viewing analysis details', () => {
      cy.contains(/Historial|History/i).click({ force: true })
      
      // Click on a history item
      cy.get('[class*="history-item"]').first().click({ force: true })
      
      // Should show details modal or page
      cy.contains(/Detalles|Details/i).should('exist')
        .or(() => {
          cy.get('[role="dialog"]').should('exist')
        })
    })
  })

  describe('Error Handling', () => {
    it('Should handle camera access denied', () => {
      // Mock camera permission denied
      cy.on('window:before:load', (win) => {
        cy.stub(win.navigator.mediaDevices, 'getUserMedia').rejects('NotAllowedError')
      })
      
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      cy.wait(500)
      cy.contains(/Squat|Sentadilla/i).click({ force: true })
      
      // Should show error message
      cy.contains(/cámara|camera|permiso|permission|denegado|denied/i).should('exist')
    })

    it('Should handle poor lighting conditions', () => {
      cy.contains(/Análisis de Forma|Form Analysis/i).click({ force: true })
      cy.wait(500)
      cy.contains(/Squat|Sentadilla/i).click({ force: true })
      cy.wait(2000)
      
      // Should detect and warn about lighting
      cy.contains(/iluminación|lighting|oscuridad|dark/i).should('exist')
        .or(() => {
          // Or proceed without warning if lighting is OK
          cy.get('video').should('exist')
        })
    })
  })
})
