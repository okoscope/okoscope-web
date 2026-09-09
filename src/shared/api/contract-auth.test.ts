import { describe, expect, it } from 'vitest'
import type { components, paths } from './schema'
import contract from '../../../openapi/okoscope-v1.yaml?raw'

describe('authentication contract snapshot', () => {
  it('publishes browser session operations and bounded roles', () => {
    const operations: Array<keyof paths> = [
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/email-verification-requests',
      '/api/v1/auth/email-verifications',
      '/api/v1/auth/password-reset-requests',
      '/api/v1/auth/password-resets',
      '/api/v1/auth/password',
      '/api/v1/auth/preferences',
      '/api/v1/auth/me',
      '/api/v1/auth/logout',
    ]
    const roles: components['schemas']['OrganizationRole'][] = ['owner', 'admin', 'member']
    const context: components['schemas']['AuthContext'] = {
      user: {
        id: 'user',
        email: 'owner@example.com',
        display_name: 'Owner Example',
        email_verified: true,
        preferred_locale: 'en',
      },
      platform_role: null,
      organizations: [{ id: 'organization', name: 'Acme', slug: 'acme', role: 'owner' }],
      active_organization: { id: 'organization', name: 'Acme', slug: 'acme', role: 'owner' },
      active_role: 'owner',
      requires_organization_selection: false,
      privileged_until: null,
      capabilities: {
        manage_platform: false,
        manage_organization: true,
        create_project: true,
        manage_project_members: true,
        create_application: true,
        manage_credentials: true,
        organization_roles_grantable: ['owner', 'admin', 'member'],
        project_roles_grantable: ['admin', 'member'],
      },
    }
    expect(operations).toHaveLength(10)
    expect(roles).toEqual(['owner', 'admin', 'member'])
    expect(context.active_organization?.slug).toBe('acme')
  })

  it('publishes only browser session authentication', () => {
    expect(contract).not.toContain('bearerAuth:')
    expect(contract).toContain('sessionAuth:')
    expect(contract).not.toContain('adminAuth:')
  })

  it('publishes anonymous security actions and write-only secrets', () => {
    expect(contract).toContain('operationId: requestEmailVerification')
    expect(contract).toContain('operationId: confirmEmailVerification')
    expect(contract).toContain('operationId: requestPasswordReset')
    expect(contract).toContain('operationId: completePasswordReset')
    expect(contract).toMatch(
      /token: \{ type: string, minLength: 40, maxLength: 128, writeOnly: true \}/,
    )
    expect(contract).toMatch(
      /new_password: \{ type: string, format: password, minLength: 12, maxLength: 256, writeOnly: true \}/,
    )
  })
})
