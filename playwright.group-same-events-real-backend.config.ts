import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'group-same-events-real-backend.spec.ts',
  workers: 1,
  globalSetup: './e2e/group-same-events-real-backend.setup.mjs',
  globalTeardown: './e2e/group-same-events-real-backend.teardown.mjs',
  use: { baseURL: 'http://127.0.0.1:4181', trace: 'retain-on-failure' },
  webServer: {
    command:
      'OKOSCOPE_DEV_API_TARGET=http://127.0.0.1:18091 npm run dev -- --host 127.0.0.1 --port 4181',
    url: 'http://127.0.0.1:4181',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
