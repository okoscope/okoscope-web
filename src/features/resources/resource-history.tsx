import { useQuery } from '@tanstack/react-query'
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
    observedLegend: 'Observed data',
    gapLegend: 'Interval without data',
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
    observedLegend: 'Наблюдаемые данные',
    gapLegend: 'Интервал без данных',
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
      <a
        className="inline-flex text-sm font-semibold text-cyan-300 underline"
        href={`/docs/${locale}/application-resources/`}
      >
        {text.docs}
      </a>
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

const MAX_CHART_MILESTONES = 8
const MIN_SLOPE_CHANGE_RATIO = 0.1

const chartMilestones = (
  parts: ResourceHistoryPoint[][],
  valueRange: number,
  labelFor: (value: number) => string,
) => {
  const candidates = parts.flatMap((part) => {
    if (part.length < 3) return part.map((point) => ({ point, salience: Infinity, endpoint: true }))
    return part.flatMap((point, index) => {
      if (index === 0 || index === part.length - 1)
        return [{ point, salience: Infinity, endpoint: true }]
      const previous = part[index - 1]?.value
      const current = point.value
      const next = part[index + 1]?.value
      if (
        previous === null ||
        previous === undefined ||
        current === null ||
        next === null ||
        next === undefined
      )
        return []
      const previousDelta = current - previous
      const nextDelta = next - current
      const salience = Math.abs(nextDelta - previousDelta) / Math.max(valueRange, 1)
      return salience >= MIN_SLOPE_CHANGE_RATIO ? [{ point, salience, endpoint: false }] : []
    })
  })

  const uniqueValues = new Map<string, (typeof candidates)[number]>()
  for (const candidate of candidates) {
    const value = candidate.point.value
    if (value === null) continue
    const label = labelFor(value)
    const existing = uniqueValues.get(label)
    if (
      !existing ||
      (existing.endpoint && !candidate.endpoint) ||
      (existing.endpoint === candidate.endpoint && candidate.salience >= existing.salience)
    )
      uniqueValues.set(label, candidate)
  }

  return [...uniqueValues.values()]
    .sort((left, right) => right.salience - left.salience)
    .slice(0, MAX_CHART_MILESTONES)
    .map(({ point }) => point)
    .sort((left, right) => new Date(left.from).getTime() - new Date(right.from).getTime())
}

const chartTicks = (minimum: number, maximum: number, count: number) =>
  Array.from({ length: count }, (_, index) => minimum + ((maximum - minimum) * index) / (count - 1))

const hourlyTicks = (from: string, to: string) => {
  const start = new Date(from).getTime()
  const end = new Date(to).getTime()
  const hour = 3_600_000
  const durationHours = Math.max(1, Math.round((end - start) / hour))
  const intervalHours = durationHours <= 24 ? 1 : durationHours <= 168 ? 6 : 24
  const first = Math.ceil(start / (intervalHours * hour)) * intervalHours * hour
  const result: Date[] = []
  for (let value = first; value <= end; value += intervalHours * hour) result.push(new Date(value))
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
  const values = rendered.flatMap((point) =>
    point.value === null || !point.coverage.complete ? [] : [point.value],
  )
  const observedMax = Math.max(...values, 1)
  const observedMin = Math.min(...values, observedMax)
  const padding = Math.max((observedMax - observedMin) * 0.12, Math.abs(observedMax) * 0.02, 1)
  const max = observedMax + padding
  const min = Math.max(0, observedMin - padding)
  const parts = segments(rendered)
  const yTicks = chartTicks(min, max, 4)
  const valueLabel = (value: number) => formatResourceValue(locale, value, data.unit)
  const tickLabels = new Set(yTicks.map(valueLabel))
  const milestones = chartMilestones(parts, observedMax - observedMin, valueLabel).filter(
    (point) => point.value !== null && !tickLabels.has(valueLabel(point.value)),
  )
  const xTicks = hourlyTicks(data.from, data.to)
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
  const x = (point: ResourceHistoryPoint) =>
    72 +
    ((new Date(point.from).getTime() - new Date(data.from).getTime()) /
      Math.max(1, new Date(data.to).getTime() - new Date(data.from).getTime())) *
      788
  const xAt = (date: Date) =>
    72 +
    ((date.getTime() - new Date(data.from).getTime()) /
      Math.max(1, new Date(data.to).getTime() - new Date(data.from).getTime())) *
      788
  const y = (value: number) => 260 - ((value - min) / Math.max(max - min, 1)) * 190
  const dateGroups = xTicks.reduce<{ label: string; ticks: Date[] }[]>((groups, tick) => {
    const label = dateFormatter.format(tick)
    const current = groups.at(-1)
    if (current?.label === label) current.ticks.push(tick)
    else groups.push({ label, ticks: [tick] })
    return groups
  }, [])
  return (
    <Card>
      <h2 className="text-xl font-semibold">{metricLabel(data.metric, locale)}</h2>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-300">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-8 bg-cyan-400" />
          {text.observedLegend}
        </span>
        <span className="inline-flex items-center gap-2">
          <svg aria-hidden="true" className="h-2 w-8" viewBox="0 0 32 8">
            <line x1="0" x2="32" y1="4" y2="4" stroke="#fbbf24" strokeDasharray="6 4" />
          </svg>
          {text.gapLegend}
        </span>
      </div>
      <div
        className="mt-4 overflow-x-auto"
        role="region"
        tabIndex={0}
        aria-label={`${text.chart}: ${metricLabel(data.metric, locale)}`}
      >
        <svg
          className="h-auto min-w-[720px]"
          viewBox="0 0 900 340"
          role="img"
          aria-label={`${text.chart}: ${metricLabel(data.metric, locale)}`}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1="72" x2="860" y1={y(tick)} y2={y(tick)} stroke="#24364d" />
              <text x="64" y={y(tick) + 4} fill="#94a3b8" fontSize="11" textAnchor="end">
                {formatResourceValue(locale, tick, data.unit)}
              </text>
            </g>
          ))}
          {xTicks.map((tick, index) => {
            const previous = xTicks[index - 1]
            const beginsDate =
              previous && dateFormatter.format(previous) !== dateFormatter.format(tick)
            return (
              <g key={tick.toISOString()}>
                <line
                  x1={xAt(tick)}
                  x2={xAt(tick)}
                  y1="70"
                  y2="265"
                  stroke={beginsDate ? '#64748b' : '#24364d'}
                />
                <line x1={xAt(tick)} x2={xAt(tick)} y1="260" y2="266" stroke="#64748b" />
                <text x={xAt(tick)} y="282" fill="#94a3b8" fontSize="10" textAnchor="middle">
                  {String(tick.getHours()).padStart(2, '0')}
                </text>
              </g>
            )
          })}
          {dateGroups.map((group) => {
            const first = group.ticks[0]!
            const last = group.ticks.at(-1)!
            return (
              <text
                key={group.label}
                x={(xAt(first) + xAt(last)) / 2}
                y="305"
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
              >
                {group.label}
              </text>
            )
          })}
          <path d="M72 70V260H860" fill="none" stroke="#64748b" />
          {parts.map((part, index) => (
            <polyline
              key={index}
              data-resource-series="observed"
              points={part.map((item) => `${x(item)},${y(item.value!)}`).join(' ')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {parts.slice(0, -1).map((part, index) => {
            const next = parts[index + 1]
            const start = part.at(-1)
            const end = next?.[0]
            if (!start || !end || start.value === null || end.value === null) return null
            return (
              <line
                key={`${start.from}-${end.from}`}
                data-resource-series="gap"
                x1={x(start)}
                x2={x(end)}
                y1={y(start.value)}
                y2={y(end.value)}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="7 5"
              >
                <title>{text.gapLegend}</title>
              </line>
            )
          })}
          {milestones.map((point, index) => {
            if (point.value === null) return null
            const pointY = y(point.value)
            const above = pointY > 235 || (pointY >= 95 && index % 2 === 0)
            return (
              <g key={point.from} data-resource-milestone="true">
                <line
                  x1={x(point)}
                  x2={x(point)}
                  y1={Math.max(70, pointY - 9)}
                  y2={Math.min(260, pointY + 9)}
                  stroke="#67e8f9"
                  strokeWidth="1"
                />
                <text
                  x={x(point)}
                  y={pointY + (above ? -13 : 22)}
                  fill="#e2e8f0"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {formatResourceValue(locale, point.value, data.unit)}
                </text>
              </g>
            )
          })}
          {data.releases
            .filter((marker) => {
              const observedAt = new Date(marker.observed_at).getTime()
              return (
                observedAt >= new Date(data.from).getTime() &&
                observedAt <= new Date(data.to).getTime()
              )
            })
            .slice(0, 30)
            .map((marker) => {
              const markerX = Math.min(850, Math.max(82, xAt(new Date(marker.observed_at))))
              return (
                <g key={`${marker.release.id}-${marker.observed_at}`}>
                  <line
                    data-resource-release-marker="true"
                    x1={markerX}
                    x2={markerX}
                    y1="64"
                    y2="265"
                    stroke="#34d399"
                    strokeDasharray="4 5"
                  />
                  <title>{`${text.releaseMarker}: ${marker.release.display_name}`}</title>
                </g>
              )
            })}
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
