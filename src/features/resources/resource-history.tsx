import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CircleGauge, Database, MemoryStick } from 'lucide-react'
import { useMemo } from 'react'
import { useApi } from '../../shared/api/context'
import type { ApplicationResourceHistory, ResourceHistoryPoint } from '../../shared/api/types'
import { useLocalization, type Locale } from '../../shared/i18n'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import {
  availabilityLabel,
  formatResourceValue,
  metricGroups,
  metricLabel,
  resourceRange,
  type ResourceSearch,
} from './model'
import { applicationResourcesOptions } from './queries'

const copy = {
  en: {
    title: 'Application resources',
    eyebrow: 'Resource history',
    intro:
      'Inspect bounded cgroup measurements for this Application. Release markers show timing; they do not prove that a Release caused a change.',
    metric: 'Metric',
    range: 'Range',
    resolution: 'Resolution',
    mode: 'Display',
    total: 'Application total',
    replica: 'Per Ready replica',
    allContainers: 'All containers',
    container: 'Container',
    minute: 'Minute',
    hour: 'Hour',
    loading: 'Loading resource history…',
    failed: 'Resource history unavailable',
    empty: 'No resource measurements',
    emptyHelp:
      'The resource profile may be disabled, unsupported, outside retention, or still collecting its first interval.',
    coverage: 'Data coverage',
    samples: 'samples',
    contributors: 'contributors',
    replicas: 'Ready replicas',
    gap: 'Missing or incomplete interval',
    observed: 'Observed value',
    limit: 'Effective limit',
    time: 'Interval',
    release: 'Release',
    table: 'Keyboard-readable resource values',
    tableBounded: 'Showing the latest 100 intervals.',
    memoryNote:
      'Memory current includes charged cache. Anonymous memory and file cache are available as separate metrics.',
    ioNote:
      'I/O bytes and operations describe throughput. PSI describes task waiting. Neither is disk utilization or capacity.',
    psiNote:
      'PSI is the share of wall time when at least one task (some), or every runnable task (full), waited for a resource.',
    throttleNote:
      'Throttled-period share says how often CPU quota enforcement occurred; it is not a percentage of performance lost.',
    docs: 'How to interpret resource measurements',
    unavailable: 'This metric is not available for the selected range.',
    stale: 'Showing the previous result while newer data is loading.',
    releaseMarker: 'Release observed',
    chart: 'Resource history chart',
    noLimit: 'No finite limit',
    coverageHelp: 'Incomplete intervals appear as gaps, never as zero.',
    range6h: '6 hr',
    range24h: '24 hr',
    range7d: '7 days',
    range30d: '30 days',
  },
  ru: {
    title: 'Ресурсы приложения',
    eyebrow: 'История ресурсов',
    intro:
      'Изучайте ограниченные измерения cgroup для приложения. Метки релизов показывают время, но не доказывают, что релиз вызвал изменение.',
    metric: 'Метрика',
    range: 'Период',
    resolution: 'Шаг',
    mode: 'Отображение',
    total: 'Всего по приложению',
    replica: 'На Ready-реплику',
    allContainers: 'Все контейнеры',
    container: 'Контейнер',
    minute: 'Минута',
    hour: 'Час',
    loading: 'Загрузка истории ресурсов…',
    failed: 'История ресурсов недоступна',
    empty: 'Нет измерений ресурсов',
    emptyHelp:
      'Профиль ресурсов может быть выключен, не поддерживаться, находиться за сроком хранения или ещё собирать первый интервал.',
    coverage: 'Покрытие данных',
    samples: 'измерений',
    contributors: 'источников',
    replicas: 'Ready-реплики',
    gap: 'Пропущенный или неполный интервал',
    observed: 'Наблюдаемое значение',
    limit: 'Действующий лимит',
    time: 'Интервал',
    release: 'Релиз',
    table: 'Таблица значений для клавиатурной навигации',
    tableBounded: 'Показаны последние 100 интервалов.',
    memoryNote:
      'Текущая память включает кеш, учтённый cgroup. Анонимная память и файловый кеш доступны как отдельные метрики.',
    ioNote:
      'Байты и операции I/O описывают поток данных, PSI — ожидание задач. Это не утилизация или ёмкость диска.',
    psiNote:
      'PSI — доля времени, когда ресурс ожидала хотя бы одна задача (some) или все исполняемые задачи (full).',
    throttleNote:
      'Доля периодов троттлинга показывает частоту применения квоты CPU, а не процент потерянной производительности.',
    docs: 'Как интерпретировать измерения ресурсов',
    unavailable: 'Метрика недоступна для выбранного периода.',
    stale: 'Показан предыдущий результат, пока загружаются новые данные.',
    releaseMarker: 'Зафиксирован релиз',
    chart: 'График истории ресурсов',
    noLimit: 'Нет конечного лимита',
    coverageHelp: 'Неполные интервалы показаны разрывами и не превращаются в нули.',
    range6h: '6 ч',
    range24h: '24 ч',
    range7d: '7 дней',
    range30d: '30 дней',
  },
} as const

export function ResourceHistory({
  projectId,
  applicationId,
  search,
  onSearch,
}: {
  projectId: string
  applicationId: string
  search: ResourceSearch
  onSearch: (next: ResourceSearch) => void
}) {
  const { locale } = useLocalization()
  const text = copy[locale]
  const range = useMemo(() => resourceRange(search.range, search.step), [search.range, search.step])
  const query = useQuery(
    applicationResourcesOptions(useApi(), projectId, applicationId, search, range),
  )
  if (query.isPending) return <Loading label={text.loading} />
  if (query.isError && !query.data)
    return (
      <ErrorState title={text.failed} error={query.error} onRetry={() => void query.refetch()} />
    )
  const data = query.data
  return (
    <section className="space-y-6" aria-labelledby="resource-history-heading">
      <div>
        <p className="eyebrow">{text.eyebrow}</p>
        <h1 id="resource-history-heading" className="mt-2 text-4xl font-semibold">
          {text.title}
        </h1>
        <p className="mt-2 max-w-3xl text-slate-400">{text.intro}</p>
      </div>
      {query.isFetching && (
        <p role="status" className="text-sm text-amber-300">
          {text.stale}
        </p>
      )}
      <ResourceControls
        locale={locale}
        search={search}
        containers={data.containers}
        onSearch={onSearch}
      />
      {data.availability !== 'available' || data.points.length === 0 ? (
        <Card>
          <h2 className="text-xl font-semibold">
            {data.points.length ? availabilityLabel(data.availability, locale) : text.empty}
          </h2>
          <p className="mt-2 text-slate-400">
            {data.points.length ? text.unavailable : text.emptyHelp}
          </p>
        </Card>
      ) : (
        <>
          <ResourceSummary data={data} locale={locale} />
          <ResourceChart data={data} locale={locale} />
          <ResourceTable data={data} locale={locale} />
        </>
      )}
      <ResourceSemantics metric={search.metric} locale={locale} />
      <Link
        className="inline-flex text-sm font-semibold text-cyan-300 underline"
        to="/docs/$slug"
        params={{ slug: 'application-resources' }}
      >
        {text.docs}
      </Link>
    </section>
  )
}

function ResourceControls({
  locale,
  search,
  containers,
  onSearch,
}: {
  locale: Locale
  search: ResourceSearch
  containers: string[]
  onSearch: (next: ResourceSearch) => void
}) {
  const text = copy[locale]
  const update = (part: Partial<ResourceSearch>) => onSearch({ ...search, ...part })
  return (
    <Card>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
        <label className="text-sm text-slate-300">
          {text.metric}
          <select
            aria-label={text.metric}
            value={search.metric}
            onChange={(e) => update({ metric: e.target.value as ResourceSearch['metric'] })}
            className="mt-2 min-h-11 w-full rounded border border-slate-700 bg-slate-950 p-2"
          >
            {metricGroups.map((group) => (
              <optgroup key={group.label.en} label={group.label[locale]}>
                {group.metrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {metricLabel(metric, locale)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          {text.range}
          <select
            value={search.range}
            onChange={(e) =>
              update({
                range: e.target.value as ResourceSearch['range'],
                step: e.target.value === '30d' ? 'hour' : search.step,
              })
            }
            className="mt-2 min-h-11 w-full rounded border border-slate-700 bg-slate-950 p-2"
          >
            <option value="6h">{text.range6h}</option>
            <option value="24h">{text.range24h}</option>
            <option value="7d">{text.range7d}</option>
            <option value="30d">{text.range30d}</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          {text.resolution}
          <select
            value={search.step}
            onChange={(e) => update({ step: e.target.value as ResourceSearch['step'] })}
            className="mt-2 min-h-11 w-full rounded border border-slate-700 bg-slate-950 p-2"
          >
            <option value="minute">{text.minute}</option>
            <option value="hour">{text.hour}</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          {text.mode}
          <select
            value={search.mode}
            onChange={(e) => update({ mode: e.target.value as ResourceSearch['mode'] })}
            className="mt-2 min-h-11 w-full rounded border border-slate-700 bg-slate-950 p-2"
          >
            <option value="total">{text.total}</option>
            <option value="per_ready_replica">{text.replica}</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">
          {text.container}
          <select
            value={search.container ?? ''}
            onChange={(e) => update({ container: e.target.value || undefined })}
            className="mt-2 min-h-11 w-full rounded border border-slate-700 bg-slate-950 p-2"
          >
            <option value="">{text.allContainers}</option>
            {containers.slice(0, 100).map((container) => (
              <option key={container}>{container}</option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  )
}

function ResourceSummary({ data, locale }: { data: ApplicationResourceHistory; locale: Locale }) {
  const text = copy[locale]
  const valid = data.points.filter((point) => point.value !== null)
  const latest = valid.at(-1)
  const coverage = data.points.length
    ? data.points.reduce((sum, point) => sum + point.coverage.ratio, 0) / data.points.length
    : 0
  return (
    <dl className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
      <div className="min-h-32 rounded-xl border border-cyan-900 bg-cyan-950/30 p-4">
        <dt className="text-sm text-slate-400">{text.observed}</dt>
        <dd className="mt-1 text-2xl font-semibold">
          {formatResourceValue(locale, latest?.value ?? null, data.unit)}
        </dd>
      </div>
      <div className="min-h-32 rounded-xl border border-slate-700 bg-slate-950 p-4">
        <dt className="text-sm text-slate-400">{text.coverage}</dt>
        <dd className="mt-1">
          <span className="block text-2xl font-semibold">
            {new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
              coverage,
            )}
          </span>
          <span className="mt-1 block text-xs text-slate-400">{text.coverageHelp}</span>
        </dd>
      </div>
      <div className="min-h-32 rounded-xl border border-slate-700 bg-slate-950 p-4">
        <dt className="text-sm text-slate-400">{text.replicas}</dt>
        <dd className="mt-1">
          <span className="block text-2xl font-semibold">
            {latest
              ? `${latest.coverage.ready_replicas} / ${latest.coverage.observed_replicas}`
              : '—'}
          </span>
          <span className="mt-1 block text-xs text-slate-400">
            {latest
              ? `${latest.coverage.sample_count} ${text.samples} · ${latest.coverage.contributor_count} ${text.contributors}`
              : ''}
          </span>
        </dd>
      </div>
    </dl>
  )
}

const segments = (points: ResourceHistoryPoint[]) => {
  const result: ResourceHistoryPoint[][] = []
  let current: ResourceHistoryPoint[] = []
  for (const point of points) {
    if (point.value === null || !point.coverage.complete) {
      if (current.length) result.push(current)
      current = []
    } else current.push(point)
  }
  if (current.length) result.push(current)
  return result
}

function ResourceChart({ data, locale }: { data: ApplicationResourceHistory; locale: Locale }) {
  const text = copy[locale]
  const rendered =
    data.points.length > 240
      ? data.points.filter(
          (_, index) =>
            index % Math.ceil(data.points.length / 240) === 0 || index === data.points.length - 1,
        )
      : data.points
  const values = rendered.flatMap((point) => (point.value === null ? [] : [point.value]))
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const x = (point: ResourceHistoryPoint) =>
    40 +
    ((new Date(point.from).getTime() - new Date(data.from).getTime()) /
      Math.max(1, new Date(data.to).getTime() - new Date(data.from).getTime())) *
      820
  const y = (value: number) => 260 - ((value - min) / Math.max(max - min, 1)) * 210
  return (
    <Card>
      <h2 className="text-xl font-semibold">{metricLabel(data.metric, locale)}</h2>
      <div
        className="mt-4 overflow-x-auto"
        role="region"
        tabIndex={0}
        aria-label={`${text.chart}: ${metricLabel(data.metric, locale)}`}
      >
        <svg
          className="h-auto min-w-[720px]"
          viewBox="0 0 900 310"
          role="img"
          aria-label={`${text.chart}: ${metricLabel(data.metric, locale)}`}
        >
          <path d="M40 50V260H860" fill="none" stroke="#475569" />
          <path d="M40 155H860" stroke="#334155" strokeDasharray="5 7" />
          {segments(rendered).map((part, index) => {
            const point = part[0]
            if (part.length === 1 && point?.value !== null && point?.value !== undefined) {
              const label = `${text.observed}: ${formatResourceValue(locale, point.value, data.unit)}`
              return (
                <circle
                  key={`${point.from}-${index}`}
                  data-resource-point="true"
                  cx={x(point)}
                  cy={y(point.value)}
                  r="8"
                  fill="#22d3ee"
                  stroke="#f8fafc"
                  strokeWidth="2"
                  role="img"
                  aria-label={label}
                >
                  <title>{label}</title>
                </circle>
              )
            }
            return (
              <polyline
                key={index}
                points={part.map((item) => `${x(item)},${y(item.value!)}`).join(' ')}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}
          {data.releases.slice(0, 30).map((marker) => {
            const markerX =
              40 +
              ((new Date(marker.observed_at).getTime() - new Date(data.from).getTime()) /
                Math.max(1, new Date(data.to).getTime() - new Date(data.from).getTime())) *
                820
            return (
              <g key={`${marker.release.id}-${marker.observed_at}`}>
                <line
                  x1={markerX}
                  x2={markerX}
                  y1="42"
                  y2="268"
                  stroke="#34d399"
                  strokeDasharray="4 5"
                />
                <title>{`${text.releaseMarker}: ${marker.release.display_name}`}</title>
              </g>
            )
          })}
          <text x="40" y="292" fill="#94a3b8" fontSize="13">
            {new Date(data.from).toLocaleString(locale)}
          </text>
          <text x="860" y="292" fill="#94a3b8" fontSize="13" textAnchor="end">
            {new Date(data.to).toLocaleString(locale)}
          </text>
          <text x="45" y="45" fill="#94a3b8" fontSize="13">
            {formatResourceValue(locale, max, data.unit)}
          </text>
        </svg>
      </div>
    </Card>
  )
}

function ResourceTable({ data, locale }: { data: ApplicationResourceHistory; locale: Locale }) {
  const text = copy[locale]
  const rows = data.points.slice(-100)
  return (
    <Card>
      <h2 className="text-xl font-semibold">{text.table}</h2>
      <p className="mt-1 text-sm text-slate-400">{text.tableBounded}</p>
      <div
        className="mt-4 max-h-96 overflow-auto"
        role="region"
        tabIndex={0}
        aria-label={text.table}
      >
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-900 text-slate-300">
            <tr>
              <th className="p-2">{text.time}</th>
              <th className="p-2">{text.observed}</th>
              <th className="p-2">{text.limit}</th>
              <th className="p-2">{text.coverage}</th>
              <th className="p-2">{text.replicas}</th>
              <th className="p-2">{text.release}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((point) => (
              <tr
                key={`${point.from}-${point.container ?? ''}`}
                className={
                  !point.coverage.complete
                    ? 'border-t border-amber-900/60 bg-amber-950/20'
                    : 'border-t border-slate-800'
                }
              >
                <td className="p-2">{new Date(point.from).toLocaleString(locale)}</td>
                <td className="p-2">
                  {point.value === null
                    ? text.gap
                    : formatResourceValue(locale, point.value, data.unit)}
                </td>
                <td className="p-2">
                  {point.limit
                    ? formatResourceValue(locale, point.limit.value, point.limit.unit)
                    : text.noLimit}
                </td>
                <td className="p-2">
                  {new Intl.NumberFormat(locale, {
                    style: 'percent',
                    maximumFractionDigits: 0,
                  }).format(point.coverage.ratio)}
                </td>
                <td className="p-2">
                  {point.coverage.ready_replicas} / {point.coverage.observed_replicas}
                </td>
                <td className="p-2">{point.release?.display_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ResourceSemantics({
  metric,
  locale,
}: {
  metric: ResourceSearch['metric']
  locale: Locale
}) {
  const text = copy[locale]
  let body: string = text.coverageHelp
  let Icon = CircleGauge
  if (metric.startsWith('memory_')) {
    body = text.memoryNote
    Icon = MemoryStick
  }
  if (metric.startsWith('io_')) {
    body = metric.includes('psi') ? text.psiNote : text.ioNote
    Icon = Database
  }
  if (metric.includes('psi')) body = text.psiNote
  if (metric.includes('throttled')) {
    body = text.throttleNote
    Icon = AlertTriangle
  }
  return (
    <aside className="flex gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
      <p className="text-sm text-slate-300">{body}</p>
    </aside>
  )
}
