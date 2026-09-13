import type { AgentDiagnosticDelta, AgentHealthTimelinePoint } from '../../shared/api/types'
import { useT } from '../../shared/i18n'
import { formatTimestamp } from './format'

const pointClasses = {
  received:
    'border-emerald-300/80 bg-emerald-500/65 shadow-[inset_0_3px_0_rgb(167_243_208_/_0.65)]',
  missing:
    'border-dashed border-amber-300/90 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_3px,rgb(251_191_36_/_0.32)_3px,rgb(251_191_36_/_0.32)_5px)]',
  unavailable: 'border-slate-600 bg-slate-950 shadow-[inset_0_-3px_0_rgb(71_85_105_/_0.65)]',
} as const

const SEGMENT_WIDTH_PX = 12
const TIMELINE_MIN_WIDTH_PX = 280

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
  diagnosticsAvailable,
}: {
  points: AgentHealthTimelinePoint[]
  range: '1h' | '6h' | '24h'
  diagnosticsAvailable: boolean
}) {
  const t = useT()
  const counts = timelineCounts(points)
  const diagnostics = aggregateDiagnostics(points)
  const hasUnavailableDiagnosticHistory =
    diagnosticsAvailable &&
    points.some((point) => point.status === 'received' && !point.diagnostics_available)
  const summary = t('agentTimelineSummary', { range, ...counts })
  const tickIndexes = [
    ...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]),
  ].filter((index) => index >= 0)

  return (
    <div>
      <div className="overflow-x-auto pb-1 pt-14" aria-label={summary} role="group">
        <div
          className="grid w-max gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${points.length}, ${SEGMENT_WIDTH_PX}px)`,
            minWidth: `${TIMELINE_MIN_WIDTH_PX}px`,
          }}
        >
          {points.map((point, index) => {
            const hasDiagnostics = point.diagnostics.length > 0
            const detail = t('agentTimelinePointDetails', {
              start: formatTimestamp(point.start),
              end: formatTimestamp(point.end),
              status: t(`agentTimeline_${point.status}`),
              diagnostics: point.diagnostics.reduce((total, item) => total + item.delta, 0),
              diagnosticsAvailability: point.diagnostics_available
                ? t('agentTimelineDiagnosticsAvailable')
                : t('agentTimelineDiagnosticsUnavailable'),
              reset: point.reset ? t('agentTimelineResetPresent') : t('agentTimelineResetAbsent'),
            })
            return (
              <button
                key={point.start}
                type="button"
                aria-label={detail}
                className={`group relative h-8 w-3 min-w-3 shrink-0 border p-0 outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${pointClasses[point.status]}`}
                data-status={point.status}
                data-diagnostics={hasDiagnostics || undefined}
                data-reset={point.reset || undefined}
              >
                {hasDiagnostics && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-px -top-1 text-[9px] font-black leading-none text-amber-100 drop-shadow-[0_1px_1px_rgb(0_0_0)]"
                  >
                    !
                  </span>
                )}
                {point.reset && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -left-px text-[9px] font-black leading-none text-cyan-100 drop-shadow-[0_1px_1px_rgb(0_0_0)]"
                  >
                    ↻
                  </span>
                )}
                <span
                  className={`pointer-events-none absolute bottom-[calc(100%+0.5rem)] z-30 hidden w-56 rounded-md border border-slate-600 bg-slate-950 p-2 text-left text-xs font-normal text-slate-100 shadow-xl group-hover:block group-focus-visible:block ${
                    index === 0
                      ? 'left-0'
                      : index === points.length - 1
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2'
                  }`}
                >
                  {detail}
                </span>
              </button>
            )
          })}
        </div>
        <div
          className="relative mt-2 h-5 min-w-[280px] text-[10px] text-slate-500"
          style={{
            width: `${points.length * SEGMENT_WIDTH_PX + Math.max(points.length - 1, 0) * 2}px`,
            minWidth: `${TIMELINE_MIN_WIDTH_PX}px`,
          }}
        >
          {tickIndexes.map((index) => (
            <span
              key={index}
              className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
              style={{ left: `${points.length > 1 ? (index / (points.length - 1)) * 100 : 0}%` }}
            >
              {formatTimestamp(points[index]!.start)}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">{summary}</p>
      <div
        className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"
        aria-hidden="true"
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 border border-emerald-300/80 bg-emerald-500/65 shadow-[inset_0_2px_0_rgb(167_243_208_/_0.65)]"
          />
          {t('agentTimelineReceived')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 border border-dashed border-amber-300/90 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_2px,rgb(251_191_36_/_0.32)_2px,rgb(251_191_36_/_0.32)_4px)]"
          />
          {t('agentTimelineMissing')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 border border-slate-600 bg-slate-950 shadow-[inset_0_-2px_0_rgb(71_85_105_/_0.65)]"
          />
          {t('agentTimelineUnavailable')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="font-black text-amber-100">
            !
          </span>
          {t('agentTimelineDiagnostic')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="font-black text-cyan-100">
            ↻
          </span>
          {t('agentTimelineReset')}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-slate-200">{t('agentApplicationDiagnostics')}</p>
        <p className="text-xs text-slate-500">{t('agentApplicationDiagnosticScope')}</p>
      </div>
      {!diagnosticsAvailable && (
        <p className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
          {t('agentDiagnosticsUnavailable')}
        </p>
      )}
      {hasUnavailableDiagnosticHistory && (
        <p className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
          {t('agentDiagnosticsHistoryPartial')}
        </p>
      )}
      {diagnosticsAvailable && diagnostics.length === 0 && counts.resets === 0 && (
        <p className="mt-3 text-sm text-slate-500">{t('agentNoRecentDiagnostics')}</p>
      )}
      {(diagnostics.length > 0 || counts.resets > 0) && (
        <div className="mt-3 rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-sm">
          <p className="sr-only">{t('agentRecentApplicationDiagnostics')}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-200">
            {diagnostics.map((diagnostic) => (
              <li key={diagnostic.category}>
                {t(`agentDiagnostic_${diagnostic.category}`)}: +{diagnostic.delta}
              </li>
            ))}
            {counts.resets > 0 && <li>{t('agentResetCount', { count: counts.resets })}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
