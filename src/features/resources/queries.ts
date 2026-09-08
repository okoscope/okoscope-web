import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from '../../shared/api/client'
import type { ApplicationResourceHistory, ReleaseResourceComparison } from '../../shared/api/types'
import type { ResourceSearch } from './model'

const params = (values: Record<string, string | undefined>) => {
  const result = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => value && result.set(key, value))
  return result.toString()
}

export const resourceKeys = {
  history: (projectId: string, applicationId: string, search: ResourceSearch, from: string) =>
    ['resources', projectId, applicationId, { ...search, from }] as const,
  comparison: (projectId: string, applicationId: string, targetId: string, baseline?: string) =>
    ['resource-comparison', projectId, applicationId, targetId, baseline ?? null] as const,
}

export const applicationResourcesOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  search: ResourceSearch,
  range: { from: string; to: string },
) =>
  queryOptions({
    queryKey: resourceKeys.history(projectId, applicationId, search, range.from),
    queryFn: () =>
      api.get<ApplicationResourceHistory>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/resources?${params({ metric: search.metric, from: range.from, to: range.to, step: search.step, mode: search.mode, release_id: search.release, container: search.container })}`,
        { protected: true },
      ),
    placeholderData: (previous) => previous,
  })

export const releaseResourceComparisonOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  targetId: string,
  baseline?: string,
) =>
  queryOptions({
    queryKey: resourceKeys.comparison(projectId, applicationId, targetId, baseline),
    queryFn: () =>
      api.get<ReleaseResourceComparison>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/releases/${encodeURIComponent(targetId)}/resource-comparison${baseline ? `?baseline_id=${encodeURIComponent(baseline)}` : ''}`,
        { protected: true },
      ),
    refetchInterval: (query) => (query.state.data?.state === 'collecting' ? 15_000 : false),
  })
