import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  JsonDetailsViewer,
  RuntimeDiffClassificationBadge,
  RuntimeGroupStatusBadge,
  NotificationSummary,
  OccurrenceTimeline,
  SemanticSummary,
  getNotificationPresentation,
  validLifecycleActions,
  isRecentlyFirstSeen,
  getNetworkScope,
  NetworkScopeBadge,
  FileActivitySummary,
} from './components'
import {
  invalidateRuntimeGroupLifecycle,
  observabilityKeys,
  runtimeGroupOccurrencesPath,
} from './queries'
import {
  changeBaseline,
  changeRuntimeGroupFilters,
  toggleRuntimeGroupStatus,
  parseReleaseSearch,
  parseRuntimeDiffSearch,
  parseRuntimeGroupSearch,
} from './url-state'
import { formatCount } from '../tenant/format'
import {
  directionLabel,
  formatEndpoint,
  getActivityPresentation,
  getEventKindLabel,
  getWildcardEndpointLabel,
} from './presentation'

afterEach(cleanup)

describe('network destination scope', () => {
  it('formats IPv4, IPv6, and wildcard endpoints without conflating families', () => {
    expect(formatEndpoint('ipv4', '0.0.0.0', 8080)).toBe('0.0.0.0:8080')
    expect(formatEndpoint('ipv6', '::', 8080)).toBe('[::]:8080')
    expect(formatEndpoint('ipv6', '2001:db8::1', 51234)).toBe('[2001:db8::1]:51234')
    expect(getWildcardEndpointLabel('ipv4', '0.0.0.0')).toBe('All IPv4 interfaces')
    expect(getWildcardEndpointLabel('ipv6', '::')).toBe('All IPv6 interfaces')
  })

  it('labels inbound event kinds distinctly and keeps unknown fallback', () => {
    expect(getEventKindLabel('network.listen')).toBe('Opened port')
    expect(getEventKindLabel('network.accept')).toBe('Accepted inbound connection')
    expect(getEventKindLabel('future.event')).toBe('Observed activity')
  })

  it('classifies local, private, public, and unknown destinations', () => {
    expect(getNetworkScope('127.0.0.1')).toBe('local')
    expect(getNetworkScope('::1')).toBe('local')
    expect(getNetworkScope('192.168.1.5')).toBe('private')
    expect(getNetworkScope('fd00::1')).toBe('private')
    expect(getNetworkScope('8.8.8.8')).toBe('internet')
    expect(getNetworkScope('2001:4860:4860::8888')).toBe('internet')
    expect(getNetworkScope('not-an-address')).toBe('unknown')
  })

  it('explains that an internet destination is not necessarily unsafe', () => {
    render(<NetworkScopeBadge address="8.8.8.8" />)
    expect(screen.getByText('Internet')).toHaveAttribute(
      'title',
      expect.stringContaining('does not necessarily mean unsafe'),
    )
  })
})

describe('observability URL state', () => {
  it('parses, trims and rejects invalid values', () => {
    expect(
      parseRuntimeGroupSearch({
        event_kind: ' exec ',
        status: 'closed',
        since: 'nope',
        first_seen_from: '2026-08-17T00:00:00Z',
        first_seen_to: 'bad',
        last_seen_to: '2026-08-18T00:00:00Z',
        release_id: ' release ',
        cursor: '',
      }),
    ).toEqual({
      event_kind: 'exec',
      first_seen_from: '2026-08-17T00:00:00Z',
      last_seen_to: '2026-08-18T00:00:00Z',
      release_id: 'release',
    })
    for (const status of ['open', 'acknowledged', 'resolved'] as const)
      expect(parseRuntimeGroupSearch({ status })).toEqual({ status })
    expect(parseReleaseSearch({ cursor: ' next ' })).toEqual({ cursor: 'next' })
    expect(parseRuntimeDiffSearch({ baseline: 'base', cursor: 'next' })).toEqual({
      baseline: 'base',
      cursor: 'next',
    })
  })
  it('resets cursor when filters or baseline change', () => {
    expect(
      changeRuntimeGroupFilters({ namespace: 'old', cursor: 'next' }, { namespace: 'new' }),
    ).toEqual({ namespace: 'new' })
    expect(toggleRuntimeGroupStatus({ namespace: 'n', cursor: 'next' }, 'open')).toEqual({
      namespace: 'n',
      status: 'open',
    })
    expect(toggleRuntimeGroupStatus({ namespace: 'n', status: 'open' }, 'open')).toEqual({
      namespace: 'n',
    })
    expect(changeBaseline({ baseline: 'old', cursor: 'next' }, 'new')).toEqual({ baseline: 'new' })
  })
  it('preserves filters on cursor navigation', () =>
    expect({ ...parseRuntimeGroupSearch({ namespace: 'prod' }), cursor: 'next' }).toEqual({
      namespace: 'prod',
      cursor: 'next',
    }))
})

describe('inbound network privacy', () => {
  it('renders a safe inbound group summary using only the local endpoint', () => {
    render(
      <SemanticSummary
        value={{
          process_command: 'payments',
          transport: 'tcp',
          address_family: 'ipv4',
          local_address: '0.0.0.0',
          local_port: 8080,
        }}
      />,
    )
    expect(screen.getByText('0.0.0.0:8080')).toBeVisible()
    expect(screen.getByText('All IPv4 interfaces')).toBeVisible()
    expect(screen.queryByText(/remote|51234|203\.0\.113\.9/i)).not.toBeInTheDocument()
  })

  it('uses a neutral fallback for future release classifications', () => {
    render(<RuntimeDiffClassificationBadge classification="future" />)
    expect(screen.getByText('Unknown')).toBeVisible()
  })

  it('keeps the remote endpoint inside expanded accept technical details', async () => {
    const remote = '2001:db8::feed'
    render(
      <OccurrenceTimeline
        occurrences={[
          {
            id: 'accept',
            event_id: 'event-accept',
            observed_at: '2026-08-21T10:00:00Z',
            received_at: '2026-08-21T10:00:01Z',
            correlation: { status: 'absent', candidate_count: 0, related_event_ids: [] },
            related_evidence: [],
            node_name: 'node',
            namespace: 'prod',
            pod_name: 'api-1',
            container_name: 'api',
            process_command: '<img src=x onerror=alert(1)>',
            event_kind: 'network.accept',
            payload: {
              type: 'NetworkAccept',
              data: {
                transport: 'tcp',
                address_family: 'ipv6',
                local_address: '::',
                local_port: 8080,
                remote_address: remote,
                remote_port: 51234,
              },
            },
            release_id: null,
            release_version: null,
            release_display_name: 'Unattributed',
          },
        ]}
      />,
    )
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
    const details = screen.getByText('Technical details').closest('details')
    expect(details).not.toHaveAttribute('open')
    await userEvent.click(screen.getByText('Technical details'))
    expect(screen.getByText(`[${remote}]:51234`)).toBeVisible()
    expect(screen.getByText('[::]:8080')).toBeVisible()
  })
})

describe('observability query keys', () => {
  it('are canonical and include every server input', () => {
    expect(observabilityKeys.runtimeGroups('p', 'a', { namespace: 'n', event_kind: 'e' })).toEqual(
      observabilityKeys.runtimeGroups('p', 'a', { event_kind: 'e', namespace: 'n' }),
    )
    expect(observabilityKeys.runtimeGroups('p', 'a', { namespace: 'n' })).not.toEqual(
      observabilityKeys.runtimeGroups('p', 'a', { namespace: 'other' }),
    )
    expect(observabilityKeys.runtimeGroup('p', 'a', 'g')).not.toEqual(
      observabilityKeys.runtimeGroup('p', 'a', 'g2'),
    )
    expect(observabilityKeys.occurrences('p', 'a', 'g', 'one')).not.toEqual(
      observabilityKeys.occurrences('p', 'a', 'g', 'two'),
    )
    expect(observabilityKeys.releases('p', 'a', { cursor: 'one' })).not.toEqual(
      observabilityKeys.releases('p', 'a', { cursor: 'two' }),
    )
    expect(
      observabilityKeys.runtimeDiff('p', 'a', 'target', { baseline: 'b', cursor: 'c' }),
    ).not.toEqual(
      observabilityKeys.runtimeDiff('p', 'a', 'target', { baseline: 'b2', cursor: 'c' }),
    )
  })
  it('builds one bounded occurrence page request', () => {
    expect(runtimeGroupOccurrencesPath('group/id', 'opaque cursor')).toBe(
      '/api/v1/runtime-groups/group%2Fid/occurrences?cursor=opaque+cursor&limit=25',
    )
  })
  it('invalidates detail and every scoped list after lifecycle updates', async () => {
    const client = new QueryClient()
    const detail = observabilityKeys.runtimeGroup('p', 'a', 'g')
    const listOne = observabilityKeys.runtimeGroups('p', 'a', { status: 'open' })
    const listTwo = observabilityKeys.runtimeGroups('p', 'a', { cursor: 'next' })
    const other = observabilityKeys.runtimeGroups('p2', 'a2', {})
    client.setQueryData(detail, {})
    client.setQueryData(listOne, {})
    client.setQueryData(listTwo, {})
    client.setQueryData(other, {})
    await invalidateRuntimeGroupLifecycle(client, 'p', 'a', 'g')
    expect(client.getQueryState(detail)?.isInvalidated).toBe(true)
    expect(client.getQueryState(listOne)?.isInvalidated).toBe(true)
    expect(client.getQueryState(listTwo)?.isInvalidated).toBe(true)
    expect(client.getQueryState(other)?.isInvalidated).toBe(false)
  })
})

describe('observability presentation', () => {
  it('renders rename replacement states, long paths, and generic copy failures', async () => {
    const longPath = `/tmp/${'very-long/'.repeat(30)}<img src=x onerror=alert(1)>`
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { container } = render(
      <>
        <FileActivitySummary
          value={{
            operation: 'rename',
            process_command: 'mv',
            path: longPath,
            new_path: '/new',
            replaced: true,
          }}
        />
        <FileActivitySummary
          value={{
            operation: 'rename',
            process_command: 'mv',
            path: '/old-2',
            new_path: '/new-2',
            replaced: false,
          }}
        />
        <FileActivitySummary
          value={{ operation: 'rename', process_command: 'mv', path: '/old-3', new_path: '/new-3' }}
        />
      </>,
    )
    expect(screen.getByText('Replaced')).toBeVisible()
    expect(screen.getByText('Not replaced')).toBeVisible()
    expect(screen.getByText('Unknown')).toBeVisible()
    expect(screen.getAllByText(/not a canonical filesystem path/)).not.toHaveLength(0)
    expect(container.querySelector('img')).toBeNull()
    await userEvent.click(screen.getAllByRole('button', { name: 'Copy Old syscall path' })[0]!)
    expect(writeText).toHaveBeenCalledWith(longPath)
    expect(screen.getByText('Could not copy path')).not.toHaveTextContent(longPath)
  })

  it('renders every file occurrence and safely falls back for an unknown kind', async () => {
    const base = {
      observed_at: '2026-08-21T10:00:00Z',
      received_at: '2026-08-21T10:00:01Z',
      correlation: { status: 'absent' as const, candidate_count: 0, related_event_ids: [] },
      related_evidence: [],
      node_name: '',
      namespace: '',
      pod_name: '',
      container_name: '',
      process_command: 'worker',
      release_id: null,
      release_version: null,
      release_display_name: 'Unattributed',
    }
    render(
      <OccurrenceTimeline
        occurrences={[
          {
            ...base,
            id: '1',
            event_id: 'e1',
            event_kind: 'file.create',
            payload: { type: 'file.create', data: { path: '/create' } },
          },
          {
            ...base,
            id: '2',
            event_id: 'e2',
            event_kind: 'file.modify',
            payload: { type: 'file.modify', data: { path: '/modify' } },
          },
          {
            ...base,
            id: '3',
            event_id: 'e3',
            event_kind: 'file.delete',
            payload: { type: 'file.delete', data: { path: '/delete' } },
          },
          {
            ...base,
            id: '4',
            event_id: 'e4',
            event_kind: 'file.rename',
            payload: { type: 'file.rename', data: { path: '/old', new_path: '/new' } },
          },
          {
            ...base,
            id: '5',
            event_id: 'e5',
            event_kind: 'future.file',
            payload: { type: 'ProcessExec', data: { executable: '/safe', parent_command: null } },
          },
        ]}
      />,
    )
    for (const summary of screen.getAllByText('Technical details')) await userEvent.click(summary)
    for (const operation of ['create', 'modify', 'delete', 'rename'])
      expect(screen.getByText(operation)).toBeVisible()
    expect(screen.getAllByText('Unknown')).not.toHaveLength(0)
    expect(screen.getByText(/fixed five-second windows/)).toBeVisible()
    expect(screen.getByText('Observed activity')).toBeVisible()
  })
  it('maps API kinds to user-facing activity vocabulary with safe fallbacks', () => {
    expect(getActivityPresentation('process').countLabel).toBe('launches')
    expect(getActivityPresentation('process').behaviorLabel).toBe('Process launch')
    expect(getActivityPresentation('destination').itemLabel).toBe('Outbound connections')
    expect(getActivityPresentation('destination').behaviorLabel).toBe('Outbound connection')
    expect(getActivityPresentation('domain').behaviorLabel).toBe('DNS request')
    expect(getEventKindLabel('NetworkConnect')).toBe('Outbound connection')
    expect(getEventKindLabel('future-kind')).toBe('Observed activity')
    expect(directionLabel('egress')).toBe('Outgoing')
  })
  it('renders status and every diff label', () => {
    render(
      <>
        <RuntimeGroupStatusBadge status="open" />
        <RuntimeDiffClassificationBadge classification="new" />
        <RuntimeDiffClassificationBadge classification="disappeared" />
        <RuntimeDiffClassificationBadge classification="unchanged" />
      </>,
    )
    for (const label of ['open', 'New', 'No longer observed', 'Still observed'])
      expect(screen.getByText(label)).toBeInTheDocument()
  })
  it('uses an injectable clock for recency', () => {
    expect(isRecentlyFirstSeen('2026-08-17T00:00:00Z', Date.parse('2026-08-17T12:00:00Z'))).toBe(
      true,
    )
    expect(isRecentlyFirstSeen('2026-08-15T00:00:00Z', Date.parse('2026-08-17T12:00:00Z'))).toBe(
      false,
    )
    expect(isRecentlyFirstSeen('invalid', Date.parse('2026-08-17T12:00:00Z'))).toBe(false)
    expect(isRecentlyFirstSeen('2026-08-18T00:00:00Z', Date.parse('2026-08-17T12:00:00Z'))).toBe(
      false,
    )
  })
  it('maps lifecycle actions without exposing invalid transitions', () => {
    expect(validLifecycleActions('open')).toEqual(['acknowledge', 'resolve'])
    expect(validLifecycleActions('acknowledged')).toEqual(['resolve', 'reopen'])
    expect(validLifecycleActions('resolved')).toEqual(['reopen'])
    expect(validLifecycleActions('unknown')).toEqual([])
  })
  it('explains every notification state independently of severity', () => {
    const states = [
      'pending',
      'not_configured',
      'delivering',
      'delivered',
      'terminally_failed',
      'backfill_suppressed',
    ] as const
    for (const state of states) {
      const copy = getNotificationPresentation(state)
      expect(copy.label).toBeTruthy()
      expect(copy.description).toBeTruthy()
    }
    expect(getNotificationPresentation('pending').description).toContain('has not completed')
    expect(getNotificationPresentation('not_configured').description).toContain(
      'webhook destination',
    )
    render(
      <NotificationSummary
        notification={{
          state: 'terminally_failed',
          delivery_count: 2,
          succeeded_count: 0,
          failed_count: 2,
        }}
      />,
    )
    expect(screen.getByText('Delivery failed')).toBeInTheDocument()
    expect(screen.queryByText(/severity|risk/i)).not.toBeInTheDocument()
  })
  it('renders only notification summary fields and neutral occurrence fallbacks', () => {
    const notification = {
      state: 'delivered' as const,
      delivery_count: 1,
      succeeded_count: 1,
      failed_count: 0,
      signing_secret: 'must-not-render',
    }
    render(
      <>
        <NotificationSummary notification={notification} />
        <OccurrenceTimeline
          occurrences={[
            {
              id: 'occurrence',
              event_id: 'event',
              observed_at: '2026-08-17T12:00:00Z',
              received_at: '2026-08-17T12:00:01Z',
              correlation: { status: 'absent', candidate_count: 0, related_event_ids: [] },
              related_evidence: [],
              node_name: '',
              namespace: '',
              pod_name: '',
              container_name: '',
              process_command: '',
              event_kind: 'exec',
              payload: {
                type: 'ProcessExec',
                data: { executable: '/bin/sh', parent_command: null },
              },
              release_id: null,
              release_version: null,
              release_display_name: 'Unattributed',
            },
          ]}
        />
      </>,
    )
    expect(screen.queryByText('must-not-render')).not.toBeInTheDocument()
    expect(screen.getAllByText('Unavailable')).toHaveLength(5)
    expect(screen.getByText('Unattributed')).toBeVisible()
  })
  it('renders older occurrences when related evidence is absent', () => {
    const occurrence = {
      id: 'occurrence-without-related-evidence',
      event_id: 'event-without-related-evidence',
      observed_at: '2026-08-17T12:00:00Z',
      received_at: '2026-08-17T12:00:01Z',
      correlation: { status: 'absent', candidate_count: 0, related_event_ids: [] },
      node_name: 'node-1',
      namespace: 'production',
      pod_name: 'api-1',
      container_name: 'api',
      process_command: '/bin/api',
      event_kind: 'process.exit',
      payload: {
        type: 'ProcessExit',
        data: {
          source: 'kernel',
          raw_wait_status: 0,
          termination: { type: 'exited', status: 0 },
          correlation: { status: 'unresolved', reason: 'before_observation' },
        },
      },
      release_id: null,
      release_version: null,
      release_display_name: 'Unattributed',
    } as unknown as Parameters<typeof OccurrenceTimeline>[0]['occurrences'][number]

    render(<OccurrenceTimeline occurrences={[occurrence]} />)

    expect(screen.getByText('Process terminated')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Related evidence' })).not.toBeInTheDocument()
  })
  it('renders network destinations as inert text and explains every syscall outcome', () => {
    render(
      <>
        <SemanticSummary
          value={{
            process_command: 'curl',
            address_family: 'ipv6',
            destination_address: '2001:db8::7',
            destination_port: 443,
          }}
        />
        <OccurrenceTimeline
          occurrences={(['succeeded', 'in_progress', 'failed'] as const).map((outcome, index) => ({
            id: `occurrence-${outcome}`,
            event_id: `event-${outcome}`,
            observed_at: '2026-08-17T12:00:00Z',
            received_at: '2026-08-17T12:00:01Z',
            correlation: { status: 'absent' as const, candidate_count: 0, related_event_ids: [] },
            related_evidence: [],
            node_name: 'node-1',
            namespace: 'production',
            pod_name: 'api-1',
            container_name: 'api',
            process_command: 'curl',
            event_kind: 'network.connect',
            payload: {
              type: 'NetworkConnect',
              data: {
                address_family: index === 0 ? 'ipv4' : 'ipv6',
                destination_address: index === 0 ? '203.0.113.7' : '2001:db8::7',
                destination_port: 443,
                outcome,
                ...(outcome === 'succeeded'
                  ? {}
                  : { errno: outcome === 'in_progress' ? 115 : 111 }),
              },
            },
            release_id: null,
            release_version: null,
            release_display_name: 'Unattributed',
          }))}
        />
      </>,
    )
    expect(screen.getAllByText('2001:db8::7').length).toBeGreaterThan(0)
    expect(screen.getByText('203.0.113.7')).toBeInTheDocument()
    expect(screen.getByText('Syscall succeeded')).toBeInTheDocument()
    expect(screen.getByText(/establishment is not confirmed/)).toBeInTheDocument()
    expect(screen.getByText('Syscall failed')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /203\.0\.113\.7|2001:db8::7/ }),
    ).not.toBeInTheDocument()
    for (const forbidden of ['packet payload', 'dns_name', 'source_port', 'https://'])
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    expect(formatCount(1_234_567)).toBe('1,234,567')
    expect(screen.getAllByText('Unattributed')).toHaveLength(3)
  })
  it('renders DNS evidence as inert qualified text with ambiguity and unavailable guidance', () => {
    render(
      <>
        <SemanticSummary
          value={{
            process_command: 'curl',
            name: 'api.example.com',
            query_type: 'A',
            response_code: 'nx_domain',
            transport: 'udp',
            direction: 'ingress',
          }}
        />
        <OccurrenceTimeline
          occurrences={[
            {
              id: 'dns-response',
              event_id: 'event-dns-response',
              observed_at: '2026-08-18T10:00:00Z',
              received_at: '2026-08-18T10:00:01Z',
              correlation: { status: 'absent', candidate_count: 0, related_event_ids: [] },
              related_evidence: [],
              node_name: 'node-1',
              namespace: 'production',
              pod_name: 'api-1',
              container_name: 'api',
              process_command: 'curl',
              event_kind: 'network.dns.response',
              payload: {
                type: 'NetworkDnsResponse',
                data: {
                  transaction_id: 42,
                  direction: 'ingress',
                  transport: 'tcp',
                  resolver_address: '10.96.0.10',
                  name: 'api.example.com',
                  query_type: 'AAAA',
                  response_code: 'no_error',
                  truncated: false,
                  answers: [{ name: 'api.example.com', address: '2001:db8::7', ttl_seconds: 60 }],
                  cname_chain: [
                    { alias: 'api.example.com', canonical: 'cdn.example.com', ttl_seconds: 60 },
                  ],
                  effective_ttl_seconds: 60,
                },
              },
              release_id: null,
              release_version: null,
              release_display_name: 'Unattributed',
            },
            {
              id: 'connect',
              event_id: 'event-connect',
              observed_at: '2026-08-18T10:00:01Z',
              received_at: '2026-08-18T10:00:02Z',
              correlation: { status: 'absent', candidate_count: 0, related_event_ids: [] },
              related_evidence: [],
              node_name: 'node-1',
              namespace: 'production',
              pod_name: 'api-1',
              container_name: 'api',
              process_command: 'curl',
              event_kind: 'network.connect',
              payload: {
                type: 'NetworkConnect',
                data: {
                  address_family: 'ipv6',
                  destination_address: '2001:db8::7',
                  destination_port: 443,
                  outcome: 'succeeded',
                  dns_context: {
                    names: ['api.example.com', 'cdn.example.com'],
                    observed_at: '2026-08-18T10:00:00Z',
                    expires_at: '2026-08-18T10:01:00Z',
                    confidence: 'observed_recently',
                    ambiguous: true,
                  },
                },
              },
              release_id: null,
              release_version: null,
              release_display_name: 'Unattributed',
            },
          ]}
        />
      </>,
    )
    expect(screen.getByText('NX_DOMAIN')).toBeInTheDocument()
    expect(screen.getByText(/2001:db8::7 \(60s\)/)).toBeInTheDocument()
    expect(screen.getByText(/api.example.com → cdn.example.com/)).toBeInTheDocument()
    expect(screen.getByText(/Ambiguous: multiple names/)).toBeInTheDocument()
    expect(screen.getByText(/Cached or encrypted DNS may be unavailable/)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /api\.example\.com|cdn\.example\.com/ }),
    ).not.toBeInTheDocument()
  })
  it('renders markup literally, bounds nesting, and omits JSON copy controls', () => {
    const deep = { html: '<script>alert(1)</script>', a: { b: { c: { d: { e: { f: true } } } } } }
    const { container } = render(<JsonDetailsViewer value={deep} />)
    expect(screen.getByText('“<script>alert(1)</script>”')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('… nested value')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Copy JSON details/ })).not.toBeInTheDocument()
  })
})
