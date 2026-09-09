import { createFileRoute } from '@tanstack/react-router'
import { PlatformProjectConsole } from '../features/access/platform-scope'

export const Route = createFileRoute('/platform/organizations/$organizationId/projects/$projectId')(
  {
    component: PlatformProjectRoute,
  },
)

function PlatformProjectRoute() {
  const { organizationId, projectId } = Route.useParams()
  return <PlatformProjectConsole organizationId={organizationId} projectId={projectId} />
}
