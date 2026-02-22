import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3002',
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' || browser.name === 'chrome') {
          // Use fake video/audio for testing camera functionality
          launchOptions.args.push('--use-fake-ui-for-media-stream')
          launchOptions.args.push('--use-fake-device-for-media-stream')
          // Optional: feed a video file instead of static noise
          // launchOptions.args.push('--use-file-for-fake-video-capture=cypress/fixtures/sample.y4m')
        }
        return launchOptions
      })
    },
    supportFile: 'cypress/support/e2e.ts',
  },
})
