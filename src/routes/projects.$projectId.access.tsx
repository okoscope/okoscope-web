import { createFileRoute } from '@tanstack/react-router'
import { ProjectAccess } from '../features/access/tenant-access'

export const Route = createFileRoute('/projects/$projectId/access')({
  component: ProjectAccessRoute,
})

function ProjectAccessRoute() {
  const { projectId } = Route.useParams()
  return <ProjectAccess projectId={projectId} />
}
