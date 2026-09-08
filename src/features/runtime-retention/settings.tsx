import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { useApi } from '../../shared/api/context'
import type { components } from '../../shared/api/schema'
import { useAuthentication } from '../../shared/auth/session'
import { useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'

type Policy = components['schemas']['RuntimeRetentionPolicy']
type ProjectPolicy = components['schemas']['ProjectRuntimeRetention']

const messages = {
  en: {
    organization: 'Organization runtime retention',
    project: 'Project runtime retention',
    help: 'Old event details become daily numerical snapshots. Both periods start at observation time; complete UTC days are processed automatically.',
    inherit: 'Inherit from organization',
    custom: 'Use project policy',
    mode: 'Policy source',
    enabled: 'Automatically delete expired history',
    days: 'Keep total runtime history (days)',
    rawDays: 'Keep event details (days)',
    forever: 'Keep snapshots forever',
    sourceOrganization: 'Current policy: inherited from organization',
    sourceProject: 'Current policy: project override',
    off: 'Automatic cleanup is disabled.',
    effective: 'Current retention:',
    preview: 'After saving, the organization policy will apply:',
    dayUnit: 'days',
    save: 'Save retention settings',
    saving: 'Saving…',
    saved: 'Retention settings saved.',
    warning:
      'Changes apply to existing history on the next automatic pass. Deleted details and snapshots cannot be restored. Extending retention or disabling cleanup never restores data or reopens closed history. Whole-day processing may retain data for less than one additional day.',
    owner: 'Only organization owners can change these settings.',
    loading: 'Loading retention settings…',
    failed: 'Retention settings could not be loaded',
    saveFailed: 'Retention settings could not be saved',
    invalid:
      'Enter whole numbers from 1 to 3650. Total history must be at least as long as event details, or forever.',
  },
  ru: {
    organization: 'Хранение runtime-событий организации',
    project: 'Хранение runtime-событий проекта',
    help: 'Старые подробности событий заменяются дневными числовыми сводками. Оба срока считаются от времени наблюдения; полные сутки UTC обрабатываются автоматически.',
    inherit: 'Наследовать от организации',
    custom: 'Собственная политика проекта',
    mode: 'Источник политики',
    enabled: 'Автоматически удалять истёкшую историю',
    days: 'Хранить всю историю runtime (дней)',
    rawDays: 'Хранить подробности событий (дней)',
    forever: 'Хранить сводки вечно',
    sourceOrganization: 'Текущая политика: из настроек организации',
    sourceProject: 'Текущая политика: настройки проекта',
    off: 'Автоматическая очистка отключена.',
    effective: 'Текущий срок хранения:',
    preview: 'После сохранения будет действовать политика организации:',
    dayUnit: 'дней',
    save: 'Сохранить настройки хранения',
    saving: 'Сохранение…',
    saved: 'Настройки хранения сохранены.',
    warning:
      'Изменения применяются к накопленной истории при следующей автоматической обработке. Удалённые подробности и сводки восстановить нельзя. Увеличение срока или отключение очистки не возвращает данные и не открывает закрытую историю. Обработка полных суток может сохранять данные менее чем на один дополнительный день.',
    owner: 'Изменять настройки могут только владельцы организации.',
    loading: 'Загрузка настроек хранения…',
    failed: 'Не удалось загрузить настройки хранения',
    saveFailed: 'Не удалось сохранить настройки хранения',
    invalid:
      'Введите целые числа от 1 до 3650. Общая история должна храниться не меньше подробностей, либо вечно.',
  },
}

export function RuntimeRetention({ projectId }: { projectId?: string | undefined }) {
  const auth = useAuthentication()
  if (auth.status !== 'authenticated') return null
  return (
    <RetentionPanel
      organizationId={auth.context.organization.id}
      projectId={projectId}
      canEdit={auth.context.role === 'owner'}
    />
  )
}

function RetentionPanel({
  organizationId,
  projectId,
  canEdit,
}: {
  organizationId: string
  projectId?: string | undefined
  canEdit: boolean
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const { locale } = useLocalization()
  const t = messages[locale]
  const path = projectId
    ? `/api/v1/projects/${encodeURIComponent(projectId)}/runtime-retention`
    : `/api/v1/organizations/${encodeURIComponent(organizationId)}/runtime-retention`
  const query = useQuery({
    queryKey: ['runtime-retention', organizationId, projectId ?? null],
    queryFn: async ({ signal }) => {
      if (projectId) {
        const data = await api.get<ProjectPolicy>(path, { protected: true, signal })
        return { policy: data.effective, source: data.source, inheritedPolicy: data.inherited }
      }
      const policy = await api.get<Policy>(path, { protected: true, signal })
      return { policy, source: 'organization' as const, inheritedPolicy: policy }
    },
  })
  const save = useMutation({
    mutationFn: async (policy: Policy | null) => {
      if (policy === null) await api.delete(path, { protected: true })
      else await api.put<Policy | ProjectPolicy>(path, { protected: true, body: policy })
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['runtime-retention', organizationId] }),
  })
  if (query.isPending) return <Loading label={t.loading} />
  if (query.isError)
    return <ErrorState title={t.failed} error={query.error} onRetry={() => void query.refetch()} />
  return (
    <Card className="mt-6 space-y-4">
      <h2 className="text-xl font-semibold">{projectId ? t.project : t.organization}</h2>
      <p className="text-sm text-slate-400">{t.help}</p>
      {projectId && (
        <p>{query.data.source === 'organization' ? t.sourceOrganization : t.sourceProject}</p>
      )}
      <p>
        {t.effective} <PolicySummary policy={query.data.policy} />
        {!query.data.policy.enabled && <> {t.off}</>}
      </p>
      {canEdit ? (
        <RetentionForm
          key={JSON.stringify(query.data)}
          policy={query.data.policy}
          inheritedPolicy={query.data.inheritedPolicy}
          inherited={!!projectId && query.data.source === 'organization'}
          project={!!projectId}
          pending={save.isPending}
          onSave={(policy) => save.mutate(policy)}
        />
      ) : (
        <p className="text-sm text-slate-400">{t.owner}</p>
      )}
      {save.isError && <ErrorState title={t.saveFailed} error={save.error} />}
      <p role="status">{save.isSuccess ? t.saved : ''}</p>
    </Card>
  )
}

function RetentionForm({
  policy,
  inheritedPolicy,
  inherited,
  project,
  pending,
  onSave,
}: {
  policy: Policy
  inheritedPolicy: Policy
  inherited: boolean
  project: boolean
  pending: boolean
  onSave: (policy: Policy | null) => void
}) {
  const { locale } = useLocalization()
  const t = messages[locale]
  const id = useId()
  const [inherit, setInherit] = useState(inherited)
  const [enabled, setEnabled] = useState(policy.enabled)
  const [days, setDays] = useState(String(policy.history_days ?? 365))
  const [rawDays, setRawDays] = useState(String(policy.raw_days))
  const [forever, setForever] = useState(policy.history_days === null)
  const [invalid, setInvalid] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const historyDays = Number(days)
    const raw = Number(rawDays)
    if (
      !inherit &&
      (!rawDays.trim() ||
        !Number.isInteger(raw) ||
        raw < 1 ||
        raw > 3650 ||
        (!forever &&
          (!days.trim() ||
            !Number.isInteger(historyDays) ||
            historyDays < raw ||
            historyDays > 3650)))
    ) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onSave(inherit ? null : { enabled, raw_days: raw, history_days: forever ? null : historyDays })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        {project && (
          <label className="block" htmlFor={id + '-source'}>
            {t.mode}
            <select
              id={id + '-source'}
              value={inherit ? 'organization' : 'project'}
              onChange={(event) => setInherit(event.target.value === 'organization')}
              className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
            >
              <option value="organization">{t.inherit}</option>
              <option value="project">{t.custom}</option>
            </select>
          </label>
        )}
        {inherit && (
          <p role="status">
            {t.preview} <PolicySummary policy={inheritedPolicy} />
            {!inheritedPolicy.enabled && <> {t.off}</>}
          </p>
        )}
        {!inherit && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              {t.enabled}
            </label>
            <label className="block" htmlFor={id + '-raw-days'}>
              {t.rawDays}
              <input
                id={id + '-raw-days'}
                type="number"
                min={1}
                max={3650}
                step={1}
                required
                value={rawDays}
                aria-invalid={invalid}
                aria-describedby={invalid ? id + '-invalid' : undefined}
                onChange={(event) => {
                  setRawDays(event.target.value)
                  setInvalid(false)
                }}
                className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={forever}
                onChange={(event) => {
                  setForever(event.target.checked)
                  setInvalid(false)
                }}
              />
              {t.forever}
            </label>
            {!forever && (
              <label className="block" htmlFor={id + '-days'}>
                {t.days}
                <input
                  id={id + '-days'}
                  type="number"
                  min={1}
                  max={3650}
                  step={1}
                  required
                  value={days}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? id + '-invalid' : undefined}
                  onChange={(event) => {
                    setDays(event.target.value)
                    setInvalid(false)
                  }}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                />
              </label>
            )}
          </>
        )}
        {invalid && (
          <p id={id + '-invalid'} role="alert">
            {t.invalid}
          </p>
        )}
        <p className="text-sm text-amber-200">{t.warning}</p>
        <Button type="submit">{pending ? t.saving : t.save}</Button>
      </fieldset>
    </form>
  )
}

function PolicySummary({ policy }: { policy: Policy }) {
  const { locale } = useLocalization()
  const t = messages[locale]
  return (
    <span>
      {t.rawDays}: {policy.raw_days}; {t.days}:{' '}
      {policy.history_days === null ? t.forever : policy.history_days}
    </span>
  )
}
