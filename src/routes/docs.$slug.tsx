import { createFileRoute } from '@tanstack/react-router'
import { Documentation } from '../features/documentation/documentation'

export const Route = createFileRoute('/docs/$slug')({ component: Article })
function Article() {
  const { slug } = Route.useParams()
  return <Documentation slug={slug} />
}
