import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { ApiProvider } from '../../shared/api/context'
import type { ApiClient } from '../../shared/api/client'
import { ApplicationList } from './application-list'
import { ProjectList } from './project-list'
import { authenticationSession } from '../../shared/auth/session'

function renderWithProviders(
  node: React.ReactNode,
  get: ApiClient['get'],
  post: ApiClient['post'] = vi.fn(),
) {
  authenticationSession.authenticate({
    user: { id: 'user', email: 'owner@example.com', email_verified: true, preferred_locale: 'en' },
    organization: { id: 'organization', name: 'Acme', slug: 'acme' },
    role: 'owner',
  })
  const rootRoute = createRootRoute({ component: () => node })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rendered = render(
    <QueryClientProvider client={client}>
      <ApiProvider value={{ get, post } as ApiClient}>
        <RouterProvider router={router} />
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, client }
}

describe('tenant lists', () => {
  it('shows an explicit empty Project state', async () => {
    renderWithProviders(
      <ProjectList />,
      vi.fn().mockResolvedValue({ items: [], next_cursor: null }),
    )
    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
  })

  it('formats an Application without observations', async () => {
    renderWithProviders(
      <ApplicationList projectId="project-1" />,
      vi.fn().mockResolvedValue({
        items: [
          {
            id: 'application-1',
            project_id: 'project-1',
            slug: 'api',
            name: 'API',
            created_at: '2026-08-17T12:00:00Z',
            release_count: 0,
            runtime_group_count: 0,
            latest_observed_at: null,
          },
        ],
        next_cursor: null,
      }),
    )
    expect(await screen.findByText('Never observed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /API/ })).toHaveAttribute(
      'href',
      '/projects/project-1/applications/application-1',
    )
  })

  it('shows archive state and preserves Projects after a failed refresh', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            id: 'project-1',
            slug: 'old',
            name: 'Legacy',
            created_at: '2026-08-17T12:00:00Z',
            archived_at: '2026-08-17T13:00:00Z',
            application_count: 1,
            runtime_group_count: 2,
          },
        ],
        next_cursor: null,
      })
      .mockRejectedValueOnce(new Error('refresh failed'))
    const { client } = renderWithProviders(<ProjectList />, get)
    expect(await screen.findByText('Archived')).toBeInTheDocument()
    await client.invalidateQueries({ queryKey: ['projects'] })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Legacy')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Projects could not be refreshed' }),
    ).toBeInTheDocument()
  })

  it('creates a Project in the current tenant Organization', async () => {
    const post = vi.fn().mockResolvedValue({
      id: 'project-2',
      organization_id: 'organization-1',
      slug: 'payments',
      name: 'Payments',
      created_at: '2026-08-26T12:00:00Z',
    })
    renderWithProviders(
      <ProjectList organizationId="organization-1" />,
      vi.fn().mockResolvedValue({ items: [], next_cursor: null }),
      post,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Create Project' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'Payments')
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Project' }),
    )
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0]![0]).toBe('/api/v1/organizations/organization-1/projects')
  })

  it('creates an Application and shows its one-time tenant credential', async () => {
    const post = vi.fn().mockResolvedValue({
      application: {
        id: 'application-2',
        organization_id: 'organization-1',
        project_id: 'project-1',
        slug: 'payments',
        name: 'Payments',
        created_at: '2026-08-26T12:00:00Z',
      },
      credential: {
        id: 'credential-1',
        name: 'default',
        token: 'oko_app_v1_once',
        token_hint: 'once',
        created_at: '2026-08-26T12:00:00Z',
        shown_once: true,
      },
    })
    renderWithProviders(
      <ApplicationList projectId="project-1" />,
      vi.fn().mockResolvedValue({ items: [], next_cursor: null }),
      post,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Create Application' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'Payments')
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Create Application' }),
    )
    expect(await screen.findByText('oko_app_v1_once')).toBeInTheDocument()
    expect(post.mock.calls[0]![0]).toBe('/api/v1/projects/project-1/applications')
  })
})
