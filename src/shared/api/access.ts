import type { ApiClient } from './client'
import type {
  AccessAuditPage,
  AddProjectMemberRequest,
  AuthContext,
  CreateOrganizationInvitationRequest,
  CreatePlatformOrganizationRequest,
  CreateProjectInvitationRequest,
  Invitation,
  InvitationAcceptance,
  InvitationInspection,
  InvitationPage,
  NewUserInvitationAcceptanceRequest,
  OrganizationMember,
  OrganizationMemberPage,
  OrganizationRole,
  PlatformOrganization,
  PlatformOrganizationPage,
  PlatformUser,
  PlatformUserPage,
  ProjectMember,
  ProjectMemberPage,
  ProjectPage,
  ProjectRole,
  ApplicationPage,
  ApplicationCredentialPage,
  IssueCredentialRequest,
  IssuedApplicationCredential,
  CreatedApplication,
  Project,
  ProvisionedOrganization,
} from './types'

const encoded = encodeURIComponent
const protectedRequest = { protected: true } as const
const pagePath = (path: string, cursor?: string) =>
  cursor ? `${path}?cursor=${encoded(cursor)}&limit=50` : `${path}?limit=50`

export const inspectInvitation = (api: ApiClient, token: string) =>
  api.post<InvitationInspection>('/api/v1/invitations/inspections', {
    body: { token },
    unauthorized: 'ignore',
  })

export const acceptInvitationAsNewUser = (
  api: ApiClient,
  body: NewUserInvitationAcceptanceRequest,
) =>
  api.post<InvitationAcceptance>('/api/v1/invitations/acceptances/new-user', {
    body,
    unauthorized: 'ignore',
  })

export const acceptInvitationAsExistingUser = (api: ApiClient, token: string) =>
  api.post<InvitationAcceptance>('/api/v1/invitations/acceptances/existing-user', {
    body: { token },
    protected: true,
  })

export const listPlatformUsers = (api: ApiClient, cursor?: string) =>
  api.get<PlatformUserPage>(pagePath('/api/v1/platform/users', cursor), protectedRequest)

export const setPlatformUserStatus = (api: ApiClient, userId: string, enabled: boolean) =>
  api.patch<PlatformUser>(`/api/v1/platform/users/${encoded(userId)}/status`, {
    body: { status: enabled ? 'enabled' : 'disabled' },
    protected: true,
  })

export const setSuperAdmin = (api: ApiClient, userId: string, enabled: boolean) =>
  enabled
    ? api.put<void>(`/api/v1/platform/users/${encoded(userId)}/roles/super-admin`, {
        body: undefined,
        protected: true,
      })
    : api.delete(`/api/v1/platform/users/${encoded(userId)}/roles/super-admin`, protectedRequest)

export const listPlatformOrganizations = (api: ApiClient, cursor?: string) =>
  api.get<PlatformOrganizationPage>(
    pagePath('/api/v1/platform/organizations', cursor),
    protectedRequest,
  )

export const createPlatformOrganization = (
  api: ApiClient,
  body: CreatePlatformOrganizationRequest,
) => api.post<ProvisionedOrganization>('/api/v1/platform/organizations', { body, protected: true })

export const getPlatformOrganization = (api: ApiClient, organizationId: string) =>
  api.get<PlatformOrganization>(
    `/api/v1/platform/organizations/${encoded(organizationId)}`,
    protectedRequest,
  )

export const listPlatformProjects = (api: ApiClient, organizationId: string, cursor?: string) =>
  api.get<ProjectPage>(
    pagePath(`/api/v1/platform/organizations/${encoded(organizationId)}/projects`, cursor),
    protectedRequest,
  )

export const listPlatformOrganizationMembers = (
  api: ApiClient,
  organizationId: string,
  cursor?: string,
) =>
  api.get<OrganizationMemberPage>(
    pagePath(`/api/v1/platform/organizations/${encoded(organizationId)}/members`, cursor),
    protectedRequest,
  )

export const updatePlatformOrganizationMember = (
  api: ApiClient,
  organizationId: string,
  userId: string,
  role: OrganizationRole,
) =>
  api.patch<OrganizationMember>(
    `/api/v1/platform/organizations/${encoded(organizationId)}/members/${encoded(userId)}`,
    { body: { role }, protected: true },
  )

export const removePlatformOrganizationMember = (
  api: ApiClient,
  organizationId: string,
  userId: string,
) =>
  api.delete(
    `/api/v1/platform/organizations/${encoded(organizationId)}/members/${encoded(userId)}`,
    protectedRequest,
  )

export const listPlatformOrganizationInvitations = (
  api: ApiClient,
  organizationId: string,
  cursor?: string,
) =>
  api.get<InvitationPage>(
    pagePath(`/api/v1/platform/organizations/${encoded(organizationId)}/invitations`, cursor),
    protectedRequest,
  )

export const createPlatformOrganizationInvitation = (
  api: ApiClient,
  organizationId: string,
  body: CreateOrganizationInvitationRequest,
) =>
  api.post<Invitation>(`/api/v1/platform/organizations/${encoded(organizationId)}/invitations`, {
    body,
    protected: true,
  })

export const createPlatformProject = (
  api: ApiClient,
  organizationId: string,
  body: { name: string; slug: string },
) =>
  api.post<Project>(`/api/v1/platform/organizations/${encoded(organizationId)}/projects`, {
    body,
    protected: true,
  })

export const listPlatformApplications = (api: ApiClient, projectId: string, cursor?: string) =>
  api.get<ApplicationPage>(
    pagePath(`/api/v1/platform/projects/${encoded(projectId)}/applications`, cursor),
    protectedRequest,
  )

export const listPlatformProjectMembers = (api: ApiClient, projectId: string, cursor?: string) =>
  api.get<ProjectMemberPage>(
    pagePath(`/api/v1/platform/projects/${encoded(projectId)}/members`, cursor),
    protectedRequest,
  )

export const listEligiblePlatformProjectMembers = (
  api: ApiClient,
  projectId: string,
  cursor?: string,
) =>
  api.get<OrganizationMemberPage>(
    pagePath(
      `/api/v1/platform/projects/${encoded(projectId)}/eligible-organization-members`,
      cursor,
    ),
    protectedRequest,
  )

export const addPlatformProjectMember = (
  api: ApiClient,
  projectId: string,
  userId: string,
  role: ProjectRole,
) =>
  api.post<ProjectMember>(`/api/v1/platform/projects/${encoded(projectId)}/members`, {
    body: { user_id: userId, role },
    protected: true,
  })

export const updatePlatformProjectMember = (
  api: ApiClient,
  projectId: string,
  userId: string,
  role: ProjectRole,
) =>
  api.patch<ProjectMember>(
    `/api/v1/platform/projects/${encoded(projectId)}/members/${encoded(userId)}`,
    { body: { role }, protected: true },
  )

export const removePlatformProjectMember = (api: ApiClient, projectId: string, userId: string) =>
  api.delete(
    `/api/v1/platform/projects/${encoded(projectId)}/members/${encoded(userId)}`,
    protectedRequest,
  )

export const listPlatformProjectInvitations = (
  api: ApiClient,
  projectId: string,
  cursor?: string,
) =>
  api.get<InvitationPage>(
    pagePath(`/api/v1/platform/projects/${encoded(projectId)}/invitations`, cursor),
    protectedRequest,
  )

export const createPlatformProjectInvitation = (
  api: ApiClient,
  projectId: string,
  body: CreateProjectInvitationRequest,
) =>
  api.post<Invitation>(`/api/v1/platform/projects/${encoded(projectId)}/invitations`, {
    body,
    protected: true,
  })

export const listPlatformApplicationCredentials = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
) =>
  api.get<ApplicationCredentialPage>(
    `/api/v1/platform/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/credentials`,
    protectedRequest,
  )

export const issuePlatformApplicationCredential = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  body: IssueCredentialRequest,
) =>
  api.post<IssuedApplicationCredential>(
    `/api/v1/platform/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/credentials`,
    { body, protected: true, headers: { 'Idempotency-Key': crypto.randomUUID() } },
  )

export const revokePlatformApplicationCredential = (
  api: ApiClient,
  projectId: string,
  applicationId: string,
  credentialId: string,
) =>
  api.delete(
    `/api/v1/platform/projects/${encoded(projectId)}/applications/${encoded(applicationId)}/credentials/${encoded(credentialId)}`,
    protectedRequest,
  )

export const createPlatformApplication = (
  api: ApiClient,
  projectId: string,
  body: { name: string; slug: string },
) =>
  api.post<CreatedApplication>(`/api/v1/platform/projects/${encoded(projectId)}/applications`, {
    body,
    protected: true,
  })

export const listPlatformInvitations = (api: ApiClient, cursor?: string) =>
  api.get<InvitationPage>(pagePath('/api/v1/platform/invitations', cursor), protectedRequest)

export const listPlatformAudit = (api: ApiClient, cursor?: string) =>
  api.get<AccessAuditPage>(pagePath('/api/v1/platform/audit', cursor), protectedRequest)

export const listOrganizationMembers = (api: ApiClient, organizationId: string, cursor?: string) =>
  api.get<OrganizationMemberPage>(
    pagePath(`/api/v1/organizations/${encoded(organizationId)}/members`, cursor),
    protectedRequest,
  )

export const updateOrganizationMember = (
  api: ApiClient,
  organizationId: string,
  userId: string,
  role: OrganizationRole,
) =>
  api.patch<OrganizationMember>(
    `/api/v1/organizations/${encoded(organizationId)}/members/${encoded(userId)}`,
    { body: { role }, protected: true },
  )

export const removeOrganizationMember = (api: ApiClient, organizationId: string, userId: string) =>
  api.delete(
    `/api/v1/organizations/${encoded(organizationId)}/members/${encoded(userId)}`,
    protectedRequest,
  )

export const listOrganizationInvitations = (
  api: ApiClient,
  organizationId: string,
  cursor?: string,
) =>
  api.get<InvitationPage>(
    pagePath(`/api/v1/organizations/${encoded(organizationId)}/invitations`, cursor),
    protectedRequest,
  )

export const createOrganizationInvitation = (
  api: ApiClient,
  organizationId: string,
  body: CreateOrganizationInvitationRequest,
) =>
  api.post<Invitation>(`/api/v1/organizations/${encoded(organizationId)}/invitations`, {
    body,
    protected: true,
  })

export const listOrganizationAudit = (api: ApiClient, organizationId: string, cursor?: string) =>
  api.get<AccessAuditPage>(
    pagePath(`/api/v1/organizations/${encoded(organizationId)}/audit`, cursor),
    protectedRequest,
  )

export const listProjectMembers = (api: ApiClient, projectId: string, cursor?: string) =>
  api.get<ProjectMemberPage>(
    pagePath(`/api/v1/projects/${encoded(projectId)}/members`, cursor),
    protectedRequest,
  )

export const listEligibleProjectMembers = (api: ApiClient, projectId: string, cursor?: string) =>
  api.get<OrganizationMemberPage>(
    pagePath(`/api/v1/projects/${encoded(projectId)}/eligible-organization-members`, cursor),
    protectedRequest,
  )

export const addProjectMember = (
  api: ApiClient,
  projectId: string,
  body: AddProjectMemberRequest,
) =>
  api.post<ProjectMember>(`/api/v1/projects/${encoded(projectId)}/members`, {
    body,
    protected: true,
  })

export const updateProjectMember = (
  api: ApiClient,
  projectId: string,
  userId: string,
  role: ProjectRole,
) =>
  api.patch<ProjectMember>(`/api/v1/projects/${encoded(projectId)}/members/${encoded(userId)}`, {
    body: { role },
    protected: true,
  })

export const removeProjectMember = (api: ApiClient, projectId: string, userId: string) =>
  api.delete(`/api/v1/projects/${encoded(projectId)}/members/${encoded(userId)}`, protectedRequest)

export const listProjectInvitations = (api: ApiClient, projectId: string, cursor?: string) =>
  api.get<InvitationPage>(
    pagePath(`/api/v1/projects/${encoded(projectId)}/invitations`, cursor),
    protectedRequest,
  )

export const createProjectInvitation = (
  api: ApiClient,
  projectId: string,
  body: CreateProjectInvitationRequest,
) =>
  api.post<Invitation>(`/api/v1/projects/${encoded(projectId)}/invitations`, {
    body,
    protected: true,
  })

export const resendInvitation = (
  api: ApiClient,
  scope: 'organization' | 'project',
  scopeId: string,
  invitationId: string,
) =>
  api.post<Invitation>(
    `/api/v1/${scope === 'organization' ? 'organizations' : 'projects'}/${encoded(scopeId)}/invitations/${encoded(invitationId)}/resend`,
    protectedRequest,
  )

export const revokeInvitation = (
  api: ApiClient,
  scope: 'organization' | 'project',
  scopeId: string,
  invitationId: string,
) =>
  api.delete(
    `/api/v1/${scope === 'organization' ? 'organizations' : 'projects'}/${encoded(scopeId)}/invitations/${encoded(invitationId)}`,
    protectedRequest,
  )

export const resendPlatformInvitation = (
  api: ApiClient,
  scope: 'organization' | 'project',
  scopeId: string,
  invitationId: string,
) =>
  api.post<Invitation>(
    `/api/v1/platform/${scope === 'organization' ? 'organizations' : 'projects'}/${encoded(scopeId)}/invitations/${encoded(invitationId)}/resend`,
    protectedRequest,
  )

export const revokePlatformInvitation = (
  api: ApiClient,
  scope: 'organization' | 'project',
  scopeId: string,
  invitationId: string,
) =>
  api.delete(
    `/api/v1/platform/${scope === 'organization' ? 'organizations' : 'projects'}/${encoded(scopeId)}/invitations/${encoded(invitationId)}`,
    protectedRequest,
  )

export const refreshAuthContext = (api: ApiClient) =>
  api.get<AuthContext>('/api/v1/auth/me', protectedRequest)
