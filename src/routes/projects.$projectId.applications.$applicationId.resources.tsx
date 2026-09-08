import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ResourceHistory } from '../features/resources/resource-history'
import { parseResourceSearch } from '../features/resources/model'
import { applicationOptions, projectOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import { useLocalization } from '../shared/i18n'
import { ErrorState } from '../shared/ui/error-state'
import { Loading } from '../shared/ui/loading'

export const Route = createFileRoute('/projects/$projectId/applications/$applicationId/resources')({
  validateSearch: parseResourceSearch,
  component: ApplicationResourcesPage,
})

function ApplicationResourcesPage() {
  const { projectId, applicationId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const api = useApi()
  const { locale } = useLocalization()
  const project = useQuery(projectOptions(api, projectId))
  const application = useQuery(applicationOptions(api, projectId, applicationId))
  useEffect(() => {
    document.title = `${locale === 'ru' ? 'Ресурсы приложения' : 'Application resources'} · ${application.data?.name ?? 'Okoscope'}`
  }, [application.data, locale])
  if (project.isPending || application.isPending)
    return <Loading label={locale === 'ru' ? 'Загрузка приложения…' : 'Loading Application…'} />
  if (project.isError || application.isError)
    return (
      <ErrorState
        title={locale === 'ru' ? 'Приложение не найдено' : 'Application not found'}
        error={application.error ?? project.error}
        onRetry={() => {
          void project.refetch()
          void application.refetch()
        }}
      />
    )
  return (
    <div className="space-y-6">
      <nav
        aria-label={locale === 'ru' ? 'Навигационная цепочка' : 'Breadcrumb'}
        className="breadcrumbs flex-wrap"
      >
        <Link to="/projects">{locale === 'ru' ? 'Проекты' : 'Projects'}</Link>
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
        <span aria-current="page">{locale === 'ru' ? 'Ресурсы' : 'Resources'}</span>
      </nav>
      <ResourceHistory
        projectId={projectId}
        applicationId={applicationId}
        search={search}
        onSearch={(next) => void navigate({ search: next, replace: true })}
      />
    </div>
  )
}
