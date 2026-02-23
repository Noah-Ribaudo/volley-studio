import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 }, // iPhone 14 size
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 834, height: 1194 }, // iPad Pro 11" size
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  // Run local dev server before starting tests
  webServer: useExternalServer
    ? undefined
    : {
        command: 'PORT=3100 npm run dev:next',
        url: 'http://localhost:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
})
