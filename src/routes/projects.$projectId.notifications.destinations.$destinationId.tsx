import { createFileRoute } from '@tanstack/react-router'
import { DestinationDetail } from '../features/notifications/destinations'
import { NotificationBreadcrumbs } from '../features/notifications/shared'

export const Route = createFileRoute(
  '/projects/$projectId/notifications/destinations/$destinationId',
)({ component: DestinationPage })
function DestinationPage() {
  const { projectId, destinationId } = Route.useParams()
  return (
    <div className="space-y-6">
      <NotificationBreadcrumbs projectId={projectId} current="Destination" />
      <DestinationDetail projectId={projectId} destinationId={destinationId} />
    </div>
  )
}
