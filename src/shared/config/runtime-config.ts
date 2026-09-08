export interface RuntimeConfig {
  apiBaseUrl: string
}

export class ConfigError extends Error {
  readonly kind = 'configuration'
}

export function normalizeApiBaseUrl(
  value: unknown,
  locationOrigin = window.location.origin,
): string {
  if (typeof value !== 'string' || value.trim() === '')
    throw new ConfigError('API base URL is missing.')
  const raw = value.trim()
  if (raw.startsWith('/')) {
    if (raw.startsWith('//')) throw new ConfigError('Protocol-relative API URLs are not allowed.')
    return new URL(raw, locationOrigin).toString().replace(/\/$/, '')
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ConfigError('API base URL is malformed.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new ConfigError('API base URL must be a safe HTTP(S) URL.')
  url.hash = ''
  url.search = ''
  return url.toString().replace(/\/$/, '')
}

export function loadRuntimeConfig(): RuntimeConfig {
  return { apiBaseUrl: normalizeApiBaseUrl(window.__OKOSCOPE_CONFIG__?.apiBaseUrl) }
}
