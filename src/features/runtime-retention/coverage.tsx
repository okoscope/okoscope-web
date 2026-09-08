import type { components } from '../../shared/api/schema'
import { useLocalization } from '../../shared/i18n'

export function RetentionCoverage({
  coverage,
  inventory = false,
}: {
  coverage: components['schemas']['RuntimeRetentionCoverage']
  inventory?: boolean
}) {
  const { locale } = useLocalization()
  const ru = locale === 'ru'
  return (
    <aside className="rounded-lg border border-slate-700 p-3 text-sm text-slate-400">
      <p>
        {inventory
          ? ru
            ? 'Подробная активность учитывает только сохранённые исходные события. Сводки доступны отдельно в истории групп.'
            : 'Detailed activity covers retained raw events only. Snapshots are available separately in group history.'
          : ru
            ? 'Счётчики истории учитывают сохранённые события и дневные сводки удалённых событий.'
            : 'History counts include retained events and daily snapshots of deleted events.'}
      </p>
      {coverage.closed_before && (
        <p>
          {ru ? 'Приём событий закрыт до (UTC):' : 'Event ingestion closed before (UTC):'}{' '}
          <time>{coverage.closed_before}</time>.{' '}
          {ru
            ? 'Подробности этого периода могут быть удалены; сводки не восстанавливают события.'
            : 'Details in this period may be deleted; snapshots cannot restore events.'}
        </p>
      )}
      {coverage.history_expired_before && (
        <p>
          {ru ? 'История истекла до (UTC):' : 'History expired before (UTC):'}{' '}
          <time>{coverage.history_expired_before}</time>.{' '}
          {ru
            ? 'Отсутствие данных за истёкший период не означает отсутствие активности.'
            : 'Missing data in expired periods does not mean activity was absent.'}
        </p>
      )}
    </aside>
  )
}

export function UnavailableEventDetails() {
  const { locale } = useLocalization()
  return (
    <span>
      {locale === 'ru'
        ? 'Подробности события недоступны после очистки истории.'
        : 'Event details are unavailable after history cleanup.'}
    </span>
  )
}

export function IncompleteCorrelation() {
  const { locale } = useLocalization()
  return (
    <p className="text-sm text-amber-200">
      {locale === 'ru'
        ? 'Часть связанных событий удалена политикой хранения. Корреляция неполна.'
        : 'Some related events were removed by retention. Correlation evidence is incomplete.'}
    </p>
  )
}
