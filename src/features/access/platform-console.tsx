import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { confirmPlatformPrivilege } from '../../shared/api/auth'
import {
  createPlatformOrganization,
  listPlatformAudit,
  listPlatformInvitations,
  listPlatformOrganizations,
  listPlatformUsers,
  setPlatformUserStatus,
  setSuperAdmin,
} from '../../shared/api/access'
import { useApi } from '../../shared/api/context'
import { authenticationSession, useAuthentication } from '../../shared/auth/session'
import { useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'

const copy = {
  en: {
    title: 'Platform console',
    help: 'Manage Organizations and users without impersonating a tenant member.',
    privilege: 'Confirm sensitive actions',
    privilegeHelp:
      'Enter your current password. The elevated window expires separately from your session.',
    confirm: 'Confirm password',
    confirmed: 'Privilege confirmed until {time}.',
    organizations: 'Organizations',
    users: 'Users',
    invitations: 'Invitations',
    audit: 'Access audit',
    empty: 'Nothing on this page.',
    next: 'Next page',
    previous: 'Previous page',
    createOrganization: 'Create Organization',
    name: 'Name',
    slug: 'Slug',
    ownership: 'First owner',
    inviteOwner: 'Invite another owner',
    selfOwner: 'Make me owner',
    ownerEmail: 'Owner email',
    create: 'Create',
    pending: 'Working…',
    pendingOwner: 'Pending owner',
    active: 'Active',
    open: 'Open',
    enabled: 'Enabled',
    disabled: 'Disabled',
    superAdmin: 'Super administrator',
    grant: 'Grant super admin',
    revoke: 'Revoke super admin',
    disable: 'Disable',
    enable: 'Enable',
    verified: 'Verified',
    unverified: 'Unverified',
    failed: 'Platform operation failed',
    expires: 'Expires',
    actor: 'Actor',
    action: 'Action',
    outcome: 'Outcome',
    status: 'Status',
    ownerInvite: 'First owner invite: {status}',
    denied: 'Platform administration requires super administrator access.',
    pagination: 'Pagination',
    confirmChange: 'Apply this account access change?',
    scrollableAudit: 'Scrollable platform access audit',
  },
  ru: {
    title: 'Консоль платформы',
    help: 'Управляйте организациями и пользователями без имперсонации участника.',
    privilege: 'Подтверждение чувствительных действий',
    privilegeHelp: 'Введите текущий пароль. Период повышенных прав истекает отдельно от сеанса.',
    confirm: 'Подтвердить пароль',
    confirmed: 'Повышенные права действуют до {time}.',
    organizations: 'Организации',
    users: 'Пользователи',
    invitations: 'Приглашения',
    audit: 'Аудит доступа',
    empty: 'На этой странице ничего нет.',
    next: 'Следующая страница',
    previous: 'Предыдущая страница',
    createOrganization: 'Создать организацию',
    name: 'Название',
    slug: 'Slug',
    ownership: 'Первый владелец',
    inviteOwner: 'Пригласить другого владельца',
    selfOwner: 'Сделать владельцем меня',
    ownerEmail: 'Почта владельца',
    create: 'Создать',
    pending: 'Выполняется…',
    pendingOwner: 'Ожидает владельца',
    active: 'Активна',
    open: 'Открыть',
    enabled: 'Активен',
    disabled: 'Отключён',
    superAdmin: 'Суперадминистратор',
    grant: 'Выдать роль суперадминистратора',
    revoke: 'Отозвать роль суперадминистратора',
    disable: 'Отключить',
    enable: 'Включить',
    verified: 'Почта подтверждена',
    unverified: 'Почта не подтверждена',
    failed: 'Операция платформы не выполнена',
    expires: 'Действует до',
    actor: 'Инициатор',
    action: 'Действие',
    outcome: 'Результат',
    status: 'Статус',
    ownerInvite: 'Приглашение первого владельца: {status}',
    denied: 'Для управления платформой нужны права суперадминистратора.',
    pagination: 'Постраничная навигация',
    confirmChange: 'Применить это изменение доступа к учётной записи?',
    scrollableAudit: 'Прокручиваемый аудит доступа платформы',
  },
} as const

export function PlatformConsole() {
  const { locale } = useLocalization()
  const ui = copy[locale]
  const auth = useAuthentication()
  if (auth.status !== 'authenticated' || !auth.context.capabilities.manage_platform)
    return <ErrorState title={ui.title} message={ui.denied} error={null} />
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">OKOSCOPE</p>
        <h1 className="mt-2 text-4xl font-semibold">{ui.title}</h1>
        <p className="mt-3 text-slate-400">{ui.help}</p>
      </header>
      <PrivilegeConfirmation />
      <OrganizationPanel />
      <UserPanel />
      <InvitationPanel />
      <AuditPanel />
    </div>
  )
}

function PrivilegeConfirmation() {
  const api = useApi(),
    { locale } = useLocalization(),
    ui = copy[locale]
  const auth = useAuthentication()
  const [password, setPassword] = useState(''),
    [error, setError] = useState<unknown>(null)
  const confirm = useMutation({
    mutationFn: () => confirmPlatformPrivilege(api, { current_password: password }),
    onSuccess: async () => {
      setPassword('')
      const { getCurrentUser } = await import('../../shared/api/auth')
      authenticationSession.authenticate(await getCurrentUser(api))
    },
    onError: setError,
  })
  if (auth.status !== 'authenticated') return null
  return (
    <Card>
      <h2 className="text-xl font-semibold">{ui.privilege}</h2>
      <p className="mt-2 text-sm text-slate-400">{ui.privilegeHelp}</p>
      {auth.context.privileged_until && (
        <p role="status" className="mt-3 text-sm text-emerald-200">
          {format(ui.confirmed, {
            time: new Date(auth.context.privileged_until).toLocaleString(locale),
          })}
        </p>
      )}
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setError(null)
          confirm.mutate()
        }}
      >
        <label className="sr-only" htmlFor="platform-password">
          {ui.confirm}
        </label>
        <input
          id="platform-password"
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button disabled={confirm.isPending}>{confirm.isPending ? ui.pending : ui.confirm}</Button>
      </form>
      {error !== null && (
        <div className="mt-4">
          <ErrorState title={ui.failed} error={error} />
        </div>
      )}
    </Card>
  )
}

function OrganizationPanel() {
  const api = useApi(),
    client = useQueryClient(),
    { locale } = useLocalization(),
    ui = copy[locale]
  const [cursor, setCursor] = useState<string>(),
    [history, setHistory] = useState<(string | undefined)[]>([])
  const [name, setName] = useState(''),
    [slug, setSlug] = useState(''),
    [email, setEmail] = useState(''),
    [selfOwner, setSelfOwner] = useState(false)
  const query = useQuery({
    queryKey: ['platform', 'organizations', cursor],
    queryFn: () => listPlatformOrganizations(api, cursor),
  })
  const create = useMutation({
    mutationFn: () =>
      createPlatformOrganization(api, {
        name: name.trim(),
        slug,
        ownership: selfOwner
          ? { kind: 'self_owner' }
          : { kind: 'invited_owner', email: email.trim(), locale },
      }),
    onSuccess: () => {
      setName('')
      setSlug('')
      setEmail('')
      void client.invalidateQueries({ queryKey: ['platform', 'organizations'] })
    },
  })
  return (
    <Card>
      <h2 className="text-2xl font-semibold">{ui.organizations}</h2>
      <form
        className="mt-5 grid gap-3 md:grid-cols-2"
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          create.mutate()
        }}
      >
        <label>
          {ui.name}
          <input
            className="input mt-1"
            required
            maxLength={120}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setSlug(slugify(event.target.value))
            }}
          />
        </label>
        <label>
          {ui.slug}
          <input
            className="input mt-1"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            maxLength={63}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </label>
        <label>
          {ui.ownership}
          <select
            className="input mt-1"
            value={selfOwner ? 'self' : 'invite'}
            onChange={(event) => setSelfOwner(event.target.value === 'self')}
          >
            <option value="invite">{ui.inviteOwner}</option>
            <option value="self">{ui.selfOwner}</option>
          </select>
        </label>
        {!selfOwner && (
          <label>
            {ui.ownerEmail}
            <input
              className="input mt-1"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        )}
        <Button disabled={create.isPending}>{create.isPending ? ui.pending : ui.create}</Button>
      </form>
      {create.error && (
        <div className="mt-4">
          <ErrorState title={ui.failed} error={create.error} />
        </div>
      )}
      {query.isPending ? (
        <Loading label={ui.pending} />
      ) : query.isError ? (
        <ErrorState title={ui.failed} error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {query.data.items.map((organization) => (
            <article key={organization.id} className="rounded-xl border border-slate-700 p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{organization.name}</h3>
                  <p className="font-mono text-xs text-slate-500">{organization.slug}</p>
                </div>
                <span className="text-xs text-slate-300">
                  {organization.status === 'active' ? ui.active : ui.pendingOwner}
                </span>
              </div>
              {organization.current_owner_invitation && (
                <p className="mt-3 text-xs text-amber-200">
                  {format(ui.ownerInvite, { status: organization.current_owner_invitation.status })}
                </p>
              )}
              <Link
                className="mt-4 inline-block text-cyan-300 underline"
                to="/platform/organizations/$organizationId"
                params={{ organizationId: organization.id }}
              >
                {ui.open}
              </Link>
            </article>
          ))}
          {!query.data.items.length && <p>{ui.empty}</p>}
        </div>
      )}
      {query.data && (
        <PageControls
          ui={ui}
          label={`${ui.organizations}: ${ui.pagination}`}
          next={query.data.next_cursor ?? undefined}
          history={history}
          onNext={(next) => {
            setHistory([...history, cursor])
            setCursor(next)
          }}
          onPrevious={() => {
            const prior = history.at(-1)
            setHistory(history.slice(0, -1))
            setCursor(prior)
          }}
        />
      )}
    </Card>
  )
}

function UserPanel() {
  const api = useApi(),
    client = useQueryClient(),
    { locale } = useLocalization(),
    ui = copy[locale]
  const [cursor, setCursor] = useState<string>(),
    [history, setHistory] = useState<(string | undefined)[]>([]),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['platform', 'users', cursor],
    queryFn: () => listPlatformUsers(api, cursor),
  })
  const act = async (id: string, action: () => Promise<unknown>) => {
    setPending(id)
    setError(null)
    try {
      await action()
      await client.invalidateQueries({ queryKey: ['platform', 'users'] })
    } catch (failure) {
      setError(failure)
    } finally {
      setPending(null)
    }
  }
  return (
    <Card>
      <h2 className="text-2xl font-semibold">{ui.users}</h2>
      {error !== null && <ErrorState title={ui.failed} error={error} />}
      {query.isPending ? (
        <Loading label={ui.pending} />
      ) : query.isError ? (
        <ErrorState title={ui.failed} error={query.error} />
      ) : (
        <div className="mt-5 space-y-3">
          {query.data.items.map((user) => (
            <article key={user.id} className="rounded-xl border border-slate-700 p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row">
                <div>
                  <h3 className="font-semibold">{user.display_name}</h3>
                  <p className="text-sm text-slate-400">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {user.enabled ? ui.enabled : ui.disabled} ·{' '}
                    {user.email_verified ? ui.verified : ui.unverified}
                    {user.is_super_admin ? ` · ${ui.superAdmin}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() => {
                      if (window.confirm(ui.confirmChange))
                        void act(user.id, () => setPlatformUserStatus(api, user.id, !user.enabled))
                    }}
                  >
                    {user.enabled ? ui.disable : ui.enable}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending !== null}
                    onClick={() => {
                      if (window.confirm(ui.confirmChange))
                        void act(user.id, () => setSuperAdmin(api, user.id, !user.is_super_admin))
                    }}
                  >
                    {user.is_super_admin ? ui.revoke : ui.grant}
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {!query.data.items.length && <p>{ui.empty}</p>}
        </div>
      )}
      {query.data && (
        <PageControls
          ui={ui}
          label={`${ui.users}: ${ui.pagination}`}
          next={query.data.next_cursor ?? undefined}
          history={history}
          onNext={(next) => {
            setHistory([...history, cursor])
            setCursor(next)
          }}
          onPrevious={() => {
            const prior = history.at(-1)
            setHistory(history.slice(0, -1))
            setCursor(prior)
          }}
        />
      )}
    </Card>
  )
}

function InvitationPanel() {
  const api = useApi(),
    { locale } = useLocalization(),
    ui = copy[locale]
  const [cursor, setCursor] = useState<string>(),
    [history, setHistory] = useState<(string | undefined)[]>([])
  const query = useQuery({
    queryKey: ['platform', 'invitations', cursor],
    queryFn: () => listPlatformInvitations(api, cursor),
  })
  return (
    <Card>
      <h2 className="text-2xl font-semibold">{ui.invitations}</h2>
      {query.isPending ? (
        <Loading label={ui.pending} />
      ) : query.isError ? (
        <ErrorState title={ui.failed} error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div className="mt-5 space-y-2">
          {query.data.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-700 p-4">
              <strong>{item.recipient_email}</strong>
              <p className="text-sm text-slate-400">
                {item.organization_name}
                {item.project_name ? ` / ${item.project_name}` : ''} · {item.role} · {item.status}
              </p>
              <p className="text-xs text-slate-500">
                {ui.expires}: {new Date(item.expires_at).toLocaleString(locale)}
              </p>
            </div>
          ))}
          {!query.data.items.length && <p>{ui.empty}</p>}
        </div>
      )}
      {query.data && (
        <PageControls
          ui={ui}
          label={`${ui.invitations}: ${ui.pagination}`}
          next={query.data.next_cursor ?? undefined}
          history={history}
          onNext={(next) => {
            setHistory([...history, cursor])
            setCursor(next)
          }}
          onPrevious={() => {
            setCursor(history.at(-1))
            setHistory(history.slice(0, -1))
          }}
        />
      )}
    </Card>
  )
}

function AuditPanel() {
  const api = useApi(),
    { locale } = useLocalization(),
    ui = copy[locale]
  const [cursor, setCursor] = useState<string>(),
    [history, setHistory] = useState<(string | undefined)[]>([])
  const query = useQuery({
    queryKey: ['platform', 'audit', cursor],
    queryFn: () => listPlatformAudit(api, cursor),
  })
  return (
    <Card>
      <h2 className="text-2xl font-semibold">{ui.audit}</h2>
      {query.isPending ? (
        <Loading label={ui.pending} />
      ) : query.isError ? (
        <ErrorState title={ui.failed} error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <div
          className="mt-5 overflow-x-auto"
          role="region"
          tabIndex={0}
          aria-label={ui.scrollableAudit}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>{ui.action}</th>
                <th>{ui.actor}</th>
                <th>{ui.outcome}</th>
                <th>{ui.status}</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="py-3">{item.action}</td>
                  <td>{item.actor_user_id ?? item.actor_kind}</td>
                  <td>{item.outcome}</td>
                  <td>{new Date(item.created_at).toLocaleString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!query.data.items.length && <p>{ui.empty}</p>}
        </div>
      )}
      {query.data && (
        <PageControls
          ui={ui}
          label={`${ui.audit}: ${ui.pagination}`}
          next={query.data.next_cursor ?? undefined}
          history={history}
          onNext={(next) => {
            setHistory([...history, cursor])
            setCursor(next)
          }}
          onPrevious={() => {
            setCursor(history.at(-1))
            setHistory(history.slice(0, -1))
          }}
        />
      )}
    </Card>
  )
}

function PageControls({
  ui,
  label,
  next,
  history,
  onNext,
  onPrevious,
}: {
  ui: typeof copy.en | typeof copy.ru
  label: string
  next: string | undefined
  history: (string | undefined)[]
  onNext: (cursor: string) => void
  onPrevious: () => void
}) {
  return (
    <nav className="mt-5 flex gap-3" aria-label={label}>
      <Button variant="outline" disabled={!history.length} onClick={onPrevious}>
        {ui.previous}
      </Button>
      <Button variant="outline" disabled={!next} onClick={() => next && onNext(next)}>
        {ui.next}
      </Button>
    </nav>
  )
}

const format = (value: string, values: Record<string, string>) =>
  value.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
