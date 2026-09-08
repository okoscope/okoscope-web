import { createFileRoute } from '@tanstack/react-router'
import { RecoveryDetailView } from '../features/notifications/recovery'
import { NotificationBreadcrumbs } from '../features/notifications/shared'

export const Route = createFileRoute('/projects/$projectId/notifications/recovery/$operationId')({
  component: RecoveryDetailPage,
})
function RecoveryDetailPage() {
  const { projectId, operationId } = Route.useParams()
  return (
    <div className="space-y-6">
      <NotificationBreadcrumbs projectId={projectId} current="Recovery operation" />
      <RecoveryDetailView projectId={projectId} operationId={operationId} />
    </div>
  )
}
