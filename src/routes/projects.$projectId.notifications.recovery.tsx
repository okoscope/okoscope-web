import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { RecoveryHistory } from '../features/notifications/recovery'
import { NotificationBreadcrumbs } from '../features/notifications/shared'
import type { RecoveryCommandType } from '../shared/api/types'

export const parseRecoverySearch = (search: Record<string, unknown>) => ({
  command_type:
    search.command_type === 'retry' ||
    search.command_type === 'cancel' ||
    search.command_type === 'bulk_retry'
      ? search.command_type
      : undefined,
  cursor: typeof search.cursor === 'string' && search.cursor ? search.cursor : undefined,
})

export const Route = createFileRoute('/projects/$projectId/notifications/recovery')({
  validateSearch: parseRecoverySearch,
  component: RecoveryPage,
})

function RecoveryPage() {
  const { projectId } = Route.useParams()
  const search = Route.useSearch()
  const location = useLocation()
  const navigate = useNavigate({ from: Route.fullPath })
  useEffect(() => {
    document.title = 'Recovery history · Okoscope'
  }, [])
  if (location.pathname !== `/projects/${projectId}/notifications/recovery`) return <Outlet />
  return (
    <div className="space-y-6">
      <NotificationBreadcrumbs projectId={projectId} current="Recovery history" />
      <div>
        <p className="eyebrow">Notification operations</p>
        <h1 className="mt-2 text-4xl font-semibold">Recovery history</h1>
      </div>
      <RecoveryHistory
        projectId={projectId}
        commandType={(search.command_type ?? null) as RecoveryCommandType | null}
        cursor={search.cursor ?? null}
        onSearch={(commandType, cursor) =>
          void navigate({
            search: {
              ...(commandType ? { command_type: commandType } : {}),
              ...(cursor ? { cursor } : {}),
            },
          })
        }
      />
    </div>
  )
}
