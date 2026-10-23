import { defineConfig } from '@playwright/test'
import base from './playwright.real-backend.config'
export default defineConfig(base, {
  testMatch: 'dns-real-backend.spec.ts',
  outputDir: '/tmp/okoscope-dns-browser-results',
})
