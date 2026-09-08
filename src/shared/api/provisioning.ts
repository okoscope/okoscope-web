import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from './client'
import type {
  AdminApplicationPage,
  AdminOrganizationPage,
  AdminProjectPage,
  ApplicationCredentialPage,
  CreateNamedResource,
  CreatedApplication,
  IssueCredentialRequest,
  IssuedApplicationCredential,
  Organization,
  ProvisionedApplication,
  ProvisionedProject,
} from './types'

export const provisioningKeys = {
  organizations: ['admin', 'organizations'] as const,
  projects: (organizationId: string) =>
    ['admin', 'organizations', organizationId, 'projects'] as const,
  applications: (projectId: string) => ['admin', 'projects', projectId, 'applications'] as const,
  application: (projectId: string, applicationId: string) =>
    ['admin', 'projects', projectId, 'applications', applicationId] as const,
  credentials: (projectId: string, applicationId: string) =>
    ['provisioning', 'projects', projectId, 'applications', applicationId, 'credentials'] as const,
}

const protectedRequest = { protected: true } as const
const encoded = encodeURIComponent
export const freshIdempotencyHeaders = () => ({ 'Idempotency-Key': crypto.randomUUID() })

export const adminOrganizationsOptions = (api: ApiClient) =>
  queryOptions({
    queryKey: provisioningKeys.organizations,
    queryFn: () => api.get<AdminOrganizationPage>('/api/v1/admin/organizations', protectedRequest),
  })

export const adminProjectsOptions = (api: ApiClient, organizationId: string) =>
  queryOptions({
    queryKey: provisioningKeys.projects(organizationId),
    queryFn: () =>
      api.get<AdminProjectPage>(
        `/api/v1/admin/organizations/${encoded(organizationId)}/projects`,
        protectedRequest,
      ),
    enabled: Boolean(organizationId),
  })

export const adminApplicationsOptions = (api: ApiClient, projectId: string) =>
  queryOptions({
    queryKey: provisioningKeys.applications(projectId),
    queryFn: () =>
      api.get<AdminApplicationPage>(
        `/api/v1/admin/projects/${encoded(projectId)}/applications`,
        protectedRequest,
      ),
    enabled: Boolean(projectId),
  })

export const adminApplicationOptions = (api: ApiClient, projectId: string, applicationId: string) =>
  queryOptions({
    queryKey: provisioningKeys.application(projectId, applicationId),
    queryFn: () =>
      api.get<ProvisionedApplication>(
        `/api/v1/admin/projects/${encoded(projectId)}/applications/${encoded(applicationId)}`,
        protectedRequest,
      ),
  })

export const applicationCredentialsOptions = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
) =>
  queryOptions({
    queryKey: provisioningKeys.credentials(projectId, applicationId),
    queryFn: () =>
      api.get<ApplicationCredentialPage>(
        `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/credentials`,
        protectedRequest,
      ),
  })

const mutationOptions = (body?: unknown) => ({
  protected: true,
  ...(body === undefined ? {} : { body }),
  headers: freshIdempotencyHeaders(),
})

export const createOrganization = (api: ApiClient, body: CreateNamedResource) =>
  api.post<Organization>('/api/v1/organizations', mutationOptions(body))

export const createProject = (api: ApiClient, organizationId: string, body: CreateNamedResource) =>
  api.post<ProvisionedProject>(
    `/api/v1/organizations/${encoded(organizationId)}/projects`,
    mutationOptions(body),
  )

export const createApplication = (api: ApiClient, projectId: string, body: CreateNamedResource) =>
  api.post<CreatedApplication>(
    `/api/v1/projects/${encoded(projectId)}/applications`,
    mutationOptions(body),
  )

export const issueApplicationCredential = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  body: IssueCredentialRequest,
) =>
  api.post<IssuedApplicationCredential>(
    `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/credentials`,
    mutationOptions(body),
  )

export const revokeApplicationCredential = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  credentialId: string,
) =>
  api.delete(
    `/api/v1/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/credentials/${encoded(credentialId)}`,
    protectedRequest,
  )
