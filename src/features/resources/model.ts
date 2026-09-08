import type {
  ResourceAvailability,
  ResourceMetric,
  ResourceNormalization,
  ResourceStep,
  ResourceUnit,
} from '../../shared/api/types'
import type { Locale } from '../../shared/i18n'

export type ResourceSearch = {
  metric: ResourceMetric
  step: ResourceStep
  mode: ResourceNormalization
  range: '6h' | '24h' | '7d' | '30d'
  release?: string | undefined
  container?: string | undefined
}

export const metricGroups: { label: Record<Locale, string>; metrics: ResourceMetric[] }[] = [
  {
    label: { en: 'CPU', ru: 'CPU' },
    metrics: [
      'cpu_usage_cores',
      'cpu_quota_ratio',
      'cpu_throttled_period_ratio',
      'cpu_throttled_seconds',
      'cpu_psi_some_ratio',
      'cpu_psi_full_ratio',
    ],
  },
  {
    label: { en: 'Memory', ru: 'Память' },
    metrics: [
      'memory_current_bytes',
      'memory_anon_bytes',
      'memory_file_bytes',
      'memory_headroom_ratio',
      'memory_high_events',
      'memory_max_events',
      'oom_events',
      'oom_kill_events',
      'memory_psi_some_ratio',
      'memory_psi_full_ratio',
    ],
  },
  {
    label: { en: 'I/O', ru: 'I/O' },
    metrics: [
      'io_read_bytes',
      'io_write_bytes',
      'io_read_operations',
      'io_write_operations',
      'io_psi_some_ratio',
      'io_psi_full_ratio',
    ],
  },
  {
    label: { en: 'Processes', ru: 'Процессы' },
    metrics: ['pids_current', 'pids_limit_ratio', 'pids_max_events'],
  },
]

const labels: Record<ResourceMetric, Record<Locale, string>> = {
  cpu_usage_cores: { en: 'CPU use', ru: 'Использование CPU' },
  cpu_quota_ratio: { en: 'CPU quota used', ru: 'Использование квоты CPU' },
  cpu_throttled_period_ratio: { en: 'CPU throttled periods', ru: 'Периоды троттлинга CPU' },
  cpu_throttled_seconds: { en: 'CPU throttled time', ru: 'Время троттлинга CPU' },
  memory_current_bytes: { en: 'Memory current', ru: 'Текущая память' },
  memory_anon_bytes: { en: 'Anonymous memory', ru: 'Анонимная память' },
  memory_file_bytes: { en: 'File cache memory', ru: 'Файловый кеш' },
  memory_headroom_ratio: { en: 'Memory headroom', ru: 'Запас памяти' },
  memory_high_events: { en: 'Memory high events', ru: 'События memory.high' },
  memory_max_events: { en: 'Memory max events', ru: 'События memory.max' },
  oom_events: { en: 'OOM events', ru: 'События OOM' },
  oom_kill_events: { en: 'OOM kills', ru: 'OOM kill' },
  cpu_psi_some_ratio: { en: 'CPU PSI some', ru: 'CPU PSI some' },
  cpu_psi_full_ratio: { en: 'CPU PSI full', ru: 'CPU PSI full' },
  memory_psi_some_ratio: { en: 'Memory PSI some', ru: 'Memory PSI some' },
  memory_psi_full_ratio: { en: 'Memory PSI full', ru: 'Memory PSI full' },
  io_psi_some_ratio: { en: 'I/O PSI some', ru: 'I/O PSI some' },
  io_psi_full_ratio: { en: 'I/O PSI full', ru: 'I/O PSI full' },
  io_read_bytes: { en: 'I/O read throughput', ru: 'Чтение I/O' },
  io_write_bytes: { en: 'I/O write throughput', ru: 'Запись I/O' },
  io_read_operations: { en: 'I/O read operations', ru: 'Операции чтения I/O' },
  io_write_operations: { en: 'I/O write operations', ru: 'Операции записи I/O' },
  pids_current: { en: 'Current PIDs', ru: 'Текущие PID' },
  pids_limit_ratio: { en: 'PID limit used', ru: 'Использование лимита PID' },
  pids_max_events: { en: 'PID limit events', ru: 'События лимита PID' },
}

export const metricLabel = (metric: ResourceMetric, locale: Locale) => labels[metric][locale]

export const availabilityLabel = (value: ResourceAvailability, locale: Locale) =>
  ({
    available: { en: 'Available', ru: 'Доступно' },
    unsupported: { en: 'Unsupported by this source', ru: 'Не поддерживается источником' },
    no_limit: { en: 'No finite limit', ru: 'Нет конечного лимита' },
    insufficient_coverage: { en: 'Insufficient coverage', ru: 'Недостаточное покрытие' },
  })[value][locale]

export function formatResourceValue(locale: Locale, value: number | null, unit: ResourceUnit) {
  if (value === null) return '—'
  if (unit === 'bytes' || unit === 'bytes_per_second') {
    const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    const suffix = unit === 'bytes_per_second' ? '/s' : ''
    if (value >= 1024 ** 3) return `${formatter.format(value / 1024 ** 3)} GiB${suffix}`
    if (value >= 1024 ** 2) return `${formatter.format(value / 1024 ** 2)} MiB${suffix}`
    if (value >= 1024) return `${formatter.format(value / 1024)} KiB${suffix}`
    return `${formatter.format(value)} B${suffix}`
  }
  if (unit === 'ratio')
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
      value,
    )
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
  const suffix: Partial<Record<ResourceUnit, string>> = {
    cores: locale === 'ru' ? ' ядра' : ' cores',
    seconds: ' s',
    operations_per_second: ' ops/s',
    operations: ' ops',
  }
  return `${formatted}${suffix[unit] ?? ''}`
}

export const parseResourceSearch = (value: Record<string, unknown>): ResourceSearch => {
  const metrics = metricGroups.flatMap((group) => group.metrics)
  const metric = metrics.includes(value.metric as ResourceMetric)
    ? (value.metric as ResourceMetric)
    : 'memory_current_bytes'
  const range = ['6h', '24h', '7d', '30d'].includes(String(value.range))
    ? (value.range as ResourceSearch['range'])
    : '24h'
  const step = value.step === 'hour' || range === '30d' ? 'hour' : 'minute'
  return {
    metric,
    range,
    step,
    mode: value.mode === 'per_ready_replica' ? 'per_ready_replica' : 'total',
    release: typeof value.release === 'string' && value.release ? value.release : undefined,
    container: typeof value.container === 'string' && value.container ? value.container : undefined,
  }
}

export const resourceRange = (range: ResourceSearch['range'], step: ResourceStep) => {
  const to = new Date()
  if (step === 'hour') to.setUTCMinutes(0, 0, 0)
  else to.setUTCSeconds(0, 0)
  const hours = { '6h': 6, '24h': 24, '7d': 168, '30d': 720 }[range]
  return { from: new Date(to.getTime() - hours * 3_600_000).toISOString(), to: to.toISOString() }
}
