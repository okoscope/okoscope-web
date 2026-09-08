import { queryOptions, type QueryClient } from '@tanstack/react-query'
import type { ApiClient } from '../../shared/api/client'
import type {
  DeploymentEpisodePage,
  ReleasePage,
  OccurrencePage,
  RuntimeGroup,
  RuntimeDiff,
  RuntimeDiffSummary,
  RuntimeGroupDetail,
  RuntimeGroupPage,
} from '../../shared/api/types'
import type { ReleaseSearch, RuntimeDiffSearch, RuntimeGroupSearch } from './url-state'

const params = (input: Record<string, string | number | boolean | undefined>) => {
  const value = new URLSearchParams()
  Object.entries(input).forEach(([key, item]) => {
    if (item !== undefined) value.set(key, String(item))
  })
  const suffix = value.toString()
  return suffix ? `?${suffix}` : ''
}
const normalized = <T extends object>(value: T) =>
  Object.fromEntries(
    Object.entries(value)
      .sort()
      .filter(([, v]) => v !== undefined),
  )

export const observabilityKeys = {
  runtimeGroupsScope: (projectId: string, applicationId: string) =>
    ['runtime-groups', projectId, applicationId] as const,
  runtimeGroups: (projectId: string, applicationId: string, search: RuntimeGroupSearch) =>
    ['runtime-groups', projectId, applicationId, normalized(search)] as const,
  runtimeGroup: (projectId: string, applicationId: string, groupId: string) =>
    ['runtime-group', projectId, applicationId, groupId] as const,
  occurrences: (projectId: string, applicationId: string, groupId: string, cursor?: string) =>
    [
      'runtime-group-occurrences',
      projectId,
      applicationId,
      groupId,
      cursor ?? null,
      OCCURRENCE_PAGE_SIZE,
    ] as const,
  releases: (projectId: string, applicationId: string, search: ReleaseSearch) =>
    ['releases', projectId, applicationId, normalized(search)] as const,
  deploymentEpisodes: (
    projectId: string,
    applicationId: string,
    releaseId: string,
    cursor?: string,
  ) =>
    [
      'deployment-episodes',
      projectId,
      applicationId,
      releaseId,
      cursor ?? null,
      EPISODE_PAGE_SIZE,
    ] as const,
  runtimeDiff: (
    projectId: string,
    applicationId: string,
    targetReleaseId: string,
    search: RuntimeDiffSearch,
  ) =>
    [
      'runtime-diff',
      projectId,
      applicationId,
      targetReleaseId,
      search.baseline ?? null,
      search.cursor ?? null,
    ] as const,
  runtimeDiffSummary: (
    projectId: string,
    applicationId: string,
    targetReleaseId: string,
    baseline?: string,
  ) =>
    [
      'runtime-diff-summary',
      projectId,
      applicationId,
      targetReleaseId,
      baseline ?? null,
      RUNTIME_DIFF_SUMMARY_SIZE,
    ] as const,
}
export const OCCURRENCE_PAGE_SIZE = 25
export const EPISODE_PAGE_SIZE = 25
export const RUNTIME_DIFF_SUMMARY_SIZE = 5
export const runtimeGroupOccurrencesPath = (groupId: string, cursor?: string) =>
  `/api/v1/runtime-groups/${encodeURIComponent(groupId)}/occurrences${params({ cursor, limit: OCCURRENCE_PAGE_SIZE })}`
export const runtimeGroupsOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  search: RuntimeGroupSearch,
) =>
  queryOptions({
    queryKey: observabilityKeys.runtimeGroups(projectId, applicationId, search),
    queryFn: () =>
      api.get<RuntimeGroupPage>(
        `/api/v1/runtime-groups${params({ project_id: projectId, application_id: applicationId, ...search, limit: 50 })}`,
        { protected: true },
      ),
  })
export const runtimeGroupOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  groupId: string,
) =>
  queryOptions({
    queryKey: observabilityKeys.runtimeGroup(projectId, applicationId, groupId),
    queryFn: () =>
      api.get<RuntimeGroupDetail>(`/api/v1/runtime-groups/${encodeURIComponent(groupId)}`, {
        protected: true,
      }),
  })
export const runtimeGroupOccurrencesOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  groupId: string,
  cursor?: string,
) =>
  queryOptions({
    queryKey: observabilityKeys.occurrences(projectId, applicationId, groupId, cursor),
    queryFn: () =>
      api.get<OccurrencePage>(runtimeGroupOccurrencesPath(groupId, cursor), { protected: true }),
  })

export type RuntimeGroupLifecycleAction = 'acknowledge' | 'resolve' | 'reopen'
export const runRuntimeGroupLifecycle = (
  api: ApiClient,
  groupId: string,
  action: RuntimeGroupLifecycleAction,
) =>
  api.post<RuntimeGroup>(`/api/v1/runtime-groups/${encodeURIComponent(groupId)}/${action}`, {
    protected: true,
  })

export const invalidateRuntimeGroupLifecycle = (
  queryClient: QueryClient,
  projectId: string,
  applicationId: string,
  groupId: string,
) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: observabilityKeys.runtimeGroup(projectId, applicationId, groupId),
    }),
    queryClient.invalidateQueries({
      queryKey: observabilityKeys.runtimeGroupsScope(projectId, applicationId),
    }),
  ])
export const releasesOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  search: ReleaseSearch,
) =>
  queryOptions({
    queryKey: observabilityKeys.releases(projectId, applicationId, search),
    queryFn: () =>
      api.get<ReleasePage>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/releases${params({ ...search, limit: 50 })}`,
        { protected: true },
      ),
  })
export const deploymentEpisodesPath = (
  projectId: string,
  applicationId: string,
  releaseId: string,
  cursor?: string,
) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/releases/${encodeURIComponent(releaseId)}/episodes${params({ cursor, limit: EPISODE_PAGE_SIZE })}`

export const deploymentEpisodesOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  releaseId: string,
  cursor: string | undefined,
  enabled: boolean,
) =>
  queryOptions({
    queryKey: observabilityKeys.deploymentEpisodes(projectId, applicationId, releaseId, cursor),
    queryFn: () =>
      api.get<DeploymentEpisodePage>(
        deploymentEpisodesPath(projectId, applicationId, releaseId, cursor),
        { protected: true },
      ),
    enabled,
  })
export const runtimeDiffOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  targetReleaseId: string,
  search: RuntimeDiffSearch,
) =>
  queryOptions({
    queryKey: observabilityKeys.runtimeDiff(projectId, applicationId, targetReleaseId, search),
    queryFn: () =>
      api.get<RuntimeDiff>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/releases/${encodeURIComponent(targetReleaseId)}/runtime-diff${params({ baseline_id: search.baseline, cursor: search.cursor, limit: 50 })}`,
        { protected: true },
      ),
  })

export const runtimeDiffSummaryOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  targetReleaseId: string,
  baseline?: string,
) =>
  queryOptions({
    queryKey: observabilityKeys.runtimeDiffSummary(
      projectId,
      applicationId,
      targetReleaseId,
      baseline,
    ),
    queryFn: () =>
      api.get<RuntimeDiffSummary>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/releases/${encodeURIComponent(targetReleaseId)}/runtime-diff/summary${params({ baseline_id: baseline, limit: RUNTIME_DIFF_SUMMARY_SIZE })}`,
        { protected: true },
      ),
  })
