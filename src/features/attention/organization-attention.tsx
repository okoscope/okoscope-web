import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Organization, AttentionWindowKind } from '../../shared/api/types'
import { organizationAttentionOptions } from '../../shared/api/queries'
import { useApi } from '../../shared/api/context'
import { formatNumber, useLocalization } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { AllClear, PriorityList, RecommendationList, SnapshotTime } from './components'

export function OrganizationAttention({
  organization,
  window,
  onWindow,
}: {
  organization: Organization
  window: AttentionWindowKind
  onWindow: (window: AttentionWindowKind) => void
}) {
  const api = useApi()
  const query = useQuery(organizationAttentionOptions(api, window))
  const { locale, t } = useLocalization()
  if (query.isPending) return <Loading label={t('loading')} />
  if (query.isError && !query.data)
    return (
      <div className="space-y-5">
        <OrganizationHeading organization={organization} window={window} onWindow={onWindow} />
        <ErrorState
          title={t('attentionLoadFailed')}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
        <Button asChild variant="outline">
          <Link to="/projects">{t('browseProjects')}</Link>
        </Button>
      </div>
    )
  const summary = query.data
  const totals = summary.totals
  const allClear =
    Object.values(totals).every((value) => typeof value !== 'number' || value === 0) &&
    summary.priority_items.length === 0 &&
    summary.changed_applications.length === 0 &&
    summary.notification_problems.length === 0 &&
    summary.recommendations.length === 0
  const metrics = [
    [t('newInWindow'), totals.new_discoveries],
    [t('openForReview'), totals.open_discoveries],
    [t('changedApplications'), totals.changed_applications],
    [t('resourceRegressions'), totals.resource_regressions],
    [t('notificationProblems'), totals.projects_with_notification_problems],
    [t('failedDeliveries'), totals.failed_notification_deliveries],
  ] as const
  return (
    <div className="space-y-8">
      <OrganizationHeading organization={organization} window={window} onWindow={onWindow} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SnapshotTime value={summary.generated_at} />
        <Button asChild variant="ghost">
          <Link to="/projects">{t('browseProjects')}</Link>
        </Button>
      </div>
      {query.isRefetchError && (
        <Card role="alert" className="border-amber-700">
          <p className="font-semibold text-amber-200">{t('snapshotStale')}</p>
          <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>
            {t('tryAgain')}
          </Button>
        </Card>
      )}
      {allClear ? (
        <AllClear />
      ) : (
        <>
          <section aria-label={t('requiresAttention')} className="attention-metrics">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="block text-sm text-slate-400">{label}</span>
                <strong className="mt-1 block text-3xl">{formatNumber(locale, value)}</strong>
              </div>
            ))}
          </section>
          <div className="w-full">
            <RecommendationList recommendations={summary.recommendations} />
          </div>
          <div className="w-full">
            {summary.priority_items.length > 0 && <PriorityList items={summary.priority_items} />}
          </div>
        </>
      )}
    </div>
  )
}

function OrganizationHeading({
  organization,
  window,
  onWindow,
}: {
  organization: Organization
  window: AttentionWindowKind
  onWindow: (window: AttentionWindowKind) => void
}) {
  const { t } = useLocalization()
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="eyebrow">{organization.name}</p>
        <h1 className="mt-2 text-4xl font-semibold">{t('requiresAttention')}</h1>
        <p className="mt-2 max-w-2xl text-slate-400">{t('attentionHelp')}</p>
      </div>
      <label className="text-sm font-medium">
        <span className="mb-1 block text-slate-300">{t('attentionWindow')}</span>
        <select
          value={window}
          onChange={(event) => onWindow(event.target.value as AttentionWindowKind)}
          className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2"
        >
          <option value="24h">{t('last24Hours')}</option>
          <option value="7d">{t('last7Days')}</option>
        </select>
      </label>
    </header>
  )
}
