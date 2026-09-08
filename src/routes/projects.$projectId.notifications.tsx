import { Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { NotificationRetention } from '../features/notifications/retention'
import { DeliveryHistory } from '../features/notifications/deliveries'
import { DestinationList } from '../features/notifications/destinations'
import { NotificationHealthPanel } from '../features/notifications/health'
import { BulkRetry } from '../features/notifications/recovery'
import { NotificationBreadcrumbs } from '../features/notifications/shared'

export const parseDeliverySearch = (search: Record<string, unknown>) => ({
  cursor: typeof search.cursor === 'string' && search.cursor ? search.cursor : undefined,
})

export const Route = createFileRoute('/projects/$projectId/notifications')({
  validateSearch: parseDeliverySearch,
  component: NotificationsPage,
})

function NotificationsPage() {
  const { projectId } = Route.useParams()
  const search = Route.useSearch()
  const location = useLocation()
  const navigate = useNavigate({ from: Route.fullPath })
  useEffect(() => {
    document.title = 'Notifications · Okoscope'
  }, [])
  if (location.pathname !== `/projects/${projectId}/notifications`) return <Outlet />
  return (
    <div className="space-y-8">
      <NotificationBreadcrumbs projectId={projectId} />
      <div>
        <p className="eyebrow">Project operations</p>
        <h1 className="mt-2 text-4xl font-semibold">Notifications</h1>
        <p className="mt-2 text-slate-400">
          Configure delivery receivers and investigate notification attempts.
        </p>
      </div>
      <NotificationRetention projectId={projectId} />
      <NotificationHealthPanel projectId={projectId} />
      <DestinationList projectId={projectId} />
      <BulkRetry projectId={projectId} />
      <DeliveryHistory
        projectId={projectId}
        cursor={search.cursor ?? null}
        onNext={(cursor) => void navigate({ search: { cursor } })}
        onPrevious={() => void navigate({ search: {} })}
      />
    </div>
  )
}
