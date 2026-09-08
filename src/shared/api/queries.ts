import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { ApiClient } from './client'
import type {
  Application,
  ApplicationPage,
  ApplicationWorkerPage,
  BuildInfo,
  Organization,
  Project,
  ProjectPage,
  DeliveryDetail,
  DeliveryPage,
  NotificationHealth,
  RecoveryOperationDetail,
  RecoveryOperationPage,
  RecoveryCommandType,
  WebhookDestination,
  ApplicationAttentionSummary,
  AttentionWindowKind,
  OrganizationAttentionSummary,
} from './types'

export const ORGANIZATION_ATTENTION_LIMIT = 20
export const CHANGED_APPLICATION_LIMIT = 5
export const APPLICATION_ATTENTION_LIMIT = 20
export const ATTENTION_RECOMMENDATION_LIMIT = 5
export const ATTENTION_LARGEST_CHANGE_LIMIT = 5
export const ATTENTION_STALE_TIME = 30_000

const attentionParams = (values: Record<string, string | number>) => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => params.set(key, String(value)))
  return params.toString()
}

const withCursor = (path: string, cursor: string | null) =>
  `${path}?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`

export const queryKeys = {
  buildInfo: ['build-info'] as const,
  organization: ['organization'] as const,
  organizationAttention: (window: AttentionWindowKind) =>
    ['organization', 'attention', { window }] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  applications: (projectId: string) => ['projects', projectId, 'applications'] as const,
  application: (projectId: string, applicationId: string) =>
    ['projects', projectId, 'applications', applicationId] as const,
  applicationAttention: (projectId: string, applicationId: string, window: AttentionWindowKind) =>
    ['projects', projectId, 'applications', applicationId, 'attention', { window }] as const,
  applicationWorkers: (projectId: string, applicationId: string) =>
    ['projects', projectId, 'applications', applicationId, 'workers'] as const,
  notificationHealth: (projectId: string) =>
    ['projects', projectId, 'notification-health'] as const,
  destinations: (projectId: string) => ['projects', projectId, 'destinations'] as const,
  destination: (projectId: string, destinationId: string) =>
    ['projects', projectId, 'destinations', destinationId] as const,
  deliveries: (projectId: string) => ['projects', projectId, 'deliveries'] as const,
  deliveryPage: (projectId: string, cursor: string | null) =>
    ['projects', projectId, 'deliveries', { cursor }] as const,
  delivery: (projectId: string, deliveryId: string) =>
    ['projects', projectId, 'deliveries', deliveryId] as const,
  recoveries: (projectId: string) => ['projects', projectId, 'recoveries'] as const,
  recoveryPage: (
    projectId: string,
    commandType: RecoveryCommandType | null,
    cursor: string | null,
  ) => ['projects', projectId, 'recoveries', { commandType, cursor }] as const,
  recovery: (projectId: string, operationId: string) =>
    ['projects', projectId, 'recoveries', operationId] as const,
}

export const buildInfoOptions = (api: ApiClient) =>
  queryOptions({
    queryKey: queryKeys.buildInfo,
    queryFn: () => api.get<BuildInfo>('/api/v1/build-info'),
    staleTime: 30_000,
    retry: false,
  })
export const organizationOptions = (api: ApiClient) =>
  queryOptions({
    queryKey: queryKeys.organization,
    queryFn: () => api.get<Organization>('/api/v1/organization', { protected: true }),
  })
export const organizationAttentionOptions = (api: ApiClient, window: AttentionWindowKind) =>
  queryOptions({
    queryKey: queryKeys.organizationAttention(window),
    queryFn: () =>
      api.get<OrganizationAttentionSummary>(
        `/api/v1/attention-summary?${attentionParams({
          window,
          limit: ORGANIZATION_ATTENTION_LIMIT,
          changed_application_limit: CHANGED_APPLICATION_LIMIT,
          recommendation_limit: ATTENTION_RECOMMENDATION_LIMIT,
        })}`,
        { protected: true },
      ),
    staleTime: ATTENTION_STALE_TIME,
    placeholderData: (previous) => previous,
  })
export const projectOptions = (api: ApiClient, id: string) =>
  queryOptions({
    queryKey: queryKeys.project(id),
    queryFn: () =>
      api.get<Project>(`/api/v1/projects/${encodeURIComponent(id)}`, { protected: true }),
  })
export const applicationOptions = (api: ApiClient, projectId: string, applicationId: string) =>
  queryOptions({
    queryKey: queryKeys.application(projectId, applicationId),
    queryFn: () =>
      api.get<Application>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}`,
        { protected: true },
      ),
  })
export const applicationAttentionOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  window: AttentionWindowKind,
) =>
  queryOptions({
    queryKey: queryKeys.applicationAttention(projectId, applicationId, window),
    queryFn: () =>
      api.get<ApplicationAttentionSummary>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/attention-summary?${attentionParams(
          {
            window,
            limit: APPLICATION_ATTENTION_LIMIT,
            largest_change_limit: ATTENTION_LARGEST_CHANGE_LIMIT,
            recommendation_limit: ATTENTION_RECOMMENDATION_LIMIT,
          },
        )}`,
        { protected: true },
      ),
    staleTime: ATTENTION_STALE_TIME,
    placeholderData: (previous) => previous,
  })
export const applicationWorkersOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
) =>
  infiniteQueryOptions({
    queryKey: queryKeys.applicationWorkers(projectId, applicationId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.get<ApplicationWorkerPage>(
        withCursor(
          `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}/workers`,
          pageParam,
        ),
        { protected: true },
      ),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
export const projectsOptions = (api: ApiClient) =>
  infiniteQueryOptions({
    queryKey: queryKeys.projects,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.get<ProjectPage>(withCursor('/api/v1/projects', pageParam), { protected: true }),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
export const applicationsOptions = (api: ApiClient, projectId: string) =>
  infiniteQueryOptions({
    queryKey: queryKeys.applications(projectId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.get<ApplicationPage>(
        withCursor(`/api/v1/projects/${encodeURIComponent(projectId)}/applications`, pageParam),
        { protected: true },
      ),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })

export const destinationsOptions = (api: ApiClient, projectId: string) =>
  queryOptions({
    queryKey: queryKeys.destinations(projectId),
    queryFn: () =>
      api.get<WebhookDestination[]>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/webhook-destinations`,
        { protected: true },
      ),
  })

export const destinationOptions = (api: ApiClient, projectId: string, destinationId: string) =>
  queryOptions({
    queryKey: queryKeys.destination(projectId, destinationId),
    queryFn: () =>
      api.get<WebhookDestination>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/webhook-destinations/${encodeURIComponent(destinationId)}`,
        { protected: true },
      ),
  })

export const deliveriesOptions = (api: ApiClient, projectId: string, cursor: string | null) =>
  queryOptions({
    queryKey: queryKeys.deliveryPage(projectId, cursor),
    queryFn: () =>
      api.get<DeliveryPage>(
        withCursor(
          `/api/v1/projects/${encodeURIComponent(projectId)}/notification-deliveries`,
          cursor,
        ),
        { protected: true },
      ),
  })

export const deliveryOptions = (api: ApiClient, projectId: string, deliveryId: string) =>
  queryOptions({
    queryKey: queryKeys.delivery(projectId, deliveryId),
    queryFn: () =>
      api.get<DeliveryDetail>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notification-deliveries/${encodeURIComponent(deliveryId)}`,
        { protected: true },
      ),
  })

export const getHealthPollingInterval = (state: NotificationHealth['state'] | undefined): number =>
  state && ['backlogged', 'retrying', 'failing', 'draining'].includes(state) ? 3_000 : 10_000

export const notificationHealthOptions = (api: ApiClient, projectId: string) =>
  queryOptions({
    queryKey: queryKeys.notificationHealth(projectId),
    queryFn: () =>
      api.get<NotificationHealth>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notification-health`,
        { protected: true },
      ),
    refetchInterval: (query) => getHealthPollingInterval(query.state.data?.state),
    refetchIntervalInBackground: false,
  })

export const recoveryOperationsOptions = (
  api: ApiClient,
  projectId: string,
  commandType: RecoveryCommandType | null,
  cursor: string | null,
) => {
  const params = new URLSearchParams({ limit: '50' })
  if (commandType) params.set('command_type', commandType)
  if (cursor) params.set('cursor', cursor)
  return queryOptions({
    queryKey: queryKeys.recoveryPage(projectId, commandType, cursor),
    queryFn: () =>
      api.get<RecoveryOperationPage>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notification-recovery-operations?${params}`,
        { protected: true },
      ),
  })
}

export const recoveryOperationOptions = (api: ApiClient, projectId: string, operationId: string) =>
  queryOptions({
    queryKey: queryKeys.recovery(projectId, operationId),
    queryFn: () =>
      api.get<RecoveryOperationDetail>(
        `/api/v1/projects/${encodeURIComponent(projectId)}/notification-recovery-operations/${encodeURIComponent(operationId)}`,
        { protected: true },
      ),
  })
