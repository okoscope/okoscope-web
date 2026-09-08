import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from './client'
import type {
  AgentInstallationMetadata,
  ApplicationInstallation,
  CompleteSetupRequest,
  CompleteSetupResponse,
  ConnectionReadiness,
  CreateInstallationRequest,
  InstallationPage,
  IssuedInstallation,
  IssuedInstallationCredential,
  SetupStatus,
  UpdateInstallationRequest,
} from './types'

const encoded = encodeURIComponent
const protectedRequest = { protected: true } as const

export const onboardingKeys = {
  setup: ['setup', 'status'] as const,
  metadata: ['agent-installation-metadata'] as const,
  installations: (projectId: string, applicationId: string) =>
    ['projects', projectId, 'applications', applicationId, 'installations'] as const,
  readiness: (projectId: string, applicationId: string) =>
    ['projects', projectId, 'applications', applicationId, 'connection-readiness'] as const,
}

export const setupStatusOptions = (api: ApiClient) =>
  queryOptions({
    queryKey: onboardingKeys.setup,
    queryFn: () => api.get<SetupStatus>('/api/v1/setup/status'),
    staleTime: 5_000,
  })

export const completeSetup = (api: ApiClient, body: CompleteSetupRequest) =>
  api.post<CompleteSetupResponse>('/api/v1/setup/complete', { body, unauthorized: 'ignore' })

export const installationMetadataOptions = (api: ApiClient) =>
  queryOptions({
    queryKey: onboardingKeys.metadata,
    queryFn: () =>
      api.get<AgentInstallationMetadata>('/api/v1/agent-installation-metadata', protectedRequest),
  })

export const installationsOptions = (api: ApiClient, projectId: string, applicationId: string) =>
  queryOptions({
    queryKey: onboardingKeys.installations(projectId, applicationId),
    queryFn: () =>
      api.get<InstallationPage>(
        `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/installations`,
        protectedRequest,
      ),
  })

export const createInstallation = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  body: CreateInstallationRequest,
) =>
  api.post<IssuedInstallation>(
    `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/installations`,
    { protected: true, body, headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )

export const replaceInstallationCredential = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  installationId: string,
) =>
  api.post<IssuedInstallationCredential>(
    `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/installations/${encoded(installationId)}/replace-credential`,
    protectedRequest,
  )

export const updateInstallation = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  installationId: string,
  body: UpdateInstallationRequest,
) =>
  api.patch<ApplicationInstallation>(
    `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/installations/${encoded(installationId)}`,
    { protected: true, body },
  )

export const readinessOptions = (api: ApiClient, projectId: string, applicationId: string) =>
  queryOptions({
    queryKey: onboardingKeys.readiness(projectId, applicationId),
    queryFn: () =>
      api.get<ConnectionReadiness>(
        `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/connection-readiness`,
        protectedRequest,
      ),
    refetchInterval: 5_000,
  })
