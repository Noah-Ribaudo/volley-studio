import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL)

export default defineConfig({
  testDir: './tests/e2e/blocking',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop-blocking',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: useExternalServer
    ? undefined
    : {
        command: 'PORT=3100 npm run dev:next',
        url: 'http://localhost:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
})
