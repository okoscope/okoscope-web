import { createFileRoute } from '@tanstack/react-router'
import { OrganizationAccess } from '../features/access/tenant-access'

export const Route = createFileRoute('/access')({ component: OrganizationAccess })
