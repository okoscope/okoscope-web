import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { authenticationSession } from '../../shared/auth/session'
import { NotificationRetention } from './retention'

const auth = {
  user: {
    id: 'user-1',
    email: 'owner@example.com',
    email_verified: true,
    preferred_locale: 'en' as const,
  },
  organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
  role: 'owner' as const,
}

afterEach(() => authenticationSession.reset())

function setup(node: React.ReactNode) {
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const get = vi.spyOn(api, 'get')
  const put = vi.spyOn(api, 'put')
  const mount = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ApiProvider value={api}>{node}</ApiProvider>
      </QueryClientProvider>,
    )
  return { get, put, mount }
}

describe('notification retention cache and missing authentication', () => {
  it('invalidates mounted inherited projects while preserving independent overrides', async () => {
    authenticationSession.authenticate(auth)
    let organization = { enabled: true, history_days: 90 }
    const override = { enabled: false, history_days: 300 }
    const { get, put, mount } = setup(
      <>
        <section aria-label="organization">
          <NotificationRetention />
        </section>
        <section aria-label="inherited">
          <NotificationRetention projectId="inherited" />
        </section>
        <section aria-label="override">
          <NotificationRetention projectId="override" />
        </section>
      </>,
    )
    get.mockImplementation((path) => {
      if (path.includes('/organizations/')) return Promise.resolve(organization)
      return Promise.resolve({
        override: path.includes('/override/') ? override : null,
        inherited: organization,
        effective: path.includes('/override/') ? override : organization,
        source: path.includes('/override/') ? 'project' : 'organization',
      })
    })
    put.mockImplementation(() => {
      organization = { enabled: true, history_days: 30 }
      return Promise.resolve(organization)
    })
    mount()
    const user = userEvent.setup()
    const org = within(screen.getByRole('region', { name: 'organization' }))
    const inherited = within(screen.getByRole('region', { name: 'inherited' }))
    const independent = within(screen.getByRole('region', { name: 'override' }))
    await org.findByRole('spinbutton')
    await user.clear(org.getByRole('spinbutton'))
    await user.type(org.getByRole('spinbutton'), '30')
    await user.click(org.getByRole('button', { name: 'Save retention settings' }))
    await waitFor(() =>
      expect(inherited.getByText('Current retention: 30 days')).toBeInTheDocument(),
    )
    expect(
      independent.getByText('Current retention: 300 days Automatic cleanup is disabled.'),
    ).toBeInTheDocument()
    expect(independent.getByRole('spinbutton')).toHaveValue(300)
    expect(put).toHaveBeenCalledWith('/api/v1/organizations/org-1/notification-retention', {
      protected: true,
      body: { enabled: true, history_days: 30 },
    })
  })

  it('does not request or show tenant policies without authenticated context', () => {
    authenticationSession.anonymous()
    const { get, mount } = setup(<NotificationRetention />)
    const { container } = mount()
    expect(container).toBeEmptyDOMElement()
    expect(get).not.toHaveBeenCalled()
  })
})
