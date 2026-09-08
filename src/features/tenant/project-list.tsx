import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { projectsOptions, queryKeys } from '../../shared/api/queries'
import { useApi } from '../../shared/api/context'
import { createProject } from '../../shared/api/provisioning'
import { NamedResourceForm } from '../provisioning/entity-form'
import { useT } from '../../shared/i18n'
import { Button } from '../../shared/ui/button'
import { Card } from '../../shared/ui/card'
import { ErrorState } from '../../shared/ui/error-state'
import { Loading } from '../../shared/ui/loading'
import { Modal } from '../../shared/ui/modal'
import { formatCount } from './format'
import { useIsOwner } from '../../shared/auth/session'

export function ProjectList({ organizationId }: { organizationId?: string | undefined }) {
  const api = useApi()
  const t = useT()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const isOwner = useIsOwner()
  const query = useInfiniteQuery(projectsOptions(api))
  const create = useMutation({
    retry: false,
    mutationFn: (body: { name: string; slug: string }) => createProject(api, organizationId!, body),
    onSuccess: () => {
      setCreating(false)
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects })
    },
  })
  const refreshError = query.error
  const hasData = Boolean(query.data)
  if (query.isPending) return <Loading label="Loading projects…" />
  if (query.isError && !hasData)
    return (
      <ErrorState
        title="Projects could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  if (!query.data) return <Loading label="Loading projects…" />
  const projects = query.data.pages
    .flatMap((page) => page.items)
    .filter((project, index, all) => all.findIndex((item) => item.id === project.id) === index)
  return (
    <section aria-labelledby="projects-heading">
      <h2 id="projects-heading" className="sr-only">
        Projects
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {!projects.length && (
          <Card className="h-full">
            <h2 className="text-xl font-semibold">No projects yet</h2>
            <p className="mt-2 text-slate-400">This Organization has no Projects.</p>
          </Card>
        )}
        {projects.map((project) => (
          <Link
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            <Card className="h-full transition hover:border-cyan-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">{project.name}</h3>
                  <p className="mt-1 font-mono text-sm text-slate-500">{project.slug}</p>
                </div>
                {project.archived_at && (
                  <span className="rounded-full bg-amber-950 px-3 py-1 text-xs text-amber-200">
                    Archived
                  </span>
                )}
              </div>
              <dl className="mt-5 flex gap-8 text-sm">
                <div>
                  <dt className="text-slate-500">Applications</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {formatCount(project.application_count)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Runtime groups</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {formatCount(project.runtime_group_count)}
                  </dd>
                </div>
              </dl>
            </Card>
          </Link>
        ))}
        {organizationId && isOwner && (
          <button
            type="button"
            aria-label={t('createProjectTitle')}
            className="app-card flex min-h-40 items-center justify-center rounded-2xl border border-emerald-900 bg-emerald-950/20 p-6 text-emerald-400 transition hover:border-emerald-600 hover:bg-emerald-950/40 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            onClick={() => setCreating(true)}
          >
            <Plus aria-hidden="true" className="size-12" strokeWidth={1.5} />
          </button>
        )}
      </div>
      {creating && organizationId && isOwner && (
        <Modal
          title={t('createProjectTitle')}
          description={t('createProjectHelp')}
          onClose={() => setCreating(false)}
          closeDisabled={create.isPending}
          showCloseButton={false}
        >
          <NamedResourceForm
            label="Project"
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
          {query.isFetchingNextPage ? 'Loading…' : 'Load more projects'}
        </Button>
      )}
      {refreshError && hasData && (
        <div className="mt-4">
          <ErrorState title="Projects could not be refreshed" error={refreshError} />
        </div>
      )}
    </section>
  )
}
