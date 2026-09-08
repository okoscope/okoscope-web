import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { useApi } from '../../shared/api/context'
import { ApiClientError } from '../../shared/api/client'
import {
  createInstallation,
  installationMetadataOptions,
  installationsOptions,
  onboardingKeys,
  readinessOptions,
  replaceInstallationCredential,
  updateInstallation,
} from '../../shared/api/onboarding'
import { applicationsOptions, projectsOptions, queryKeys } from '../../shared/api/queries'
import { createApplication, createProject } from '../../shared/api/provisioning'
import type {
  AgentInstallationMetadata,
  ApplicationInstallation,
  ConnectionReadiness,
  IssuedInstallationCredential,
} from '../../shared/api/types'
import { useAuthentication } from '../../shared/auth/session'
import { useT } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { CodeExample } from '../../shared/ui/code-example'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { NamedResourceForm } from './entity-form'

type Secret = { installation: ApplicationInstallation; credential: IssuedInstallationCredential }
type WizardProject = { id: string; name: string; slug: string }
type WizardApplication = { id: string; project_id: string; name: string; slug: string }

export function OnboardingWizard() {
  const api = useApi(),
    t = useT(),
    auth = useAuthentication(),
    client = useQueryClient(),
    navigate = useNavigate()
  const projects = useInfiniteQuery(projectsOptions(api))
  const [project, setProject] = useState<WizardProject | null>(null)
  const [application, setApplication] = useState<WizardApplication | null>(null)
  const applications = useInfiniteQuery(applicationsOptions(api, project?.id ?? ''))
  const addProject = useMutation({
    mutationFn: (body: { name: string; slug: string }) => {
      if (auth.status !== 'authenticated') throw new Error('Authentication required')
      return createProject(api, auth.context.organization.id, body)
    },
    onSuccess: (item) => {
      setProject(item)
      void client.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
  const addApplication = useMutation({
    mutationFn: (body: { name: string; slug: string }) => createApplication(api, project!.id, body),
    onSuccess: (item) => {
      setApplication(item.application)
      void client.invalidateQueries({
        queryKey: queryKeys.applications(item.application.project_id),
      })
    },
  })
  if (projects.isPending) return <Loading label={t('loadingProjects')} />
  if (projects.isError)
    return (
      <ErrorState
        title={t('projectsLoadFailed')}
        error={projects.error}
        onRetry={() => void projects.refetch()}
      />
    )
  if (!project)
    return (
      <EntityStep
        title={t('projectLabel')}
        items={projects.data.pages.flatMap((page) => page.items)}
        select={setProject}
        skip={() => void navigate({ to: '/projects' })}
      >
        <NamedResourceForm
          label={t('projectLabel')}
          pending={addProject.isPending}
          error={addProject.error}
          onSubmit={addProject.mutate}
        />
      </EntityStep>
    )
  if (applications.isPending) return <Loading label={t('loadingApplications')} />
  if (applications.isError)
    return (
      <ErrorState
        title={t('applicationsLoadFailed')}
        error={applications.error}
        onRetry={() => void applications.refetch()}
      />
    )
  if (!application)
    return (
      <>
        <Button variant="ghost" onClick={() => setProject(null)}>
          {t('back')}
        </Button>
        <EntityStep
          title={t('applicationLabel')}
          items={applications.data.pages.flatMap((page) => page.items)}
          select={setApplication}
          skip={() =>
            void navigate({ to: '/projects/$projectId', params: { projectId: project.id } })
          }
        >
          <NamedResourceForm
            label={t('applicationLabel')}
            pending={addApplication.isPending}
            error={addApplication.error}
            onSubmit={addApplication.mutate}
          />
        </EntityStep>
      </>
    )
  return <InstallationStep projectId={project.id} application={application} />
}

function EntityStep<T extends { id: string; name: string; slug: string }>({
  title,
  items,
  select,
  skip,
  children,
}: {
  title: string
  items: T[]
  select: (item: T) => void
  skip: () => void
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <div className="space-y-5">
      <Card>
        <p className="eyebrow">{t('onboarding')}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t('guidedSetupTitle')}</h1>
        <p className="mt-3 text-slate-400">{t('guidedSetupHelp')}</p>
      </Card>
      <Card>
        <h2 className="text-2xl font-semibold">{title}</h2>
        {items.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <Button key={item.id} variant="outline" onClick={() => select(item)}>
                {item.name}{' '}
                <span className="ml-2 font-mono text-xs text-slate-400">{item.slug}</span>
              </Button>
            ))}
          </div>
        )}
        <div className="mt-5">{children}</div>
        <Button className="mt-4" variant="ghost" onClick={skip}>
          {t('setupLater')}
        </Button>
      </Card>
    </div>
  )
}

function InstallationStep({
  projectId,
  application,
}: {
  projectId: string
  application: WizardApplication
}) {
  const api = useApi(),
    t = useT(),
    client = useQueryClient()
  const metadata = useQuery(installationMetadataOptions(api)),
    installations = useQuery(installationsOptions(api, projectId, application.id))
  const [secret, setSecret] = useState<Secret | null>(null),
    [cluster, setCluster] = useState('production'),
    [namespace, setNamespace] = useState('default'),
    [mode, setMode] = useState<'name' | 'labels'>('name'),
    [name, setName] = useState(application.slug),
    [labels, setLabels] = useState(`app=${application.slug}`)
  useEffect(() => () => setSecret(null), [])
  const create = useMutation({
    mutationFn: () =>
      createInstallation(api, projectId, application.id, {
        cluster_name: cluster.trim(),
        workload:
          mode === 'name'
            ? { namespace: namespace.trim(), kind: 'Deployment', name: name.trim() }
            : { namespace: namespace.trim(), kind: 'Deployment', labels: parseLabels(labels) },
      }),
    onSuccess: (item) => {
      setSecret({ installation: item.installation, credential: item.credential })
      void client.invalidateQueries({
        queryKey: onboardingKeys.installations(projectId, application.id),
      })
    },
  })
  const replace = useMutation({
    mutationFn: (item: ApplicationInstallation) =>
      replaceInstallationCredential(api, projectId, application.id, item.id),
    onSuccess: (credential, installation) => setSecret({ installation, credential }),
  })
  if (metadata.isPending || installations.isPending)
    return <Loading label={t('loadingInstallation')} />
  if (metadata.isError) {
    const unavailable =
      metadata.error instanceof ApiClientError &&
      metadata.error.detail.kind === 'api' &&
      metadata.error.detail.code === 'installation_metadata_unavailable'
    return (
      <div className="space-y-4">
        <ErrorState
          title={t('installationMetadataFailed')}
          error={metadata.error}
          onRetry={() => void metadata.refetch()}
          headingLevel={1}
        />
        {unavailable && (
          <Card>
            <p className="text-sm text-slate-300">{t('installationMetadataOperatorHelp')}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/docs/$slug" params={{ slug: 'self-hosting' }}>
                {t('installationMetadataDocs')}
              </Link>
            </Button>
          </Card>
        )}
      </div>
    )
  }
  if (installations.isError)
    return (
      <ErrorState
        title={t('installationsLoadFailed')}
        error={installations.error}
        onRetry={() => void installations.refetch()}
      />
    )
  if (secret)
    return (
      <InstallCommands
        projectId={projectId}
        application={application}
        secret={secret}
        metadata={metadata.data}
      />
    )
  const existing = installations.data.items[0]
  if (existing)
    return (
      <div className="space-y-5">
        <Card>
          <h1 className="text-3xl font-semibold">{t('resumeInstallation')}</h1>
          <p className="mt-3 text-slate-400">{t('tokenCannotRecover')}</p>
          <Button
            className="mt-5"
            disabled={replace.isPending}
            onClick={() => replace.mutate(existing)}
          >
            {replace.isPending ? t('issuing') : t('replaceCredential')}
          </Button>
          {replace.error && (
            <ErrorState title={t('credentialReplacementFailed')} error={replace.error} />
          )}
        </Card>
        <Readiness projectId={projectId} application={application} installation={existing} />
        <ReviseInstallation
          projectId={projectId}
          applicationId={application.id}
          installation={existing}
        />
      </div>
    )
  const valid =
    cluster.trim() &&
    namespace.trim() &&
    (mode === 'name' ? name.trim() : Object.keys(parseLabels(labels)).length)
  return (
    <Card>
      <p className="eyebrow">{t('connectAgent')}</p>
      <h1 className="mt-2 text-3xl font-semibold">{application.name}</h1>
      <p className="mt-3 text-slate-400">{t('workloadHelp')}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label={t('clusterName')}
          help={t('clusterNameHelp')}
          value={cluster}
          onChange={setCluster}
        />
        <Field
          label={t('workloadNamespace')}
          help={t('workloadNamespaceHelp')}
          value={namespace}
          onChange={setNamespace}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant={mode === 'name' ? 'default' : 'outline'} onClick={() => setMode('name')}>
          {t('deploymentName')}
        </Button>
        <Button
          variant={mode === 'labels' ? 'default' : 'outline'}
          onClick={() => setMode('labels')}
        >
          {t('labelSelector')}
        </Button>
      </div>
      <div className="mt-4">
        <Field
          label={mode === 'name' ? t('deploymentName') : t('labelsExample')}
          help={mode === 'name' ? t('deploymentNameHelp') : t('labelSelectorHelp')}
          value={mode === 'name' ? name : labels}
          onChange={mode === 'name' ? setName : setLabels}
        />
      </div>
      <p className="mt-4 text-sm text-slate-400">
        {t('agentContract', {
          chart: metadata.data.chart_version,
          endpoint: metadata.data.grpc_endpoint,
        })}
      </p>
      <details className="mt-4 rounded-lg border border-slate-700 p-3 text-sm">
        <summary className="cursor-pointer font-medium">{t('advancedObservation')}</summary>
        <p className="mt-2 text-slate-400">{t('safeObservationDefaults')}</p>
      </details>
      {create.error && <ErrorState title={t('installationCreateFailed')} error={create.error} />}
      <Button
        className="mt-5"
        disabled={create.isPending || !valid}
        onClick={() => create.mutate()}
      >
        {create.isPending ? t('creating') : t('createInstallation')}
      </Button>
    </Card>
  )
}

function ReviseInstallation({
  projectId,
  applicationId,
  installation,
}: {
  projectId: string
  applicationId: string
  installation: ApplicationInstallation
}) {
  const api = useApi(),
    t = useT(),
    client = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [cluster, setCluster] = useState(installation.cluster_name)
  const [namespace, setNamespace] = useState(installation.workload_namespace)
  const [name, setName] = useState(installation.workload_name ?? '')
  const [labels, setLabels] = useState(
    Object.entries(installation.workload_labels ?? {})
      .map(([key, value]) => `${key}=${value}`)
      .join(','),
  )
  const [mode, setMode] = useState<'name' | 'labels'>(
    installation.workload_name ? 'name' : 'labels',
  )
  const update = useMutation({
    mutationFn: () =>
      updateInstallation(api, projectId, applicationId, installation.id, {
        cluster_name: cluster.trim(),
        workload:
          mode === 'name'
            ? { namespace: namespace.trim(), kind: 'Deployment', name: name.trim() }
            : { namespace: namespace.trim(), kind: 'Deployment', labels: parseLabels(labels) },
      }),
    onSuccess: () => {
      setEditing(false)
      void client.invalidateQueries({
        queryKey: onboardingKeys.installations(projectId, applicationId),
      })
      void client.invalidateQueries({
        queryKey: onboardingKeys.readiness(projectId, applicationId),
      })
    },
  })
  if (!editing)
    return (
      <Button variant="outline" onClick={() => setEditing(true)}>
        {t('reviseSelector')}
      </Button>
    )
  return (
    <Card>
      <h2 className="text-xl font-semibold">{t('reviseSelector')}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label={t('clusterName')}
          help={t('clusterNameHelp')}
          value={cluster}
          onChange={setCluster}
        />
        <Field
          label={t('workloadNamespace')}
          help={t('workloadNamespaceHelp')}
          value={namespace}
          onChange={setNamespace}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant={mode === 'name' ? 'default' : 'outline'} onClick={() => setMode('name')}>
          {t('deploymentName')}
        </Button>
        <Button
          variant={mode === 'labels' ? 'default' : 'outline'}
          onClick={() => setMode('labels')}
        >
          {t('labelSelector')}
        </Button>
      </div>
      <div className="mt-4">
        <Field
          label={mode === 'name' ? t('deploymentName') : t('labelsExample')}
          help={mode === 'name' ? t('deploymentNameHelp') : t('labelSelectorHelp')}
          value={mode === 'name' ? name : labels}
          onChange={mode === 'name' ? setName : setLabels}
        />
      </div>
      {update.error && <ErrorState title={t('installationUpdateFailed')} error={update.error} />}
      <div className="mt-5 flex gap-2">
        <Button disabled={update.isPending} onClick={() => update.mutate()}>
          {update.isPending ? t('saving') : t('save')}
        </Button>
        <Button variant="ghost" disabled={update.isPending} onClick={() => setEditing(false)}>
          {t('cancel')}
        </Button>
      </div>
    </Card>
  )
}

function InstallCommands({
  projectId,
  application,
  secret,
  metadata,
}: {
  projectId: string
  application: WizardApplication
  secret: Secret
  metadata: AgentInstallationMetadata
}) {
  const t = useT(),
    [announcement, setAnnouncement] = useState(''),
    item = secret.installation
  const selector = item.workload_name
    ? `--set 'workloads[0].name'=${quote(item.workload_name)}`
    : Object.entries(item.workload_labels ?? {})
        .map(
          ([key, value]) =>
            `--set-string 'workloads[0].labels.${key.replaceAll('.', '\\.')}'=${quote(value)}`,
        )
        .join(' \\\n  ')
  const secretCommand = `kubectl create namespace ${quote(metadata.namespace)} --dry-run=client -o yaml | kubectl apply -f -\nprintf "Okoscope application token: " >&2\nIFS= read -rs OKOSCOPE_TOKEN\nprintf '\\n' >&2\nkubectl -n ${quote(metadata.namespace)} create secret generic ${quote(metadata.credential_secret_name)} --from-literal=${quote(metadata.credential_secret_key)}="$OKOSCOPE_TOKEN" --dry-run=client -o yaml | kubectl apply -f -\nunset OKOSCOPE_TOKEN`
  const caOption =
    metadata.tls_mode === 'custom_ca' && metadata.ca_secret_name && metadata.ca_secret_key
      ? ` --set server.caSecret.name=${quote(metadata.ca_secret_name)} --set server.caSecret.key=${quote(metadata.ca_secret_key)}`
      : ''
  const helmCommand = `helm upgrade --install okoscope-agent ${metadata.chart_reference} --version ${quote(metadata.chart_version)} --namespace ${quote(metadata.namespace)} --set server.endpoint=${quote(metadata.grpc_endpoint)}${caOption} --set identity.clusterName=${quote(item.cluster_name)} --set 'workloads[0].namespace'=${quote(item.workload_namespace)} --set 'workloads[0].kind'=Deployment ${selector} --set 'workloads[0].credentialSecret.name'=${quote(metadata.credential_secret_name)} --set 'workloads[0].credentialSecret.key'=${quote(metadata.credential_secret_key)}`
  return (
    <div className="space-y-5">
      <Card className="border-amber-700/70">
        <h1 className="text-3xl font-semibold">{t('installAgent')}</h1>
        <p role="alert" className="mt-3 font-semibold text-amber-200">
          {t('tokenShownOnce')}
        </p>
        {metadata.tls_mode === 'custom_ca' && metadata.ca_secret_name && metadata.ca_secret_key && (
          <p className="mt-3 text-sm text-slate-300">
            {t('customCaRequired', {
              name: metadata.ca_secret_name,
              key: metadata.ca_secret_key,
            })}
          </p>
        )}
        <Command
          label={t('applicationToken')}
          value={secret.credential.token}
          copyLabel={t('copyToken')}
          announce={setAnnouncement}
        />
        <div className="mt-5 min-w-0">
          <h2 className="font-medium">{t('createKubernetesSecret')}</h2>
          <CodeExample
            language="bash"
            code={secretCommand}
            labels={{
              copy: t('copyCommand'),
              copied: t('commandCopied'),
              copyFailed: t('copyFailed'),
              example: t('createKubernetesSecret'),
            }}
          />
        </div>
        <p className="mt-4 text-sm text-slate-300">
          {t('separateAgentInstallationHelp')}{' '}
          <Link
            to="/docs/$slug"
            params={{ slug: 'quick-start' }}
            hash="deploy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 underline underline-offset-4"
          >
            {t('separateAgentInstallationDocs')}
          </Link>
        </p>
        <div className="mt-5 min-w-0">
          <h2 className="font-medium">{t('installWithHelm')}</h2>
          <CodeExample
            language="bash"
            code={helmCommand}
            labels={{
              copy: t('copyCommand'),
              copied: t('commandCopied'),
              copyFailed: t('copyFailed'),
              example: t('installWithHelm'),
            }}
          />
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </Card>
      <Readiness projectId={projectId} application={application} installation={item} />
      <ReviseInstallation
        projectId={projectId}
        applicationId={application.id}
        installation={item}
      />
    </div>
  )
}

function Readiness({
  projectId,
  application,
  installation,
}: {
  projectId: string
  application: WizardApplication
  installation: ApplicationInstallation
}) {
  const query = useQuery(readinessOptions(useApi(), projectId, application.id)),
    t = useT(),
    navigate = useNavigate()
  if (query.isPending) return <Loading label={t('checkingConnection')} />
  if (query.isError)
    return (
      <ErrorState
        title={t('connectionCheckFailed')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  const ready = query.data.state === 'receiving_events'
  return (
    <Card>
      <p className="eyebrow">{t('connectionProgress')}</p>
      <h2 className="mt-2 text-2xl font-semibold">{t(`readiness_${query.data.state}`)}</h2>
      <p className="mt-3 text-slate-400">{readinessHelp(query.data, installation, t)}</p>
      <p className="mt-3 font-mono text-xs text-slate-400">
        {installation.workload_namespace}/
        {installation.workload_name ?? JSON.stringify(installation.workload_labels)}
      </p>
      <p className="mt-4 text-sm">
        {t('reportingNodes')}: {query.data.reporting_nodes}
      </p>
      {ready && (
        <Button
          className="mt-5"
          onClick={() =>
            void navigate({
              to: '/projects/$projectId/applications/$applicationId',
              params: { projectId, applicationId: application.id },
            })
          }
        >
          {t('openApplication')}
        </Button>
      )}
    </Card>
  )
}

const parseLabels = (value: string): Record<string, string> => {
  const labels: Record<string, string> = {}
  for (const pair of value.split(',')) {
    const [key, item] = pair.trim().split('=', 2)
    if (key && item) labels[key] = item
  }
  return labels
}
const quote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`
function Field({
  label,
  help,
  value,
  onChange,
}: {
  label: string
  help: string
  value: string
  onChange: (value: string) => void
}) {
  const inputId = useId(),
    helpId = useId()
  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={helpId}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span id={helpId} className="mt-1 block text-xs font-normal leading-5 text-slate-400">
        {help}
      </span>
    </div>
  )
}
function Command({
  label,
  value,
  copyLabel,
  announce,
}: {
  label: string
  value: string
  copyLabel: string
  announce: (value: string) => void
}) {
  const t = useT()
  return (
    <div className="mt-5">
      <h2 className="font-medium">{label}</h2>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-cyan-200">
        {value}
      </pre>
      <Button
        className="mt-2"
        onClick={() =>
          void navigator.clipboard.writeText(value).then(
            () => announce(t('commandCopied')),
            () => announce(t('copyFailed')),
          )
        }
      >
        {copyLabel}
      </Button>
    </div>
  )
}
function readinessHelp(
  state: ConnectionReadiness,
  installation: ApplicationInstallation,
  t: ReturnType<typeof useT>,
) {
  return state.state === 'workload_not_matched'
    ? t('readinessSelectorHelp', {
        namespace: installation.workload_namespace,
        selector: installation.workload_name ?? JSON.stringify(installation.workload_labels),
      })
    : t(`readinessHelp_${state.state}`)
}
