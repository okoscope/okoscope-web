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

type Policy = components['schemas']['NotificationRetentionPolicy']
type ProjectPolicy = components['schemas']['ProjectNotificationRetention']

const messages = {
  en: {
    organization: 'Organization notification retention',
    project: 'Project notification retention',
    help: 'One retention period covers completed deliveries, attempts, and manual actions. Active deliveries are preserved.',
    inherit: 'Inherit from organization',
    custom: 'Use project policy',
    mode: 'Policy source',
    enabled: 'Automatically delete expired history',
    days: 'Keep notification history (days)',
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
      'Changes apply to existing history on the next cleanup pass. Enabling cleanup, shortening retention, or returning to an enabled organization policy can permanently delete expired history.',
    owner: 'Only organization owners can change these settings.',
    loading: 'Loading retention settings…',
    failed: 'Retention settings could not be loaded',
    saveFailed: 'Retention settings could not be saved',
    invalid: 'Enter a whole number of days between 1 and 3650.',
  },
  ru: {
    organization: 'Хранение уведомлений организации',
    project: 'Хранение уведомлений проекта',
    help: 'Единый срок для завершённых доставок, попыток отправки и ручных действий. Активные доставки сохраняются.',
    inherit: 'Наследовать от организации',
    custom: 'Собственная политика проекта',
    mode: 'Источник политики',
    enabled: 'Автоматически удалять истёкшую историю',
    days: 'Хранить историю уведомлений (дней)',
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
      'Изменения применяются к существующей истории при следующей очистке. Включение очистки, сокращение срока или возврат к включённой политике организации могут безвозвратно удалить истёкшую историю.',
    owner: 'Изменять настройки могут только владельцы организации.',
    loading: 'Загрузка настроек хранения…',
    failed: 'Не удалось загрузить настройки хранения',
    saveFailed: 'Не удалось сохранить настройки хранения',
    invalid: 'Введите целое число дней от 1 до 3650.',
  },
}

export function NotificationRetention({ projectId }: { projectId?: string | undefined }) {
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
    ? `/api/v1/projects/${encodeURIComponent(projectId)}/notification-retention`
    : `/api/v1/organizations/${encodeURIComponent(organizationId)}/notification-retention`
  const query = useQuery({
    queryKey: ['notification-retention', organizationId, projectId ?? null],
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
      queryClient.invalidateQueries({ queryKey: ['notification-retention', organizationId] }),
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
        {t.effective} {query.data.policy.history_days} {t.dayUnit}
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
  const [days, setDays] = useState(String(policy.history_days))
  const [invalid, setInvalid] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const historyDays = Number(days)
    if (
      !inherit &&
      (!days.trim() || !Number.isInteger(historyDays) || historyDays < 1 || historyDays > 3650)
    ) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onSave(inherit ? null : { enabled, history_days: historyDays })
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
            {t.preview} {inheritedPolicy.history_days} {t.dayUnit}
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
