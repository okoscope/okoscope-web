import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { authenticationSession } from '../../shared/auth/session'
import { LocalizationProvider } from '../../shared/i18n'
import { createAuthContext } from '../../test/auth-context'
import { OrganizationSelection } from './organization-selection'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

const alpha = { id: 'org-a', name: 'Alpha', slug: 'alpha', role: 'owner' as const }
const beta = { id: 'org-b', name: 'Beta', slug: 'beta', role: 'member' as const }

function renderSelection(context = createAuthContext()) {
  authenticationSession.authenticate(context)
  const api = new ApiClient({ apiBaseUrl: 'http://localhost' }, vi.fn())
  const post = vi.spyOn(api, 'post')
  const get = vi.spyOn(api, 'get')
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiProvider value={api}>
        <LocalizationProvider initialLocale="en">
          <OrganizationSelection />
        </LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { get, post }
}

afterEach(() => {
  authenticationSession.reset()
  navigate.mockReset()
})

describe('active Organization selection', () => {
  it('renders an empty membership state and a platform-console path for a super admin', () => {
    renderSelection(
      createAuthContext({
        platformRole: 'super_admin',
        organizations: [],
        activeOrganization: null,
        activeRole: null,
        capabilities: { manage_platform: true, manage_organization: false },
      }),
    )

    expect(screen.getByRole('heading', { name: 'No Organization access yet' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Open Organization' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open platform console' })).toBeVisible()
  })

  it('shows every available Organization and rotates context through the server selection', async () => {
    const user = userEvent.setup()
    const selected = createAuthContext({
      organizations: [alpha, beta],
      activeOrganization: null,
      activeRole: null,
      requiresOrganizationSelection: true,
    })
    const { get, post } = renderSelection(selected)
    post.mockResolvedValue(undefined)
    get.mockResolvedValue(
      createAuthContext({
        organizations: [alpha, beta],
        activeOrganization: beta,
        activeRole: 'member',
      }),
    )

    expect(screen.getByRole('heading', { name: 'Choose an Organization' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeVisible()
    await user.click(screen.getAllByRole('button', { name: 'Open Organization' })[1]!)

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/api/v1/auth/organization-selections', {
        body: { organization_id: 'org-b' },
        protected: true,
      }),
    )
    expect(get).toHaveBeenCalledWith('/api/v1/auth/me', {
      protected: true,
      unauthorized: 'ignore',
    })
    expect(authenticationSession.get()).toMatchObject({
      status: 'authenticated',
      context: { active_organization: beta, active_role: 'member' },
    })
    expect(navigate).toHaveBeenCalledWith({ to: '/' })
  })

  it('keeps the previous context and exposes a selection failure', async () => {
    const user = userEvent.setup()
    const context = createAuthContext({
      organizations: [alpha, beta],
      activeOrganization: alpha,
      activeRole: 'owner',
    })
    const { get, post } = renderSelection(context)
    post.mockRejectedValue(new Error('selection rejected'))

    await user.click(screen.getAllByRole('button', { name: 'Open Organization' })[1]!)

    expect(
      await screen.findByRole('heading', { name: 'Organization could not be selected' }),
    ).toBeVisible()
    expect(get).not.toHaveBeenCalled()
    expect(authenticationSession.get()).toEqual({ status: 'authenticated', context })
    expect(navigate).not.toHaveBeenCalled()
  })
})
