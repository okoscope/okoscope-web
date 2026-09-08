import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { organizationOptions } from '../shared/api/queries'
import { useApi } from '../shared/api/context'
import { ErrorState } from '../shared/ui/error-state'
import { Loading } from '../shared/ui/loading'
import { OrganizationAttention } from '../features/attention/organization-attention'
import { parseAttentionSearch } from '../features/attention/url-state'

export const Route = createFileRoute('/')({
  validateSearch: parseAttentionSearch,
  component: OrganizationHome,
})

function OrganizationHome() {
  useEffect(() => {
    document.title = 'Organization · Okoscope'
  }, [])
  const query = useQuery(organizationOptions(useApi()))
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  if (query.isPending) return <Loading label="Loading Organization…" />
  if (query.isError)
    return (
      <ErrorState
        title="Organization could not be loaded"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    )
  return (
    <OrganizationAttention
      organization={query.data}
      window={search.window}
      onWindow={(window) => void navigate({ search: { window } })}
    />
  )
}
