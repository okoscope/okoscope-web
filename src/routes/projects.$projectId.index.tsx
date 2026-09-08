import { RuntimeRetention } from '../features/runtime-retention/settings'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BellRing } from 'lucide-react'
import { useEffect } from 'react'
import { ApplicationList } from '../features/tenant/application-list'
import { projectOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import { Button } from '../shared/ui/button'
import { Card } from '../shared/ui/card'
import { ErrorState } from '../shared/ui/error-state'
import { Loading } from '../shared/ui/loading'

export const Route = createFileRoute('/projects/$projectId/')({ component: ProjectPage })

function ProjectPage() {
  const { projectId } = Route.useParams()
  const query = useQuery(projectOptions(useApi(), projectId))
  useEffect(() => {
    if (query.data) document.title = `${query.data.name} · Okoscope`
  }, [query.data])
  if (query.isPending) return <Loading label="Loading Project…" />
  if (query.isError)
    return (
      <ErrorState
        title="Project not found"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  return (
    <div className="space-y-7">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link to="/">Organization</Link>
        <span>/</span>
        <Link to="/projects">Projects</Link>
        <span>/</span>
        <span aria-current="page">{query.data.name}</span>
      </nav>
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Project</p>
            <h1 className="mt-2 text-4xl font-semibold">{query.data.name}</h1>
            <p className="mt-2 font-mono text-sm text-slate-500">{query.data.slug}</p>
          </div>
          {query.data.archived_at && (
            <span className="rounded-full bg-amber-950 px-3 py-1 text-xs text-amber-200">
              Archived
            </span>
          )}
        </div>
      </Card>
      <nav aria-label="Project sections">
        <Button asChild className="gap-2 px-5 py-2.5 shadow-lg shadow-cyan-950/40">
          <Link to="/projects/$projectId/notifications" params={{ projectId }}>
            <BellRing size={18} aria-hidden="true" />
            Configure notifications
          </Link>
        </Button>
      </nav>
      <ApplicationList projectId={projectId} />
      <RuntimeRetention projectId={projectId} />
    </div>
  )
}
