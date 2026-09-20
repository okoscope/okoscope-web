import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import fixture from './runtime-inventory.fixture.json'
import {
  EvidenceList,
  InboundEndpointEvidence,
  InventoryIdentity,
  InventorySummaryCards,
  inventoryKinds,
} from './components'
import {
  dnsGroupDistributionOptions,
  dnsGroupListOptions,
  dnsGroupVariantsOptions,
  expectedEvidencePath,
  inventoryEvidenceOptions,
  inventoryFacetPath,
  inventoryKeys,
  isInvalidCursorError,
} from './queries'
import {
  changeEvidence,
  changeInventoryScope,
  parseInventoryDetailSearch,
  parseInventorySearch,
  summarySearch,
} from './url-state'
import { ApiClientError, type ApiClient } from '../../shared/api/client'
import { contractFixture, type InventoryItem } from '../../shared/api/types'
import { LocalizationProvider } from '../../shared/i18n'

describe('runtime inventory URL state', () => {
  it('normalizes scope and bounds search while preserving opaque cursors', () => {
    expect(
      parseInventorySearch({
        kind: 'domain',
        namespace: ' production ',
        observed_from: 'invalid',
        search: ` ${'x'.repeat(205)} `,
        cursor: 'opaque:not-a-uuid',
      }),
    ).toEqual({
      kind: 'domain',
      namespace: 'production',
      search: 'x'.repeat(200),
      cursor: 'opaque:not-a-uuid',
    })
    expect(parseInventorySearch({ kind: 'nope' })).toEqual({ kind: 'process' })
  })

  it('resets only the affected collection or evidence cursor', () => {
    expect(
      changeInventoryScope(
        { kind: 'process', namespace: 'old', cursor: 'opaque' },
        { namespace: 'new' },
      ),
    ).toEqual({ kind: 'process', namespace: 'new' })
    expect(changeEvidence({ evidence: 'releases', cursor: 'opaque' }, 'groups')).toEqual({
      evidence: 'groups',
    })
    expect(parseInventoryDetailSearch({ evidence: 'wat', cursor: ' c ' })).toEqual({
      evidence: 'releases',
      cursor: 'c',
    })
  })

  it('keeps threads as a local view and clears it when an inventory kind is selected', () => {
    expect(parseInventorySearch({ kind: 'domain', view: 'threads' })).toEqual({
      kind: 'domain',
      view: 'threads',
    })
    expect(parseInventorySearch({ kind: 'domain', view: 'unsupported' })).toEqual({
      kind: 'domain',
    })
    expect(
      changeInventoryScope(
        { kind: 'domain', view: 'threads', observed_from: '2026-09-19T10:00:00Z' },
        { kind: 'process', view: undefined },
      ),
    ).toEqual({ kind: 'process', observed_from: '2026-09-19T10:00:00Z' })
  })

  it('removes kind and cursor from summary scope', () => {
    expect(
      summarySearch({ kind: 'syscall', namespace: 'prod', search: 'wait', cursor: 'next' }),
    ).toEqual({ namespace: 'prod', search: 'wait' })
  })
})

describe('runtime inventory query boundary', () => {
  it('uses additive DNS group routes with stable scoped filters', async () => {
    const get = vi.fn().mockResolvedValue({ items: [], next_cursor: null })
    const api = { get } as unknown as ApiClient
    const search = {
      kind: 'domain' as const,
      namespace: 'production',
      search: 'expanded.cluster.local',
      verdict: 'requires_review' as const,
      cursor: 'opaque cursor',
    }

    await dnsGroupListOptions(api, 'project /', 'application ?', search).queryFn?.({
      signal: AbortSignal.abort(),
    } as never)
    await dnsGroupDistributionOptions(api, 'project /', 'application ?', search).queryFn?.({
      signal: AbortSignal.abort(),
    } as never)
    await dnsGroupVariantsOptions(api, 'project /', 'application ?', 'group #', search).queryFn?.({
      signal: AbortSignal.abort(),
    } as never)

    expect(get.mock.calls[0]?.[0]).toContain(
      '/runtime-inventory/dns-groups?namespace=production&search=expanded.cluster.local&verdict=requires_review&cursor=opaque+cursor&limit=50',
    )
    expect(get.mock.calls[1]?.[0]).toContain(
      '/runtime-inventory/dns-groups/distribution?namespace=production&search=expanded.cluster.local&verdict=requires_review&limit=5',
    )
    expect(get.mock.calls[2]?.[0]).toContain(
      '/runtime-inventory/dns-groups/group%20%23/variants?namespace=production&verdict=requires_review&limit=50',
    )
    expect(get.mock.calls[2]?.[0]).not.toContain('search=')
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('partitions cache identity by every scope and cursor input', () => {
    const first = inventoryKeys.list('p', 'a', { kind: 'process', namespace: 'one' })
    const second = inventoryKeys.list('p', 'a', { kind: 'process', namespace: 'two' })
    expect(first).not.toEqual(second)
    expect(inventoryKeys.evidence('p', 'a', 'i', 'groups', 'one')).not.toEqual(
      inventoryKeys.evidence('p', 'a', 'i', 'groups', 'two'),
    )
    expect(inventoryKeys.evidence('p', 'a', 'i', 'groups', 'one')).not.toEqual(
      inventoryKeys.evidence('p', 'a', 'i', 'occurrences', 'one'),
    )
  })

  it('omits a requested facet own value and bounds the page', () => {
    const path = inventoryFacetPath(
      'p',
      'a',
      'namespace',
      { kind: 'domain', namespace: 'old', workload_name: 'api' },
      'pro',
      'opaque cursor',
    )
    expect(path).toContain('/facets/namespace?')
    expect(path).not.toContain('namespace=old')
    expect(path).toContain('workload_name=api')
    expect(path).toContain('facet_search=pro')
    expect(path).toContain('cursor=opaque+cursor')
    expect(path).toContain('limit=50')
  })

  it.each(['releases', 'sightings', 'groups', 'occurrences'] as const)(
    'derives the encoded %s evidence path without a response hint',
    async (evidence) => {
      const get = vi.fn().mockResolvedValue({ items: [], next_cursor: null })
      const api = { get } as unknown as ApiClient
      const options = inventoryEvidenceOptions(
        api,
        'project /',
        'application ?',
        'item #',
        evidence,
        'opaque cursor',
      )

      await options.queryFn?.({ signal: AbortSignal.abort() } as never)

      expect(get).toHaveBeenCalledWith(
        `${expectedEvidencePath('project /', 'application ?', 'item #', evidence)}?cursor=opaque+cursor&limit=50`,
        { protected: true, signal: expect.any(AbortSignal) },
      )
    },
  )

  it('recognizes only documented cursor errors', () => {
    expect(
      isInvalidCursorError(
        new ApiClientError({
          kind: 'api',
          status: 400,
          code: 'invalid_cursor',
          message: 'bad cursor',
          requestId: 'request',
        }),
      ),
    ).toBe(true)
    expect(
      isInvalidCursorError(
        new ApiClientError({
          kind: 'api',
          status: 400,
          code: 'invalid_parameter',
          message: 'bad filter',
          requestId: 'request',
        }),
      ),
    ).toBe(false)
  })
})

describe('runtime inventory safe presentation', () => {
  it('keeps inbound and outbound connections adjacent in the activity order', () => {
    expect(inventoryKinds.map(({ kind }) => kind)).toEqual([
      'process',
      'destination',
      'inbound_endpoint',
      'domain',
      'syscall',
      'file_activity',
      'lifecycle',
    ])
  })

  it('uses summary response values and a zero fallback', () => {
    const onKind = vi.fn()
    render(
      <InventorySummaryCards
        summary={{
          ...contractFixture.inventorySummary,
          kinds: contractFixture.inventorySummary.kinds,
        }}
        activeKind="process"
        onKind={onKind}
      />,
    )
    expect(screen.getByRole('button', { name: /Executable executions/ })).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: /Domains/ })).toHaveTextContent('0')
    fireEvent.click(screen.getByRole('button', { name: /System calls/ }))
    expect(onKind).toHaveBeenCalledWith('syscall')
  })

  it('accepts the inbound endpoint kind in URL state', () => {
    expect(parseInventorySearch({ kind: 'inbound_endpoint', search: '8080' })).toEqual({
      kind: 'inbound_endpoint',
      search: '8080',
    })
  })

  it('accepts lifecycle activity and renders its source-qualified identity', () => {
    expect(parseInventorySearch({ kind: 'lifecycle' })).toEqual({ kind: 'lifecycle' })
    render(
      <InventoryIdentity
        item={{
          ...contractFixture.inventoryItemDetail,
          inventory_kind: 'lifecycle',
          semantic_summary: {
            event_kind: 'container.terminated',
            evidence_source: 'kubernetes',
            container_name: 'api',
            reason: 'OOMKilled',
            exit_code: 137,
          },
        }}
      />,
    )
    expect(screen.getByText('Container terminated')).toBeVisible()
    expect(
      screen.getByLabelText(
        'Kubernetes evidence. Reported by Kubernetes or the container runtime.',
      ),
    ).toBeVisible()
    expect(screen.queryByText('Kubernetes evidence')).not.toBeInTheDocument()
  })

  it('renders the exact terminated process identity with its evidence source', () => {
    render(
      <InventoryIdentity
        item={{
          ...contractFixture.inventoryItemDetail,
          inventory_kind: 'lifecycle',
          semantic_summary: {
            event_kind: 'process.exit',
            evidence_source: 'kernel',
            classification: 'leader',
            identity: '/usr/local/bin/r-api',
            termination: { type: 'exited', status: 0 },
          },
        }}
      />,
    )

    expect(screen.getByText('Process terminated')).toBeVisible()
    expect(screen.getByText('· /usr/local/bin/r-api')).toHaveClass('break-all', 'font-mono')
    expect(screen.getByLabelText('Kernel evidence. Observed by the Linux kernel.')).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(screen.queryByText('Kernel evidence')).not.toBeInTheDocument()
  })

  it('labels historical mixed exits without asserting process-leader classification', () => {
    render(
      <InventoryIdentity
        item={{
          ...contractFixture.inventoryItemDetail,
          inventory_kind: 'lifecycle',
          semantic_summary: {
            event_kind: 'process.exit',
            evidence_source: 'kernel',
            classification: 'legacy_unclassified',
            identity: 'tokio-rt-worker',
            termination: { type: 'exited', status: 0 },
          } as unknown as typeof contractFixture.inventoryItemDetail.semantic_summary,
        }}
      />,
    )

    expect(screen.getByText('Task terminated (legacy classification)')).toBeVisible()
    expect(screen.queryByText('Process terminated')).not.toBeInTheDocument()
  })

  it('presents process creation independently from executable execution', () => {
    render(
      <InventoryIdentity
        item={{
          ...contractFixture.inventoryItemDetail,
          inventory_kind: 'lifecycle',
          semantic_summary: {
            event_kind: 'process.start',
            process_command: '/app/api',
            source: 'kernel',
            start_observed: true,
          } as unknown as typeof contractFixture.inventoryItemDetail.semantic_summary,
        }}
      />,
    )

    expect(screen.getByText('Process created')).toBeVisible()
    expect(screen.getByText('· /app/api')).toBeVisible()
    expect(screen.queryByText('Executable executed')).not.toBeInTheDocument()
  })

  it('keeps a hostile terminated process identity inert', () => {
    const identity = '<img src=x onerror=alert(1)>/very/long/process/identity'
    const { container } = render(
      <InventoryIdentity
        item={{
          ...contractFixture.inventoryItemDetail,
          inventory_kind: 'lifecycle',
          semantic_summary: {
            event_kind: 'process.exit',
            evidence_source: 'kernel',
            classification: 'leader',
            identity,
            termination: { type: 'exited', status: 0 },
          } as unknown as typeof contractFixture.inventoryItemDetail.semantic_summary,
        }}
      />,
    )

    expect(screen.getByText(`· ${identity}`)).toHaveClass('break-all')
    expect(container.querySelector('img')).toBeNull()
  })

  it('localizes the terminated process label without changing its server identity', async () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <InventoryIdentity
          item={{
            ...contractFixture.inventoryItemDetail,
            inventory_kind: 'lifecycle',
            semantic_summary: {
              event_kind: 'process.exit',
              evidence_source: 'kernel',
              classification: 'leader',
              identity: '/usr/local/bin/r-api',
              termination: { type: 'exited', status: 0 },
            } as unknown as typeof contractFixture.inventoryItemDetail.semantic_summary,
          }}
        />
      </LocalizationProvider>,
    )

    expect(await screen.findByText('Процесс завершён')).toBeVisible()
    expect(screen.getByText(/\/usr\/local\/bin\/r-api/)).toBeVisible()
    expect(screen.queryByText('Данные ядра')).not.toBeInTheDocument()
    expect(screen.getByRole('tooltip', { name: 'Linux kernel' })).toBeInTheDocument()
  })

  it('accepts file activity search and operation filters', () => {
    expect(
      parseInventorySearch({ kind: 'file_activity', operation: 'rename', search: '/next' }),
    ).toEqual({
      kind: 'file_activity',
      operation: 'rename',
      search: '/next',
    })
    expect(parseInventorySearch({ kind: 'file_activity', operation: 'unknown' })).toEqual({
      kind: 'file_activity',
    })
    expect(
      changeInventoryScope({ kind: 'file_activity', operation: 'modify' }, { kind: 'process' }),
    ).toEqual({ kind: 'process' })
  })

  it.each(['create', 'modify', 'delete'] as const)(
    'renders file %s inventory identity',
    (operation) => {
      const path = `/tmp/${operation}-<script>.txt`
      const { container } = render(
        <InventoryIdentity
          item={{
            ...contractFixture.inventoryItemDetail,
            inventory_kind: 'file_activity',
            semantic_summary: { operation, path },
          }}
        />,
      )
      expect(
        screen.getByLabelText(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))),
      ).toBeVisible()
      expect(container.querySelector('script')).toBeNull()
    },
  )

  it.each([
    [
      'destination',
      { address_family: 'ipv4', destination_address: '10.0.0.8', destination_port: 5432 },
      '10.0.0.8:5432 (ipv4)',
    ],
    ['domain', { name: 'db.example.test', query_type: 'A' }, 'db.example.test (A)'],
    ['syscall', { syscall: 'epoll_wait' }, 'epoll_wait'],
    ['file_activity', { operation: 'modify', path: '/tmp/data' }, /\/tmp\/data/],
  ] as const)(
    'renders an application-scoped %s identity without a process command',
    (kind, value, title) => {
      render(
        <InventoryIdentity
          item={
            {
              ...contractFixture.inventoryItemDetail,
              inventory_kind: kind,
              semantic_summary: value,
            } satisfies InventoryItem
          }
        />,
      )
      expect(screen.getByText(title)).toBeVisible()
      expect(screen.queryByText(/actix-rt|worker/)).not.toBeInTheDocument()
    },
  )

  it('shows the localized process command in accessible raw occurrence details', () => {
    render(
      <LocalizationProvider initialLocale="ru">
        <EvidenceList kind="occurrences" page={contractFixture.inventoryOccurrencePage} />
      </LocalizationProvider>,
    )
    const details = screen.getByLabelText('Данные наблюдений')
    expect(details).toHaveTextContent('Команда процесса')
    expect(details).toHaveTextContent('/app/payments')
  })

  it.each([
    [false, false, 0],
    [true, false, 1],
    [false, true, 1],
    [true, true, 2],
  ] as const)('renders independent inbound evidence %s/%s', (listener, accept, count) => {
    render(
      <InboundEndpointEvidence value={{ listener_observed: listener, accept_observed: accept }} />,
    )
    expect(screen.queryAllByText(/observed/i)).toHaveLength(count)
    if (count === 0) expect(screen.getByText('No positive endpoint evidence')).toBeVisible()
  })

  it('renders inbound identity without contributing client or deployment data', () => {
    render(
      <InventoryIdentity
        item={{
          ...contractFixture.inventoryItemDetail,
          inventory_kind: 'inbound_endpoint',
          semantic_summary: contractFixture.inboundInventoryEvidence[3]!,
        }}
      />,
    )
    expect(screen.getByText('[::]:8080')).toBeVisible()
    expect(screen.getByText('Port observed listening')).toBeVisible()
    expect(screen.getByText('Accepted connections observed')).toBeVisible()
    expect(screen.queryByText(/remote|client|workload/i)).not.toBeInTheDocument()
  })

  it('renders the prepared unsafe identity as inert text', () => {
    render(
      <InventoryIdentity
        item={{
          ...contractFixture.inventoryItemDetail,
          semantic_summary: fixture.unsafe_display_text.semantic_summary,
        }}
      />,
    )
    expect(screen.getByText(fixture.unsafe_display_text.semantic_summary.executable)).toBeVisible()
    expect(document.querySelector('img')).toBeNull()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('explains all release states without absence claims', () => {
    const observed = contractFixture.inventoryReleasePage.items[0]!
    render(
      <EvidenceList
        kind="releases"
        page={{
          coverage: { closed_before: null, history_expired_before: null, detail_scope: 'raw' },
          items: [
            observed,
            {
              ...observed,
              release_id: '40000000-0000-4000-8000-000000000002',
              version: '2.13.0',
              release_display_name: 'payments · 2 images · bbbbbbbb',
              presence: 'not_observed',
              occurrence_count: null,
              first_seen_at: null,
              last_seen_at: null,
              release_evidence_count: 48,
            },
            {
              ...observed,
              release_id: '40000000-0000-4000-8000-000000000003',
              version: '2.12.0',
              release_display_name: 'payments · 2 images · cccccccc',
              presence: 'unknown',
              occurrence_count: null,
              first_seen_at: null,
              last_seen_at: null,
              release_evidence_count: 0,
            },
          ],
          next_cursor: null,
        }}
      />,
    )
    expect(screen.getByText('Observed')).toBeVisible()
    expect(screen.getByText(observed.release_display_name)).toBeVisible()
    expect(screen.queryByText(`Release ${observed.version}`)).not.toBeInTheDocument()
    expect(screen.getByText('Not observed in available evidence')).toBeVisible()
    expect(screen.getByText('Unknown')).toBeVisible()
    expect(screen.getByText('55')).toBeVisible()
    expect(screen.queryByText(/absent|removed|safe/i)).not.toBeInTheDocument()
  })
})
