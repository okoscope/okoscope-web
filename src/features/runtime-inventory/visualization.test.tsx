import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { InventoryDistribution, InventorySummary } from '../../shared/api/types'
import {
  formatPercentage,
  formatSignedCount,
  safePercentage,
} from '../../shared/ui/horizontal-bars'
import { InventoryKindDistribution, TopBehaviorDistribution } from './visualization'

const summary: InventorySummary = {
  coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
  identity_version: 1,
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
      identity_version: 1,
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
      expect.stringContaining('Process launches12'),
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
      identity_version: 1,
      kind: 'process',
      total_item_count: 4,
      total_occurrence_count: 30,
      entries: [
        {
          identity_token: 'low',
          semantic_summary: { executable: 'low' },
          item_count: 1,
          occurrence_count: 5,
        },
        {
          identity_token: 'high',
          semantic_summary: { executable: 'high' },
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
      expect.stringContaining('Other observed process launch5'),
    ])
  })

  it('renders hostile typed identities as inert text and exposes other', async () => {
    const onIdentity = vi.fn()
    const user = userEvent.setup()
    const distribution: InventoryDistribution = {
      coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
      identity_version: 1,
      kind: 'process',
      total_item_count: 3,
      total_occurrence_count: 10,
      entries: [
        {
          identity_token: 'opaque',
          semantic_summary: { executable: '<img src=x onerror=alert(1)>' },
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
    expect(screen.getByText(/Other observed process launch/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /<img src=x onerror=alert\(1\)>/ }))
    expect(onIdentity).toHaveBeenCalledWith('opaque')
  })
})
