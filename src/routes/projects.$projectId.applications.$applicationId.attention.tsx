import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ApplicationAttention } from '../features/attention/application-attention'
import { parseApplicationAttentionSearch } from '../features/attention/url-state'
import { applicationOptions, projectOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import { useLocalization } from '../shared/i18n'
import { ErrorState } from '../shared/ui/error-state'
import { Loading } from '../shared/ui/loading'

export const Route = createFileRoute('/projects/$projectId/applications/$applicationId/attention')({
  validateSearch: parseApplicationAttentionSearch,
  component: ApplicationAttentionPage,
})

function ApplicationAttentionPage() {
  const { projectId, applicationId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const api = useApi()
  const { t } = useLocalization()
  const project = useQuery(projectOptions(api, projectId))
  const application = useQuery(applicationOptions(api, projectId, applicationId))

  useEffect(() => {
    document.title = `${t('requiresAttention')} · ${application.data?.name ?? 'Okoscope'}`
  }, [application.data, t])

  if (project.isPending || application.isPending) return <Loading label={t('loading')} />
  if (project.isError || application.isError)
    return (
      <ErrorState
        title={t('attentionLoadFailed')}
        error={application.error ?? project.error}
        onRetry={() => {
          void project.refetch()
          void application.refetch()
        }}
      />
    )

  return (
    <div className="space-y-7">
      <nav aria-label="Breadcrumb" className="breadcrumbs flex-wrap">
        <Link to="/projects">{t('projects')}</Link>
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
        <span aria-current="page">{t('requiresAttention')}</span>
      </nav>
      <ApplicationAttention
        projectId={projectId}
        applicationId={applicationId}
        section={search.section}
        onSection={(section) => void navigate({ search: { section } })}
      />
    </div>
  )
}
