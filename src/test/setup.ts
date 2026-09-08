import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Node 25 exposes an incomplete global localStorage when no backing file is
// configured. Keep tests on a deterministic in-memory browser-compatible store.
const localValues = new Map<string, string>()
const testStorage: Storage = {
  get length() {
    return localValues.size
  },
  clear: () => localValues.clear(),
  getItem: (key) => localValues.get(key) ?? null,
  key: (index) => [...localValues.keys()][index] ?? null,
  removeItem: (key) => void localValues.delete(key),
  setItem: (key, value) => void localValues.set(key, String(value)),
}
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testStorage,
})

afterEach(() => {
  cleanup()
  localStorage.removeItem('okoscope.locale')
  document.title = 'Okoscope'
})
