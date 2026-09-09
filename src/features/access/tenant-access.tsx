import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import {
  addProjectMember,
  createOrganizationInvitation,
  createProjectInvitation,
  listOrganizationAudit,
  listOrganizationInvitations,
  listOrganizationMembers,
  listEligibleProjectMembers,
  listProjectInvitations,
  listProjectMembers,
  removeOrganizationMember,
  removeProjectMember,
  resendInvitation,
  revokeInvitation,
  updateOrganizationMember,
  updateProjectMember,
} from '../../shared/api/access'
import { useApi } from '../../shared/api/context'
import { projectOptions } from '../../shared/api/queries'
import type { Invitation, OrganizationRole, ProjectRole } from '../../shared/api/types'
import { useAuthentication } from '../../shared/auth/session'
import { useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'

const copy = {
  en: {
    title: 'Organization access',
    projectTitle: 'Project access',
    help: 'Roles and available actions come from the current server session.',
    inherited:
      'Organization owners and administrators inherit access to every Project. Members see only Projects assigned to them.',
    members: 'Members',
    invitations: 'Invitations',
    audit: 'Audit',
    date: 'Date',
    email: 'Email',
    role: 'Role',
    invite: 'Invite',
    pending: 'Working…',
    failed: 'Access operation failed',
    empty: 'Nothing here yet.',
    save: 'Save role',
    remove: 'Remove',
    resend: 'Resend',
    revoke: 'Revoke',
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    source: 'Your effective access is {role}, inherited from {source}.',
    expires: 'Expires {date}',
    returnProject: 'Back to Project',
    addMember: 'Add Organization member',
    eligibleMember: 'Eligible Organization member',
    chooseMember: 'Choose a member',
    chooseRole: 'Choose a role',
    denied: 'You do not have permission to manage this access scope.',
    confirmRemove: 'Remove this access? This takes effect immediately.',
    confirmRevoke: 'Revoke this invitation? Its link will stop working.',
    scrollableAudit: 'Scrollable Organization access audit',
  },
  ru: {
    title: 'Доступ организации',
    projectTitle: 'Доступ проекта',
    help: 'Роли и доступные действия получены из текущего серверного сеанса.',
    inherited:
      'Владельцы и администраторы организации наследуют доступ ко всем проектам. Участники видят только назначенные им проекты.',
    members: 'Участники',
    invitations: 'Приглашения',
    audit: 'Аудит',
    date: 'Дата',
    email: 'Почта',
    role: 'Роль',
    invite: 'Пригласить',
    pending: 'Выполняется…',
    failed: 'Не удалось изменить доступ',
    empty: 'Здесь пока ничего нет.',
    save: 'Сохранить роль',
    remove: 'Удалить',
    resend: 'Отправить ещё раз',
    revoke: 'Отозвать',
    owner: 'Владелец',
    admin: 'Администратор',
    member: 'Участник',
    source: 'Ваш действующий доступ: {role}, источник: {source}.',
    expires: 'Действует до {date}',
    returnProject: 'Назад к проекту',
    addMember: 'Добавить участника организации',
    eligibleMember: 'Доступный участник организации',
    chooseMember: 'Выберите участника',
    chooseRole: 'Выберите роль',
    denied: 'У вас нет права управлять доступом в этой области.',
    confirmRemove: 'Удалить этот доступ? Изменение вступит в силу сразу.',
    confirmRevoke: 'Отозвать приглашение? Ссылка из письма перестанет работать.',
    scrollableAudit: 'Прокручиваемый аудит доступа организации',
  },
} as const

export function OrganizationAccess() {
  const api = useApi(),
    auth = useAuthentication(),
    client = useQueryClient(),
    { locale } = useLocalization(),
    ui = copy[locale]
  const [error, setError] = useState<unknown>(null)
  const authorized =
    auth.status === 'authenticated' &&
    auth.context.active_organization !== null &&
    auth.context.capabilities.manage_organization
  const organizationId = authorized ? auth.context.active_organization!.id : ''
  const members = useQuery({
    queryKey: ['organization-access', organizationId, 'members'],
    queryFn: () => listOrganizationMembers(api, organizationId),
    enabled: authorized,
  })
  const invitations = useQuery({
    queryKey: ['organization-access', organizationId, 'invitations'],
    queryFn: () => listOrganizationInvitations(api, organizationId),
    enabled: authorized,
  })
  const audit = useQuery({
    queryKey: ['organization-access', organizationId, 'audit'],
    queryFn: () => listOrganizationAudit(api, organizationId),
    enabled: authorized,
  })
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ['organization-access', organizationId] })
  const act = async (operation: () => Promise<unknown>) => {
    setError(null)
    try {
      await operation()
      refresh()
    } catch (failure) {
      setError(failure)
    }
  }
  if (!authorized || auth.status !== 'authenticated')
    return <ErrorState title={ui.title} message={ui.denied} error={null} />
  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">{auth.context.active_organization!.name}</p>
        <h1 className="mt-2 text-4xl font-semibold">{ui.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-400">
          {ui.help} {ui.inherited}
        </p>
      </header>
      {error !== null && <ErrorState title={ui.failed} error={error} />}
      <Card>
        <h2 className="text-2xl font-semibold">{ui.members}</h2>
        {members.isPending ? (
          <Loading label={ui.pending} />
        ) : members.isError ? (
          <ErrorState title={ui.failed} error={members.error} />
        ) : (
          <div className="mt-4 space-y-3">
            {members.data.items.map((member) => (
              <Member
                key={member.user_id}
                name={member.display_name}
                email={member.email}
                role={member.role}
                roles={auth.context.capabilities.organization_roles_grantable}
                canChange={member.can_change_role}
                canRemove={member.can_remove}
                ui={ui}
                onChange={(role) =>
                  void act(() =>
                    updateOrganizationMember(
                      api,
                      organizationId,
                      member.user_id,
                      role as OrganizationRole,
                    ),
                  )
                }
                onRemove={() =>
                  void act(() => removeOrganizationMember(api, organizationId, member.user_id))
                }
              />
            ))}
            {!members.data.items.length && <p>{ui.empty}</p>}
          </div>
        )}
      </Card>
      <InvitationPanel
        scope="organization"
        scopeId={organizationId}
        roles={auth.context.capabilities.organization_roles_grantable}
        invitations={invitations.data?.items ?? []}
        loading={invitations.isPending}
        error={invitations.error}
        onRefresh={refresh}
      />
      <Card>
        <h2 className="text-2xl font-semibold">{ui.audit}</h2>
        {audit.isPending ? (
          <Loading label={ui.pending} />
        ) : audit.isError ? (
          <ErrorState title={ui.failed} error={audit.error} />
        ) : (
          <div
            className="mt-4 overflow-x-auto"
            role="region"
            tabIndex={0}
            aria-label={ui.scrollableAudit}
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>{ui.audit}</th>
                  <th>{ui.role}</th>
                  <th>{ui.date}</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.items.map((entry) => (
                  <tr className="border-t border-slate-800" key={entry.id}>
                    <td className="py-3">{entry.action}</td>
                    <td>
                      {entry.previous_role ?? '—'} → {entry.new_role ?? '—'}
                    </td>
                    <td>{new Date(entry.created_at).toLocaleString(locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!audit.data.items.length && <p>{ui.empty}</p>}
          </div>
        )}
      </Card>
    </div>
  )
}

export function ProjectAccess({ projectId }: { projectId: string }) {
  const api = useApi(),
    client = useQueryClient(),
    { locale } = useLocalization(),
    ui = copy[locale]
  const [error, setError] = useState<unknown>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const project = useQuery(projectOptions(api, projectId))
  const members = useQuery({
    queryKey: ['project-access', projectId, 'members'],
    queryFn: () => listProjectMembers(api, projectId),
    enabled: project.data?.capabilities.manage_project_members === true,
  })
  const eligibleMembers = useQuery({
    queryKey: ['project-access', projectId, 'eligible-members'],
    queryFn: () => listEligibleProjectMembers(api, projectId),
    enabled: project.data?.capabilities.manage_project_members === true,
  })
  const invitations = useQuery({
    queryKey: ['project-access', projectId, 'invitations'],
    queryFn: () => listProjectInvitations(api, projectId),
    enabled: project.data?.capabilities.manage_project_members === true,
  })
  const refresh = () => void client.invalidateQueries({ queryKey: ['project-access', projectId] })
  const act = async (operation: () => Promise<unknown>) => {
    setError(null)
    try {
      await operation()
      refresh()
    } catch (failure) {
      setError(failure)
    }
  }
  if (project.isPending) return <Loading label={ui.pending} />
  if (project.isError) return <ErrorState title={ui.failed} error={project.error} />
  if (!project.data.capabilities.manage_project_members)
    return <ErrorState title={ui.projectTitle} message={ui.denied} error={null} />
  return (
    <div className="space-y-7">
      <Link className="text-cyan-300 underline" to="/projects/$projectId" params={{ projectId }}>
        ← {ui.returnProject}
      </Link>
      <header>
        <p className="eyebrow">{project.data.name}</p>
        <h1 className="mt-2 text-4xl font-semibold">{ui.projectTitle}</h1>
        <p className="mt-3 text-slate-400">
          {format(ui.source, {
            role: project.data.effective_project_role ?? '—',
            source: project.data.effective_access_source ?? '—',
          })}
        </p>
      </header>
      {error !== null && <ErrorState title={ui.failed} error={error} />}
      <Card>
        <h2 className="text-2xl font-semibold">{ui.members}</h2>
        {project.data.capabilities.project_roles_grantable.length > 0 && (
          <form
            className="mt-4 grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!selectedUserId || !selectedRole) return
              void act(async () => {
                await addProjectMember(api, projectId, {
                  user_id: selectedUserId,
                  role: selectedRole as ProjectRole,
                })
                setSelectedUserId('')
                setSelectedRole('')
              })
            }}
          >
            <label>
              {ui.eligibleMember}
              <select
                className="input mt-1"
                required
                value={selectedUserId}
                disabled={eligibleMembers.isPending || eligibleMembers.isError}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="">{ui.chooseMember}</option>
                {eligibleMembers.data?.items.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.display_name} · {member.email}
                  </option>
                ))}
              </select>
            </label>
            <Role
              ui={ui}
              value={selectedRole}
              roles={project.data.capabilities.project_roles_grantable}
              onChange={setSelectedRole}
            />
            <Button disabled={!selectedUserId || !selectedRole}>{ui.addMember}</Button>
          </form>
        )}
        {eligibleMembers.isError && (
          <div className="mt-4">
            <ErrorState
              title={ui.failed}
              error={eligibleMembers.error}
              onRetry={() => void eligibleMembers.refetch()}
            />
          </div>
        )}
        {members.isPending ? (
          <Loading label={ui.pending} />
        ) : members.isError ? (
          <ErrorState title={ui.failed} error={members.error} />
        ) : (
          <div className="mt-4 space-y-3">
            {members.data?.items.map((member) => (
              <Member
                key={member.user_id}
                name={member.display_name}
                email={member.email}
                role={member.role}
                roles={project.data.capabilities.project_roles_grantable}
                canChange={member.can_change_role}
                canRemove={member.can_remove}
                ui={ui}
                onChange={(role) =>
                  void act(() =>
                    updateProjectMember(api, projectId, member.user_id, role as ProjectRole),
                  )
                }
                onRemove={() => void act(() => removeProjectMember(api, projectId, member.user_id))}
              />
            ))}
            {!members.data?.items.length && <p>{ui.empty}</p>}
          </div>
        )}
      </Card>
      <InvitationPanel
        scope="project"
        scopeId={projectId}
        roles={project.data.capabilities.project_roles_grantable}
        invitations={invitations.data?.items ?? []}
        loading={invitations.isPending}
        error={invitations.error}
        onRefresh={refresh}
      />
    </div>
  )
}

function InvitationPanel({
  scope,
  scopeId,
  roles,
  invitations,
  loading,
  error,
  onRefresh,
}: {
  scope: 'organization' | 'project'
  scopeId: string
  roles: readonly string[]
  invitations: Invitation[]
  loading: boolean
  error: unknown
  onRefresh: () => void
}) {
  const api = useApi(),
    { locale } = useLocalization(),
    ui = copy[locale],
    [email, setEmail] = useState(''),
    [role, setRole] = useState(roles[0] ?? 'member'),
    [pending, setPending] = useState(false),
    [failure, setFailure] = useState<unknown>(null)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setFailure(null)
    try {
      if (scope === 'organization')
        await createOrganizationInvitation(api, scopeId, {
          email: email.trim(),
          role: role as OrganizationRole,
          locale,
        })
      else
        await createProjectInvitation(api, scopeId, {
          email: email.trim(),
          role: role as ProjectRole,
          locale,
        })
      setEmail('')
      onRefresh()
    } catch (problem) {
      setFailure(problem)
    } finally {
      setPending(false)
    }
  }
  const mutate = async (action: 'resend' | 'revoke', id: string) => {
    setPending(true)
    setFailure(null)
    try {
      if (action === 'resend') await resendInvitation(api, scope, scopeId, id)
      else await revokeInvitation(api, scope, scopeId, id)
      onRefresh()
    } catch (problem) {
      setFailure(problem)
    } finally {
      setPending(false)
    }
  }
  return (
    <Card>
      <h2 className="text-2xl font-semibold">{ui.invitations}</h2>
      {roles.length > 0 && (
        <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(event) => void submit(event)}>
          <label>
            {ui.email}
            <input
              className="input mt-1"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <Role ui={ui} value={role} roles={roles} onChange={setRole} />
          <Button disabled={pending}>{pending ? ui.pending : ui.invite}</Button>
        </form>
      )}
      {(failure !== null || error != null) && (
        <div className="mt-4">
          <ErrorState title={ui.failed} error={failure ?? error} />
        </div>
      )}
      {loading ? (
        <Loading label={ui.pending} />
      ) : (
        <div className="mt-4 space-y-3">
          {invitations.map((invitation) => (
            <article
              className="flex flex-col justify-between gap-3 rounded-xl border border-slate-700 p-4 sm:flex-row"
              key={invitation.id}
            >
              <div>
                <strong>{invitation.recipient_email}</strong>
                <p className="text-sm text-slate-400">
                  {invitation.role} · {invitation.status}
                </p>
                <p className="text-xs text-slate-500">
                  {format(ui.expires, {
                    date: new Date(invitation.expires_at).toLocaleString(locale),
                  })}
                </p>
              </div>
              {invitation.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => void mutate('resend', invitation.id)}
                  >
                    {ui.resend}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(ui.confirmRevoke)) void mutate('revoke', invitation.id)
                    }}
                  >
                    {ui.revoke}
                  </Button>
                </div>
              )}
            </article>
          ))}
          {!invitations.length && <p>{ui.empty}</p>}
        </div>
      )}
    </Card>
  )
}

function Member({
  name,
  email,
  role,
  roles,
  canChange,
  canRemove,
  ui,
  onChange,
  onRemove,
}: {
  name: string
  email: string
  role: string
  roles: readonly string[]
  canChange: boolean
  canRemove: boolean
  ui: typeof copy.en | typeof copy.ru
  onChange: (role: string) => void
  onRemove: () => void
}) {
  const [next, setNext] = useState(role)
  return (
    <article className="flex flex-col justify-between gap-3 rounded-xl border border-slate-700 p-4 lg:flex-row">
      <div>
        <strong>{name}</strong>
        <p className="text-sm text-slate-400">{email}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canChange && (
          <>
            <Role ui={ui} value={next} roles={roles} onChange={setNext} />
            <Button variant="outline" disabled={next === role} onClick={() => onChange(next)}>
              {ui.save}
            </Button>
          </>
        )}
        {canRemove && (
          <Button
            variant="outline"
            onClick={() => {
              if (window.confirm(ui.confirmRemove)) onRemove()
            }}
          >
            {ui.remove}
          </Button>
        )}
      </div>
    </article>
  )
}
function Role({
  ui,
  value,
  roles,
  onChange,
}: {
  ui: typeof copy.en | typeof copy.ru
  value: string
  roles: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      {ui.role}
      <select
        className="input mt-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {value === '' && (
          <option value="" disabled>
            {ui.chooseRole}
          </option>
        )}
        {roles.map((item) => (
          <option key={item} value={item}>
            {ui[item as 'owner' | 'admin' | 'member']}
          </option>
        ))}
      </select>
    </label>
  )
}
const format = (value: string, values: Record<string, string>) =>
  value.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
