import type { RuntimeConfig } from '../config/runtime-config'
import type { ErrorEnvelope } from './types'

export type ClientError =
  | {
      kind: 'api'
      status: number
      code: string
      message: string
      requestId: string
      fields?: Record<string, string>
    }
  | { kind: 'network'; message: string; requestId: string }
  | { kind: 'invalid-response'; message: string; requestId: string }

export class ApiClientError extends Error {
  constructor(readonly detail: ClientError) {
    super(detail.message)
  }
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!value || typeof value !== 'object') return false
  const object = value as Record<string, unknown>
  return ['error', 'message', 'request_id'].every((key) => typeof object[key] === 'string')
}

function safeFields(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const fields = (value as Record<string, unknown>).fields
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return undefined
  const safe = Object.fromEntries(
    Object.entries(fields).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
  return Object.keys(safe).length ? safe : undefined
}

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false
  return !(
    error instanceof ApiClientError &&
    error.detail.kind === 'api' &&
    [400, 401, 404, 409].includes(error.detail.status)
  )
}

export class ApiClient {
  constructor(
    private readonly config: RuntimeConfig,
    private readonly onUnauthorized: () => void,
  ) {}

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options)
  }

  async post<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, options)
  }

  async put<T>(path: string, options: RequestOptions & { body: unknown }): Promise<T> {
    return this.request<T>('PUT', path, options)
  }

  async patch<T>(path: string, options: RequestOptions & { body: unknown }): Promise<T> {
    return this.request<T>('PATCH', path, options)
  }

  async delete(path: string, options: RequestOptions = {}): Promise<void> {
    return this.request<void>('DELETE', path, options)
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: RequestOptions,
  ): Promise<T> {
    const requestId = crypto.randomUUID()
    const headers = new Headers({ Accept: 'application/json', 'X-Request-Id': requestId })
    for (const [name, value] of Object.entries(options.headers ?? {})) headers.set(name, value)
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    let response: Response
    try {
      response = await fetch(`${this.config.apiBaseUrl}${path}`, {
        method,
        headers,
        credentials: 'include',
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      })
    } catch {
      throw new ApiClientError({
        kind: 'network',
        message: 'The API could not be reached.',
        requestId,
      })
    }
    const headerId = response.headers.get('x-request-id')
    if (response.ok && (response.status === 204 || response.headers.get('content-length') === '0'))
      return undefined as T
    let body: unknown
    try {
      body = await response.json()
    } catch {
      throw new ApiClientError({
        kind: 'invalid-response',
        message: 'The API returned invalid JSON.',
        requestId: headerId ?? requestId,
      })
    }
    if (!response.ok) {
      const envelope = isErrorEnvelope(body) ? body : null
      const fields = envelope ? safeFields(envelope) : undefined
      const detail: ClientError = {
        kind: 'api',
        status: response.status,
        code: envelope?.error ?? 'request_failed',
        message: envelope?.message ?? `Request failed (${response.status}).`,
        requestId: headerId ?? envelope?.request_id ?? requestId,
        ...(fields ? { fields } : {}),
      }
      if (response.status === 401 && options.protected && options.unauthorized !== 'ignore')
        this.onUnauthorized()
      throw new ApiClientError(detail)
    }
    if (!body || typeof body !== 'object')
      throw new ApiClientError({
        kind: 'invalid-response',
        message: 'The API returned an unexpected response.',
        requestId: headerId ?? requestId,
      })
    return body as T
  }
}

type RequestOptions = {
  protected?: boolean
  unauthorized?: 'notify' | 'ignore'
  signal?: AbortSignal
  body?: unknown
  headers?: Record<string, string>
}
