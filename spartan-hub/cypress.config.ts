/**
 * Cypress Configuration
 * Phase A: Video Form Analysis MVP
 */

import { defineConfig } from 'cypress';

export default defineConfig({
  // Project settings
  projectId: 'spartan-hub-phase-a',
  
  // Viewports
  viewportWidth: 1280,
  viewportHeight: 720,
  
  // Timeouts
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  responseTimeout: 30000,
  pageLoadTimeout: 60000,
  
  // Screenshots & Videos
  screenshotOnRunFailure: true,
  video: true,
  videoCompression: true,
  trashAssetsBeforeRuns: true,
  
  // Retries
  retries: {
    runMode: 2,
    openMode: 0
  },
  
  // E2E Testing
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    downloadsFolder: 'cypress/downloads',
    
    setupNodeEvents(on, config) {
      // Handle screenshots
      on('after:screenshot', (details) => {
        console.log('Screenshot captured:', details);
      });
      
      // Handle videos
      on('after:spec', (spec, results) => {
        if (results && results.video) {
          console.log('Video saved:', results.video);
        }
      });
      
      return config;
    }
  },
  
  // Component Testing
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    indexHtmlFile: 'cypress/support/component-index.html'
  },
  
  // Environment variables
  env: {
    apiUrl: 'http://localhost:3001/api',
    wsUrl: 'ws://localhost:3001',
    testUser: {
      email: 'test@spartanhub.io',
      password: 'TestUser123!'
    }
  }
});
