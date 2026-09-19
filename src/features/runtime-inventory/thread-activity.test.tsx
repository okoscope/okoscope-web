import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import type { ThreadActivitySummary, ThreadActivityWindowPage } from '../../shared/api/types'
import { LocalizationProvider } from '../../shared/i18n'
import { ThreadActivityPanel } from './thread-activity'

const summary: ThreadActivitySummary = {
  from: '2026-09-19T10:00:00Z',
  to: '2026-09-19T11:00:00Z',
  window_count: 2,
  truncated: false,
  created: 8,
  exited: 3,
  active: 5,
  peak_active: 7,
  baseline_complete: true,
  baseline_provenance: 'observed',
  name_overflow: 0,
  names: [{ name: 'tokio-rt-worker', created: 8, exited: 3, active: 5 }],
  gaps: [],
}

const windows: ThreadActivityWindowPage = {
  items: [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      process_cgroup_id: 1,
      process_pid: 10,
      process_tgid: 10,
      process_command: '/app/api',
      process_generation: 1,
      observation_epoch: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      start_observed: true,
      window_started_at: '2026-09-19T10:00:00Z',
      window_ended_at: '2026-09-19T10:05:00Z',
      created_count: 8,
      exited_count: 3,
      active_at_start: 0,
      active_at_end: 5,
      peak_active: 7,
      baseline_provenance: 'observed',
      baseline_complete: true,
      name_overflow: 0,
      names: summary.names,
      gaps: [],
    },
  ],
  next_cursor: null,
}

function setup(
  get: ReturnType<typeof vi.fn>,
  locale: 'en' | 'ru' = 'en',
  bounds: { from?: string; to?: string } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <LocalizationProvider initialLocale={locale}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider value={{ get } as unknown as ApiClient}>
          <ThreadActivityPanel projectId="project /" applicationId="application ?" {...bounds} />
        </ApiProvider>
      </QueryClientProvider>
    </LocalizationProvider>,
  )
}

function successfulGet(overrides: Partial<ThreadActivitySummary> = {}) {
  return vi.fn((path: string) =>
    Promise.resolve(path.endsWith('/summary') ? { ...summary, ...overrides } : windows),
  )
}

describe('thread activity panel', () => {
  it('renders reconciled totals, one shared-name row, accessible structure, and responsive overflow', async () => {
    const get = successfulGet()
    const { container } = setup(get)

    const region = await screen.findByRole('region', { name: 'Thread activity' })
    expect(region).toHaveTextContent('Active at end5')
    expect(region).toHaveTextContent('Created8')
    expect(region).toHaveTextContent('Exited3')
    expect(region).toHaveTextContent('Peak active7')
    expect(screen.getAllByRole('row', { name: /tokio-rt-worker/ })).toHaveLength(1)
    expect(
      screen.getByRole('table', { name: 'Current thread activity grouped by name' }),
    ).toBeVisible()
    expect(container.querySelector('.overflow-x-auto')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Previous windows' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next windows' })).toBeDisabled()
  })

  it('qualifies incomplete snapshot totals, gaps, overflow, other names, and unobserved starts', async () => {
    const get = successfulGet({
      baseline_complete: false,
      baseline_provenance: 'snapshot',
      name_overflow: 4,
      gaps: ['snapshot_truncated'],
      names: [{ name: '__other__', created: 2, exited: 1, active: 1 }],
    })
    get.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith('/summary')
          ? {
              ...summary,
              baseline_complete: false,
              baseline_provenance: 'snapshot',
              name_overflow: 4,
              gaps: ['snapshot_truncated'],
              names: [{ name: '__other__', created: 2, exited: 1, active: 1 }],
            }
          : { ...windows, items: [{ ...windows.items[0]!, start_observed: false }] },
      ),
    )
    setup(get)

    expect(await screen.findByRole('status')).toHaveTextContent('Thread totals are lower bounds')
    expect(screen.getByText('Initialized from a process snapshot')).toBeVisible()
    expect(screen.getByText(/4 thread-name observations exceeded/)).toBeVisible()
    expect(screen.getByText(/Snapshot task limit reached/)).toBeVisible()
    expect(screen.getByRole('row', { name: /Other thread names/ })).toHaveTextContent('At least 1')
    await userEvent.click(screen.getByText('Observation windows'))
    expect(screen.getByText('Process start was not observed.')).toBeVisible()
  })

  it('supports bounded cursor pagination and preserves the selected time scope', async () => {
    const get = vi.fn((path: string) => {
      if (path.includes('/summary')) return Promise.resolve(summary)
      return Promise.resolve({
        ...windows,
        next_cursor: path.includes('cursor=next') ? null : 'next',
      })
    })
    setup(get, 'en', { from: '2026-09-19T10:00:00Z', to: '2026-09-19T11:00:00Z' })

    await userEvent.click(await screen.findByRole('button', { name: 'Next windows' }))
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3))
    expect(get.mock.calls.map(([path]) => String(path))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('from=2026-09-19T10%3A00%3A00Z&to=2026-09-19T11%3A00%3A00Z'),
        expect.stringContaining('cursor=next&limit=50'),
      ]),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous windows' }))
    await waitFor(() => expect(get).toHaveBeenCalledTimes(4))
  })

  it('renders loading, empty, summary-error, and windows-error states', async () => {
    const pending = vi.fn(() => new Promise(() => undefined))
    const pendingView = setup(pending)
    expect(screen.getByText('Loading thread activity…')).toHaveAttribute('aria-live', 'polite')
    pendingView.unmount()

    const emptyView = setup(successfulGet({ window_count: 0 }))
    expect(await screen.findByText('No thread activity observed')).toBeVisible()
    emptyView.unmount()

    const summaryError = vi.fn((path: string) =>
      path.includes('/summary') ? Promise.reject(new Error('offline')) : Promise.resolve(windows),
    )
    const summaryErrorView = setup(summaryError)
    expect(await screen.findByText('Could not load thread activity')).toBeVisible()
    summaryErrorView.unmount()

    const windowsError = vi.fn((path: string) =>
      path.includes('/summary') ? Promise.resolve(summary) : Promise.reject(new Error('offline')),
    )
    setup(windowsError)
    expect(await screen.findByText('Could not load thread activity windows')).toBeVisible()
  })

  it('localizes lifecycle quality and aggregate labels in Russian', async () => {
    setup(successfulGet({ baseline_complete: false }), 'ru')

    expect(await screen.findByRole('region', { name: 'Активность потоков' })).toBeVisible()
    expect(screen.getAllByText('Не менее 5')).toHaveLength(2)
    expect(screen.getByText('Значения потоков являются нижними границами')).toBeVisible()
  })
})
