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
import { applicationAgentHealthOptions } from '../../shared/api/queries'
import type {
  ApplicationAgentHealth,
  ApplicationAgentHealthPage,
  ApplicationWorker,
  ConnectionReadiness,
} from '../../shared/api/types'
import { englishMessages, LocalizationProvider, russianMessages } from '../../shared/i18n'
import { ApplicationWorkers, workerSignalState } from './application-workers'
import { getReadinessPresentation, getReadinessTone } from './readiness-presentation'

const worker = (overrides: Partial<ApplicationWorker> = {}): ApplicationWorker => ({
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
const healthAgent = (overrides: Partial<ApplicationAgentHealth> = {}): ApplicationAgentHealth => ({
  agent_id: 'agent-1',
  cluster_id: 'cluster-1',
  cluster_name: 'Production',
  node_name: 'worker-amd64-01',
  agent_version: '0.1.0',
  architecture: 'x86_64',
  kernel_release: '6.9.2',
  capabilities: ['process.exec/v1'],
  stream_state: 'reporting',
  last_signal_at: '2026-08-22T09:59:00Z',
  first_event_at: '2026-08-20T10:00:00Z',
  last_event_at: '2026-08-22T09:30:00Z',
  coverage: { available_from: '2026-08-22T09:00:00Z', complete: true },
  diagnostics_available: true,
  node_diagnostics: [],
  timeline: Array.from({ length: 60 }, (_, index) => ({
    start: `2026-08-22T09:${String(index).padStart(2, '0')}:00Z`,
    end: `2026-08-22T09:${String(index).padStart(2, '0')}:59Z`,
    status: 'received' as const,
    diagnostics: [],
    diagnostics_available: true,
    reset: false,
  })),
  ...overrides,
})
const healthPage = (
  items: ApplicationAgentHealth[] = [healthAgent()],
  overrides: Partial<ApplicationAgentHealthPage> = {},
): ApplicationAgentHealthPage => ({
  range: '1h',
  step_seconds: 60,
  window_start: '2026-08-22T09:00:00Z',
  window_end: '2026-08-22T10:00:00Z',
  freshness_seconds: 300,
  items,
  next_cursor: null,
  ...overrides,
})
const readiness = (overrides: Partial<ConnectionReadiness> = {}): ConnectionReadiness => ({
  state: 'receiving_events',
  reason: null,
  credential_last_used_at: '2026-08-22T09:58:00Z',
  first_event_at: '2026-08-20T10:00:00Z',
  last_event_at: '2026-08-22T09:30:00Z',
  reporting_nodes: 1,
  stale_after_seconds: 300,
  ...overrides,
})
type Handler<T> = T | Error | (() => T | Promise<T>)
function endpointGet({
  agents = healthPage(),
  health = readiness(),
}: {
  agents?: Handler<ApplicationAgentHealthPage>
  health?: Handler<ConnectionReadiness>
} = {}) {
  return vi.fn(async (path: string) => {
    const handler = path.includes('/connection-readiness') ? health : agents
    if (handler instanceof Error) throw handler
    return typeof handler === 'function' ? handler() : handler
  }) as ApiClient['get']
}
function renderWorkers(get: ApiClient['get'], locale: 'en' | 'ru' = 'en') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  const rootRoute = createRootRoute({
    component: () => (
      <ApplicationWorkers projectId="project / one" applicationId="application / one" />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return {
    ...render(
      <QueryClientProvider client={client}>
        <ApiProvider value={{ get } as ApiClient}>
          <LocalizationProvider initialLocale={locale}>
            <RouterProvider router={router} />
          </LocalizationProvider>
        </ApiProvider>
      </QueryClientProvider>,
    ),
    client,
    router,
  }
}

const stateCases = [
  ['credential_created', 'readiness_credential_created', 'healthActionInstallAgent', true],
  ['waiting_for_agent', 'readiness_waiting_for_agent', 'healthActionCheckAgent', true],
  ['agent_authenticated', 'readiness_agent_authenticated', 'healthActionReviewInstallation', true],
  ['workload_not_matched', 'readiness_workload_not_matched', 'healthActionReviseSelector', true],
  ['permission_denied', 'readiness_permission_denied', 'healthActionReviewRbac', true],
  ['kernel_unsupported', 'readiness_kernel_unsupported', 'healthActionReviewAgentLogs', false],
  ['waiting_for_event', 'readiness_waiting_for_event', 'healthActionGenerateTraffic', false],
  ['receiving_events', 'readiness_receiving_events', undefined, false],
  ['stale', 'readiness_stale', 'healthActionCheckAgent', true],
  ['credential_revoked', 'readiness_credential_revoked', 'healthActionReplaceCredential', true],
] as const
const reasonCases = [
  ['selector_no_match', 'healthReasonSelectorNoMatch', 'healthActionReviseSelector', true],
  [
    'kubernetes_watch_forbidden',
    'healthReasonKubernetesWatchForbidden',
    'healthActionReviewRbac',
    true,
  ],
  ['ebpf_unavailable', 'healthReasonEbpfUnavailable', 'healthActionReviewAgentLogs', false],
  ['btf_unavailable', 'healthReasonBtfUnavailable', 'healthActionReviewAgentLogs', false],
  ['event_not_observed', 'healthReasonEventNotObserved', 'healthActionGenerateTraffic', false],
] as const

describe('readiness presentation', () => {
  it.each(stateCases)(
    'maps state %s to localized copy and action',
    (state, statusKey, actionKey, actionInOnboarding) => {
      const result = getReadinessPresentation(readiness({ state, reason: null }))
      expect(result).toMatchObject({ statusKey, actionInOnboarding })
      expect(result.actionKey).toBe(actionKey)
      for (const messages of [englishMessages, russianMessages]) {
        expect(messages[result.statusKey]).toBeTruthy()
        expect(messages[result.explanationKey]).toBeTruthy()
        if (result.actionKey) expect(messages[result.actionKey]).toBeTruthy()
      }
    },
  )
  it.each(reasonCases)(
    'lets reason %s override state guidance',
    (reason, explanationKey, actionKey, actionInOnboarding) => {
      expect(getReadinessPresentation(readiness({ state: 'agent_authenticated', reason }))).toEqual(
        {
          statusKey: 'readiness_agent_authenticated',
          explanationKey,
          actionKey,
          actionInOnboarding,
        },
      )
    },
  )
  it('preserves onboarding presentation and deliberate tones', () => {
    expect(getReadinessPresentation(readiness({ state: 'waiting_for_event' })).explanationKey).toBe(
      'readinessHelp_waiting_for_event',
    )
    expect(getReadinessTone('receiving_events')).toBe('positive')
    expect(getReadinessTone('permission_denied')).toBe('critical')
    expect(getReadinessTone('stale')).toBe('warning')
    expect(getReadinessTone('waiting_for_agent')).toBe('neutral')
  })
})

describe('worker signal freshness', () => {
  const now = Date.parse('2026-08-22T10:00:00Z')
  it('uses the server threshold and keeps the exact boundary fresh', () => {
    expect(
      workerSignalState(worker({ agent_last_seen_at: '2026-08-22T09:55:00Z' }), now, 300),
    ).toBe('fresh')
    expect(
      workerSignalState(worker({ agent_last_seen_at: '2026-08-22T09:54:59Z' }), now, 300),
    ).toBe('stale')
  })
  it('does not invent freshness without readiness or a valid timestamp', () => {
    expect(workerSignalState(worker(), now)).toBe('unknown')
    expect(workerSignalState(worker({ agent_last_seen_at: 'invalid' }), now, 300)).toBe('unknown')
  })
})

describe('Application agent health', () => {
  it.each([
    ['1h', 60, 60, '1 hour'],
    ['6h', 300, 72, '6 hours'],
    ['24h', 900, 96, '24 hours'],
  ] as const)(
    'requests the %s payload and renders its exact bounded timeline',
    async (selectedRange, stepSeconds, pointCount, buttonName) => {
      const get = vi.fn((path: string) => {
        if (path.includes('/connection-readiness')) return Promise.resolve(readiness())
        const timeline = Array.from({ length: pointCount }, (_, index) => ({
          start: new Date(index * stepSeconds * 1_000).toISOString(),
          end: new Date((index + 1) * stepSeconds * 1_000).toISOString(),
          status: 'received' as const,
          diagnostics: [],
          diagnostics_available: true,
          reset: false,
        }))
        return Promise.resolve(
          healthPage([healthAgent({ timeline })], {
            range: selectedRange,
            step_seconds: stepSeconds,
          }),
        )
      }) as ApiClient['get']
      renderWorkers(get)
      if (selectedRange !== '1h') {
        await userEvent.click(await screen.findByRole('button', { name: buttonName }))
      }
      expect(
        await screen.findByRole('group', {
          name: new RegExp(`${selectedRange}: ${pointCount} received`),
        }),
      ).toBeVisible()
      expect(get).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`agent-health\\?range=${selectedRange}&limit=20`)),
        { protected: true },
      )
    },
  )

  it('requests the default range and progressively discloses capabilities', async () => {
    const get = endpointGet()
    renderWorkers(get)
    expect(await screen.findByText('worker-amd64-01')).toBeVisible()
    expect(screen.getByText('Reporting recently')).toHaveAttribute('data-stream-state', 'reporting')
    const disclosure = screen.getByText('Advertised capabilities · 1')
    expect(disclosure).toBeVisible()
    expect(screen.queryByText('Process execution')).not.toBeVisible()
    await userEvent.click(disclosure)
    expect(screen.getByText('Process execution')).toBeVisible()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/agent-health\?range=1h&limit=20/), {
      protected: true,
    })
  })

  it('changes to a supported range with keyboard-operable controls', async () => {
    const get = endpointGet()
    renderWorkers(get)
    const range = await screen.findByRole('button', { name: '6 hours' })
    range.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(expect.stringMatching(/agent-health\?range=6h&limit=20/), {
        protected: true,
      }),
    )
    expect(range).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders gaps, unavailable coverage, diagnostics, and resets with non-color text', async () => {
    const points = healthAgent().timeline.map((point, index) =>
      index === 1
        ? { ...point, status: 'missing' as const }
        : index === 2
          ? { ...point, status: 'unavailable' as const }
          : index === 3
            ? {
                ...point,
                diagnostics: [{ category: 'decode_failed' as const, delta: 2 }],
                reset: true,
              }
            : point,
    )
    renderWorkers(endpointGet({ agents: healthPage([healthAgent({ timeline: points })]) }))
    expect(
      await screen.findByRole('group', { name: /58 received, 1 missing, 1 unavailable/ }),
    ).toBeVisible()
    const receivedLegend = screen.getByText('signal received')
    const missingLegend = screen.getByText('signal missing in known coverage')
    const unavailableLegend = screen.getByText('history unavailable')
    expect(receivedLegend).toBeVisible()
    expect(missingLegend).toBeVisible()
    expect(unavailableLegend).toBeVisible()
    expect(receivedLegend.firstElementChild).toHaveClass('bg-emerald-500/65')
    expect(missingLegend.firstElementChild).toHaveClass('border-dashed')
    expect(unavailableLegend.firstElementChild).toHaveClass(
      'shadow-[inset_0_-2px_0_rgb(71_85_105_/_0.65)]',
    )
    expect(screen.getAllByText('Decode failures: +2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 counter resets').length).toBeGreaterThan(0)
  })

  it('renders unknown capabilities as inert text and older-agent diagnostics as unavailable', async () => {
    renderWorkers(
      endpointGet({
        agents: healthPage([
          healthAgent({
            capabilities: ['future.signal/v2'],
            architecture: null,
            kernel_release: null,
            last_signal_at: null,
            stream_state: 'unknown',
            diagnostics_available: false,
            timeline: healthAgent().timeline.map((point) => ({
              ...point,
              diagnostics_available: false,
            })),
          }),
        ]),
      }),
    )
    await userEvent.click(await screen.findByText('Advertised capabilities · 1'))
    expect(screen.getByText('future.signal/v2')).toBeVisible()
    expect(screen.getByText('Signal evidence unavailable')).toBeVisible()
    expect(screen.getByText(/diagnostics are unavailable from this agent/i)).toBeVisible()
    expect(document.querySelector('a[href="future.signal/v2"]')).toBeNull()
  })

  it('renders every scoped diagnostic category without node-wide language', async () => {
    const diagnostics = [
      'dropped',
      'rate_limited',
      'decode_failed',
      'attribution_failed',
      'capacity',
      'kernel_lost',
      'correlation',
      'delivery_retry',
      'unsupported',
    ].map((category) => ({
      category: category as ApplicationAgentHealth['node_diagnostics'][number]['category'],
      delta: 1,
    }))
    const timeline = healthAgent().timeline.map((point, index) =>
      index === 0 ? { ...point, diagnostics } : point,
    )
    renderWorkers(
      endpointGet({
        agents: healthPage([
          healthAgent({
            timeline,
            node_diagnostics: [{ category: 'unsupported', delta: 99 }],
          }),
        ]),
      }),
    )
    for (const label of [
      'Dropped evidence',
      'Rate limited',
      'Decode failures',
      'Attribution failures',
      'Capacity limits',
      'Kernel losses',
      'Correlation gaps',
      'Delivery retries',
      'Unsupported condition',
    ]) {
      expect(await screen.findByText(`${label}: +1`)).toBeVisible()
    }
    expect(screen.getByText(/assigned to this Application workload/)).toBeVisible()
    expect(screen.queryByText(/node-wide/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Unsupported condition: +99')).not.toBeInTheDocument()
  })

  it('links an agent without events to readiness guidance', async () => {
    renderWorkers(
      endpointGet({
        agents: healthPage([healthAgent({ first_event_at: null, last_event_at: null })]),
        health: readiness({ state: 'waiting_for_event', reason: 'event_not_observed' }),
      }),
    )
    const card = (await screen.findByText('worker-amd64-01')).closest('[data-agent-id]')
    expect(card).toHaveTextContent('No runtime event has been accepted for this Application.')
    expect(screen.getAllByText(/Generate normal application activity/).length).toBeGreaterThan(0)
  })

  it('paginates agents with the opaque cursor', async () => {
    const get = vi.fn((path: string) => {
      if (path.includes('/connection-readiness')) return Promise.resolve(readiness())
      if (path.includes('cursor=opaque+%2F+next'))
        return Promise.resolve(
          healthPage([healthAgent({ agent_id: 'agent-2', node_name: 'worker-02' })]),
        )
      return Promise.resolve(healthPage([healthAgent()], { next_cursor: 'opaque / next' }))
    }) as ApiClient['get']
    renderWorkers(get)
    await userEvent.click(await screen.findByRole('button', { name: 'Load more agents' }))
    expect(await screen.findByText('worker-02')).toBeVisible()
    expect(get).toHaveBeenCalledWith(expect.stringContaining('cursor=opaque+%2F+next'), {
      protected: true,
    })
  })

  it('polls every 30 seconds while preserving the previous page', () => {
    const get = endpointGet()
    const options = applicationAgentHealthOptions(
      { get } as ApiClient,
      'project / one',
      'application / one',
    )
    expect(options.refetchInterval).toBe(30_000)
    const previous = { pages: [healthPage()], pageParams: [null] }
    expect(options.placeholderData).toEqual(expect.any(Function))
    if (typeof options.placeholderData === 'function') {
      expect(options.placeholderData(previous, undefined as never)).toBe(previous)
    }
  })

  it('provides Russian timeline and diagnostic localization', async () => {
    renderWorkers(
      endpointGet({
        agents: healthPage([
          healthAgent({
            timeline: healthAgent().timeline.map((point, index) =>
              index === 0
                ? {
                    ...point,
                    diagnostics: [{ category: 'rate_limited', delta: 3 }],
                  }
                : point,
            ),
          }),
        ]),
      }),
      'ru',
    )
    expect(await screen.findByText('Здоровье и покрытие агентов')).toBeVisible()
    expect(screen.getByText('Ограничение частоты: +3')).toBeVisible()
    expect(screen.getByRole('group', { name: 'Период истории сердцебиений' })).toBeVisible()
  })

  it('exposes interval details to keyboard focus with status, reset, and scoped delta', async () => {
    const timeline = healthAgent().timeline.map((point, index) =>
      index === 0
        ? {
            ...point,
            diagnostics: [{ category: 'dropped' as const, delta: 4 }],
            reset: true,
          }
        : point,
    )
    renderWorkers(endpointGet({ agents: healthPage([healthAgent({ timeline })]) }))
    const interval = (await screen.findAllByLabelText(/diagnostic increase 4; counter reset/))[0]!
    interval.focus()
    expect(interval).toHaveFocus()
    expect(interval).toHaveAttribute('data-diagnostics', 'true')
    expect(interval).toHaveAttribute('data-reset', 'true')
  })

  it('keeps previous data visible after a background refresh failure', async () => {
    let fail = false
    const get = vi.fn((path: string) => {
      if (path.includes('/connection-readiness')) return Promise.resolve(readiness())
      if (fail) return Promise.reject(new Error('refresh failed'))
      return Promise.resolve(healthPage())
    }) as ApiClient['get']
    const { client } = renderWorkers(get)
    expect(await screen.findByText('worker-amd64-01')).toBeVisible()
    fail = true
    await client.invalidateQueries({
      queryKey: applicationAgentHealthOptions(
        { get } as ApiClient,
        'project / one',
        'application / one',
      ).queryKey,
    })
    expect(screen.getByText('worker-amd64-01')).toBeVisible()
    expect(await screen.findByRole('alert')).toHaveTextContent('Previous data remains visible')
  })

  it('isolates an initial health failure and retries without hiding readiness', async () => {
    let attempts = 0
    const get = vi.fn((path: string) => {
      if (path.includes('/connection-readiness')) return Promise.resolve(readiness())
      attempts += 1
      if (attempts === 1) return Promise.reject(new Error('health unavailable'))
      return Promise.resolve(healthPage())
    }) as ApiClient['get']
    renderWorkers(get)
    expect(
      await screen.findByRole('heading', { name: 'Agent health could not be loaded' }),
    ).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('worker-amd64-01')).toBeVisible()
  })
})
