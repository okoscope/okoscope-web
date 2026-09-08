import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from './client'
import {
  adminApplicationOptions,
  adminApplicationsOptions,
  adminProjectsOptions,
  applicationCredentialsOptions,
  createApplication,
  createProject,
  issueApplicationCredential,
  provisioningKeys,
  revokeApplicationCredential,
} from './provisioning'

describe('provisioning API', () => {
  it('separates hierarchy scopes without secrets', () => {
    expect(provisioningKeys.projects('a')).not.toEqual(provisioningKeys.projects('b'))
    expect(provisioningKeys.credentials('p', 'a')).not.toEqual(
      provisioningKeys.credentials('p', 'b'),
    )
    expect(JSON.stringify(provisioningKeys)).not.toContain('token')
  })

  it('uses encoded admin discovery paths', async () => {
    const get = vi.fn().mockResolvedValue({ items: [] })
    const api = { get } as unknown as ApiClient
    await adminProjectsOptions(api, 'org /').queryFn?.({} as never)
    await adminApplicationsOptions(api, 'project ?').queryFn?.({} as never)
    await adminApplicationOptions(api, 'project ?', 'app /').queryFn?.({} as never)
    await applicationCredentialsOptions(api, 'project ?', 'app /').queryFn?.({} as never)
    expect(get.mock.calls.map((call) => String(call[0]))).toEqual([
      '/api/v1/admin/organizations/org%20%2F/projects',
      '/api/v1/admin/projects/project%20%3F/applications',
      '/api/v1/admin/projects/project%20%3F/applications/app%20%2F',
      '/api/v1/projects/project%20%3F/applications/app%20%2F/credentials',
    ])
  })

  it('uses fresh idempotency headers and exact mutation paths', async () => {
    const post = vi.fn().mockResolvedValue({})
    const remove = vi.fn().mockResolvedValue(undefined)
    const api = { post, delete: remove } as unknown as ApiClient
    await createProject(api, 'org /', { name: 'Prod', slug: 'prod' })
    await createApplication(api, 'project ?', { name: 'API', slug: 'api' })
    await issueApplicationCredential(api, 'project ?', 'app /', { name: 'rotation' })
    await revokeApplicationCredential(api, 'project ?', 'app /', 'credential #')
    expect(post.mock.calls[0]![0]).toBe('/api/v1/organizations/org%20%2F/projects')
    expect(post.mock.calls[1]![0]).toBe('/api/v1/projects/project%20%3F/applications')
    expect(post.mock.calls[2]![0]).toBe(
      '/api/v1/projects/project%20%3F/applications/app%20%2F/credentials',
    )
    const keys = post.mock.calls.map((call) =>
      String((call[1] as { headers: Record<string, string> }).headers['Idempotency-Key']),
    )
    expect(new Set(keys).size).toBe(3)
    expect(remove.mock.calls[0]![0]).toContain('credential%20%23')
  })
})
