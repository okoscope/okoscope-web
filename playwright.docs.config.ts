import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'static-documentation.spec.ts',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4321/docs/', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run build && vite preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/docs/en/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
