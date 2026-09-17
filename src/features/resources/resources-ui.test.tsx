import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../shared/api/client'
import type { ApplicationResourceHistory } from '../../shared/api/types'
import { ApiProvider } from '../../shared/api/context'
import { LocalizationProvider } from '../../shared/i18n'
import {
  collectingComparisonFixture,
  resourceComparisonFixture,
  resourceHistoryFixture,
} from './fixtures'
import { parseResourceSearch, resourceRange, type ResourceSearch } from './model'
import { ResourceComparison } from './resource-comparison'
import { ResourceHistory } from './resource-history'

function renderWithProviders(
  node: React.ReactNode,
  get: ApiClient['get'],
  locale: 'en' | 'ru' = 'en',
) {
  const rootRoute = createRootRoute({ component: () => node })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider value={{ get } as ApiClient}>
        <LocalizationProvider initialLocale={locale}>
          <RouterProvider router={router} />
        </LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
}

const initialSearch: ResourceSearch = {
  metric: 'memory_current_bytes',
  range: '24h',
  step: 'minute',
  mode: 'per_ready_replica',
}

describe('resource history', () => {
  it('renders covered values, gaps, limits, releases and the per-replica normalization', async () => {
    const get = vi.fn().mockResolvedValue(resourceHistoryFixture)
    function Harness() {
      const [search, setSearch] = useState(initialSearch)
      return (
        <ResourceHistory
          projectId="project"
          applicationId="application"
          search={search}
          onSearch={setSearch}
        />
      )
    }
    renderWithProviders(<Harness />, get)

    expect(await screen.findByRole('heading', { name: 'Application resources' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Display' })).toHaveValue('per_ready_replica')
    expect(screen.getAllByText('610 MiB').length).toBeGreaterThan(0)
    expect(screen.getByText('Missing or incomplete interval')).toBeVisible()
    expect(screen.getAllByText('1 GiB').length).toBeGreaterThan(0)
    expect(screen.getByText('Gateway 1.8')).toBeVisible()
    const chart = screen.getByRole('img', { name: 'Resource history chart: Memory current' })
    expect(chart).toBeVisible()
    expect(chart.querySelectorAll('circle, [data-resource-point="true"]')).toHaveLength(0)
    expect(chart.querySelectorAll('[data-resource-series="observed"]')).toHaveLength(2)
    expect(chart.querySelectorAll('[data-resource-series="gap"]')).toHaveLength(1)
    expect(chart.querySelector('[data-resource-series="observed"]')).toHaveAttribute(
      'stroke-width',
      '2',
    )
    expect(chart.querySelector('[data-resource-series="gap"]')).toHaveAttribute(
      'stroke-dasharray',
      '7 5',
    )
    expect(screen.getByText('Observed data')).toBeVisible()
    expect(screen.getAllByText('Interval without data').length).toBeGreaterThanOrEqual(1)
    expect(get).toHaveBeenCalledWith(expect.stringContaining('mode=per_ready_replica'), {
      protected: true,
    })
  })

  it('keeps release markers inside the chart plotting area', async () => {
    const releases = [
      {
        ...resourceHistoryFixture.releases[0]!,
        observed_at: resourceHistoryFixture.from,
        release: { id: 'start', display_name: 'At range start' },
      },
      {
        ...resourceHistoryFixture.releases[0]!,
        observed_at: resourceHistoryFixture.to,
        release: { id: 'end', display_name: 'At range end' },
      },
      {
        ...resourceHistoryFixture.releases[0]!,
        observed_at: '2026-09-07T11:00:00Z',
        release: { id: 'before', display_name: 'Before range' },
      },
      {
        ...resourceHistoryFixture.releases[0]!,
        observed_at: '2026-09-07T13:00:00Z',
        release: { id: 'after', display_name: 'After range' },
      },
    ]
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={initialSearch}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue({ ...resourceHistoryFixture, releases }),
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: Memory current',
    })
    const markers = chart.querySelectorAll('[data-resource-release-marker="true"]')
    expect(markers).toHaveLength(2)
    expect(Number(markers[0]?.getAttribute('x1'))).toBe(72)
    expect(Number(markers[1]?.getAttribute('x1'))).toBe(860)
    for (const marker of markers) {
      expect(marker).toHaveAttribute('x1', marker.getAttribute('x2'))
      expect(marker).toHaveAttribute('stroke', '#34d399')
      expect(marker).toHaveAttribute('stroke-dasharray', '4 5')
    }
    const releaseTitles = Array.from(chart.querySelectorAll('title')).filter((title) =>
      title.textContent?.startsWith('Release observed:'),
    )
    expect(releaseTitles).toHaveLength(2)
    expect(chart.textContent).toContain('At range start')
    expect(chart.textContent).toContain('At range end')
    expect(chart.textContent).not.toContain('Before range')
    expect(chart.textContent).not.toContain('After range')
  })

  it('updates metric, range, resolution, normalization, and bounded high-cardinality containers', async () => {
    const get = vi.fn().mockResolvedValue({
      ...resourceHistoryFixture,
      containers: Array.from({ length: 120 }, (_, index) => `container-${index}`),
    })
    function Harness() {
      const [search, setSearch] = useState(initialSearch)
      return (
        <ResourceHistory
          projectId="project"
          applicationId="application"
          search={search}
          onSearch={setSearch}
        />
      )
    }
    renderWithProviders(<Harness />, get)
    await screen.findByRole('heading', { name: 'Application resources' })
    expect(
      screen.getByRole('combobox', { name: 'Container' }).querySelectorAll('option'),
    ).toHaveLength(101)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Metric' }),
      'io_psi_some_ratio',
    )
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(expect.stringContaining('metric=io_psi_some_ratio'), {
        protected: true,
      }),
    )
    expect(screen.getByText(/PSI is the share of wall time/)).toBeVisible()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Range' }), '30d')
    expect(screen.getByRole('combobox', { name: 'Resolution' })).toHaveValue('hour')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Display' }), 'total')
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(expect.stringContaining('mode=total'), {
        protected: true,
      }),
    )
  })

  it('bounds a long series while preserving explicit gaps and the latest 100 table intervals', async () => {
    const from = new Date('2026-09-07T00:00:00Z')
    const points = Array.from({ length: 500 }, (_, index) => {
      const pointFrom = new Date(from.getTime() + index * 60_000)
      const gap = index % 30 === 0
      return {
        ...resourceHistoryFixture.points[0]!,
        from: pointFrom.toISOString(),
        to: new Date(pointFrom.getTime() + 60_000).toISOString(),
        value: gap ? null : 440_401_920 + index,
        availability: gap ? ('insufficient_coverage' as const) : ('available' as const),
        coverage: gap
          ? { ...resourceHistoryFixture.points[1]!.coverage, complete: false }
          : resourceHistoryFixture.points[0]!.coverage,
      }
    })
    const get = vi.fn().mockResolvedValue({
      ...resourceHistoryFixture,
      from: points[0]!.from,
      to: points.at(-1)!.to,
      points,
    })
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={initialSearch}
        onSearch={() => undefined}
      />,
      get,
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: Memory current',
    })
    const renderedVertices = Array.from(chart.querySelectorAll('polyline')).reduce(
      (count, line) => count + (line.getAttribute('points')?.trim().split(' ').length ?? 0),
      0,
    )
    expect(renderedVertices).toBeLessThanOrEqual(240)
    expect(chart.querySelectorAll('polyline').length).toBeGreaterThan(1)
    expect(screen.getAllByRole('row')).toHaveLength(101)
    expect(screen.getAllByText('Missing or incomplete interval').length).toBeGreaterThan(0)
  })

  it('keeps the previous result visible and announces a stale refetch', async () => {
    let resolveRefetch!: (value: ApplicationResourceHistory) => void
    const refetch = new Promise<ApplicationResourceHistory>((resolve) => {
      resolveRefetch = resolve
    })
    const get = vi.fn().mockResolvedValueOnce(resourceHistoryFixture).mockReturnValueOnce(refetch)
    function Harness() {
      const [search, setSearch] = useState(initialSearch)
      return (
        <ResourceHistory
          projectId="project"
          applicationId="application"
          search={search}
          onSearch={setSearch}
        />
      )
    }
    renderWithProviders(<Harness />, get)
    expect((await screen.findAllByText('610 MiB')).length).toBeGreaterThan(0)

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Metric' }),
      'memory_anon_bytes',
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Showing the previous result while newer data is loading.',
    )
    expect(screen.getAllByText('610 MiB').length).toBeGreaterThan(0)

    resolveRefetch({ ...resourceHistoryFixture, metric: 'memory_anon_bytes' })
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('offers every control and scrollable data view in keyboard order', async () => {
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={initialSearch}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue(resourceHistoryFixture),
    )
    await screen.findByRole('heading', { name: 'Application resources' })
    const user = userEvent.setup()
    for (const name of ['Metric', 'Range', 'Resolution', 'Display', 'Container']) {
      await user.tab()
      expect(screen.getByRole('combobox', { name })).toHaveFocus()
    }
    await user.tab()
    expect(
      screen.getByRole('region', { name: 'Resource history chart: Memory current' }),
    ).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('region', { name: 'Keyboard-readable resource values' })).toHaveFocus()
  })

  it('renders empty, unavailable, and retryable error states in Russian', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ...resourceHistoryFixture,
        availability: 'unsupported',
        points: [],
      })
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={initialSearch}
        onSearch={() => undefined}
      />,
      get,
      'ru',
    )
    expect(
      await screen.findByRole('heading', { name: 'История ресурсов недоступна' }),
    ).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByRole('heading', { name: 'Нет измерений ресурсов' })).toBeVisible()
    expect(screen.getByText(/Профиль ресурсов может быть выключен/)).toBeVisible()
  })

  it('defaults invalid search state and forces hourly resolution for 30 days', () => {
    expect(parseResourceSearch({ metric: 'host-secret', mode: 'raw', range: 'forever' })).toEqual({
      metric: 'memory_current_bytes',
      range: '24h',
      step: 'hour',
      mode: 'total',
      release: undefined,
      container: undefined,
    })
    expect(parseResourceSearch({ range: '30d', step: 'minute', container: '' })).toMatchObject({
      range: '30d',
      step: 'hour',
      container: undefined,
    })
    expect(parseResourceSearch({ range: '24h', step: 'minute' })).toMatchObject({
      range: '24h',
      step: 'minute',
    })
  })

  it('bounds meaningful value milestones to eight labels', async () => {
    const start = new Date('2026-09-07T00:00:00Z')
    const points = Array.from({ length: 16 }, (_, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 3_600_000).toISOString(),
      to: new Date(start.getTime() + (index + 1) * 3_600_000).toISOString(),
      value: index % 2 === 0 ? 100 : 200,
      release: null,
    }))
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={{ ...initialSearch, step: 'hour' }}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue({
        ...resourceHistoryFixture,
        step: 'hour',
        from: points[0]!.from,
        to: points.at(-1)!.to,
        points,
        releases: [],
      }),
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: Memory current',
    })
    expect(chart.querySelectorAll('[data-resource-milestone="true"]')).toHaveLength(8)
  })

  it('keeps flat zero-value milestone labels above the X axis', async () => {
    const start = new Date('2026-09-07T00:00:00Z')
    const points = Array.from({ length: 24 }, (_, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 3_600_000).toISOString(),
      to: new Date(start.getTime() + (index + 1) * 3_600_000).toISOString(),
      value: 0,
      release: null,
    }))
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={{ ...initialSearch, metric: 'io_write_bytes', step: 'hour' }}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue({
        ...resourceHistoryFixture,
        metric: 'io_write_bytes',
        unit: 'bytes_per_second',
        step: 'hour',
        from: points[0]!.from,
        to: points.at(-1)!.to,
        points,
        releases: [],
      }),
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: I/O write throughput',
    })
    const milestones = chart.querySelectorAll('[data-resource-milestone="true"]')
    expect(milestones).toHaveLength(2)
    for (const line of chart.querySelectorAll('[data-resource-milestone="true"] line')) {
      expect(Number(line.getAttribute('y1'))).toBeGreaterThanOrEqual(70)
      expect(Number(line.getAttribute('y2'))).toBeLessThanOrEqual(260)
    }
    for (const label of chart.querySelectorAll('[data-resource-milestone="true"] text'))
      expect(Number(label.getAttribute('y'))).toBeLessThan(260)
  })

  it('aligns time ranges to the requested step while preserving their duration', () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-09-07T10:47:38.529Z')
    try {
      expect(resourceRange('6h', 'minute')).toEqual({
        from: '2026-09-07T04:47:00.000Z',
        to: '2026-09-07T10:47:00.000Z',
      })
      expect(resourceRange('30d', 'hour')).toEqual({
        from: '2026-08-08T10:00:00.000Z',
        to: '2026-09-07T10:00:00.000Z',
      })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('release resource comparison', () => {
  it('renders a causal-neutral comparable result and routes to target history', async () => {
    renderWithProviders(
      <ResourceComparison
        projectId="project"
        applicationId="application"
        targetReleaseId="target"
        baselineReleaseId="baseline"
      />,
      vi.fn().mockResolvedValue(resourceComparisonFixture),
    )
    expect(await screen.findByRole('heading', { name: 'Resource impact' })).toBeVisible()
    expect(screen.getByText(/do not establish that the Release caused/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'CPU throttled periods' })).toBeVisible()
    expect(screen.getByText(/\+17 percentage points/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Open full resource history' })).toHaveAttribute(
      'href',
      expect.stringContaining('release=target'),
    )
    expect(screen.getByRole('link', { name: 'Open full resource history' })).toHaveAttribute(
      'href',
      expect.stringContaining('step=hour'),
    )
  })

  it('renders collecting progress in Russian', async () => {
    renderWithProviders(
      <ResourceComparison
        projectId="project"
        applicationId="application"
        targetReleaseId="target"
      />,
      vi.fn().mockResolvedValue(collectingComparisonFixture),
      'ru',
    )
    expect(await screen.findByText('Собирается стабильное целевое окно')).toBeVisible()
    expect(screen.getByText('Прогресс сбора: 40%')).toBeVisible()
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0.4')
  })
})
