import { createFileRoute } from '@tanstack/react-router'
import { DeliveryDetailView } from '../features/notifications/deliveries'
import { NotificationBreadcrumbs } from '../features/notifications/shared'

export const Route = createFileRoute('/projects/$projectId/notifications/deliveries/$deliveryId')({
  component: DeliveryPage,
})
function DeliveryPage() {
  const { projectId, deliveryId } = Route.useParams()
  return (
    <div className="space-y-6">
      <NotificationBreadcrumbs projectId={projectId} current="Delivery" />
      <DeliveryDetailView projectId={projectId} deliveryId={deliveryId} />
    </div>
  )
}
