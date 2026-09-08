import { defineConfig, devices } from '@playwright/test'

// Generates the documentation screenshots from the e2e fixtures. Separate from the
// default config, which ignores this spec so ordinary e2e runs stay side-effect free.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'docs-screenshots.spec.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
