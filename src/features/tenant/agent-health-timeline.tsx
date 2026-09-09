import type { AgentDiagnosticDelta, AgentHealthTimelinePoint } from '../../shared/api/types'
import { useT } from '../../shared/i18n'

const pointClasses = {
  received: 'border-emerald-500/70 bg-emerald-500/60 text-emerald-50',
  missing: 'border-amber-500/70 bg-transparent text-amber-200',
  unavailable: 'border-slate-700 bg-slate-900 text-slate-500',
} as const

const pointSymbols = { received: '●', missing: '×', unavailable: '·' } as const

export function aggregateDiagnostics(points: AgentHealthTimelinePoint[]) {
  const totals = new Map<AgentDiagnosticDelta['category'], number>()
  for (const point of points) {
    for (const diagnostic of point.diagnostics) {
      totals.set(diagnostic.category, (totals.get(diagnostic.category) ?? 0) + diagnostic.delta)
    }
  }
  return [...totals].map(([category, delta]) => ({ category, delta }))
}

export function timelineCounts(points: AgentHealthTimelinePoint[]) {
  return {
    received: points.filter((point) => point.status === 'received').length,
    missing: points.filter((point) => point.status === 'missing').length,
    unavailable: points.filter((point) => point.status === 'unavailable').length,
    resets: points.filter((point) => point.reset).length,
  }
}

export function AgentHealthTimeline({
  points,
  range,
}: {
  points: AgentHealthTimelinePoint[]
  range: '1h' | '6h' | '24h'
}) {
  const t = useT()
  const counts = timelineCounts(points)
  const diagnostics = aggregateDiagnostics(points)
  const summary = t('agentTimelineSummary', { range, ...counts })

  return (
    <div>
      <div
        className="grid auto-cols-fr grid-flow-col gap-0.5 overflow-hidden rounded-lg"
        role="img"
        aria-label={summary}
      >
        {points.map((point) => {
          const hasDiagnostics = point.diagnostics.length > 0
          return (
            <span
              key={point.start}
              aria-hidden="true"
              className={`relative flex h-8 min-w-0 items-center justify-center border text-[10px] ${pointClasses[point.status]}`}
              data-status={point.status}
              data-diagnostics={hasDiagnostics || undefined}
              data-reset={point.reset || undefined}
            >
              {pointSymbols[point.status]}
              {hasDiagnostics && <span className="absolute right-0 top-0 font-bold">!</span>}
              {point.reset && <span className="absolute bottom-0 left-0 font-bold">↻</span>}
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400">{summary}</p>
      <div
        className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"
        aria-hidden="true"
      >
        <span>● {t('agentTimelineReceived')}</span>
        <span>× {t('agentTimelineMissing')}</span>
        <span>· {t('agentTimelineUnavailable')}</span>
        <span>! {t('agentTimelineDiagnostic')}</span>
        <span>↻ {t('agentTimelineReset')}</span>
      </div>
      {(diagnostics.length > 0 || counts.resets > 0) && (
        <div className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-sm">
          <p className="font-semibold text-amber-100">{t('agentRecentNodeDiagnostics')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-200">
            {diagnostics.map((diagnostic) => (
              <li key={diagnostic.category}>
                {t(`agentDiagnostic_${diagnostic.category}`)}: +{diagnostic.delta}
              </li>
            ))}
            {counts.resets > 0 && <li>{t('agentResetCount', { count: counts.resets })}</li>}
          </ul>
          <p className="mt-2 text-xs text-amber-100/80">{t('agentNodeDiagnosticScope')}</p>
        </div>
      )}
    </div>
  )
}
