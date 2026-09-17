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
import {
  formatResourceValue,
  parseResourceSearch,
  resourceRange,
  type ResourceSearch,
} from './model'
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
    expect(Number(markers[0]?.getAttribute('x1'))).toBe(82)
    expect(Number(markers[1]?.getAttribute('x1'))).toBe(850)
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

  it('deduplicates repeated milestone labels while keeping at most eight feasible labels', async () => {
    const start = new Date('2026-09-07T00:00:00Z')
    const values = [50, 100, 200, 100, 200, 100, 200, 100, 200, 250]
    const points = values.map((value, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 3 * 3_600_000).toISOString(),
      to: new Date(start.getTime() + (index * 3 + 1) * 3_600_000).toISOString(),
      value,
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
    const milestoneLabels = Array.from(
      chart.querySelectorAll('[data-resource-milestone="true"] text'),
      (label) => label.textContent,
    )
    expect(milestoneLabels.length).toBeGreaterThan(0)
    expect(milestoneLabels).toEqual(expect.arrayContaining(['100 B', '200 B']))
    expect(new Set(milestoneLabels).size).toBe(milestoneLabels.length)
    expect(milestoneLabels.length).toBeLessThanOrEqual(8)
  })

  it('does not duplicate a flat zero value already shown on the Y axis', async () => {
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
    expect(milestones).toHaveLength(0)
    expect(chart.textContent).toContain('0 B/s')
    const observedPoints = chart
      .querySelector('[data-resource-series="observed"]')
      ?.getAttribute('points')
    expect(observedPoints).not.toMatch(/NaN|Infinity/)
  })

  it('labels the end of a significant drop at 14:00', async () => {
    const mebibyte = 1024 * 1024
    const start = new Date('2026-09-17T09:00:00Z')
    const values = [36.1, 35.9, 35.8, 35.2, 35.1, 34.1, 34.1, 34.1]
    const points = values.map((value, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 3_600_000).toISOString(),
      to: new Date(start.getTime() + (index + 1) * 3_600_000).toISOString(),
      value: value * mebibyte,
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
    const dropMilestone = Array.from(
      chart.querySelectorAll('[data-resource-milestone="true"]'),
    ).find((milestone) => milestone.querySelector('text')?.textContent === '34.1 MiB')
    const dropLabel = dropMilestone?.querySelector('text')
    const dropStem = dropMilestone?.querySelector('line')
    const pointX = 72 + (5 / 8) * 788
    expect(dropLabel).toBeDefined()
    expect(Number(dropStem?.getAttribute('x1'))).toBeCloseTo(pointX)
    expect(dropStem).toHaveAttribute('x1', dropStem?.getAttribute('x2'))
    expect(Number(dropLabel?.getAttribute('x'))).not.toBeCloseTo(pointX)
  })

  it('keeps dense milestone labels from overlapping and gives contested space to the newest', async () => {
    const start = new Date('2026-09-17T08:00:00Z')
    const values = [100, 200, 101, 199, 102, 198, 103]
    const points = values.map((value, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 60_000).toISOString(),
      to: new Date(start.getTime() + (index + 1) * 60_000).toISOString(),
      value,
      release: null,
    }))
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={initialSearch}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue({
        ...resourceHistoryFixture,
        from: start.toISOString(),
        to: new Date(start.getTime() + 24 * 3_600_000).toISOString(),
        points,
        releases: [],
      }),
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: Memory current',
    })
    const labels = Array.from(
      chart.querySelectorAll<SVGTextElement>('[data-resource-milestone="true"] text'),
    )
    // The chart uses 10 px centered SVG text. JSDOM has no SVG getBBox(), so approximate
    // each glyph as 6 px wide and the baseline box as 12 px tall, with 2 px visual padding.
    const boxes = labels.map((label) => {
      const x = Number(label.getAttribute('x'))
      const y = Number(label.getAttribute('y'))
      const width = (label.textContent?.length ?? 0) * 6 + 4
      return {
        label: label.textContent,
        left: x - width / 2,
        right: x + width / 2,
        top: y - 12,
        bottom: y + 2,
      }
    })
    const overlaps = boxes.flatMap((left, index) =>
      boxes
        .slice(index + 1)
        .flatMap((right) =>
          left.left < right.right &&
          left.right > right.left &&
          left.top < right.bottom &&
          left.bottom > right.top
            ? [`${left.label}/${right.label}`]
            : [],
        ),
    )
    const labelText = labels.map((label) => label.textContent)

    expect.soft(overlaps).toEqual([])
    for (const box of boxes) {
      expect.soft(box.left).toBeGreaterThanOrEqual(72)
      expect.soft(box.right).toBeLessThanOrEqual(860)
      expect.soft(box.top).toBeGreaterThanOrEqual(70)
      expect.soft(box.bottom).toBeLessThanOrEqual(260)
    }
    expect.soft(labelText).toContain('103 B')
    expect.soft(labelText).not.toContain('100 B')
  })

  it('clamps milestone label boxes inside both horizontal plot edges', async () => {
    const from = '2026-09-17T08:00:00.000Z'
    const to = '2026-09-17T09:00:00.000Z'
    const points = [
      { ...resourceHistoryFixture.points[0]!, from, to, value: 100, release: null },
      { ...resourceHistoryFixture.points[0]!, from: to, to, value: 200, release: null },
    ]
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={initialSearch}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue({
        ...resourceHistoryFixture,
        from,
        to,
        points,
        releases: [],
      }),
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: Memory current',
    })
    const labels = Array.from(
      chart.querySelectorAll<SVGTextElement>('[data-resource-milestone="true"] text'),
    )
    expect(labels).toHaveLength(2)
    for (const label of labels) {
      const x = Number(label.getAttribute('x'))
      const width = (label.textContent?.length ?? 0) * 6 + 4
      expect(x - width / 2).toBeGreaterThanOrEqual(72)
      expect(x + width / 2).toBeLessThanOrEqual(860)
    }
  })

  it('keeps observed-series segments out of milestone label boxes', async () => {
    const mebibyte = 1024 * 1024
    const start = new Date('2026-09-17T08:00:00Z')
    const values = [28.1, 28.9, 29.1, 28.2]
    const points = values.map((value, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 3_600_000).toISOString(),
      to: new Date(start.getTime() + (index + 1) * 3_600_000).toISOString(),
      value: value * mebibyte,
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
        from: start.toISOString(),
        to: new Date(start.getTime() + 24 * 3_600_000).toISOString(),
        points,
        releases: [],
      }),
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: Memory current',
    })
    const boxes = Array.from(
      chart.querySelectorAll<SVGTextElement>('[data-resource-milestone="true"] text'),
      (label) => {
        const x = Number(label.getAttribute('x'))
        const y = Number(label.getAttribute('y'))
        const width = (label.textContent?.length ?? 0) * 6 + 4
        return {
          label: label.textContent,
          left: x - width / 2,
          right: x + width / 2,
          top: y - 12,
          bottom: y + 2,
        }
      },
    )
    const segmentIntersectsBox = (
      startPoint: { x: number; y: number },
      endPoint: { x: number; y: number },
      box: (typeof boxes)[number],
    ) => {
      let near = 0
      let far = 1
      const clip = (origin: number, delta: number, minimum: number, maximum: number) => {
        if (delta === 0) return origin > minimum && origin < maximum
        const first = (minimum - origin) / delta
        const second = (maximum - origin) / delta
        near = Math.max(near, Math.min(first, second))
        far = Math.min(far, Math.max(first, second))
        return near < far
      }
      return (
        clip(startPoint.x, endPoint.x - startPoint.x, box.left, box.right) &&
        clip(startPoint.y, endPoint.y - startPoint.y, box.top, box.bottom) &&
        near < far
      )
    }
    const intersections = Array.from(
      chart.querySelectorAll<SVGPolylineElement>('[data-resource-series="observed"]'),
    ).flatMap((polyline) => {
      const vertices = (polyline.getAttribute('points') ?? '')
        .trim()
        .split(/\s+/)
        .map((pair) => {
          const [x, y] = pair.split(',').map(Number)
          return { x: x!, y: y! }
        })
      return vertices.slice(1).flatMap((endPoint, index) => {
        const startPoint = vertices[index]!
        return boxes.flatMap((box) =>
          segmentIntersectsBox(startPoint, endPoint, box)
            ? [`${box.label}: ${startPoint.x},${startPoint.y} -> ${endPoint.x},${endPoint.y}`]
            : [],
        )
      })
    })

    expect(intersections).toEqual([])
  })

  it('preserves tiny nonzero CPU values and scales their visible variation', async () => {
    const start = new Date('2026-09-17T08:00:00Z')
    const values = [0, 0.0004, 0.0008, 0.0005]
    const points = values.map((value, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 60_000).toISOString(),
      to: new Date(start.getTime() + (index + 1) * 60_000).toISOString(),
      value,
      release: null,
      limit: null,
    }))
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={{ ...initialSearch, metric: 'cpu_usage_cores' }}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue({
        ...resourceHistoryFixture,
        metric: 'cpu_usage_cores',
        unit: 'cores',
        from: points[0]!.from,
        to: points.at(-1)!.to,
        points,
        releases: [],
      }),
      'ru',
    )

    const chart = await screen.findByRole('img', {
      name: 'График истории ресурсов: Использование CPU',
    })
    const summaryValue = screen
      .getByText('Наблюдаемое значение', { selector: 'dt' })
      .parentElement?.querySelector('dd')?.textContent
    const tableText = screen.getByRole('region', {
      name: 'Таблица значений для клавиатурной навигации',
    }).textContent
    expect.soft(summaryValue).toBe('0,0005 ядра')
    expect.soft(tableText).toContain('0,0004 ядра')
    expect.soft(tableText).toContain('0,0008 ядра')
    expect.soft(tableText).toContain('0,0005 ядра')
    expect.soft(tableText).toContain('0 ядра')

    const observed = chart.querySelector<SVGPolylineElement>('[data-resource-series="observed"]')
    const yValues = (observed?.getAttribute('points') ?? '')
      .trim()
      .split(/\s+/)
      .map((pair) => Number(pair.split(',')[1]))
    expect.soft(Math.max(...yValues) - Math.min(...yValues)).toBeGreaterThan(50)
  })

  it('keeps a constant tiny nonzero CPU series finite and visible', async () => {
    const start = new Date('2026-09-17T08:00:00Z')
    const points = Array.from({ length: 3 }, (_, index) => ({
      ...resourceHistoryFixture.points[0]!,
      from: new Date(start.getTime() + index * 60_000).toISOString(),
      to: new Date(start.getTime() + (index + 1) * 60_000).toISOString(),
      value: 0.0004,
      release: null,
      limit: null,
    }))
    renderWithProviders(
      <ResourceHistory
        projectId="project"
        applicationId="application"
        search={{ ...initialSearch, metric: 'cpu_usage_cores' }}
        onSearch={() => undefined}
      />,
      vi.fn().mockResolvedValue({
        ...resourceHistoryFixture,
        metric: 'cpu_usage_cores',
        unit: 'cores',
        from: points[0]!.from,
        to: points.at(-1)!.to,
        points,
        releases: [],
      }),
    )

    const chart = await screen.findByRole('img', {
      name: 'Resource history chart: CPU use',
    })
    expect(screen.getAllByText('0.0004 cores').length).toBeGreaterThan(1)
    const coordinates = chart
      .querySelector('[data-resource-series="observed"]')
      ?.getAttribute('points')
    expect(coordinates).not.toMatch(/NaN|Infinity/)
    const yValues = (coordinates ?? '')
      .trim()
      .split(/\s+/)
      .map((pair) => Number(pair.split(',')[1]))
    expect(new Set(yValues).size).toBe(1)
    expect(yValues[0]).toBeGreaterThanOrEqual(70)
    expect(yValues[0]).toBeLessThanOrEqual(260)
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

describe('resource value formatting', () => {
  it('preserves tiny cores without changing zero, ordinary cores, or other units', () => {
    expect(formatResourceValue('en', 0.0004, 'cores')).toBe('0.0004 cores')
    expect(formatResourceValue('ru', 0.0004, 'cores')).toBe('0,0004 ядра')
    expect(formatResourceValue('en', -0.0004567, 'cores')).toBe('-0.000457 cores')
    expect(formatResourceValue('en', 0, 'cores')).toBe('0 cores')
    expect(formatResourceValue('en', 0.01, 'cores')).toBe('0.01 cores')
    expect(formatResourceValue('en', 1.234, 'cores')).toBe('1.23 cores')
    expect(formatResourceValue('en', 1024, 'bytes')).toBe('1 KiB')
    expect(formatResourceValue('en', 0.125, 'ratio')).toBe('12.5%')
    expect(formatResourceValue('en', 42, 'count')).toBe('42')
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
