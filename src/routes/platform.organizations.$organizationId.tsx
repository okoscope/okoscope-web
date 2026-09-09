import { createFileRoute } from '@tanstack/react-router'
import { PlatformOrganizationConsole } from '../features/access/platform-scope'

export const Route = createFileRoute('/platform/organizations/$organizationId')({
  component: PlatformOrganizationRoute,
})

function PlatformOrganizationRoute() {
  const { organizationId } = Route.useParams()
  return <PlatformOrganizationConsole organizationId={organizationId} />
}
