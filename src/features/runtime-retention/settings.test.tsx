import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { authenticationSession } from '../../shared/auth/session'
import { RuntimeRetention } from './settings'

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
  const remove = vi.spyOn(api, 'delete')
  const mount = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ApiProvider value={api}>{node}</ApiProvider>
      </QueryClientProvider>,
    )
  return { get, put, remove, mount }
}

const finite = { enabled: true, raw_days: 30, history_days: 365 }

describe('runtime retention policy controls', () => {
  it('sends explicit null for forever and prevents a shorter historical horizon', async () => {
    authenticationSession.authenticate(auth)
    const { get, put, mount } = setup(<RuntimeRetention />)
    get.mockResolvedValue(finite)
    put.mockResolvedValue(finite)
    mount()
    const user = userEvent.setup()
    const history = await screen.findByLabelText('Keep total runtime history (days)')
    await user.clear(history)
    await user.type(history, '7')
    await user.click(screen.getByRole('button', { name: 'Save retention settings' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Total history must be at least')
    expect(put).not.toHaveBeenCalled()
    await user.click(screen.getByLabelText('Keep snapshots forever'))
    expect(screen.queryByLabelText('Keep total runtime history (days)')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save retention settings' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('/api/v1/organizations/org-1/runtime-retention', {
        protected: true,
        body: { enabled: true, raw_days: 30, history_days: null },
      }),
    )
    expect(screen.getByText(/Deleted details and snapshots cannot be restored/)).toBeInTheDocument()
  })

  it('keeps disabled forever override distinct and resets with DELETE', async () => {
    authenticationSession.authenticate(auth)
    const { get, remove, mount } = setup(<RuntimeRetention projectId="project-1" />)
    const override = { enabled: false, raw_days: 7, history_days: null }
    get.mockResolvedValue({ override, inherited: finite, effective: override, source: 'project' })
    remove.mockResolvedValue(undefined)
    mount()
    const user = userEvent.setup()
    expect(await screen.findByLabelText('Keep snapshots forever')).toBeChecked()
    expect(screen.getByLabelText('Automatically delete expired history')).not.toBeChecked()
    await user.selectOptions(screen.getByLabelText('Policy source'), 'organization')
    expect(screen.getByText(/After saving, the organization policy will apply/)).toHaveTextContent(
      '365',
    )
    await user.click(screen.getByRole('button', { name: 'Save retention settings' }))
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith('/api/v1/projects/project-1/runtime-retention', {
        protected: true,
      }),
    )
  })

  it('shows member read-only state and no anonymous request', async () => {
    authenticationSession.authenticate({ ...auth, role: 'member' })
    const { get, mount } = setup(<RuntimeRetention />)
    get.mockResolvedValue(finite)
    const view = mount()
    expect(
      await screen.findByText('Only organization owners can change these settings.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    view.unmount()
    authenticationSession.anonymous()
    get.mockClear()
    const anonymous = mount()
    expect(anonymous.container).toBeEmptyDOMElement()
    expect(get).not.toHaveBeenCalled()
  })

  it('exposes load and mutation errors without reporting successful save', async () => {
    authenticationSession.authenticate(auth)
    const { get, put, mount } = setup(<RuntimeRetention />)
    get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(finite)
    put.mockRejectedValue(new Error('save failed'))
    mount()
    const user = userEvent.setup()
    expect(
      await screen.findByRole('heading', { name: 'Retention settings could not be loaded' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await user.click(await screen.findByRole('button', { name: 'Save retention settings' }))
    expect(
      await screen.findByRole('heading', { name: 'Retention settings could not be saved' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Retention settings saved.')).not.toBeInTheDocument()
  })
})
