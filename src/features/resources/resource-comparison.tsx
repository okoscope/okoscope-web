import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CircleCheck, Clock3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useApi } from '../../shared/api/context'
import type { ReleaseResourceComparison, ResourceMetricComparison } from '../../shared/api/types'
import { useLocalization, type Locale } from '../../shared/i18n'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { formatResourceValue, metricLabel } from './model'
import { releaseResourceComparisonOptions } from './queries'

const copy = {
  en: {
    title: 'Resource impact',
    intro:
      'Compare equal stable windows before and after this Release. These measurements were observed after deployment; they do not establish that the Release caused a change.',
    loading: 'Loading resource impact…',
    failed: 'Resource impact unavailable',
    collecting: 'Collecting a stable target window',
    insufficient: 'There is not enough covered data for a reliable comparison.',
    unavailable: 'The required resource sources are unavailable.',
    progress: 'Collection progress',
    baseline: 'Baseline',
    target: 'After Release',
    change: 'Change',
    coverage: 'coverage',
    ready: 'Ready replicas',
    finding: 'Requires investigation',
    observed: 'Observed increase',
    stable: 'No material change detected in the covered metrics',
    full: 'Open full resource history',
    threshold: 'Rule threshold',
    buckets: 'sustained intervals',
    pp: 'percentage points',
    relative: 'relative',
    noBaseline: 'No comparable baseline value',
    window: 'Stable window',
    metrics: 'Compared metrics',
    ruleVersionPrefix: 'rule v',
  },
  ru: {
    title: 'Влияние на ресурсы',
    intro:
      'Сравнение равных стабильных окон до и после релиза. Измерения наблюдались после развёртывания, но не устанавливают, что причиной изменения стал релиз.',
    loading: 'Загрузка влияния на ресурсы…',
    failed: 'Влияние на ресурсы недоступно',
    collecting: 'Собирается стабильное целевое окно',
    insufficient: 'Покрытых данных недостаточно для надёжного сравнения.',
    unavailable: 'Необходимые источники ресурсов недоступны.',
    progress: 'Прогресс сбора',
    baseline: 'Базовое окно',
    target: 'После релиза',
    change: 'Изменение',
    coverage: 'покрытие',
    ready: 'Ready-реплики',
    finding: 'Требует расследования',
    observed: 'Наблюдаемый рост',
    stable: 'В покрытых метриках не найдено существенных изменений',
    full: 'Открыть полную историю ресурсов',
    threshold: 'Порог правила',
    buckets: 'устойчивых интервала',
    pp: 'процентных пункта',
    relative: 'относительно',
    noBaseline: 'Нет сравнимого базового значения',
    window: 'Стабильное окно',
    metrics: 'Сравниваемые метрики',
    ruleVersionPrefix: 'правило v',
  },
} as const

export function ResourceComparison({
  projectId,
  applicationId,
  targetReleaseId,
  baselineReleaseId,
}: {
  projectId: string
  applicationId: string
  targetReleaseId: string
  baselineReleaseId?: string
}) {
  const { locale } = useLocalization()
  const text = copy[locale]
  const query = useQuery(
    releaseResourceComparisonOptions(
      useApi(),
      projectId,
      applicationId,
      targetReleaseId,
      baselineReleaseId,
    ),
  )
  if (query.isPending) return <Loading label={text.loading} />
  if (query.isError && !query.data)
    return (
      <ErrorState title={text.failed} error={query.error} onRetry={() => void query.refetch()} />
    )
  const data = query.data
  return (
    <section className="space-y-4" aria-labelledby="resource-impact-heading">
      <div>
        <p className="eyebrow">{text.metrics}</p>
        <h2 id="resource-impact-heading" className="mt-2 text-3xl font-semibold">
          {text.title}
        </h2>
        <p className="mt-2 max-w-3xl text-slate-400">{text.intro}</p>
      </div>
      {data.state === 'collecting' ? (
        <StateCard icon={Clock3} title={text.collecting}>
          <progress
            className="mt-3 w-full accent-cyan-400"
            max={1}
            value={data.collection_progress}
          >
            {Math.round(data.collection_progress * 100)}%
          </progress>
          <p className="mt-2 text-sm text-slate-400">
            {text.progress}: {Math.round(data.collection_progress * 100)}%
          </p>
        </StateCard>
      ) : data.state === 'insufficient_coverage' ? (
        <StateCard icon={AlertTriangle} title={text.insufficient} />
      ) : data.state === 'unavailable' ? (
        <StateCard icon={AlertTriangle} title={text.unavailable} />
      ) : (
        <Comparable data={data} locale={locale} />
      )}
      <Link
        className="inline-flex text-sm font-semibold text-cyan-300 underline"
        to="/projects/$projectId/applications/$applicationId/resources"
        params={{ projectId, applicationId }}
        search={{
          range: '24h',
          metric: 'memory_current_bytes',
          mode: 'per_ready_replica',
          step: 'minute',
          release: targetReleaseId,
        }}
      >
        {text.full}
      </Link>
    </section>
  )
}

function StateCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock3
  title: string
  children?: ReactNode
}) {
  return (
    <Card>
      <div className="flex gap-3">
        <Icon className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          {children}
        </div>
      </div>
    </Card>
  )
}

function Comparable({ data, locale }: { data: ReleaseResourceComparison; locale: Locale }) {
  const text = copy[locale]
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {data.baseline_window && (
          <WindowCard label={text.baseline} window={data.baseline_window} locale={locale} />
        )}
        {data.target_window && (
          <WindowCard label={text.target} window={data.target_window} locale={locale} />
        )}
      </div>
      {data.findings.length ? (
        <div className="space-y-3">
          {data.findings.map((finding) => (
            <Card
              key={finding.id}
              className={finding.priority === 'urgent' ? 'border-rose-600' : 'border-amber-600'}
            >
              <div className="flex flex-wrap gap-3 sm:flex-nowrap">
                <AlertTriangle
                  className={finding.priority === 'urgent' ? 'text-rose-300' : 'text-amber-300'}
                  aria-hidden="true"
                />
                <div className="min-w-0 break-words">
                  <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">
                    {text.finding}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">
                    {metricLabel(finding.metric, locale)}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {text.target}: {formatFindingValue(locale, finding.target, finding.metric)} ·{' '}
                    {text.baseline}:{' '}
                    {finding.baseline === null
                      ? text.noBaseline
                      : formatFindingValue(locale, finding.baseline, finding.metric)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {text.threshold}: {finding.threshold} · {finding.sustained_buckets}{' '}
                    {text.buckets} · {text.ruleVersionPrefix} {finding.rule_version}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="flex gap-3">
            <CircleCheck className="shrink-0 text-emerald-300" aria-hidden="true" />
            <p className="min-w-0 break-words">{text.stable}</p>
          </div>
        </Card>
      )}
      <Card>
        <div className="overflow-x-auto" role="region" tabIndex={0} aria-label={text.metrics}>
          <table className="w-full min-w-[640px] table-fixed text-left text-sm">
            <caption className="sr-only">{text.metrics}</caption>
            <thead className="text-slate-400">
              <tr>
                <th className="p-2">{text.metrics}</th>
                <th className="p-2">{text.baseline}</th>
                <th className="p-2">{text.target}</th>
                <th className="p-2">{text.change}</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.map((metric) => (
                <MetricRow key={metric.metric} value={metric} locale={locale} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function WindowCard({
  label,
  window,
  locale,
}: {
  label: string
  window: NonNullable<ReleaseResourceComparison['target_window']>
  locale: Locale
}) {
  const text = copy[locale]
  return (
    <Card className="min-w-0">
      <p className="text-sm text-slate-400">{label}</p>
      <h3 className="mt-1 break-words text-xl font-semibold">{window.release.display_name}</h3>
      <p className="mt-2 break-words text-sm text-slate-300">
        <span className="block font-medium">{text.window}</span>
        <span className="block">{new Date(window.from).toLocaleString(locale)}</span>
        <span className="block">{new Date(window.to).toLocaleString(locale)}</span>
      </p>
      <p className="mt-2 break-words text-sm text-slate-400">
        {text.coverage}:{' '}
        {new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
          window.coverage.ratio,
        )}{' '}
        · {text.ready}: {window.coverage.ready_replicas}/{window.coverage.observed_replicas}
      </p>
    </Card>
  )
}

function MetricRow({ value, locale }: { value: ResourceMetricComparison; locale: Locale }) {
  const text = copy[locale]
  const change =
    value.percentage_point_change !== null
      ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: 'always' }).format(value.percentage_point_change)} ${text.pp}`
      : value.relative_change !== null
        ? `${new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'always' }).format(value.relative_change)} ${text.relative}`
        : formatResourceValue(locale, value.absolute_change, value.unit)
  return (
    <tr className="border-t border-slate-800">
      <th className="break-words p-2 font-medium">{metricLabel(value.metric, locale)}</th>
      <td className="break-words p-2">{formatResourceValue(locale, value.baseline, value.unit)}</td>
      <td className="break-words p-2">{formatResourceValue(locale, value.target, value.unit)}</td>
      <td
        className={`break-words p-2 ${value.interpretation === 'resource_failure' ? 'text-rose-300' : value.interpretation === 'resource_pressure' ? 'text-amber-300' : ''}`}
      >
        {change}
      </td>
    </tr>
  )
}

const formatFindingValue = (locale: Locale, value: number, metric: string) =>
  formatResourceValue(
    locale,
    value,
    metric.endsWith('_bytes')
      ? 'bytes'
      : metric.endsWith('_ratio')
        ? 'ratio'
        : metric.endsWith('_seconds')
          ? 'seconds'
          : 'count',
  )
