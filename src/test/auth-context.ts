import type { AuthContext } from '../shared/api/types'

type AuthContextOverrides = {
  user?: Partial<AuthContext['user']>
  platformRole?: AuthContext['platform_role']
  organizations?: AuthContext['organizations']
  activeOrganization?: AuthContext['active_organization']
  activeRole?: AuthContext['active_role']
  requiresOrganizationSelection?: boolean
  privilegedUntil?: AuthContext['privileged_until']
  capabilities?: Partial<AuthContext['capabilities']>
}

export function createAuthContext(overrides: AuthContextOverrides = {}): AuthContext {
  const organization: AuthContext['organizations'][number] = {
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    role: 'owner',
  }
  const organizations = overrides.organizations ?? [organization]
  const activeOrganization =
    overrides.activeOrganization === undefined
      ? (organizations[0] ?? null)
      : overrides.activeOrganization

  return {
    user: {
      id: 'user-1',
      email: 'owner@example.com',
      display_name: 'Owner Example',
      email_verified: true,
      preferred_locale: 'en',
      ...overrides.user,
    },
    platform_role: overrides.platformRole ?? null,
    organizations,
    active_organization: activeOrganization,
    active_role:
      overrides.activeRole === undefined
        ? (activeOrganization?.role ?? null)
        : overrides.activeRole,
    requires_organization_selection: overrides.requiresOrganizationSelection ?? false,
    privileged_until: overrides.privilegedUntil ?? null,
    capabilities: {
      manage_platform: false,
      manage_organization: true,
      create_project: true,
      manage_project_members: true,
      create_application: true,
      manage_credentials: true,
      organization_roles_grantable: ['owner', 'admin', 'member'],
      project_roles_grantable: ['admin', 'member'],
      ...overrides.capabilities,
    },
  }
}
