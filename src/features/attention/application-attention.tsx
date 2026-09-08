import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { applicationAttentionOptions } from '../../shared/api/queries'
import type {
  AttentionPolicyTotals,
  AttentionPriorityItem,
  AttentionReleaseComparison,
} from '../../shared/api/types'
import { inventoryDistributionOptions, inventorySummaryOptions } from '../runtime-inventory/queries'
import { isInventoryDestination } from '../runtime-inventory/components'
import { getNetworkScope } from '../observability/components'
import { runtimeGroupsOptions } from '../observability/queries'
import { useApi } from '../../shared/api/context'
import { formatNumber, useLocalization } from '../../shared/i18n'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { PriorityList, RecommendationList, SnapshotTime } from './components'
import type { ApplicationAttentionSection } from './url-state'

const attentionSections: ApplicationAttentionSection[] = ['overview', 'recommendations', 'priority']

export function ApplicationAttention({
  projectId,
  applicationId,
  section = 'overview',
  onSection = () => undefined,
}: {
  projectId: string
  applicationId: string
  section?: ApplicationAttentionSection
  onSection?: (section: ApplicationAttentionSection) => void
}) {
  const query = useQuery(applicationAttentionOptions(useApi(), projectId, applicationId, '24h'))
  const { t } = useLocalization()
  if (query.isPending) return <Loading label={t('loading')} />
  if (query.isError && !query.data)
    return (
      <ErrorState
        title={t('attentionLoadFailed')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  const summary = query.data
  if (summary.project.id !== projectId || summary.application.id !== applicationId)
    return (
      <ErrorState
        title={t('applicationAttentionMismatch')}
        error={new Error(t('applicationAttentionMismatch'))}
        onRetry={() => void query.refetch()}
      />
    )
  return (
    <section aria-labelledby="application-attention-heading" className="space-y-6">
      <div>
        <h1 id="application-attention-heading" className="text-4xl font-semibold">
          {t('requiresAttention')}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{t('attentionGuidanceHelp')}</p>
        <SnapshotTime value={summary.generated_at} />
      </div>
      {query.isRefetchError && (
        <Card role="alert" className="border-amber-700">
          <p>{t('snapshotStale')}</p>
        </Card>
      )}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          [t('applicationNewDiscoveries'), summary.totals.new_discoveries],
          [t('applicationOpenDiscoveries'), summary.totals.open_discoveries],
          [t('applicationNewAfterRelease'), summary.totals.new_runtime_items],
          [t('applicationGoneAfterRelease'), summary.totals.disappeared_runtime_items],
          [t('resourceRegressions'), summary.totals.resource_regressions],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg bg-slate-950 p-3">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-1 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <ApplicationAttentionTabs
        section={section}
        recommendationCount={summary.recommendations.length}
        priorityCount={summary.priority_items.length}
        onSection={onSection}
      />
      <div
        id={`attention-panel-${section}`}
        role="tabpanel"
        aria-labelledby={`attention-tab-${section}`}
        tabIndex={0}
        className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {section === 'overview' ? (
          <div className="space-y-6">
            <ObservedImpactFacts
              projectId={projectId}
              applicationId={applicationId}
              observedFrom={summary.window.from}
              observedTo={summary.window.to}
              releaseComparison={summary.release_comparison}
              priorityItems={summary.priority_items}
            />
            <PolicyAttentionFacts
              projectId={projectId}
              applicationId={applicationId}
              totals={summary.totals.policy}
            />
          </div>
        ) : section === 'recommendations' ? (
          <RecommendationList recommendations={summary.recommendations} />
        ) : summary.priority_items.length > 0 ? (
          <PriorityList items={summary.priority_items} />
        ) : (
          <section aria-labelledby="priority-queue-heading" className="space-y-4">
            <div>
              <h2 id="priority-queue-heading" className="text-2xl font-semibold">
                {t('priorityQueue')}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{t('priorityQueueHelp')}</p>
            </div>
            <Card>
              <p className="text-slate-300">{t('noPriorityItems')}</p>
            </Card>
          </section>
        )}
      </div>
    </section>
  )
}

export function ApplicationAttentionTabs({
  section,
  recommendationCount,
  priorityCount,
  onSection,
}: {
  section: ApplicationAttentionSection
  recommendationCount: number
  priorityCount: number
  onSection: (section: ApplicationAttentionSection) => void
}) {
  const { t } = useLocalization()
  const labels: Record<ApplicationAttentionSection, string> = {
    overview: t('attentionOverview'),
    recommendations: t('attentionRecommendationsTab', { count: recommendationCount }),
    priority: t('attentionPriorityTab', { count: priorityCount }),
  }
  const select = (next: ApplicationAttentionSection) => {
    onSection(next)
    requestAnimationFrame(() => document.getElementById(`attention-tab-${next}`)?.focus())
  }
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-1">
      <div role="tablist" aria-label={t('requiresAttention')} className="flex min-w-max gap-1">
        {attentionSections.map((candidate, index) => (
          <button
            key={candidate}
            id={`attention-tab-${candidate}`}
            type="button"
            role="tab"
            aria-selected={section === candidate}
            aria-controls={`attention-panel-${candidate}`}
            tabIndex={section === candidate ? 0 : -1}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-4 ${
              section === candidate
                ? 'border-cyan-500 bg-cyan-950/70 text-cyan-100'
                : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
            onClick={() => onSection(candidate)}
            onKeyDown={(event) => {
              let next: ApplicationAttentionSection | undefined
              if (event.key === 'Home') next = attentionSections[0]
              if (event.key === 'End') next = attentionSections.at(-1)
              if (event.key === 'ArrowRight')
                next = attentionSections[(index + 1) % attentionSections.length]
              if (event.key === 'ArrowLeft')
                next =
                  attentionSections[
                    (index - 1 + attentionSections.length) % attentionSections.length
                  ]
              if (!next) return
              event.preventDefault()
              select(next)
            }}
          >
            {labels[candidate]}
          </button>
        ))}
      </div>
    </div>
  )
}

function ObservedImpactFacts({
  projectId,
  applicationId,
  observedFrom,
  observedTo,
  releaseComparison,
  priorityItems,
}: {
  projectId: string
  applicationId: string
  observedFrom: string
  observedTo: string
  releaseComparison: AttentionReleaseComparison | null
  priorityItems: AttentionPriorityItem[]
}) {
  const { t } = useLocalization()
  const api = useApi()
  const deleted = useQuery(
    inventorySummaryOptions(api, projectId, applicationId, {
      kind: 'file_activity',
      operation: 'delete',
      observed_from: observedFrom,
      observed_to: observedTo,
    }),
  )
  const destinations = useQuery(
    inventoryDistributionOptions(api, projectId, applicationId, {
      kind: 'destination',
      observed_from: observedFrom,
      observed_to: observedTo,
    }),
  )
  const newListeners = useQuery(
    runtimeGroupsOptions(api, projectId, applicationId, {
      event_kind: 'network.listen',
      first_seen_from: observedFrom,
      first_seen_to: observedTo,
    }),
  )
  const internetObserved = destinations.data?.entries?.some((entry) => {
    const value = entry.semantic_summary
    return (
      isInventoryDestination(value) && getNetworkScope(value.destination_address) === 'internet'
    )
  })
  const internetOccurrences =
    destinations.data?.entries
      ?.filter((entry) => {
        const value = entry.semantic_summary
        return (
          isInventoryDestination(value) && getNetworkScope(value.destination_address) === 'internet'
        )
      })
      .reduce((total, entry) => total + entry.occurrence_count, 0) ?? 0
  const listenerOccurrences =
    newListeners.data?.items?.reduce((total, item) => total + item.occurrence_count, 0) ?? 0
  const largestIncrease = releaseComparison?.largest_changes
    .filter((change) => change.occurrence_delta > 0)
    .sort((left, right) => right.occurrence_delta - left.occurrence_delta)[0]
  const restartLoops = priorityItems.filter(
    (item) => item.reason_code === 'container_restart_loop_observed',
  )
  const firstRestartLoop = restartLoops.find((item) => item.resource.type === 'runtime_group')
  const restartLoopCardTone = restartLoopTone(restartLoops.length)
  const restartLoopCard = (
    <>
      <span className="text-sm text-slate-400">{t('restartLoops')}</span>
      <strong className="mt-1 block text-2xl">{restartLoops.length}</strong>
      <span className="mt-2 block text-xs text-slate-500">
        {restartLoops.length ? t('openRestartLoopFinding') : t('restartLoopsNotObserved')}
      </span>
    </>
  )
  return (
    <section
      aria-labelledby="observed-impact-heading"
      className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-5"
    >
      <h2 id="observed-impact-heading" className="text-2xl font-semibold">
        {t('observedImpact')}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {firstRestartLoop?.resource.type === 'runtime_group' ? (
          <Link
            className={`rounded-xl border p-4 transition hover:brightness-125 ${restartLoopCardTone}`}
            to="/projects/$projectId/applications/$applicationId/runtime-groups/$groupId"
            params={{
              projectId,
              applicationId,
              groupId: firstRestartLoop.resource.runtime_group_id,
            }}
            search={{}}
          >
            {restartLoopCard}
          </Link>
        ) : (
          <div className={`rounded-xl border p-4 ${restartLoopCardTone}`}>{restartLoopCard}</div>
        )}
        <Link
          className={`rounded-xl border p-4 transition hover:brightness-125 ${observedVolumeTone(deleted.data?.occurrence_count ?? 0)}`}
          to="/projects/$projectId/applications/$applicationId/runtime-inventory"
          params={{ projectId, applicationId }}
          search={{
            kind: 'file_activity',
            operation: 'delete',
            observed_from: observedFrom,
            observed_to: observedTo,
          }}
        >
          <span className="text-sm text-slate-400">{t('deletedFiles')}</span>
          <strong className="mt-1 block text-2xl">{deleted.data?.item_count ?? '—'}</strong>
          <span className="mt-2 block text-xs text-slate-500">{t('openDeletedFiles')}</span>
        </Link>
        <Link
          className={`rounded-xl border p-4 transition hover:brightness-125 ${observedVolumeTone(internetOccurrences)}`}
          to="/projects/$projectId/applications/$applicationId/runtime-inventory"
          params={{ projectId, applicationId }}
          search={{ kind: 'destination', observed_from: observedFrom, observed_to: observedTo }}
        >
          <span className="text-sm text-slate-400">{t('internetTraffic')}</span>
          <strong className="mt-1 block text-lg">
            {destinations.isPending
              ? '—'
              : internetObserved
                ? t('internetObserved')
                : t('internetNotConfirmed')}
          </strong>
          <span className="mt-2 block text-xs text-slate-500">{t('internetEvidenceNote')}</span>
        </Link>
        <Link
          className={`rounded-xl border p-4 transition hover:brightness-125 ${observedVolumeTone(listenerOccurrences)}`}
          to="/projects/$projectId/applications/$applicationId/runtime-groups"
          params={{ projectId, applicationId }}
          search={{
            event_kind: 'network.listen',
            first_seen_from: observedFrom,
            first_seen_to: observedTo,
          }}
        >
          <span className="text-sm text-slate-400">{t('newInboundPorts')}</span>
          <strong className="mt-1 block text-2xl">{newListeners.data?.items?.length ?? '—'}</strong>
          <span className="mt-2 block text-xs text-slate-500">
            {newListeners.data?.next_cursor ? t('boundedPortCount') : t('openInboundPorts')}
          </span>
        </Link>
        <div
          className={`rounded-xl border p-4 ${observedVolumeTone(largestIncrease?.occurrence_delta ?? 0)}`}
        >
          <span className="text-sm text-slate-400">{t('largestActivityIncrease')}</span>
          <strong className="mt-1 block text-lg">
            {largestIncrease
              ? t('additionalObservations', { count: largestIncrease.occurrence_delta })
              : t('noIncreaseEvidence')}
          </strong>
          <span className="mt-2 block text-xs text-slate-500">{t('growthEvidenceNote')}</span>
        </div>
      </div>
    </section>
  )
}

export function PolicyAttentionFacts({
  projectId,
  applicationId,
  totals,
}: {
  projectId: string
  applicationId: string
  totals: AttentionPolicyTotals
}) {
  const { locale, t } = useLocalization()
  const categories = [
    ['policyExpected', totals.expected, { verdict: 'expected' }],
    [
      'policyRequiresReview',
      totals.requires_review,
      { verdict: 'requires_review', suppressed: false },
    ],
    ['policyUnclassified', totals.unclassified, { verdict: 'unclassified', suppressed: false }],
    ['policyConflict', totals.policy_conflict, { verdict: 'policy_conflict', suppressed: false }],
    ['policyPending', totals.evaluation_pending, { evaluation_pending: true }],
  ] as const
  const headlineTotals = [
    ['policyObserved', totals.factual_total],
    ['policyActionable', totals.actionable_total],
  ] as const
  return (
    <section
      aria-labelledby="policy-attention-heading"
      className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-5"
    >
      <div>
        <h3 id="policy-attention-heading" className="text-xl font-semibold">
          {t('policyAttention')}
        </h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">{t('policyAttentionHelp')}</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {headlineTotals.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <dt className="text-sm text-slate-400">{t(label)}</dt>
            <dd className="mt-1 text-2xl font-semibold">{formatNumber(locale, value)}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {categories.map(([label, value, search]) => (
          <Link
            key={label}
            className="rounded-xl border border-slate-700 bg-slate-950 p-4 transition hover:border-cyan-600 hover:bg-cyan-950/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            to="/projects/$projectId/applications/$applicationId/runtime-groups"
            params={{ projectId, applicationId }}
            search={search}
            aria-label={`${t(label)}: ${formatNumber(locale, value)}. ${t('openPolicyCategory')}`}
          >
            <span className="text-sm text-slate-400">{t(label)}</span>
            <strong className="mt-1 block text-2xl">{formatNumber(locale, value)}</strong>
            <span className="mt-2 block text-xs text-cyan-300">{t('openPolicyCategory')}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function observedVolumeTone(count: number) {
  if (count >= 100) return 'border-rose-600 bg-rose-950/45'
  if (count >= 20) return 'border-orange-600 bg-orange-950/40'
  if (count >= 5) return 'border-amber-600 bg-amber-950/35'
  return 'border-emerald-700 bg-emerald-950/35'
}

export function restartLoopTone(count: number) {
  if (count > 1) return 'border-rose-600 bg-rose-950/45'
  if (count > 0) return 'border-amber-600 bg-amber-950/35'
  return observedVolumeTone(0)
}
