import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from '../../shared/api/client'
import type {
  PolicyCommandResult,
  PolicyMutation,
  PolicyPage,
  PolicyPreview,
  PolicyRecomputation,
  PolicyReplacement,
  PolicyRevisionPage,
  PolicySeed,
  RuntimePolicy,
  SuppressionMutation,
  SuppressionPage,
} from '../../shared/api/types'

const path = (projectId: string, applicationId: string) =>
  `/api/v1/projects/${encodeURIComponent(projectId)}/applications/${encodeURIComponent(applicationId)}`
const command = (body?: unknown) => ({
  protected: true as const,
  headers: { 'Idempotency-Key': crypto.randomUUID() },
  ...(body === undefined ? {} : { body }),
})

export const policyKeys = {
  all: (projectId: string, applicationId: string) =>
    ['policies', projectId, applicationId] as const,
  list: (projectId: string, applicationId: string, cursor?: string) =>
    [...policyKeys.all(projectId, applicationId), 'list', cursor ?? null] as const,
  detail: (projectId: string, applicationId: string, policyId: string) =>
    [...policyKeys.all(projectId, applicationId), 'detail', policyId] as const,
  revisions: (projectId: string, applicationId: string, policyId: string) =>
    [...policyKeys.detail(projectId, applicationId, policyId), 'revisions'] as const,
  suppressions: (projectId: string, applicationId: string) =>
    [...policyKeys.all(projectId, applicationId), 'suppressions'] as const,
}

export const policiesOptions = (api: ApiClient, projectId: string, applicationId: string) =>
  queryOptions({
    queryKey: policyKeys.list(projectId, applicationId),
    queryFn: () =>
      api.get<PolicyPage>(`${path(projectId, applicationId)}/policies?limit=200`, {
        protected: true,
      }),
  })
export const policyOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  policyId: string,
) =>
  queryOptions({
    queryKey: policyKeys.detail(projectId, applicationId, policyId),
    queryFn: () =>
      api.get<RuntimePolicy>(
        `${path(projectId, applicationId)}/policies/${encodeURIComponent(policyId)}`,
        { protected: true },
      ),
  })
export const policyRevisionsOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  policyId: string,
) =>
  queryOptions({
    queryKey: policyKeys.revisions(projectId, applicationId, policyId),
    queryFn: () =>
      api.get<PolicyRevisionPage>(
        `${path(projectId, applicationId)}/policies/${encodeURIComponent(policyId)}/revisions?limit=200`,
        { protected: true },
      ),
  })
export const suppressionsOptions = (api: ApiClient, projectId: string, applicationId: string) =>
  queryOptions({
    queryKey: policyKeys.suppressions(projectId, applicationId),
    queryFn: () =>
      api.get<SuppressionPage>(`${path(projectId, applicationId)}/policy-suppressions?limit=200`, {
        protected: true,
      }),
  })

export const getPolicySeed = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  source: { groupId: string } | { itemId: string },
) =>
  api.get<PolicySeed>(
    `${path(projectId, applicationId)}/${'groupId' in source ? `runtime-groups/${encodeURIComponent(source.groupId)}` : `runtime-inventory/${encodeURIComponent(source.itemId)}`}/policy-seed`,
    { protected: true },
  )
export const previewPolicy = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  revision: PolicyMutation['revision'],
) =>
  api.post<PolicyPreview>(`${path(projectId, applicationId)}/policies/preview`, {
    protected: true,
    body: revision,
  })
export const createPolicy = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  mutation: PolicyMutation,
) => api.post<PolicyCommandResult>(`${path(projectId, applicationId)}/policies`, command(mutation))
export const replacePolicy = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  policyId: string,
  mutation: PolicyReplacement,
) =>
  api.post<PolicyCommandResult>(
    `${path(projectId, applicationId)}/policies/${encodeURIComponent(policyId)}/replace`,
    command(mutation),
  )
export const setPolicyEnabled = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  policyId: string,
  enabled: boolean,
) =>
  api.post<PolicyCommandResult>(
    `${path(projectId, applicationId)}/policies/${encodeURIComponent(policyId)}/${enabled ? 'enable' : 'disable'}`,
    command(),
  )
export const createSuppression = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  mutation: SuppressionMutation,
) =>
  api.post<PolicyCommandResult>(
    `${path(projectId, applicationId)}/policy-suppressions`,
    command(mutation),
  )
export const cancelSuppression = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  suppressionId: string,
) =>
  api.post<PolicyCommandResult>(
    `${path(projectId, applicationId)}/policy-suppressions/${encodeURIComponent(suppressionId)}/cancel`,
    command(),
  )
export const recomputationOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  recomputationId: string,
) =>
  queryOptions({
    queryKey: [...policyKeys.all(projectId, applicationId), 'recomputation', recomputationId],
    queryFn: () =>
      api.get<PolicyRecomputation>(
        `${path(projectId, applicationId)}/policy-recomputations/${encodeURIComponent(recomputationId)}`,
        { protected: true },
      ),
    refetchInterval: (query) =>
      query.state.data?.state === 'completed' || query.state.data?.state === 'failed'
        ? false
        : 1500,
  })
