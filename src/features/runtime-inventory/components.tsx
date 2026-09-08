import { Link } from '@tanstack/react-router'
import type { ChangeEvent } from 'react'
import { formatCount, formatTimestamp } from '../tenant/format'
import {
  EndpointValue,
  EvidenceSourceBadge,
  FileActivitySummary,
  JsonDetailsViewer,
  NetworkScopeBadge,
} from '../observability/components'
import type {
  InventoryDestinationIdentity,
  InventoryDomainIdentity,
  InventoryFacet,
  InventoryFacetPage,
  InventoryFileActivitySemanticSummary,
  InventoryGroupPage,
  InventoryInboundEndpointIdentity,
  InventoryItem,
  InventoryKind,
  InventoryLifecycleSemanticSummary,
  InventoryOccurrencePage,
  InventoryProcessIdentity,
  InventoryReleaseEvidence,
  InventoryReleasePresencePage,
  InventorySightingPage,
  InventorySummary,
  InventorySyscallIdentity,
  Release,
} from '../../shared/api/types'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import type { InventorySearch } from './url-state'
import { PolicyState } from '../policies/components'
import { getActivityPresentation, getEventKindLabel } from '../observability/presentation'

type InventorySummaryValue = InventoryItem['semantic_summary']

export const isInventoryProcess = (
  value: InventorySummaryValue,
): value is InventoryProcessIdentity =>
  'executable' in value && typeof value.executable === 'string'

export const isInventoryDestination = (
  value: InventorySummaryValue,
): value is InventoryDestinationIdentity =>
  'process_command' in value &&
  typeof value.process_command === 'string' &&
  'destination_address' in value &&
  typeof value.destination_address === 'string' &&
  'destination_port' in value &&
  typeof value.destination_port === 'number' &&
  'address_family' in value &&
  (value.address_family === 'ipv4' || value.address_family === 'ipv6')

export const isInventoryDomain = (value: InventorySummaryValue): value is InventoryDomainIdentity =>
  'process_command' in value &&
  typeof value.process_command === 'string' &&
  'name' in value &&
  typeof value.name === 'string' &&
  'query_type' in value &&
  (value.query_type === 'A' || value.query_type === 'AAAA')

export const isInventorySyscall = (
  value: InventorySummaryValue,
): value is InventorySyscallIdentity =>
  'process_command' in value &&
  typeof value.process_command === 'string' &&
  'syscall' in value &&
  typeof value.syscall === 'string'

export const isInventoryInboundEndpoint = (
  value: InventorySummaryValue,
): value is InventoryInboundEndpointIdentity =>
  'transport' in value &&
  value.transport === 'tcp' &&
  'address_family' in value &&
  (value.address_family === 'ipv4' || value.address_family === 'ipv6') &&
  'local_address' in value &&
  typeof value.local_address === 'string' &&
  'local_port' in value &&
  typeof value.local_port === 'number'

export const isInventoryFileActivity = (
  value: InventorySummaryValue,
): value is InventoryFileActivitySemanticSummary =>
  'operation' in value &&
  ['create', 'modify', 'delete', 'rename'].includes(String(value.operation)) &&
  'process_command' in value &&
  typeof value.process_command === 'string' &&
  'path' in value &&
  typeof value.path === 'string'

export const isInventoryLifecycle = (
  value: InventorySummaryValue,
): value is InventoryLifecycleSemanticSummary =>
  'event_kind' in value &&
  ['process.exit', 'container.terminated', 'container.restart', 'container.restart_loop'].includes(
    String(value.event_kind),
  ) &&
  'evidence_source' in value &&
  ['kernel', 'kubernetes', 'derived'].includes(String(value.evidence_source))

export const inventoryKinds: { kind: InventoryKind; label: string }[] = [
  { kind: 'process', label: 'Process launches' },
  { kind: 'destination', label: 'Outbound connections' },
  { kind: 'inbound_endpoint', label: 'Inbound connections' },
  { kind: 'domain', label: 'Domains' },
  { kind: 'syscall', label: 'System calls' },
  { kind: 'file_activity', label: 'File Activity' },
  { kind: 'lifecycle', label: 'Lifecycle' },
]

export function InventorySummaryCards({
  summary,
  activeKind,
  onKind,
}: {
  summary: InventorySummary
  activeKind: InventoryKind
  onKind: (kind: InventoryKind) => void
}) {
  const counts = new Map(summary.kinds.map((entry) => [entry.kind, entry]))
  return (
    <section
      aria-label="Application activity summary"
      className="grid grid-cols-2 gap-2 xl:grid-cols-4"
    >
      {inventoryKinds.map(({ kind, label }) => {
        const value = counts.get(kind)
        const copy = getActivityPresentation(kind)
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={activeKind === kind}
            onClick={() => onKind(kind)}
            className={`rounded-lg border px-3 py-2 text-left ${activeKind === kind ? 'border-cyan-300 bg-cyan-950/50' : 'border-slate-700 bg-slate-900/80'}`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-semibold">{label}</span>
              <strong className="text-lg">{formatCount(value?.item_count ?? 0)}</strong>
            </span>
            <span className="block truncate text-xs text-slate-400">
              {formatCount(value?.occurrence_count ?? 0)} {copy.countLabel}
            </span>
          </button>
        )
      })}
    </section>
  )
}

export function InventoryIdentity({ item }: { item: InventoryItem }) {
  const value = item.semantic_summary
  if (item.inventory_kind === 'process' && isInventoryProcess(value))
    return <span className="break-all font-mono">{value.executable}</span>
  if (item.inventory_kind === 'destination' && isInventoryDestination(value))
    return (
      <span className="inline-flex flex-wrap items-center gap-2 break-all font-mono">
        <span>
          {value.process_command} → {value.destination_address}:{value.destination_port} (
          {value.address_family})
        </span>
        <NetworkScopeBadge address={value.destination_address} />
      </span>
    )
  if (item.inventory_kind === 'domain' && isInventoryDomain(value))
    return (
      <span className="break-all font-mono">
        {value.process_command} → {value.name} ({value.query_type})
      </span>
    )
  if (item.inventory_kind === 'syscall' && isInventorySyscall(value))
    return (
      <span className="break-all font-mono">
        {value.process_command} → {value.syscall}
      </span>
    )
  if (item.inventory_kind === 'inbound_endpoint' && isInventoryInboundEndpoint(value))
    return (
      <span className="inline-flex min-w-0 flex-col gap-2">
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{value.transport.toUpperCase()}</span>
          <span>{value.address_family === 'ipv4' ? 'IPv4' : 'IPv6'}</span>
          <EndpointValue
            addressFamily={value.address_family}
            address={value.local_address}
            port={value.local_port}
          />
        </span>
        <InboundEndpointEvidence value={value} />
      </span>
    )
  if (item.inventory_kind === 'file_activity' && isInventoryFileActivity(value))
    return <FileActivitySummary value={value} />
  if (item.inventory_kind === 'lifecycle' && isInventoryLifecycle(value))
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>{getEventKindLabel(value.event_kind ?? 'lifecycle')}</span>
        <EvidenceSourceBadge source={value.evidence_source} />
      </span>
    )
  return <span className="text-rose-200">Unsupported identity</span>
}

export function InboundEndpointEvidence({ value }: { value: Record<string, unknown> }) {
  const listener = value.listener_observed
  const accept = value.accept_observed
  if (typeof listener !== 'boolean' || typeof accept !== 'boolean')
    return <span className="text-sm text-slate-400">Endpoint evidence unavailable</span>
  if (!listener && !accept)
    return <span className="text-sm text-slate-400">No positive endpoint evidence</span>
  return (
    <span className="flex flex-wrap gap-2 text-sm">
      {listener && (
        <span className="rounded-full border border-emerald-700 px-2 py-0.5 text-emerald-200">
          Port observed listening
        </span>
      )}
      {accept && (
        <span className="rounded-full border border-violet-700 px-2 py-0.5 text-violet-200">
          Accepted connections observed
        </span>
      )}
    </span>
  )
}

export function InventoryList({
  items,
  projectId,
  applicationId,
  view = 'list',
}: {
  items: InventoryItem[]
  projectId: string
  applicationId: string
  view?: 'grid' | 'list'
}) {
  return (
    <div data-view={view} className={view === 'grid' ? 'grid gap-5 lg:grid-cols-2' : 'space-y-5'}>
      {items.map((item) => (
        <Card
          key={item.id}
          className={`inventory-item-card ${view === 'grid' ? 'inventory-item-card-grid' : ''}`}
        >
          <div
            className={`items-start justify-between gap-4 ${
              view === 'grid' ? 'grid w-full grid-cols-[minmax(0,1fr)_auto]' : 'flex flex-wrap'
            }`}
          >
            <div className="min-w-0">
              <p className="eyebrow">
                {getActivityPresentation(item.inventory_kind).behaviorLabel}
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                <InventoryIdentity item={item} />
              </h2>
            </div>
            <Button
              asChild
              variant="outline"
              className={view === 'grid' ? 'whitespace-nowrap' : undefined}
            >
              <Link
                to="/projects/$projectId/applications/$applicationId/runtime-inventory/$itemId"
                params={{ projectId, applicationId, itemId: item.id }}
                search={{ evidence: 'releases' }}
              >
                Observation history
              </Link>
            </Button>
          </div>
          <dl className="details mt-6 text-sm">
            <dt>First observed</dt>
            <dd>{formatTimestamp(item.first_seen_at)}</dd>
            <dt>Last observed</dt>
            <dd>{formatTimestamp(item.last_seen_at)}</dd>
            <dt>{getActivityPresentation(item.inventory_kind).countLabel}</dt>
            <dd>{formatCount(item.occurrence_count)}</dd>
          </dl>
          <div
            className={`inventory-item-metrics mt-6 grid border-t pt-4 text-sm ${
              view === 'grid' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-4 sm:grid-cols-7'
            }`}
          >
            {[
              ['Releases', item.release_count],
              ['Clusters', item.cluster_count],
              ['Namespaces', item.namespace_count],
              ['Workloads', item.workload_count],
              ['Pods', item.pod_count],
              ['Containers', item.container_count],
              ['Discoveries', item.group_count],
            ].map(([label, value], index) => (
              <div
                key={String(label)}
                className={`min-w-0 border-l px-3 first:border-l-0 first:pl-0 ${
                  view === 'grid'
                    ? 'nth-[5]:border-l-0 nth-[5]:pl-0 nth-[n+5]:mt-4 max-sm:odd:border-l-0 max-sm:odd:pl-0 max-sm:nth-[n+3]:mt-4'
                    : 'max-sm:nth-[5]:border-l-0 max-sm:nth-[5]:pl-0 max-sm:nth-[n+5]:mt-4'
                } ${index === 6 ? 'text-cyan-300' : ''}`}
              >
                <strong className="block text-lg leading-none text-slate-100">
                  {formatCount(Number(value))}
                </strong>
                <span className="mt-1.5 block truncate text-xs leading-tight text-slate-400">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export const facetDefinitions: {
  facet: InventoryFacet
  field: keyof InventorySearch
  label: string
}[] = [
  { facet: 'cluster', field: 'cluster_id', label: 'Cluster' },
  { facet: 'namespace', field: 'namespace', label: 'Namespace' },
  { facet: 'workload_kind', field: 'workload_kind', label: 'Workload kind' },
  { facet: 'workload_name', field: 'workload_name', label: 'Workload name' },
  { facet: 'container_name', field: 'container_name', label: 'Container' },
]

export function FacetInput({
  label,
  field,
  value,
  page,
  onChange,
  onNext,
  onSearch,
}: {
  label: string
  field: string
  value?: string | undefined
  page?: InventoryFacetPage | undefined
  onChange: (value?: string) => void
  onNext?: ((cursor: string) => void) | undefined
  onSearch?: ((value?: string) => void) | undefined
}) {
  const listId = `inventory-${field}-options`
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-300">{label}</span>
      <input
        className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
        list={listId}
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value || undefined
          onSearch?.(next)
          onChange(next)
        }}
        autoComplete="off"
      />
      <datalist id={listId}>
        {page?.items.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      {page?.next_cursor && onNext && (
        <Button
          type="button"
          className="mt-2"
          variant="ghost"
          onClick={() => page.next_cursor && onNext(page.next_cursor)}
        >
          More {label.toLowerCase()} options
        </Button>
      )}
    </label>
  )
}

export function InventoryFilterFields({
  search,
  releases,
  facets,
  onField,
  onFacetNext,
  onFacetSearch,
}: {
  search: InventorySearch
  releases: Release[]
  facets: Record<InventoryFacet, InventoryFacetPage | undefined>
  onField: (field: keyof InventorySearch, value?: string) => void
  onFacetNext?: ((facet: InventoryFacet, cursor: string) => void) | undefined
  onFacetSearch?: ((facet: InventoryFacet, value?: string) => void) | undefined
}) {
  const change =
    (field: keyof InventorySearch) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onField(field, event.target.value || undefined)
  return (
    <Card>
      <details>
        <summary className="cursor-pointer text-lg font-semibold text-slate-200 marker:text-cyan-300">
          Advanced filters
        </summary>
        <p className="mt-2 text-sm text-slate-400">
          Narrow results by release, Kubernetes location, or observation time.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {search.kind === 'file_activity' && (
            <label className="text-sm">
              <span className="mb-1 block text-slate-300">Operation</span>
              <select
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
                value={search.operation ?? ''}
                onChange={change('operation')}
              >
                <option value="">All operations</option>
                <option value="create">Create</option>
                <option value="modify">Modify</option>
                <option value="delete">Delete</option>
                <option value="rename">Rename</option>
              </select>
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Release</span>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
              value={search.release_id ?? ''}
              onChange={change('release_id')}
            >
              <option value="">All releases</option>
              {releases.map((release) => (
                <option key={release.id} value={release.id}>
                  {release.display_name}
                </option>
              ))}
            </select>
          </label>
          {facetDefinitions.map(({ facet, field, label }) => (
            <FacetInput
              key={facet}
              label={label}
              field={field}
              value={typeof search[field] === 'string' ? search[field] : undefined}
              page={facets[facet]}
              onChange={(value) => onField(field, value)}
              onNext={(cursor) => onFacetNext?.(facet, cursor)}
              onSearch={(value) => onFacetSearch?.(facet, value)}
            />
          ))}
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Observed from</span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
              value={search.observed_from?.slice(0, 16) ?? ''}
              onChange={(event) =>
                onField(
                  'observed_from',
                  event.target.value ? new Date(event.target.value).toISOString() : undefined,
                )
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Observed to</span>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
              value={search.observed_to?.slice(0, 16) ?? ''}
              onChange={(event) =>
                onField(
                  'observed_to',
                  event.target.value ? new Date(event.target.value).toISOString() : undefined,
                )
              }
            />
          </label>
        </div>
      </details>
    </Card>
  )
}

const presenceCopy: Record<
  InventoryReleaseEvidence['presence'],
  { label: string; description: string; className: string }
> = {
  observed: {
    label: 'Observed',
    description: 'Trusted attributed occurrences support this relation.',
    className: 'text-emerald-200',
  },
  not_observed: {
    label: 'Not observed in available evidence',
    description: 'This item was not seen in the release’s available attributed evidence.',
    className: 'text-amber-200',
  },
  unknown: {
    label: 'Unknown',
    description: 'No trusted attributed evidence is available for evaluation.',
    className: 'text-slate-300',
  },
}

type EvidenceProps =
  | { kind: 'releases'; page: InventoryReleasePresencePage }
  | { kind: 'sightings'; page: InventorySightingPage }
  | { kind: 'groups'; page: InventoryGroupPage; projectId?: string; applicationId?: string }
  | { kind: 'occurrences'; page: InventoryOccurrencePage }

export function EvidenceList(props: EvidenceProps) {
  if (props.kind === 'releases')
    return (
      <div className="space-y-3">
        {props.page.items.map((item) => {
          const copy = presenceCopy[item.presence]
          return (
            <Card key={item.release_id}>
              <h2 className="font-semibold">{item.release_display_name}</h2>
              <p className={`mt-2 font-semibold ${copy.className}`}>{copy.label}</p>
              <p className="text-sm text-slate-400">{copy.description}</p>
              <dl className="details mt-3">
                <dt>Release evidence</dt>
                <dd>{formatCount(item.release_evidence_count)}</dd>
                <dt>Observations</dt>
                <dd>
                  {item.occurrence_count === null
                    ? 'Unavailable'
                    : formatCount(item.occurrence_count)}
                </dd>
                <dt>First observed</dt>
                <dd>{formatTimestamp(item.first_seen_at)}</dd>
                <dt>Last observed</dt>
                <dd>{formatTimestamp(item.last_seen_at)}</dd>
              </dl>
            </Card>
          )
        })}
      </div>
    )
  if (props.kind === 'sightings')
    return (
      <div className="space-y-3">
        {props.page.items.map((item) => (
          <Card key={`${item.cluster_id}:${item.pod_uid}:${item.container_name}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="break-all font-semibold">
                {item.workload_kind}/{item.workload_name}
              </h2>
              <PolicyState
                evaluation={item.policy_evaluation}
                suppression={item.active_suppression}
              />
            </div>
            <dl className="details mt-3">
              <dt>Cluster</dt>
              <dd className="break-all">{item.cluster_id}</dd>
              <dt>Namespace</dt>
              <dd className="break-all">{item.namespace}</dd>
              <dt>Pod</dt>
              <dd className="break-all">{item.pod_name}</dd>
              <dt>Container</dt>
              <dd className="break-all">{item.container_name}</dd>
              <dt>Observations</dt>
              <dd>{formatCount(item.occurrence_count)}</dd>
              <dt>Observed</dt>
              <dd>
                {formatTimestamp(item.first_seen_at)} – {formatTimestamp(item.last_seen_at)}
              </dd>
            </dl>
          </Card>
        ))}
      </div>
    )
  if (props.kind === 'groups')
    return (
      <div className="space-y-3">
        {props.page.items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="break-all font-semibold">{getEventKindLabel(item.event_kind)}</h2>
              <span className="flex items-center gap-3">
                <span>{item.status}</span>
                {props.projectId && props.applicationId && (
                  <Link
                    className="text-cyan-200 underline"
                    to="/projects/$projectId/applications/$applicationId/runtime-groups/$groupId"
                    params={{
                      projectId: props.projectId,
                      applicationId: props.applicationId,
                      groupId: item.id,
                    }}
                  >
                    View discovery
                  </Link>
                )}
              </span>
            </div>
            <dl className="details mt-3">
              <dt>Workload</dt>
              <dd className="break-all">
                {item.workload_kind}/{item.workload_name}
              </dd>
              <dt>Namespace</dt>
              <dd className="break-all">{item.namespace}</dd>
              <dt>Observations</dt>
              <dd>{formatCount(item.occurrence_count)}</dd>
              <dt>Observed</dt>
              <dd>
                {formatTimestamp(item.first_seen_at)} – {formatTimestamp(item.last_seen_at)}
              </dd>
            </dl>
          </Card>
        ))}
      </div>
    )
  return (
    <div className="space-y-3">
      {props.page.items.map((item) => (
        <Card key={item.id}>
          <h2 className="break-all font-semibold">
            {getEventKindLabel(item.event_kind)} · {formatTimestamp(item.observed_at)}
          </h2>
          <dl className="details mt-3">
            <dt>Command</dt>
            <dd className="break-all">{item.process_command}</dd>
            <dt>Node</dt>
            <dd className="break-all">{item.node_name}</dd>
            <dt>Namespace</dt>
            <dd className="break-all">{item.namespace}</dd>
            <dt>Pod</dt>
            <dd className="break-all">{item.pod_name}</dd>
            <dt>Container</dt>
            <dd className="break-all">{item.container_name}</dd>
            <dt>Release</dt>
            <dd className="break-all">{item.release_display_name}</dd>
          </dl>
          <details className="mt-4 rounded-lg border border-slate-700 p-3">
            <summary className="cursor-pointer font-semibold">Technical details</summary>
            <p className="mt-3 text-xs text-slate-400">Event kind: {item.event_kind}</p>
            <div className="mt-3">
              <JsonDetailsViewer value={item.payload} label="Observation payload" />
            </div>
          </details>
        </Card>
      ))}
    </div>
  )
}
