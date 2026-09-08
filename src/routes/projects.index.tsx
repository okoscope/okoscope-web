import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ProjectList } from '../features/tenant/project-list'
import { organizationOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'

export const Route = createFileRoute('/projects/')({ component: ProjectsPage })

function ProjectsPage() {
  useEffect(() => {
    document.title = 'Projects · Okoscope'
  }, [])
  const organization = useQuery(organizationOptions(useApi()))
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link to="/">Organization</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Projects</span>
      </nav>
      <div>
        <p className="eyebrow">{organization.data?.name ?? 'Organization'}</p>
        <h1 className="mt-2 text-4xl font-semibold">Projects</h1>
      </div>
      <ProjectList organizationId={organization.data?.id} />
    </div>
  )
}
