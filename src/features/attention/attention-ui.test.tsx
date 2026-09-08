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
import { useState } from 'react'
import type { ApiClient } from '../../shared/api/client'
import { ApiProvider } from '../../shared/api/context'
import { LocalizationProvider, translate } from '../../shared/i18n'
import {
  ApplicationAttention,
  ApplicationAttentionTabs,
  observedVolumeTone,
  restartLoopTone,
} from './application-attention'
import type { ApplicationAttentionSection } from './url-state'
import {
  populatedApplicationAttentionFixture,
  policyAwareApplicationAttentionFixture,
  allClearOrganizationAttentionFixture,
  populatedOrganizationAttentionFixture,
  unavailableApplicationAttentionFixture,
  resourceRegressionApplicationAttentionFixture,
} from './fixtures'
import { OrganizationAttention } from './organization-attention'
import { PriorityBadge, reasonText, runtimeGroupDisplayName } from './components'

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
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ApiProvider value={{ get } as ApiClient}>
        <LocalizationProvider initialLocale={locale}>
          <RouterProvider router={router} />
        </LocalizationProvider>
      </ApiProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, queryClient }
}

const organization = { id: 'org', name: 'Acme', slug: 'acme', created_at: '2026-08-20T00:00:00Z' }
const runtimeGroupIdentity = {
  event_kind: 'process.exit',
  semantic_summary: {
    identity: 'rm',
    source: 'kernel',
    termination: { type: 'exited', status: 0 },
  },
  namespace: 'payments',
  workload_kind: 'Deployment',
  workload_name: 'payment-api',
}

describe('attention presentation', () => {
  it('renders counted semantic tabs and supports wrapping keyboard selection', async () => {
    function Harness() {
      const [section, setSection] = useState<ApplicationAttentionSection>('recommendations')
      return (
        <ApplicationAttentionTabs
          section={section}
          recommendationCount={3}
          priorityCount={0}
          onSection={setSection}
        />
      )
    }
    render(
      <LocalizationProvider initialLocale="en">
        <Harness />
      </LocalizationProvider>,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toHaveTextContent('Overview')
    expect(tabs[1]).toHaveTextContent('Recommendations (3)')
    expect(tabs[2]).toHaveTextContent('Priority queue (0)')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    tabs[1]!.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(tabs[2]).toHaveFocus())
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(tabs[0]).toHaveFocus())
    await userEvent.keyboard('{End}')
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(tabs[2]).toHaveFocus())
    await userEvent.keyboard('{Home}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('maps observed event volume from green through red without treating it as risk', () => {
    expect(observedVolumeTone(0)).toContain('emerald')
    expect(observedVolumeTone(1)).toContain('emerald')
    expect(observedVolumeTone(5)).toContain('amber')
    expect(observedVolumeTone(20)).toContain('orange')
    expect(observedVolumeTone(100)).toContain('rose')
  })

  it('highlights restart loops by count', () => {
    expect(restartLoopTone(0)).toContain('emerald')
    expect(restartLoopTone(1)).toContain('amber')
    expect(restartLoopTone(2)).toContain('rose')
  })

  it('builds a distinguishable runtime group name from its semantic identity', () => {
    expect(runtimeGroupDisplayName(runtimeGroupIdentity as never)).toBe(
      'Process terminated — rm · exit 0',
    )
    expect(
      runtimeGroupDisplayName({
        event_kind: 'process.exit',
        semantic_summary: {
          identity: 'sh',
          source: 'kernel',
          termination: { type: 'signaled', signal: 11, signal_name: 'SIGSEGV' },
        },
      } as never),
    ).toBe('Process terminated — sh · SIGSEGV')
  })
  it.each(['urgent', 'high', 'normal'] as const)(
    'renders %s priority with accessible text and icon',
    (priority) => {
      render(
        <LocalizationProvider initialLocale="en">
          <PriorityBadge priority={priority} />
        </LocalizationProvider>,
      )
      expect(
        screen.getByText(
          translate(
            'en',
            priority === 'urgent'
              ? 'priorityUrgent'
              : priority === 'high'
                ? 'priorityHigh'
                : 'priorityNormal',
          ),
        ),
      ).toBeVisible()
      expect(document.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    },
  )

  it('covers every reason without security or deletion claims', () => {
    const reasons = [
      'terminal_deliveries_failed',
      'notification_health_failing',
      'notification_health_backlogged',
      'notification_health_retrying',
      'enabled_destination_missing',
      'release_runtime_changed',
      'discovery_first_seen_in_window',
      'discovery_open',
      'container_restart_loop_observed',
      'policy_review_required',
      'policy_conflict',
      'policy_unclassified',
      'policy_evaluation_pending',
    ] as const
    const copy = reasons
      .map((reason) =>
        reasonText(
          reason,
          { reason_count: 3, new_count: 2, disappeared_count: 1, failed_count: 3 },
          (key, values) => translate('en', key, values),
        ),
      )
      .join(' ')
    expect(copy).not.toMatch(/vulnerability|incident|security risk|deleted|\bAI\b/i)
    expect(copy).toContain('no longer observed')
  })

  it('describes restart-loop attention as a bounded derived finding', () => {
    const copy = reasonText(
      'container_restart_loop_observed',
      {
        reason_count: 1,
        restart_loop: {
          projection_version: 1,
          threshold: 3,
          observed_restart_count: 4,
          window_started_at: '2026-08-23T09:50:00Z',
          window_ended_at: '2026-08-23T10:00:00Z',
          container_name: 'api',
        },
      },
      (key, values) => translate('en', key, values),
    )
    expect(copy).toBe('api restarted 4 times in the bounded investigation window.')
    expect(copy).not.toMatch(/OOM|cause|severity|incident/i)
  })

  it('renders populated Organization triage, hostile text inertly, and Russian copy', async () => {
    const get = vi.fn().mockResolvedValue(populatedOrganizationAttentionFixture)
    renderWithProviders(
      <OrganizationAttention organization={organization} window="24h" onWindow={() => undefined} />,
      get,
      'ru',
    )
    expect(await screen.findByRole('heading', { name: 'Требует внимания' })).toBeVisible()
    expect(screen.getAllByText('Commerce <script>alert(1)</script>').length).toBeGreaterThan(0)
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Приоритетная очередь' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Рекомендации для разбора' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Приложения с изменениями' }),
    ).not.toBeInTheDocument()
    const groupLabel = await screen.findByText('Запуск процесса')
    expect(groupLabel).toBeVisible()
    expect(groupLabel).toHaveClass('text-emerald-200')
    expect(groupLabel.closest('p')).toHaveClass('text-cyan-200')
    expect(groupLabel.closest('strong')).not.toHaveClass('rounded-full', 'border-cyan-700')
    expect(screen.getByText('checkout')).toHaveClass('text-violet-200')
    expect(groupLabel.closest('strong')).toHaveTextContent('Запуск процесса [checkout]')
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('renders all-clear without empty warning panels', async () => {
    renderWithProviders(
      <OrganizationAttention organization={organization} window="24h" onWindow={() => undefined} />,
      vi.fn().mockResolvedValue(allClearOrganizationAttentionFixture),
    )
    expect(await screen.findByRole('heading', { name: 'Nothing requires attention' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Priority queue' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Browse Projects' }).length).toBeGreaterThan(0)
  })

  it('isolates initial failure and retries', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(allClearOrganizationAttentionFixture)
    renderWithProviders(
      <OrganizationAttention organization={organization} window="24h" onWindow={() => undefined} />,
      get,
    )
    expect(
      await screen.findByRole('heading', { name: 'Attention summary could not be loaded' }),
    ).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Nothing requires attention' })).toBeVisible()
  })

  it('retains the last Organization snapshot after refresh failure', async () => {
    let attentionRequests = 0
    const get = vi.fn(() => {
      attentionRequests += 1
      return attentionRequests === 1
        ? Promise.resolve(populatedOrganizationAttentionFixture)
        : Promise.reject(new Error('refresh'))
    }) as unknown as ApiClient['get']
    const { queryClient } = renderWithProviders(
      <OrganizationAttention organization={organization} window="24h" onWindow={() => undefined} />,
      get,
    )
    expect(await screen.findByRole('heading', { name: 'Recommendations to review' })).toBeVisible()
    await queryClient.invalidateQueries({ queryKey: ['organization', 'attention'] })
    await waitFor(() => expect(attentionRequests).toBe(2))
    expect(screen.getByText('The last snapshot is shown because refresh failed.')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Recommendations to review' })).toBeVisible()
  })

  it('shows Application recommendations and unavailable comparison truthfully', async () => {
    renderWithProviders(
      <ApplicationAttention
        projectId={populatedApplicationAttentionFixture.project.id}
        applicationId={populatedApplicationAttentionFixture.application.id}
        section="recommendations"
      />,
      vi.fn().mockResolvedValue(unavailableApplicationAttentionFixture),
    )
    expect(await screen.findByRole('heading', { name: 'Requires attention' })).toBeVisible()
    expect(screen.getByText('No recommended action for this snapshot.')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Priority queue' })).not.toBeInTheDocument()
    expect(
      screen.queryByText('No comparable release snapshot is available.'),
    ).not.toBeInTheDocument()
  })

  it('shows a restart-loop card in Observed actions and links to its investigation', async () => {
    renderWithProviders(
      <ApplicationAttention
        projectId={populatedApplicationAttentionFixture.project.id}
        applicationId={populatedApplicationAttentionFixture.application.id}
        section="overview"
      />,
      vi.fn().mockResolvedValue(populatedApplicationAttentionFixture),
    )
    const observed = await screen.findByRole('heading', { name: 'Observed actions' })
    expect(screen.queryByRole('heading', { name: 'Recommendations to review' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Priority queue' })).toBeNull()
    expect(observed).toHaveClass('text-2xl')
    const card = screen.getByRole('link', {
      name: /Restart loops1Open the server-derived restart-loop investigation/,
    })
    expect(card).toHaveAttribute(
      'href',
      expect.stringContaining('40000000-0000-4000-8000-000000000009'),
    )
    expect(card).toHaveClass('border-amber-600', 'bg-amber-950/35')
  })

  it('shows backend policy totals and policy-specific recommendations without synthesis', async () => {
    const { unmount } = renderWithProviders(
      <ApplicationAttention
        projectId={policyAwareApplicationAttentionFixture.project.id}
        applicationId={policyAwareApplicationAttentionFixture.application.id}
        section="overview"
      />,
      vi.fn().mockResolvedValue(policyAwareApplicationAttentionFixture),
    )
    expect(await screen.findByRole('heading', { name: 'Policy classification' })).toBeVisible()
    expect(screen.getByText('Observed facts').parentElement).toHaveTextContent('20')
    expect(screen.getByText('Require attention').parentElement).toHaveTextContent('12')
    expect(screen.getByRole('link', { name: /Requires review: 4/ })).toHaveAttribute(
      'href',
      expect.stringMatching(
        /verdict=requires_review.*suppressed=false|suppressed=false.*verdict=requires_review/,
      ),
    )
    expect(screen.getByRole('link', { name: /Evaluation pending: 2/ })).toHaveAttribute(
      'href',
      expect.stringContaining('evaluation_pending=true'),
    )
    unmount()

    const recommendations = renderWithProviders(
      <ApplicationAttention
        projectId={policyAwareApplicationAttentionFixture.project.id}
        applicationId={policyAwareApplicationAttentionFixture.application.id}
        section="recommendations"
      />,
      vi.fn().mockResolvedValue(policyAwareApplicationAttentionFixture),
    )
    expect(await screen.findByRole('heading', { name: 'Resolve policy conflicts' })).toBeVisible()
    expect(
      screen.getAllByText('2 observations have conflicting policy results.').length,
    ).toBeGreaterThan(0)
    recommendations.unmount()

    renderWithProviders(
      <ApplicationAttention
        projectId={populatedApplicationAttentionFixture.project.id}
        applicationId={populatedApplicationAttentionFixture.application.id}
        section="overview"
      />,
      vi.fn().mockResolvedValue(populatedApplicationAttentionFixture),
    )
    expect(await screen.findByRole('heading', { name: 'Policy classification' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Resolve policy conflicts' }),
    ).not.toBeInTheDocument()
  })

  it('shows a localized empty priority panel without mounting recommendations', async () => {
    renderWithProviders(
      <ApplicationAttention
        projectId={unavailableApplicationAttentionFixture.project.id}
        applicationId={unavailableApplicationAttentionFixture.application.id}
        section="priority"
      />,
      vi.fn().mockResolvedValue(unavailableApplicationAttentionFixture),
      'ru',
    )
    expect(await screen.findByText('В этой сводке нет пунктов приоритетной очереди.')).toBeVisible()
    expect(screen.queryByText('Для этой сводки нет рекомендуемых действий.')).toBeNull()
    expect(screen.getByRole('tab', { name: 'Приоритетная очередь (0)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('renders localized resource evidence and routes its recommendation to release comparison', async () => {
    renderWithProviders(
      <ApplicationAttention
        projectId={resourceRegressionApplicationAttentionFixture.project.id}
        applicationId={resourceRegressionApplicationAttentionFixture.application.id}
        section="recommendations"
      />,
      vi.fn().mockResolvedValue(resourceRegressionApplicationAttentionFixture),
      'ru',
    )
    expect(await screen.findByText('После релиза вырос троттлинг CPU.')).toBeVisible()
    expect(screen.getByText('Периоды троттлинга CPU: 1 % → 18 %')).toBeVisible()
    expect(screen.getByText(/Корреляция не устанавливает причину/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Разобрать регрессию ресурсов' })).toHaveAttribute(
      'href',
      expect.stringContaining(
        resourceRegressionApplicationAttentionFixture.priority_items[0]!.resource.target_release_id,
      ),
    )
  })

  it('rejects mismatched Application attention ownership', async () => {
    renderWithProviders(
      <ApplicationAttention projectId="different-project" applicationId="different-application" />,
      vi.fn().mockResolvedValue(populatedApplicationAttentionFixture),
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Attention summary does not belong to this Application.',
      }),
    ).toBeVisible()
  })
})
