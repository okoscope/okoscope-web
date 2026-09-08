import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useApi } from '../../shared/api/context'
import type { components } from '../../shared/api/schema'
import { useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { formatCount } from '../tenant/format'
import { RetentionCoverage } from './coverage'

export type SnapshotSearch = {
  snapshot_cursor?: string | undefined
  snapshot_from?: string | undefined
  snapshot_to?: string | undefined
  snapshot_release?: string | undefined
}
export function SnapshotHistory({
  projectId,
  applicationId,
  groupId,
  search,
  onChange,
}: {
  projectId: string
  applicationId: string
  groupId: string
  search: SnapshotSearch
  onChange: (search: SnapshotSearch) => void
}) {
  const api = useApi()
  const { locale } = useLocalization()
  const ru = locale === 'ru'
  const query = useQuery({
    queryKey: [
      'runtime-snapshots',
      projectId,
      applicationId,
      groupId,
      search.snapshot_cursor,
      search.snapshot_from,
      search.snapshot_to,
      search.snapshot_release,
    ],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ limit: '50' })
      for (const [key, value] of Object.entries({
        cursor: search.snapshot_cursor,
        day_from: search.snapshot_from,
        day_to: search.snapshot_to,
        release_id: search.snapshot_release,
      }))
        if (value) params.set(key, value)
      return api.get<components['schemas']['RuntimeHistorySnapshotPage']>(
        `/api/v1/runtime-groups/${encodeURIComponent(groupId)}/snapshots?${params}`,
        { protected: true, signal },
      )
    },
  })
  return (
    <section className="space-y-3" aria-labelledby="snapshot-heading">
      <h2 id="snapshot-heading" className="text-2xl font-semibold">
        {ru ? 'Дневные сводки' : 'Daily snapshots'}
      </h2>
      <p className="text-sm text-slate-400">
        {ru
          ? 'Только сгруппированные цифры. Исходные события удалены; подробности восстановить нельзя. Одна строка на группу, релиз и сутки UTC.'
          : 'Grouped numbers only. Original events were deleted and details cannot be restored. One row per group, release and UTC day.'}
      </p>
      <SnapshotFilters
        key={[search.snapshot_from, search.snapshot_to, search.snapshot_release].join('|')}
        search={search}
        onChange={onChange}
      />
      {query.isPending ? (
        <Loading label={ru ? 'Загрузка сводок…' : 'Loading snapshots…'} />
      ) : query.isError ? (
        <ErrorState
          title={ru ? 'Сводки недоступны' : 'Snapshots unavailable'}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <RetentionCoverage coverage={query.data.coverage} />
          {query.data.items.length === 0 ? (
            <Card>
              {ru
                ? 'Нет сводок за выбранный период на этой странице.'
                : 'No snapshots for the selected period on this page.'}
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {(ru
                      ? ['Сутки UTC', 'Релиз', 'Наблюдения', 'Первое (UTC)', 'Последнее (UTC)']
                      : ['UTC day', 'Release', 'Observations', 'First (UTC)', 'Last (UTC)']
                    ).map((label) => (
                      <th className="p-3" key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((row) => (
                    <tr key={row.id} className="border-t border-slate-700">
                      <td className="p-3">{row.day}</td>
                      <td className="p-3 font-mono">
                        {row.release_id ?? (ru ? 'Без релиза' : 'Unattributed')}
                      </td>
                      <td className="p-3">{formatCount(row.occurrence_count)}</td>
                      <td className="p-3">{row.first_observed_at}</td>
                      <td className="p-3">{row.last_observed_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-3">
            {search.snapshot_cursor && (
              <Button
                variant="outline"
                onClick={() => onChange({ ...search, snapshot_cursor: undefined })}
              >
                {ru ? 'Первая страница сводок' : 'First snapshot page'}
              </Button>
            )}
            {query.data.next_cursor && (
              <Button
                variant="outline"
                onClick={() =>
                  onChange({ ...search, snapshot_cursor: query.data.next_cursor ?? undefined })
                }
              >
                {ru ? 'Следующая страница сводок' : 'Next snapshot page'}
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
function SnapshotFilters({
  search,
  onChange,
}: {
  search: SnapshotSearch
  onChange: (search: SnapshotSearch) => void
}) {
  const { locale } = useLocalization()
  const ru = locale === 'ru'
  const [from, setFrom] = useState(search.snapshot_from ?? '')
  const [to, setTo] = useState(search.snapshot_to ?? '')
  const [release, setRelease] = useState(search.snapshot_release ?? '')
  const [invalid, setInvalid] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (from && to && from >= to) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onChange({
      snapshot_from: from || undefined,
      snapshot_to: to || undefined,
      snapshot_release: release.trim() || undefined,
      snapshot_cursor: undefined,
    })
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label>
        {ru ? 'С даты UTC включительно' : 'From UTC day (inclusive)'}
        <input
          className="mt-1 block rounded border border-slate-700 bg-slate-950 p-2"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label>
        {ru ? 'До даты UTC исключительно' : 'Until UTC day (exclusive)'}
        <input
          className="mt-1 block rounded border border-slate-700 bg-slate-950 p-2"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
      <label>
        {ru ? 'ID релиза (необязательно)' : 'Release ID (optional)'}
        <input
          className="mt-1 block rounded border border-slate-700 bg-slate-950 p-2"
          value={release}
          onChange={(e) => setRelease(e.target.value)}
        />
      </label>
      <Button type="submit">{ru ? 'Применить фильтры сводок' : 'Apply snapshot filters'}</Button>
      {invalid && (
        <p role="alert">
          {ru
            ? 'Конец периода должен быть позже начала.'
            : 'The end day must be after the start day.'}
        </p>
      )}
    </form>
  )
}
