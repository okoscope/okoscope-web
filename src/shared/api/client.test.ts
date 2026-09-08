import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient, ApiClientError, shouldRetry } from './client'

const response = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...init.headers },
    ...init,
  })

describe('ApiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends browser credentials and request correlation without tenant authorization', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ id: 'org' }, { headers: { 'x-request-id': 'server-id' } }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new ApiClient({ apiBaseUrl: 'https://api.example' }, vi.fn())
    await expect(api.get('/api/v1/organization', { protected: true })).resolves.toEqual({
      id: 'org',
    })
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('authorization')).toBeNull()
    expect(headers.get('x-request-id')).toBeTruthy()
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('sends lifecycle mutations as protected POST requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: 'acknowledged' }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new ApiClient({ apiBaseUrl: 'https://api.example' }, vi.fn())
    await api.post('/api/v1/runtime-groups/group/acknowledge', { protected: true })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example/api/v1/runtime-groups/group/acknowledge',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('prefers response header request ID and clears on 401', async () => {
    const unauthorized = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(
            { error: 'unauthorized', message: 'No', request_id: 'body-id' },
            { status: 401, headers: { 'x-request-id': 'header-id' } },
          ),
        ),
    )
    const api = new ApiClient({ apiBaseUrl: 'https://api.example' }, unauthorized)
    await expect(api.get('/protected', { protected: true })).rejects.toMatchObject({
      detail: { kind: 'api', status: 401, requestId: 'header-id' },
    })
    expect(unauthorized).toHaveBeenCalledOnce()
  })

  it('does not notify globally for an expected authentication 401', async () => {
    const unauthorized = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(
            { error: 'invalid_credentials', message: 'No', request_id: 'id' },
            { status: 401 },
          ),
        ),
    )
    const api = new ApiClient({ apiBaseUrl: '/' }, unauthorized)
    await expect(
      api.post('/api/v1/auth/login', { body: {}, unauthorized: 'ignore' }),
    ).rejects.toBeInstanceOf(ApiClientError)
    expect(unauthorized).not.toHaveBeenCalled()
  })

  it('normalizes network and malformed JSON failures', async () => {
    const api = new ApiClient({ apiBaseUrl: 'https://api.example' }, vi.fn())
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret internals')))
    await expect(api.get('/x')).rejects.toMatchObject({
      detail: { kind: 'network', message: 'The API could not be reached.' },
    })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('broken', { status: 200, headers: { 'x-request-id': 'bad-json' } }),
        ),
    )
    await expect(api.get('/x')).rejects.toMatchObject({
      detail: { kind: 'invalid-response', requestId: 'bad-json' },
    })
  })

  it('retries only bounded transient failures', () => {
    expect(shouldRetry(0, new Error())).toBe(true)
    expect(shouldRetry(2, new Error())).toBe(false)
    expect(
      shouldRetry(
        0,
        new ApiClientError({
          kind: 'api',
          status: 404,
          code: 'not_found',
          message: 'No',
          requestId: 'id',
        }),
      ),
    ).toBe(false)
    expect(
      shouldRetry(
        0,
        new ApiClientError({
          kind: 'api',
          status: 409,
          code: 'conflict',
          message: 'Conflict',
          requestId: 'id',
        }),
      ),
    ).toBe(false)
  })

  it('accepts empty 204 DELETE responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const api = new ApiClient({ apiBaseUrl: 'https://api.example' }, vi.fn())
    await expect(api.delete('/credential', { protected: true })).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example/credential',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('retains only string field errors from safe envelopes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          {
            error: 'validation_failed',
            message: 'Invalid fields',
            request_id: 'request-id',
            fields: { slug: 'Already exists', unsafe: { token: 'secret' } },
            token: 'must-not-survive',
          },
          { status: 409 },
        ),
      ),
    )
    const api = new ApiClient({ apiBaseUrl: 'https://api.example' }, vi.fn())
    await expect(api.post('/organizations', { body: { name: 'Acme' } })).rejects.toMatchObject({
      detail: {
        code: 'validation_failed',
        fields: { slug: 'Already exists' },
      },
    })
  })
})
