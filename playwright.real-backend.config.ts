import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'runtime-label-real-backend.spec.ts',
  workers: 1,
  globalSetup: './e2e/real-backend.setup.mjs',
  globalTeardown: './e2e/real-backend.teardown.mjs',
  use: { baseURL: 'http://127.0.0.1:4179', trace: 'retain-on-failure' },
  webServer: {
    command:
      'OKOSCOPE_DEV_API_TARGET=http://127.0.0.1:18089 npm run dev -- --host 127.0.0.1 --port 4179',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
