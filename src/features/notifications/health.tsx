import { useQuery } from '@tanstack/react-query'
import { useApi } from '../../shared/api/context'
import { notificationHealthOptions } from '../../shared/api/queries'
import type { NotificationHealth } from '../../shared/api/types'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { formatTime } from './shared'

export const healthPresentation: Record<
  NotificationHealth['state'],
  { label: string; description: string; tone: string }
> = {
  disabled: {
    label: 'Delivery disabled',
    description: 'Notification delivery is disabled by the server operator.',
    tone: 'border-slate-700',
  },
  idle: {
    label: 'Delivery healthy',
    description: 'Delivery is enabled and the notification queue is empty.',
    tone: 'border-emerald-800/70',
  },
  backlogged: {
    label: 'Delivery backlogged',
    description: 'Notifications are waiting longer than expected to be delivered.',
    tone: 'border-amber-800/70',
  },
  retrying: {
    label: 'Deliveries retrying',
    description: 'Receivers are returning temporary errors and deliveries will be retried.',
    tone: 'border-amber-800/70',
  },
  failing: {
    label: 'Deliveries failing',
    description: 'One or more notification deliveries reached a terminal failure.',
    tone: 'border-rose-800/70',
  },
  draining: {
    label: 'Delivery worker draining',
    description: 'The delivery worker is finishing active work during shutdown or an update.',
    tone: 'border-cyan-800/70',
  },
}

const formatAge = (seconds: number | null) => {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3_600)}h ${Math.floor((seconds % 3_600) / 60)}m`
}

export function NotificationHealthPanel({ projectId }: { projectId: string }) {
  const query = useQuery(notificationHealthOptions(useApi(), projectId))
  if (query.isPending) return <Loading label="Loading notification health…" />
  if (query.isError && !query.data)
    return (
      <ErrorState
        title="Notification health could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )

  const health = query.data
  const presentation = healthPresentation[health.state]
  return (
    <Card className={presentation.tone} aria-labelledby="notification-health-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Notification health</p>
          <h2 id="notification-health-heading" className="mt-2 text-2xl font-semibold">
            {presentation.label}
          </h2>
          <p className="mt-2 text-sm text-slate-300">{presentation.description}</p>
          <p className="mt-1 text-xs text-slate-500">
            This describes notification delivery, not overall Okoscope availability.
          </p>
        </div>
        <span className="rounded-full border border-current px-3 py-1 text-sm">
          {health.delivery_enabled ? 'Delivery enabled' : 'Delivery disabled'}
        </span>
      </div>

      {health.state === 'backlogged' && (
        <p className="mt-4 text-sm text-amber-200">
          {health.due_count} due; oldest due delivery is {formatAge(health.oldest_due_age_seconds)}
          old.
        </p>
      )}
      {health.state === 'failing' && (
        <a className="mt-4 inline-block text-sm text-rose-200 underline" href="#deliveries">
          Review failed deliveries
        </a>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['Active destinations', health.enabled_destination_count],
          ['Pending', health.pending_count],
          ['Due', health.due_count],
          ['Retrying', health.retrying_count],
          ['In flight', health.in_flight_count],
          ['Expired leases', health.expired_lease_count],
          ['Failed', health.failed_count],
          ['Oldest due age', formatAge(health.oldest_due_age_seconds)],
          ['Observed', formatTime(health.observed_at)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {query.isRefetchError && (
        <div className="mt-6 border-t border-amber-800 pt-4" role="alert">
          <p className="font-semibold text-amber-200">Health data is stale</p>
          <p className="mt-1 text-sm text-slate-300">
            The last successful snapshot is still shown because the latest refresh failed.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>
            Retry health refresh
          </Button>
        </div>
      )}
    </Card>
  )
}
