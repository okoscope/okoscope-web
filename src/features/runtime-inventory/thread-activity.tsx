import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type {
  BaselineProvenance,
  ThreadActivitySummary,
  ThreadGapReason,
} from '../../shared/api/types'
import { useApi } from '../../shared/api/context'
import { useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { Loading } from '../../shared/ui/loading'
import { ApiErrorPanel, EmptyState } from '../observability/components'
import { formatCount } from '../tenant/format'
import { threadActivitySummaryOptions, threadActivityWindowsOptions } from './queries'
import type { Locale } from '../../shared/i18n'

const provenanceCopy: Record<BaselineProvenance, string> = {
  observed: 'Observed from process creation',
  snapshot: 'Initialized from a process snapshot',
  unavailable: 'Initial thread state unavailable',
}

const gapCopy: Record<ThreadGapReason, string> = {
  kernel_loss: 'Kernel event loss',
  decode_failure: 'Event decoding failure',
  attribution_failure: 'Container attribution failure',
  state_capacity: 'Agent state capacity reached',
  snapshot_race: 'Process changed during snapshot',
  snapshot_permission: 'Snapshot permission denied',
  snapshot_truncated: 'Snapshot task limit reached',
  delivery_gap: 'Delivery gap',
}

const gapCopyRussian: Record<ThreadGapReason, string> = {
  kernel_loss: 'потеря событий ядра',
  decode_failure: 'ошибка декодирования',
  attribution_failure: 'ошибка привязки к контейнеру',
  state_capacity: 'исчерпана ёмкость состояния агента',
  snapshot_race: 'процесс изменился во время снимка',
  snapshot_permission: 'нет доступа к снимку',
  snapshot_truncated: 'достигнут лимит задач снимка',
  delivery_gap: 'разрыв доставки',
}

const displayName = (name: string) =>
  name === '__other__' || name === 'other' ? 'Other thread names' : name

const lowerBound = (value: number, incomplete: boolean, locale: Locale) =>
  `${incomplete ? (locale === 'ru' ? 'Не менее ' : 'At least ') : ''}${formatCount(value)}`

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-slate-100">{value}</dd>
    </div>
  )
}

function ThreadNames({
  names,
  incomplete,
  churnIncomplete,
  locale,
}: {
  names: ThreadActivitySummary['names']
  incomplete: boolean
  churnIncomplete: boolean
  locale: Locale
}) {
  if (names.length === 0)
    return <p className="text-sm text-slate-400">No thread names were reported.</p>
  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label="Thread activity grouped by name"
      tabIndex={0}
    >
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">Thread activity grouped by name</caption>
        <thead className="text-xs text-slate-400">
          <tr className="border-b border-slate-700">
            <th scope="col" className="pb-2 font-medium">
              Thread name
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Created
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Exited
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Active
            </th>
          </tr>
        </thead>
        <tbody>
          {names.map((name) => (
            <tr key={name.name} className="border-b border-slate-800 last:border-0">
              <th scope="row" className="max-w-64 break-all py-2 font-mono font-medium">
                {displayName(name.name)}
              </th>
              <td className="py-2 text-right tabular-nums">
                {lowerBound(name.created, churnIncomplete, locale)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {lowerBound(name.exited, churnIncomplete, locale)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {name.active === null ? 'Unavailable' : lowerBound(name.active, incomplete, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function QualityNotice({ summary, locale }: { summary: ThreadActivitySummary; locale: Locale }) {
  const incomplete = !summary.baseline_complete || summary.truncated || summary.gaps.length > 0
  if (!incomplete && summary.name_overflow === 0) return null
  return (
    <div
      role="status"
      className="rounded-xl border border-amber-700/70 bg-amber-950/30 p-3 text-sm"
    >
      <p className="font-medium text-amber-100">
        {incomplete
          ? 'Thread totals are lower bounds'
          : locale === 'ru'
            ? 'Достигнут лимит имён потоков'
            : 'Thread name capacity reached'}
      </p>
      {incomplete && (
        <p className="mt-1 text-amber-100/80">
          {summary.truncated
            ? 'The bounded result omitted older windows. Counts prefixed with “At least” are incomplete.'
            : 'Observation did not cover the complete process lifetime. Active counts may be incomplete.'}
        </p>
      )}
      {summary.name_overflow > 0 && (
        <p className="mt-1 text-amber-100/80">
          {locale === 'ru'
            ? `Переполнение имён: ${formatCount(summary.name_overflow)}. Дополнительные имена объединены в «Другие имена потоков».`
            : `Name overflow: ${formatCount(summary.name_overflow)}. Additional names are grouped under Other thread names.`}
        </p>
      )}
      {summary.gaps.length > 0 && (
        <p className="mt-1 text-amber-100/80">
          {locale === 'ru' ? 'Разрывы наблюдения' : 'Observation gaps'}:{' '}
          {summary.gaps
            .map((gap) => (locale === 'ru' ? gapCopyRussian[gap] : gapCopy[gap]))
            .join(', ')}
          .
        </p>
      )}
    </div>
  )
}

export function ThreadActivityPanel({
  projectId,
  applicationId,
  from,
  to,
}: {
  projectId: string
  applicationId: string
  from?: string | undefined
  to?: string | undefined
}) {
  const api = useApi()
  const { locale } = useLocalization()
  const [cursor, setCursor] = useState<string>()
  const [cursorHistory, setCursorHistory] = useState<string[]>([])
  const [windowsExpanded, setWindowsExpanded] = useState(false)
  const summary = useQuery(threadActivitySummaryOptions(api, projectId, applicationId, from, to))
  const windows = useQuery(
    threadActivityWindowsOptions(api, projectId, applicationId, from, to, cursor),
  )

  if (summary.isPending || windows.isPending) return <Loading label="Loading thread activity…" />
  if (summary.isError)
    return (
      <ApiErrorPanel
        title="Could not load thread activity"
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />
    )
  if (windows.isError)
    return (
      <ApiErrorPanel
        title="Could not load thread activity windows"
        error={windows.error}
        onRetry={() => void windows.refetch()}
      />
    )
  if (summary.data.window_count === 0)
    return (
      <EmptyState
        title="No thread activity observed"
        description="No bounded thread-activity windows match the selected time scope."
      />
    )

  const data = summary.data
  const incomplete = !data.baseline_complete || data.truncated || data.gaps.length > 0
  const churnIncomplete = data.truncated || data.gaps.length > 0
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
  const range = `${formatter.format(new Date(data.from))} – ${formatter.format(new Date(data.to))}`
  const active = data.active === null ? 'Unavailable' : lowerBound(data.active, incomplete, locale)
  const peak =
    data.peak_active === null ? 'Unavailable' : lowerBound(data.peak_active, incomplete, locale)

  return (
    <Card role="region" aria-labelledby="thread-activity-title" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="thread-activity-title" className="text-xl font-semibold">
            Thread activity
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Bounded aggregates by observed thread name. Individual thread events are not retained.
          </p>
        </div>
        <p className="text-sm text-slate-400">{range}</p>
      </div>
      {data.active === null && data.window_count > 0 && (
        <p className="text-sm text-slate-400">
          {locale === 'ru'
            ? 'В выбранных окнах присутствуют разные процессы или эпохи наблюдения. Текущее число активных потоков и общий пик недоступны; созданные и завершённые потоки суммируются по выбранным окнам.'
            : 'The selected windows span different processes or observation epochs. Current active counts and a combined peak are unavailable; created and exited counts cover the selected windows.'}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Active at end" value={active} />
        <Metric label="Created" value={lowerBound(data.created, churnIncomplete, locale)} />
        <Metric label="Exited" value={lowerBound(data.exited, churnIncomplete, locale)} />
        <Metric label="Peak active" value={peak} />
      </dl>
      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-slate-700 px-2 py-1">
          {data.baseline_provenance
            ? provenanceCopy[data.baseline_provenance]
            : 'Baseline provenance unavailable'}
        </span>
        <span className="rounded-full border border-slate-700 px-2 py-1">
          {locale === 'ru'
            ? `${formatCount(data.window_count)} окон наблюдения`
            : `${formatCount(data.window_count)} observation windows`}
        </span>
      </div>
      <QualityNotice summary={data} locale={locale} />
      <ThreadNames
        names={data.names}
        incomplete={incomplete}
        churnIncomplete={churnIncomplete}
        locale={locale}
      />
      <details
        open={windowsExpanded}
        onToggle={(event) => setWindowsExpanded(event.currentTarget.open)}
        className="rounded-xl border border-slate-700 p-3"
      >
        <summary className="cursor-pointer font-medium">Observation windows</summary>
        <ul className="mt-3 space-y-2">
          {windows.data.items.map((window) => {
            const windowIncomplete = !window.baseline_complete || window.gaps.length > 0
            const windowChurnIncomplete = window.gaps.length > 0
            return (
              <li key={window.id} className="rounded-lg bg-slate-950/50 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="break-all font-mono">{window.process_command}</span>
                  <span className="text-slate-400">
                    {formatter.format(new Date(window.window_started_at))} –{' '}
                    {formatter.format(new Date(window.window_ended_at))}
                  </span>
                </div>
                <p className="mt-1 text-slate-400">
                  {locale === 'ru'
                    ? `Создано ${lowerBound(window.created_count, windowChurnIncomplete, locale)} · завершено ${lowerBound(window.exited_count, windowChurnIncomplete, locale)} · активно ${lowerBound(window.active_at_end, windowIncomplete, locale)} · пик ${lowerBound(window.peak_active, windowIncomplete, locale)}`
                    : `Created ${lowerBound(window.created_count, windowChurnIncomplete, locale)} · exited ${lowerBound(window.exited_count, windowChurnIncomplete, locale)} · active ${lowerBound(window.active_at_end, windowIncomplete, locale)} · peak ${lowerBound(window.peak_active, windowIncomplete, locale)}`}
                </p>
                {!window.start_observed && (
                  <p className="mt-1 text-amber-200">Process start was not observed.</p>
                )}
              </li>
            )
          })}
        </ul>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={cursorHistory.length === 0}
            onClick={() => {
              const previous = cursorHistory.at(-1)
              setCursorHistory((history) => history.slice(0, -1))
              setCursor(previous || undefined)
            }}
          >
            Previous windows
          </Button>
          <Button
            variant="outline"
            disabled={!windows.data.next_cursor}
            onClick={() => {
              if (!windows.data.next_cursor) return
              setCursorHistory((history) => [...history, cursor ?? ''])
              setCursor(windows.data.next_cursor ?? undefined)
            }}
          >
            Next windows
          </Button>
        </div>
      </details>
    </Card>
  )
}
