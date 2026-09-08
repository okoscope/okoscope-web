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
import { LocalizationProvider } from '../../shared/i18n'
import { ApplicationWorkers } from './application-workers'
import { isWorkerInactive } from './application-workers'

const worker = (overrides: Record<string, unknown> = {}) => ({
  agent_id: 'agent-1',
  cluster_id: 'cluster-1',
  cluster_name: 'Production',
  node_name: 'worker-amd64-01',
  agent_version: '0.1.0',
  architecture: 'x86_64',
  kernel_release: '6.9.2',
  first_observed_at: '2026-08-20T10:00:00Z',
  last_observed_at: '2026-08-22T09:30:00Z',
  agent_last_seen_at: new Date().toISOString(),
  ...overrides,
})

function renderWorkers(get: ApiClient['get'], locale: 'en' | 'ru' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({
    component: () => (
      <ApplicationWorkers projectId="project / one" applicationId="application / one" />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const rendered = render(
    <QueryClientProvider client={client}>
      <ApiProvider value={{ get } as ApiClient}>
        <LocalizationProvider initialLocale={locale}>
          <RouterProvider router={router} />
        </LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, client, router }
}

describe('ApplicationWorkers', () => {
  it('moves workers last seen more than 15 minutes ago into a collapsed inactive section', async () => {
    const now = Date.parse('2026-08-22T10:00:00Z')
    vi.spyOn(Date, 'now').mockReturnValue(now)
    renderWorkers(
      vi.fn().mockResolvedValue({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [
          worker({ agent_last_seen_at: '2026-08-22T09:45:00Z' }),
          worker({
            agent_id: 'agent-2',
            node_name: 'inactive-worker',
            agent_last_seen_at: '2026-08-22T09:44:59Z',
          }),
        ],
        next_cursor: null,
      }),
    )

    const summary = await screen.findByText('Inactive (1)')
    expect(summary.closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('worker-amd64-01').closest('details')).toBeNull()
    expect(screen.getByText('inactive-worker').closest('details')).toBe(summary.closest('details'))
    vi.restoreAllMocks()
  })

  it('treats only valid agent signals strictly older than 15 minutes as inactive', () => {
    const now = Date.parse('2026-08-22T10:00:00Z')
    expect(isWorkerInactive(worker({ agent_last_seen_at: '2026-08-22T09:45:00Z' }), now)).toBe(
      false,
    )
    expect(isWorkerInactive(worker({ agent_last_seen_at: '2026-08-22T09:44:59Z' }), now)).toBe(true)
    expect(isWorkerInactive(worker({ agent_last_seen_at: 'invalid' }), now)).toBe(false)
  })

  it('renders heterogeneous and unavailable platform values as inert text', async () => {
    renderWorkers(
      vi.fn().mockResolvedValue({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [
          worker(),
          worker({
            agent_id: 'agent-2',
            node_name: '<img src=x onerror=alert(1)>',
            architecture: null,
            kernel_release: null,
          }),
        ],
        next_cursor: null,
      }),
    )
    expect(await screen.findByText('6.9.2')).toBeVisible()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible()
    expect(screen.getAllByText('Not reported')).toHaveLength(2)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.queryByText(/online|compatible/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Connect agent' })).not.toBeInTheDocument()
  })

  it('localizes the empty state', async () => {
    renderWorkers(
      vi.fn().mockResolvedValue({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [],
        next_cursor: null,
      }),
      'ru',
    )
    expect(await screen.findByRole('heading', { name: 'Рабочие узлы' })).toBeVisible()
    expect(screen.getByText('Наблюдений рабочих узлов пока нет.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Подключить агента' })).toHaveAttribute(
      'href',
      '/onboarding',
    )
  })

  it('keeps the empty-state action out of loading, error, and inactive-only data', async () => {
    const pending = new Promise<never>(() => undefined)
    const { unmount } = renderWorkers(vi.fn().mockReturnValue(pending))
    expect(await screen.findByText('Loading worker nodes…')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Connect agent' })).not.toBeInTheDocument()
    unmount()

    const failed = renderWorkers(vi.fn().mockRejectedValue(new Error('failed')))
    expect(
      await screen.findByRole('heading', { name: 'Worker nodes could not be loaded' }),
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Connect agent' })).not.toBeInTheDocument()
    failed.unmount()

    renderWorkers(
      vi.fn().mockResolvedValue({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [worker({ agent_last_seen_at: '2020-01-01T00:00:00Z' })],
        next_cursor: null,
      }),
    )
    expect(await screen.findByText('Inactive (1)')).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Connect agent' })).not.toBeInTheDocument()
  })

  it('isolates initial failures and retries', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [worker()],
        next_cursor: null,
      })
    renderWorkers(get)
    expect(
      await screen.findByRole('heading', { name: 'Worker nodes could not be loaded' }),
    ).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('6.9.2')).toBeVisible()
  })

  it('forwards opaque cursors and appends the next page', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [worker()],
        next_cursor: 'opaque / cursor',
      })
      .mockResolvedValueOnce({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [worker({ agent_id: 'agent-2', node_name: 'worker-arm64-02' })],
        next_cursor: null,
      })
    renderWorkers(get)
    await userEvent.click(await screen.findByRole('button', { name: 'Load more workers' }))
    expect(await screen.findByText('worker-arm64-02')).toBeVisible()
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/projects/project%20%2F%20one/applications/application%20%2F%20one/workers?limit=50&cursor=opaque%20%2F%20cursor',
      { protected: true },
    )
  })

  it('preserves workers after a failed background refresh', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        items: [worker()],
        next_cursor: null,
      })
      .mockRejectedValueOnce(new Error('refresh failed'))
    const { client } = renderWorkers(get)
    expect(await screen.findByText('6.9.2')).toBeVisible()
    await client.invalidateQueries({
      queryKey: ['projects', 'project / one', 'applications', 'application / one', 'workers'],
    })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(screen.getByText('6.9.2')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Worker nodes could not be refreshed.')
  })
})

it('explains empty worker observations after history closure', async () => {
  renderWorkers(
    vi.fn().mockResolvedValue({
      items: [],
      next_cursor: null,
      coverage: {
        closed_before: '2026-08-01T00:00:00Z',
        history_expired_before: null,
        detail_scope: 'raw',
      },
    }),
  )
  expect(
    await screen.findByText(/Detailed activity covers retained raw events only/),
  ).toBeInTheDocument()
  expect(screen.getByText(/Event ingestion closed before/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Connect agent' })).toHaveAttribute('href', '/onboarding')
})
