import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  testMatch: 'thread-activity-real-backend.spec.ts',
  workers: 1,
  globalSetup: './e2e/thread-backend.setup.mjs',
  use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure' },
  webServer: {
    command:
      'OKOSCOPE_DEV_API_TARGET=http://127.0.0.1:18090 npm run dev -- --host 127.0.0.1 --port 4180',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
