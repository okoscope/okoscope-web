import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  ApiErrorPanel,
  EmptyState,
  PaginationControls,
  ReleaseList,
} from '../features/observability/components'
import { releasesOptions } from '../features/observability/queries'
import { parseReleaseSearch } from '../features/observability/url-state'
import { applicationOptions, projectOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import { Loading } from '../shared/ui/loading'

export const Route = createFileRoute('/projects/$projectId/applications/$applicationId/releases')({
  validateSearch: parseReleaseSearch,
  component: ReleasesPage,
})
function ReleasesPage() {
  const { projectId, applicationId } = Route.useParams()
  const search = Route.useSearch()
  const location = useLocation()
  const navigate = useNavigate({ from: Route.fullPath })
  const api = useApi()
  const project = useQuery(projectOptions(api, projectId))
  const application = useQuery(applicationOptions(api, projectId, applicationId))
  const releases = useQuery(releasesOptions(api, projectId, applicationId, search))
  useEffect(() => {
    document.title = `Releases · ${application.data?.name ?? 'Okoscope'}`
  }, [application.data])
  if (location.pathname !== `/projects/${projectId}/applications/${applicationId}/releases`)
    return <Outlet />
  if (project.isPending || application.isPending || releases.isPending)
    return <Loading label="Loading Releases…" />
  if (project.isError || application.isError || releases.isError)
    return (
      <ApiErrorPanel
        title="Releases unavailable"
        error={releases.error ?? application.error ?? project.error}
        onRetry={() => void releases.refetch()}
      />
    )
  const invalid = releases.data.items.some(
    (item) => item.project_id !== projectId || item.application_id !== applicationId,
  )
  if (invalid)
    return (
      <ApiErrorPanel
        title="Release ownership mismatch"
        error={new Error('The response does not belong to this route.')}
      />
    )
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="breadcrumbs flex-wrap">
        <Link to="/projects">Projects</Link>
        <span>/</span>
        <Link to="/projects/$projectId" params={{ projectId }}>
          {project.data.name}
        </Link>
        <span>/</span>
        <Link
          to="/projects/$projectId/applications/$applicationId"
          params={{ projectId, applicationId }}
        >
          {application.data.name}
        </Link>
        <span>/</span>
        <span aria-current="page">Releases</span>
      </nav>
      <div>
        <p className="eyebrow">Deployment history</p>
        <h1 className="mt-2 text-4xl font-semibold">Releases</h1>
      </div>
      {releases.data.items.length ? (
        <ReleaseList
          releases={releases.data.items}
          projectId={projectId}
          applicationId={applicationId}
        />
      ) : (
        <EmptyState title="No releases yet" description="Release history will appear here." />
      )}
      <PaginationControls
        nextCursor={releases.data.next_cursor}
        onNext={(cursor) => void navigate({ search: { cursor } })}
      />
    </div>
  )
}
