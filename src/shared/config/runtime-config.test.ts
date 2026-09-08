import { describe, expect, it } from 'vitest'
import { ConfigError, normalizeApiBaseUrl } from './runtime-config'

describe('runtime config', () => {
  it('normalizes same-origin and absolute URLs', () => {
    expect(normalizeApiBaseUrl('/api/', 'https://ui.example')).toBe('https://ui.example/api')
    expect(normalizeApiBaseUrl('https://api.example/')).toBe('https://api.example')
  })

  it.each(['', 'ftp://api.example', '//evil.example', 'https://secret:token@api.example'])(
    'rejects unsafe value %s',
    (value) => expect(() => normalizeApiBaseUrl(value)).toThrow(ConfigError),
  )
})
