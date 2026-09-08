import { createFileRoute } from '@tanstack/react-router'
import { Documentation } from '../features/documentation/documentation'

export const Route = createFileRoute('/docs/')({
  component: () => <Documentation slug="overview" />,
})
