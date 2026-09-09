import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from './client'
import {
  acceptInvitationAsExistingUser,
  acceptInvitationAsNewUser,
  addProjectMember,
  createOrganizationInvitation,
  inspectInvitation,
  listOrganizationMembers,
  listEligibleProjectMembers,
  listPlatformProjects,
  listProjectMembers,
  refreshAuthContext,
  resendInvitation,
  revokePlatformInvitation,
} from './access'

describe('access-control API operations', () => {
  it('keeps invitation secrets in POST bodies and uses the correct session policy', async () => {
    const post = vi
      .fn<(path: string, options?: unknown) => Promise<unknown>>()
      .mockResolvedValue({})
    const api = { post } as unknown as ApiClient
    const token = 'invite-secret'

    await inspectInvitation(api, token)
    await acceptInvitationAsNewUser(api, {
      token,
      display_name: 'Invitee',
      password: 'long-enough-password',
      locale: 'en',
    })
    await acceptInvitationAsExistingUser(api, token)

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/invitations/inspections', {
      body: { token },
      unauthorized: 'ignore',
    })
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/invitations/acceptances/new-user',
      expect.objectContaining({ body: expect.objectContaining({ token }), unauthorized: 'ignore' }),
    )
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/invitations/acceptances/existing-user', {
      body: { token },
      protected: true,
    })
    expect(post.mock.calls.map(([path]) => path)).not.toContainEqual(expect.stringContaining(token))
  })

  it('encodes platform and tenant identifiers, cursors, and protects every list', async () => {
    const get = vi.fn().mockResolvedValue({ items: [], next_cursor: null })
    const api = { get } as unknown as ApiClient

    await listPlatformProjects(api, 'org/with spaces', 'cursor+/=')
    await listOrganizationMembers(api, 'org/with spaces')
    await listProjectMembers(api, 'project/with spaces', 'cursor+/=')
    await listEligibleProjectMembers(api, 'project/with spaces', 'cursor+/=')
    await refreshAuthContext(api)

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/platform/organizations/org%2Fwith%20spaces/projects?cursor=cursor%2B%2F%3D&limit=50',
      { protected: true },
    )
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/organizations/org%2Fwith%20spaces/members?limit=50',
      { protected: true },
    )
    expect(get).toHaveBeenNthCalledWith(
      3,
      '/api/v1/projects/project%2Fwith%20spaces/members?cursor=cursor%2B%2F%3D&limit=50',
      { protected: true },
    )
    expect(get).toHaveBeenNthCalledWith(
      4,
      '/api/v1/projects/project%2Fwith%20spaces/eligible-organization-members?cursor=cursor%2B%2F%3D&limit=50',
      { protected: true },
    )
    expect(get).toHaveBeenNthCalledWith(5, '/api/v1/auth/me', { protected: true })
  })

  it('uses the correct tenant and platform invitation mutation routes', async () => {
    const post = vi.fn().mockResolvedValue({})
    const del = vi.fn().mockResolvedValue(undefined)
    const api = { post, delete: del } as unknown as ApiClient

    await createOrganizationInvitation(api, 'org/id', {
      email: 'member@example.com',
      role: 'member',
      locale: 'ru',
    })
    await resendInvitation(api, 'project', 'project/id', 'invite/id')
    await addProjectMember(api, 'project/id', { user_id: 'user/id', role: 'member' })
    await revokePlatformInvitation(api, 'organization', 'org/id', 'invite/id')

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/organizations/org%2Fid/invitations', {
      body: { email: 'member@example.com', role: 'member', locale: 'ru' },
      protected: true,
    })
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/projects/project%2Fid/invitations/invite%2Fid/resend',
      { protected: true },
    )
    expect(post).toHaveBeenNthCalledWith(3, '/api/v1/projects/project%2Fid/members', {
      body: { user_id: 'user/id', role: 'member' },
      protected: true,
    })
    expect(del).toHaveBeenCalledWith(
      '/api/v1/platform/organizations/org%2Fid/invitations/invite%2Fid',
      { protected: true },
    )
  })
})
