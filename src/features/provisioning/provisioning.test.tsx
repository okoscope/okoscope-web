import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { AgentCredentials, credentialStatus } from './credentials'
import { ConnectAgent } from './connect-agent'
import { NamedResourceForm, slugify, validateNamedResource } from './entity-form'

function providers(node: React.ReactNode, api: Partial<ApiClient>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <ApiProvider value={api as ApiClient}>{node}</ApiProvider>
      </QueryClientProvider>,
    ),
    queryClient,
  }
}

describe('entity form', () => {
  it('derives a valid slug and preserves manual editing', async () => {
    const user = userEvent.setup()
    const submit = vi.fn()
    render(<NamedResourceForm label="Application" pending={false} onSubmit={submit} />)
    await user.type(screen.getByLabelText('Name'), 'Payment API')
    expect(screen.getByLabelText('Slug')).toHaveValue('payment-api')
    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'custom')
    await user.type(screen.getByLabelText('Name'), ' v2')
    expect(screen.getByLabelText('Slug')).toHaveValue('custom')
    await user.click(screen.getByRole('button', { name: 'Create Application' }))
    expect(submit).toHaveBeenCalledWith({ name: 'Payment API v2', slug: 'custom' })
  })

  it('validates boundaries and blocks duplicate pending submission', async () => {
    expect(slugify('  Héllo---World  ')).toBe('hello-world')
    expect(slugify('Платёжный API')).toBe('platezhnyi-api')
    expect(validateNamedResource({ name: ' Acme', slug: 'bad--slug' })).toEqual(
      expect.objectContaining({ name: expect.any(String), slug: expect.any(String) }),
    )
    const submit = vi.fn()
    render(<NamedResourceForm label="Project" pending onSubmit={submit} />)
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button'))
    expect(submit).not.toHaveBeenCalled()
  })
})

describe('one-time agent setup', () => {
  const application = {
    id: 'a',
    organization_id: 'o',
    project_id: 'p',
    name: 'Payment',
    slug: 'payment-api',
    created_at: '2026-01-01T00:00:00Z',
  }
  const credential = {
    id: 'c',
    name: 'default',
    token: 'oko_app_v1_secret',
    token_hint: 'cret',
    created_at: '2026-01-01T00:00:00Z',
    shown_once: true as const,
  }

  function renderConnectAgent(onClose: () => void) {
    const rootRoute = createRootRoute({
      component: () => (
        <ConnectAgent application={application} credential={credential} onClose={onClose} />
      ),
    })
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    return { ...render(<RouterProvider router={router} />), router }
  }

  it('shows only the one-time token and dismisses it on Done', async () => {
    const token = 'oko_app_v1_secret'
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const onClose = vi.fn()
    const { unmount } = renderConnectAgent(onClose)
    expect(await screen.findByText(token, { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('Kubernetes Secret')).not.toBeInTheDocument()
    expect(screen.queryByText('Agent configuration')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('applicationCredentialFile')
    expect(document.body).not.toHaveTextContent('scope:')
    await user.click(screen.getByRole('button', { name: 'Copy token' }))
    expect(writeText).toHaveBeenCalledWith(token)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    expect(document.body.textContent).not.toContain(token)
    expect(localStorage.getItem(token)).toBeNull()
    expect(sessionStorage.getItem(token)).toBeNull()
  })

  it('continues from the legacy post-create screen to Connect agent', async () => {
    const { router } = renderConnectAgent(vi.fn())
    const link = await screen.findByRole('link', { name: 'Continue in Connect agent' })
    expect(link).toHaveAttribute('href', '/onboarding')
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('Agent credentials', () => {
  it('derives statuses and warns before revoking the last active credential', async () => {
    expect(
      credentialStatus({
        id: '1',
        name: 'a',
        token_hint: 'hint',
        created_at: '2026-01-01T00:00:00Z',
        last_used_at: null,
        revoked_at: null,
      }),
    ).toBe('never-used')
    const get = vi.fn().mockResolvedValue({
      items: [
        {
          id: '1',
          name: 'default',
          token_hint: '…abcd',
          created_at: '2026-01-01T00:00:00Z',
          last_used_at: null,
          revoked_at: null,
        },
      ],
    })
    const remove = vi.fn().mockResolvedValue(undefined)
    providers(<AgentCredentials projectId="p" applicationId="a" />, { get, delete: remove })
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('last active credential')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm revoke' }))
    await waitFor(() => expect(remove).toHaveBeenCalledOnce())
  })

  it('issues a credential, keeps it out of query cache, and clears the modal', async () => {
    const token = 'oko_app_v1_once'
    const get = vi.fn().mockResolvedValue({ items: [] })
    const post = vi.fn().mockResolvedValue({
      id: '2',
      name: 'rotation',
      token,
      token_hint: 'once',
      created_at: '2026-01-01T00:00:00Z',
      shown_once: true,
    })
    const { queryClient } = providers(<AgentCredentials projectId="p" applicationId="a" />, {
      get,
      post,
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Issue credential' }))
    await userEvent.type(screen.getByLabelText('Name'), 'rotation')
    await userEvent.click(screen.getByRole('dialog').querySelector('button[type="submit"]')!)
    expect(await screen.findByText(token)).toBeInTheDocument()
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.state.data),
      ),
    ).not.toContain(token)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText(token)).not.toBeInTheDocument()
  })
})
