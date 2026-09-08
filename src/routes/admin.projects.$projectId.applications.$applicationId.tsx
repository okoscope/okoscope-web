import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AgentCredentials } from '../features/provisioning/credentials'
import { adminApplicationOptions } from '../shared/api/provisioning'
import { useApi } from '../shared/api/context'
import { useT } from '../shared/i18n'
import { Card } from '../shared/ui/card'
import { ErrorState } from '../shared/ui/error-state'
import { Loading } from '../shared/ui/loading'

export const Route = createFileRoute('/admin/projects/$projectId/applications/$applicationId')({
  component: AdminApplicationPage,
})

function AdminApplicationPage() {
  const { projectId, applicationId } = Route.useParams()
  const t = useT()
  const query = useQuery(adminApplicationOptions(useApi(), projectId, applicationId))
  useEffect(() => {
    if (query.data) document.title = `${query.data.name} · Okoscope`
  }, [query.data])
  if (query.isPending) return <Loading label={t('loadingApplication')} />
  if (query.isError)
    return (
      <ErrorState
        title={t('applicationLoadFailed')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link to="/onboarding">{t('onboarding')}</Link>
        <span>/</span>
        <span>{query.data.name}</span>
      </nav>
      <Card>
        <p className="eyebrow">{t('applicationLabel')}</p>
        <h1 className="mt-2 text-3xl font-semibold">{query.data.name}</h1>
        <p className="mt-2 font-mono text-slate-400">{query.data.slug}</p>
      </Card>
      <AgentCredentials projectId={projectId} applicationId={applicationId} />
    </div>
  )
}
