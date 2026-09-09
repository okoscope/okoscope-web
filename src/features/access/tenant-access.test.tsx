import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { authenticationSession } from '../../shared/auth/session'
import { LocalizationProvider } from '../../shared/i18n'
import { createAuthContext } from '../../test/auth-context'
import { OrganizationAccess, ProjectAccess } from './tenant-access'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))

function renderAccess(
  node: React.ReactNode,
  getImplementation: (path: string) => Promise<unknown>,
  locale: 'en' | 'ru' = 'en',
) {
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const get = vi.spyOn(api, 'get').mockImplementation(getImplementation)
  const post = vi.spyOn(api, 'post').mockResolvedValue({})
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApiProvider value={api}>
        <LocalizationProvider initialLocale={locale}>{node}</LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { get, post }
}

afterEach(() => authenticationSession.reset())

describe('server-derived tenant access controls', () => {
  it('does not render owner controls for an Organization admin', async () => {
    authenticationSession.authenticate(
      createAuthContext({
        organizations: [{ id: 'org-1', name: 'Acme', slug: 'acme', role: 'admin' }],
        activeRole: 'admin',
        capabilities: {
          manage_organization: true,
          organization_roles_grantable: ['admin', 'member'],
        },
      }),
    )
    renderAccess(<OrganizationAccess />, (path) => {
      if (path.includes('/members'))
        return Promise.resolve({
          items: [
            {
              user_id: 'owner-1',
              email: 'owner@example.com',
              display_name: 'Owner',
              role: 'owner',
              enabled: true,
              email_verified: true,
              created_at: '2026-09-01T00:00:00Z',
              can_change_role: false,
              can_remove: false,
            },
          ],
          next_cursor: null,
        })
      return Promise.resolve({ items: [], next_cursor: null })
    })

    const owner = (await screen.findByText('owner@example.com')).closest('article')!
    expect(within(owner).queryByRole('button')).not.toBeInTheDocument()
    const invitationRole = screen.getByRole('combobox', { name: 'Role' })
    expect(within(invitationRole).queryByRole('option', { name: 'Owner' })).not.toBeInTheDocument()
    expect(within(invitationRole).getByRole('option', { name: 'Administrator' })).toBeVisible()
    expect(within(invitationRole).getByRole('option', { name: 'Member' })).toBeVisible()
  })

  it('limits a Project admin to member grants supplied by server capabilities', async () => {
    renderAccess(<ProjectAccess projectId="project-1" />, (path) => {
      if (path === '/api/v1/projects/project-1')
        return Promise.resolve({
          id: 'project-1',
          organization_id: 'org-1',
          slug: 'payments',
          name: 'Payments',
          created_at: '2026-09-01T00:00:00Z',
          archived_at: null,
          application_count: 0,
          runtime_group_count: 0,
          effective_project_role: 'admin',
          effective_access_source: 'project',
          capabilities: {
            manage_project_members: true,
            create_application: true,
            manage_credentials: true,
            project_roles_grantable: ['member'],
          },
        })
      return Promise.resolve({ items: [], next_cursor: null })
    })

    expect(await screen.findByRole('heading', { name: 'Project access' })).toBeVisible()
    const addMemberForm = screen
      .getByRole('button', { name: 'Add Organization member' })
      .closest('form')!
    const role = within(addMemberForm).getByRole('combobox', { name: 'Role' })
    expect(within(role).getAllByRole('option')).toHaveLength(2)
    expect(within(role).getByRole('option', { name: 'Member' })).toBeVisible()
    expect(within(role).queryByRole('option', { name: 'Administrator' })).not.toBeInTheDocument()
  })

  it('does not request or expose access data when capability is absent', () => {
    authenticationSession.authenticate(
      createAuthContext({
        capabilities: { manage_organization: false, organization_roles_grantable: [] },
      }),
    )
    const { get } = renderAccess(<OrganizationAccess />, () => Promise.resolve({}))

    expect(screen.getByRole('heading', { name: 'Organization access' })).toBeVisible()
    expect(
      screen.getByText('You do not have permission to manage this access scope.'),
    ).toBeVisible()
    expect(get).not.toHaveBeenCalled()
  })

  it.each([
    ['en', 'Scrollable Organization access audit'],
    ['ru', 'Прокручиваемый аудит доступа организации'],
  ] as const)(
    'names and focuses the Organization audit scroll region in %s',
    async (locale, accessibleName) => {
      authenticationSession.authenticate(createAuthContext())
      renderAccess(
        <OrganizationAccess />,
        (path) =>
          Promise.resolve(
            path.endsWith('/audit')
              ? {
                  items: [
                    {
                      id: 'audit-1',
                      actor_kind: 'user',
                      actor_user_id: 'user-1',
                      action: 'organization.member.role_changed',
                      target_user_id: 'user-2',
                      previous_role: 'member',
                      new_role: 'admin',
                      outcome: 'success',
                      created_at: '2026-09-09T12:00:00Z',
                    },
                  ],
                  next_cursor: null,
                }
              : { items: [], next_cursor: null },
          ),
        locale,
      )

      const region = await screen.findByRole('region', { name: accessibleName })
      expect(region).toHaveAttribute('tabindex', '0')
      region.focus()
      expect(region).toHaveFocus()
    },
  )

  it('adds only a server-listed Organization member with a grantable Project role', async () => {
    const user = userEvent.setup()
    const { post } = renderAccess(<ProjectAccess projectId="project-1" />, (path) => {
      if (path === '/api/v1/projects/project-1')
        return Promise.resolve({
          id: 'project-1',
          organization_id: 'org-1',
          slug: 'payments',
          name: 'Payments',
          created_at: '2026-09-01T00:00:00Z',
          archived_at: null,
          application_count: 0,
          runtime_group_count: 0,
          effective_project_role: 'admin',
          effective_access_source: 'project',
          capabilities: {
            manage_project_members: true,
            create_application: true,
            manage_credentials: true,
            project_roles_grantable: ['member'],
          },
        })
      if (path.includes('/eligible-organization-members'))
        return Promise.resolve({
          items: [
            {
              user_id: 'eligible-user',
              email: 'eligible@example.com',
              display_name: 'Eligible User',
              role: 'member',
              enabled: true,
              email_verified: true,
              created_at: '2026-09-01T00:00:00Z',
              can_change_role: false,
              can_remove: false,
            },
          ],
          next_cursor: null,
        })
      return Promise.resolve({ items: [], next_cursor: null })
    })

    await screen.findByRole('heading', { name: 'Project access' })
    const submit = screen.getByRole('button', { name: 'Add Organization member' })
    const form = submit.closest('form')!
    const eligible = within(form).getByRole('combobox', { name: 'Eligible Organization member' })
    await within(eligible).findByRole('option', { name: 'Eligible User · eligible@example.com' })
    await user.selectOptions(eligible, 'eligible-user')
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Role' }), 'member')
    await user.click(submit)

    expect(post).toHaveBeenCalledWith('/api/v1/projects/project-1/members', {
      body: { user_id: 'eligible-user', role: 'member' },
      protected: true,
    })
  })
})
