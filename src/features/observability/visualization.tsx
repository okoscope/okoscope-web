import type { RuntimeDiffSummary } from '../../shared/api/types'
import { Card } from '../../shared/ui/card'
import { formatCount } from '../tenant/format'
import { formatSignedCount, safePercentage } from '../../shared/ui/horizontal-bars'
import { formatEndpoint, getEventKindLabel } from './presentation'

const classificationLabel = {
  new: 'New',
  disappeared: 'No longer observed',
  unchanged: 'Still observed',
  unknown: 'Unknown',
} as const

function behaviorText(entry: RuntimeDiffSummary['largest_changes'][number]) {
  const value = entry.semantic_summary
  if ('evidence_source' in value) {
    if (value.evidence_source === 'kernel' && 'termination' in value) {
      const termination = value.termination
      return termination.type === 'exited'
        ? `Process exited with status ${termination.status}`
        : `Process terminated by ${termination.signal_name} (${termination.signal})`
    }
    if (value.evidence_source === 'derived' && 'observed_restart_count' in value)
      return `${value.container_name} · ${value.observed_restart_count} restarts in bounded window`
    if ('reason' in value) return `${value.container_name} · ${String(value.reason)}`
    if ('container_name' in value) return `${String(value.container_name)} · container restart`
  }
  if ('executable' in value) return String(value.executable)
  if ('destination_address' in value)
    return `${value.process_command} → ${value.destination_address}:${value.destination_port}`
  if ('name' in value) return `${value.process_command} → ${value.name} (${value.query_type})`
  if ('syscall' in value) return `${value.process_command} → ${value.syscall}`
  if ('local_address' in value)
    return `${value.process_command} → ${formatEndpoint(value.address_family, value.local_address, value.local_port)} (${value.transport.toUpperCase()}, ${value.address_family.toUpperCase()})`
  if ('operation' in value && 'path' in value)
    return value.operation === 'rename' && value.new_path
      ? `${value.process_command} · rename · ${value.path} → ${value.new_path} · ${value.replaced === true ? 'replaced' : value.replaced === false ? 'not replaced' : 'unknown'}`
      : `${value.process_command} · ${value.operation} · ${value.path}`
  return getEventKindLabel(entry.event_kind)
}

export function RuntimeDiffVisualization({ summary }: { summary: RuntimeDiffSummary }) {
  const counts = new Map(
    summary.classifications.map((item) => [item.classification, item.item_count]),
  )
  const maximumDelta = Math.max(
    0,
    ...summary.largest_changes.map((item) => Math.abs(item.occurrence_delta)),
  )
  return (
    <section className="space-y-4" aria-label="Complete release comparison summary">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(['new', 'disappeared', 'unchanged', 'unknown'] as const).map((classification) => (
          <Card key={classification}>
            <span className="text-sm text-slate-400">{classificationLabel[classification]}</span>
            <strong className="mt-1 block text-2xl tabular-nums">
              {formatCount(counts.get(classification) ?? 0)}
            </strong>
          </Card>
        ))}
      </div>
      {summary.largest_changes.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold">Largest observation-count changes</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ranked across the complete comparison. Counts are recorded observations, not duration,
            traffic volume, configured intent, or risk.
          </p>
          <ol className="mt-4 space-y-3">
            {summary.largest_changes.map((entry) => {
              const label = behaviorText(entry)
              const direction =
                entry.occurrence_delta > 0
                  ? 'Increase'
                  : entry.occurrence_delta < 0
                    ? 'Decrease'
                    : 'No count change'
              return (
                <li
                  key={entry.group_id}
                  aria-label={`${label}, ${classificationLabel[entry.classification]}, ${direction}, baseline ${entry.baseline_occurrence_count}, target ${entry.target_occurrence_count}, delta ${formatSignedCount(entry.occurrence_delta)}`}
                  className="rounded-lg border border-slate-700 bg-slate-950 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="break-all font-mono text-sm font-semibold">{label}</span>
                    <strong className="tabular-nums">
                      {formatSignedCount(entry.occurrence_delta)}
                    </strong>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {classificationLabel[entry.classification]} · {direction} · baseline{' '}
                    {formatCount(entry.baseline_occurrence_count)} → target{' '}
                    {formatCount(entry.target_occurrence_count)}
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-800"
                  >
                    <span
                      className={`block h-full rounded-full ${entry.occurrence_delta < 0 ? 'bg-amber-300' : 'bg-cyan-400'}`}
                      style={{
                        width: `${safePercentage(Math.abs(entry.occurrence_delta), maximumDelta)}%`,
                      }}
                    />
                  </span>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
    </section>
  )
}
