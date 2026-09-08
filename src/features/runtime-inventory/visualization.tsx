import type { InventoryDistribution, InventoryKind, InventorySummary } from '../../shared/api/types'
import { Card } from '../../shared/ui/card'
import { HorizontalBars } from '../../shared/ui/horizontal-bars'
import { formatCount } from '../tenant/format'
import {
  formatEndpoint,
  getActivityPresentation,
  getEventKindLabel,
} from '../observability/presentation'
import {
  inventoryKinds,
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
    return `${value.process_command} → ${value.destination_address}:${value.destination_port} (${value.address_family})`
  if (kind === 'domain' && isInventoryDomain(value))
    return `${value.process_command} → ${value.name} (${value.query_type})`
  if (kind === 'syscall' && isInventorySyscall(value))
    return `${value.process_command} → ${value.syscall}`
  if (kind === 'inbound_endpoint' && isInventoryInboundEndpoint(value))
    return `${value.transport.toUpperCase()} ${value.address_family.toUpperCase()} ${formatEndpoint(value.address_family, value.local_address, value.local_port)}`
  if (kind === 'file_activity' && isInventoryFileActivity(value))
    return value.operation === 'rename' && value.new_path
      ? `${value.process_command} · rename · ${value.path} → ${value.new_path}`
      : `${value.process_command} · ${value.operation} · ${value.path}`
  if (kind === 'lifecycle' && isInventoryLifecycle(value))
    return `${getEventKindLabel(value.event_kind ?? 'lifecycle')} · ${value.evidence_source}`
  return 'Unsupported identity'
}

export function InventoryKindDistribution({
  summary,
  activeKind,
  onKind,
}: {
  summary: InventorySummary
  activeKind: InventoryKind
  onKind: (kind: InventoryKind) => void
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
              meta: `${formatCount(value?.item_count ?? 0)} unique behaviors`,
              onSelect: () => onKind(kind),
            }
          }),
        )}
      />
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
  const copy = getActivityPresentation(distribution.kind)
  const entries = distribution.entries.map((entry) => {
    const label = inventoryIdentityText(distribution.kind, entry.semantic_summary)
    return {
      id: entry.identity_token,
      label: <span className="font-mono">{label}</span>,
      accessibleLabel: label,
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
