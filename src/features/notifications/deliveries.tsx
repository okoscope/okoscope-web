import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useApi } from '../../shared/api/context'
import { deliveriesOptions, deliveryOptions } from '../../shared/api/queries'
import type { DeliverySummary } from '../../shared/api/types'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { formatTime } from './shared'
import { SingleRecoveryActions } from './recovery'

export function DeliveryHistory({
  projectId,
  cursor,
  onNext,
  onPrevious,
}: {
  projectId: string
  cursor: string | null
  onNext: (cursor: string) => void
  onPrevious: () => void
}) {
  const query = useQuery(deliveriesOptions(useApi(), projectId, cursor))
  if (query.isPending) return <Loading label="Loading notification deliveries…" />
  if (query.isError)
    return (
      <ErrorState
        title="Deliveries could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  return (
    <section id="deliveries" aria-labelledby="deliveries-heading" className="space-y-4">
      <div>
        <p className="eyebrow">Diagnostics</p>
        <h2 id="deliveries-heading" className="mt-1 text-2xl font-semibold">
          Delivery history
        </h2>
      </div>
      {query.data.items.length === 0 ? (
        <Card>
          <h3 className="font-semibold">No notification deliveries</h3>
          <p className="mt-2 text-sm text-slate-400">
            Deliveries will appear here after notification events or destination tests.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900">
              <tr>
                {[
                  'Delivery',
                  'Event',
                  'Destination',
                  'Status',
                  'Source',
                  'Attempts',
                  'Created',
                  'Updated',
                  'Available / terminal',
                ].map((heading) => (
                  <th key={heading} scope="col" className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {query.data.items.map((delivery) => (
                <DeliveryRow key={delivery.id} projectId={projectId} delivery={delivery} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Delivery pages" className="justify-end">
        <Button variant="outline" onClick={onPrevious} disabled={!cursor}>
          Previous
        </Button>
        <Button
          onClick={() => query.data.next_cursor && onNext(query.data.next_cursor)}
          disabled={!query.data.next_cursor}
        >
          Next
        </Button>
      </nav>
    </section>
  )
}

function DeliveryRow({ projectId, delivery }: { projectId: string; delivery: DeliverySummary }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 font-mono text-xs">
        <Link
          className="underline"
          to="/projects/$projectId/notifications/deliveries/$deliveryId"
          params={{ projectId, deliveryId: delivery.id }}
        >
          {delivery.id}
        </Link>
      </th>
      <td className="px-4 py-3">{delivery.event_name}</td>
      <td className="px-4 py-3">
        {delivery.destination.name}
        <span className="block font-mono text-xs text-slate-500">{delivery.destination.id}</span>
      </td>
      <td className="px-4 py-3">
        {delivery.status}
        {delivery.last_error_class ? (
          <span className="block text-xs text-rose-300">{delivery.last_error_class}</span>
        ) : null}
      </td>
      <td className="px-4 py-3">{delivery.source}</td>
      <td className="px-4 py-3">
        {delivery.attempt_count}/{delivery.max_attempts}
      </td>
      <td className="whitespace-nowrap px-4 py-3">{formatTime(delivery.created_at)}</td>
      <td className="whitespace-nowrap px-4 py-3">{formatTime(delivery.updated_at)}</td>
      <td className="whitespace-nowrap px-4 py-3">
        Available {formatTime(delivery.available_at)}
        <span className="block text-xs text-slate-400">
          Next attempt {formatTime(delivery.next_attempt_at)}
          <span className="block text-xs text-slate-400">
            Terminal {formatTime(delivery.terminal_at)}
          </span>
          {delivery.terminal_reason && (
            <span className="block text-xs text-slate-400">{delivery.terminal_reason}</span>
          )}
        </span>
      </td>
    </tr>
  )
}

export function DeliveryDetailView({
  projectId,
  deliveryId,
}: {
  projectId: string
  deliveryId: string
}) {
  const query = useQuery(deliveryOptions(useApi(), projectId, deliveryId))
  useEffect(() => {
    if (query.data) document.title = `Delivery ${query.data.id} · Okoscope`
  }, [query.data])
  if (query.isPending) return <Loading label="Loading delivery…" />
  if (query.isError)
    return (
      <ErrorState
        title="Delivery could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  const delivery = query.data
  return (
    <div className="space-y-5">
      <Card>
        <p className="eyebrow">Notification delivery</p>
        <h1 className="mt-2 break-all font-mono text-2xl font-semibold">{delivery.id}</h1>
        <div className="mt-4 text-lg">
          Status: <strong>{delivery.status}</strong>
        </div>
        <dl className="details mt-6">
          <dt>Destination</dt>
          <dd>
            {delivery.destination.name}{' '}
            <span className="break-all font-mono text-xs text-slate-500">
              ({delivery.destination.id})
            </span>
          </dd>
          <dt>Event</dt>
          <dd>{delivery.event_name}</dd>
          <dt>Origin</dt>
          <dd>{delivery.origin}</dd>
          <dt>Source</dt>
          <dd>{delivery.source}</dd>
          <dt>Semantic event</dt>
          <dd>
            {delivery.semantic_metadata
              ? [
                  delivery.semantic_metadata.event_kind,
                  delivery.semantic_metadata.application_id,
                  delivery.semantic_metadata.group_id,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'
              : '—'}
          </dd>
          <dt>Attempts</dt>
          <dd>
            {delivery.attempt_count}/{delivery.max_attempts}
          </dd>
          <dt>Available</dt>
          <dd>{formatTime(delivery.available_at)}</dd>
          <dt>Next attempt</dt>
          <dd>{formatTime(delivery.next_attempt_at)}</dd>
          <dt>Created</dt>
          <dd>{formatTime(delivery.created_at)}</dd>
          <dt>Updated</dt>
          <dd>{formatTime(delivery.updated_at)}</dd>
          <dt>Terminal outcome</dt>
          <dd>
            {delivery.terminal_at
              ? `${delivery.terminal_reason ?? delivery.status} at ${formatTime(delivery.terminal_at)}`
              : 'Not terminal'}
          </dd>
          <dt>Last safe error class</dt>
          <dd>{delivery.last_error_class ?? '—'}</dd>
        </dl>
      </Card>
      <SingleRecoveryActions projectId={projectId} delivery={delivery} />
      <section aria-labelledby="attempts-heading">
        <h2 id="attempts-heading" className="text-2xl font-semibold">
          Attempt timeline
        </h2>
        {delivery.attempts.length === 0 ? (
          <Card className="mt-4">
            <p>No attempts recorded.</p>
          </Card>
        ) : (
          <ol className="mt-4 space-y-3">
            {delivery.attempts.map((attempt) => (
              <li key={attempt.id}>
                <Card>
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold">Attempt {attempt.attempt_number}</h3>
                    <span>{attempt.outcome}</span>
                  </div>
                  <dl className="details mt-4">
                    <dt>Started</dt>
                    <dd>{formatTime(attempt.started_at)}</dd>
                    <dt>Finished</dt>
                    <dd>{formatTime(attempt.finished_at)}</dd>
                    <dt>Duration</dt>
                    <dd>{attempt.duration_ms} ms</dd>
                    <dt>Recovery generation</dt>
                    <dd>{attempt.recovery_generation}</dd>
                    <dt>HTTP status</dt>
                    <dd>{attempt.http_status ?? '—'}</dd>
                    <dt>Safe error class</dt>
                    <dd>{attempt.error_class ?? '—'}</dd>
                  </dl>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
