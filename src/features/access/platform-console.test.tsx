import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { authenticationSession } from '../../shared/auth/session'
import { LocalizationProvider } from '../../shared/i18n'
import { createAuthContext } from '../../test/auth-context'
import { PlatformConsole } from './platform-console'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}))

function renderConsole(
  context = createAuthContext(),
  locale: 'en' | 'ru' = 'en',
  auditItems: unknown[] = [],
) {
  authenticationSession.authenticate(context)
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const get = vi
    .spyOn(api, 'get')
    .mockImplementation((path) =>
      Promise.resolve(
        path === '/api/v1/auth/me'
          ? { ...context, privileged_until: '2026-09-09T12:00:00Z' }
          : path.startsWith('/api/v1/platform/audit')
            ? { items: auditItems, next_cursor: null }
            : { items: [], next_cursor: null },
      ),
    )
  const post = vi.spyOn(api, 'post').mockResolvedValue(undefined)
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApiProvider value={api}>
        <LocalizationProvider initialLocale={locale}>
          <PlatformConsole />
        </LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { get, post }
}

afterEach(() => authenticationSession.reset())

describe('platform console authorization', () => {
  it('does not query global data for a tenant owner without platform capability', () => {
    const { get } = renderConsole()

    expect(screen.getByRole('heading', { name: 'Platform console' })).toBeVisible()
    expect(
      screen.getByText('Platform administration requires super administrator access.'),
    ).toBeVisible()
    expect(get).not.toHaveBeenCalled()
  })

  it('loads bounded global panels for a personal super administrator', async () => {
    const { get } = renderConsole(
      createAuthContext({
        platformRole: 'super_admin',
        organizations: [],
        activeOrganization: null,
        activeRole: null,
        capabilities: { manage_platform: true },
      }),
    )

    expect(await screen.findByRole('heading', { name: 'Organizations' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Users' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Invitations' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Access audit' })).toBeVisible()
    expect(get).toHaveBeenCalledWith('/api/v1/platform/organizations?limit=50', { protected: true })
    expect(get).toHaveBeenCalledWith('/api/v1/platform/users?limit=50', { protected: true })
    expect(get).toHaveBeenCalledWith('/api/v1/platform/invitations?limit=50', { protected: true })
    expect(get).toHaveBeenCalledWith('/api/v1/platform/audit?limit=50', { protected: true })
  })

  it('requires an explicit password confirmation before refreshing platform privilege', async () => {
    const user = userEvent.setup()
    const context = createAuthContext({
      platformRole: 'super_admin',
      organizations: [],
      activeOrganization: null,
      activeRole: null,
      capabilities: { manage_platform: true },
    })
    const { get, post } = renderConsole(context)

    await user.type(screen.getByLabelText('Confirm password'), 'current password')
    await user.click(screen.getByRole('button', { name: 'Confirm password' }))

    expect(post).toHaveBeenCalledWith('/api/v1/auth/privilege-confirmations', {
      body: { current_password: 'current password' },
      protected: true,
    })
    expect(get).toHaveBeenCalledWith('/api/v1/auth/me', {
      protected: true,
      unauthorized: 'ignore',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Privilege confirmed until')
  })

  it.each([
    ['en', 'Scrollable platform access audit'],
    ['ru', 'Прокручиваемый аудит доступа платформы'],
  ] as const)('names and focuses the audit scroll region in %s', async (locale, accessibleName) => {
    renderConsole(
      createAuthContext({
        platformRole: 'super_admin',
        organizations: [],
        activeOrganization: null,
        activeRole: null,
        capabilities: { manage_platform: true },
      }),
      locale,
      [
        {
          id: 'audit-1',
          actor_kind: 'user',
          actor_user_id: 'user-1',
          action: 'organization.created',
          outcome: 'success',
          created_at: '2026-09-09T12:00:00Z',
        },
      ],
    )

    const region = await screen.findByRole('region', { name: accessibleName })
    expect(region).toHaveAttribute('tabindex', '0')
    region.focus()
    expect(region).toHaveFocus()
  })
})
