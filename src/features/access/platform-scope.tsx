import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState, type FormEvent, type ReactNode } from 'react'
import {
  addPlatformProjectMember,
  createPlatformApplication,
  createPlatformOrganizationInvitation,
  createPlatformProject,
  createPlatformProjectInvitation,
  getPlatformOrganization,
  issuePlatformApplicationCredential,
  listEligiblePlatformProjectMembers,
  listPlatformApplicationCredentials,
  listPlatformApplications,
  listPlatformOrganizationInvitations,
  listPlatformOrganizationMembers,
  listPlatformProjectInvitations,
  listPlatformProjectMembers,
  listPlatformProjects,
  removePlatformOrganizationMember,
  removePlatformProjectMember,
  resendPlatformInvitation,
  revokePlatformApplicationCredential,
  revokePlatformInvitation,
  updatePlatformOrganizationMember,
  updatePlatformProjectMember,
} from '../../shared/api/access'
import { useApi } from '../../shared/api/context'
import type { Invitation, OrganizationRole, ProjectRole } from '../../shared/api/types'
import { useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'

const text = {
  en: {
    members: 'Members',
    invitations: 'Invitations',
    projects: 'Projects',
    applications: 'Applications',
    credentials: 'Credentials',
    invite: 'Send invitation',
    email: 'Email',
    role: 'Role',
    language: 'Email language',
    create: 'Create',
    add: 'Add member',
    remove: 'Remove',
    resend: 'Resend',
    revoke: 'Revoke',
    save: 'Save role',
    pending: 'Working…',
    empty: 'Nothing here yet.',
    failed: 'Operation failed',
    back: 'Platform',
    name: 'Name',
    slug: 'Slug',
    effective: 'Effective access: {role} from {source}',
    eligible: 'Eligible Organization member',
    issue: 'Issue credential',
    credentialName: 'Credential name',
    token: 'Save this one-time token now',
    active: 'Active',
    revoked: 'Revoked',
    pendingOwner: 'This Organization is waiting for its first owner to accept the invitation.',
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    confirmRemove: 'Remove this access? This takes effect immediately.',
    confirmRevoke: 'Revoke this item? It cannot be used again.',
  },
  ru: {
    members: 'Участники',
    invitations: 'Приглашения',
    projects: 'Проекты',
    applications: 'Приложения',
    credentials: 'Учётные данные',
    invite: 'Отправить приглашение',
    email: 'Почта',
    role: 'Роль',
    language: 'Язык письма',
    create: 'Создать',
    add: 'Добавить участника',
    remove: 'Удалить',
    resend: 'Отправить ещё раз',
    revoke: 'Отозвать',
    save: 'Сохранить роль',
    pending: 'Выполняется…',
    empty: 'Здесь пока ничего нет.',
    failed: 'Операция не выполнена',
    back: 'Платформа',
    name: 'Название',
    slug: 'Slug',
    effective: 'Действующий доступ: {role}, источник: {source}',
    eligible: 'Доступный участник организации',
    issue: 'Выпустить учётные данные',
    credentialName: 'Название учётных данных',
    token: 'Сохраните этот одноразовый токен сейчас',
    active: 'Активен',
    revoked: 'Отозван',
    pendingOwner: 'Организация ждёт, когда первый владелец примет приглашение.',
    owner: 'Владелец',
    admin: 'Администратор',
    member: 'Участник',
    confirmRemove: 'Удалить этот доступ? Изменение вступит в силу сразу.',
    confirmRevoke: 'Отозвать этот объект? Использовать его снова будет нельзя.',
  },
} as const

export function PlatformOrganizationConsole({ organizationId }: { organizationId: string }) {
  const api = useApi(),
    client = useQueryClient(),
    { locale } = useLocalization(),
    ui = text[locale]
  const [error, setError] = useState<unknown>(null)
  const organization = useQuery({
    queryKey: ['platform', 'organization', organizationId],
    queryFn: () => getPlatformOrganization(api, organizationId),
  })
  const members = useQuery({
    queryKey: ['platform', 'organization', organizationId, 'members'],
    queryFn: () => listPlatformOrganizationMembers(api, organizationId),
  })
  const invitations = useQuery({
    queryKey: ['platform', 'organization', organizationId, 'invitations'],
    queryFn: () => listPlatformOrganizationInvitations(api, organizationId),
  })
  const projects = useQuery({
    queryKey: ['platform', 'organization', organizationId, 'projects'],
    queryFn: () => listPlatformProjects(api, organizationId),
  })
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ['platform', 'organization', organizationId] })
  const act = async (operation: () => Promise<unknown>) => {
    setError(null)
    try {
      await operation()
      refresh()
    } catch (failure) {
      setError(failure)
    }
  }
  if (organization.isPending) return <Loading label={ui.pending} />
  if (organization.isError) return <ErrorState title={ui.failed} error={organization.error} />
  return (
    <div className="space-y-7">
      <Link className="text-cyan-300 underline" to="/platform">
        ← {ui.back}
      </Link>
      <header>
        <p className="eyebrow">{organization.data.status}</p>
        <h1 className="mt-2 text-4xl font-semibold">{organization.data.name}</h1>
        <p className="font-mono text-sm text-slate-500">{organization.data.slug}</p>
        {organization.data.status === 'pending_owner' && (
          <p className="mt-3 text-amber-200">{ui.pendingOwner}</p>
        )}
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
              <MemberRow
                key={member.user_id}
                name={member.display_name}
                email={member.email}
                role={member.role}
                roles={['owner', 'admin', 'member']}
                canChange={member.can_change_role}
                canRemove={member.can_remove}
                ui={ui}
                onRole={(role) =>
                  void act(() =>
                    updatePlatformOrganizationMember(
                      api,
                      organizationId,
                      member.user_id,
                      role as OrganizationRole,
                    ),
                  )
                }
                onRemove={() =>
                  void act(() =>
                    removePlatformOrganizationMember(api, organizationId, member.user_id),
                  )
                }
              />
            ))}
            {!members.data.items.length && <p>{ui.empty}</p>}
          </div>
        )}
      </Card>
      <InvitationManager
        scope="organization"
        scopeId={organizationId}
        platform
        invitations={invitations.data?.items ?? []}
        loading={invitations.isPending}
        error={invitations.error}
        onRefresh={refresh}
      />
      <ResourceCreator
        title={ui.projects}
        ui={ui}
        onCreate={(body) => createPlatformProject(api, organizationId, body)}
        onDone={refresh}
      >
        {projects.isPending ? (
          <Loading label={ui.pending} />
        ) : projects.isError ? (
          <ErrorState title={ui.failed} error={projects.error} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.data.items.map((project) => (
              <Link
                key={project.id}
                className="rounded-xl border border-slate-700 p-4 hover:border-cyan-700"
                to="/platform/organizations/$organizationId/projects/$projectId"
                params={{ organizationId, projectId: project.id }}
              >
                <strong>{project.name}</strong>
                <p className="font-mono text-xs text-slate-500">{project.slug}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {format(ui.effective, {
                    role: project.effective_project_role ?? '—',
                    source: project.effective_access_source ?? '—',
                  })}
                </p>
              </Link>
            ))}
            {!projects.data.items.length && <p>{ui.empty}</p>}
          </div>
        )}
      </ResourceCreator>
    </div>
  )
}

export function PlatformProjectConsole({
  organizationId,
  projectId,
}: {
  organizationId: string
  projectId: string
}) {
  const api = useApi(),
    client = useQueryClient(),
    { locale } = useLocalization(),
    ui = text[locale]
  const [error, setError] = useState<unknown>(null),
    [selected, setSelected] = useState(''),
    [role, setRole] = useState<ProjectRole>('member'),
    [createdToken, setCreatedToken] = useState<string | null>(null)
  const projectPage = useQuery({
    queryKey: ['platform', 'organization', organizationId, 'projects'],
    queryFn: () => listPlatformProjects(api, organizationId),
  })
  const members = useQuery({
    queryKey: ['platform', 'project', projectId, 'members'],
    queryFn: () => listPlatformProjectMembers(api, projectId),
  })
  const eligible = useQuery({
    queryKey: ['platform', 'project', projectId, 'eligible'],
    queryFn: () => listEligiblePlatformProjectMembers(api, projectId),
  })
  const invitations = useQuery({
    queryKey: ['platform', 'project', projectId, 'invitations'],
    queryFn: () => listPlatformProjectInvitations(api, projectId),
  })
  const applications = useQuery({
    queryKey: ['platform', 'project', projectId, 'applications'],
    queryFn: () => listPlatformApplications(api, projectId),
  })
  const project = projectPage.data?.items.find((item) => item.id === projectId)
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ['platform', 'project', projectId] })
  const act = async (operation: () => Promise<unknown>) => {
    setError(null)
    try {
      await operation()
      refresh()
    } catch (failure) {
      setError(failure)
    }
  }
  return (
    <div className="space-y-7">
      <Link
        className="text-cyan-300 underline"
        to="/platform/organizations/$organizationId"
        params={{ organizationId }}
      >
        ← {ui.back}
      </Link>
      <header>
        <p className="eyebrow">{ui.projects}</p>
        <h1 className="mt-2 text-4xl font-semibold">{project?.name ?? projectId}</h1>
        {project && (
          <p className="mt-2 text-sm text-slate-400">
            {format(ui.effective, {
              role: project.effective_project_role ?? '—',
              source: project.effective_access_source ?? '—',
            })}
          </p>
        )}
      </header>
      {error !== null && <ErrorState title={ui.failed} error={error} />}
      <Card>
        <h2 className="text-2xl font-semibold">{ui.members}</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            void act(async () => {
              await addPlatformProjectMember(api, projectId, selected, role)
              setSelected('')
            })
          }}
        >
          <label>
            {ui.eligible}
            <select
              className="input mt-1"
              required
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="" />
              {eligible.data?.items.map((item) => (
                <option key={item.user_id} value={item.user_id}>
                  {item.display_name} · {item.email}
                </option>
              ))}
            </select>
          </label>
          <RoleSelect
            ui={ui}
            value={role}
            roles={['admin', 'member']}
            onChange={(value) => setRole(value as ProjectRole)}
          />
          <Button disabled={!selected}>{ui.add}</Button>
        </form>
        {members.isPending ? (
          <Loading label={ui.pending} />
        ) : members.isError ? (
          <ErrorState title={ui.failed} error={members.error} />
        ) : (
          <div className="mt-4 space-y-3">
            {members.data.items.map((member) => (
              <MemberRow
                key={member.user_id}
                name={member.display_name}
                email={member.email}
                role={member.role}
                roles={['admin', 'member']}
                canChange={member.can_change_role}
                canRemove={member.can_remove}
                ui={ui}
                onRole={(next) =>
                  void act(() =>
                    updatePlatformProjectMember(
                      api,
                      projectId,
                      member.user_id,
                      next as ProjectRole,
                    ),
                  )
                }
                onRemove={() =>
                  void act(() => removePlatformProjectMember(api, projectId, member.user_id))
                }
              />
            ))}
            {!members.data.items.length && <p>{ui.empty}</p>}
          </div>
        )}
      </Card>
      <InvitationManager
        scope="project"
        scopeId={projectId}
        platform
        invitations={invitations.data?.items ?? []}
        loading={invitations.isPending}
        error={invitations.error}
        onRefresh={refresh}
      />
      <ResourceCreator
        title={ui.applications}
        ui={ui}
        onCreate={async (body) => {
          const result = await createPlatformApplication(api, projectId, body)
          setCreatedToken(result.credential.token)
          return result
        }}
        onDone={refresh}
      >
        {createdToken && (
          <p
            role="status"
            className="mb-4 break-all rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-amber-100"
          >
            <strong>{ui.token}</strong>
            <br />
            <code>{createdToken}</code>
          </p>
        )}
        {applications.isPending ? (
          <Loading label={ui.pending} />
        ) : applications.isError ? (
          <ErrorState title={ui.failed} error={applications.error} />
        ) : (
          <div className="space-y-4">
            {applications.data.items.map((application) => (
              <article key={application.id} className="rounded-xl border border-slate-700 p-4">
                <h3 className="font-semibold">{application.name}</h3>
                <p className="font-mono text-xs text-slate-500">{application.slug}</p>
                <CredentialManager projectId={projectId} applicationId={application.id} />
              </article>
            ))}
            {!applications.data.items.length && <p>{ui.empty}</p>}
          </div>
        )}
      </ResourceCreator>
    </div>
  )
}

function InvitationManager({
  scope,
  scopeId,
  platform,
  invitations,
  loading,
  error,
  onRefresh,
}: {
  scope: 'organization' | 'project'
  scopeId: string
  platform?: boolean
  invitations: Invitation[]
  loading: boolean
  error: unknown
  onRefresh: () => void
}) {
  const api = useApi(),
    { locale } = useLocalization(),
    ui = text[locale]
  const [email, setEmail] = useState(''),
    [role, setRole] = useState<OrganizationRole | ProjectRole>('member'),
    [failure, setFailure] = useState<unknown>(null),
    [pending, setPending] = useState(false)
  const create = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setFailure(null)
    try {
      if (scope === 'organization')
        await createPlatformOrganizationInvitation(api, scopeId, {
          email: email.trim(),
          role,
          locale,
        })
      else
        await createPlatformProjectInvitation(api, scopeId, {
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
      if (platform) {
        if (action === 'resend') await resendPlatformInvitation(api, scope, scopeId, id)
        else await revokePlatformInvitation(api, scope, scopeId, id)
      }
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
      <form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(event) => void create(event)}>
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
        <RoleSelect
          ui={ui}
          value={role}
          roles={scope === 'organization' ? ['owner', 'admin', 'member'] : ['admin', 'member']}
          onChange={(value) => setRole(value as OrganizationRole | ProjectRole)}
        />
        <label>
          {ui.language}
          <select className="input mt-1" value={locale} disabled>
            <option>{locale}</option>
          </select>
        </label>
        <Button className="self-end sm:w-fit" disabled={pending}>
          {pending ? ui.pending : ui.invite}
        </Button>
      </form>
      {(failure !== null || error != null) && (
        <div className="mt-4">
          <ErrorState title={ui.failed} error={failure ?? error} />
        </div>
      )}
      {loading ? (
        <Loading label={ui.pending} />
      ) : (
        <div className="mt-5 space-y-3">
          {invitations.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-slate-700 p-4 sm:flex-row"
            >
              <div>
                <strong>{item.recipient_email}</strong>
                <p className="text-sm text-slate-400">
                  {item.role} · {item.status}
                </p>
              </div>
              {item.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => void mutate('resend', item.id)}
                  >
                    {ui.resend}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(ui.confirmRevoke)) void mutate('revoke', item.id)
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

function CredentialManager({
  projectId,
  applicationId,
}: {
  projectId: string
  applicationId: string
}) {
  const api = useApi(),
    client = useQueryClient(),
    { locale } = useLocalization(),
    ui = text[locale]
  const [name, setName] = useState(''),
    [token, setToken] = useState<string | null>(null),
    [error, setError] = useState<unknown>(null)
  const query = useQuery({
    queryKey: ['platform', 'project', projectId, 'application', applicationId, 'credentials'],
    queryFn: () => listPlatformApplicationCredentials(api, projectId, applicationId),
  })
  const act = async (operation: () => Promise<unknown>) => {
    setError(null)
    try {
      await operation()
      await client.invalidateQueries({
        queryKey: ['platform', 'project', projectId, 'application', applicationId, 'credentials'],
      })
    } catch (failure) {
      setError(failure)
    }
  }
  return (
    <section className="mt-4">
      <h4 className="font-medium">{ui.credentials}</h4>
      {token && (
        <p className="mt-2 break-all text-sm text-amber-200">
          <strong>{ui.token}</strong>
          <br />
          <code>{token}</code>
        </p>
      )}
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          void act(async () => {
            const result = await issuePlatformApplicationCredential(api, projectId, applicationId, {
              name,
            })
            setToken(result.token)
            setName('')
          })
        }}
      >
        <label className="sr-only" htmlFor={`credential-${applicationId}`}>
          {ui.credentialName}
        </label>
        <input
          id={`credential-${applicationId}`}
          className="input"
          required
          pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,63}"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button>{ui.issue}</Button>
      </form>
      {error !== null && <ErrorState title={ui.failed} error={error} />}
      {query.data?.items.map((credential) => (
        <div key={credential.id} className="mt-2 flex justify-between gap-3 text-sm">
          <span>
            {credential.name} · {credential.revoked_at ? ui.revoked : ui.active} ·{' '}
            {credential.token_hint}
          </span>
          {!credential.revoked_at && (
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm(ui.confirmRevoke))
                  void act(() =>
                    revokePlatformApplicationCredential(
                      api,
                      projectId,
                      applicationId,
                      credential.id,
                    ),
                  )
              }}
            >
              {ui.revoke}
            </Button>
          )}
        </div>
      ))}
    </section>
  )
}

function ResourceCreator({
  title,
  ui,
  onCreate,
  onDone,
  children,
}: {
  title: string
  ui: typeof text.en | typeof text.ru
  onCreate: (body: { name: string; slug: string }) => Promise<unknown>
  onDone: () => void
  children: ReactNode
}) {
  const [name, setName] = useState(''),
    [slug, setSlug] = useState(''),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState(false)
  return (
    <Card>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <form
        className="my-4 grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault()
          setPending(true)
          setError(null)
          void onCreate({ name: name.trim(), slug })
            .then(() => {
              setName('')
              setSlug('')
              onDone()
            })
            .catch(setError)
            .finally(() => setPending(false))
        }}
      >
        <label>
          {ui.name}
          <input
            className="input mt-1"
            required
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
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </label>
        <Button className="self-end sm:w-fit" disabled={pending}>
          {pending ? ui.pending : ui.create}
        </Button>
      </form>
      {error !== null && <ErrorState title={ui.failed} error={error} />} {children}
    </Card>
  )
}

function MemberRow({
  name,
  email,
  role,
  roles,
  canChange,
  canRemove,
  ui,
  onRole,
  onRemove,
}: {
  name: string
  email: string
  role: string
  roles: readonly string[]
  canChange: boolean
  canRemove: boolean
  ui: typeof text.en | typeof text.ru
  onRole: (role: string) => void
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
            <RoleSelect ui={ui} value={next} roles={roles} onChange={setNext} />
            <Button variant="outline" disabled={next === role} onClick={() => onRole(next)}>
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
function RoleSelect({
  ui,
  value,
  roles,
  onChange,
}: {
  ui: typeof text.en | typeof text.ru
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
        {roles.map((item) => (
          <option key={item} value={item}>
            {ui[item as 'owner' | 'admin' | 'member']}
          </option>
        ))}
      </select>
    </label>
  )
}
const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
const format = (value: string, values: Record<string, string>) =>
  value.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '')
