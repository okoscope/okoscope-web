import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { applicationsOptions, queryKeys } from '../../shared/api/queries'
import { useApi } from '../../shared/api/context'
import { createApplication } from '../../shared/api/provisioning'
import type { CreatedApplication } from '../../shared/api/types'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { Modal } from '../../shared/ui/modal'
import { formatCount, formatTimestamp } from './format'
import { NamedResourceForm } from '../provisioning/entity-form'
import { ConnectAgent } from '../provisioning/connect-agent'
import { useT } from '../../shared/i18n'
import { useIsOwner } from '../../shared/auth/session'

export function ApplicationList({ projectId }: { projectId: string }) {
  const api = useApi()
  const t = useT()
  const queryClient = useQueryClient()
  const [created, setCreated] = useState<CreatedApplication | null>(null)
  const [creating, setCreating] = useState(false)
  const isOwner = useIsOwner()
  const query = useInfiniteQuery(applicationsOptions(api, projectId))
  const create = useMutation({
    retry: false,
    mutationFn: (body: { name: string; slug: string }) => createApplication(api, projectId, body),
    onSuccess: (result) => {
      setCreating(false)
      setCreated(result)
      void queryClient.invalidateQueries({ queryKey: queryKeys.applications(projectId) })
    },
  })
  if (query.isPending) return <Loading label="Loading applications…" />
  if (query.isError)
    return (
      <ErrorState
        title="Applications could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  const applications = query.data.pages
    .flatMap((page) => page.items)
    .filter(
      (application, index, all) => all.findIndex((item) => item.id === application.id) === index,
    )
  if (created)
    return (
      <ConnectAgent
        application={created.application}
        credential={created.credential}
        onClose={() => setCreated(null)}
      />
    )
  return (
    <section aria-labelledby="applications-heading">
      <h2 id="applications-heading" className="mb-4 text-2xl font-semibold">
        Applications
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {!applications.length && (
          <Card className="h-full">
            <h2 className="text-xl font-semibold">No applications yet</h2>
            <p className="mt-2 text-slate-400">This Project has no Applications.</p>
          </Card>
        )}
        {applications.map((application) => (
          <Link
            key={application.id}
            to="/projects/$projectId/applications/$applicationId"
            params={{ projectId, applicationId: application.id }}
            className="rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            <Card className="h-full transition hover:border-cyan-800">
              <h3 className="text-lg font-semibold">{application.name}</h3>
              <p className="font-mono text-sm text-slate-500">{application.slug}</p>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Releases</dt>
                  <dd>{formatCount(application.release_count)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Runtime groups</dt>
                  <dd>{formatCount(application.runtime_group_count)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Latest observation</dt>
                  <dd>{formatTimestamp(application.latest_observed_at)}</dd>
                </div>
              </dl>
            </Card>
          </Link>
        ))}
        {isOwner && (
          <button
            type="button"
            aria-label={t('createApplicationTitle')}
            className="app-card flex min-h-40 items-center justify-center rounded-2xl border border-emerald-900 bg-emerald-950/20 p-6 text-emerald-400 transition hover:border-emerald-600 hover:bg-emerald-950/40 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            onClick={() => setCreating(true)}
          >
            <Plus aria-hidden="true" className="size-12" strokeWidth={1.5} />
          </button>
        )}
      </div>
      {creating && isOwner && (
        <Modal
          title={t('createApplicationTitle')}
          description={t('createApplicationHelp')}
          onClose={() => setCreating(false)}
          closeDisabled={create.isPending}
          showCloseButton={false}
        >
          <NamedResourceForm
            label="Application"
            pending={create.isPending}
            error={create.error}
            onSubmit={create.mutate}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
      {query.hasNextPage && (
        <Button
          className="mt-5"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more applications'}
        </Button>
      )}
    </section>
  )
}
