import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Cpu } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { formatCount, formatTimestamp } from '../tenant/format'
import {
  EndpointValue,
  EvidenceSourceBadge,
  FileActivitySummary,
  JsonDetailsViewer,
  NetworkScopeBadge,
} from '../observability/components'
import type {
  DnsLogicalGroup,
  InventoryDestinationIdentity,
  InventoryDomainIdentity,
  InventoryFacet,
  InventoryFacetPage,
  InventoryFileActivityIdentity,
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
import { useApi } from '../../shared/api/context'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import type { InventorySearch } from './url-state'
import { PolicyState } from '../policies/components'
import { getActivityPresentation, getEventKindLabel } from '../observability/presentation'
import { evidencePresentation } from '../observability/presentation'
import {
  BehaviorUserLabels,
  InventoryUserLabelEditor,
  InventoryUserLabelHeading,
} from './user-label'
import { dnsGroupVariantsOptions } from './queries'

function KubernetesSourceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none">
      <circle cx="12" cy="12" r="6.3" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.1" stroke="currentColor" strokeWidth="1.7" />
      {Array.from({ length: 7 }, (_, index) => {
        const angle = (index * 360) / 7 - 90
        return (
          <g key={index} transform={`rotate(${angle} 12 12)`}>
            <path d="M12 5.7V2.4" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M10.65 3.15 12 1.8l1.35 1.35"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      })}
    </svg>
  )
}

export function LifecycleSourceIcon({
  source,
  focusable = false,
}: {
  source: 'kernel' | 'kubernetes'
  focusable?: boolean
}) {
  const copy = evidencePresentation[source]
  const label = source === 'kernel' ? 'Linux kernel' : 'Kubernetes'
  return (
    <span
      aria-label={`${copy.label}. ${copy.description}`}
      className="group/source relative inline-flex text-cyan-300"
      tabIndex={focusable ? 0 : undefined}
    >
      {source === 'kernel' ? (
        <Cpu aria-hidden="true" className="size-4" strokeWidth={1.7} />
      ) : (
        <KubernetesSourceIcon />
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-cyan-700/70 bg-slate-950 px-2 py-1 font-sans text-xs font-medium text-cyan-100 opacity-0 shadow-lg transition-opacity group-hover/source:opacity-100 group-focus-visible/source:opacity-100 group-focus-visible/bar:opacity-100 motion-reduce:transition-none"
      >
        {label}
      </span>
    </span>
  )
}

type InventorySummaryValue = InventoryItem['semantic_summary']

export const isInventoryProcess = (
  value: InventorySummaryValue,
): value is InventoryProcessIdentity =>
  'executable' in value && typeof value.executable === 'string'

export const isInventoryDestination = (
  value: InventorySummaryValue,
): value is InventoryDestinationIdentity =>
  'destination_address' in value &&
  typeof value.destination_address === 'string' &&
  'destination_port' in value &&
  typeof value.destination_port === 'number' &&
  'address_family' in value &&
  (value.address_family === 'ipv4' || value.address_family === 'ipv6')

export const isInventoryDomain = (value: InventorySummaryValue): value is InventoryDomainIdentity =>
  'name' in value &&
  typeof value.name === 'string' &&
  'query_type' in value &&
  (value.query_type === 'A' || value.query_type === 'AAAA')

export const isInventorySyscall = (
  value: InventorySummaryValue,
): value is InventorySyscallIdentity => 'syscall' in value && typeof value.syscall === 'string'

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
): value is InventoryFileActivityIdentity =>
  'operation' in value &&
  ['create', 'modify', 'delete', 'rename'].includes(String(value.operation)) &&
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

export const inventoryLifecycleIdentityText = (value: InventoryLifecycleSemanticSummary) => {
  const eventLabel = getEventKindLabel(value.event_kind ?? 'lifecycle')
  return value.event_kind === 'process.exit' ? `${eventLabel} · ${value.identity}` : eventLabel
}

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
          {value.destination_address}:{value.destination_port} ({value.address_family})
        </span>
        <NetworkScopeBadge address={value.destination_address} />
      </span>
    )
  if (item.inventory_kind === 'domain' && isInventoryDomain(value))
    return (
      <span className="break-all font-mono">
        {value.name} ({value.query_type})
      </span>
    )
  if (item.inventory_kind === 'syscall' && isInventorySyscall(value))
    return <span className="break-all font-mono">{value.syscall}</span>
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
        {value.event_kind === 'process.exit' && (
          <span className="break-all font-mono">· {value.identity}</span>
        )}
        {value.evidence_source === 'kernel' || value.evidence_source === 'kubernetes' ? (
          <LifecycleSourceIcon source={value.evidence_source} focusable />
        ) : (
          <EvidenceSourceBadge source={value.evidence_source} />
        )}
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
              <InventoryUserLabelHeading
                as="h2"
                item={item}
                technicalIdentity={<InventoryIdentity item={item} />}
                headingClassName="mt-2 text-lg font-semibold"
              />
              <InventoryUserLabelEditor
                projectId={projectId}
                applicationId={applicationId}
                itemId={item.id}
                userLabel={item.user_label}
              />
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

function DnsVariantList({
  group,
  projectId,
  applicationId,
  search,
}: {
  group: DnsLogicalGroup
  projectId: string
  applicationId: string
  search: InventorySearch
}) {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState<string>()
  const variants = useQuery({
    ...dnsGroupVariantsOptions(api, projectId, applicationId, group.group_token, search, cursor),
    enabled: open,
  })
  return (
    <details
      className="mt-5 border-t border-slate-700 pt-4"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-medium text-cyan-200">
        DNS resolution variants ({formatCount(group.variant_count)})
      </summary>
      {open && variants.isPending ? (
        <p className="mt-3 text-sm text-slate-400">Loading DNS resolution variants…</p>
      ) : variants.isError ? (
        <div className="mt-3" role="alert">
          <p className="text-sm text-rose-200">Could not load DNS resolution variants.</p>
          <Button className="mt-2" variant="outline" onClick={() => void variants.refetch()}>
            Retry
          </Button>
        </div>
      ) : variants.data?.items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          No exact DNS evidence remains in the selected scope.
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-slate-800" aria-label="Exact DNS resolution variants">
            {variants.data?.items.map((variant) => (
              <li
                key={variant.item_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span className="min-w-0">
                  <span className="block break-all font-mono">
                    {variant.name} ({variant.query_type})
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatCount(variant.observation_count)} DNS observations
                  </span>
                </span>
                <Button asChild variant="outline">
                  <Link
                    to="/projects/$projectId/applications/$applicationId/runtime-inventory/$itemId"
                    params={{ projectId, applicationId, itemId: variant.item_id }}
                    search={{ evidence: 'releases' }}
                  >
                    Observation history
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
          {variants.data?.next_cursor && (
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => setCursor(variants.data?.next_cursor ?? undefined)}
            >
              Next variants
            </Button>
          )}
          {cursor && (
            <Button className="mt-3 ml-2" variant="ghost" onClick={() => setCursor(undefined)}>
              First variants
            </Button>
          )}
        </>
      )}
    </details>
  )
}

export function DnsGroupList({
  groups,
  projectId,
  applicationId,
  search,
  view = 'list',
}: {
  groups: DnsLogicalGroup[]
  projectId: string
  applicationId: string
  search: InventorySearch
  view?: 'grid' | 'list'
}) {
  return (
    <div data-view={view} className={view === 'grid' ? 'grid gap-5 lg:grid-cols-2' : 'space-y-5'}>
      {groups.map((group) => (
        <Card key={group.group_token} className="inventory-item-card">
          <p className="eyebrow">Observed DNS destination</p>
          <h2 className="mt-2 break-all font-mono text-lg font-semibold">{group.display_name}</h2>
          <p className="mt-2 break-all text-sm text-slate-400">
            Process: <span className="font-mono">{group.process_command}</span>
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Query types: {group.query_types.join(', ')} ·{' '}
            {`${formatCount(group.variant_count)} DNS resolution variants`}
          </p>
          {group.grouping_reason === 'kubernetes_search_expansion' && (
            <p className="mt-2 rounded-md border border-cyan-800/70 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100">
              Kubernetes DNS search expansion generated resolver questions for this destination.
              Exact questions remain available below.
            </p>
          )}
          <dl className="details mt-5 text-sm">
            <dt>First observed</dt>
            <dd>{formatTimestamp(group.first_seen_at)}</dd>
            <dt>Last observed</dt>
            <dd>{formatTimestamp(group.last_seen_at)}</dd>
            <dt>DNS observations</dt>
            <dd>{formatCount(group.observation_count)}</dd>
          </dl>
          <div className="inventory-item-metrics mt-5 grid grid-cols-3 border-t pt-4 text-sm sm:grid-cols-6">
            {[
              ['Releases', group.release_count],
              ['Clusters', group.cluster_count],
              ['Namespaces', group.namespace_count],
              ['Workloads', group.workload_count],
              ['Pods', group.pod_count],
              ['Containers', group.container_count],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="min-w-0 border-l px-3 first:border-l-0 first:pl-0"
              >
                <strong className="block text-lg leading-none text-slate-100">
                  {formatCount(Number(value))}
                </strong>
                <span className="mt-1.5 block truncate text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
          <DnsVariantList
            group={group}
            projectId={projectId}
            applicationId={applicationId}
            search={search}
          />
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
              <BehaviorUserLabels
                as="h2"
                labels={item.user_labels}
                technicalTitle={getEventKindLabel(item.event_kind)}
                headingClassName="break-all font-semibold"
              />
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
          <dl className="details mt-3" aria-label="Observation details">
            <dt>Process command</dt>
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
