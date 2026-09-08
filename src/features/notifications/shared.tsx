import { Link } from '@tanstack/react-router'
import { getActiveLocale } from '../../shared/i18n'

export const formatTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(getActiveLocale(), {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }).format(new Date(value))
    : '—'

export function NotificationBreadcrumbs({
  projectId,
  current,
}: {
  projectId: string
  current?: string
}) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs flex-wrap">
      <Link to="/">Organization</Link>
      <span>/</span>
      <Link to="/projects">Projects</Link>
      <span>/</span>
      <Link to="/projects/$projectId" params={{ projectId }}>
        Project
      </Link>
      <span>/</span>
      {current ? (
        <>
          <Link to="/projects/$projectId/notifications" params={{ projectId }}>
            Notifications
          </Link>
          <span>/</span>
          <span aria-current="page">{current}</span>
        </>
      ) : (
        <span aria-current="page">Notifications</span>
      )}
    </nav>
  )
}
