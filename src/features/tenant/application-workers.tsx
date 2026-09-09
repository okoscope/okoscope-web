import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { readinessOptions } from '../../shared/api/onboarding'
import { applicationAgentHealthOptions } from '../../shared/api/queries'
import type {
  AgentDiagnosticDelta,
  AgentHealthRange,
  ApplicationAgentHealth,
  ApplicationWorker,
  ConnectionReadiness,
} from '../../shared/api/types'
import { useApi } from '../../shared/api/context'
import { useT, type MessageKey } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { formatTimestamp } from './format'
import { AgentHealthTimeline } from './agent-health-timeline'
import { getReadinessPresentation, getReadinessTone } from './readiness-presentation'

export type WorkerSignalState = 'fresh' | 'stale' | 'unknown'

export function workerSignalState(
  worker: ApplicationWorker,
  now: number,
  staleAfterSeconds?: number,
): WorkerSignalState {
  const lastSeenAt = Date.parse(worker.agent_last_seen_at)
  if (!Number.isFinite(lastSeenAt) || staleAfterSeconds === undefined) return 'unknown'
  return now - lastSeenAt > staleAfterSeconds * 1_000 ? 'stale' : 'fresh'
}

export function isWorkerInactive(
  worker: ApplicationWorker,
  now: number,
  staleAfterSeconds?: number,
) {
  return workerSignalState(worker, now, staleAfterSeconds) === 'stale'
}

const toneClasses = {
  positive: 'border-emerald-800/80 bg-emerald-950/30',
  warning: 'border-amber-800/80 bg-amber-950/30',
  critical: 'border-rose-800/80 bg-rose-950/30',
  neutral: 'border-slate-700 bg-slate-900/40',
} as const

function HealthSummary({ readiness }: { readiness: ConnectionReadiness }) {
  const t = useT()
  const presentation = getReadinessPresentation(readiness)
  const timestamps = [
    [t('credentialLastUsed'), readiness.credential_last_used_at],
    [t('firstEvent'), readiness.first_event_at],
    [t('lastEvent'), readiness.last_event_at],
  ] as const

  return (
    <Card
      className={`mb-4 ${toneClasses[getReadinessTone(readiness.state)]}`}
      aria-labelledby="observation-health-heading"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="eyebrow">{t('observationHealth')}</p>
      <h3 id="observation-health-heading" className="mt-2 text-xl font-semibold">
        {t(presentation.statusKey)}
      </h3>
      <p className="mt-2 text-sm text-slate-300">{t(presentation.explanationKey)}</p>
      {presentation.actionKey && (
        <p className="mt-2 text-sm font-medium text-cyan-200">{t(presentation.actionKey)}</p>
      )}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <dt className="text-slate-500">{t('reportingNodes')}</dt>
          <dd className="mt-1 font-mono text-slate-200">{readiness.reporting_nodes}</dd>
        </div>
        {timestamps.map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-1 font-mono text-slate-200">
              {value ? formatTimestamp(value) : t('notReported')}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-slate-500">{t('signalFreshnessWindow')}</dt>
          <dd className="mt-1 font-mono text-slate-200">
            {t('secondsCount', { count: readiness.stale_after_seconds })}
          </dd>
        </div>
      </dl>
      {presentation.actionInOnboarding && (
        <Button asChild className="mt-4" variant="outline">
          <Link to="/onboarding">{t('reviewAgentSetup')}</Link>
        </Button>
      )}
    </Card>
  )
}

const ranges = ['1h', '6h', '24h'] as const
const knownCapabilities: Record<string, MessageKey> = {
  'process.exec/v1': 'agentCapability_processExec',
  'process.exit/v1': 'agentCapability_processExit',
  'container.lifecycle/v1': 'agentCapability_containerLifecycle',
  'network.connect/v1': 'agentCapability_networkConnect',
  'network.listen/v1': 'agentCapability_networkListen',
  'network.accept/v1': 'agentCapability_networkAccept',
  'network.dns.udp/v1': 'agentCapability_networkDnsUdp',
  'network.dns.tcp/v1': 'agentCapability_networkDnsTcp',
  'file.activity.syscall-path/v1': 'agentCapability_fileActivitySyscallPath',
  'kubernetes.release-discovery/v1': 'agentCapability_kubernetesReleaseDiscovery',
  'onboarding.status/v1': 'agentCapability_onboardingStatus',
  'resource.utilization/v1': 'agentCapability_resourceUtilization',
}

function CapabilityList({ capabilities }: { capabilities: string[] }) {
  const t = useT()
  if (!capabilities.length) return <p className="text-sm text-slate-500">{t('notReported')}</p>
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {capabilities.map((capability) => (
        <li key={capability}>
          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-200">
            {knownCapabilities[capability] ? t(knownCapabilities[capability]) : capability}
          </span>
        </li>
      ))}
    </ul>
  )
}

function DiagnosticSummary({ diagnostics }: { diagnostics: AgentDiagnosticDelta[] }) {
  const t = useT()
  return diagnostics.length ? (
    <ul className="mt-2 space-y-1 text-sm text-amber-200">
      {diagnostics.map((diagnostic) => (
        <li key={diagnostic.category}>
          {t(`agentDiagnostic_${diagnostic.category}`)}: +{diagnostic.delta}
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-2 text-sm text-slate-500">{t('agentNoRecentDiagnostics')}</p>
  )
}

function AgentCard({
  agent,
  range,
  readiness,
}: {
  agent: ApplicationAgentHealth
  range: NonNullable<AgentHealthRange>
  readiness?: ConnectionReadiness
}) {
  const t = useT()
  const noEvents = !agent.first_event_at && !agent.last_event_at
  const readinessPresentation = readiness ? getReadinessPresentation(readiness) : undefined
  const platform = [agent.architecture, agent.kernel_release].filter(Boolean).join(' · ')

  return (
    <Card className="overflow-hidden" data-agent-id={agent.agent_id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{agent.node_name}</h3>
          <p className="text-sm text-slate-400">
            {agent.cluster_name} · {t('agentVersion')} {agent.agent_version}
          </p>
          <p className="text-xs text-slate-500">{platform || t('notReported')}</p>
        </div>
        <span
          className="rounded-full border border-slate-700 px-3 py-1 text-sm font-semibold"
          data-stream-state={agent.stream_state}
        >
          {t(`agentStream_${agent.stream_state}`)}
        </span>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-200">{t('agentApplicationStream')}</h4>
          <p className="mt-2 text-sm text-slate-400">{t('agentStreamHelp')}</p>
          <p className="mt-2 text-sm text-slate-300">
            {t('lastAgentSignal')}:{' '}
            {agent.last_signal_at ? formatTimestamp(agent.last_signal_at) : t('notReported')}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">
            {t('agentAdvertisedCapabilities')}
          </h4>
          <p className="mt-2 text-sm text-slate-400">{t('agentCapabilitiesHelp')}</p>
          <CapabilityList capabilities={agent.capabilities} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">{t('agentAcceptedEvidence')}</h4>
          {noEvents ? (
            <>
              <p className="mt-2 text-sm text-slate-400">{t('agentNoAcceptedEvidence')}</p>
              {readinessPresentation && (
                <p className="mt-2 text-sm text-cyan-200">
                  {t(readinessPresentation.explanationKey)}{' '}
                  {readinessPresentation.actionKey && t(readinessPresentation.actionKey)}
                </p>
              )}
            </>
          ) : (
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">{t('firstApplicationObservation')}</dt>
                <dd>
                  {agent.first_event_at ? formatTimestamp(agent.first_event_at) : t('notReported')}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('lastApplicationObservation')}</dt>
                <dd>
                  {agent.last_event_at ? formatTimestamp(agent.last_event_at) : t('notReported')}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-200">{t('agentHeartbeatHistory')}</h4>
          <p className="text-xs text-slate-500">
            {agent.coverage.complete
              ? t('agentCoverageComplete')
              : t('agentCoveragePartial', { time: formatTimestamp(agent.coverage.available_from) })}
          </p>
        </div>
        <AgentHealthTimeline points={agent.timeline} range={range} />
      </div>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <h4 className="text-sm font-semibold text-slate-200">{t('agentNodeDiagnostics')}</h4>
        <p className="mt-1 text-xs text-slate-500">{t('agentNodeDiagnosticScope')}</p>
        <DiagnosticSummary diagnostics={agent.node_diagnostics} />
      </div>
    </Card>
  )
}

export function ApplicationWorkers({
  projectId,
  applicationId,
}: {
  projectId: string
  applicationId: string
}) {
  const t = useT()
  const api = useApi()
  const [range, setRange] = useState<NonNullable<AgentHealthRange>>('1h')
  const query = useInfiniteQuery(
    applicationAgentHealthOptions(api, projectId, applicationId, range),
  )
  const readiness = useQuery(readinessOptions(api, projectId, applicationId))

  if (query.isPending) return <Loading label={t('agentHealthLoading')} />
  if (query.isError && !query.data)
    return (
      <ErrorState
        title={t('agentHealthLoadFailed')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )

  const agents = query.data.pages
    .flatMap((page) => page.items)
    .filter(
      (agent, index, all) => all.findIndex((item) => item.agent_id === agent.agent_id) === index,
    )

  return (
    <section aria-labelledby="agent-health-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="agent-health-heading" className="text-2xl font-semibold">
            {t('agentHealth')}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t('agentHealthHelp')}</p>
        </div>
        <div role="group" aria-label={t('agentTimelineRange')} className="flex gap-1">
          {ranges.map((item) => (
            <Button
              key={item}
              variant={range === item ? 'default' : 'outline'}
              aria-pressed={range === item}
              onClick={() => setRange(item)}
            >
              {t(`agentRange_${item}`)}
            </Button>
          ))}
        </div>
      </div>
      {query.isFetching && !query.isPending && (
        <p role="status" className="mb-3 text-sm text-slate-400">
          {t('agentHealthRefreshing')}
        </p>
      )}
      {readiness.isPending && <Loading label={t('checkingObservationHealth')} />}
      {readiness.data && <HealthSummary readiness={readiness.data} />}
      {readiness.isError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-900/70 p-3 text-sm text-amber-200"
        >
          {t('observationHealthUnavailable')}
        </p>
      )}
      {query.isRefetchError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-900/70 p-3 text-sm text-amber-200"
        >
          {t('agentHealthRefreshFailed')}
        </p>
      )}
      {!agents.length ? (
        <Card>
          <p className="text-slate-400">{t('agentHealthEmpty')}</p>
          {readiness.data ? (
            <>
              <p className="mt-2 text-sm text-slate-300">
                {t(getReadinessPresentation(readiness.data).explanationKey)}
              </p>
              {getReadinessPresentation(readiness.data).actionKey && (
                <p className="mt-2 text-sm font-medium text-cyan-200">
                  {t(getReadinessPresentation(readiness.data).actionKey!)}
                </p>
              )}
              {getReadinessPresentation(readiness.data).actionInOnboarding && (
                <Button asChild className="mt-4">
                  <Link to="/onboarding">{t('reviewAgentSetup')}</Link>
                </Button>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{t('workerFreshnessUnknownHelp')}</p>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.agent_id}
              agent={agent}
              range={range}
              {...(readiness.data ? { readiness: readiness.data } : {})}
            />
          ))}
        </div>
      )}
      {query.hasNextPage && (
        <Button
          className="mt-5"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? t('loadingMoreAgents') : t('loadMoreAgents')}
        </Button>
      )}
    </section>
  )
}
