import { createFileRoute } from '@tanstack/react-router'
import { OrganizationSelection } from '../features/access/organization-selection'

export const Route = createFileRoute('/organizations')({ component: OrganizationSelection })
