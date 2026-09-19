import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  DnsGroupDistribution,
  InventoryDistribution,
  InventoryLifecycleSemanticSummary,
  InventorySummary,
} from '../../shared/api/types'
import {
  formatPercentage,
  formatSignedCount,
  safePercentage,
} from '../../shared/ui/horizontal-bars'
import {
  DnsGroupDistributionView,
  InventoryKindDistribution,
  TopBehaviorDistribution,
} from './visualization'

const summary: InventorySummary = {
  process_lifecycle: { created: 3, executed: 12, terminated: 2 },
  coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
  identity_version: 2,
  item_count: 4,
  occurrence_count: 126,
  first_seen_at: '2026-08-17T10:00:00Z',
  last_seen_at: '2026-08-18T10:00:00Z',
  kinds: [
    { kind: 'process', item_count: 1, occurrence_count: 12 },
    { kind: 'destination', item_count: 1, occurrence_count: 24 },
    { kind: 'domain', item_count: 1, occurrence_count: 30 },
    { kind: 'syscall', item_count: 1, occurrence_count: 60 },
    { kind: 'inbound_endpoint', item_count: 1, occurrence_count: 18 },
  ],
}

describe('data visualization presentation', () => {
  it('selects a logical DNS destination, clears it on repeat, and keeps other inert', async () => {
    const onGroup = vi.fn()
    const user = userEvent.setup()
    const distribution: DnsGroupDistribution = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      total_group_count: 3,
      total_observation_count: 12,
      entries: [
        {
          group: {
            group_token: 'dns-group',
            display_name: '<html-to-pdf.rstat.svc>',
            process_command: 'dns',
            grouping_reason: 'kubernetes_search_expansion',
            confidence: 'high',
            first_seen_at: '2026-09-17T10:00:00Z',
            last_seen_at: '2026-09-18T10:00:00Z',
            observation_count: 10,
            variant_count: 3,
            query_types: ['A', 'AAAA'],
            release_count: 1,
            cluster_count: 1,
            namespace_count: 1,
            workload_count: 1,
            pod_count: 1,
            container_count: 1,
          },
        },
        {
          group: {
            group_token: 'other-dns-group',
            display_name: 's3.twcstorage.ru',
            process_command: 'dns',
            grouping_reason: 'canonical_name',
            confidence: 'high',
            first_seen_at: '2026-09-17T10:00:00Z',
            last_seen_at: '2026-09-18T10:00:00Z',
            observation_count: 5,
            variant_count: 1,
            query_types: ['A'],
            release_count: 1,
            cluster_count: 1,
            namespace_count: 1,
            workload_count: 1,
            pod_count: 1,
            container_count: 1,
          },
        },
      ],
      other: { group_count: 2, observation_count: 2 },
    }
    const { container, rerender } = render(
      <DnsGroupDistributionView distribution={distribution} onGroup={onGroup} />,
    )

    const destination = screen.getByRole('button', {
      name: /<html-to-pdf\.rstat\.svc>: 10 observations/,
    })
    expect(destination).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('html-to-pdf.rstat.svc')).toBeNull()
    await user.click(destination)
    expect(onGroup).toHaveBeenLastCalledWith('<html-to-pdf.rstat.svc>')

    rerender(
      <DnsGroupDistributionView
        distribution={distribution}
        selectedName="<html-to-pdf.rstat.svc>"
        onGroup={onGroup}
      />,
    )
    const selected = screen.getByRole('button', {
      name: /<html-to-pdf\.rstat\.svc>: 10 observations/,
    })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: /s3\.twcstorage\.ru: 5 observations/ }),
    ).toHaveAttribute('aria-pressed', 'false')
    await user.click(selected)
    expect(onGroup).toHaveBeenLastCalledWith(undefined)
    expect(screen.getByText('Other observed DNS destinations').closest('button')).toBeNull()
  })

  it('calculates safe percentages and signed counts', () => {
    expect(safePercentage(12, 126)).toBeCloseTo(9.523)
    expect(safePercentage(10, 0)).toBe(0)
    expect(safePercentage(Number.NaN, 10)).toBe(0)
    expect(formatPercentage(1, 3)).toMatch(/33[,.]3%/)
    expect(formatSignedCount(12)).toBe('+12')
    expect(formatSignedCount(-4)).toBe('-4')
  })

  it('formats inbound identities without client or deployment fields', () => {
    const distribution: InventoryDistribution = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 2,
      kind: 'inbound_endpoint',
      total_item_count: 1,
      total_occurrence_count: 18,
      entries: [
        {
          identity_token: 'inbound',
          semantic_summary: {
            transport: 'tcp',
            address_family: 'ipv6',
            local_address: '::',
            local_port: 8080,
            listener_observed: true,
            accept_observed: true,
          },
          user_label: null,
          item_count: 1,
          occurrence_count: 18,
        },
      ],
      other: null,
    }
    render(<TopBehaviorDistribution distribution={distribution} onIdentity={vi.fn()} />)
    expect(screen.getByText('TCP IPV6 [::]:8080')).toBeVisible()
    expect(screen.queryByText(/remote|client/i)).not.toBeInTheDocument()
  })

  it.each([
    {
      source: 'kernel' as const,
      eventLabel: 'Process terminated',
      tooltip: 'Linux kernel',
      accessibleSource: 'Kernel evidence. Observed by the Linux kernel.',
      iconClass: 'lucide-cpu',
      expectedSpokes: 0,
    },
    {
      source: 'kubernetes' as const,
      eventLabel: 'Container terminated',
      tooltip: 'Kubernetes',
      accessibleSource: 'Kubernetes evidence. Reported by Kubernetes or the container runtime.',
      iconClass: null,
      expectedSpokes: 7,
    },
  ])(
    'replaces the visible $source lifecycle suffix with its compact accessible icon',
    ({ source, eventLabel, tooltip, accessibleSource, iconClass, expectedSpokes }) => {
      const semanticSummary: InventoryLifecycleSemanticSummary =
        source === 'kernel'
          ? ({
              event_kind: 'process.exit',
              evidence_source: source,
              classification: 'leader',
              identity: '/app/api',
              termination: { type: 'exited', status: 0 },
            } as unknown as InventoryLifecycleSemanticSummary)
          : ({
              event_kind: 'container.terminated',
              evidence_source: source,
              container_name: 'api',
              reason: 'Completed',
              exit_code: 0,
            } as unknown as InventoryLifecycleSemanticSummary)
      const distribution: InventoryDistribution = {
        coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
        identity_version: 1,
        kind: 'lifecycle',
        total_item_count: 1,
        total_occurrence_count: 4,
        entries: [
          {
            identity_token: source,
            semantic_summary: semanticSummary,
            user_label: null,
            item_count: 1,
            occurrence_count: 4,
          },
        ],
        other: null,
      }

      const { container } = render(
        <TopBehaviorDistribution distribution={distribution} onIdentity={vi.fn()} />,
      )

      expect(screen.getByText(eventLabel)).toBeVisible()
      if (source === 'kernel') expect(screen.getByText('· /app/api')).toHaveClass('break-all')
      const sourceIcon = screen.getByLabelText(accessibleSource)
      expect(sourceIcon).toHaveClass('text-cyan-300')
      expect(sourceIcon).not.toHaveAttribute('tabindex')
      const svg = sourceIcon.querySelector('svg')
      expect(svg).toHaveClass('size-4')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      if (iconClass) expect(svg).toHaveClass(iconClass)
      expect(svg?.querySelectorAll('g')).toHaveLength(expectedSpokes)
      const sourceTooltip = screen.getByRole('tooltip', { name: tooltip })
      expect(sourceTooltip).toHaveTextContent(tooltip)
      expect(sourceTooltip).toHaveClass(
        'group-hover/source:opacity-100',
        'group-focus-visible/source:opacity-100',
        'group-focus-visible/bar:opacity-100',
      )
      const row = screen.getByRole('button', { name: new RegExp(`${source}: 4 observations`) })
      expect(row).toHaveClass('group/bar')
      expect(row.querySelector('.font-mono')?.childNodes).toHaveLength(source === 'kernel' ? 3 : 2)
      expect(container.querySelector('[data-variant]')).toBeNull()
    },
  )

  it('keeps derived and malformed lifecycle identities on the existing text fallback', () => {
    const distribution: InventoryDistribution = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 2,
      kind: 'lifecycle',
      total_item_count: 2,
      total_occurrence_count: 5,
      entries: [
        {
          identity_token: 'derived',
          semantic_summary: {
            event_kind: 'container.restart_loop',
            evidence_source: 'derived',
            projection_version: 1,
            threshold: 3,
            window_started_at: '2026-08-17T09:00:00Z',
            window_ended_at: '2026-08-17T10:00:00Z',
            observed_restart_count: 4,
            container_name: 'api',
          } as unknown as InventoryLifecycleSemanticSummary,
          user_label: null,
          item_count: 1,
          occurrence_count: 3,
        },
        {
          identity_token: 'unknown',
          semantic_summary: { executable: 'not-lifecycle' },
          user_label: null,
          item_count: 1,
          occurrence_count: 2,
        },
      ],
      other: null,
    }

    render(<TopBehaviorDistribution distribution={distribution} onIdentity={vi.fn()} />)

    expect(screen.getByText('Restart loop observed · derived')).toBeVisible()
    expect(screen.getByText('Unsupported identity')).toBeVisible()
  })

  it('shows server summary totals and supports keyboard kind selection', async () => {
    const onKind = vi.fn()
    const user = userEvent.setup()
    render(<InventoryKindDistribution summary={summary} activeKind="process" onKind={onKind} />)

    expect(screen.getByText(/Share of 126 matching recorded observations/)).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      expect.stringContaining('System calls60'),
      expect.stringContaining('Domains30'),
      expect.stringContaining('Outbound connections24'),
      expect.stringContaining('Inbound connections18'),
      expect.stringContaining('Executable executions12'),
      expect.stringContaining('File Activity0'),
      expect.stringContaining('Lifecycle0'),
    ])
    const domains = screen.getByRole('button', { name: /Domains: 30 observations/ })
    domains.focus()
    expect(domains).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onKind).toHaveBeenCalledWith('domain')
  })

  it('sorts top behaviors and other by occurrence count descending', () => {
    const distribution: InventoryDistribution = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 2,
      kind: 'process',
      total_item_count: 4,
      total_occurrence_count: 30,
      entries: [
        {
          identity_token: 'low',
          semantic_summary: { executable: 'low' },
          user_label: null,
          item_count: 1,
          occurrence_count: 5,
        },
        {
          identity_token: 'high',
          semantic_summary: { executable: 'high' },
          user_label: null,
          item_count: 1,
          occurrence_count: 20,
        },
      ],
      other: { item_count: 2, occurrence_count: 5 },
    }

    render(<TopBehaviorDistribution distribution={distribution} onIdentity={vi.fn()} />)

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('high20'),
      expect.stringContaining('low5'),
      expect.stringContaining('Other observed executable execution5'),
    ])
  })

  it('renders hostile typed identities as inert text and exposes other', async () => {
    const onIdentity = vi.fn()
    const user = userEvent.setup()
    const distribution: InventoryDistribution = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 2,
      kind: 'process',
      total_item_count: 3,
      total_occurrence_count: 10,
      entries: [
        {
          identity_token: 'opaque',
          semantic_summary: { executable: '<img src=x onerror=alert(1)>' },
          user_label: null,
          item_count: 1,
          occurrence_count: 8,
        },
      ],
      other: { item_count: 2, occurrence_count: 2 },
    }
    const { container } = render(
      <TopBehaviorDistribution distribution={distribution} onIdentity={onIdentity} />,
    )

    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText(/Other observed executable execution/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /<img src=x onerror=alert\(1\)>/ }))
    expect(onIdentity).toHaveBeenCalledWith('opaque')
  })
})
