import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from './client'
import {
  applicationAttentionOptions,
  applicationWorkersOptions,
  organizationAttentionOptions,
  queryKeys,
} from './queries'

describe('application worker queries', () => {
  it('scopes cache identity by Project and Application without credentials', () => {
    expect(queryKeys.applicationWorkers('project-a', 'application-a')).not.toEqual(
      queryKeys.applicationWorkers('project-a', 'application-b'),
    )
    expect(
      JSON.stringify(queryKeys.applicationWorkers('project-a', 'application-a')),
    ).not.toContain('credential')
  })

  it('uses a generated worker page query with an opaque next cursor', () => {
    const options = applicationWorkersOptions({ get: vi.fn() } as unknown as ApiClient, 'p', 'a')
    expect(options.initialPageParam).toBeNull()
    expect(
      options.getNextPageParam?.(
        {
          coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
          items: [],
          next_cursor: 'opaque',
        },
        [],
        null,
        [],
      ),
    ).toBe('opaque')
    expect(
      options.getNextPageParam?.(
        {
          coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
          items: [],
          next_cursor: null,
        },
        [],
        null,
        [],
      ),
    ).toBeUndefined()
  })
})

describe('attention queries', () => {
  it('scopes cache identity by window and tenant resources without credentials', () => {
    expect(queryKeys.organizationAttention('24h')).not.toEqual(
      queryKeys.organizationAttention('7d'),
    )
    expect(queryKeys.applicationAttention('p', 'a', '24h')).not.toEqual(
      queryKeys.applicationAttention('p', 'b', '24h'),
    )
    expect(JSON.stringify(queryKeys.organizationAttention('24h'))).not.toContain('credential')
  })

  it('uses exact protected Organization and Application attention paths', async () => {
    const get = vi.fn().mockResolvedValue({})
    const api = { get } as unknown as ApiClient
    await organizationAttentionOptions(api, '7d').queryFn?.({} as never)
    expect(get).toHaveBeenCalledWith(
      '/api/v1/attention-summary?window=7d&limit=20&changed_application_limit=5&recommendation_limit=5',
      { protected: true },
    )
    await applicationAttentionOptions(api, 'project /', 'application ?', '24h').queryFn?.(
      {} as never,
    )
    expect(get).toHaveBeenLastCalledWith(
      '/api/v1/projects/project%20%2F/applications/application%20%3F/attention-summary?window=24h&limit=20&largest_change_limit=5&recommendation_limit=5',
      { protected: true },
    )
  })

  it('keeps the previous snapshot while a new window loads', () => {
    const previous = { generated_at: 'previous' }
    const options = organizationAttentionOptions({ get: vi.fn() } as unknown as ApiClient, '24h')
    expect(typeof options.placeholderData).toBe('function')
    if (typeof options.placeholderData === 'function')
      expect(options.placeholderData(previous as never, undefined as never)).toBe(previous)
  })
})
