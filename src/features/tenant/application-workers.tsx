import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  Boxes,
  CircleGauge,
  CircleHelp,
  Container,
  FileSearch,
  LogIn,
  LogOut,
  Network,
  RadioTower,
  Send,
  Settings2,
  SquareTerminal,
  type LucideIcon,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { readinessOptions } from '../../shared/api/onboarding'
import { applicationAgentHealthOptions } from '../../shared/api/queries'
import type {
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
type CapabilityPresentation = {
  capability: string
  labelKey: MessageKey
  icon: LucideIcon
  matches?: (capability: string) => boolean
}

const knownCapabilities: CapabilityPresentation[] = [
  { capability: 'process.exec/v1', labelKey: 'agentCapability_processExec', icon: SquareTerminal },
  { capability: 'process.exit/v1', labelKey: 'agentCapability_processExit', icon: LogOut },
  {
    capability: 'syscall.*/v1',
    labelKey: 'agentCapability_syscalls',
    icon: Activity,
    matches: (capability) => capability.startsWith('syscall.') && capability.endsWith('/v1'),
  },
  {
    capability: 'container.lifecycle/v1',
    labelKey: 'agentCapability_containerLifecycle',
    icon: Container,
  },
  { capability: 'network.connect/v1', labelKey: 'agentCapability_networkConnect', icon: Send },
  { capability: 'network.listen/v1', labelKey: 'agentCapability_networkListen', icon: RadioTower },
  { capability: 'network.accept/v1', labelKey: 'agentCapability_networkAccept', icon: LogIn },
  { capability: 'network.dns.udp/v1', labelKey: 'agentCapability_networkDnsUdp', icon: Network },
  { capability: 'network.dns.tcp/v1', labelKey: 'agentCapability_networkDnsTcp', icon: Network },
  {
    capability: 'file.activity.syscall-path/v1',
    labelKey: 'agentCapability_fileActivitySyscallPath',
    icon: FileSearch,
  },
  {
    capability: 'kubernetes.release-discovery/v1',
    labelKey: 'agentCapability_kubernetesReleaseDiscovery',
    icon: Boxes,
  },
  {
    capability: 'onboarding.status/v1',
    labelKey: 'agentCapability_onboardingStatus',
    icon: Settings2,
  },
  {
    capability: 'resource.utilization/v1',
    labelKey: 'agentCapability_resourceUtilization',
    icon: CircleGauge,
  },
]

type CapabilityTooltipState = {
  anchor: HTMLElement
  label: string
}

function CapabilityTooltip({
  id,
  tooltip,
}: {
  id: string
  tooltip: CapabilityTooltipState | null
}) {
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return
    const anchor = tooltip.anchor.getBoundingClientRect()
    const tooltipWidth = tooltipRef.current.getBoundingClientRect().width
    const edgeGap = 8
    const centeredLeft = anchor.left + anchor.width / 2
    setPosition({
      left: Math.min(
        Math.max(centeredLeft, tooltipWidth / 2 + edgeGap),
        window.innerWidth - tooltipWidth / 2 - edgeGap,
      ),
      top: anchor.top - edgeGap,
    })
  }, [tooltip])

  if (!tooltip) return null

  return createPortal(
    <span
      ref={tooltipRef}
      id={id}
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-100 shadow-lg"
      style={position}
    >
      {tooltip.label}
    </span>,
    document.body,
  )
}

function CapabilityIcon({
  active,
  capability,
  setFocusedTooltip,
  setHoveredTooltip,
  icon: Icon,
  label,
  tooltipId,
}: {
  active: boolean
  capability: string
  setFocusedTooltip: Dispatch<SetStateAction<CapabilityTooltipState | null>>
  setHoveredTooltip: Dispatch<SetStateAction<CapabilityTooltipState | null>>
  icon: LucideIcon
  label: string
  tooltipId: string
}) {
  const showTooltip = (
    setTooltip: Dispatch<SetStateAction<CapabilityTooltipState | null>>,
    event: React.SyntheticEvent<HTMLElement>,
  ) => setTooltip({ anchor: event.currentTarget, label })
  const hideTooltip = (
    setTooltip: Dispatch<SetStateAction<CapabilityTooltipState | null>>,
    event: React.SyntheticEvent<HTMLElement>,
  ) => {
    const anchor = event.currentTarget
    setTooltip((current) => (current?.anchor === anchor ? null : current))
  }

  return (
    <span
      aria-describedby={tooltipId}
      aria-label={label}
      aria-disabled={active ? undefined : true}
      role="img"
      className={`relative inline-flex size-9 items-center justify-center rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${active ? 'border-cyan-800/80 bg-cyan-950/50 text-cyan-200' : 'border-slate-800 bg-slate-950/40 text-slate-600'}`}
      data-capability={capability}
      data-active={active}
      onBlur={(event) => hideTooltip(setFocusedTooltip, event)}
      onFocus={(event) => showTooltip(setFocusedTooltip, event)}
      onMouseEnter={(event) => showTooltip(setHoveredTooltip, event)}
      onMouseLeave={(event) => hideTooltip(setHoveredTooltip, event)}
      tabIndex={0}
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
    </span>
  )
}

function CapabilityList({ capabilities }: { capabilities: string[] }) {
  const t = useT()
  const tooltipId = useId()
  const [focusedTooltip, setFocusedTooltip] = useState<CapabilityTooltipState | null>(null)
  const [hoveredTooltip, setHoveredTooltip] = useState<CapabilityTooltipState | null>(null)
  const tooltip = focusedTooltip ?? hoveredTooltip
  const knownValues = new Set(
    capabilities.filter((capability) =>
      knownCapabilities.some(
        (presentation) =>
          presentation.capability === capability || presentation.matches?.(capability),
      ),
    ),
  )
  const unknownCapabilities = capabilities.filter((capability) => !knownValues.has(capability))

  return (
    <ul
      className="mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-2"
      aria-label={t('agentAdvertisedCapabilities')}
    >
      {knownCapabilities.map(({ capability, labelKey, icon: Icon, matches }) => {
        const active = capabilities.some((value) => value === capability || matches?.(value))
        const label = t(labelKey)
        return (
          <li key={capability} className="shrink-0">
            <CapabilityIcon
              active={active}
              capability={capability}
              setFocusedTooltip={setFocusedTooltip}
              setHoveredTooltip={setHoveredTooltip}
              icon={Icon}
              label={label}
              tooltipId={tooltipId}
            />
          </li>
        )
      })}
      {unknownCapabilities.map((capability) => (
        <li key={capability} className="shrink-0">
          <CapabilityIcon
            active
            capability={capability}
            setFocusedTooltip={setFocusedTooltip}
            setHoveredTooltip={setHoveredTooltip}
            icon={CircleHelp}
            label={capability}
            tooltipId={tooltipId}
          />
        </li>
      ))}
      <CapabilityTooltip id={tooltipId} tooltip={tooltip} />
    </ul>
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
  const observations = [
    [t('lastAgentSignal'), agent.last_signal_at],
    [t('firstApplicationObservation'), agent.first_event_at],
    [t('lastApplicationObservation'), agent.last_event_at],
  ] as const

  return (
    <Card className="overflow-hidden" data-agent-id={agent.agent_id}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
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

      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        {observations.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 truncate font-mono text-slate-200" title={value ?? undefined}>
              {value ? formatTimestamp(value) : t('notReported')}
            </dd>
          </div>
        ))}
      </dl>
      {noEvents && (
        <p className="mt-3 text-sm text-slate-400">
          {t('agentNoAcceptedEvidence')}{' '}
          {readinessPresentation && t(readinessPresentation.explanationKey)}
        </p>
      )}

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
        <p className="text-sm font-semibold text-slate-300">
          {t('agentAdvertisedCapabilities')} · {agent.capabilities.length}
        </p>
        <CapabilityList capabilities={agent.capabilities} />
      </div>

      <div className="mt-4">
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
