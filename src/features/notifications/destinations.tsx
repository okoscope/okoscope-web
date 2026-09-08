import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FormEvent, useEffect, useState } from 'react'
import { useApi } from '../../shared/api/context'
import { destinationOptions, destinationsOptions, queryKeys } from '../../shared/api/queries'
import type {
  CreateWebhookDestination,
  DestinationWithSecret,
  DeliverySummary,
  UpdateWebhookDestination,
  WebhookDestination,
} from '../../shared/api/types'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { Modal } from '../../shared/ui/modal'
import { formatTime } from './shared'
import { SecretDialog } from './secret-dialog'

const fieldClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300'

async function invalidateOperations(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  destinationId?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.destinations(projectId) }),
    destinationId
      ? queryClient.invalidateQueries({ queryKey: queryKeys.destination(projectId, destinationId) })
      : Promise.resolve(),
    queryClient.invalidateQueries({ queryKey: queryKeys.deliveries(projectId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.notificationHealth(projectId) }),
  ])
}

export function DestinationList({ projectId }: { projectId: string }) {
  const api = useApi()
  const queryClient = useQueryClient()
  const query = useQuery(destinationsOptions(api, projectId))
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: (body: CreateWebhookDestination) =>
      api.post<DestinationWithSecret>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/webhook-destinations`,
        { protected: true, body },
      ),
    onSuccess: async (data) => {
      setCreating(false)
      setSecret(data.secret)
      await invalidateOperations(queryClient, projectId, data.id)
    },
  })
  if (query.isPending) return <Loading label="Loading webhook destinations…" />
  if (query.isError)
    return (
      <ErrorState
        title="Destinations could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  return (
    <section aria-labelledby="destinations-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2 id="destinations-heading" className="mt-1 text-2xl font-semibold">
            Webhook destinations
          </h2>
        </div>
        <Button onClick={() => setCreating(true)}>Create destination</Button>
      </div>
      {query.data.length === 0 ? (
        <Card>
          <h3 className="font-semibold">No webhook destinations</h3>
          <p className="mt-2 text-sm text-slate-400">
            Create a destination to send project notifications to your receiver.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {query.data.map((destination) => (
            <Card key={destination.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">
                  <Link
                    className="underline underline-offset-4"
                    to="/projects/$projectId/notifications/destinations/$destinationId"
                    params={{ projectId, destinationId: destination.id }}
                  >
                    {destination.name}
                  </Link>
                </h3>
                <span className={destination.enabled ? 'text-emerald-300' : 'text-slate-400'}>
                  {destination.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="mt-3 break-all font-mono text-xs text-slate-400">{destination.url}</p>
              <p className="mt-3 text-xs text-slate-500">
                Updated {formatTime(destination.updated_at)}
              </p>
            </Card>
          ))}
        </div>
      )}
      {creating && (
        <DestinationForm
          title="Create webhook destination"
          submitLabel="Create destination"
          pending={create.isPending}
          error={create.error}
          onCancel={() => {
            create.reset()
            setCreating(false)
          }}
          onSubmit={(body) => create.mutate(body as CreateWebhookDestination)}
        />
      )}
      {secret && <SecretDialog secret={secret} onClose={() => setSecret(null)} />}
    </section>
  )
}

function DestinationForm({
  title,
  submitLabel,
  initial,
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  title: string
  submitLabel: string
  initial?: WebhookDestination
  pending: boolean
  error: unknown
  onCancel: () => void
  onSubmit: (body: CreateWebhookDestination | UpdateWebhookDestination) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [deliverBackfill, setDeliverBackfill] = useState(initial?.deliver_backfill ?? false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(
      initial
        ? { name, url, deliver_backfill: deliverBackfill, revision: initial.revision }
        : { name, url, deliver_backfill: deliverBackfill },
    )
  }
  return (
    <Modal
      title={title}
      description="Only fields supported by the published OpenAPI contract are editable."
      onClose={onCancel}
      closeDisabled={pending}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">
          Name
          <input
            className={`${fieldClass} mt-1`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Destination URL
          <input
            className={`${fieldClass} mt-1`}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            type="url"
            required
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={deliverBackfill}
            onChange={(event) => setDeliverBackfill(event.target.checked)}
          />{' '}
          Deliver backfilled events
        </label>
        {error !== null && <ErrorState title="Destination could not be saved" error={error} />}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Modal>
  )
}

export function DestinationDetail({
  projectId,
  destinationId,
}: {
  projectId: string
  destinationId: string
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const query = useQuery(destinationOptions(api, projectId, destinationId))
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<'disable' | 'rotate' | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    if (query.data) document.title = `${query.data.name} · Notifications · Okoscope`
  }, [query.data])
  const update = useMutation({
    mutationFn: (body: UpdateWebhookDestination) =>
      api.patch<WebhookDestination>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/webhook-destinations/${encodeURIComponent(destinationId)}`,
        { protected: true, body },
      ),
    onSuccess: async () => {
      setEditing(false)
      await invalidateOperations(queryClient, projectId, destinationId)
    },
  })
  const disable = useMutation({
    mutationFn: () =>
      api.post<WebhookDestination>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/webhook-destinations/${encodeURIComponent(destinationId)}/disable`,
        { protected: true },
      ),
    onSuccess: async () => {
      setConfirm(null)
      setAnnouncement('Destination disabled.')
      await invalidateOperations(queryClient, projectId, destinationId)
    },
  })
  const rotate = useMutation({
    mutationFn: () =>
      api.post<DestinationWithSecret>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/webhook-destinations/${encodeURIComponent(destinationId)}/rotate-secret`,
        { protected: true },
      ),
    onSuccess: async (data) => {
      setConfirm(null)
      setSecret(data.secret)
      setAnnouncement('Signing secret rotated.')
      await invalidateOperations(queryClient, projectId, destinationId)
    },
  })
  const test = useMutation({
    mutationFn: () =>
      api.post<DeliverySummary>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/webhook-destinations/${encodeURIComponent(destinationId)}/test`,
        { protected: true },
      ),
    onSuccess: async (data) => {
      setAnnouncement(`Test delivery queued with status ${data.status}.`)
      await queryClient.invalidateQueries({ queryKey: queryKeys.deliveries(projectId) })
    },
    onError: () => setAnnouncement('Test delivery failed. See the error details.'),
  })
  if (query.isPending) return <Loading label="Loading destination…" />
  if (query.isError)
    return (
      <ErrorState
        title="Destination could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  const destination = query.data
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Webhook destination</p>
            <h1 className="mt-2 text-3xl font-semibold">{destination.name}</h1>
            <p className="mt-2 break-all font-mono text-sm text-slate-400">{destination.url}</p>
          </div>
          <span>{destination.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <dl className="details mt-6">
          <dt>Backfill</dt>
          <dd>{destination.deliver_backfill ? 'Delivered' : 'Skipped'}</dd>
          <dt>Revision</dt>
          <dd>{destination.revision}</dd>
          <dt>Created</dt>
          <dd>{formatTime(destination.created_at)}</dd>
          <dt>Updated</dt>
          <dd>{formatTime(destination.updated_at)}</dd>
          <dt>Disabled</dt>
          <dd>{formatTime(destination.disabled_at)}</dd>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setEditing(true)}>Edit</Button>
          <Button
            variant="outline"
            onClick={() => test.mutate()}
            disabled={test.isPending || !destination.enabled}
          >
            {test.isPending ? 'Sending…' : 'Send test delivery'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirm('rotate')}
            disabled={rotate.isPending || !destination.enabled}
          >
            Rotate secret
          </Button>
          <Button
            variant="ghost"
            onClick={() => setConfirm('disable')}
            disabled={disable.isPending || !destination.enabled}
          >
            Disable
          </Button>
        </div>
      </Card>
      <div aria-live="polite">
        <p className="text-sm text-slate-300">{announcement}</p>
        {test.isError && <ErrorState title="Test delivery failed" error={test.error} />}
      </div>
      {editing && (
        <DestinationForm
          title="Edit webhook destination"
          submitLabel="Save changes"
          initial={destination}
          pending={update.isPending}
          error={update.error}
          onCancel={() => {
            update.reset()
            setEditing(false)
          }}
          onSubmit={(body) => update.mutate(body as UpdateWebhookDestination)}
        />
      )}
      {confirm && (
        <Modal
          title={confirm === 'disable' ? 'Disable destination?' : 'Rotate signing secret?'}
          description={
            confirm === 'disable'
              ? 'New notifications will no longer be delivered to this receiver.'
              : 'The current signing secret becomes invalid immediately. Update the receiver with the new one-time secret.'
          }
          onClose={() => setConfirm(null)}
          closeDisabled={disable.isPending || rotate.isPending}
        >
          <div aria-live="polite">
            {(disable.error || rotate.error) && (
              <ErrorState title="Action failed" error={disable.error ?? rotate.error} />
            )}
          </div>
          <Button
            onClick={() => (confirm === 'disable' ? disable.mutate() : rotate.mutate())}
            disabled={disable.isPending || rotate.isPending}
          >
            {disable.isPending || rotate.isPending ? 'Confirming…' : `Confirm ${confirm}`}
          </Button>
        </Modal>
      )}
      {secret && <SecretDialog secret={secret} onClose={() => setSecret(null)} />}
    </div>
  )
}
