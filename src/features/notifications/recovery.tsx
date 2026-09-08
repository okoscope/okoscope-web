import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FormEvent, useEffect, useState } from 'react'
import { useApi } from '../../shared/api/context'
import {
  queryKeys,
  recoveryOperationOptions,
  recoveryOperationsOptions,
} from '../../shared/api/queries'
import type {
  BulkRecoveryResult,
  BulkRetryFilter,
  DeliveryDetail,
  DeliveryRecoveryResult,
  RecoveryCommandType,
} from '../../shared/api/types'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { Modal } from '../../shared/ui/modal'
import { formatTime } from './shared'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300'

const commandHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })
const formText = (value: FormDataEntryValue | null) =>
  typeof value === 'string' ? value.trim() : ''

async function invalidateRecovery(
  client: ReturnType<typeof useQueryClient>,
  projectId: string,
  deliveryId?: string,
) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.notificationHealth(projectId) }),
    client.invalidateQueries({ queryKey: queryKeys.deliveries(projectId) }),
    client.invalidateQueries({ queryKey: queryKeys.recoveries(projectId) }),
    deliveryId
      ? client.invalidateQueries({ queryKey: queryKeys.delivery(projectId, deliveryId) })
      : Promise.resolve(),
  ])
}

export function SingleRecoveryActions({
  projectId,
  delivery,
}: {
  projectId: string
  delivery: DeliveryDetail
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [action, setAction] = useState<'retry' | 'cancel' | null>(null)
  const [result, setResult] = useState<DeliveryRecoveryResult | null>(null)
  const mutation = useMutation({
    mutationFn: (command: 'retry' | 'cancel') =>
      api.post<DeliveryRecoveryResult>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notification-deliveries/${encodeURIComponent(delivery.id)}/${command}`,
        { protected: true, headers: commandHeaders() },
      ),
    onSuccess: async (data) => {
      setResult(data)
      setAction(null)
      await invalidateRecovery(queryClient, projectId, delivery.id)
    },
  })
  return (
    <section aria-labelledby="recovery-actions-heading" className="space-y-3">
      <h2 id="recovery-actions-heading" className="text-2xl font-semibold">
        Recovery actions
      </h2>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAction('retry')} disabled={!delivery.retry_allowed}>
          Retry delivery
        </Button>
        <Button
          variant="outline"
          onClick={() => setAction('cancel')}
          disabled={!delivery.cancel_allowed}
        >
          Cancel delivery
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Availability is determined by the latest server response.
      </p>
      <div aria-live="polite">
        {result && (
          <Card className="border-emerald-800/70">
            Command completed: {result.status}. Operation {result.operation_id}
            {result.replayed ? ' (idempotent replay)' : ''}.
          </Card>
        )}
      </div>
      {action && (
        <Modal
          title={action === 'retry' ? 'Retry this delivery?' : 'Cancel this delivery?'}
          description={
            action === 'retry'
              ? 'The delivery becomes pending again with a new recovery generation.'
              : 'Pending delivery will stop and become cancelled.'
          }
          onClose={() => {
            mutation.reset()
            setAction(null)
          }}
          closeDisabled={mutation.isPending}
        >
          {mutation.isError && (
            <ErrorState title="Recovery command failed" error={mutation.error} />
          )}
          <Button onClick={() => mutation.mutate(action)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting…' : `Confirm ${action}`}
          </Button>
        </Modal>
      )}
    </section>
  )
}

export function BulkRetry({ projectId }: { projectId: string }) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [pendingBody, setPendingBody] = useState<BulkRetryFilter | null>(null)
  const [result, setResult] = useState<BulkRecoveryResult | null>(null)
  const mutation = useMutation({
    mutationFn: (body: BulkRetryFilter) =>
      api.post<BulkRecoveryResult>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notification-deliveries/bulk-retry`,
        { protected: true, headers: commandHeaders(), body },
      ),
    onSuccess: async (data) => {
      setResult(data)
      setPendingBody(null)
      setOpen(false)
      await invalidateRecovery(queryClient, projectId)
    },
  })
  const prepare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const destination = formText(data.get('destination_id'))
    const before = formText(data.get('failed_before'))
    const after = formText(data.get('failed_after'))
    const errorClass = formText(data.get('error_class'))
    const limit = Number(data.get('limit'))
    setPendingBody({
      ...(destination ? { destination_id: destination } : {}),
      ...(before ? { failed_before: new Date(before).toISOString() } : {}),
      ...(after ? { failed_after: new Date(after).toISOString() } : {}),
      ...(errorClass ? { error_class: errorClass } : {}),
      limit,
    })
  }
  return (
    <section aria-labelledby="bulk-retry-heading">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Bulk retry failed deliveries
        </Button>
        <Link
          className="nav-link border border-slate-700"
          to="/projects/$projectId/notifications/recovery"
          params={{ projectId }}
        >
          Recovery history
        </Link>
      </div>
      <div aria-live="polite">
        {result && (
          <p className="mt-3 text-sm text-emerald-200">
            Selected {result.selected_count}; retried {result.retried_count}; skipped{' '}
            {result.skipped_count}; remaining {result.remaining_count}
            {result.has_more ? '; more matches remain' : ''}
            {result.replayed ? '; idempotent replay' : ''}.
          </p>
        )}
      </div>
      {open && (
        <Modal
          title="Bulk retry failed deliveries"
          description="Select only the failed deliveries matching these server-side filters. The command is bounded to 200 deliveries."
          onClose={() => setOpen(false)}
        >
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={prepare}>
            <label className="text-sm">
              Destination ID
              <input name="destination_id" className={inputClass} />
            </label>
            <label className="text-sm">
              Error class
              <input name="error_class" maxLength={100} className={inputClass} />
            </label>
            <label className="text-sm">
              Failed after
              <input name="failed_after" type="datetime-local" className={inputClass} />
            </label>
            <label className="text-sm">
              Failed before
              <input name="failed_before" type="datetime-local" className={inputClass} />
            </label>
            <label className="text-sm">
              Limit
              <input
                name="limit"
                type="number"
                min={1}
                max={200}
                defaultValue={50}
                className={inputClass}
                required
              />
            </label>
            <Button type="submit" className="self-end">
              Review bulk retry
            </Button>
          </form>
        </Modal>
      )}
      {pendingBody && (
        <Modal
          title="Confirm bulk retry?"
          description={`Retry at most ${pendingBody.limit} failed deliveries matching the supplied filters.`}
          onClose={() => {
            mutation.reset()
            setPendingBody(null)
          }}
          closeDisabled={mutation.isPending}
        >
          {mutation.isError && <ErrorState title="Bulk retry failed" error={mutation.error} />}
          <Button onClick={() => mutation.mutate(pendingBody)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting…' : 'Confirm bulk retry'}
          </Button>
        </Modal>
      )}
    </section>
  )
}

export function RecoveryHistory({
  projectId,
  commandType,
  cursor,
  onSearch,
}: {
  projectId: string
  commandType: RecoveryCommandType | null
  cursor: string | null
  onSearch: (commandType: RecoveryCommandType | null, cursor: string | null) => void
}) {
  const query = useQuery(recoveryOperationsOptions(useApi(), projectId, commandType, cursor))
  if (query.isPending) return <Loading label="Loading recovery history…" />
  if (query.isError)
    return (
      <ErrorState
        title="Recovery history could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  return (
    <div className="space-y-5">
      <label className="block max-w-xs text-sm">
        Command type
        <select
          className={inputClass}
          value={commandType ?? ''}
          onChange={(event) =>
            onSearch((event.target.value || null) as RecoveryCommandType | null, null)
          }
        >
          <option value="">All commands</option>
          <option value="retry">Retry</option>
          <option value="cancel">Cancel</option>
          <option value="bulk_retry">Bulk retry</option>
        </select>
      </label>
      {query.data.items.length === 0 ? (
        <Card>No recovery operations recorded.</Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  'Operation',
                  'Command',
                  'Outcome',
                  'Actor',
                  'Request ID',
                  'Counts',
                  'Completed',
                ].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <th scope="row" className="px-4 py-3 font-mono text-xs">
                    <Link
                      className="underline"
                      to="/projects/$projectId/notifications/recovery/$operationId"
                      params={{ projectId, operationId: item.id }}
                    >
                      {item.id}
                    </Link>
                  </th>
                  <td className="px-4 py-3">{item.command_type}</td>
                  <td className="px-4 py-3">{item.outcome}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.actor_kind} · {item.actor_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{item.request_id}</td>
                  <td className="px-4 py-3">
                    retried {item.retried_count}; cancelled {item.cancelled_count}; skipped{' '}
                    {item.skipped_count}
                  </td>
                  <td className="px-4 py-3">{formatTime(item.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Recovery pages" className="justify-end">
        <Button variant="outline" disabled={!cursor} onClick={() => onSearch(commandType, null)}>
          Previous
        </Button>
        <Button
          disabled={!query.data.next_cursor}
          onClick={() => query.data.next_cursor && onSearch(commandType, query.data.next_cursor)}
        >
          Next
        </Button>
      </nav>
    </div>
  )
}

export function RecoveryDetailView({
  projectId,
  operationId,
}: {
  projectId: string
  operationId: string
}) {
  const query = useQuery(recoveryOperationOptions(useApi(), projectId, operationId))
  useEffect(() => {
    if (query.data) document.title = `Recovery ${query.data.id} · Okoscope`
  }, [query.data])
  if (query.isPending) return <Loading label="Loading recovery operation…" />
  if (query.isError)
    return (
      <ErrorState
        title="Recovery operation could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  const operation = query.data
  return (
    <div className="space-y-5">
      <Card>
        <p className="eyebrow">Recovery operation</p>
        <h1 className="mt-2 break-all font-mono text-2xl">{operation.id}</h1>
        <dl className="details mt-5">
          <dt>Command</dt>
          <dd>{operation.command_type}</dd>
          <dt>Outcome</dt>
          <dd>{operation.outcome}</dd>
          <dt>Request ID</dt>
          <dd className="font-mono text-xs">{operation.request_id}</dd>
          <dt>Actor</dt>
          <dd className="font-mono text-xs">
            {operation.actor_kind} · {operation.actor_id}
          </dd>
          <dt>Selected</dt>
          <dd>{operation.selected_count}</dd>
          <dt>Retried</dt>
          <dd>{operation.retried_count}</dd>
          <dt>Cancelled</dt>
          <dd>{operation.cancelled_count}</dd>
          <dt>Skipped</dt>
          <dd>{operation.skipped_count}</dd>
          <dt>Remaining</dt>
          <dd>{operation.remaining_count}</dd>
          <dt>Completed</dt>
          <dd>{formatTime(operation.completed_at)}</dd>
        </dl>
      </Card>
      <section>
        <h2 className="text-2xl font-semibold">Affected deliveries</h2>
        <div className="mt-3 space-y-2">
          {operation.affected_deliveries.map((item) => (
            <Card key={`${item.delivery_id}-${item.recovery_generation}`}>
              <Link
                className="font-mono text-xs underline"
                to="/projects/$projectId/notifications/deliveries/$deliveryId"
                params={{ projectId, deliveryId: item.delivery_id }}
              >
                {item.delivery_id}
              </Link>
              <p className="mt-2 text-sm">
                {item.action} · generation {item.recovery_generation} ·{' '}
                {formatTime(item.created_at)}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
