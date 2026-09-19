import type {
  DnsGroupDistribution,
  InventoryDistribution,
  InventoryKind,
  InventorySummary,
} from '../../shared/api/types'
import { Card } from '../../shared/ui/card'
import { HorizontalBars, type HorizontalBarItem } from '../../shared/ui/horizontal-bars'
import { formatCount } from '../tenant/format'
import { formatEndpoint, getActivityPresentation } from '../observability/presentation'
import {
  inventoryKinds,
  inventoryLifecycleEventLabel,
  inventoryLifecycleIdentityText,
  LifecycleSourceIcon,
  isInventoryDestination,
  isInventoryDomain,
  isInventoryFileActivity,
  isInventoryInboundEndpoint,
  isInventoryLifecycle,
  isInventoryProcess,
  isInventorySyscall,
} from './components'
import { useLocalization } from '../../shared/i18n'
import { legacyRussian } from '../../shared/i18n/legacy'

const byOccurrenceCountDescending = <T extends { value: number }>(items: T[]) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => right.item.value - left.item.value || left.index - right.index)
    .map(({ item }) => item)

export function inventoryIdentityText(
  kind: InventoryKind,
  value: InventoryDistribution['entries'][number]['semantic_summary'],
) {
  if (kind === 'process' && isInventoryProcess(value)) return value.executable
  if (kind === 'destination' && isInventoryDestination(value))
    return `${value.destination_address}:${value.destination_port} (${value.address_family})`
  if (kind === 'domain' && isInventoryDomain(value)) return `${value.name} (${value.query_type})`
  if (kind === 'syscall' && isInventorySyscall(value)) return value.syscall
  if (kind === 'inbound_endpoint' && isInventoryInboundEndpoint(value))
    return `${value.transport.toUpperCase()} ${value.address_family.toUpperCase()} ${formatEndpoint(value.address_family, value.local_address, value.local_port)}`
  if (kind === 'file_activity' && isInventoryFileActivity(value))
    return value.operation === 'rename' && value.new_path
      ? `rename · ${value.path} → ${value.new_path}`
      : `${value.operation} · ${value.path}`
  if (kind === 'lifecycle' && isInventoryLifecycle(value))
    return `${inventoryLifecycleIdentityText(value)} · ${value.event_kind === 'process.start' ? value.source : value.evidence_source}`
  return 'Unsupported identity'
}

export function InventoryKindDistribution({
  summary,
  activeKind,
  onKind,
  domainGroupCount,
}: {
  summary: InventorySummary
  activeKind: InventoryKind
  onKind: (kind: InventoryKind) => void
  domainGroupCount?: number | undefined
}) {
  const { locale } = useLocalization()
  const localized = (value: string) => (locale === 'ru' ? (legacyRussian[value] ?? value) : value)
  const counts = new Map(summary.kinds.map((entry) => [entry.kind, entry]))
  return (
    <Card role="region" aria-label="Application activity summary" className="h-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Observed activity</h2>
        <p className="mt-1 text-sm text-slate-400">
          Share of {formatCount(summary.occurrence_count)} matching recorded observations. Counts do
          not represent duration, traffic volume, configured intent, or risk.
        </p>
      </div>
      <dl className="mb-4 grid grid-cols-3 gap-2" aria-label="Process lifecycle summary">
        {[
          ['Processes created', summary.process_lifecycle.created],
          ['Programs executed', summary.process_lifecycle.executed],
          ['Processes terminated', summary.process_lifecycle.terminated],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-slate-700 p-2">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-1 font-semibold tabular-nums">{formatCount(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <HorizontalBars
        ariaLabel="Application activity by kind"
        total={summary.occurrence_count}
        items={byOccurrenceCountDescending(
          inventoryKinds.map(({ kind, label }) => {
            const value = counts.get(kind)
            return {
              id: kind,
              label,
              accessibleLabel: localized(label),
              value: value?.occurrence_count ?? 0,
              selected: kind === activeKind,
              meta:
                kind === 'domain'
                  ? domainGroupCount === undefined
                    ? 'Logical DNS destination count unavailable'
                    : `${formatCount(domainGroupCount)} logical DNS destinations`
                  : `${formatCount(value?.item_count ?? 0)} unique behaviors`,
              onSelect: () => onKind(kind),
            }
          }),
        )}
      />
    </Card>
  )
}

export function DnsGroupDistributionView({
  distribution,
  selectedName,
  onGroup,
}: {
  distribution: DnsGroupDistribution
  selectedName?: string | undefined
  onGroup: (name?: string) => void
}) {
  const entries: HorizontalBarItem[] = distribution.entries.map(({ group }) => ({
    id: group.group_token,
    label: <span className="break-all font-mono">{group.display_name}</span>,
    accessibleLabel: group.display_name,
    value: group.observation_count,
    selected: group.display_name === selectedName,
    meta: `${formatCount(group.variant_count)} DNS resolution variants`,
    onSelect: () => onGroup(group.display_name === selectedName ? undefined : group.display_name),
  }))
  if (distribution.other)
    entries.push({
      id: 'other',
      label: <span>Other observed DNS destinations</span>,
      accessibleLabel: 'Other observed DNS destinations',
      value: distribution.other.observation_count,
      selected: false,
      meta: `${formatCount(distribution.other.group_count)} logical DNS destinations`,
      onSelect: undefined,
    })
  return (
    <Card className="h-full">
      <h2 className="text-xl font-semibold">Most observed DNS destinations</h2>
      <p className="mt-1 text-sm text-slate-400">
        Share of {formatCount(distribution.total_observation_count)} matching recorded DNS
        observations across the complete filtered result, not only this list page.
      </p>
      <div className="mt-4">
        <HorizontalBars
          ariaLabel="Most observed DNS destinations"
          total={distribution.total_observation_count}
          items={byOccurrenceCountDescending(entries)}
        />
      </div>
    </Card>
  )
}

export function TopBehaviorDistribution({
  distribution,
  selectedToken,
  onIdentity,
}: {
  distribution: InventoryDistribution
  selectedToken?: string | undefined
  onIdentity: (token?: string) => void
}) {
  const { locale } = useLocalization()
  const localized = (value: string) => (locale === 'ru' ? (legacyRussian[value] ?? value) : value)
  const copy = getActivityPresentation(distribution.kind)
  const entries = distribution.entries.map((entry) => {
    const label = inventoryIdentityText(distribution.kind, entry.semantic_summary)
    const displayLabel = entry.user_label?.display_name
    const lifecycle =
      distribution.kind === 'lifecycle' && isInventoryLifecycle(entry.semantic_summary)
        ? entry.semantic_summary
        : undefined
    const lifecycleSource = lifecycle
      ? lifecycle.event_kind === 'process.start'
        ? lifecycle.source
        : lifecycle.evidence_source
      : undefined
    return {
      id: entry.identity_token,
      label: displayLabel ? (
        <span className="inline-flex min-w-0 flex-col">
          <span>{displayLabel}</span>
          <span className="break-all font-mono text-xs font-normal text-slate-400">{label}</span>
        </span>
      ) : lifecycle && (lifecycleSource === 'kernel' || lifecycleSource === 'kubernetes') ? (
        <span className="inline-flex min-w-0 items-center gap-2 font-mono">
          <span>{inventoryLifecycleEventLabel(lifecycle)}</span>
          {(lifecycle.event_kind === 'process.exit' ||
            lifecycle.event_kind === 'process.start') && (
            <span className="break-all">
              ·{' '}
              {lifecycle.event_kind === 'process.start'
                ? lifecycle.process_command
                : lifecycle.identity}
            </span>
          )}
          <LifecycleSourceIcon source={lifecycleSource} />
        </span>
      ) : (
        <span className="font-mono">{label}</span>
      ),
      accessibleLabel: displayLabel
        ? `${displayLabel}. ${label}`
        : lifecycle
          ? `${localized(inventoryLifecycleEventLabel(lifecycle))}${
              lifecycle.event_kind === 'process.exit'
                ? ` · ${lifecycle.identity}`
                : lifecycle.event_kind === 'process.start'
                  ? ` · ${lifecycle.process_command}`
                  : ''
            } · ${lifecycleSource}`
          : label,
      value: entry.occurrence_count,
      selected: entry.identity_token === selectedToken,
      meta: `${formatCount(entry.item_count)} unique identities`,
      onSelect: () =>
        onIdentity(entry.identity_token === selectedToken ? undefined : entry.identity_token),
    }
  })
  if (distribution.other)
    entries.push({
      id: 'other',
      label: <span>Other observed {copy.behaviorLabel.toLowerCase()}</span>,
      accessibleLabel: `Other observed ${copy.behaviorLabel.toLowerCase()}`,
      value: distribution.other.occurrence_count,
      selected: false,
      meta: `${formatCount(distribution.other.item_count)} unique identities`,
      onSelect: () => onIdentity(undefined),
    })
  const sortedEntries = byOccurrenceCountDescending(entries)
  return (
    <Card className="h-full">
      <h2 className="text-xl font-semibold">Most observed {copy.behaviorLabel.toLowerCase()}</h2>
      <p className="mt-1 text-sm text-slate-400">
        Share of {formatCount(distribution.total_occurrence_count)} matching recorded observations
        across the complete filtered result, not only this list page.
      </p>
      <div className="mt-4">
        <HorizontalBars
          ariaLabel={`Most observed ${copy.behaviorLabel.toLowerCase()}`}
          total={distribution.total_occurrence_count}
          items={sortedEntries}
        />
      </div>
    </Card>
  )
}
